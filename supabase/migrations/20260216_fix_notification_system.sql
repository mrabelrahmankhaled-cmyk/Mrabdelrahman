-- Migration: Fix Notification System (v4 - Schema Compatible Fix)
-- This script fixes the "Cannot determine center number" error by ensuring a default center exists and populating center_id.

-- 1. Minimal insert for default center (avoiding columns that might not exist like max_students)
INSERT INTO public.centers (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Center')
ON CONFLICT (id) DO NOTHING;

-- 2. Add center_id to notifications if missing
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='notifications') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='notifications' AND COLUMN_NAME='center_id') THEN
            ALTER TABLE public.notifications ADD COLUMN center_id UUID;
        END IF;
    END IF;
END $$;

-- Fix NULL center_id values in notifications
UPDATE public.notifications 
SET center_id = '00000000-0000-0000-0000-000000000001' 
WHERE center_id IS NULL;

-- 3. Create/Update notification_views table
CREATE TABLE IF NOT EXISTS public.notification_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    center_id UUID,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(notification_id, student_id)
);

-- Fix existing NULL center_id in views table
UPDATE public.notification_views nv
SET center_id = n.center_id
FROM public.notifications n
WHERE nv.notification_id = n.id AND nv.center_id IS NULL;

-- 4. Create the mark_notification_as_seen RPC function (Legacy Support)
CREATE OR REPLACE FUNCTION public.mark_notification_as_seen(p_notif_id UUID, p_student_id UUID)
RETURNS void AS $$
DECLARE
    v_center_id UUID;
BEGIN
    -- Get center_id with a hard fallback to default center
    SELECT center_id INTO v_center_id FROM public.notifications WHERE id = p_notif_id;

    -- If still null, use default center
    IF v_center_id IS NULL THEN
        v_center_id := '00000000-0000-0000-0000-000000000001';
    END IF;

    -- Update the main table (seen_by array)
    UPDATE public.notifications
    SET seen_by = array_append(COALESCE(seen_by, '{}'), p_student_id)
    WHERE id = p_notif_id 
    AND NOT (p_student_id = ANY (COALESCE(seen_by, '{}')));

    -- Record in the separate views table
    INSERT INTO public.notification_views (notification_id, student_id, center_id)
    VALUES (p_notif_id, p_student_id, v_center_id)
    ON CONFLICT (notification_id, student_id) 
    DO UPDATE SET viewed_at = NOW(), center_id = EXCLUDED.center_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS Policies
ALTER TABLE public.notification_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can insert their own views" ON public.notification_views;
CREATE POLICY "Students can insert their own views" ON public.notification_views
    FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can see their own views" ON public.notification_views;
CREATE POLICY "Students can see their own views" ON public.notification_views
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update their own views" ON public.notification_views;
CREATE POLICY "Students can update their own views" ON public.notification_views
    FOR UPDATE USING (auth.uid() = student_id);

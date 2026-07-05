-- Migration: Create Professional LMS Schema
-- Description: Adds Chapters, Interactive Checkpoints, Scheduling, and Discussions

-- 1. Create Chapters Table
CREATE TABLE IF NOT EXISTS public.lesson_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enhance Lessons Table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'chapter_id') THEN
        ALTER TABLE public.lessons ADD COLUMN chapter_id UUID REFERENCES public.lesson_chapters(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'checkpoints') THEN
        ALTER TABLE public.lessons ADD COLUMN checkpoints JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'scheduled_at') THEN
        ALTER TABLE public.lessons ADD COLUMN scheduled_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'release_type') THEN
        ALTER TABLE public.lessons ADD COLUMN release_type TEXT DEFAULT 'immediate';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'prerequisite_lesson_id') THEN
        ALTER TABLE public.lessons ADD COLUMN prerequisite_lesson_id UUID REFERENCES public.lessons(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'thumbnail_url') THEN
        ALTER TABLE public.lessons ADD COLUMN thumbnail_url TEXT;
    END IF;
END $$;

-- 3. Create Discussions Table (Time-Stamped)
CREATE TABLE IF NOT EXISTS public.lesson_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.lesson_discussions(id) ON DELETE CASCADE,
    sender_type TEXT DEFAULT 'student', -- 'student' or 'staff'
    message TEXT NOT NULL,
    video_timestamp FLOAT DEFAULT 0,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Activity Logs Table
CREATE TABLE IF NOT EXISTS public.student_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Support Granular Access Control
-- Add lesson_id and target_type columns to recharge_codes to allow activating single lessons
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'recharge_codes' AND COLUMN_NAME = 'lesson_id') THEN
        ALTER TABLE public.recharge_codes ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'recharge_codes' AND COLUMN_NAME = 'chapter_id') THEN
        ALTER TABLE public.recharge_codes ADD COLUMN chapter_id UUID REFERENCES public.lesson_chapters(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'recharge_codes' AND COLUMN_NAME = 'target_type') THEN
        ALTER TABLE public.recharge_codes ADD COLUMN target_type TEXT DEFAULT 'course'; -- 'course', 'chapter', or 'lesson'
    END IF;
END $$;

-- Table to track which students have access to which individual lessons
CREATE TABLE IF NOT EXISTS public.student_lesson_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- Table to track which students have access to entire chapters
CREATE TABLE IF NOT EXISTS public.student_chapter_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.lesson_chapters(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, chapter_id)
);

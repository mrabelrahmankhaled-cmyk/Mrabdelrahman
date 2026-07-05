-- Drop and recreate with proper UUID handling
DROP FUNCTION IF EXISTS get_attendance_stats;

CREATE OR REPLACE FUNCTION get_attendance_stats(
    p_student_code TEXT,
    p_group_ids TEXT[]
)
RETURNS TABLE(
    total_sessions INTEGER,
    attended_sessions INTEGER,
    attendance_rate DECIMAL,
    last_attendance_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
BEGIN
    -- Get student UUID from unique_code (TEXT comparison)
    SELECT id INTO v_student_id
    FROM students
    WHERE unique_id = p_student_code
      AND deleted_at IS NULL;

    IF v_student_id IS NULL THEN
        RETURN;
    END IF;

    -- Return attendance statistics with proper UUID handling
    RETURN QUERY
    SELECT 
        COUNT(s.id),
        COUNT(*) FILTER (WHERE s.attendees && ARRAY[p_student_code]),
        CASE 
            WHEN COUNT(s.id) > 0 THEN
                ROUND(
                    COUNT(*) FILTER (WHERE s.attendees && ARRAY[p_student_code])::DECIMAL
                    / COUNT(s.id) * 100, 2
                )
            ELSE 0
        END,
        MAX(s.created_at) FILTER (WHERE s.attendees && ARRAY[p_student_code])
    FROM sessions s
    WHERE
        s.group_id = ANY(p_group_ids::UUID[])  -- ✅ Cast TEXT[] to UUID[]
        AND s.deleted_at IS NULL
        AND s.created_at >= NOW() - INTERVAL '3 months';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_attendance_stats(TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_attendance_stats(TEXT, TEXT[]) TO service_role;

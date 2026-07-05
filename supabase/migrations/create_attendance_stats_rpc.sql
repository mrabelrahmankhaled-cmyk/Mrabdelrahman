-- Create RPC function for attendance statistics
CREATE OR REPLACE FUNCTION get_attendance_stats(
    p_student_code TEXT,
    p_group_ids TEXT[]
)
RETURNS TABLE(
    total_sessions INTEGER,
    attended_sessions INTEGER,
    attendance_rate DECIMAL,
    last_attendance_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
BEGIN
    -- Get student ID from unique code
    SELECT id INTO v_student_id 
    FROM students 
    WHERE unique_id = p_student_code;
    
    IF v_student_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Return attendance statistics
    RETURN QUERY
    SELECT 
        COUNT(s.id) as total_sessions,
        COUNT(CASE WHEN s.attendees && ARRAY[students.unique_id] THEN 1 END) as attended_sessions,
        CASE 
            WHEN COUNT(s.id) > 0 THEN 
                ROUND(COUNT(CASE WHEN s.attendees && ARRAY[students.unique_id] THEN 1 END)::DECIMAL / COUNT(s.id) * 100, 2)
            ELSE 0 
        END as attendance_rate,
        MAX(CASE WHEN s.attendees && ARRAY[students.unique_id] THEN s.created_at END) as last_attendance_date
    FROM students
    CROSS JOIN sessions s
    WHERE 
        students.id = v_student_id
        AND s.group_id = ANY(p_group_ids)
        AND s.created_at >= NOW() - INTERVAL '3 months';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_attendance_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_attendance_stats TO service_role;

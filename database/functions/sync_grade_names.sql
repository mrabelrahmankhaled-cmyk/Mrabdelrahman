-- Database Functions: Sync grade names across tables
-- Description: RPC functions to manually sync grade names

-- Function 1: Sync courses table to educational_stages
CREATE OR REPLACE FUNCTION sync_courses_to_educational_stages()
RETURNS TABLE(success BOOLEAN, message TEXT, updated_count INTEGER) AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update courses with old grade patterns
    UPDATE courses 
    SET grade = es.name
    FROM educational_stages es
    WHERE (
        (courses.grade ILIKE '%1%' AND courses.grade ILIKE '%prep%' AND es.name = 'الأول الإعدادي') OR
        (courses.grade ILIKE '%2%' AND courses.grade ILIKE '%prep%' AND es.name = 'الثاني الإعدادي') OR
        (courses.grade ILIKE '%3%' AND courses.grade ILIKE '%prep%' AND es.name = 'الثالث الإعدادي') OR
        (courses.grade ILIKE '%1%' AND courses.grade ILIKE '%sec%' AND es.name = 'الأول الثانوي') OR
        (courses.grade ILIKE '%2%' AND courses.grade ILIKE '%sec%' AND es.name = 'الثاني الثانوي') OR
        (courses.grade ILIKE '%3%' AND courses.grade ILIKE '%sec%' AND es.name = 'الثالث الثانوي') OR
        (courses.grade ILIKE 'kg1' AND es.name = 'KG1') OR
        (courses.grade ILIKE 'kg2' AND es.name = 'KG2') OR
        (courses.grade ILIKE 'kg3' AND es.name = 'KG3') OR
        (courses.grade = es.name)
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN QUERY SELECT true, 'Courses synced successfully', updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Sync students table to educational_stages
CREATE OR REPLACE FUNCTION sync_students_to_educational_stages()
RETURNS TABLE(success BOOLEAN, message TEXT, updated_count INTEGER) AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update students with old grade patterns
    UPDATE students 
    SET grade = es.name
    FROM educational_stages es
    WHERE (
        (students.grade ILIKE '%1%' AND students.grade ILIKE '%prep%' AND es.name = 'الأول الإعدادي') OR
        (students.grade ILIKE '%2%' AND students.grade ILIKE '%prep%' AND es.name = 'الثاني الإعدادي') OR
        (students.grade ILIKE '%3%' AND students.grade ILIKE '%prep%' AND es.name = 'الثالث الإعدادي') OR
        (students.grade ILIKE '%1%' AND students.grade ILIKE '%sec%' AND es.name = 'الأول الثانوي') OR
        (students.grade ILIKE '%2%' AND students.grade ILIKE '%sec%' AND es.name = 'الثاني الثانوي') OR
        (students.grade ILIKE '%3%' AND students.grade ILIKE '%sec%' AND es.name = 'الثالث الثانوي') OR
        (students.grade ILIKE 'kg1' AND es.name = 'KG1') OR
        (students.grade ILIKE 'kg2' AND es.name = 'KG2') OR
        (students.grade ILIKE 'kg3' AND es.name = 'KG3') OR
        (students.grade = es.name)
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN QUERY SELECT true, 'Students synced successfully', updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Comprehensive sync all tables
CREATE OR REPLACE FUNCTION sync_all_grade_names()
RETURNS TABLE(
    courses_success BOOLEAN, 
    courses_message TEXT, 
    courses_updated INTEGER,
    students_success BOOLEAN, 
    students_message TEXT, 
    students_updated INTEGER,
    total_updated INTEGER
) AS $$
DECLARE
    courses_result RECORD;
    students_result RECORD;
BEGIN
    -- Sync courses
    SELECT * INTO courses_result FROM sync_courses_to_educational_stages();
    
    -- Sync students
    SELECT * INTO students_result FROM sync_students_to_educational_stages();
    
    -- Return combined results
    RETURN QUERY SELECT 
        courses_result.success,
        courses_result.message,
        courses_result.updated_count,
        students_result.success,
        students_result.message,
        students_result.updated_count,
        courses_result.updated_count + students_result.updated_count;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
-- SELECT * FROM sync_courses_to_educational_stages();
-- SELECT * FROM sync_students_to_educational_stages();
-- SELECT * FROM sync_all_grade_names();

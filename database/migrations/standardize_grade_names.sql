-- Migration: Standardize grade names across all tables
-- Description: Make grade names consistent between courses and educational_stages

-- Step 1: First, let's see what we have in both tables
SELECT 'courses' as table_name, grade as name, COUNT(*) as count 
FROM courses 
WHERE grade IS NOT NULL 
GROUP BY grade 
ORDER BY grade;

SELECT 'educational_stages' as table_name, name, sort_order 
FROM educational_stages 
ORDER BY sort_order;

-- Step 2: Create a mapping table for grade name conversion
-- This will help us map old names to new standardized names
WITH grade_mapping AS (
  SELECT 
    grade as old_grade,
    CASE 
      WHEN grade ILIKE '1 prep' OR grade ILIKE 'prep1' OR grade ILIKE 'first prep' THEN 'الأول الإعدادي'
      WHEN grade ILIKE '2 prep' OR grade ILIKE 'prep2' OR grade ILIKE 'second prep' THEN 'الثاني الإعدادي'
      WHEN grade ILIKE '3 prep' OR grade ILIKE 'prep3' OR grade ILIKE 'third prep' THEN 'الثالث الإعدادي'
      WHEN grade ILIKE '1 sec' OR grade ILIKE 'sec1' OR grade ILIKE 'first sec' THEN 'الأول الثانوي'
      WHEN grade ILIKE '2 sec' OR grade ILIKE 'sec2' OR grade ILIKE 'second sec' THEN 'الثاني الثانوي'
      WHEN grade ILIKE '3 sec' OR grade ILIKE 'sec3' OR grade ILIKE 'third sec' THEN 'الثالث الثانوي'
      WHEN grade ILIKE 'kg1' OR grade ILIKE 'kg 1' THEN 'KG1'
      WHEN grade ILIKE 'kg2' OR grade ILIKE 'kg 2' THEN 'KG2'
      WHEN grade ILIKE 'kg3' OR grade ILIKE 'kg 3' THEN 'KG3'
      ELSE grade -- Keep original if no match
    END as new_grade
  FROM courses
  WHERE grade IS NOT NULL
)
SELECT * FROM grade_mapping WHERE old_grade != new_grade;

-- Step 3: Update courses table with standardized grade names
UPDATE courses 
SET grade = CASE 
  WHEN grade ILIKE '1 prep' OR grade ILIKE 'prep1' OR grade ILIKE 'first prep' THEN 'الأول الإعدادي'
  WHEN grade ILIKE '2 prep' OR grade ILIKE 'prep2' OR grade ILIKE 'second prep' THEN 'الثاني الإعدادي'
  WHEN grade ILIKE '3 prep' OR grade ILIKE 'prep3' OR grade ILIKE 'third prep' THEN 'الثالث الإعدادي'
  WHEN grade ILIKE '1 sec' OR grade ILIKE 'sec1' OR grade ILIKE 'first sec' THEN 'الأول الثانوي'
  WHEN grade ILIKE '2 sec' OR grade ILIKE 'sec2' OR grade ILIKE 'second sec' THEN 'الثاني الثانوي'
  WHEN grade ILIKE '3 sec' OR grade ILIKE 'sec3' OR grade ILIKE 'third sec' THEN 'الثالث الثانوي'
  WHEN grade ILIKE 'kg1' OR grade ILIKE 'kg 1' THEN 'KG1'
  WHEN grade ILIKE 'kg2' OR grade ILIKE 'kg 2' THEN 'KG2'
  WHEN grade ILIKE 'kg3' OR grade ILIKE 'kg 3' THEN 'KG3'
  ELSE grade -- Keep original if no match
END
WHERE grade IS NOT NULL;

-- Step 4: Update students table with standardized grade names
UPDATE students 
SET grade = CASE 
  WHEN grade ILIKE '1 prep' OR grade ILIKE 'prep1' OR grade ILIKE 'first prep' THEN 'الأول الإعدادي'
  WHEN grade ILIKE '2 prep' OR grade ILIKE 'prep2' OR grade ILIKE 'second prep' THEN 'الثاني الإعدادي'
  WHEN grade ILIKE '3 prep' OR grade ILIKE 'prep3' OR grade ILIKE 'third prep' THEN 'الثالث الإعدادي'
  WHEN grade ILIKE '1 sec' OR grade ILIKE 'sec1' OR grade ILIKE 'first sec' THEN 'الأول الثانوي'
  WHEN grade ILIKE '2 sec' OR grade ILIKE 'sec2' OR grade ILIKE 'second sec' THEN 'الثاني الثانوي'
  WHEN grade ILIKE '3 sec' OR grade ILIKE 'sec3' OR grade ILIKE 'third sec' THEN 'الثالث الثانوي'
  WHEN grade ILIKE 'kg1' OR grade ILIKE 'kg 1' THEN 'KG1'
  WHEN grade ILIKE 'kg2' OR grade ILIKE 'kg 2' THEN 'KG2'
  WHEN grade ILIKE 'kg3' OR grade ILIKE 'kg 3' THEN 'KG3'
  ELSE grade -- Keep original if no match
END
WHERE grade IS NOT NULL;

-- Step 5: Verify the changes
SELECT 'courses_after' as table_name, grade as name, COUNT(*) as count 
FROM courses 
WHERE grade IS NOT NULL 
GROUP BY grade 
ORDER BY grade;

SELECT 'students_after' as table_name, grade as name, COUNT(*) as count 
FROM students 
WHERE grade IS NOT NULL 
GROUP BY grade 
ORDER BY grade;

-- Step 6: Check for any grades that don't exist in educational_stages
SELECT DISTINCT c.grade as course_grade
FROM courses c
WHERE c.grade IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM educational_stages es 
    WHERE es.name = c.grade
  )
ORDER BY c.grade;

SELECT DISTINCT s.grade as student_grade
FROM students s
WHERE s.grade IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM educational_stages es 
    WHERE es.name = s.grade
  )
ORDER BY s.grade;

-- Migration: Sync all tables to use educational_stages names
-- Description: Make all tables use the exact same names as educational_stages

-- Step 1: First, let's see what we have in educational_stages (this is our source of truth)
SELECT name, sort_order 
FROM educational_stages 
ORDER BY sort_order;

-- Step 2: Show current data in other tables
SELECT 'courses' as table_name, grade as name, COUNT(*) as count 
FROM courses 
WHERE grade IS NOT NULL 
GROUP BY grade 
ORDER BY grade;

SELECT 'students' as table_name, grade as name, COUNT(*) as count 
FROM students 
WHERE grade IS NOT NULL 
GROUP BY grade 
ORDER BY grade;

-- Step 3: Create a dynamic mapping based on educational_stages
-- This will update courses to use the exact names from educational_stages
UPDATE courses 
SET grade = es.name
FROM educational_stages es
WHERE (
  -- Match old patterns to new educational_stages names
  (courses.grade ILIKE '%1%' AND courses.grade ILIKE '%prep%' AND es.name = 'الأول الإعدادي') OR
  (courses.grade ILIKE '%2%' AND courses.grade ILIKE '%prep%' AND es.name = 'الثاني الإعدادي') OR
  (courses.grade ILIKE '%3%' AND courses.grade ILIKE '%prep%' AND es.name = 'الثالث الإعدادي') OR
  (courses.grade ILIKE '%1%' AND courses.grade ILIKE '%sec%' AND es.name = 'الأول الثانوي') OR
  (courses.grade ILIKE '%2%' AND courses.grade ILIKE '%sec%' AND es.name = 'الثاني الثانوي') OR
  (courses.grade ILIKE '%3%' AND courses.grade ILIKE '%sec%' AND es.name = 'الثالث الثانوي') OR
  (courses.grade ILIKE 'kg1' AND es.name = 'KG1') OR
  (courses.grade ILIKE 'kg2' AND es.name = 'KG2') OR
  (courses.grade ILIKE 'kg3' AND es.name = 'KG3') OR
  -- Direct matches (if already correct)
  (courses.grade = es.name)
);

-- Step 4: Update students table in the same way
UPDATE students 
SET grade = es.name
FROM educational_stages es
WHERE (
  -- Match old patterns to new educational_stages names
  (students.grade ILIKE '%1%' AND students.grade ILIKE '%prep%' AND es.name = 'الأول الإعدادي') OR
  (students.grade ILIKE '%2%' AND students.grade ILIKE '%prep%' AND es.name = 'الثاني الإعدادي') OR
  (students.grade ILIKE '%3%' AND students.grade ILIKE '%prep%' AND es.name = 'الثالث الإعدادي') OR
  (students.grade ILIKE '%1%' AND students.grade ILIKE '%sec%' AND es.name = 'الأول الثانوي') OR
  (students.grade ILIKE '%2%' AND students.grade ILIKE '%sec%' AND es.name = 'الثاني الثانوي') OR
  (students.grade ILIKE '%3%' AND students.grade ILIKE '%sec%' AND es.name = 'الثالث الثانوي') OR
  (students.grade ILIKE 'kg1' AND es.name = 'KG1') OR
  (students.grade ILIKE 'kg2' AND es.name = 'KG2') OR
  (students.grade ILIKE 'kg3' AND es.name = 'KG3') OR
  -- Direct matches (if already correct)
  (students.grade = es.name)
);

-- Step 5: For any remaining unmatched grades, create educational_stages entries
INSERT INTO educational_stages (name, sort_order)
SELECT DISTINCT grade, 
  COALESCE(
    (SELECT MAX(sort_order) + 1 FROM educational_stages), 
    100
  ) as sort_order
FROM courses 
WHERE grade IS NOT NULL 
  AND grade NOT IN (SELECT name FROM educational_stages)
UNION
SELECT DISTINCT grade, 
  COALESCE(
    (SELECT MAX(sort_order) + 1 FROM educational_stages), 
    100
  ) as sort_order
FROM students 
WHERE grade IS NOT NULL 
  AND grade NOT IN (SELECT name FROM educational_stages)
ON CONFLICT (name) DO NOTHING;

-- Step 6: Final verification - show results
SELECT 'educational_stages' as table_name, name, sort_order
FROM educational_stages 
ORDER BY sort_order;

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

-- Step 7: Check for any remaining mismatches
SELECT 'unmatched_courses' as type, grade, COUNT(*) as count
FROM courses 
WHERE grade IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM educational_stages es 
    WHERE es.name = courses.grade
  )
GROUP BY grade
UNION ALL
SELECT 'unmatched_students' as type, grade, COUNT(*) as count
FROM students 
WHERE grade IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM educational_stages es 
    WHERE es.name = students.grade
  )
GROUP BY grade
ORDER BY type, grade;

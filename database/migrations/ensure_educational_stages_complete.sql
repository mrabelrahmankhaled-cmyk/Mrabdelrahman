-- Migration: Ensure educational_stages has all required grades
-- Description: Add any missing educational stages based on current data

-- Step 1: Check what stages we currently have
SELECT name, sort_order 
FROM educational_stages 
ORDER BY sort_order;

-- Step 2: Insert missing educational stages
INSERT INTO educational_stages (name, sort_order) 
VALUES 
  ('KG1', 1),
  ('KG2', 2),
  ('KG3', 3),
  ('الأول الإعدادي', 4),
  ('الثاني الإعدادي', 5),
  ('الثالث الإعدادي', 6),
  ('الأول الثانوي', 7),
  ('الثاني الثانوي', 8),
  ('الثالث الثانوي', 9)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Verify all stages are now present
SELECT name, sort_order 
FROM educational_stages 
ORDER BY sort_order;

-- Step 4: Final verification - check if any courses/students still have unmatched grades
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

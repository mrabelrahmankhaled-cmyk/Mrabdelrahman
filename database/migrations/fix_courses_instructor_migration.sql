-- Migration: Fix courses instructor relationship
-- Description: Move instructor data from text field to UUID relationship

-- Step 1: First, let's see what we have
SELECT 
  id, 
  name, 
  instructor, 
  instructor_id,
  grade 
FROM courses 
LIMIT 10;

-- Step 2: Update instructor_id based on instructor name
UPDATE courses 
SET instructor_id = (
  SELECT id 
  FROM instructors 
  WHERE instructors.name = courses.instructor 
    AND instructors.is_active = true
  LIMIT 1
)
WHERE instructor IS NOT NULL 
  AND instructor_id IS NULL
  AND instructor != '';

-- Step 3: Check the results
SELECT 
  c.id,
  c.name,
  c.instructor as old_instructor,
  i.name as new_instructor_name,
  c.instructor_id
FROM courses c
LEFT JOIN instructors i ON c.instructor_id = i.id
WHERE c.instructor IS NOT NULL
ORDER BY c.name;

-- Step 4: Handle cases where instructor name doesn't match (optional cleanup)
-- This will show any courses that couldn't be matched
SELECT 
  id,
  name,
  instructor,
  grade
FROM courses 
WHERE instructor IS NOT NULL 
  AND instructor_id IS NULL
  AND instructor != '';

-- Step 5: If you want to create missing instructors automatically (optional)
-- Uncomment and run this if needed:
/*
INSERT INTO instructors (name, is_active)
SELECT DISTINCT instructor, true
FROM courses 
WHERE instructor IS NOT NULL 
  AND instructor_id IS NULL
  AND instructor != ''
  AND instructor NOT IN (SELECT name FROM instructors);

-- Then run the update again
UPDATE courses 
SET instructor_id = (
  SELECT id 
  FROM instructors 
  WHERE instructors.name = courses.instructor 
    AND instructors.is_active = true
  LIMIT 1
)
WHERE instructor IS NOT NULL 
  AND instructor_id IS NULL
  AND instructor != '';
*/

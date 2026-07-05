-- Cleanup: Remove old instructor text field after migration
-- Description: Remove the old instructor text field after successful migration

-- WARNING: Only run this after you've verified the migration worked correctly!

-- Step 1: Final verification - make sure all courses have instructor_id
SELECT 
  COUNT(*) as total_courses,
  COUNT(instructor_id) as courses_with_instructor_id,
  COUNT(instructor) as courses_with_old_instructor_text
FROM courses;

-- Step 2: Show any courses that would lose data
SELECT 
  id,
  name,
  instructor,
  instructor_id
FROM courses 
WHERE instructor_id IS NULL 
  AND instructor IS NOT NULL 
  AND instructor != '';

-- Step 3: If everything looks good, remove the old field
-- Uncomment the following line when ready:
-- ALTER TABLE courses DROP COLUMN instructor;

-- Step 4: Add a check constraint to ensure instructor_id is always set for new courses
-- Uncomment the following line when ready:
-- ALTER TABLE courses ADD CONSTRAINT courses_instructor_id_not_null CHECK (instructor_id IS NOT NULL);

-- Step 5: Final verification
SELECT 
  COUNT(*) as total_courses,
  COUNT(instructor_id) as courses_with_instructor_id
FROM courses;

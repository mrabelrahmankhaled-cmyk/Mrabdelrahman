-- Migration: Add foreign key constraints for grade consistency
-- Description: Add proper foreign key relationships to ensure data consistency

-- Step 1: Add foreign key constraint to courses table
-- This ensures that courses.grade must match educational_stages.name
ALTER TABLE courses 
ADD CONSTRAINT courses_grade_fkey 
FOREIGN KEY (grade) 
REFERENCES educational_stages(name) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- Step 2: Add foreign key constraint to students table
-- This ensures that students.grade must match educational_stages.name
ALTER TABLE students 
ADD CONSTRAINT students_grade_fkey 
FOREIGN KEY (grade) 
REFERENCES educational_stages(name) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- Step 3: Verify the constraints were added
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'courses' OR tc.table_name = 'students')
  AND tc.table_schema = 'public';

-- Step 4: Test the constraints (optional)
-- This should fail if the constraints are working correctly
-- INSERT INTO courses (name, grade) VALUES ('Test Course', 'Invalid Grade');
-- INSERT INTO students (name, grade) VALUES ('Test Student', 'Invalid Grade');

-- Step 5: Show current data integrity
SELECT 
  'courses' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as with_grade,
  COUNT(CASE WHEN grade IS NULL THEN 1 END) as without_grade
FROM courses
UNION ALL
SELECT 
  'students' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as with_grade,
  COUNT(CASE WHEN grade IS NULL THEN 1 END) as without_grade
FROM students;

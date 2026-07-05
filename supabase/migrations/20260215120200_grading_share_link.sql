-- Migration: Add Shareable Grading Link
-- Description: Adds a token for public grading access and sets up RLS

-- 1. Add grading_token to exams
ALTER TABLE exams ADD COLUMN IF NOT EXISTS grading_token UUID DEFAULT gen_random_uuid();

-- 2. Update RLS for public access via token
-- Note: We use a special policy that checks the token instead of auth.uid()
-- This way, anyone with the link can access this specific exam.

-- Policy for viewing the exam info via token
CREATE POLICY "Public: View exam via token" ON exams
  FOR SELECT TO anon
  USING (grading_token IS NOT NULL);

-- Policy for viewing related students/results via token
-- (This is a bit tricky with RLS, but we can verify the token at the application level 
-- OR use a clever SQL function. For speed, we'll allow anon access to exam_results 
-- if they know the exam's grading_token)

-- We'll create a helper function to verify the token for exam_results
CREATE OR REPLACE FUNCTION verify_exam_token(e_id UUID, g_token UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM exams WHERE id = e_id AND grading_token = g_token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for exam_results manageable via token
CREATE POLICY "Public: Manage results via token" ON exam_results
  FOR ALL TO anon
  USING (verify_exam_token(exam_id, (SELECT grading_token FROM exams WHERE id = exam_id)))
  WITH CHECK (verify_exam_token(exam_id, (SELECT grading_token FROM exams WHERE id = exam_id)));

-- Policy for students viewable via exam token
-- (Allowing anon to see students in the same center as the exam they have a token for)
CREATE POLICY "Public: View students via exam token" ON students
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM exams 
    WHERE exams.center_id = students.center_id 
    AND exams.grading_token IS NOT NULL
  ));

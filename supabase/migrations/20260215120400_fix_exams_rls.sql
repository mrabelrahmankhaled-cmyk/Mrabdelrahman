-- Fix RLS policies for exams table using a security definer function
-- This avoids issues where the user might not have permission to query staff_profiles directly in the RLS context

-- 1. Create a secure function to check center membership
CREATE OR REPLACE FUNCTION check_is_center_member(target_center_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE id = auth.uid()
    AND center_id = target_center_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing policies to be clean
DROP POLICY IF EXISTS "Exams are manageable by center staff" ON exams;
DROP POLICY IF EXISTS "Exams are viewable by center members" ON exams;
DROP POLICY IF EXISTS "Enable read access for center members" ON exams;
DROP POLICY IF EXISTS "Enable insert for center staff" ON exams;
DROP POLICY IF EXISTS "Enable update for center staff" ON exams;
DROP POLICY IF EXISTS "Enable delete for center staff" ON exams;

-- 3. Create new unified policy
CREATE POLICY "Exams access policy" ON exams
  FOR ALL
  USING (check_is_center_member(center_id))
  WITH CHECK (check_is_center_member(center_id));

-- 4. Apply similar fix for exam_results just in case
DROP POLICY IF EXISTS "Exam results are manageable by center staff" ON exam_results;
DROP POLICY IF EXISTS "Exam results are viewable by center members" ON exam_results;

CREATE POLICY "Exam results access policy" ON exam_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE id = exam_results.exam_id
      AND check_is_center_member(exams.center_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exams
      WHERE id = exam_results.exam_id
      AND check_is_center_member(exams.center_id)
    )
  );

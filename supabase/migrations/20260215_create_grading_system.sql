-- Migration: Create Exams and Grading System
-- Description: Adds tables for exams and individual student results

-- 1. Create Exams Table
CREATE TABLE IF NOT EXISTS exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL, -- Link to center
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  max_score NUMERIC DEFAULT 100,
  exam_date DATE DEFAULT CURRENT_DATE,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Exam Results Table
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'present', -- 'present', 'absent', 'excused'
  teacher_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_id, student_id) -- Avoid duplicate entries for same student in same exam
);

-- 3. Enable RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Simple center-based isolation)
CREATE POLICY "Exams are viewable by center members" ON exams
  FOR SELECT USING (auth.uid() IN (SELECT id FROM staff_profiles WHERE center_id = exams.center_id));

CREATE POLICY "Exams are manageable by center staff" ON exams
  FOR ALL USING (auth.uid() IN (SELECT id FROM staff_profiles WHERE center_id = exams.center_id));

CREATE POLICY "Exam results are viewable by center members" ON exam_results
  FOR SELECT USING (auth.uid() IN (
    SELECT sp.id FROM staff_profiles sp 
    JOIN exams e ON e.center_id = sp.center_id 
    WHERE e.id = exam_results.exam_id
  ));

CREATE POLICY "Exam results are manageable by center staff" ON exam_results
  FOR ALL USING (auth.uid() IN (
    SELECT sp.id FROM staff_profiles sp 
    JOIN exams e ON e.center_id = sp.center_id 
    WHERE e.id = exam_results.exam_id
  ));

-- Add student access to results (Portal)
CREATE POLICY "Students can view their own results" ON exam_results
  FOR SELECT USING (auth.uid() = student_id AND (SELECT is_published FROM exams WHERE id = exam_id) = TRUE);

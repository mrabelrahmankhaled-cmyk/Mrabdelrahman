-- Migration: Advanced Online Exam System
-- Description: Adds Question Bank, Electronic Exam Settings, and Student Submission tracking

-- 1. Question Bank Table (Centralized for sharing across exams)
CREATE TABLE IF NOT EXISTS public.question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'mcq', -- 'mcq', 'true_false'
    options JSONB DEFAULT '[]', -- List of options for MCQ: ["Opt1", "Opt2", ...]
    correct_answer TEXT, -- The exact text of the correct option
    points INT DEFAULT 1,
    difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Exam Questions (Links Exams to Question Bank)
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, question_id)
);

-- 3. Student Exam Submissions (Tracking Attempts)
CREATE TABLE IF NOT EXISTS public.student_exam_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    score NUMERIC DEFAULT 0,
    is_passed BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'ongoing', -- 'ongoing', 'completed', 'timed_out'
    attempt_number INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Student Answers (Individual Question Responses)
CREATE TABLE IF NOT EXISTS public.student_exam_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.student_exam_submissions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    answer_text TEXT,
    is_correct BOOLEAN DEFAULT false,
    points_earned NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enhance Exams Table with Electronic Features
DO $$ 
BEGIN 
    -- Column to distinguish electronic exams
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'exams' AND COLUMN_NAME = 'is_electronic') THEN
        ALTER TABLE public.exams ADD COLUMN is_electronic BOOLEAN DEFAULT false;
    END IF;

    -- Time limit for the exam
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'exams' AND COLUMN_NAME = 'duration_minutes') THEN
        ALTER TABLE public.exams ADD COLUMN duration_minutes INT;
    END IF;

    -- Minimum percentage to pass
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'exams' AND COLUMN_NAME = 'pass_percentage') THEN
        ALTER TABLE public.exams ADD COLUMN pass_percentage INT DEFAULT 50;
    END IF;

    -- Allowed attempts per student
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'exams' AND COLUMN_NAME = 'max_attempts') THEN
        ALTER TABLE public.exams ADD COLUMN max_attempts INT DEFAULT 1;
    END IF;

    -- UI/UX preference
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'exams' AND COLUMN_NAME = 'shuffle_questions') THEN
        ALTER TABLE public.exams ADD COLUMN shuffle_questions BOOLEAN DEFAULT true;
    END IF;
    
    -- Description for the exam
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'exams' AND COLUMN_NAME = 'description') THEN
        ALTER TABLE public.exams ADD COLUMN description TEXT;
    END IF;

    -- Scoping: Lesson or Chapter linkage
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'exams' AND COLUMN_NAME = 'lesson_id') THEN
        ALTER TABLE public.exams ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'exams' AND COLUMN_NAME = 'chapter_id') THEN
        ALTER TABLE public.exams ADD COLUMN chapter_id UUID REFERENCES public.lesson_chapters(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. RLS Setup
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_answers ENABLE ROW LEVEL SECURITY;

-- 7. Secure Functions (Fallback to check_is_center_member from previous migrations)
-- We use the check_is_center_member function already defined in 20260215120400_fix_exams_rls.sql

-- 8. Policies
-- Question Bank: Staff can do everything, students cannot see it directly
CREATE POLICY "Queston bank access policy" ON public.question_bank
    FOR ALL USING (check_is_center_member(center_id));

-- Exam Questions: Staff can manage
CREATE POLICY "Exam questions staff policy" ON public.exam_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE id = exam_questions.exam_id 
            AND check_is_center_member(exams.center_id)
        )
    );

-- Exam Questions: Students can view questions of an exam they are taking (simplified for now)
CREATE POLICY "Exam questions student policy" ON public.exam_questions
    FOR SELECT USING (true); 

-- Question Bank: Students need to see question text/options during exam
CREATE POLICY "Question bank student select" ON public.question_bank
    FOR SELECT USING (true);

-- Student Submissions: Students see own, staff see all in center
CREATE POLICY "Submissions access policy" ON public.student_exam_submissions
    FOR ALL USING (
        (auth.uid() = student_id) OR 
        (check_is_center_member(center_id))
    );

-- Student Answers: Students see/insert own, staff see all
CREATE POLICY "Answers access policy" ON public.student_exam_answers
    FOR ALL USING (
        (auth.uid() = student_id) OR 
        (
            EXISTS (
                SELECT 1 FROM public.student_exam_submissions s
                WHERE s.id = student_exam_answers.submission_id
                AND check_is_center_member(s.center_id)
            )
        )
    );

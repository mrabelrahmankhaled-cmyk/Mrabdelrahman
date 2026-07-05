-- Migration: LMS Business Logic Enhancements
-- Description: Adds pricing, PDF support, and Exam associations to courses, chapters, and lessons.

-- 1. Add pricing and exam associations to lesson_chapters
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lesson_chapters' AND COLUMN_NAME = 'price') THEN
        ALTER TABLE public.lesson_chapters ADD COLUMN price NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lesson_chapters' AND COLUMN_NAME = 'exam_id') THEN
        ALTER TABLE public.lesson_chapters ADD COLUMN exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add pricing, pdf, and exam associations to lessons
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'price') THEN
        ALTER TABLE public.lessons ADD COLUMN price NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'pdf_url') THEN
        ALTER TABLE public.lessons ADD COLUMN pdf_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'exam_id') THEN
        ALTER TABLE public.lessons ADD COLUMN exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add pricing to courses (for full course purchase)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'courses' AND COLUMN_NAME = 'price') THEN
        ALTER TABLE public.courses ADD COLUMN price NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 4. Mark exams as electronic if they are to be taken in-app
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'exams' AND COLUMN_NAME = 'is_electronic') THEN
        ALTER TABLE public.exams ADD COLUMN is_electronic BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

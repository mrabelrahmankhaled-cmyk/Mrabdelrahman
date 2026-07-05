-- Migration to support per-course monthly flags
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS monthly_courses text[] DEFAULT '{}';

COMMENT ON COLUMN public.students.monthly_courses IS 'Array of course IDs where the student is following a monthly subscription model';

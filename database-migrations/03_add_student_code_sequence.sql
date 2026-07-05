-- Add sequential student code tracking to center_settings
ALTER TABLE public.center_settings 
ADD COLUMN IF NOT EXISTS next_student_code BIGINT DEFAULT 100000,
ADD COLUMN IF NOT EXISTS student_code_prefix TEXT DEFAULT 'S';

COMMENT ON COLUMN public.center_settings.next_student_code IS 'The next sequential number to use for student unique_id';
COMMENT ON COLUMN public.center_settings.student_code_prefix IS 'Prefix to prepend to the sequential student ID (e.g. S, ST, or empty)';

-- Drop the old constraint
ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;

-- Add the new constraint with ON DELETE CASCADE
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_course_id_fkey
  FOREIGN KEY (course_id)
  REFERENCES public.courses(id)
  ON DELETE CASCADE;

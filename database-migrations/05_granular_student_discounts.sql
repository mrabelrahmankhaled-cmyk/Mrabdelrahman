-- Migration to add granular discount types per student
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS subscription_tags JSONB DEFAULT '{}', -- Store general info like 'Sibling', 'Staff Child'
ADD COLUMN IF NOT EXISTS center_only_courses TEXT[] DEFAULT '{}', -- IDs of courses where student pays only center share
ADD COLUMN IF NOT EXISTS free_courses TEXT[] DEFAULT '{}'; -- IDs of courses where student is exempt

COMMENT ON COLUMN students.center_only_courses IS 'List of course IDs where the student pays only the center fixed share';
COMMENT ON COLUMN students.free_courses IS 'List of course IDs where the student is completely exempt';

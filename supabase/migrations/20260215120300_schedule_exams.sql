-- Add exam_id to schedule table and allow nullable group_id
ALTER TABLE schedule 
ADD COLUMN exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
ALTER COLUMN group_id DROP NOT NULL;

-- Add comment on column for clarity
COMMENT ON COLUMN schedule.exam_id IS 'Link to an exam if this schedule slot is for an exam';

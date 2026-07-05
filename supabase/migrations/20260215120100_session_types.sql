-- Migration: Add session type (Lesson/Exam) to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'lesson';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS linked_exam_id UUID REFERENCES exams(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sessions_exam_id ON sessions(linked_exam_id);

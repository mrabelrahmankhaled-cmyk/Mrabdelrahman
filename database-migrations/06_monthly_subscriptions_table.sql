-- Table to track monthly subscriptions
CREATE TABLE IF NOT EXISTS public.student_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: "2024-03"
    amount_paid NUMERIC DEFAULT 0,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    center_id UUID NOT NULL,
    notes TEXT,
    
    UNIQUE(student_id, course_id, month_year) -- Prevent duplicate payment for same month/course
);

-- Index for fast lookup in Session Modal
CREATE INDEX IF NOT EXISTS idx_subs_lookup ON public.student_subscriptions (student_id, course_id, month_year);

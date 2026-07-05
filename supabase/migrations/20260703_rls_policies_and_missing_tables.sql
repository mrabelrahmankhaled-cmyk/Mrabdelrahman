-- ================================================================
-- 🚨 CRITICAL MIGRATION: RLS Policies + Missing Tables
-- شغّل هذا الملف كامل في المشروع الجديد
-- pdvjutoclddmclymwjpa
-- ================================================================


-- ================================================================
-- PART 1: Helper Functions (مطلوبة للـ Policies)
-- ================================================================

-- get_my_center_id: ترجع center_id للـ user المسجّل
CREATE OR REPLACE FUNCTION public.get_my_center_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT center_id 
  FROM public.staff_profiles 
  WHERE id = auth.uid() 
  LIMIT 1;
$$;

-- check_is_center_member: تتحقق إن الـ user ينتمي لسنتر معين
CREATE OR REPLACE FUNCTION public.check_is_center_member(target_center_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE id = auth.uid() 
    AND center_id = target_center_id
  );
$$;


-- ================================================================
-- PART 2: Missing Tables
-- ================================================================

-- center_settings
CREATE TABLE IF NOT EXISTS public.center_settings (
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE PRIMARY KEY,
    center_name TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    whatsapp_number TEXT,
    currency TEXT DEFAULT 'EGP',
    paymob_api_key TEXT,
    paymob_integration_id_fawry TEXT,
    paymob_integration_id_card TEXT,
    paymob_iframe_id TEXT,
    paymob_hmac_secret TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- features
CREATE TABLE IF NOT EXISTS public.features (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- packages
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    max_students INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- package_features
CREATE TABLE IF NOT EXISTS public.package_features (
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    feature_id TEXT REFERENCES public.features(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, feature_id)
);


-- ================================================================
-- PART 3: Enable RLS on ALL tables
-- ================================================================

ALTER TABLE public.center_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_chapter_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_online_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universal_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- PART 4: RLS Policies (43 policies من المشروع القديم)
-- ================================================================

-- ── center_settings ──
DROP POLICY IF EXISTS center_settings_isolation ON public.center_settings;
CREATE POLICY center_settings_isolation ON public.center_settings
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id());

-- ── courses ──
DROP POLICY IF EXISTS "Students can view courses in their center" ON public.courses;
CREATE POLICY "Students can view courses in their center" ON public.courses
  AS PERMISSIVE FOR SELECT TO public
  USING (center_id IN (
    SELECT students.center_id FROM students WHERE students.id = auth.uid()
  ));

DROP POLICY IF EXISTS courses_center_isolation ON public.courses;
CREATE POLICY courses_center_isolation ON public.courses
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id());

-- ── exam_questions ──
DROP POLICY IF EXISTS "Exam questions staff policy" ON public.exam_questions;
CREATE POLICY "Exam questions staff policy" ON public.exam_questions
  AS PERMISSIVE FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM exams
    WHERE exams.id = exam_questions.exam_id
    AND check_is_center_member(exams.center_id)
  ));

DROP POLICY IF EXISTS "Exam questions student policy" ON public.exam_questions;
CREATE POLICY "Exam questions student policy" ON public.exam_questions
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- ── exam_results ──
DROP POLICY IF EXISTS "Exam results are manageable by center staff" ON public.exam_results;
CREATE POLICY "Exam results are manageable by center staff" ON public.exam_results
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() IN (
    SELECT sp.id FROM staff_profiles sp
    JOIN exams e ON e.center_id = sp.center_id
    WHERE e.id = exam_results.exam_id
  ));

DROP POLICY IF EXISTS "Exam results are viewable by center members" ON public.exam_results;
CREATE POLICY "Exam results are viewable by center members" ON public.exam_results
  AS PERMISSIVE FOR SELECT TO public
  USING (auth.uid() IN (
    SELECT sp.id FROM staff_profiles sp
    JOIN exams e ON e.center_id = sp.center_id
    WHERE e.id = exam_results.exam_id
  ));

DROP POLICY IF EXISTS "Students can sync their online scores" ON public.exam_results;
CREATE POLICY "Students can sync their online scores" ON public.exam_results
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can view their own results" ON public.exam_results;
CREATE POLICY "Students can view their own results" ON public.exam_results
  AS PERMISSIVE FOR SELECT TO public
  USING (
    auth.uid() = student_id
    AND (SELECT exams.is_published FROM exams WHERE exams.id = exam_results.exam_id) = true
  );

-- ── exams ──
DROP POLICY IF EXISTS "Exams are manageable by center staff" ON public.exams;
CREATE POLICY "Exams are manageable by center staff" ON public.exams
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() IN (
    SELECT staff_profiles.id FROM staff_profiles
    WHERE staff_profiles.center_id = exams.center_id
  ));

DROP POLICY IF EXISTS "Exams are viewable by center members" ON public.exams;
CREATE POLICY "Exams are viewable by center members" ON public.exams
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- ── expenses ──
DROP POLICY IF EXISTS expenses_center_isolation ON public.expenses;
CREATE POLICY expenses_center_isolation ON public.expenses
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id());

-- ── lesson_chapters ──
DROP POLICY IF EXISTS lesson_chapters_isolation ON public.lesson_chapters;
CREATE POLICY lesson_chapters_isolation ON public.lesson_chapters
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id());

-- ── lesson_discussions ──
DROP POLICY IF EXISTS "Anyone can view lesson discussions" ON public.lesson_discussions;
CREATE POLICY "Anyone can view lesson discussions" ON public.lesson_discussions
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Staff can reply to discussions" ON public.lesson_discussions;
CREATE POLICY "Staff can reply to discussions" ON public.lesson_discussions
  AS PERMISSIVE FOR INSERT TO public
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can update status" ON public.lesson_discussions;
CREATE POLICY "Staff can update status" ON public.lesson_discussions
  AS PERMISSIVE FOR UPDATE TO public
  USING (true);

DROP POLICY IF EXISTS "Students can insert lessons discussions" ON public.lesson_discussions;
CREATE POLICY "Students can insert lessons discussions" ON public.lesson_discussions
  AS PERMISSIVE FOR INSERT TO public
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS discussions_isolation ON public.lesson_discussions;
CREATE POLICY discussions_isolation ON public.lesson_discussions
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR student_id = auth.uid());

-- ── notification_views ──
DROP POLICY IF EXISTS "Students can insert their own views" ON public.notification_views;
CREATE POLICY "Students can insert their own views" ON public.notification_views
  AS PERMISSIVE FOR INSERT TO public
  USING (true) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can see their own views" ON public.notification_views;
CREATE POLICY "Students can see their own views" ON public.notification_views
  AS PERMISSIVE FOR SELECT TO public
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update their own views" ON public.notification_views;
CREATE POLICY "Students can update their own views" ON public.notification_views
  AS PERMISSIVE FOR UPDATE TO public
  USING (auth.uid() = student_id);

-- ── notifications ──
DROP POLICY IF EXISTS "Students can see their own notifications" ON public.notifications;
CREATE POLICY "Students can see their own notifications" ON public.notifications
  AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid())::text = (student_id)::text);

DROP POLICY IF EXISTS notifications_isolation ON public.notifications;
CREATE POLICY notifications_isolation ON public.notifications
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR student_id = auth.uid());

-- ── question_bank ──
DROP POLICY IF EXISTS "Question bank student select" ON public.question_bank;
CREATE POLICY "Question bank student select" ON public.question_bank
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Queston bank access policy" ON public.question_bank;
CREATE POLICY "Queston bank access policy" ON public.question_bank
  AS PERMISSIVE FOR ALL TO public
  USING (check_is_center_member(center_id));

-- ── sessions ──
DROP POLICY IF EXISTS sessions_center_isolation ON public.sessions;
CREATE POLICY sessions_center_isolation ON public.sessions
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id());

-- ── staff_attendance ──
DROP POLICY IF EXISTS admin_center_records ON public.staff_attendance;
CREATE POLICY admin_center_records ON public.staff_attendance
  AS PERMISSIVE FOR ALL TO public
  USING (center_id IN (
    SELECT c.id FROM centers c WHERE c.owner_id = auth.uid()
    UNION
    SELECT sp.center_id FROM staff_profiles sp
    WHERE sp.id = auth.uid() AND sp.role = ANY(ARRAY['admin','manager','owner'])
  ));

DROP POLICY IF EXISTS staff_own_records ON public.staff_attendance;
CREATE POLICY staff_own_records ON public.staff_attendance
  AS PERMISSIVE FOR ALL TO public
  USING (auth.uid() = staff_id)
  WITH CHECK (auth.uid() = staff_id);

-- ── staff_schedules ──
DROP POLICY IF EXISTS admin_manage_schedules ON public.staff_schedules;
CREATE POLICY admin_manage_schedules ON public.staff_schedules
  AS PERMISSIVE FOR ALL TO public
  USING (center_id IN (
    SELECT c.id FROM centers c WHERE c.owner_id = auth.uid()
    UNION
    SELECT sp.center_id FROM staff_profiles sp
    WHERE sp.id = auth.uid() AND sp.role = ANY(ARRAY['admin','manager','owner'])
  ));

DROP POLICY IF EXISTS staff_view_own_schedule ON public.staff_schedules;
CREATE POLICY staff_view_own_schedule ON public.staff_schedules
  AS PERMISSIVE FOR SELECT TO public
  USING (auth.uid() = staff_id);

-- ── student_chapter_access ──
DROP POLICY IF EXISTS chapter_access_isolation ON public.student_chapter_access;
CREATE POLICY chapter_access_isolation ON public.student_chapter_access
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR student_id = auth.uid());

-- ── student_exam_answers ──
DROP POLICY IF EXISTS "Answers access policy" ON public.student_exam_answers;
CREATE POLICY "Answers access policy" ON public.student_exam_answers
  AS PERMISSIVE FOR ALL TO public
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM student_exam_submissions s
      WHERE s.id = student_exam_answers.submission_id
      AND check_is_center_member(s.center_id)
    )
  );

-- ── student_exam_submissions ──
DROP POLICY IF EXISTS submissions_isolation ON public.student_exam_submissions;
CREATE POLICY submissions_isolation ON public.student_exam_submissions
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR student_id = auth.uid());

-- ── student_lesson_access ──
DROP POLICY IF EXISTS lesson_access_isolation ON public.student_lesson_access;
CREATE POLICY lesson_access_isolation ON public.student_lesson_access
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR student_id = auth.uid());

-- ── student_lesson_progress ──
DROP POLICY IF EXISTS "Students can manage their own progress" ON public.student_lesson_progress;
CREATE POLICY "Students can manage their own progress" ON public.student_lesson_progress
  AS PERMISSIVE FOR ALL TO public
  USING (student_id = auth.uid());

-- ── student_online_enrollments ──
DROP POLICY IF EXISTS "Students can enroll themselves" ON public.student_online_enrollments;
CREATE POLICY "Students can enroll themselves" ON public.student_online_enrollments
  AS PERMISSIVE FOR INSERT TO public
  USING (true) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.student_online_enrollments;
CREATE POLICY "Students can view their own enrollments" ON public.student_online_enrollments
  AS PERMISSIVE FOR SELECT TO public
  USING (student_id = auth.uid());

-- ── student_payment_transactions ──
DROP POLICY IF EXISTS payments_isolation ON public.student_payment_transactions;
CREATE POLICY payments_isolation ON public.student_payment_transactions
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR student_id = auth.uid());

-- ── students ──
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
CREATE POLICY "Students can view their own profile" ON public.students
  AS PERMISSIVE FOR SELECT TO public
  USING (auth.uid() = id);

DROP POLICY IF EXISTS students_center_isolation ON public.students;
CREATE POLICY students_center_isolation ON public.students
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR auth.uid() = id);

-- ── support_tickets ──
DROP POLICY IF EXISTS support_tickets_isolation ON public.support_tickets;
CREATE POLICY support_tickets_isolation ON public.support_tickets
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR student_id = auth.uid());

-- ── universal_inbox ──
DROP POLICY IF EXISTS inbox_isolation ON public.universal_inbox;
CREATE POLICY inbox_isolation ON public.universal_inbox
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR recipient_id = auth.uid());

-- ── wallet_transactions ──
DROP POLICY IF EXISTS wallet_tx_center_isolation ON public.wallet_transactions;
CREATE POLICY wallet_tx_center_isolation ON public.wallet_transactions
  AS PERMISSIVE FOR ALL TO public
  USING (center_id = get_my_center_id() OR student_id = auth.uid());


-- ================================================================
-- ✅ VERIFICATION - تأكيد نجاح الـ Migration
-- ================================================================

SELECT 
  'RLS Policies' AS category, COUNT(*) AS count
FROM pg_policies WHERE schemaname = 'public'

UNION ALL

SELECT 'Tables', COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

ORDER BY category;

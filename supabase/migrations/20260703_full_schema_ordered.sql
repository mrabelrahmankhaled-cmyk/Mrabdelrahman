-- ================================================================
-- 🏗️ FULL SCHEMA MIGRATION - ORDERED BY DEPENDENCIES
-- المشروع القديم → الجديد
-- آمن 100% - CREATE TABLE IF NOT EXISTS
-- ================================================================


-- ================================================================
-- PHASE 1: Base tables (لا يعتمدوا على حاجة)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
  key text NOT NULL,
  name text NOT NULL,
  description text,
  CONSTRAINT permissions_pkey PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS public.features (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  CONSTRAINT features_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 180,
  max_students integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  max_staff integer,
  CONSTRAINT packages_pkey PRIMARY KEY (id)
);


-- ================================================================
-- PHASE 2: Core center tables
-- ================================================================

CREATE TABLE IF NOT EXISTS public.centers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscription_plan text DEFAULT 'free'::text,
  created_at timestamp with time zone DEFAULT now(),
  owner_id uuid,
  package_id uuid,
  subscription_end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  super_admin_notes text,
  center_type text DEFAULT 'center'::text CHECK (center_type = ANY (ARRAY['center'::text, 'instructor'::text])),
  CONSTRAINT centers_pkey PRIMARY KEY (id),
  CONSTRAINT centers_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT centers_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id)
);

CREATE TABLE IF NOT EXISTS public.package_features (
  package_id uuid NOT NULL,
  feature_id text NOT NULL,
  CONSTRAINT package_features_pkey PRIMARY KEY (package_id, feature_id),
  CONSTRAINT fk_package FOREIGN KEY (package_id) REFERENCES public.packages(id),
  CONSTRAINT fk_feature FOREIGN KEY (feature_id) REFERENCES public.features(id)
);

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id uuid NOT NULL,
  full_name text,
  role text DEFAULT 'staff'::text,
  center_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  email text,
  expected_check_in time without time zone DEFAULT '09:00:00'::time without time zone,
  late_tolerance_min integer DEFAULT 15,
  CONSTRAINT staff_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT staff_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT staff_profiles_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id)
);

CREATE TABLE IF NOT EXISTS public.center_settings (
  center_id uuid NOT NULL,
  center_name text DEFAULT 'اسم السنتر الافتراضي'::text,
  logo_url text,
  primary_color text DEFAULT '#2563eb'::text,
  address text,
  phone text,
  whatsapp_template text,
  msg_debt text,
  msg_absent text,
  report_footer text DEFAULT 'إدارة السنتر تتمنى لكم التوفيق'::text,
  debt_limit bigint DEFAULT 300,
  center_phone text,
  created_at timestamp with time zone DEFAULT now(),
  next_student_code bigint DEFAULT 100000,
  student_code_prefix text DEFAULT 'S'::text,
  enabled_modules text[] DEFAULT '{sessions,finance,students,exams}'::text[],
  instructor_name text,
  instructor_photo_url text,
  instructor_bio text,
  instructor_title text,
  instructor_subject text,
  hero_title text,
  hero_subtitle text,
  hero_cta_text text DEFAULT 'اشترك دلوقتي !'::text,
  stats jsonb DEFAULT '[]'::jsonb,
  features jsonb DEFAULT '[]'::jsonb,
  social_links jsonb DEFAULT '[]'::jsonb,
  lifestyle_photo_url text,
  about_title text,
  about_description text,
  faqs jsonb DEFAULT '[]'::jsonb,
  marquee_text text,
  landing_page_template text DEFAULT 'elite'::text,
  secondary_color text DEFAULT '#111827'::text,
  hero_bg_color text DEFAULT '#FF4500'::text,
  paymob_api_key text,
  paymob_integration_id_fawry text,
  paymob_integration_id_card text,
  paymob_iframe_id text,
  paymob_hmac_secret text,
  support_phone text,
  whatsapp_number text,
  CONSTRAINT center_settings_pkey PRIMARY KEY (center_id),
  CONSTRAINT center_settings_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id)
);

CREATE TABLE IF NOT EXISTS public.instructors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  phone text,
  percentage numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  center_id uuid,
  CONSTRAINT instructors_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.educational_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  center_id uuid,
  CONSTRAINT educational_stages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  CONSTRAINT rooms_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  phone text,
  parent_phone text,
  grade text,
  unique_id text,
  wallet_balance double precision DEFAULT 0,
  is_free boolean DEFAULT false,
  enrolled_courses text[],
  course_discounts jsonb,
  has_wallet boolean DEFAULT false,
  enrollment_dates jsonb,
  group_ids jsonb DEFAULT '{}'::jsonb,
  total_debt numeric DEFAULT 0,
  deleted_at timestamp without time zone,
  is_new_in_course boolean DEFAULT false,
  center_id uuid,
  access_code text NOT NULL DEFAULT '0'::text,
  is_active boolean NOT NULL DEFAULT true,
  subscription_type text DEFAULT 'عادي'::text,
  free_courses text[] DEFAULT '{}'::text[],
  center_only_courses text[] DEFAULT '{}'::text[],
  monthly_courses text[] DEFAULT '{}'::text[],
  registered_devices text[] DEFAULT '{}'::text[],
  max_devices integer DEFAULT 1,
  CONSTRAINT students_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.permissions (
  key text NOT NULL,
  name text NOT NULL,
  description text,
  CONSTRAINT permissions_pkey PRIMARY KEY (key)
) -- already created above, skip silently
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id integer NOT NULL DEFAULT nextval('staff_permissions_id_seq'::regclass),
  staff_id uuid NOT NULL,
  permission_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  center_id uuid,
  CONSTRAINT staff_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT staff_permissions_permission_key_fkey FOREIGN KEY (permission_key) REFERENCES public.permissions(key)
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  expense_date date DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  staff_name text,
  center_id uuid,
  is_admin boolean DEFAULT false,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);


-- ================================================================
-- PHASE 3: Course hierarchy
-- (lesson_chapters ↔ exams ↔ lessons = circular → نحلها بـ ALTER TABLE)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  instructor text,
  grade text,
  price numeric DEFAULT 0,
  center_tax double precision DEFAULT '0'::double precision,
  instructor_id uuid,
  center_id uuid,
  monthly_price numeric DEFAULT 0,
  is_sequential boolean DEFAULT false,
  thumbnail_url text,
  description text,
  digital_price numeric DEFAULT 0,
  digital_full_price numeric DEFAULT 0,
  original_price numeric DEFAULT 0,
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.instructors(id)
);

CREATE TABLE IF NOT EXISTS public.groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  course_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  center_id uuid,
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- lesson_chapters بدون exam_id FK (circular مع exams)
CREATE TABLE IF NOT EXISTS public.lesson_chapters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  center_id uuid,
  course_id uuid,
  title text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  price numeric DEFAULT 0,
  exam_id uuid, -- FK يتضاف بعدين
  CONSTRAINT lesson_chapters_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_chapters_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id),
  CONSTRAINT lesson_chapters_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- exams بدون lesson_id و chapter_id FK (circular)
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL,
  course_id uuid,
  group_id uuid,
  instructor_id uuid,
  title text NOT NULL,
  max_score numeric DEFAULT 100,
  exam_date date DEFAULT CURRENT_DATE,
  is_published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  grading_token uuid DEFAULT gen_random_uuid(),
  is_electronic boolean DEFAULT false,
  duration_minutes integer DEFAULT 30,
  max_attempts integer DEFAULT 1,
  pass_percentage integer DEFAULT 50,
  shuffle_questions boolean DEFAULT false,
  description text,
  lesson_id uuid, -- FK يتضاف بعدين
  chapter_id uuid, -- FK يتضاف بعدين
  CONSTRAINT exams_pkey PRIMARY KEY (id),
  CONSTRAINT exams_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT exams_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT exams_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.instructors(id)
);

-- lessons بدون exam_id FK (circular)
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid NOT NULL,
  course_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  video_url text,
  video_provider text DEFAULT 'youtube'::text,
  pdf_url text,
  is_free boolean DEFAULT false,
  order_index integer DEFAULT 0,
  chapter_id uuid,
  checkpoints jsonb DEFAULT '[]'::jsonb,
  scheduled_at timestamp with time zone,
  release_type text DEFAULT 'immediate'::text,
  prerequisite_lesson_id uuid,
  thumbnail_url text,
  price numeric DEFAULT 0,
  exam_id uuid, -- FK يتضاف بعدين
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.lesson_chapters(id),
  CONSTRAINT lessons_prerequisite_lesson_id_fkey FOREIGN KEY (prerequisite_lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- ✅ الآن نضيف الـ circular FK constraints
DO $$
BEGIN
  -- lessons → exams
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lessons_exam_id_fkey'
  ) THEN
    ALTER TABLE public.lessons 
    ADD CONSTRAINT lessons_exam_id_fkey 
    FOREIGN KEY (exam_id) REFERENCES public.exams(id);
  END IF;

  -- exams → lessons
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exams_lesson_id_fkey'
  ) THEN
    ALTER TABLE public.exams 
    ADD CONSTRAINT exams_lesson_id_fkey 
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id);
  END IF;

  -- exams → lesson_chapters
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exams_chapter_id_fkey'
  ) THEN
    ALTER TABLE public.exams 
    ADD CONSTRAINT exams_chapter_id_fkey 
    FOREIGN KEY (chapter_id) REFERENCES public.lesson_chapters(id);
  END IF;

  -- lesson_chapters → exams
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lesson_chapters_exam_id_fkey'
  ) THEN
    ALTER TABLE public.lesson_chapters 
    ADD CONSTRAINT lesson_chapters_exam_id_fkey 
    FOREIGN KEY (exam_id) REFERENCES public.exams(id);
  END IF;
END $$;


-- ================================================================
-- PHASE 4: Question bank & Exam details
-- ================================================================

CREATE TABLE IF NOT EXISTS public.question_bank (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  center_id uuid NOT NULL,
  course_id uuid,
  question_text text NOT NULL,
  question_type text DEFAULT 'mcq'::text,
  options jsonb,
  correct_answer text,
  points integer DEFAULT 1,
  difficulty text DEFAULT 'medium'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT question_bank_pkey PRIMARY KEY (id),
  CONSTRAINT question_bank_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id),
  CONSTRAINT question_bank_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  question_id uuid,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_questions_pkey PRIMARY KEY (id),
  CONSTRAINT exam_questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT exam_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id)
);

CREATE TABLE IF NOT EXISTS public.exam_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  student_id uuid NOT NULL,
  score numeric DEFAULT 0,
  status text DEFAULT 'present'::text,
  teacher_comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_results_pkey PRIMARY KEY (id),
  CONSTRAINT exam_results_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT exam_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  student_id uuid NOT NULL,
  score numeric DEFAULT 0,
  total_points numeric DEFAULT 0,
  answers jsonb,
  completed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT exam_submissions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT exam_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.student_exam_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  center_id uuid,
  exam_id uuid,
  student_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  finished_at timestamp with time zone,
  score numeric DEFAULT 0,
  is_passed boolean DEFAULT false,
  status text DEFAULT 'ongoing'::text,
  attempt_number integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_exam_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT student_exam_submissions_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id),
  CONSTRAINT student_exam_submissions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT student_exam_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.student_exam_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid,
  question_id uuid,
  student_id uuid,
  answer_text text,
  is_correct boolean DEFAULT false,
  points_earned numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_exam_answers_pkey PRIMARY KEY (id),
  CONSTRAINT student_exam_answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.student_exam_submissions(id),
  CONSTRAINT student_exam_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id),
  CONSTRAINT student_exam_answers_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);


-- ================================================================
-- PHASE 5: Schedule & Sessions
-- ================================================================

CREATE TABLE IF NOT EXISTS public.schedule (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid,
  room_id uuid,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  exam_id uuid,
  CONSTRAINT schedule_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT schedule_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id),
  CONSTRAINT schedule_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id)
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  topic text NOT NULL,
  course_id uuid,
  price numeric DEFAULT 0,
  attendees text[],
  payments jsonb DEFAULT '{}'::jsonb,
  center_share numeric DEFAULT 0,
  status text DEFAULT 'active'::text,
  fixed_share numeric DEFAULT 0,
  is_completed boolean DEFAULT false,
  calculated_revenue numeric DEFAULT 0,
  calculated_center_share numeric DEFAULT 0,
  group_id uuid,
  end_time timestamp with time zone,
  actual_start_time timestamp with time zone,
  scheduled_start_time text,
  is_archived boolean,
  archived boolean DEFAULT false,
  deleted_at timestamp without time zone,
  center_id uuid,
  session_type text DEFAULT 'lesson'::text,
  linked_exam_id uuid,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_linked_exam_id_fkey FOREIGN KEY (linked_exam_id) REFERENCES public.exams(id),
  CONSTRAINT sessions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT sessions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);


-- ================================================================
-- PHASE 6: Store / Financial
-- ================================================================

CREATE TABLE IF NOT EXISTS public.store_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  name text NOT NULL,
  type text NOT NULL,
  price numeric DEFAULT 0,
  teacher_share numeric DEFAULT 0,
  center_share numeric DEFAULT 0,
  stock integer DEFAULT 0,
  sold_count integer DEFAULT 0,
  course_id uuid,
  supplier_name text,
  receiver_name text,
  received_date date DEFAULT CURRENT_DATE,
  is_archived boolean DEFAULT false,
  center_id uuid,
  damaged_count integer DEFAULT 0,
  grade text,
  teacher_name text,
  CONSTRAINT store_products_pkey PRIMARY KEY (id),
  CONSTRAINT store_products_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

CREATE TABLE IF NOT EXISTS public.store_settlements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  total_amount numeric NOT NULL,
  receiver_name text NOT NULL,
  receiver_role text,
  notes text,
  admin_name text,
  total_count integer DEFAULT 0,
  product_id uuid,
  center_id uuid,
  CONSTRAINT store_settlements_pkey PRIMARY KEY (id),
  CONSTRAINT fk_settlements_product FOREIGN KEY (product_id) REFERENCES public.store_products(id)
);

CREATE TABLE IF NOT EXISTS public.store_sales (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  product_id uuid,
  student_id uuid,
  price_sold numeric,
  seller_name text,
  settlement_id uuid,
  is_settled boolean DEFAULT false,
  whatsapp_sent_at timestamp with time zone,
  whatsapp_sent_to text,
  center_id uuid,
  CONSTRAINT store_sales_pkey PRIMARY KEY (id),
  CONSTRAINT store_sales_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.store_settlements(id),
  CONSTRAINT store_sales_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT store_sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.store_products(id)
);

CREATE TABLE IF NOT EXISTS public.store_returns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  original_sale_id uuid,
  product_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  refund_amount numeric NOT NULL CHECK (refund_amount >= 0::numeric),
  reason text,
  is_damaged boolean DEFAULT false,
  refund_method text DEFAULT 'cash'::text CHECK (refund_method = ANY (ARRAY['cash'::text, 'wallet'::text, 'credit'::text])),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  admin_name text,
  center_id uuid,
  CONSTRAINT store_returns_pkey PRIMARY KEY (id),
  CONSTRAINT store_returns_original_sale_id_fkey FOREIGN KEY (original_sale_id) REFERENCES public.store_sales(id),
  CONSTRAINT store_returns_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.store_products(id),
  CONSTRAINT store_returns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.store_audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  action text NOT NULL,
  details jsonb,
  admin_name text,
  center_id uuid,
  CONSTRAINT store_audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  performed_by text,
  center_id uuid,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES public.staff_profiles(id)
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid,
  amount double precision NOT NULL,
  type text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  balance_after numeric DEFAULT 0,
  notes text,
  center_id uuid,
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff_profiles(id),
  CONSTRAINT wallet_transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.student_payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  center_id uuid,
  course_id uuid,
  amount numeric NOT NULL,
  currency text DEFAULT 'EGP'::text,
  status text DEFAULT 'pending'::text,
  payment_method text,
  external_order_id text,
  payment_reference text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_payment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT student_payment_transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_payment_transactions_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id),
  CONSTRAINT student_payment_transactions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  month_year text NOT NULL,
  amount_paid numeric DEFAULT 0,
  payment_date timestamp with time zone DEFAULT now(),
  center_id uuid NOT NULL,
  notes text,
  expires_at timestamp with time zone,
  CONSTRAINT student_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT student_subscriptions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_subscriptions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT student_subscriptions_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id)
);


-- ================================================================
-- PHASE 7: Notifications & Messaging
-- ================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info'::text,
  created_at timestamp with time zone DEFAULT now(),
  seen_by uuid[] DEFAULT '{}'::uuid[],
  scheduled_at timestamp with time zone,
  status text DEFAULT 'open'::text,
  assigned_to uuid,
  internal_note text,
  sender_type text DEFAULT 'admin'::text,
  is_read boolean DEFAULT false,
  target_audience text[] DEFAULT '{student}'::text[],
  center_id uuid,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.notification_views (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  notification_id uuid,
  student_id uuid,
  seen_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  CONSTRAINT notification_views_pkey PRIMARY KEY (id),
  CONSTRAINT notification_views_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id),
  CONSTRAINT notification_views_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  assigned_to uuid,
  subject text DEFAULT 'استفسار عام'::text,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL,
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  client_side_id uuid,
  center_id uuid,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id)
);

CREATE TABLE IF NOT EXISTS public.universal_inbox (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  recipient_role text CHECK (recipient_role = ANY (ARRAY['student'::text, 'admin'::text, 'staff'::text])),
  recipient_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  category text CHECK (category = ANY (ARRAY['attendance'::text, 'exam'::text, 'payment'::text, 'system'::text, 'request'::text])),
  priority text DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['normal'::text, 'important'::text, 'urgent'::text])),
  action_type text,
  action_id uuid,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'processing'::text, 'resolved'::text])),
  assigned_to uuid,
  internal_note text,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  CONSTRAINT universal_inbox_pkey PRIMARY KEY (id),
  CONSTRAINT universal_inbox_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_type text NOT NULL,
  severity text DEFAULT 'info'::text,
  details text,
  admin_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  CONSTRAINT system_logs_pkey PRIMARY KEY (id),
  CONSTRAINT system_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);


-- ================================================================
-- PHASE 8: Device tokens & Activities
-- ================================================================

CREATE TABLE IF NOT EXISTS public.student_device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  device_token text NOT NULL UNIQUE,
  device_type text,
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  CONSTRAINT student_device_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT student_device_tokens_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.parent_device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  token text NOT NULL UNIQUE,
  device_type text,
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  CONSTRAINT parent_device_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT parent_device_tokens_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.student_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  CONSTRAINT student_activities_pkey PRIMARY KEY (id),
  CONSTRAINT student_activities_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE IF NOT EXISTS public.student_activity_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid,
  center_id uuid,
  activity_type text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT student_activity_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_activity_logs_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id)
);


-- ================================================================
-- PHASE 9: Online learning access
-- ================================================================

CREATE TABLE IF NOT EXISTS public.recharge_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  type text DEFAULT 'course_unlock'::text,
  amount numeric DEFAULT 0,
  course_id uuid,
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  used_by uuid,
  lesson_id uuid,
  target_type text DEFAULT 'course'::text,
  chapter_id uuid,
  CONSTRAINT recharge_codes_pkey PRIMARY KEY (id),
  CONSTRAINT recharge_codes_course_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT recharge_codes_student_fkey FOREIGN KEY (used_by) REFERENCES public.students(id),
  CONSTRAINT recharge_codes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT recharge_codes_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.lesson_chapters(id)
);

CREATE TABLE IF NOT EXISTS public.student_online_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  payment_method text DEFAULT 'voucher'::text,
  CONSTRAINT student_online_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollment_student_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT enrollment_course_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

CREATE TABLE IF NOT EXISTS public.student_lesson_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  lesson_id uuid,
  course_id uuid,
  center_id uuid,
  activated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_lesson_access_pkey PRIMARY KEY (id),
  CONSTRAINT student_lesson_access_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_lesson_access_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT student_lesson_access_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT student_lesson_access_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id)
);

CREATE TABLE IF NOT EXISTS public.student_chapter_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  chapter_id uuid,
  course_id uuid,
  center_id uuid,
  activated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_chapter_access_pkey PRIMARY KEY (id),
  CONSTRAINT student_chapter_access_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_chapter_access_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.lesson_chapters(id),
  CONSTRAINT student_chapter_access_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT student_chapter_access_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id)
);

CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  watched_at timestamp with time zone DEFAULT now(),
  is_completed boolean DEFAULT false,
  resume_position integer DEFAULT 0,
  watched_seconds integer DEFAULT 0,
  total_duration integer DEFAULT 0,
  watch_percentage integer DEFAULT 0,
  center_id uuid,
  CONSTRAINT student_lesson_progress_pkey PRIMARY KEY (id),
  CONSTRAINT progress_student_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT progress_lesson_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT student_lesson_progress_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id)
);


-- ================================================================
-- PHASE 10: Staff management
-- ================================================================

CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  staff_name text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  duration_minutes integer,
  status text DEFAULT 'present'::text CHECK (status = ANY (ARRAY['present'::text, 'late'::text, 'auto_out'::text, 'modified'::text])),
  ip_address text,
  latitude numeric,
  longitude numeric,
  device_info text,
  is_modified boolean DEFAULT false,
  modified_by uuid,
  modified_at timestamp with time zone,
  modification_reason text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT staff_attendance_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id)
);

CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  expected_check_in time without time zone,
  late_tolerance_min integer DEFAULT 15,
  is_day_off boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT staff_schedules_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id)
);


-- ================================================================
-- PHASE 11: Discussions & Comments
-- ================================================================

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lesson_id uuid,
  student_id uuid,
  staff_id uuid,
  comment_text text NOT NULL,
  video_timestamp double precision DEFAULT 0,
  parent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_comments_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_comments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT lesson_comments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT lesson_comments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_profiles(id),
  CONSTRAINT lesson_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.lesson_comments(id)
);

CREATE TABLE IF NOT EXISTS public.lesson_discussions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lesson_id uuid,
  student_id uuid,
  staff_id uuid,
  message text NOT NULL,
  video_timestamp double precision DEFAULT 0,
  is_resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  center_id uuid,
  parent_id uuid,
  sender_type text DEFAULT 'student'::text,
  CONSTRAINT lesson_discussions_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_discussions_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id),
  CONSTRAINT lesson_discussions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT lesson_discussions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT lesson_discussions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_profiles(id),
  CONSTRAINT lesson_discussions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.lesson_discussions(id)
);


-- ================================================================
-- ✅ VERIFICATION
-- ================================================================
SELECT 
  COUNT(*) AS total_tables,
  'Tables created successfully!' AS status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

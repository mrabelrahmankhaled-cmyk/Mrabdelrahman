-- ========================================================
-- 🏆 CLASSORA - PRODUCTION MASTER SETUP SQL
-- 🎯 Use this script to setup a BRAND NEW Supabase project
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- لدعم البحث السريع بالأسماء

-- 2. CORE SAAS TABLES
CREATE TABLE IF NOT EXISTS public.centers (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  subscription_plan TEXT DEFAULT 'free',
  package_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  max_students INTEGER DEFAULT 50,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  center_phone TEXT,
  center_address TEXT,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.packages (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  max_students INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.features (
  id TEXT PRIMARY KEY, -- e.g. 'page_students', 'action_delete_exam'
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.package_features (
  package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
  feature_id TEXT REFERENCES public.features(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_key TEXT NOT NULL
);

-- 3. USER & PROFILE TABLES
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  full_name TEXT,
  role TEXT DEFAULT 'staff', -- super_admin, admin, staff
  phone TEXT,
  pin_code TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  permission_key TEXT REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, center_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.center_settings (
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE PRIMARY KEY,
    center_name TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    whatsapp_number TEXT,
    currency TEXT DEFAULT 'EGP',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ACADEMIC TABLES
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  name TEXT NOT NULL,
  grade TEXT,
  instructor TEXT,
  instructor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  created_at timestamp with time zone NULL DEFAULT now(),
  name text NOT NULL,
  phone text NULL,
  parent_phone text NULL,
  grade text NULL,
  unique_id text NULL,
  wallet_balance double precision NULL DEFAULT 0,
  is_free boolean NULL DEFAULT false,
  enrolled_courses text[] NULL,
  course_discounts jsonb NULL,
  has_wallet boolean NULL DEFAULT false,
  enrollment_dates jsonb NULL,
  group_ids jsonb NULL DEFAULT '{}'::jsonb,
  total_debt numeric NULL DEFAULT 0,
  deleted_at timestamp without time zone NULL,
  is_new_in_course boolean NULL DEFAULT false,
  center_id uuid REFERENCES public.centers(id),
  access_code text NOT NULL DEFAULT '0'::text,
  is_active boolean NOT NULL DEFAULT true,
  subscription_type text NULL DEFAULT 'عادي'::text,
  free_courses text[] NULL DEFAULT '{}'::text[],
  center_only_courses text[] NULL DEFAULT '{}'::text[],
  monthly_courses text[] NULL DEFAULT '{}'::text[],
  constraint students_pkey primary key (id),
  constraint students_unique_id_key unique (unique_id)
);

-- Indices for Students (Performance)
CREATE INDEX IF NOT EXISTS idx_students_center_id ON public.students (center_id);
CREATE INDEX IF NOT EXISTS idx_students_unique_id ON public.students (unique_id);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON public.students USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.schedule (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  day_of_week INTEGER, -- 0-6
  start_time TIME,
  end_time TIME,
  room_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  name TEXT NOT NULL,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  group_id UUID REFERENCES public.groups(id),
  topic TEXT,
  actual_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'open',
  payments DECIMAL(10,2) DEFAULT 0,
  fixed_share DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    center_id UUID REFERENCES public.centers(id),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id),
    status TEXT DEFAULT 'present', -- present, absent, late
    payment_status TEXT DEFAULT 'unpaid',
    amount_paid DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  group_id UUID REFERENCES public.groups(id),
  title TEXT NOT NULL,
  max_score INTEGER,
  exam_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. FINANCE TABLES
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  staff_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  student_id UUID REFERENCES public.students(id),
  amount DECIMAL(10,2) NOT NULL,
  type TEXT, -- deposit, withdrawal
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SECURITY: ENABLE RLS
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_settings ENABLE ROW LEVEL SECURITY;

-- 7. AUTH TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'staff');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. GLOBAL RLS POLICIES (Center Isolation)
-- This ensures that users can ONLY see data belonging to their center.

-- Staff Profiles
DROP POLICY IF EXISTS "Staff Isolation" ON public.staff_profiles;
CREATE POLICY "Staff Isolation" ON public.staff_profiles FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR role = 'super_admin');

-- Students
DROP POLICY IF EXISTS "Student Isolation" ON public.students;
CREATE POLICY "Student Isolation" ON public.students FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'super_admin');

-- Courses
DROP POLICY IF EXISTS "Course Isolation" ON public.courses;
CREATE POLICY "Course Isolation" ON public.courses FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'super_admin');

-- Groups
DROP POLICY IF EXISTS "Group Isolation" ON public.groups;
CREATE POLICY "Group Isolation" ON public.groups FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'super_admin');

-- Sessions
DROP POLICY IF EXISTS "Session Isolation" ON public.sessions;
CREATE POLICY "Session Isolation" ON public.sessions FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'super_admin');

-- Attendance
DROP POLICY IF EXISTS "Attendance Isolation" ON public.attendance;
CREATE POLICY "Attendance Isolation" ON public.attendance FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'super_admin');

-- Expenses
DROP POLICY IF EXISTS "Expense Isolation" ON public.expenses;
CREATE POLICY "Expense Isolation" ON public.expenses FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'super_admin');

-- Wallet Transactions
DROP POLICY IF EXISTS "Wallet Isolation" ON public.wallet_transactions;
CREATE POLICY "Wallet Isolation" ON public.wallet_transactions FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'super_admin');

-- Exams
DROP POLICY IF EXISTS "Exam Isolation" ON public.exams;
CREATE POLICY "Exam Isolation" ON public.exams FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'super_admin');

-- Center Settings
DROP POLICY IF EXISTS "Settings Isolation" ON public.center_settings;
CREATE POLICY "Settings Isolation" ON public.center_settings FOR ALL USING (center_id IN (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) OR (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'super_admin');

-- 9. 🚀 SEED DATA (The UI Heartbeat)
-- Features (Page Modules)
INSERT INTO public.features (id, name, description) VALUES
('page_students', 'قائمة الطلاب', 'الوصول لبيانات الطلاب وبحثهم'),
('page_sessions', 'إدارة الحصص', 'فتح حصص جديدة وتسجيل حضور'),
('page_schedule', 'الجدول الدراسي', 'عرض وتعديل المواعيد'),
('page_exams', 'الاختبارات والنتائج', 'رصد درجات الامتحانات'),
('page_finance_wallets', 'شحن المحافظ', 'إدارة محافظ الطلاب الإلكترونية'),
('page_finance_debts', 'المديونيات', 'متابعة وتنبيه المتأخرات المادية'),
('page_expenses', 'المصروفات', 'تسجيل بنود الصرف وحساب الأرباح'),
('page_notifications', 'مركز البث', 'إرسال رسائل جماعية وواتساب'),
('page_staff_permissions', 'أذونات الموظفين', 'التحكم في صلاحيات الفريق'),
('page_subscriptions', 'الاشتراكات الشهرية', 'نظام تحصيل السناتر الشهرية');

-- Permissions (Granular Actions)
INSERT INTO public.permissions (key, name, group_key) VALUES
('students:view', 'عرض الطلاب', 'students'),
('students:add', 'إضافة طالب', 'students'),
('students:edit', 'تعديل طالب', 'students'),
('students:delete', 'حذف طالب', 'students'),
('students:finance', 'إدارة ماليات الطالب', 'students'),
('academic:sessions', 'إدارة الحصص', 'academic'),
('academic:schedule', 'إدارة الجدول', 'academic'),
('academic:exams', 'إدارة الاختبارات', 'academic'),
('expenses:view', 'عرض المصروفات', 'finance'),
('expenses:add', 'إضافة مصروف', 'finance'),
('wallet:view', 'عرض المحافظ', 'finance'),
('wallet:deposit', 'شحن المحفظة', 'finance'),
('staff:view', 'عرض الموظفين', 'admin'),
('staff:manage', 'إدارة الموظفين', 'admin'),
('settings:general', 'إعدادات السنتر', 'admin'),
('logs:view', 'سجل الرقابة', 'admin');

-- Default Packages
INSERT INTO public.packages (id, name, price, duration_days, max_students) VALUES
('00000000-0000-0000-0000-000000000001', 'الباقة المجانية', 0, 365, 50),
('00000000-0000-0000-0000-000000000002', 'الباقة الاحترافية', 1500, 30, 500),
('00000000-0000-0000-0000-000000000003', 'الباقة الكاملة - مدى الحياة', 10000, 36500, 99999);

-- Link all features to the Lifetime package
INSERT INTO public.package_features (package_id, feature_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM public.features;

-- 🔟 FINAL NOTICE
DO $$
BEGIN
    RAISE NOTICE '✅ Production Master SQL has been executed successfully!';
END $$;

-- ========================================
-- SaaS Migration: Safe Version (Checks Existing Tables)
-- ========================================

-- 1. التأكد من تفعيل إضافة الـ UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2. إنشاء جدول المراكز (Tenants) FIRST
-- ========================================
CREATE TABLE IF NOT EXISTS public.centers (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  subscription_plan TEXT DEFAULT 'free',
  max_students INTEGER DEFAULT 50,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  center_phone TEXT,
  center_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. 🔥 إنشاء السنتر الافتراضي FIRST (قبل أي تعديل)
-- ========================================
INSERT INTO public.centers (id, name, subscription_plan, max_students)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'المركز الرئيسي',
  'enterprise',
  999999
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 4. إضافة الأعمدة لكل الجداول (مع التحقق من وجودها)
-- ========================================

-- Staff Profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_profiles' AND column_name = 'center_id') THEN
    RAISE NOTICE 'center_id column already exists in staff_profiles';
  ELSE
    ALTER TABLE public.staff_profiles ADD COLUMN center_id UUID REFERENCES public.centers(id);
    CREATE INDEX IF NOT EXISTS idx_staff_profiles_center_id ON public.staff_profiles(center_id);
    RAISE NOTICE 'Added center_id column to staff_profiles';
  END IF;
END $$;

-- Students
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'center_id') THEN
    RAISE NOTICE 'center_id column already exists in students';
  ELSE
    ALTER TABLE public.students ADD COLUMN center_id UUID REFERENCES public.centers(id);
    CREATE INDEX IF NOT EXISTS idx_students_center_id ON public.students(center_id);
    RAISE NOTICE 'Added center_id column to students';
  END IF;
END $$;

-- Courses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'center_id') THEN
    RAISE NOTICE 'center_id column already exists in courses';
  ELSE
    ALTER TABLE public.courses ADD COLUMN center_id UUID REFERENCES public.centers(id);
    CREATE INDEX IF NOT EXISTS idx_courses_center_id ON public.courses(center_id);
    RAISE NOTICE 'Added center_id column to courses';
  END IF;
END $$;

-- Groups
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'center_id') THEN
    RAISE NOTICE 'center_id column already exists in groups';
  ELSE
    ALTER TABLE public.groups ADD COLUMN center_id UUID REFERENCES public.centers(id);
    CREATE INDEX IF NOT EXISTS idx_groups_center_id ON public.groups(center_id);
    RAISE NOTICE 'Added center_id column to groups';
  END IF;
END $$;

-- Sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'center_id') THEN
    RAISE NOTICE 'center_id column already exists in sessions';
  ELSE
    ALTER TABLE public.sessions ADD COLUMN center_id UUID REFERENCES public.centers(id);
    CREATE INDEX IF NOT EXISTS idx_sessions_center_id ON public.sessions(center_id);
    RAISE NOTICE 'Added center_id column to sessions';
  END IF;
END $$;

-- Expenses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'center_id') THEN
    RAISE NOTICE 'center_id column already exists in expenses';
  ELSE
    ALTER TABLE public.expenses ADD COLUMN center_id UUID REFERENCES public.centers(id);
    CREATE INDEX IF NOT EXISTS idx_expenses_center_id ON public.expenses(center_id);
    RAISE NOTICE 'Added center_id column to expenses';
  END IF;
END $$;

-- Wallet Transactions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'center_id') THEN
    RAISE NOTICE 'center_id column already exists in wallet_transactions';
  ELSE
    ALTER TABLE public.wallet_transactions ADD COLUMN center_id UUID REFERENCES public.centers(id);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_center_id ON public.wallet_transactions(center_id);
    RAISE NOTICE 'Added center_id column to wallet_transactions';
  END IF;
END $$;

-- Debts (مع التحقق من وجود الجدول)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debts' AND column_name = 'center_id') THEN
      RAISE NOTICE 'center_id column already exists in debts';
    ELSE
      ALTER TABLE public.debts ADD COLUMN center_id UUID REFERENCES public.centers(id);
      CREATE INDEX IF NOT EXISTS idx_debts_center_id ON public.debts(center_id);
      RAISE NOTICE 'Added center_id column to debts';
    END IF;
  ELSE
    RAISE NOTICE 'debts table does not exist - skipping';
  END IF;
END $$;

-- Audit Logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'center_id') THEN
    RAISE NOTICE 'center_id column already exists in audit_logs';
  ELSE
    ALTER TABLE public.audit_logs ADD COLUMN center_id UUID REFERENCES public.centers(id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_center_id ON public.audit_logs(center_id);
    RAISE NOTICE 'Added center_id column to audit_logs';
  END IF;
END $$;

-- ========================================
-- 5. ترحيل البيانات القديمة (مع التحقق من وجود الجداول)
-- ========================================

DO $$
BEGIN
  -- Staff Profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_profiles') THEN
    UPDATE public.staff_profiles SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
    RAISE NOTICE 'Migrated staff_profiles to default center';
  END IF;

  -- Students
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
    UPDATE public.students SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
    RAISE NOTICE 'Migrated students to default center';
  END IF;

  -- Courses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
    UPDATE public.courses SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
    RAISE NOTICE 'Migrated courses to default center';
  END IF;

  -- Groups
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
    UPDATE public.groups SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
    RAISE NOTICE 'Migrated groups to default center';
  END IF;

  -- Sessions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
    UPDATE public.sessions SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
    RAISE NOTICE 'Migrated sessions to default center';
  END IF;

  -- Expenses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    UPDATE public.expenses SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
    RAISE NOTICE 'Migrated expenses to default center';
  END IF;

  -- Debts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
    UPDATE public.debts SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
    RAISE NOTICE 'Migrated debts to default center';
  END IF;

  -- Wallet Transactions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
    UPDATE public.wallet_transactions SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
    RAISE NOTICE 'Migrated wallet_transactions to default center';
  END IF;

  -- Audit Logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    UPDATE public.audit_logs SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
    RAISE NOTICE 'Migrated audit_logs to default center';
  END IF;
END $$;

-- ========================================
-- 6. تفعيل RLS (مع التحقق من وجود الجداول)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'centers') THEN
    ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on centers table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_profiles') THEN
    ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on staff_profiles table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
    ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on students table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
    ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on courses table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
    ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on groups table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
    ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on sessions table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on expenses table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
    ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on debts table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
    ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on wallet_transactions table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on audit_logs table';
  END IF;
END $$;

-- ========================================
-- 7. إنشاء سياسات RLS (مع التحقق من وجود الجداول)
-- ========================================

-- Centers Policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'centers') THEN
    DROP POLICY IF EXISTS "Users can view their own center" ON public.centers;
    CREATE POLICY "Users can view their own center" ON public.centers
    FOR SELECT USING (
      id IN (
        SELECT center_id FROM public.staff_profiles 
        WHERE id = auth.uid()
      )
    );
    RAISE NOTICE 'Created RLS policy for centers';
  END IF;
END $$;

-- Staff Profiles Policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_profiles') THEN
    DROP POLICY IF EXISTS "Users can view staff in their center" ON public.staff_profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.staff_profiles;
    DROP POLICY IF EXISTS "Center admins can insert staff" ON public.staff_profiles;
    
    CREATE POLICY "Users can view staff in their center" ON public.staff_profiles
    FOR SELECT USING (
      center_id IN (
        SELECT center_id FROM public.staff_profiles 
        WHERE id = auth.uid()
      )
    );
    
    CREATE POLICY "Users can update their own profile" ON public.staff_profiles
    FOR UPDATE USING (
      id = auth.uid()
    );
    
    CREATE POLICY "Center admins can insert staff" ON public.staff_profiles
    FOR INSERT WITH CHECK (
      center_id IN (
        SELECT center_id FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    );
    RAISE NOTICE 'Created RLS policies for staff_profiles';
  END IF;
END $$;

-- Students Policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
    DROP POLICY IF EXISTS "Users can view students in their center" ON public.students;
    DROP POLICY IF EXISTS "Users can insert students" ON public.students;
    DROP POLICY IF EXISTS "Users can update students in their center" ON public.students;
    DROP POLICY IF EXISTS "Users can delete students in their center" ON public.students;
    
    CREATE POLICY "Users can view students in their center" ON public.students
    FOR SELECT USING (
      center_id IN (
        SELECT center_id FROM public.staff_profiles 
        WHERE id = auth.uid()
      )
    );
    
    CREATE POLICY "Users can manage students in their center" ON public.students
    FOR ALL USING (
      center_id IN (
        SELECT center_id FROM public.staff_profiles 
        WHERE id = auth.uid()
      )
    );
    RAISE NOTICE 'Created RLS policies for students';
  END IF;
END $$;

-- ========================================
-- 8. التحقق النهائي
-- ========================================

DO $$
BEGIN
  DECLARE 
    staff_count INTEGER := 0;
    students_count INTEGER := 0;
    centers_count INTEGER := 0;
  BEGIN
    -- عد المراكز
    SELECT COUNT(*) INTO centers_count FROM public.centers;
    
    -- عد الموظفين
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_profiles') THEN
      SELECT COUNT(*) INTO staff_count FROM public.staff_profiles WHERE center_id = '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
    
    -- عد الطلاب
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
      SELECT COUNT(*) INTO students_count FROM public.students WHERE center_id = '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
    
    RAISE NOTICE '🎉 Migration Summary:';
    RAISE NOTICE '📊 Centers: %', centers_count;
    RAISE NOTICE '👥 Staff migrated: %', staff_count;
    RAISE NOTICE '🎓 Students migrated: %', students_count;
    RAISE NOTICE '✅ SaaS Migration completed successfully!';
  END IF;
END $$;

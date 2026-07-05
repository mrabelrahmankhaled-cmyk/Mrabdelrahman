-- ========================================
-- SaaS Migration: Fixed Version (No Chicken & Egg Problem)
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
-- 4. إضافة الأعمدة لكل الجداول (بدون ربط حالياً)
-- ========================================

-- Staff Profiles
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_center_id ON public.staff_profiles(center_id);

-- Students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);
CREATE INDEX IF NOT EXISTS idx_students_center_id ON public.students(center_id);

-- Courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);
CREATE INDEX IF NOT EXISTS idx_courses_center_id ON public.courses(center_id);

-- Groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);
CREATE INDEX IF NOT EXISTS idx_groups_center_id ON public.groups(center_id);

-- Sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);
CREATE INDEX IF NOT EXISTS idx_sessions_center_id ON public.sessions(center_id);

-- Expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);
CREATE INDEX IF NOT EXISTS idx_expenses_center_id ON public.expenses(center_id);

-- Wallet Transactions
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_center_id ON public.wallet_transactions(center_id);

-- Debts
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);
CREATE INDEX IF NOT EXISTS idx_debts_center_id ON public.debts(center_id);

-- Audit Logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_center_id ON public.audit_logs(center_id);

-- ========================================
-- 5. ترحيل البيانات القديمة (المهم جداً!)
-- ========================================

-- تحديث كل البيانات القديمة لتكون تبع المركز الرئيسي
UPDATE public.staff_profiles SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.students SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.courses SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.groups SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.sessions SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.expenses SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.debts SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.wallet_transactions SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.audit_logs SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;

-- ========================================
-- 6. جعل الأعمدة NOT NULL (لضمان السلامة المستقبلية)
-- ========================================
-- ALTER TABLE public.students ALTER COLUMN center_id SET NOT NULL;
-- ALTER TABLE public.courses ALTER COLUMN center_id SET NOT NULL;
-- ALTER TABLE public.groups ALTER COLUMN center_id SET NOT NULL;
-- ALTER TABLE public.sessions ALTER COLUMN center_id SET NOT NULL;
-- ALTER TABLE public.expenses ALTER COLUMN center_id SET NOT NULL;
-- ALTER TABLE public.debts ALTER COLUMN center_id SET NOT NULL;
-- ALTER TABLE public.wallet_transactions ALTER COLUMN center_id SET NOT NULL;

-- ========================================
-- 7. تفعيل RLS على كل الجداول
-- ========================================
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 8. حذف أي سياسات قديمة (للتجنب التعارض)
-- ========================================
DROP POLICY IF EXISTS "Users can view their own center" ON public.centers;
DROP POLICY IF EXISTS "Center admins can update their center" ON public.centers;
DROP POLICY IF EXISTS "Users can view staff in their center" ON public.staff_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Center admins can insert staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Users can view students in their center" ON public.students;
DROP POLICY IF EXISTS "Users can insert students" ON public.students;
DROP POLICY IF EXISTS "Users can update students in their center" ON public.students;
DROP POLICY IF EXISTS "Users can delete students in their center" ON public.students;
DROP POLICY IF EXISTS "Users can view courses in their center" ON public.courses;
DROP POLICY IF EXISTS "Users can manage courses in their center" ON public.courses;
DROP POLICY IF EXISTS "Users can view groups in their center" ON public.groups;
DROP POLICY IF EXISTS "Users can manage groups in their center" ON public.groups;
DROP POLICY IF EXISTS "Users can view sessions in their center" ON public.sessions;
DROP POLICY IF EXISTS "Users can manage sessions in their center" ON public.sessions;
DROP POLICY IF EXISTS "Users can view expenses in their center" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage expenses in their center" ON public.expenses;
DROP POLICY IF EXISTS "Users can view wallet transactions in their center" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can manage wallet transactions in their center" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view debts in their center" ON public.debts;
DROP POLICY IF EXISTS "Users can manage debts in their center" ON public.debts;

-- ========================================
-- 9. إنشاء سياسات RLS جديدة (صحيحة 100%)
-- ========================================

-- Centers Policies
CREATE POLICY "Users can view their own center" ON public.centers
FOR SELECT USING (
  id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Center admins can update their center" ON public.centers
FOR UPDATE USING (
  id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Staff Profiles Policies
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

-- Students Policies
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

-- Courses Policies
CREATE POLICY "Users can view courses in their center" ON public.courses
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage courses in their center" ON public.courses
FOR ALL USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- Groups Policies
CREATE POLICY "Users can view groups in their center" ON public.groups
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage groups in their center" ON public.groups
FOR ALL USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- Sessions Policies
CREATE POLICY "Users can view sessions in their center" ON public.sessions
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage sessions in their center" ON public.sessions
FOR ALL USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- Finance Policies
CREATE POLICY "Users can view expenses in their center" ON public.expenses
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage expenses in their center" ON public.expenses
FOR ALL USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view wallet transactions in their center" ON public.wallet_transactions
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage wallet transactions in their center" ON public.wallet_transactions
FOR ALL USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view debts in their center" ON public.debts
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage debts in their center" ON public.debts
FOR ALL USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- Audit Logs Policies
CREATE POLICY "Users can view audit logs in their center" ON public.audit_logs
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- ========================================
-- 10. التحقق النهائي
-- ========================================

-- تأكد من وجود السنتر الرئيسي
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.centers WHERE id = '00000000-0000-0000-0000-000000000001'::uuid) THEN
    RAISE NOTICE '✅ Default center created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create default center';
  END IF;
END $$;

-- تأكد من تحديث البيانات
DO $$
BEGIN
  DECLARE 
    staff_count INTEGER;
    students_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO staff_count FROM public.staff_profiles WHERE center_id = '00000000-0000-0000-0000-000000000001'::uuid;
    SELECT COUNT(*) INTO students_count FROM public.students WHERE center_id = '00000000-0000-0000-0000-000000000001'::uuid;
    
    RAISE NOTICE '📊 Migration Results: % staff, % students migrated', staff_count, students_count;
  END IF;
END $$;

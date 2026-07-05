-- ========================================
-- SaaS Migration: Add Multi-Tenancy
-- ========================================

-- 1. جدول المراكز (Tenants)
CREATE TABLE IF NOT EXISTS public.centers (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  subscription_plan TEXT DEFAULT 'free', -- free, pro, enterprise
  max_students INTEGER DEFAULT 50,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  center_phone TEXT,
  center_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ربط الموظفين بالمركز
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

-- 3. ربط الطلاب بالمركز
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

-- 4. ربط الكورسات بالمركز
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

-- 5. ربط المجموعات بالمركز
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

-- 6. ربط الجلسات بالمركز
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

-- 7. ربط المصروفات بالمركز
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

-- 8. ربط المحافظ بالمركز
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

-- 9. ربط المديونيات بالمركز
ALTER TABLE public.debts 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

-- 10. ربط الإعدادات بالمركز
ALTER TABLE public.center_settings 
ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

-- ========================================
-- Create Indexes for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_staff_profiles_center_id ON public.staff_profiles(center_id);
CREATE INDEX IF NOT EXISTS idx_students_center_id ON public.students(center_id);
CREATE INDEX IF NOT EXISTS idx_courses_center_id ON public.courses(center_id);
CREATE INDEX IF NOT EXISTS idx_groups_center_id ON public.groups(center_id);
CREATE INDEX IF NOT EXISTS idx_sessions_center_id ON public.sessions(center_id);
CREATE INDEX IF NOT EXISTS idx_expenses_center_id ON public.expenses(center_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_center_id ON public.wallet_transactions(center_id);
CREATE INDEX IF NOT EXISTS idx_debts_center_id ON public.debts(center_id);

-- ========================================
-- Insert Default Center (for existing data)
-- ========================================

-- Update existing records to belong to default center
UPDATE public.staff_profiles SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.students SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.courses SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.groups SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.sessions SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.expenses SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.wallet_transactions SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.debts SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;
UPDATE public.center_settings SET center_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE center_id IS NULL;

-- Insert default center
INSERT INTO public.centers (
  id, name, subscription_plan, max_students, 
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Smart Center',
  'enterprise',
  999999,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

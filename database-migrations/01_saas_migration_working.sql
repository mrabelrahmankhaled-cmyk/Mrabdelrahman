-- ========================================
-- SaaS Migration: Working Version with Proper Variable Declaration
-- ========================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2. Create centers table
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
-- 3. Insert default center
INSERT INTO public.centers (id, name, subscription_plan, max_students)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'المركز الرئيسي',
  'enterprise',
  999999
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 4. Add center_id columns safely
DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    -- Staff Profiles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff_profiles' AND column_name = 'center_id'
    ) INTO column_exists;
    
    IF column_exists = FALSE THEN
        ALTER TABLE public.staff_profiles ADD COLUMN center_id UUID REFERENCES public.centers(id);
        CREATE INDEX IF NOT EXISTS idx_staff_profiles_center_id ON public.staff_profiles(center_id);
        RAISE NOTICE 'Added center_id to staff_profiles';
    END IF;
    
    -- Students
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'center_id'
    ) INTO column_exists;
    
    IF column_exists = FALSE THEN
        ALTER TABLE public.students ADD COLUMN center_id UUID REFERENCES public.centers(id);
        CREATE INDEX IF NOT EXISTS idx_students_center_id ON public.students(center_id);
        RAISE NOTICE 'Added center_id to students';
    END IF;
    
    -- Courses
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'center_id'
    ) INTO column_exists;
    
    IF column_exists = FALSE THEN
        ALTER TABLE public.courses ADD COLUMN center_id UUID REFERENCES public.centers(id);
        CREATE INDEX IF NOT EXISTS idx_courses_center_id ON public.courses(center_id);
        RAISE NOTICE 'Added center_id to courses';
    END IF;
    
    -- Groups
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'groups' AND column_name = 'center_id'
    ) INTO column_exists;
    
    IF column_exists = FALSE THEN
        ALTER TABLE public.groups ADD COLUMN center_id UUID REFERENCES public.centers(id);
        CREATE INDEX IF NOT EXISTS idx_groups_center_id ON public.groups(center_id);
        RAISE NOTICE 'Added center_id to groups';
    END IF;
    
    -- Sessions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'center_id'
    ) INTO column_exists;
    
    IF column_exists = FALSE THEN
        ALTER TABLE public.sessions ADD COLUMN center_id UUID REFERENCES public.centers(id);
        CREATE INDEX IF NOT EXISTS idx_sessions_center_id ON public.sessions(center_id);
        RAISE NOTICE 'Added center_id to sessions';
    END IF;
    
    -- Expenses
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'center_id'
    ) INTO column_exists;
    
    IF column_exists = FALSE THEN
        ALTER TABLE public.expenses ADD COLUMN center_id UUID REFERENCES public.centers(id);
        CREATE INDEX IF NOT EXISTS idx_expenses_center_id ON public.expenses(center_id);
        RAISE NOTICE 'Added center_id to expenses';
    END IF;
    
    -- Debts (check if table exists first)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'debts'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'debts' AND column_name = 'center_id'
        ) INTO column_exists;
        
        IF column_exists = FALSE THEN
            ALTER TABLE public.debts ADD COLUMN center_id UUID REFERENCES public.centers(id);
            CREATE INDEX IF NOT EXISTS idx_debts_center_id ON public.debts(center_id);
            RAISE NOTICE 'Added center_id to debts';
        END IF;
    END IF;
    
    -- Wallet Transactions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallet_transactions' AND column_name = 'center_id'
    ) INTO column_exists;
    
    IF column_exists = FALSE THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN center_id UUID REFERENCES public.centers(id);
        CREATE INDEX IF NOT EXISTS idx_wallet_transactions_center_id ON public.wallet_transactions(center_id);
        RAISE NOTICE 'Added center_id to wallet_transactions';
    END IF;
END $$;

-- ========================================
-- 5. Migrate existing data
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Staff Profiles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'staff_profiles'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        UPDATE public.staff_profiles 
        SET center_id = '00000000-0000-0000-0000-000000000001'::uuid 
        WHERE center_id IS NULL;
        RAISE NOTICE 'Migrated staff_profiles';
    END IF;
    
    -- Students
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'students'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        UPDATE public.students 
        SET center_id = '00000000-0000-0000-0000-000000000001'::uuid 
        WHERE center_id IS NULL;
        RAISE NOTICE 'Migrated students';
    END IF;
    
    -- Courses
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'courses'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        UPDATE public.courses 
        SET center_id = '00000000-0000-0000-0000-000000000001'::uuid 
        WHERE center_id IS NULL;
        RAISE NOTICE 'Migrated courses';
    END IF;
    
    -- Groups
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'groups'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        UPDATE public.groups 
        SET center_id = '00000000-0000-0000-0000-000000000001'::uuid 
        WHERE center_id IS NULL;
        RAISE NOTICE 'Migrated groups';
    END IF;
    
    -- Sessions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'sessions'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        UPDATE public.sessions 
        SET center_id = '00000000-0000-0000-0000-000000000001'::uuid 
        WHERE center_id IS NULL;
        RAISE NOTICE 'Migrated sessions';
    END IF;
    
    -- Expenses
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'expenses'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        UPDATE public.expenses 
        SET center_id = '00000000-0000-0000-0000-000000000001'::uuid 
        WHERE center_id IS NULL;
        RAISE NOTICE 'Migrated expenses';
    END IF;
    
    -- Debts
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'debts'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        UPDATE public.debts 
        SET center_id = '00000000-0000-0000-0000-000000000001'::uuid 
        WHERE center_id IS NULL;
        RAISE NOTICE 'Migrated debts';
    END IF;
    
    -- Wallet Transactions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'wallet_transactions'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        UPDATE public.wallet_transactions 
        SET center_id = '00000000-0000-0000-0000-000000000001'::uuid 
        WHERE center_id IS NULL;
        RAISE NOTICE 'Migrated wallet_transactions';
    END IF;
END $$;

-- ========================================
-- 6. Enable RLS
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Centers
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'centers'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on centers';
    END IF;
    
    -- Staff Profiles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'staff_profiles'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on staff_profiles';
    END IF;
    
    -- Students
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'students'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on students';
    END IF;
    
    -- Courses
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'courses'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on courses';
    END IF;
    
    -- Groups
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'groups'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on groups';
    END IF;
    
    -- Sessions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'sessions'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on sessions';
    END IF;
    
    -- Expenses
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'expenses'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on expenses';
    END IF;
    
    -- Debts
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'debts'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on debts';
    END IF;
    
    -- Wallet Transactions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'wallet_transactions'
    ) INTO table_exists;
    
    IF table_exists = TRUE THEN
        ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on wallet_transactions';
    END IF;
END $$;

-- ========================================
-- 7. Create RLS Policies
-- Centers Policy
DROP POLICY IF EXISTS "Users can view their own center" ON public.centers;
CREATE POLICY "Users can view their own center" ON public.centers
FOR SELECT USING (
  id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- Staff Profiles Policies
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

-- Students Policies
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

-- ========================================
-- 8. Final Summary
DO $$
DECLARE
    staff_count INTEGER := 0;
    students_count INTEGER := 0;
    centers_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO centers_count FROM public.centers;
    
    SELECT COUNT(*) INTO staff_count FROM public.staff_profiles WHERE center_id = '00000000-0000-0000-0000-000000000001'::uuid;
    
    SELECT COUNT(*) INTO students_count FROM public.students WHERE center_id = '00000000-0000-0000-0000-000000000001'::uuid;
    
    RAISE NOTICE '🎉 SaaS Migration Completed Successfully!';
    RAISE NOTICE '📊 Centers: %', centers_count;
    RAISE NOTICE '👥 Staff Migrated: %', staff_count;
    RAISE NOTICE '🎓 Students Migrated: %', students_count;
    RAISE NOTICE '✅ Your system is now SaaS-Ready!';
END $$;

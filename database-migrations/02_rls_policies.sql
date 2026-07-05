-- ========================================
-- RLS Policies for Multi-Tenancy (Safe Version)
-- ========================================

-- Enable RLS on all tables (with existence checks)
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Centers
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'centers') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on centers';
    END IF;
    
    -- Staff Profiles
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_profiles') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on staff_profiles';
    END IF;
    
    -- Students
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on students';
    END IF;
    
    -- Courses
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on courses';
    END IF;
    
    -- Groups
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on groups';
    END IF;
    
    -- Sessions
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on sessions';
    END IF;
    
    -- Expenses
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on expenses';
    END IF;
    
    -- Wallet Transactions
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on wallet_transactions';
    END IF;
    
    -- Debts
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on debts';
    END IF;
    
    -- Center Settings
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'center_settings') INTO table_exists;
    IF table_exists = TRUE THEN
        ALTER TABLE public.center_settings ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on center_settings';
    END IF;
END $$;

-- ========================================
-- Create RLS Policies (with existence checks)
-- ========================================

-- Centers Policies
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'centers') INTO table_exists;
    IF table_exists = TRUE THEN
        DROP POLICY IF EXISTS "Users can view their own center" ON public.centers;
        DROP POLICY IF EXISTS "Center admins can update their center" ON public.centers;
        
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
        
        RAISE NOTICE 'Created RLS policies for centers';
    END IF;
END $$;

-- Staff Profiles Policies
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_profiles') INTO table_exists;
    IF table_exists = TRUE THEN
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

-- Users can see staff in their center only
CREATE POLICY "Users can view staff in their center" ON public.staff_profiles
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.staff_profiles
FOR UPDATE USING (
  id = auth.uid()
);

-- Center admins can insert staff in their center
CREATE POLICY "Center admins can insert staff" ON public.staff_profiles
FOR INSERT WITH CHECK (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- ========================================
-- Students Policies
-- ========================================

-- Users can see students in their center only
CREATE POLICY "Users can view students in their center" ON public.students
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- Users can insert students in their center
CREATE POLICY "Users can insert students" ON public.students
FOR INSERT WITH CHECK (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- Users can update students in their center
CREATE POLICY "Users can update students in their center" ON public.students
FOR UPDATE USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- Users can delete students in their center
CREATE POLICY "Users can delete students in their center" ON public.students
FOR DELETE USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

-- ========================================
-- Courses Policies
-- ========================================

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

-- ========================================
-- Groups Policies
-- ========================================

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

-- ========================================
-- Sessions Policies
-- ========================================

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

-- ========================================
-- Finance Policies (Expenses, Wallet, Debts)
-- ========================================

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

-- ========================================
-- Settings Policies
-- ========================================

CREATE POLICY "Users can view settings in their center" ON public.center_settings
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update settings in their center" ON public.center_settings
FOR UPDATE USING (
  center_id IN (
    SELECT center_id FROM public.staff_profiles 
    WHERE id = auth.uid()
  )
);

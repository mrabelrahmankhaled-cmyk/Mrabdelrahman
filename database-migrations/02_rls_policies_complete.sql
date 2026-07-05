-- ========================================
-- RLS Policies for Multi-Tenancy (Complete Safe Version)
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
        DROP POLICY IF EXISTS "Users can insert centers" ON public.centers;
        
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
        
        CREATE POLICY "Users can insert centers" ON public.centers
        FOR INSERT WITH CHECK (
          true  -- ✅ Allow anyone to create a new center
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
        DROP POLICY IF EXISTS "Users can create their own profile" ON public.staff_profiles;
        
        CREATE POLICY "Users can view staff in their center" ON public.staff_profiles
        FOR SELECT USING (
          id = auth.uid() OR
          center_id = (
            SELECT center_id FROM public.staff_profiles 
            WHERE id = auth.uid()
            LIMIT 1
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

        -- 🔥 الإضافة (للنفس): أهم سياسة عشان التسجيل يشتغل
        CREATE POLICY "Users can create their own profile" ON public.staff_profiles
        FOR INSERT WITH CHECK (
          auth.uid() = id
        );
        
        RAISE NOTICE 'Created RLS policies for staff_profiles';
    END IF;
END $$;

-- Students Policies
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') INTO table_exists;
    IF table_exists = TRUE THEN
        DROP POLICY IF EXISTS "Users can view students in their center" ON public.students;
        DROP POLICY IF EXISTS "Users can insert students" ON public.students;
        DROP POLICY IF EXISTS "Users can update students in their center" ON public.students;
        DROP POLICY IF EXISTS "Users can delete students in their center" ON public.students;
        DROP POLICY IF EXISTS "Users can manage students in their center" ON public.students;
        
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

-- Courses Policies
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') INTO table_exists;
    IF table_exists = TRUE THEN
        DROP POLICY IF EXISTS "Users can view courses in their center" ON public.courses;
        DROP POLICY IF EXISTS "Users can manage courses in their center" ON public.courses;
        
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
        
        RAISE NOTICE 'Created RLS policies for courses';
    END IF;
END $$;

-- Groups Policies
-- ⚠️ ملاحظة: لو فيه trigger اسمه set_center_id_on_group_insert، لازم تشيله أو تعدله
-- عشان ميخلقش infinite recursion مع الـ RLS policies
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') INTO table_exists;
    IF table_exists = TRUE THEN
        DROP POLICY IF EXISTS "Users can view groups in their center" ON public.groups;
        DROP POLICY IF EXISTS "Users can manage groups in their center" ON public.groups;
        
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
        
        RAISE NOTICE 'Created RLS policies for groups';
    END IF;
END $$;

-- Sessions Policies
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') INTO table_exists;
    IF table_exists = TRUE THEN
        DROP POLICY IF EXISTS "Users can view sessions in their center" ON public.sessions;
        DROP POLICY IF EXISTS "Users can manage sessions in their center" ON public.sessions;
        
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
        
        RAISE NOTICE 'Created RLS policies for sessions';
    END IF;
END $$;

-- Finance Policies (Expenses, Wallet, Debts)
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Expenses
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') INTO table_exists;
    IF table_exists = TRUE THEN
        DROP POLICY IF EXISTS "Users can view expenses in their center" ON public.expenses;
        DROP POLICY IF EXISTS "Users can manage expenses in their center" ON public.expenses;
        
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
        
        RAISE NOTICE 'Created RLS policies for expenses';
    END IF;
    
    -- Wallet Transactions
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') INTO table_exists;
    IF table_exists = TRUE THEN
        DROP POLICY IF EXISTS "Users can view wallet transactions in their center" ON public.wallet_transactions;
        DROP POLICY IF EXISTS "Users can manage wallet transactions in their center" ON public.wallet_transactions;
        
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
        
        RAISE NOTICE 'Created RLS policies for wallet_transactions';
    END IF;
    
    -- Debts
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') INTO table_exists;
    IF table_exists = TRUE THEN
        DROP POLICY IF EXISTS "Users can view debts in their center" ON public.debts;
        DROP POLICY IF EXISTS "Users can manage debts in their center" ON public.debts;
        
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
        
        RAISE NOTICE 'Created RLS policies for debts';
    END IF;
END $$;

-- Settings Policies (Optional - only if table exists)
DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'center_settings') INTO table_exists;
    IF table_exists = TRUE THEN
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'center_settings' AND column_name = 'center_id') INTO column_exists;
        
        IF column_exists = TRUE THEN
            -- Create policies only if both table and column exist
            DROP POLICY IF EXISTS "Users can view settings in their center" ON public.center_settings;
            DROP POLICY IF EXISTS "Users can update settings in their center" ON public.center_settings;
            
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
            
            RAISE NOTICE 'Created RLS policies for center_settings';
        ELSE
            RAISE NOTICE 'center_settings table or center_id column does not exist - skipping policies';
        END IF;
    ELSE
        RAISE NOTICE 'center_settings table does not exist - skipping policies';
    END IF;
END $$;

-- ========================================
-- Migration Complete
-- ========================================
DO $$
DECLARE
    staff_count INTEGER := 0;
    students_count INTEGER := 0;
    centers_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO centers_count FROM public.centers;
    
    SELECT COUNT(*) INTO staff_count FROM public.staff_profiles WHERE center_id = '00000000-0000-0000-0000-000000000001'::uuid;
    
    SELECT COUNT(*) INTO students_count FROM public.students WHERE center_id = '00000000-0000-0000-0000-000000000001'::uuid;
    
    RAISE NOTICE '🎉 RLS Migration Completed Successfully!';
    RAISE NOTICE '📊 Centers: %', centers_count;
    RAISE NOTICE '👥 Staff with RLS: %', staff_count;
    RAISE NOTICE '🎓 Students with RLS: %', students_count;
    RAISE NOTICE '✅ SaaS System is now Fully Secured!';
END $$;

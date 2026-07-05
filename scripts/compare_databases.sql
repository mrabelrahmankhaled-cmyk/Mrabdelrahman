-- ================================================================
-- 🔍 DATABASE COMPARISON QUERIES
-- شغّل هذا في كل مشروع وقارن النتائج
-- ================================================================


-- ============================================================
-- QUERY 1: عدد الـ rows في كل جدول
-- ============================================================
SELECT 
    table_name,
    (xpath('/row/cnt/text()', 
        query_to_xml(format('SELECT COUNT(*) AS cnt FROM public.%I', table_name), 
        false, true, ''))
    )[1]::text::int AS row_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- ============================================================
-- QUERY 2: قائمة الجداول والـ columns
-- ============================================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;


-- ============================================================
-- QUERY 3: الـ Triggers
-- ============================================================
SELECT 
    trigger_name,
    event_object_table AS "table",
    event_manipulation AS event,
    action_timing AS timing
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('pg_catalog','information_schema','storage','auth')
ORDER BY event_object_table, trigger_name;


-- ============================================================
-- QUERY 4: الـ Functions
-- ============================================================
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    t.typname AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_type t ON p.prorettype = t.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;


-- ============================================================
-- QUERY 5: الـ RLS Policies
-- ============================================================
SELECT 
    tablename,
    policyname,
    cmd AS command,
    qual AS using_expr,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ============================================================
-- QUERY 6: الـ Indexes
-- ============================================================
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ============================================================
-- QUERY 7: ملخص سريع للمقارنة (الأهم)
-- ============================================================
SELECT 
    'Tables' AS category, COUNT(*) AS count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'Triggers', COUNT(*)
FROM information_schema.triggers 
WHERE trigger_schema NOT IN ('pg_catalog','information_schema','storage','auth')

UNION ALL

SELECT 
    'Functions', COUNT(*)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prokind = 'f'

UNION ALL

SELECT 
    'RLS Policies', COUNT(*)
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Indexes', COUNT(*)
FROM pg_indexes 
WHERE schemaname = 'public'

ORDER BY category;

-- ============================================================
-- 🔁 DATABASE TRIGGERS MIGRATION
-- From: qngdkkhnvkvgskfxnerh (Smart Center - OLD)
-- To:   pdvjutoclddmclymwjpa (NEW Project)
-- Date: 2026-07-03
-- ============================================================
-- Run this entire script in the NEW project's SQL Editor
-- ============================================================


-- ============================================================
-- TRIGGER 1: on_auth_user_created
-- Table: auth.users | Event: INSERT | Timing: AFTER
-- Purpose: Auto-create staff_profile when new user signs up
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- TRIGGER 2: educational_stages_update_sync
-- Table: educational_stages | Event: UPDATE | Timing: AFTER
-- Purpose: Sync grade name changes across courses & students
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_educational_stage_names()
RETURNS TRIGGER AS $$
BEGIN
    -- When educational_stages name changes, update all related tables
    UPDATE courses
    SET grade = NEW.name
    WHERE grade = OLD.name;

    UPDATE students
    SET grade = NEW.name
    WHERE grade = OLD.name;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS educational_stages_update_sync ON educational_stages;
CREATE TRIGGER educational_stages_update_sync
  AFTER UPDATE ON educational_stages
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION public.sync_educational_stage_names();


-- ============================================================
-- TRIGGER 3: educational_stages_delete_sync
-- Table: educational_stages | Event: DELETE | Timing: AFTER
-- Purpose: Set grade to NULL in related tables when stage is deleted
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_educational_stage_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE courses
    SET grade = NULL
    WHERE grade = OLD.name;

    UPDATE students
    SET grade = NULL
    WHERE grade = OLD.name;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS educational_stages_delete_sync ON educational_stages;
CREATE TRIGGER educational_stages_delete_sync
  AFTER DELETE ON educational_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_educational_stage_delete();


-- ============================================================
-- TRIGGER 4: update_student_payment_transactions_updated_at
-- Table: student_payment_transactions | Event: UPDATE | Timing: BEFORE
-- Purpose: Auto-update the updated_at timestamp on row update
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_payment_transactions_updated_at ON student_payment_transactions;
CREATE TRIGGER update_student_payment_transactions_updated_at
  BEFORE UPDATE ON student_payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- TRIGGER 5: trigger_update_store_stock_on_return
-- Table: store_returns | Event: INSERT | Timing: AFTER
-- Purpose: Restore product stock when a return is processed
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_store_stock_on_return()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update stock if product is not damaged
  IF NOT NEW.is_damaged THEN
    UPDATE store_products
    SET
      stock = stock + NEW.quantity,
      sold_count = GREATEST(sold_count - NEW.quantity, 0)
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_store_stock_on_return ON store_returns;
CREATE TRIGGER trigger_update_store_stock_on_return
  AFTER INSERT ON store_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_stock_on_return();


-- ============================================================
-- ✅ VERIFICATION QUERY
-- Run this after the migration to confirm all triggers exist
-- ============================================================

SELECT
  trigger_name,
  event_manipulation AS event,
  event_object_table AS "table",
  action_timing AS timing,
  action_statement AS function_called
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY event_object_table, trigger_name;

-- ================================================================
-- 🔁 COMPLETE DATABASE TRIGGERS MIGRATION
-- من المشروع القديم: qngdkkhnvkvgskfxnerh
-- إلى المشروع الجديد: pdvjutoclddmclymwjpa
-- التاريخ: 2026-07-03
-- ================================================================
-- شغّل هذا الملف كامل في SQL Editor للمشروع الجديد
-- ================================================================


-- ================================================================
-- PART 1: CORE FUNCTION - set_center_id()
-- المستخدمة في كل tr_set_center_id_* triggers
-- ================================================================

CREATE OR REPLACE FUNCTION public.set_center_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.center_id IS NULL THEN
    NEW.center_id := (
      SELECT center_id 
      FROM public.staff_profiles 
      WHERE id = auth.uid()
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================
-- PART 2: tr_set_center_id_* TRIGGERS (auto-set center on INSERT)
-- ================================================================

-- audit_logs
DROP TRIGGER IF EXISTS tr_set_center_id_audit_logs ON audit_logs;
CREATE TRIGGER tr_set_center_id_audit_logs
  BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- chat_messages
DROP TRIGGER IF EXISTS tr_set_center_id_chat_messages ON chat_messages;
CREATE TRIGGER tr_set_center_id_chat_messages
  BEFORE INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- courses
DROP TRIGGER IF EXISTS tr_set_center_id_courses ON courses;
CREATE TRIGGER tr_set_center_id_courses
  BEFORE INSERT ON courses
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- educational_stages
DROP TRIGGER IF EXISTS tr_set_center_id_educational_stages ON educational_stages;
CREATE TRIGGER tr_set_center_id_educational_stages
  BEFORE INSERT ON educational_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- expenses
DROP TRIGGER IF EXISTS tr_set_center_id_expenses ON expenses;
CREATE TRIGGER tr_set_center_id_expenses
  BEFORE INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- groups
DROP TRIGGER IF EXISTS tr_set_center_id_groups ON groups;
CREATE TRIGGER tr_set_center_id_groups
  BEFORE INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- instructors
DROP TRIGGER IF EXISTS tr_set_center_id_instructors ON instructors;
CREATE TRIGGER tr_set_center_id_instructors
  BEFORE INSERT ON instructors
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- lessons
DROP TRIGGER IF EXISTS tr_set_center_id_lessons ON lessons;
CREATE TRIGGER tr_set_center_id_lessons
  BEFORE INSERT ON lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- notification_views
DROP TRIGGER IF EXISTS tr_set_center_id_notification_views ON notification_views;
CREATE TRIGGER tr_set_center_id_notification_views
  BEFORE INSERT ON notification_views
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- notifications
DROP TRIGGER IF EXISTS tr_set_center_id_notifications ON notifications;
CREATE TRIGGER tr_set_center_id_notifications
  BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- parent_device_tokens
DROP TRIGGER IF EXISTS tr_set_center_id_parent_device_tokens ON parent_device_tokens;
CREATE TRIGGER tr_set_center_id_parent_device_tokens
  BEFORE INSERT ON parent_device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- recharge_codes
DROP TRIGGER IF EXISTS tr_set_center_id_recharge_codes ON recharge_codes;
CREATE TRIGGER tr_set_center_id_recharge_codes
  BEFORE INSERT ON recharge_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- rooms
DROP TRIGGER IF EXISTS tr_set_center_id_rooms ON rooms;
CREATE TRIGGER tr_set_center_id_rooms
  BEFORE INSERT ON rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- schedule
DROP TRIGGER IF EXISTS tr_set_center_id_schedule ON schedule;
CREATE TRIGGER tr_set_center_id_schedule
  BEFORE INSERT ON schedule
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- sessions
DROP TRIGGER IF EXISTS tr_set_center_id_sessions ON sessions;
CREATE TRIGGER tr_set_center_id_sessions
  BEFORE INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- staff_permissions
DROP TRIGGER IF EXISTS tr_set_center_id_staff_permissions ON staff_permissions;
CREATE TRIGGER tr_set_center_id_staff_permissions
  BEFORE INSERT ON staff_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- store_audit_logs
DROP TRIGGER IF EXISTS tr_set_center_id_store_audit_logs ON store_audit_logs;
CREATE TRIGGER tr_set_center_id_store_audit_logs
  BEFORE INSERT ON store_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- store_products
DROP TRIGGER IF EXISTS tr_set_center_id_store_products ON store_products;
CREATE TRIGGER tr_set_center_id_store_products
  BEFORE INSERT ON store_products
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- store_returns
DROP TRIGGER IF EXISTS tr_set_center_id_store_returns ON store_returns;
CREATE TRIGGER tr_set_center_id_store_returns
  BEFORE INSERT ON store_returns
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- store_sales
DROP TRIGGER IF EXISTS tr_set_center_id_store_sales ON store_sales;
CREATE TRIGGER tr_set_center_id_store_sales
  BEFORE INSERT ON store_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- store_settlements
DROP TRIGGER IF EXISTS tr_set_center_id_store_settlements ON store_settlements;
CREATE TRIGGER tr_set_center_id_store_settlements
  BEFORE INSERT ON store_settlements
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- student_activities
DROP TRIGGER IF EXISTS tr_set_center_id_student_activities ON student_activities;
CREATE TRIGGER tr_set_center_id_student_activities
  BEFORE INSERT ON student_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- student_device_tokens
DROP TRIGGER IF EXISTS tr_set_center_id_student_device_tokens ON student_device_tokens;
CREATE TRIGGER tr_set_center_id_student_device_tokens
  BEFORE INSERT ON student_device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- student_online_enrollments
DROP TRIGGER IF EXISTS tr_set_center_id_enrollments ON student_online_enrollments;
CREATE TRIGGER tr_set_center_id_enrollments
  BEFORE INSERT ON student_online_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- students
DROP TRIGGER IF EXISTS tr_set_center_id_students ON students;
CREATE TRIGGER tr_set_center_id_students
  BEFORE INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- support_tickets
DROP TRIGGER IF EXISTS tr_set_center_id_support_tickets ON support_tickets;
CREATE TRIGGER tr_set_center_id_support_tickets
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- system_logs
DROP TRIGGER IF EXISTS tr_set_center_id_system_logs ON system_logs;
CREATE TRIGGER tr_set_center_id_system_logs
  BEFORE INSERT ON system_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- universal_inbox
DROP TRIGGER IF EXISTS tr_set_center_id_universal_inbox ON universal_inbox;
CREATE TRIGGER tr_set_center_id_universal_inbox
  BEFORE INSERT ON universal_inbox
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();

-- wallet_transactions
DROP TRIGGER IF EXISTS tr_set_center_id_wallet_transactions ON wallet_transactions;
CREATE TRIGGER tr_set_center_id_wallet_transactions
  BEFORE INSERT ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_center_id();


-- ================================================================
-- PART 3: TEXT TRIMMING TRIGGERS
-- ================================================================

CREATE OR REPLACE FUNCTION public.trim_course_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := TRIM(NEW.name);
  IF NEW.grade IS NOT NULL THEN
    NEW.grade := TRIM(NEW.grade);
  END IF;
  IF NEW.instructor IS NOT NULL THEN
    NEW.instructor := TRIM(NEW.instructor);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trim_courses ON courses;
CREATE TRIGGER trigger_trim_courses
  BEFORE INSERT OR UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION public.trim_course_fields();

CREATE OR REPLACE FUNCTION public.trim_stage_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := TRIM(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trim_stages ON educational_stages;
CREATE TRIGGER trigger_trim_stages
  BEFORE INSERT OR UPDATE ON educational_stages
  FOR EACH ROW EXECUTE FUNCTION public.trim_stage_fields();


-- ================================================================
-- PART 4: on_center_created
-- إنشاء center_settings تلقائياً عند إضافة سنتر جديد
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_center()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.center_settings (center_id, center_name)
  VALUES (NEW.id, NEW.name)
  ON CONFLICT (center_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_center_created ON centers;
CREATE TRIGGER on_center_created
  AFTER INSERT ON centers
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_center();


-- ================================================================
-- PART 5: AUDIT TRIGGERS
-- تسجيل كل التغييرات في جداول المنتجات والمبيعات والطلاب
-- ================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_center_id UUID;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- Get center_id from the row
  IF TG_OP = 'DELETE' THEN
    v_center_id := OLD.center_id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_center_id := NEW.center_id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSE
    v_center_id := NEW.center_id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  END IF;

  -- Insert into store_audit_logs if it exists
  BEGIN
    INSERT INTO public.store_audit_logs (
      center_id,
      table_name,
      operation,
      old_data,
      new_data,
      changed_by
    ) VALUES (
      v_center_id,
      TG_TABLE_NAME,
      TG_OP,
      v_old_data,
      v_new_data,
      auth.uid()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore if store_audit_logs doesn't exist or has different schema
    NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- audit_products_trigger
DROP TRIGGER IF EXISTS audit_products_trigger ON store_products;
CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON store_products
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- audit_returns_trigger
DROP TRIGGER IF EXISTS audit_returns_trigger ON store_returns;
CREATE TRIGGER audit_returns_trigger
  AFTER INSERT OR UPDATE OR DELETE ON store_returns
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- audit_sales_trigger
DROP TRIGGER IF EXISTS audit_sales_trigger ON store_sales;
CREATE TRIGGER audit_sales_trigger
  AFTER INSERT OR UPDATE OR DELETE ON store_sales
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- audit_settlements_trigger
DROP TRIGGER IF EXISTS audit_settlements_trigger ON store_settlements;
CREATE TRIGGER audit_settlements_trigger
  AFTER INSERT OR UPDATE OR DELETE ON store_settlements
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- audit_students (uses audit_logs table instead of store_audit_logs)
CREATE OR REPLACE FUNCTION public.log_student_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_center_id UUID;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_center_id := OLD.center_id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_center_id := NEW.center_id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSE
    v_center_id := NEW.center_id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (
      center_id,
      table_name,
      operation,
      old_data,
      new_data,
      changed_by
    ) VALUES (
      v_center_id,
      'students',
      TG_OP,
      v_old_data,
      v_new_data,
      auth.uid()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_students ON students;
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW EXECUTE FUNCTION public.log_student_audit();


-- ================================================================
-- PART 6: STORE BUSINESS LOGIC TRIGGERS
-- ================================================================

-- trigger_update_sold_count: زيادة sold_count عند البيع
CREATE OR REPLACE FUNCTION public.increment_sold_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE store_products
  SET sold_count = COALESCE(sold_count, 0) + NEW.quantity,
      stock = GREATEST(COALESCE(stock, 0) - NEW.quantity, 0)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sold_count ON store_sales;
CREATE TRIGGER trigger_update_sold_count
  AFTER INSERT ON store_sales
  FOR EACH ROW EXECUTE FUNCTION public.increment_sold_count();

-- trigger_decrement_sold_count_on_return: تخفيض sold_count عند الإرجاع
CREATE OR REPLACE FUNCTION public.decrement_sold_count_on_return()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE store_products
  SET sold_count = GREATEST(COALESCE(sold_count, 0) - NEW.quantity, 0)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_decrement_sold_count_on_return ON store_returns;
CREATE TRIGGER trigger_decrement_sold_count_on_return
  AFTER INSERT ON store_returns
  FOR EACH ROW EXECUTE FUNCTION public.decrement_sold_count_on_return();

-- trigger_calculate_actual_sold_count: إعادة حساب sold_count الفعلي
CREATE OR REPLACE FUNCTION public.calculate_actual_sold_count()
RETURNS TRIGGER AS $$
DECLARE
  v_actual_sold INTEGER;
BEGIN
  SELECT COALESCE(SUM(s.quantity), 0) - COALESCE(SUM(r.quantity), 0)
  INTO v_actual_sold
  FROM store_sales s
  LEFT JOIN store_returns r ON r.product_id = s.product_id
  WHERE s.product_id = NEW.product_id;

  UPDATE store_products
  SET sold_count = GREATEST(v_actual_sold, 0)
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_actual_sold_count ON store_returns;
CREATE TRIGGER trigger_calculate_actual_sold_count
  AFTER INSERT ON store_returns
  FOR EACH ROW EXECUTE FUNCTION public.calculate_actual_sold_count();

-- trigger_handle_returns_with_damaged_count
CREATE OR REPLACE FUNCTION public.handle_return_damaged_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_damaged THEN
    UPDATE store_products
    SET damaged_count = COALESCE(damaged_count, 0) + NEW.quantity
    WHERE id = NEW.product_id;
  ELSE
    -- إرجاع للمخزون فقط لو مش تالفة
    UPDATE store_products
    SET stock = COALESCE(stock, 0) + NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_returns_with_damaged_count ON store_returns;
CREATE TRIGGER trigger_handle_returns_with_damaged_count
  AFTER INSERT ON store_returns
  FOR EACH ROW EXECUTE FUNCTION public.handle_return_damaged_count();


-- ================================================================
-- PART 7: STAFF ATTENDANCE DURATION
-- ================================================================

CREATE OR REPLACE FUNCTION public.calc_attendance_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out IS NOT NULL AND NEW.check_in IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_duration ON staff_attendance;
CREATE TRIGGER trg_calc_duration
  BEFORE UPDATE ON staff_attendance
  FOR EACH ROW EXECUTE FUNCTION public.calc_attendance_duration();


-- ================================================================
-- PART 8: NOTIFICATION TRIGGERS
-- on_new_notification & send_push_on_notification & on_message_insert
-- notify_students_on_new_schedule
-- ================================================================

-- on_new_notification: إنشاء universal_inbox entry عند إشعار جديد
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- يمكن إضافة منطق هنا مثل إنشاء سجل في universal_inbox
  -- أو استدعاء Edge Function عبر pg_net
  BEGIN
    INSERT INTO public.universal_inbox (
      center_id,
      type,
      title,
      message,
      reference_id,
      created_at
    ) VALUES (
      NEW.center_id,
      'notification',
      NEW.title,
      NEW.message,
      NEW.id,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_notification ON notifications;
CREATE TRIGGER on_new_notification
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_notification();

-- send_push_on_notification: إرسال push notification عبر Edge Function
-- ملاحظة: هذا يحتاج pg_net extension. لو مش شغّال، سيُتجاهل الخطأ
CREATE OR REPLACE FUNCTION public.send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
BEGIN
  v_url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification';

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object(
        'record', to_jsonb(NEW),
        'table', 'notifications'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- لو pg_net مش موجود، تجاهل
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS send_push_on_notification ON notifications;
CREATE TRIGGER send_push_on_notification
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.send_push_notification();

-- notify_students_on_new_schedule
CREATE OR REPLACE FUNCTION public.notify_on_new_schedule()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
BEGIN
  v_url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification';

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object(
        'record', to_jsonb(NEW),
        'table', 'schedule'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_students_on_new_schedule ON schedule;
CREATE TRIGGER notify_students_on_new_schedule
  AFTER INSERT ON schedule
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_schedule();


-- ================================================================
-- PART 9: CHAT MESSAGES TRIGGERS
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث آخر رسالة في الـ ticket
  BEGIN
    UPDATE public.support_tickets
    SET 
      last_message = NEW.content,
      last_message_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.ticket_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_insert ON chat_messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

CREATE OR REPLACE FUNCTION public.update_ticket_on_message()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    UPDATE public.support_tickets
    SET 
      status = CASE WHEN status = 'closed' THEN 'open' ELSE status END,
      unread_count = COALESCE(unread_count, 0) + 1,
      updated_at = NOW()
    WHERE id = NEW.ticket_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message_update_ticket ON chat_messages;
CREATE TRIGGER on_new_message_update_ticket
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_ticket_on_message();


-- ================================================================
-- PART 10: ONLINE EXAM SYNC
-- ================================================================

CREATE OR REPLACE FUNCTION public.sync_online_exam_result()
RETURNS TRIGGER AS $$
BEGIN
  -- مزامنة نتيجة الامتحان عند الإرسال
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    BEGIN
      UPDATE public.exams
      SET submissions_count = COALESCE(submissions_count, 0) + 1
      WHERE id = NEW.exam_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_online_exam ON student_exam_submissions;
CREATE TRIGGER trigger_sync_online_exam
  AFTER UPDATE ON student_exam_submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_online_exam_result();


-- ================================================================
-- ✅ VERIFICATION - تأكيد الـ Triggers المضافة
-- ================================================================

SELECT 
  trigger_name,
  event_manipulation AS event,
  event_object_table AS "table",
  action_timing AS timing
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
  AND event_object_table NOT IN ('buckets', 'objects', 'subscription') -- Supabase built-in
ORDER BY event_object_table, trigger_name;

-- Migration: Add Exams and Grading Features to the System
-- Description: Inserts new features into the 'features' table for management in Super Admin

INSERT INTO features (id, name, description)
VALUES 
  ('page_exams', 'إدارة الاختبارات والدرجات', 'تفعيل صفحة الاختبارات والنتائج في القائمة الجانبية'),
  ('action_add_exam', 'إنشاء الاختبارات', 'السماح للمدرب أو المسئول بإنشاء اختبارات جديدة'),
  ('action_edit_exam', 'تعديل الاختبارات', 'السماح بتعديل بيانات الاختبارات الحالية'),
  ('action_delete_exam', 'حذف الاختبارات', 'السماح بحذف سجلات الاختبارات'),
  ('action_publish_results', 'نشر النتائج للطلاب', 'السماح بمشاركة النتائج مع الطلاب وأولياء الأمور')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

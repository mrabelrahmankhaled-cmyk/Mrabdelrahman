-- 1. Drop existing constraints
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_course_id_fkey;
ALTER TABLE public.lesson_chapters DROP CONSTRAINT IF EXISTS lesson_chapters_course_id_fkey;
ALTER TABLE public.exams DROP CONSTRAINT IF EXISTS exams_course_id_fkey;
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;
ALTER TABLE public.question_bank DROP CONSTRAINT IF EXISTS question_bank_course_id_fkey;
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_course_id_fkey;
ALTER TABLE public.store_products DROP CONSTRAINT IF EXISTS store_products_course_id_fkey;
ALTER TABLE public.student_payment_transactions DROP CONSTRAINT IF EXISTS student_payment_transactions_course_id_fkey;
ALTER TABLE public.student_subscriptions DROP CONSTRAINT IF EXISTS student_subscriptions_course_id_fkey;
ALTER TABLE public.recharge_codes DROP CONSTRAINT IF EXISTS recharge_codes_course_fkey;
ALTER TABLE public.student_online_enrollments DROP CONSTRAINT IF EXISTS enrollment_course_fkey;
ALTER TABLE public.student_lesson_access DROP CONSTRAINT IF EXISTS student_lesson_access_course_id_fkey;
ALTER TABLE public.student_chapter_access DROP CONSTRAINT IF EXISTS student_chapter_access_course_id_fkey;

-- 2. Add them back with ON DELETE CASCADE
ALTER TABLE public.groups
  ADD CONSTRAINT groups_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_chapters
  ADD CONSTRAINT lesson_chapters_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.exams
  ADD CONSTRAINT exams_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.store_products
  ADD CONSTRAINT store_products_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.student_payment_transactions
  ADD CONSTRAINT student_payment_transactions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.student_subscriptions
  ADD CONSTRAINT student_subscriptions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.recharge_codes
  ADD CONSTRAINT recharge_codes_course_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.student_online_enrollments
  ADD CONSTRAINT enrollment_course_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.student_lesson_access
  ADD CONSTRAINT student_lesson_access_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.student_chapter_access
  ADD CONSTRAINT student_chapter_access_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- 3. Additional cascades for dependent entities (lessons, chapters, groups, exams)
ALTER TABLE public.student_lesson_progress DROP CONSTRAINT IF EXISTS progress_lesson_fkey;
ALTER TABLE public.student_lesson_progress
  ADD CONSTRAINT progress_lesson_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_comments DROP CONSTRAINT IF EXISTS lesson_comments_lesson_id_fkey;
ALTER TABLE public.lesson_comments
  ADD CONSTRAINT lesson_comments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_discussions DROP CONSTRAINT IF EXISTS lesson_discussions_lesson_id_fkey;
ALTER TABLE public.lesson_discussions
  ADD CONSTRAINT lesson_discussions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.recharge_codes DROP CONSTRAINT IF EXISTS recharge_codes_lesson_id_fkey;
ALTER TABLE public.recharge_codes
  ADD CONSTRAINT recharge_codes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.recharge_codes DROP CONSTRAINT IF EXISTS recharge_codes_chapter_id_fkey;
ALTER TABLE public.recharge_codes
  ADD CONSTRAINT recharge_codes_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.lesson_chapters(id) ON DELETE CASCADE;

ALTER TABLE public.student_lesson_access DROP CONSTRAINT IF EXISTS student_lesson_access_lesson_id_fkey;
ALTER TABLE public.student_lesson_access
  ADD CONSTRAINT student_lesson_access_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.student_chapter_access DROP CONSTRAINT IF EXISTS student_chapter_access_chapter_id_fkey;
ALTER TABLE public.student_chapter_access
  ADD CONSTRAINT student_chapter_access_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.lesson_chapters(id) ON DELETE CASCADE;

ALTER TABLE public.schedule DROP CONSTRAINT IF EXISTS schedule_group_id_fkey;
ALTER TABLE public.schedule
  ADD CONSTRAINT schedule_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_group_id_fkey;
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.exam_questions DROP CONSTRAINT IF EXISTS exam_questions_exam_id_fkey;
ALTER TABLE public.exam_questions
  ADD CONSTRAINT exam_questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

ALTER TABLE public.exam_results DROP CONSTRAINT IF EXISTS exam_results_exam_id_fkey;
ALTER TABLE public.exam_results
  ADD CONSTRAINT exam_results_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

ALTER TABLE public.exam_submissions DROP CONSTRAINT IF EXISTS exam_submissions_exam_id_fkey;
ALTER TABLE public.exam_submissions
  ADD CONSTRAINT exam_submissions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

ALTER TABLE public.student_exam_submissions DROP CONSTRAINT IF EXISTS student_exam_submissions_exam_id_fkey;
ALTER TABLE public.student_exam_submissions
  ADD CONSTRAINT student_exam_submissions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;

ALTER TABLE public.student_exam_answers DROP CONSTRAINT IF EXISTS student_exam_answers_submission_id_fkey;
ALTER TABLE public.student_exam_answers
  ADD CONSTRAINT student_exam_answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.student_exam_submissions(id) ON DELETE CASCADE;


-- 4. Tertiary cascades for deeply dependent entities (question_bank, store_products)
ALTER TABLE public.exam_questions DROP CONSTRAINT IF EXISTS exam_questions_question_id_fkey;
ALTER TABLE public.exam_questions
  ADD CONSTRAINT exam_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;

ALTER TABLE public.student_exam_answers DROP CONSTRAINT IF EXISTS student_exam_answers_question_id_fkey;
ALTER TABLE public.student_exam_answers
  ADD CONSTRAINT student_exam_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;

ALTER TABLE public.store_settlements DROP CONSTRAINT IF EXISTS fk_settlements_product;
ALTER TABLE public.store_settlements
  ADD CONSTRAINT fk_settlements_product FOREIGN KEY (product_id) REFERENCES public.store_products(id) ON DELETE CASCADE;

ALTER TABLE public.store_sales DROP CONSTRAINT IF EXISTS store_sales_product_id_fkey;
ALTER TABLE public.store_sales
  ADD CONSTRAINT store_sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.store_products(id) ON DELETE CASCADE;

ALTER TABLE public.store_returns DROP CONSTRAINT IF EXISTS store_returns_product_id_fkey;
ALTER TABLE public.store_returns
  ADD CONSTRAINT store_returns_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.store_products(id) ON DELETE CASCADE;


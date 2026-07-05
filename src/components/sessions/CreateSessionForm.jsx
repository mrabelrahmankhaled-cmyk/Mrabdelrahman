'use client';
import { FaCalendarAlt } from 'react-icons/fa';

/**
 * CreateSessionForm component
 * Form for creating new sessions with automatic topic and time generation
 */
export const CreateSessionForm = ({
  selectedGrade,
  setSelectedGrade,
  newSession,
  setNewSession,
  availableGrades,
  filteredCoursesForCreation,
  courses,
  groups,
  exams,
  handleCreateSession,
  loading,
  allowedFeatures // 🔒 New Prop
}) => {
  // 🔒 Feature Check for the form's submit button
  const canAddSession = allowedFeatures?.includes('action_add_session');

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-8 print:hidden">
      <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">✨ إنشاء جلسة جديدة (فتح دفتر)</h2>
      <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

        {/* نوع الجلسة */}
        <div className="md:col-span-12 mb-2 flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
          <span className="text-xs font-black text-gray-500 uppercase">نوع الدفتر:</span>
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-100">
            <button
              type="button"
              onClick={() => setNewSession({ ...newSession, session_type: 'lesson', linked_exam_id: '' })}
              className={`px-6 py-1.5 rounded-md text-xs font-black transition-all ${newSession.session_type === 'lesson' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              حصة عادية
            </button>
            <button
              type="button"
              onClick={() => setNewSession({ ...newSession, session_type: 'exam' })}
              className={`px-6 py-1.5 rounded-md text-xs font-black transition-all ${newSession.session_type === 'exam' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              امتحان
            </button>
          </div>

          {newSession.session_type === 'exam' && (
            <div className="flex-1 flex items-center gap-2 animate-pulse">
              <span className="text-xs font-black text-red-500">اختر الامتحان من القائمة:</span>
              <select
                value={newSession.linked_exam_id}
                onChange={(e) => {
                  const examId = e.target.value;
                  const selectedExam = exams.find(ex => ex.id === examId);

                  if (selectedExam) {
                    const course = courses.find(c => c.id === selectedExam.course_id);
                    const group = groups.find(g => g.id === selectedExam.group_id);

                    // لو فيه كورس، نحدث الجريد والأسعار
                    if (course) setSelectedGrade(course.grade);

                    setNewSession({
                      ...newSession,
                      linked_exam_id: examId,
                      course_id: selectedExam.course_id || newSession.course_id,
                      group_id: selectedExam.group_id || newSession.group_id,
                      price: course ? course.price : newSession.price,
                      fixed_share: course ? (course.center_tax || course.fixed_share) : newSession.fixed_share,
                      topic: `امتحان: ${selectedExam.title}`
                    });
                  } else {
                    setNewSession({
                      ...newSession,
                      linked_exam_id: '',
                      topic: ''
                    });
                  }
                }}
                className="flex-1 p-2 border-2 border-red-200 rounded-lg bg-white text-xs font-black text-red-700 focus:border-red-500 outline-none"
                required={newSession.session_type === 'exam'}
              >
                <option value="">-- اختر الامتحان --</option>
                {exams
                  .filter(ex => {
                    // 1. فلترة حسب المادة (Course)
                    const matchesCourse = !newSession.course_id || ex.course_id === newSession.course_id;

                    // 2. فلترة حسب المجموعة (لو الإمتحان لمجموعة معينة)
                    const matchesGroup = !ex.group_id || ex.group_id === newSession.group_id;

                    // 3. الاختفاء الذكي (لو الإمتحان بدأ أو اتقفل - يعني له سشن في الدفتر)
                    const hasSession = ex.sessions && ex.sessions.length > 0;

                    return matchesCourse && matchesGroup && !hasSession;
                  })
                  .map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title} ({ex.exam_date})</option>
                  ))
                }
              </select>
            </div>
          )}
        </div>

        <div className="md:col-span-4">
          <label className="text-xs font-bold text-gray-500 mb-1">1. الصف الدراسي</label>
          <select
            value={selectedGrade}
            onChange={e => {
              setSelectedGrade(e.target.value);
              setNewSession({
                ...newSession,
                course_id: '',
                group_id: '',
                price: '',
                fixed_share: '',
                topic: '',
                scheduled_start_time: '',
                linked_exam_id: ''
              });
            }}
            className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm focus:border-blue-500"
            required
          >
            <option value="">اختر الصف...</option>
            {availableGrades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="text-xs font-bold text-gray-500 mb-1">2. الكورس</label>
          <select
            value={newSession.course_id}
            onChange={(e) => {
              const c = courses.find(course => course.id === e.target.value);
              setNewSession({
                ...newSession,
                course_id: e.target.value,
                price: c ? c.price : '',
                fixed_share: c ? c.center_tax : '',
                group_id: '',
                topic: '',
                scheduled_start_time: '',
                linked_exam_id: ''
              });
            }}
            className="w-full p-2.5 border rounded-lg bg-white text-sm focus:border-blue-500 shadow-sm"
            required
            disabled={!selectedGrade}
          >
            <option value="">{selectedGrade ? 'اختر المادة' : '--- اختر الصف أولاً ---'}</option>
            {filteredCoursesForCreation.map(c => <option key={c.id} value={c.id}>{c.name} ({c.instructors?.name || c.instructor || 'غير محدد'})</option>)}
          </select>
        </div>

        {/* اختيار المجموعة */}
        <div className="md:col-span-4">
          <label className="text-xs font-bold text-blue-500 mb-1">3. المجموعة</label>
          <select
            value={newSession.group_id}
            onChange={(e) => {
              const groupId = e.target.value;
              const selectedGroup = groups.find(g => g.id === groupId);

              // 1. الحصول على رقم اليوم الحالي (الأحد=0 ... السبت=6)
              const todayIndex = new Date().getDay();
              const dayNamesArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

              // 2. البحث في المواعيد مع التأكد من مطابقة النوع (رقم مع رقم)
              const todaySchedule = selectedGroup?.schedule?.find(s =>
                Number(s.day_of_week) === todayIndex
              );

              let autoStartTime = "";
              let autoTopic = "";

              if (todaySchedule) {
                // ✅ حالة التطابق: الحصة في موعدها الرسمي
                // سحب الوقت كما هو نصاً من قاعدة البيانات لمنع تلاعب المناطق الزمنية
                const rawTime = todaySchedule.start_time;
                const timeParts = rawTime.split(':');
                const hours = timeParts[0];
                const minutes = timeParts[1];

                // تنسيق الوقت للعرض 12 ساعة (ص/م)
                const h = parseInt(hours);
                const ampm = h >= 12 ? 'م' : 'ص';
                const displayHours = h % 12 || 12;

                autoStartTime = `${hours}:${minutes}`;
                autoTopic = newSession.session_type === 'exam' ? newSession.topic : `حصة ${dayNamesArabic[todayIndex]} (${displayHours}:${minutes} ${ampm})`;
              } else {
                // ⚠️ حالة عدم التطابق (حصة إضافية)
                // نضع وقت الجهاز الحالي بدلاً من تركه فارغاً لضبط المنبه
                const now = new Date();
                const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                autoStartTime = currentTime;
                autoTopic = newSession.session_type === 'exam' ? newSession.topic : `حصة إضافية بتاريخ ${now.toLocaleDateString('ar-EG')}`;
              }

              setNewSession({
                ...newSession,
                group_id: groupId,
                scheduled_start_time: autoStartTime,
                topic: autoTopic
              });
            }}
            className="w-full p-2.5 border-2 border-blue-200 bg-blue-50 rounded-lg text-sm font-bold focus:border-blue-500 shadow-sm transition-all"
            required
            disabled={!newSession.course_id}
          >
            <option value="">-- اختر المجموعة --</option>
            {groups
              .filter(g => g.course_id === newSession.course_id)
              .map(g => <option key={g.id} value={g.id}>{g.name}</option>)
            }
          </select>
        </div>

        {/* عرض البيانات التلقائية بدلاً من الخانات اليدوية */}
        <div className="md:col-span-4">
          <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
            <FaCalendarAlt className="text-purple-500" /> {newSession.session_type === 'exam' ? 'عنوان الامتحان' : 'تفاصيل الحصة (آلي)'}
          </label>
          <div className={`p-2.5 border-2 border-dashed rounded-lg bg-gray-50 text-[11px] font-black ${newSession.session_type === 'exam' ? 'border-red-200 text-red-600' : 'border-gray-200 text-gray-600'}`}>
            {newSession.topic || "بانتظار اختيار المجموعة..."}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-gray-500">سعر الطالب</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={newSession.price}
            onChange={e => setNewSession({ ...newSession, price: e.target.value })}
            className="w-full p-2.5 border rounded-lg text-sm text-center font-bold text-green-700"
            placeholder="0.00"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-red-500">رسوم السنتر</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={newSession.fixed_share}
            onChange={e => setNewSession({ ...newSession, fixed_share: e.target.value })}
            className="w-full p-2.5 border border-red-200 bg-red-50 rounded-lg text-sm text-center font-bold text-red-500"
            placeholder="0.00"
          />
        </div>
        <button
          type="submit"
          className={`md:col-span-4 px-6 py-2.5 rounded-lg font-bold shadow-sm transition flex items-center justify-center gap-2
            ${loading
              ? 'bg-blue-400 cursor-wait'
              : canAddSession
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300'
            }`}
          disabled={loading || !canAddSession}
        >
          {canAddSession ? '' : <span className="text-gray-500 text-xs ml-1">🔒</span>}
          {loading ? 'جاري الحفظ...' : 'إنشاء وحفظ'}
        </button>
      </form>
    </div>
  );
};

'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { 
  FaFileInvoiceDollar, FaPlus, FaTrophy, FaUserCheck, FaFileExcel, 
  FaTrash, FaEdit, FaEye, FaChevronLeft, FaSpinner, FaLock, FaCheckCircle, FaChartBar, FaLayerGroup, FaWhatsapp , FaSearch, FaShareAlt, FaPhone,FaCalendarPlus,
  FaBook, FaQuestionCircle, FaClock, FaTools
} from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import AccessDenied from '../../../components/AccessDenied';

export default function ExamsPage() {
  const { centerId, allowedFeatures, loading: authLoading } = useAuth();
  
  // 🛡️ Package Guard
  if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_exams')) {
    return <AccessDenied />;
  }
  
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'grading'

  // Exam Selection
  const [selectedExam, setSelectedExam] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [studentsInExam, setStudentsInExam] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🛡️ Action Permissions
  const canAddExam = allowedFeatures?.includes('action_add_exam');
  const canPublish = allowedFeatures?.includes('action_publish_results');
  const canDelete = allowedFeatures?.includes('action_delete_exam');
  const canEdit = allowedFeatures?.includes('action_edit_exam');
  
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loadingScoped, setLoadingScoped] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExam, setNewExam] = useState({
    title: '',
    grade: '',
    course_id: '',
    group_id: '',
    max_score: 100,
    exam_date: new Date().toISOString().split('T')[0],
    duration_minutes: 30,
    pass_percentage: 50,
    max_attempts: 1,
    shuffle_questions: true,
    is_electronic: false,
    chapter_id: '',
    lesson_id: ''
  });

  const fetchData = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const [examsRes, coursesRes, groupsRes, stagesRes] = await Promise.all([
        supabase.from('exams').select('*, courses(name), groups(name), instructors(name)').eq('center_id', centerId).order('created_at', { ascending: false }),
        supabase.from('courses').select('*, instructors(name)').eq('center_id', centerId),
        supabase.from('groups').select('id, name, course_id').eq('center_id', centerId),
        supabase.from('educational_stages').select('*').eq('center_id', centerId).order('sort_order', { ascending: true })
      ]);

      if (examsRes.error) throw examsRes.error;
      setExams(examsRes.data || []);
      setCourses(coursesRes.data || []);
      setGroups(groupsRes.data || []);
      setStages(stagesRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  const fetchCourseStructure = async (courseId) => {
    if (!courseId) return;
    setLoadingScoped(true);
    try {
      const [chaptersRes, lessonsRes] = await Promise.all([
        supabase.from('lesson_chapters').select('*').eq('course_id', courseId).order('order_index'),
        supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index')
      ]);
      setChapters(chaptersRes.data || []);
      setLessons(lessonsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingScoped(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddExam = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedCourse = courses.find(c => c.id === newExam.course_id);
      
      const payload = {
        title: newExam.title,
        course_id: newExam.course_id || null,
        group_id: newExam.group_id || null,
        instructor_id: selectedCourse?.instructor_id || null,
        max_score: parseFloat(newExam.max_score) || 100,
        exam_date: newExam.exam_date || new Date().toISOString().split('T')[0],
        center_id: centerId,
        duration_minutes: newExam.is_electronic ? (parseInt(newExam.duration_minutes) || 30) : null,
        pass_percentage: newExam.is_electronic ? (parseInt(newExam.pass_percentage) || 50) : null,
        max_attempts: newExam.is_electronic ? (parseInt(newExam.max_attempts) || 1) : null,
        shuffle_questions: newExam.shuffle_questions,
        is_electronic: newExam.is_electronic,
        chapter_id: newExam.chapter_id || null,
        lesson_id: newExam.lesson_id || null,
        is_published: true
      };

      const { data, error } = await supabase
        .from('exams')
        .insert([payload])
        .select();

      if (error) throw error;

      toast.success('تم إنشاء الاختبار بنجاح');
      fetchData();
      setShowAddModal(false);
      setNewExam({ title: '', grade: '', course_id: '', group_id: '', chapter_id: '', lesson_id: '', max_score: 100, exam_date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      toast.error(`فشل إنشاء الاختبار: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = async (id) => {
    if (!canDelete) return toast.error('ليس لديك صلاحية حذف الاختبارات');
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الاختبار؟ سيؤدي ذلك لحذف جميع الدرجات المرصودة له تماماً!')) return;

    try {
      const { error } = await supabase.from('exams').delete().eq('id', id).eq('center_id', centerId);
      if (error) throw error;
      setExams(prev => prev.filter(e => e.id !== id));
      toast.success('تم حذف الاختبار بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const [editingExam, setEditingExam] = useState(null);

  useEffect(() => {
    if (editingExam?.course_id) {
      fetchCourseStructure(editingExam.course_id);
    }
  }, [editingExam?.course_id]);

  const handleEditExam = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedCourse = courses.find(c => c.id === editingExam.course_id);
      
      const { error } = await supabase
        .from('exams')
        .update({
          title: editingExam.title,
          course_id: editingExam.course_id || null,
          group_id: editingExam.group_id || null,
          instructor_id: selectedCourse?.instructor_id || null,
          max_score: parseFloat(editingExam.max_score) || 100,
          exam_date: editingExam.exam_date,
          duration_minutes: editingExam.is_electronic ? (parseInt(editingExam.duration_minutes) || 30) : null,
          pass_percentage: editingExam.is_electronic ? (parseInt(editingExam.pass_percentage) || 50) : null,
          max_attempts: editingExam.is_electronic ? (parseInt(editingExam.max_attempts) || 1) : null,
          shuffle_questions: editingExam.shuffle_questions,
          is_electronic: editingExam.is_electronic,
          chapter_id: editingExam.chapter_id || null,
          lesson_id: editingExam.lesson_id || null,
          is_published: true
        })
        .eq('id', editingExam.id)
        .eq('center_id', centerId);

      if (error) throw error;

      toast.success('تم تحديث الاختبار بنجاح');
      fetchData();
      setEditingExam(null);
    } catch (err) {
      toast.error('حدث خطأ أثناء التحديث');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyGradingLink = (token) => {
    if (!token) {
      toast.error('هذا الاختبار قديم ولا يملك رابط رصد، يرجى تحديث الصفحة أو المحاولة مع اختبار جديد');
      return;
    }
    const link = `${window.location.origin}/grading/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ رابط رصد الدرجات (للمدرس)');
  };

  const startGrading = async (exam) => {
    setSelectedExam(exam);
    setLoading(true);
    try {
      // 1. Fetch current results
      const { data: results, error: rError } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', exam.id);
      if (rError) throw rError;

      // 2. Fetch students who should be in this exam
      let studentsQuery = supabase.from('students').select('id, name, unique_id, group_ids, phone, parent_phone').eq('center_id', centerId);
      
      // If exam is for a specific group, we filter by that
      // If it's for a course, we might filter by enrolled_courses (but center usually does by group)
      const { data: allStudents, error: sError } = await studentsQuery;
      if (sError) throw sError;

      let filtered = allStudents;
      if (exam.group_id) {
        filtered = allStudents.filter(s => {
          const gIds = s.group_ids || {};
          return Object.values(gIds).includes(exam.group_id);
        });
      }

      setExamResults(results || []);
      setStudentsInExam(filtered || []);
      setActiveTab('grading');
    } catch (err) {
      console.error(err);
      toast.error('فشل تحميل كشف الرصد');
    } finally {
      setLoading(false);
    }
  };

  const publishExam = async (examId, status) => {
    if (!canPublish) return toast.error('تتطلب هذه العملية ترقية الباقة');
    try {
      const { error } = await supabase.from('exams').update({ is_published: status }).eq('id', examId);
      if (error) throw error;
      setExams(exams.map(e => e.id === examId ? { ...e, is_published: status } : e));
      toast.success(status ? 'تم نشر النتائج للطلاب' : 'تم إلغاء النشر');
      fetchData(); // Refresh to be safe
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  if (!centerId || authLoading) return <div className="p-20 text-center font-bold text-gray-400 animate-pulse">جاري التحميل...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8" dir="rtl">
      <Toaster position="top-center" />

      {activeTab === 'list' ? (
        <>
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] text-white shadow-3xl relative overflow-hidden group">
            <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-black mb-3 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <FaTrophy className="text-yellow-400" />
                </div>
                نظام رصد الدرجات والتميز
              </h1>
              <p className="text-indigo-100/80 font-bold text-sm md:text-lg max-w-2xl leading-relaxed">
                سجل اختباراتك، ارصد الدرجات بموثوقية، وشارك النجاح مع الطلاب وأولياء الأمور بضغطة زر.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <button 
                  onClick={() => canAddExam ? setShowAddModal(true) : toast.error('تتطلب ترقية الباقة')}
                  className={`px-8 py-4 rounded-2xl font-black text-sm md:text-base flex items-center gap-3 shadow-2xl transition-all active:scale-95 ${canAddExam ? 'bg-white text-indigo-900 hover:bg-indigo-50 border-4 border-white/20' : 'bg-white/50 text-white/50 cursor-not-allowed'}`}
                >
                    {canAddExam ? <FaPlus className="text-pink-500" /> : <FaLock />} إنشاء اختبار جديد
                </button>

                <Link 
                  href="/admin/exams/questions"
                  className="px-8 py-4 rounded-2xl font-black text-sm md:text-base flex items-center gap-3 bg-indigo-500/30 backdrop-blur-md text-white border-2 border-white/10 hover:bg-indigo-500/50 transition-all shadow-xl"
                >
                   <FaBook className="text-yellow-400" /> بنك الأسئلة
                </Link>
              </div>
            </div>
            
            <FaTrophy className="absolute -left-20 -bottom-20 text-[20rem] text-white/5 opacity-10 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center"><FaSpinner className="animate-spin text-4xl mx-auto text-indigo-600" /></div>
            ) : exams.length === 0 ? (
              <div className="col-span-full py-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300">
                  <FaFileInvoiceDollar size={80} className="mb-4 opacity-10" />
                  <p className="text-xl font-black text-gray-500">لم يتم إضافة أي اختبارات بعد</p>
                  <p className="text-sm font-bold mt-2">ابدأ بإضافة أول اختبار لرصد درجات طلابك</p>
              </div>
            ) : (
              exams.map(exam => (
                <div key={exam.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-indigo-100/20 border border-gray-50 flex flex-col h-full group hover:shadow-2xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${exam.is_published ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {exam.is_published ? 'منشورة للطلاب' : 'مسودة (لم تنشر)'}
                      </span>
                      <div className="text-xs font-black text-gray-400">
                          {exam.exam_date}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-gray-800 mb-2 truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                      {exam.title}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl text-[10px] font-black border border-indigo-100 flex items-center gap-1">
                          <FaUserCheck size={10}/> {exam.courses?.name || 'مادة عامة'}
                      </div>
                      <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl text-[10px] font-black border border-emerald-100 flex items-center gap-1">
                          👤 {exam.instructors?.name || 'مدرس أساسي'}
                      </div>
                      <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-xl text-[10px] font-black border border-purple-100 flex items-center gap-1">
                          <FaLayerGroup size={10}/> {exam.groups?.name || 'كل المجموعات'}
                      </div>
                      {exam.is_electronic && (
                        <div className="bg-pink-50 text-pink-700 px-3 py-1 rounded-xl text-[10px] font-black border border-pink-100 flex items-center gap-1 animate-pulse">
                           ⚡ اختبار إلكتروني
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-50 flex flex-col gap-4">
                      {/* الزرار الرئيسي - رصد الدرجات */}
                      <div className="flex flex-row gap-2 items-center">
                        <button 
                          onClick={() => startGrading(exam)}
                          className="flex-1 bg-indigo-600 text-white h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <FaFileExcel size={18} /> رصد الدرجات
                        </button>
                        
                        {exam.is_electronic && (
                           <Link 
                             href={`/admin/exams/builder?id=${exam.id}`}
                             className="flex-1 bg-pink-600 text-white h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-pink-100 hover:bg-pink-700 transition-all active:scale-95 border-b-4 border-pink-800 whitespace-nowrap"
                           >
                              <FaTools size={18} /> بناء الأسئلة
                           </Link>
                        )}
                      </div>
                    
                      {/* زراير التحكم الثانوية */}
                      <div className="flex flex-wrap items-center justify-center gap-2">
                          <button 
                             onClick={() => copyGradingLink(exam.grading_token)}
                             className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-all"
                             title="نسخ رابط الرصد للمدرس"
                          >
                             <FaShareAlt size={14} />
                          </button>

                          <a 
                             href={`/admin/schedule?action=schedule_exam&exam_id=${exam.id}&course_id=${exam.course_id}&max_score=${exam.max_score}&title=${encodeURIComponent(exam.title)}&date=${exam.exam_date}`}
                             className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all active:scale-95"
                             title="حجز موعد الامتحان في الجدول"
                          >
                             <FaCalendarPlus size={14} />
                          </a>

                          <button 
                            onClick={() => publishExam(exam.id, !exam.is_published)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${!canPublish ? 'opacity-30 cursor-not-allowed' : exam.is_published ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            title={!canPublish ? 'تتطلب ترقية الباقة' : exam.is_published ? 'إلغاء النشر' : 'نشر للطلاب'}
                          >
                            {!canPublish ? <FaLock /> : exam.is_published ? <FaLock /> : <FaCheckCircle />}
                          </button>

                          {canEdit && (
                            <button 
                              onClick={() => setEditingExam({
                                ...exam, 
                                grade: courses.find(c => c.id === exam.course_id)?.grade || ''
                              })}
                              className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                              title="تعديل الاختبار"
                            >
                              <FaEdit size={14} />
                            </button>
                          )}

                          {canDelete && (
                            <button 
                              onClick={() => handleDeleteExam(exam.id)}
                              className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all active:scale-95"
                              title="حذف الاختبار"
                            >
                              <FaTrash size={14} />
                            </button>
                          )}
                      </div>
                    </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <GradingInterface 
          exam={selectedExam} 
          students={studentsInExam} 
          initialResults={examResults}
          onBack={() => { setActiveTab('list'); fetchData(); }} 
          centerId={centerId}
        />
      )}

      {/* Add Exam Modal */}
       {showAddModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-4xl p-8 md:p-10 my-auto animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black mb-8 text-gray-800 flex items-center gap-3">
                 <FaPlus className="text-indigo-600" /> إنشاء اختبار جديد
              </h2>
              
              <form onSubmit={handleAddExam} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">عنوان الاختبار</label>
                    <input 
                      type="text" 
                      placeholder="مثلاً: مراجعة الباب الأول"
                      required
                      value={newExam.title}
                      onChange={e => setNewExam({...newExam, title: e.target.value})}
                      className="w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                    />
                 </div>
                 
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">الصف الدراسي</label>
                    <select 
                      value={newExam.grade}
                      onChange={e => setNewExam({...newExam, grade: e.target.value, course_id: '', group_id: ''})}
                      className="w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                    >
                       <option value="">اختر الصف</option>
                       {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">المادة (المدرس)</label>
                       <select 
                         value={newExam.course_id || ''}
                         onChange={e => {
                           setNewExam({...newExam, course_id: e.target.value, group_id: '', chapter_id: '', lesson_id: ''});
                           fetchCourseStructure(e.target.value);
                         }}
                         className={`w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all ${!newExam.grade && 'opacity-50 pointer-events-none'}`}
                         disabled={!newExam.grade}
                       >
                          <option value="">اختر المادة</option>
                          {courses
                            .filter(c => !newExam.grade || c.grade === newExam.grade)
                            .map(c => <option key={c.id} value={c.id}>{c.name} ({c.instructors?.name || 'مدرس أساسي'})</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">المجموعة</label>
                       <select 
                         value={newExam.group_id || ''}
                         onChange={e => setNewExam({...newExam, group_id: e.target.value})}
                         className={`w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all ${!newExam.course_id && 'opacity-50 pointer-events-none'}`}
                         disabled={!newExam.course_id}
                       >
                          <option value="">كل المجموعات</option>
                          {groups.filter(g => g.course_id === newExam.course_id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                       </select>
                    </div>
                 </div>

                 {newExam.course_id && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">تخصيص لباب (اختياري)</label>
                         <select 
                           value={newExam.chapter_id || ''}
                           onChange={e => setNewExam({...newExam, chapter_id: e.target.value, lesson_id: ''})}
                           className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                         >
                            <option value="">امتحان شامل على المادة</option>
                            {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">تخصيص لحصة (اختياري)</label>
                         <select 
                           value={newExam.lesson_id || ''}
                           onChange={e => setNewExam({...newExam, lesson_id: e.target.value, chapter_id: ''})}
                           className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                         >
                            <option value="">ليس مرتبطاً بحصة</option>
                            {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                         </select>
                      </div>
                    </div>
                  )}

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">الدرجة النهائية</label>
                       <input 
                         type="number" 
                         value={newExam.max_score}
                         onChange={e => setNewExam({...newExam, max_score: e.target.value})}
                         className="w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">تاريخ الاختبار</label>
                       <input 
                         type="date" 
                         value={newExam.exam_date}
                         onChange={e => setNewExam({...newExam, exam_date: e.target.value})}
                         className="w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                       />
                    </div>
                 </div>

                  {/* 🆕 Electronic Exam Settings */}
                  <div className="p-6 bg-pink-50 rounded-[2rem] border-2 border-pink-100 space-y-4">
                     <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-12 h-6 rounded-full transition-all relative ${newExam.is_electronic ? 'bg-pink-500' : 'bg-gray-300'}`}>
                           <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newExam.is_electronic ? 'right-7' : 'right-1'}`}></div>
                        </div>
                        <input 
                          type="checkbox" className="hidden"
                          checked={newExam.is_electronic}
                          onChange={e => setNewExam({...newExam, is_electronic: e.target.checked})}
                        />
                        <span className="font-black text-pink-700">تفعيل كاختبار إلكتروني (أونلاين) ⚡</span>
                     </label>

                     {newExam.is_electronic && (
                        <div className="grid grid-cols-3 gap-3 animate-in fade-in zoom-in duration-300">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-pink-400 uppercase mr-1">الوقت (دقيقة)</label>
                              <input type="number" value={newExam.duration_minutes} onChange={e => setNewExam({...newExam, duration_minutes: e.target.value})} className="w-full h-12 px-4 rounded-xl border-2 border-pink-100 font-bold outline-none focus:border-pink-500" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-pink-400 uppercase mr-1">المحاولات</label>
                              <input type="number" value={newExam.max_attempts} onChange={e => setNewExam({...newExam, max_attempts: e.target.value})} className="w-full h-12 px-4 rounded-xl border-2 border-pink-100 font-bold outline-none focus:border-pink-500" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-pink-400 uppercase mr-1">النجاح %</label>
                              <input type="number" value={newExam.pass_percentage} onChange={e => setNewExam({...newExam, pass_percentage: e.target.value})} className="w-full h-12 px-4 rounded-xl border-2 border-pink-100 font-bold outline-none focus:border-pink-500" />
                           </div>
                        </div>
                     )}
                  </div>

                 <div className="flex gap-4 pt-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-indigo-600 text-white h-16 rounded-3xl font-black text-lg shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-gray-200"
                    >
                       {isSubmitting ? <FaSpinner className="animate-spin mx-auto" /> : 'إنشاء الاختبار الآن'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-10 h-16 bg-gray-100 text-gray-500 rounded-3xl font-black hover:bg-gray-200 transition-all"
                    >
                       إلغاء
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {editingExam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
           <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-4xl p-8 md:p-10 my-auto animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black mb-8 text-gray-800 flex items-center gap-3">
                 <FaEdit className="text-indigo-600" /> تعديل الاختبار
              </h2>
              
              <form onSubmit={handleEditExam} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">عنوان الاختبار</label>
                    <input 
                      type="text" 
                      placeholder="مثلاً: مراجعة الباب الأول"
                      required
                      value={editingExam.title}
                      onChange={e => setEditingExam({...editingExam, title: e.target.value})}
                      className="w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                    />
                 </div>
                 
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">الصف الدراسي</label>
                    <select 
                      value={editingExam.grade}
                      onChange={e => setEditingExam({...editingExam, grade: e.target.value, course_id: '', group_id: ''})}
                      className="w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                    >
                       <option value="">اختر الصف</option>
                       {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">المادة (المدرس)</label>
                       <select 
                         value={editingExam.course_id || ''}
                         onChange={e => setEditingExam({...editingExam, course_id: e.target.value, group_id: ''})}
                         className={`w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all ${!editingExam.grade && 'opacity-50 pointer-events-none'}`}
                         disabled={!editingExam.grade}
                       >
                          <option value="">اختر المادة</option>
                          {courses
                            .filter(c => !editingExam.grade || c.grade === editingExam.grade)
                            .map(c => <option key={c.id} value={c.id}>{c.name} ({c.instructors?.name || 'مدرس أساسي'})</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">المجموعة</label>
                       <select 
                         value={editingExam.group_id || ''}
                         onChange={e => setEditingExam({...editingExam, group_id: e.target.value})}
                         className={`w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all ${!editingExam.course_id && 'opacity-50 pointer-events-none'}`}
                         disabled={!editingExam.course_id}
                       >
                          <option value="">كل المجموعات</option>
                          {groups.filter(g => g.course_id === editingExam.course_id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                       </select>
                    </div>
                 </div>

                 {editingExam.course_id && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">تخصيص لباب (اختياري)</label>
                         <select 
                           value={editingExam.chapter_id || ''}
                           onChange={e => setEditingExam({...editingExam, chapter_id: e.target.value, lesson_id: ''})}
                           className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                         >
                            <option value="">امتحان شامل على المادة</option>
                            {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">تخصيص لحصة (اختياري)</label>
                         <select 
                           value={editingExam.lesson_id || ''}
                           onChange={e => setEditingExam({...editingExam, lesson_id: e.target.value, chapter_id: ''})}
                           className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                         >
                            <option value="">ليس مرتبطاً بحصة</option>
                            {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                         </select>
                      </div>
                    </div>
                  )}

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">الدرجة النهائية</label>
                       <input 
                         type="number" 
                         value={editingExam.max_score}
                         onChange={e => setEditingExam({...editingExam, max_score: e.target.value})}
                         className="w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">تاريخ الاختبار</label>
                       <input 
                         type="date" 
                         value={editingExam.exam_date}
                         onChange={e => setEditingExam({...editingExam, exam_date: e.target.value})}
                         className="w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                       />
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-indigo-600 text-white h-16 rounded-3xl font-black text-lg shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-gray-200"
                    >
                       {isSubmitting ? <FaSpinner className="animate-spin mx-auto" /> : 'حفظ التعديلات'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditingExam(null)}
                      className="px-10 h-16 bg-gray-100 text-gray-500 rounded-3xl font-black hover:bg-gray-200 transition-all"
                    >
                       إلغاء
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

function GradingInterface({ exam, students, initialResults, onBack, centerId }) {
  const [results, setResults] = useState(students.map(s => {
    const existing = initialResults.find(r => r.student_id === s.id);
    return {
      student_id: s.id,
      student_name: s.name,
      student_code: s.unique_id || s.id.slice(0, 6),
      student_phone: s.phone || '',
      parent_phone: s.parent_phone || '',
      score: existing?.score || 0,
      status: existing?.status || 'present',
      comment: existing?.teacher_comment || ''
    };
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  const filteredResults = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return results.filter(r => 
      r.student_name.toLowerCase().includes(term) || 
      r.student_code.toLowerCase().includes(term) ||
      r.student_phone.includes(term) ||
      r.parent_phone.includes(term)
    );
  }, [results, searchTerm]);

  const updateStudentResult = (studentId, fields) => {
    setResults(prev => prev.map(r => r.student_id === studentId ? { ...r, ...fields } : r));
  };

  const handleScoreChange = (studentId, value) => {
    const score = Math.min(exam.max_score, Math.max(0, parseFloat(value) || 0));
    updateStudentResult(studentId, { score });
  };

  const handleStatusChange = (studentId, status) => {
    const fields = { status };
    if (status === 'absent') fields.score = 0;
    updateStudentResult(studentId, fields);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = results.map(r => ({
        exam_id: exam.id,
        student_id: r.student_id,
        score: parseFloat(r.score),
        status: r.status,
        teacher_comment: r.comment
      }));

      const { error } = await supabase.from('exam_results').upsert(payload, { onConflict: 'exam_id, student_id' });
      if (error) throw error;
      toast.success('تم حفظ الدرجات بنجاح');
      onBack();
    } catch (err) {
      console.error(err);
      toast.error('فشل حفظ الدرجات');
    } finally {
      setIsSaving(false);
    }
  };

  const exportTemplate = () => {
    const data = results.map(r => ({
      'كود الطالب': r.student_code,
      'اسم الطالب': r.student_name,
      'الدرجة': r.score,
      'الحالة': r.status === 'present' ? 'حضر' : r.status === 'absent' ? 'غاب' : 'اعتذار',
      'تعليق المدرس': r.comment
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "نتائج الاختبار");
    XLSX.writeFile(wb, `كشف_رصد_${exam.title}.xlsx`);
  };

  const sendWhatsApp = (student) => {
    const percentage = (student.score / exam.max_score) * 100;
    const message = `إدارة سنتر ${centerId} تهنئ الطالب/ة *${student.student_name}* 
بالحصول على درجة: *${student.score} من ${exam.max_score}* (${Math.round(percentage)}%)
في اختبار: *${exam.title}*
مستوى الطالب: ${percentage >= 90 ? 'ممتاز 🌟' : percentage >= 75 ? 'جيد جداً' : 'جيد'}
${student.comment ? `تعليق المدرس: ${student.comment}` : ''}
يمكنكم متابعة التقارير من بوابة ولي الأمر.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const updatedResults = [...results];
        data.forEach(row => {
          const code = row['كود الطالب']?.toString();
          const score = parseFloat(row['الدرجة']);
          const statusText = row['الحالة'];
          const comment = row['تعليق المدرس'] || '';
          
          let status = 'present';
          if (statusText === 'غاب') status = 'absent';
          else if (statusText === 'اعتذار') status = 'excused';

          const index = updatedResults.findIndex(r => r.student_code === code || r.student_name === row['اسم الطالب']);
          if (index !== -1) {
            updatedResults[index].score = isNaN(score) ? 0 : score;
            updatedResults[index].status = status;
            updatedResults[index].comment = comment;
          }
        });
        setResults(updatedResults);
        toast.success('تم استيراد البيانات من ملف الإكسل');
      } catch (err) {
        toast.error('خطأ في قراءة ملف الإكسل');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-left duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
         <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all group">
               <FaChevronLeft className="rotate-180 group-hover:scale-110 transition-transform" />
            </button>
            <div>
               <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">كشف رصد: {exam.title}</h2>
               <div className="flex items-center gap-2 mt-1">
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">الدرجة النهائية: {exam.max_score}</span>
                  <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">{students.length} طالب</span>
               </div>
            </div>
         </div>
         
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input 
                type="text"
                placeholder="ابحث بالاسم أو الكود..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-12 pr-11 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl font-bold text-sm outline-none transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
               <button 
                 onClick={exportTemplate}
                 title="تحميل كشف رصد إكسل"
                 className="flex-1 sm:flex-none h-12 px-5 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
               >
                  <FaFileExcel size={16} /> <span className="hidden sm:inline">تحميل إكسل</span>
               </button>
               
               <input 
                 type="file" 
                 className="hidden" 
                 ref={fileInputRef} 
                 accept=".xlsx,.xls"
                 onChange={handleImportExcel}
               />
               
               <button 
                 onClick={() => fileInputRef.current.click()}
                 title="رفع الدرجات من ملف إكسل"
                 className="flex-1 sm:flex-none h-12 px-5 bg-white text-indigo-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
               >
                  <FaPlus size={14} /> <span className="hidden sm:inline">رفع إكسل</span>
               </button>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-3xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
         <table className="w-full text-right">
            <thead>
               <tr className="bg-gray-900 text-white uppercase text-[10px] font-black tracking-widest">
                  <th className="p-6">الطالب</th>
                  <th className="p-6">الحالة</th>
                  <th className="p-6">الدرجة</th>
                  <th className="p-6">تعليق المدرس</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {filteredResults.length === 0 ? (
                 <tr><td colSpan="4" className="p-20 text-center font-bold text-gray-400">
                    {searchTerm ? 'لا توجد نتائج لعملية البحث' : 'لا يوجد طلاب مسجلين في هذه المجموعة'}
                 </td></tr>
               ) : (
                 filteredResults.map((r) => (
                  <tr key={r.student_id} className="hover:bg-indigo-50/30 transition-colors">
                     <td className="p-5">
                        <div className="flex items-center gap-3">
                           <button 
                             onClick={() => sendWhatsApp(r)}
                             className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm"
                             title="ارسال للواتساب"
                           >
                              <FaWhatsapp size={18} />
                           </button>
                           <div className="flex flex-col text-right">
                              <span className="font-black text-gray-800 text-sm">{r.student_name}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Code: {r.student_code}</span>
                           </div>
                        </div>
                     </td>
                       <td className="p-5">
                          <div className="flex gap-1 justify-center md:justify-start">
                             {[
                               {id: 'present', label: 'حضر', bg: '#dcfce7', color: '#166534'},
                               {id: 'absent', label: 'غاب', bg: '#fee2e2', color: '#991b1b'},
                               {id: 'excused', label: 'اعتذار', bg: '#fef9c3', color: '#854d0e'}
                             ].map(s => (
                                <button 
                                  key={s.id}
                                  onClick={() => handleStatusChange(r.student_id, s.id)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${r.status === s.id ? 'scale-105 shadow-md border-2 border-white' : 'opacity-40 grayscale'}`}
                                  style={{ backgroundColor: s.bg, color: s.color }}
                                >
                                   {s.label}
                                 </button>
                             ))}
                          </div>
                       </td>
                       <td className="p-5">
                          <div className="relative w-24">
                             <input 
                                type="number" 
                                value={r.score}
                                disabled={r.status !== 'present'}
                                onChange={(e) => handleScoreChange(r.student_id, e.target.value)}
                                className={`w-full h-11 px-4 bg-gray-50 border-2 rounded-xl outline-none font-black text-sm text-center transition-all ${r.score === exam.max_score ? 'border-green-400 text-green-700 bg-green-50' : 'border-transparent focus:border-indigo-600'}`}
                             />
                             {r.score === exam.max_score && r.score > 0 && (
                               <FaTrophy className="absolute -top-3 -right-3 text-yellow-500 text-lg animate-bounce drop-shadow-sm" />
                             )}
                          </div>
                       </td>
                       <td className="p-5">
                          <input 
                             type="text" 
                             placeholder="أضف ملاحظة..."
                             value={r.comment}
                             onChange={(e) => updateStudentResult(r.student_id, { comment: e.target.value })}
                             className="w-full h-11 px-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-xs transition-all"
                          />
                       </td>
                    </tr>
                  ))
               )}
            </tbody>
         </table>
      </div>

      <div className="flex justify-end pt-4 pb-10">
         <button 
           onClick={handleSave}
           disabled={isSaving}
           className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3 disabled:bg-gray-200"
         >
            {isSaving ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> حفظ واعتماد الدرجات</>}
         </button>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase-browser';
import { 
  FaPlus, FaTrash, FaEdit, FaSearch, FaFilter, FaLayerGroup, FaBook, 
  FaQuestionCircle, FaCheck, FaTimes, FaSpinner, FaChevronLeft
} from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import Link from 'next/link';
import AccessDenied from '../../../../components/AccessDenied';

export default function QuestionBankPage() {
  const { centerId, allowedFeatures, loading: authLoading } = useAuth();
  
  // 🛡️ Package Guard
  if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_exams')) {
    return <AccessDenied />;
  }
  
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    course_id: '',
    question_text: '',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1,
    difficulty: 'medium'
  });

  const fetchData = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const [questionsRes, coursesRes] = await Promise.all([
        supabase.from('question_bank').select('*, courses(name)').eq('center_id', centerId).order('created_at', { ascending: false }),
        supabase.from('courses').select('id, name, grade').eq('center_id', centerId)
      ]);

      if (questionsRes.error) throw questionsRes.error;
      if (coursesRes.error) throw coursesRes.error;

      setQuestions(questionsRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err) {
      console.error('Fetch error:', err.message || err);
      toast.error('حدث خطأ في جلب البيانات: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCourse = !filterCourse || q.course_id === filterCourse;
      const matchesType = !filterType || q.question_type === filterType;
      return matchesSearch && matchesCourse && matchesType;
    });
  }, [questions, searchTerm, filterCourse, filterType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.course_id || !formData.question_text) {
      return toast.error('يرجى ملء جميع الحقول الأساسية');
    }

    // Validation for MCQ
    if (formData.question_type === 'mcq') {
       if (formData.options.some(opt => !opt.trim())) {
         return toast.error('يرجى ملء جميع اختيارات السؤال');
       }
       if (!formData.correct_answer) {
         return toast.error('يرجى تحديد الإجابة الصحيحة');
       }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        center_id: centerId,
        // Ensure correct_answer is one of the options for MCQ or True/False
        options: formData.question_type === 'true_false' ? ['صح', 'خطأ'] : formData.options
      };

      let error;
      if (isEditing) {
        const { error: err } = await supabase
          .from('question_bank')
          .update(payload)
          .eq('id', currentId);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('question_bank')
          .insert([payload]);
        error = err;
      }

      if (error) throw error;

      toast.success(isEditing ? 'تم تعديل السؤال بنجاح' : 'تم إضافة السؤال بنجاح');
      fetchData();
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error(`فشل الحفظ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      question_text: '',
      question_type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 1,
      difficulty: 'medium'
    });
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleEdit = (q) => {
    setFormData({
      course_id: q.course_id || '',
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || ['', '', '', ''],
      correct_answer: q.correct_answer,
      points: q.points,
      difficulty: q.difficulty
    });
    setCurrentId(q.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
      const { error } = await supabase.from('question_bank').delete().eq('id', id);
      if (error) throw error;
      setQuestions(prev => prev.filter(q => q.id !== id));
      toast.success('تم حذف السؤال');
    } catch (err) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  if (!centerId || authLoading) return <div className="p-20 text-center font-bold text-gray-400 animate-pulse">جاري التحميل...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8" dir="rtl">
      <Toaster position="top-center" />

      {/* Header Area */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] text-white shadow-3xl relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <Link href="/admin/exams" className="flex items-center gap-2 text-indigo-200 hover:text-white transition-colors mb-4 font-bold text-sm">
                <FaChevronLeft className="rotate-180" /> العودة للامتحانات
              </Link>
              <h1 className="text-3xl md:text-5xl font-black mb-3 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <FaBook className="text-yellow-400" />
                </div>
                بنك الأسئلة الاحترافي
              </h1>
              <p className="text-indigo-100/80 font-bold text-sm md:text-lg max-w-2xl leading-relaxed">
                أنشئ مكتبة أسئلة متنوعة، صنفها حسب المادة والصعوبة، واستخدمها لبناء امتحاناتك الإلكترونية.
              </p>
            </div>
            
            <button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-8 py-4 bg-yellow-400 text-indigo-950 rounded-2xl font-black text-sm md:text-base flex items-center gap-3 shadow-2xl hover:bg-yellow-300 transition-all active:scale-95 whitespace-nowrap"
            >
                <FaPlus /> إضافة سؤال جديد
            </button>
          </div>
        </div>
        
        <FaQuestionCircle className="absolute -left-20 -bottom-20 text-[20rem] text-white/5 opacity-10 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
      </div>

      {/* Filters Area */}
      <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-100/20 border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center flex-1">
          <div className="relative w-full md:w-80">
            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              type="text" 
              placeholder="ابحث عن سؤال معين..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-12 pr-11 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl outline-none font-bold text-sm transition-all text-gray-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <select 
              value={filterCourse}
              onChange={e => setFilterCourse(e.target.value)}
              className="h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold text-sm outline-none text-gray-800"
            >
              <option value="">كل المواد</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>)}
            </select>
          </div>

          <select 
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold text-sm outline-none text-gray-800"
          >
            <option value="">كل الأنواع</option>
            <option value="mcq">اختيار من متعدد</option>
            <option value="true_false">صح أو خطأ</option>
          </select>
        </div>

        <div className="text-sm font-black text-gray-400">
           إجمالي: <span className="text-indigo-600">{filteredQuestions.length}</span> سؤال
        </div>
      </div>

      {/* Questions List */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="py-20 text-center"><FaSpinner className="animate-spin text-4xl mx-auto text-indigo-600" /></div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300">
              <FaQuestionCircle size={80} className="mb-4 opacity-10" />
              <p className="text-xl font-black text-gray-500">بنك الأسئلة خالي حالياً</p>
              <p className="text-sm font-bold mt-2">ابدأ بإضافة الأسئلة لتتمكن من إنشاء امتحانات إلكترونية</p>
          </div>
        ) : (
          filteredQuestions.map(q => (
            <div key={q.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100/10 border border-gray-50 hover:border-indigo-200 transition-all group overflow-hidden relative">
               <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                  <div className="flex-1 space-y-4">
                     <div className="flex flex-wrap gap-2">
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black border border-indigo-100 uppercase tracking-tighter">
                           {q.courses?.name || 'مادة عامة'}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-tighter ${
                          q.difficulty === 'easy' ? 'bg-green-50 text-green-700 border-green-100' :
                          q.difficulty === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-red-50 text-red-700 border-red-100'
                        }`}>
                           صعوبة: {q.difficulty === 'easy' ? 'سهل' : q.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                        </span>
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-[10px] font-black border border-purple-100 uppercase tracking-tighter">
                           {q.points} درجة
                        </span>
                        <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg text-[10px] font-black border border-gray-200 uppercase tracking-tighter">
                           {q.question_type === 'mcq' ? 'MCQ' : 'T/F'}
                        </span>
                     </div>

                     <h2 className="text-xl font-black text-gray-800 leading-relaxed">
                        {q.question_text}
                     </h2>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options?.map((opt, idx) => (
                           <div key={idx} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                             opt === q.correct_answer ? 'bg-emerald-50 border-emerald-500/50' : 'bg-gray-50 border-transparent'
                           }`}>
                              <span className={`text-sm font-bold ${opt === q.correct_answer ? 'text-emerald-700' : 'text-gray-600'}`}>
                                 {String.fromCharCode(65 + idx)}. {opt}
                              </span>
                              {opt === q.correct_answer && <FaCheck className="text-emerald-500" />}
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="flex md:flex-col gap-2 shrink-0">
                     <button 
                        onClick={() => handleEdit(q)}
                        className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        title="تعديل السؤال"
                     >
                        <FaEdit />
                     </button>
                     <button 
                        onClick={() => handleDelete(q.id)}
                        className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        title="حذف السؤال"
                     >
                        <FaTrash />
                     </button>
                  </div>
               </div>
               
               <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-bl-[4rem] group-hover:scale-150 transition-transform -z-0"></div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-4xl p-8 md:p-12 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
              <h2 className="text-2xl font-black mb-8 text-indigo-900 flex items-center gap-3">
                 {isEditing ? <FaEdit /> : <FaPlus />} {isEditing ? 'تعديل السؤال' : 'إضافة سؤال جديد لبنك الأسئلة'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                 {/* Course Selection */}
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">المادة المستهدفة</label>
                    <select 
                      value={formData.course_id}
                      onChange={e => setFormData({...formData, course_id: e.target.value})}
                      className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                      required
                    >
                       <option value="">اختر المادة</option>
                       {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>)}
                    </select>
                 </div>

                 {/* Question Content */}
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">نص السؤال</label>
                    <textarea 
                      placeholder="اكتب مضمون السؤال هنا..."
                      required
                      rows={3}
                      value={formData.question_text}
                      onChange={e => setFormData({...formData, question_text: e.target.value})}
                      className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all resize-none"
                    ></textarea>
                 </div>

                 {/* Question Type & Difficulty */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">نوع السؤال</label>
                       <select 
                         value={formData.question_type}
                         onChange={e => setFormData({...formData, question_type: e.target.value, options: e.target.value === 'true_false' ? ['صح', 'خطأ'] : ['', '', '', ''], correct_answer: ''})}
                         className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                       >
                          <option value="mcq">اختيار من متعدد (MCQ)</option>
                          <option value="true_false">صح أو خطأ</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">مستوى الصعوبة</label>
                       <select 
                         value={formData.difficulty}
                         onChange={e => setFormData({...formData, difficulty: e.target.value})}
                         className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                       >
                          <option value="easy">سهل</option>
                          <option value="medium">متوسط</option>
                          <option value="hard">صعب</option>
                       </select>
                    </div>
                 </div>

                 {/* Options for MCQ */}
                 {formData.question_type === 'mcq' && (
                   <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2 block">الاختيارات المتاحة</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.options.map((opt, idx) => (
                           <div key={idx} className="relative group">
                              <span className="absolute -right-2 -top-2 w-6 h-6 bg-slate-800 text-white text-[10px] rounded-full flex items-center justify-center font-black z-10">
                                 {String.fromCharCode(65 + idx)}
                              </span>
                              <input 
                                type="text"
                                placeholder={`الاختيار رقم ${idx + 1}`}
                                value={opt}
                                onChange={e => {
                                  let newOpts = [...formData.options];
                                  newOpts[idx] = e.target.value;
                                  setFormData({...formData, options: newOpts});
                                }}
                                className={`w-full h-14 px-6 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-gray-800 transition-all pr-12 ${
                                  opt === formData.correct_answer ? 'border-emerald-500/50 bg-emerald-50/20' : 'border-transparent'
                                }`}
                              />
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, correct_answer: opt})}
                                className={`absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                  opt !== '' && opt === formData.correct_answer ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                                }`}
                                title="تحديد كإجابة صحيحة"
                              >
                                 <FaCheck size={12} />
                              </button>
                           </div>
                        ))}
                      </div>
                   </div>
                 )}

                 {/* Options for True/False */}
                 {formData.question_type === 'true_false' && (
                   <div className="flex gap-4 pt-4 border-t border-slate-100 justify-center">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, correct_answer: 'صح'})}
                        className={`flex-1 h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all border-4 ${
                          formData.correct_answer === 'صح' ? 'bg-emerald-500 text-white border-emerald-200' : 'bg-slate-50 text-slate-400 border-transparent'
                        }`}
                      >
                         <FaCheck /> صح
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, correct_answer: 'خطأ'})}
                        className={`flex-1 h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all border-4 ${
                          formData.correct_answer === 'خطأ' ? 'bg-red-500 text-white border-red-200' : 'bg-slate-50 text-slate-400 border-transparent'
                        }`}
                      >
                         <FaTimes /> خطأ
                      </button>
                   </div>
                 )}

                 {/* Points & Points Display */}
                 <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mt-6">
                    <span className="font-bold text-indigo-900 flex items-center gap-2">
                       <div className="w-8 h-8 bg-indigo-200 rounded-lg flex items-center justify-center text-xs">⭐</div>
                       درجة السؤال:
                    </span>
                    <input 
                      type="number" 
                      min="1"
                      value={formData.points}
                      onChange={e => setFormData({...formData, points: parseInt(e.target.value) || 1})}
                      className="w-20 h-10 bg-white border-2 border-indigo-200 rounded-xl text-center font-black text-indigo-700 outline-none"
                    />
                 </div>

                 {/* Action Buttons */}
                 <div className="flex gap-4 pt-6">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-indigo-600 text-white h-16 rounded-3xl font-black text-lg shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-300"
                    >
                       {isSubmitting ? <FaSpinner className="animate-spin mx-auto" /> : (isEditing ? 'حفظ التغييرات' : 'إضافة السؤال للبنك')}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-8 h-16 bg-slate-100 text-slate-500 rounded-3xl font-black hover:bg-slate-200 transition-all"
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

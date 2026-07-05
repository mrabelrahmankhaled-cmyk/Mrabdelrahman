'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase-browser';
import { 
  FaPlus, FaTrash, FaSearch, FaFilter, FaTools, FaCheck, FaTimes, FaSpinner, FaChevronLeft, FaSave, FaSort
} from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ExamBuilderPage() {
  const { centerId } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const examId = searchParams.get('id');

  const [exam, setExam] = useState(null);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!centerId || !examId) return;
    setLoading(true);
    try {
      // 1. Fetch Exam Details
      const { data: examData, error: eError } = await supabase
        .from('exams')
        .select('*, courses(name, grade)')
        .eq('id', examId)
        .single();
      if (eError) throw eError;
      setExam(examData);

      // 2. Fetch Bank Questions (filtered by the same course if possible)
      const { data: bankData, error: bError } = await supabase
        .from('question_bank')
        .select('*')
        .eq('center_id', centerId)
        .eq('course_id', examData.course_id);
      if (bError) throw bError;
      setBankQuestions(bankData || []);

      // 3. Fetch current exam questions
      const { data: currentReq, error: cError } = await supabase
        .from('exam_questions')
        .select('*, question_bank(*)')
        .eq('exam_id', examId)
        .order('sort_order', { ascending: true });
      if (cError) throw cError;
      setSelectedQuestions(currentReq.map(r => r.question_bank) || []);
      
    } catch (err) {
      console.error('Fetch error:', err.message || err);
      toast.error('حدث خطأ في جلب البيانات: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  }, [centerId, examId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBank = useMemo(() => {
    return bankQuestions.filter(q => {
      const isAlreadySelected = selectedQuestions.some(sq => sq.id === q.id);
      const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDiff = !filterDifficulty || q.difficulty === filterDifficulty;
      return !isAlreadySelected && matchesSearch && matchesDiff;
    });
  }, [bankQuestions, selectedQuestions, searchTerm, filterDifficulty]);

  const addQuestion = (q) => {
    setSelectedQuestions([...selectedQuestions, q]);
  };

  const removeQuestion = (qId) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== qId));
  };

  const saveExamQuestions = async () => {
    setIsSaving(true);
    try {
      // Delete existing
      await supabase.from('exam_questions').delete().eq('exam_id', examId);
      
      // Bulk Insert
      if (selectedQuestions.length > 0) {
        const payload = selectedQuestions.map((q, index) => ({
          exam_id: examId,
          question_id: q.id,
          sort_order: index
        }));
        const { error } = await supabase.from('exam_questions').insert(payload);
        if (error) throw error;
      }

      // Update exam total score?
      const totalPoints = selectedQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
      await supabase.from('exams').update({ max_score: totalPoints }).eq('id', examId);

      toast.success('تم حفظ بناء الامتحان بنجاح');
      router.push('/admin/exams');
    } catch (err) {
      toast.error('فشل حفظ التغييرات');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-gray-400 animate-pulse">جاري التحميل...</div>;
  if (!exam) return <div className="p-20 text-center font-bold text-red-400">الامتحان غير موجود</div>;

  const currentTotal = selectedQuestions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8" dir="rtl">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-indigo-50 flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-6">
            <Link href="/admin/exams" className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-gray-800 hover:text-white transition-all">
               <FaChevronLeft className="rotate-180" />
            </Link>
            <div>
               <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                  <FaTools className="text-pink-500" /> بناء أسئلة: {exam.title}
               </h1>
               <div className="flex flex-wrap gap-2 mt-2">
                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black">{exam.courses?.name}</span>
                  <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-lg text-[10px] font-black">إجمالي النقاط: {currentTotal}</span>
               </div>
            </div>
         </div>

         <button 
           onClick={saveExamQuestions}
           disabled={isSaving}
           className="px-10 h-16 bg-indigo-600 text-white rounded-[2rem] font-black text-lg flex items-center gap-3 shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-gray-200"
         >
            {isSaving ? <FaSpinner className="animate-spin" /> : <><FaSave /> حفظ البناء</>}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Left: Question Bank */}
         <div className="space-y-6">
            <h2 className="text-xl font-black text-gray-700 flex items-center gap-2 pr-2">
               📥 بنك الأسئلة المتاح
            </h2>
            
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-3 overflow-x-auto">
               <div className="relative flex-1">
                  <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input 
                    type="text" 
                    placeholder="ابحث في البنك..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full h-12 pr-11 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold text-sm outline-none"
                  />
               </div>
               <select 
                 value={filterDifficulty}
                 onChange={e => setFilterDifficulty(e.target.value)}
                 className="h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold text-sm outline-none"
               >
                  <option value="">كل الصعوبة</option>
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
               </select>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
               {filteredBank.length === 0 ? (
                 <div className="p-10 text-center font-bold text-gray-400 bg-gray-50 rounded-3xl italic">لا توجد أسئلة أخرى مطابقة</div>
               ) : (
                 filteredBank.map(q => (
                   <div key={q.id} className="bg-white p-5 rounded-[2rem] border-2 border-transparent hover:border-indigo-500 transition-all shadow-sm group">
                      <div className="flex justify-between items-start gap-4">
                         <div className="space-y-2">
                            <div className="flex gap-2">
                               <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                 q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                 q.difficulty === 'medium' ? 'bg-blue-100 text-blue-700' :
                                 'bg-red-100 text-red-700'
                               }`}>{q.difficulty}</span>
                               <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{q.points} pt</span>
                            </div>
                            <p className="font-bold text-gray-800 text-sm leading-relaxed">{q.question_text}</p>
                         </div>
                         <button 
                           onClick={() => addQuestion(q)}
                           className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-md active:scale-95"
                         >
                            <FaPlus />
                         </button>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </div>

         {/* Right: Selected Questions */}
         <div className="space-y-6">
            <h2 className="text-xl font-black text-pink-700 flex items-center gap-2 pr-2">
               📝 أسئلة الامتحان المختارة ({selectedQuestions.length})
            </h2>

            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
               {selectedQuestions.length === 0 ? (
                 <div className="p-20 text-center border-4 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-gray-300">
                    <FaTools size={60} className="opacity-10" />
                    <p className="font-black text-gray-400">لم تختر أي أسئلة بعد</p>
                    <p className="text-sm font-bold">اضغط على (+) من جهة البنك لإضافة الأسئلة</p>
                 </div>
               ) : (
                 selectedQuestions.map((q, idx) => (
                   <div key={q.id} className="bg-gradient-to-r from-white to-pink-50/30 p-5 rounded-[2rem] border-2 border-pink-100 shadow-lg relative group overflow-hidden animate-in slide-in-from-right duration-300">
                      <div className="flex justify-between items-start gap-4 relative z-10">
                         <div className="space-y-2">
                            <div className="flex items-center gap-2">
                               <span className="w-8 h-8 bg-pink-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-lg">{idx + 1}</span>
                               <span className="text-[10px] font-black text-pink-400 tracking-widest">{q.points} PTS</span>
                            </div>
                            <p className="font-black text-gray-800 leading-relaxed">{q.question_text}</p>
                         </div>
                         <button 
                           onClick={() => removeQuestion(q.id)}
                           className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                         >
                            <FaTrash />
                         </button>
                      </div>
                      <div className="absolute top-0 right-0 w-16 h-16 bg-pink-200/20 rounded-bl-full -z-0"></div>
                   </div>
                 ))
               )}
            </div>
         </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

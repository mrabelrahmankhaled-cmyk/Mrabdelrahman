'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../../../lib/supabase-browser';
import { 
  FaClock, FaChevronLeft, FaChevronRight, FaCheckCircle, FaExclamationTriangle, 
  FaSpinner, FaLock, FaTrophy, FaTimes, FaQuestionCircle, FaArrowRight
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TakeExamPage() {
  const { studentId, centerId } = useAuth();
  const { id: examId } = useParams();
  const router = useRouter();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [violations, setViolations] = useState(0); // 🛡️ Anti-cheat violations count

  const timerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!studentId || !examId) return;
    setLoading(true);
    try {
      // 1. Fetch Exam Details
      const { data: examData, error: eError } = await supabase
        .from('exams')
        .select('*, courses(name)')
        .eq('id', examId)
        .single();
      if (eError) throw eError;
      if (!examData.is_published) throw new Error('هذا الامتحان غير متاح حالياً');
      setExam(examData);
      setTimeLeft(examData.duration_minutes * 60);

      // 2. Check Attempts
      const { count, error: countError } = await supabase
        .from('exam_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', examId)
        .eq('student_id', studentId);
      
      setAttemptsCount(count || 0);
      if (count >= examData.max_attempts) {
         // If already attempted, fetch the best result
         const { data: results } = await supabase
           .from('exam_submissions')
           .select('*')
           .eq('exam_id', examId)
           .eq('student_id', studentId)
           .order('score', { ascending: false })
           .limit(1);
         if (results?.length > 0) {
            setResult(results[0]);
         }
      }

      // 3. Fetch Questions
      const { data: questionsRes, error: qError } = await supabase
        .from('exam_questions')
        .select('*, question_bank(*)')
        .eq('exam_id', examId)
        .order('sort_order', { ascending: true });
      if (qError) throw qError;
      
      let finalQuestions = questionsRes.map(r => r.question_bank);
      if (examData.shuffle_questions) {
        finalQuestions = [...finalQuestions].sort(() => Math.random() - 0.5);
      }
      setQuestions(finalQuestions);

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'فشل تحميل الامتحان');
    } finally {
      setLoading(false);
    }
  }, [studentId, examId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startExam = () => {
    if (attemptsCount >= exam.max_attempts) return;
    setExamStarted(true);
    // Timer starts
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          autoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // 🛡️ Anti-Cheat Logic
  useEffect(() => {
    if (!examStarted) return;

    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+C, Ctrl+V
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || 
        (e.ctrlKey && e.keyCode === 85) ||
        (e.ctrlKey && e.keyCode === 67) ||
        (e.ctrlKey && e.keyCode === 86)
      ) {
        e.preventDefault();
        toast.error('عفواً، تم تعطيل هذه الخاصية ضمن إجراءات حماية الامتحان 🛡️');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            toast.error('تم رصد محاولات غش متكررة! سيتم سحب الامتحان الآن.');
            setTimeout(() => autoSubmit(), 1500);
          } else {
            toast.error(`تحذير: ممنوع الخروج من صفحة الامتحان! (تحذير ${newCount}/3)`);
          }
          return newCount;
        });
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [examStarted]);

  const handleAnswer = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const submitExam = async () => {
    if (isSubmitting) return;
    
    const unAnsweredCount = questions.length - Object.keys(answers).length;
    if (unAnsweredCount > 0) {
      if (!confirm(`تحذير: لديك ${unAnsweredCount} سؤال بدون إجابة. هل تريد التسليم بالتأكيد؟`)) return;
    }

    clearInterval(timerRef.current);
    setIsSubmitting(true);
    
    try {
      // Calculate Score
      let score = 0;
      let totalPoints = 0;
      questions.forEach(q => {
        totalPoints += (q.points || 1);
        if (answers[q.id] === q.correct_answer) {
          score += (q.points || 1);
        }
      });

      const { data, error } = await supabase
        .from('exam_submissions')
        .insert([{
          exam_id: examId,
          student_id: studentId,
          score,
          total_points: totalPoints,
          answers,
          completed_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // 🔄 Sync with shared exam_results table for reports/badges
      await supabase.from('exam_results').upsert({
        exam_id: examId,
        student_id: studentId,
        score: score,
        status: 'present',
        teacher_comment: 'تم التصحيح تلقائياً (اختبار إلكتروني)'
      }, { onConflict: 'exam_id, student_id' });
      setResult(data);
      toast.success('تم تسليم الامتحان بنجاح! 🎉');
    } catch (err) {
      console.error(err);
      toast.error('فشل تسليم الامتحان');
    } finally {
      setIsSubmitting(false);
    }
  };

  const autoSubmit = () => {
    toast.error('انتهى الوقت! يتم التسليم الآن...');
    submitExam();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="p-20 text-center font-bold text-gray-400 animate-pulse">جاري تحضير الامتحان...</div>;

  // View Result
  if (result) {
    const percent = Math.round((result.score / result.total_points) * 100);
    const isPass = percent >= (exam.pass_percentage || 50);

    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center" dir="rtl">
        <Toaster />
        <div className="bg-white p-10 md:p-16 rounded-[4rem] shadow-4xl max-w-2xl w-full border-4 border-white relative overflow-hidden">
           <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 text-6xl shadow-inner ${isPass ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
              {isPass ? <FaTrophy /> : <FaTimes />}
           </div>
           
           <h1 className="text-3xl font-black text-slate-800 mb-2">{isPass ? 'مبروك يا بطل! 👏' : 'حظ أوفر المرة القادمة! 💪'}</h1>
           <p className="text-slate-400 font-bold mb-8">نتيجة امتحان: {exam.title}</p>

           <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                 <div className="text-xs font-black text-slate-400 uppercase mb-2">درجتك</div>
                 <div className="text-4xl font-black text-indigo-600">{result.score} <span className="text-sm">/ {result.total_points}</span></div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                 <div className="text-xs font-black text-slate-400 uppercase mb-2">النسبة</div>
                 <div className={`text-4xl font-black ${isPass ? 'text-emerald-500' : 'text-red-500'}`}>{percent}%</div>
              </div>
           </div>

           <Link href="/portal/dashboard" className="inline-flex items-center gap-3 bg-slate-800 text-white px-10 py-5 rounded-3xl font-black hover:bg-slate-900 transition-all shadow-xl">
              <FaArrowRight className="rotate-180" /> العودة للرئيسية
           </Link>
           
           <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-50 rounded-full -z-0"></div>
        </div>
      </div>
    );
  }

  // Pre-start screen
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center" dir="rtl">
        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl max-w-xl w-full border border-indigo-50">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-100">
                 <FaLock />
              </div>
              <div>
                 <h1 className="text-2xl font-black text-slate-800 leading-tight">{exam.title}</h1>
                 <p className="text-indigo-500 font-bold text-sm">مادة: {exam.courses?.name}</p>
              </div>
           </div>

           <div className="space-y-4 mb-10">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <span className="text-slate-500 font-bold flex items-center gap-2"><FaClock className="text-indigo-400" /> وقت الامتحان:</span>
                 <span className="font-black text-slate-800">{exam.duration_minutes} دقيقة</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <span className="text-slate-500 font-bold flex items-center gap-2"><FaQuestionCircle className="text-indigo-400" /> عدد الأسئلة:</span>
                 <span className="font-black text-slate-800">{questions.length} سؤال</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <span className="text-slate-500 font-bold flex items-center gap-2"><FaCheckCircle className="text-indigo-400" /> درجة النجاح:</span>
                 <span className="font-black text-emerald-600">{exam.pass_percentage}%</span>
              </div>
           </div>

           <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-100 mb-8">
              <p className="text-amber-800 text-sm font-bold flex items-center gap-2">
                 <FaExclamationTriangle className="shrink-0" />
                 تنبيه: بدأ الامتحان يعني استهلاك محاولة من محاولاتك. لا تغلق الصفحة أثناء الحل.
              </p>
           </div>

           <button 
             onClick={startExam}
             className="w-full bg-indigo-600 text-white h-16 rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
           >
              ابدأ الامتحان الآن 🚀
           </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  // Active Exam screen
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none" dir="rtl">
      <Toaster />
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100 p-4 md:px-8 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black">
               {currentIndex + 1}
            </div>
            <div className="hidden md:block">
               <h3 className="font-black text-slate-800 text-sm">{exam.title}</h3>
               <p className="text-[10px] font-bold text-slate-400">سؤال {currentIndex + 1} من إجمالي {questions.length}</p>
            </div>
         </div>

         <div className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl">
            <FaClock className={`${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
            <span className="font-black text-lg tracking-widest font-mono">{formatTime(timeLeft)}</span>
         </div>

         <button 
           onClick={submitExam}
           disabled={isSubmitting}
           className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 disabled:bg-slate-300"
         >
            {isSubmitting ? <FaSpinner className="animate-spin" /> : 'إنهاء وتسليم'}
         </button>
      </div>

      <div className="w-full h-1 bg-slate-200">
         <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <main className="flex-1 p-6 md:p-12 flex items-center justify-center">
         <div className="max-w-3xl w-full">
            <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-3xl border border-indigo-50/50 relative overflow-hidden">
               <div className="flex items-center gap-2 mb-6">
                  <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">المستوى: {currentQuestion.difficulty}</span>
                  <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">الدرجة: {currentQuestion.points}</span>
               </div>

               <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-10 leading-relaxed text-right">
                  {currentQuestion.question_text}
               </h2>

               <div className="grid grid-cols-1 gap-4">
                  {currentQuestion.options?.map((option, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleAnswer(currentQuestion.id, option)}
                      className={`group flex items-center gap-4 p-5 rounded-[2rem] border-4 transition-all text-right ${
                        answers[currentQuestion.id] === option 
                        ? 'bg-indigo-600 border-indigo-100 text-white shadow-2xl shadow-indigo-200 scale-[1.02]' 
                        : 'bg-slate-50 border-transparent hover:border-indigo-100 text-slate-700'
                      }`}
                    >
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black transition-all ${
                         answers[currentQuestion.id] === option ? 'bg-white text-indigo-600' : 'bg-white text-slate-400 group-hover:text-indigo-600'
                       }`}>
                          {String.fromCharCode(65 + idx)}
                       </div>
                       <span className="font-bold flex-1 text-sm md:text-base">{option}</span>
                    </button>
                  ))}
               </div>
               
               <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-50/50 rounded-br-full -z-0"></div>
            </div>

            <div className="mt-8 flex justify-between items-center gap-4">
               <button 
                 disabled={currentIndex === 0}
                 onClick={() => setCurrentIndex(prev => prev - 1)}
                 className="flex-1 h-14 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center gap-3 font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
               >
                  <FaChevronLeft className="rotate-180" /> السابق
               </button>
               <button 
                 disabled={currentIndex === questions.length - 1}
                 onClick={() => setCurrentIndex(prev => prev + 1)}
                 className="flex-1 h-14 bg-slate-900 border-2 border-slate-900 rounded-2xl flex items-center justify-center gap-3 font-black text-white hover:bg-black disabled:opacity-30 transition-all"
               >
                  التالي <FaChevronRight className="rotate-180" />
               </button>
            </div>
         </div>
      </main>

      <footer className="p-6 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
         Smart Center Exam Protocol — Secure Session
      </footer>
    </div>
  );
}

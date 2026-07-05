'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { 
  FaClock, FaCheckCircle, FaChevronLeft, FaChevronRight, 
  FaSpinner, FaArrowRight, FaTrophy, FaExclamationTriangle, FaSave, FaPowerOff
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function StudentExamPage() {
  const { id: examId } = useParams();
  const router = useRouter();
  const { user, centerId } = useAuth();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: answer_text }
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [results, setResults] = useState(null);

  const timerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!user || !examId) return;
    setLoading(true);
    try {
      // 1. Fetch Exam Details
      const { data: examData, error: eError } = await supabaseBrowser
        .from('exams')
        .select('*, courses(name)')
        .eq('id', examId)
        .single();
      if (eError) throw eError;
      setExam(examData);

      // 2. Fetch existing submissions (any status)
      const { data: existingSubs, error: subError } = await supabaseBrowser
        .from('student_exam_submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .order('attempt_number', { ascending: false });
      
      if (subError) throw subError;

      const latestSub = existingSubs?.[0];
      
      if (latestSub && latestSub.status === 'completed') {
        setResults(latestSub);
        setIsFinished(true);
        setLoading(false);
        return;
      }

      // 3. Fetch Questions
      const { data: questionsData, error: qError } = await supabaseBrowser
        .from('exam_questions')
        .select('*, question_bank(*)')
        .eq('exam_id', examId)
        .order('sort_order', { ascending: true });
      if (qError) throw qError;
      
      if (!questionsData || questionsData.length === 0) {
        setQuestions([]);
        setLoading(false);
        return; // Gracefully stop initialization if there are no questions
      }

      let finalQuestions = questionsData.map(q => q.question_bank);
      if (examData.shuffle_questions) {
          finalQuestions = [...finalQuestions].sort(() => Math.random() - 0.5);
      }
      setQuestions(finalQuestions);

      // 4. Create or Resume Submission
      let sub;
      if (latestSub && latestSub.status === 'ongoing') {
        sub = latestSub;
      } else {
        // Create new attempt
        const nextAttempt = (latestSub?.attempt_number || 0) + 1;
        
        // Check if exceeds max attempts
        if (examData.max_attempts && nextAttempt > examData.max_attempts) {
           throw new Error('لقد استنفدت جميع المحاولات المتاحة لهذا الامتحان');
        }

        const { data: newSub, error: createError } = await supabaseBrowser
          .from('student_exam_submissions')
          .insert({
             exam_id: examId,
             student_id: user.id,
             center_id: centerId,
             status: 'ongoing',
             attempt_number: nextAttempt,
             started_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) throw createError;
        sub = newSub;
      }
      
      setSubmissionId(sub.id);

      // 5. Timer Logic
      if (examData.duration_minutes) {
         const startTime = new Date(sub.started_at);
         const endTime = new Date(startTime.getTime() + examData.duration_minutes * 60000);
         const remaining = Math.max(0, Math.floor((endTime - new Date()) / 1000));
         setTimeLeft(remaining);
      }

    } catch (err) {
      console.error("Exam Fetch Error:", err);
      toast.error(err.message || 'فشل تحميل الامتحان');
    } finally {
      setLoading(false);
    }
  }, [user, examId, centerId, router]);

  useEffect(() => {
    if (user && examId) fetchData();
  }, [fetchData]);

  // Timer Countdown
  useEffect(() => {
    if (timeLeft === null || isFinished) return;
    
    if (timeLeft <= 0) {
      handleSubmit(true); // Auto-submit on timeout
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft, isFinished]);

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async (isTimeout = false) => {
    if (isSubmitting || isFinished) return;
    if (!isTimeout && !confirm('⚠️ هل أنت متأكد من إنهاء الامتحان وتسليم الإجابات؟')) return;

    setIsSubmitting(true);
    try {
      // Calculate Score
      let totalScore = 0;
      const answerPayload = questions.map(q => {
        const studentAnswer = answers[q.id] || '';
        const isCorrect = studentAnswer === q.correct_answer;
        const points = isCorrect ? q.points : 0;
        totalScore += points;
        return {
          submission_id: submissionId,
          question_id: q.id,
          student_id: user.id,
          answer_text: studentAnswer,
          is_correct: isCorrect,
          points_earned: points
        };
      });

      // 1. Insert Answers
      await supabaseBrowser.from('student_exam_answers').insert(answerPayload);

      // 2. Update Submission
      const isPassed = (totalScore / (exam.max_score || 1)) * 100 >= (exam.pass_percentage || 50);
      
      const { data: finalSub, error } = await supabaseBrowser
        .from('student_exam_submissions')
        .update({
          finished_at: new Date().toISOString(),
          score: totalScore,
          is_passed: isPassed,
          status: isTimeout ? 'timed_out' : 'completed'
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (error) throw error;

      // 3. Optional: Sync with general exam_results for the grading system
      await supabaseBrowser.from('exam_results').upsert({
          exam_id: examId,
          student_id: user.id,
          score: totalScore,
          status: 'present',
          teacher_comment: isTimeout ? 'سلم تلقائياً لانتهاء الوقت' : 'تم الحل أونلاين'
      }, { onConflict: 'exam_id, student_id' });

      setResults(finalSub);
      setIsFinished(true);
      if (isTimeout) toast.error('انتهى الوقت! تم حفظ إجاباتك تلقائياً');
      else toast.success('تم تسليم الامتحان بنجاح');

    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
     <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4">
           <FaSpinner className="animate-spin text-blue-500 text-4xl mx-auto" />
           <p className="font-black text-slate-400 text-sm tracking-widest uppercase">Initializing Digital Exam Environment...</p>
        </div>
     </div>
  );

  if (isFinished) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6" dir="rtl">
       <motion.div 
         initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
         className="w-full max-w-2xl bg-white/[0.03] border border-white/10 rounded-[4rem] p-12 text-center relative overflow-hidden"
       >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] pointer-events-none"></div>
          
          <div className="relative z-10 space-y-8">
             <div className={`w-24 h-24 mx-auto rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl ${results?.is_passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {results?.is_passed ? <FaTrophy /> : <FaExclamationTriangle />}
             </div>
             
             <div>
                <h1 className="text-4xl font-black text-white mb-2">تم إنهاء الامتحان 🏁</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{exam.title}</p>
             </div>

             <div className="grid grid-cols-2 gap-4 bg-white/5 p-8 rounded-3xl border border-white/5">
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">النتيجة النهائية</p>
                   <p className="text-3xl font-black text-white">{results?.score} <span className="text-sm text-slate-500">/ {exam.max_score}</span></p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">الحالة</p>
                   <p className={`text-xl font-black ${results?.is_passed ? 'text-emerald-400' : 'text-red-400'}`}>
                      {results?.is_passed ? 'ناجح ✔️' : 'لم يجتز ❌'}
                   </p>
                </div>
             </div>

             <button 
               onClick={() => router.back()}
               className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3"
             >
                <FaArrowRight className="rotate-180" /> العودة للدروس
             </button>
          </div>
       </motion.div>
    </div>
  );

  if (!loading && questions.length === 0) return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4" dir="rtl">
       <div className="bg-white p-12 rounded-2xl shadow-md text-center max-w-md w-full border border-gray-100">
          <div className="bg-[#2A9D8F]/10 p-5 rounded-full mb-6 mx-auto w-fit">
              <FaExclamationTriangle className="text-[#2A9D8F]" size={40} />
          </div>
          <h3 className="text-[#264653] font-bold text-2xl mb-2">عفواً، الامتحان غير جاهز</h3>
          <p className="text-slate-500 mt-2 font-medium leading-relaxed">لم يتم إضافة أسئلة لهذا الامتحان بعد. يرجى مراجعة الإدارة.</p>
          <button 
            onClick={() => router.back()}
            className="w-full bg-[#2A9D8F] text-white hover:bg-teal-600 rounded-xl px-6 py-4 mt-8 font-bold transition-all"
          >
             العودة للمنصة
          </button>
       </div>
    </div>
  );

  const currentQ = questions[currentQuestionIdx] || {};
  const progressPercent = questions.length > 0 ? ((currentQuestionIdx + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-cairo pb-24" dir="rtl">
       <Toaster position="top-center" />

       {/* Header */}
       <header className="sticky top-0 z-40 bg-white w-full border-b border-gray-100 px-4 py-3 shadow-sm">
          <div className="flex justify-between items-center mb-2">
             <h2 className="text-[#264653] font-bold text-lg">السؤال {currentQuestionIdx + 1} من {questions.length}</h2>
             <div className="flex items-center gap-2 text-[#2A9D8F] font-bold">
                <FaClock className={timeLeft < 60 ? 'animate-pulse text-red-500' : ''} />
                <span className={`tabular-nums ${timeLeft < 60 ? 'text-red-500' : ''}`}>
                   {timeLeft ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                </span>
             </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }}
               className="h-full bg-[#2A9D8F] transition-all duration-300" 
             />
          </div>
       </header>

       <main className="max-w-4xl mx-auto py-8 px-4 md:px-6">
          <AnimatePresence mode="wait">
             <motion.div 
               key={currentQuestionIdx}
               initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
               className="space-y-6"
             >
                {/* Question Info */}
                <h1 className="text-xl font-bold text-[#264653] leading-relaxed mb-6">
                   {currentQ.question_text}
                </h1>

                {/* Options */}
                <div className="grid grid-cols-1">
                   {currentQ.options?.map((opt, idx) => {
                      const isSelected = answers[currentQ.id] === opt;
                      return (
                         <button 
                           key={idx}
                           onClick={() => handleAnswerSelect(currentQ.id, opt)}
                           className={`w-full text-right p-4 mb-3 rounded-xl border-2 transition-colors flex items-center gap-3
                              ${isSelected 
                                 ? 'border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#264653] font-bold' 
                                 : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium'}
                           `}
                         >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#2A9D8F] bg-[#2A9D8F]' : 'border-gray-300'}`}>
                               {isSelected && <FaCheckCircle className="text-white w-4 h-4" />}
                            </div>
                            <span className="flex-1 leading-relaxed">
                               {opt}
                            </span>
                         </button>
                      );
                   })}
                </div>
             </motion.div>
          </AnimatePresence>
       </main>

       {/* Footer Navigation */}
       <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-safe flex justify-between gap-4 z-50">
          <button 
             disabled={currentQuestionIdx === 0}
             onClick={() => setCurrentQuestionIdx(p => p - 1)}
             className="border-2 border-gray-300 text-gray-600 rounded-xl py-3 px-6 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-2 transition-all shrink-0"
          >
             <FaChevronRight size={12} /> السابق
          </button>

          {currentQuestionIdx === questions.length - 1 ? (
             <button 
               onClick={() => handleSubmit(false)}
               className="bg-[#264653] hover:bg-[#1E3A45] text-white rounded-xl py-3 flex-grow font-bold flex items-center justify-center gap-2 transition-all shadow-md"
             >
                إنهاء الامتحان <FaCheckCircle />
             </button>
          ) : (
            <button 
              onClick={() => setCurrentQuestionIdx(p => p + 1)}
              className="bg-[#2A9D8F] hover:bg-teal-600 text-white rounded-xl py-3 flex-grow font-bold flex items-center justify-center gap-2 transition-all shadow-md"
            >
               التالي <FaChevronLeft size={12} />
            </button>
          )}
       </footer>

       <style jsx>{`
         .custom-scrollbar::-webkit-scrollbar { width: 5px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
       `}</style>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { 
  FaTrophy, FaUserCheck, FaChartLine, FaArrowLeft, FaCalendarAlt,
  FaSignOutAlt, FaBook, FaCheckCircle, FaExclamationCircle, FaStar
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function ParentDashboard() {
  const [parentData, setParentData] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem('parent_student_data');
    if (!data) {
      router.push('/parent/pin-login');
      return;
    }
    const parsed = JSON.parse(data);
    setParentData(parsed);
    fetchData(parsed.studentId);
  }, []);

  const fetchData = async (studentId) => {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams (
            title,
            max_score,
            exam_date,
            is_published,
            courses (name)
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const published = data?.filter(r => r.exams?.is_published) || [];
      setExamResults(published);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parent_student_data');
    router.push('/parent/pin-login');
  };

  if (loading || !parentData) return <div className="min-h-screen bg-indigo-900 text-white flex items-center justify-center font-bold animate-pulse">جاري تحميل بيانات الطالب...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20" dir="rtl">
      {/* Premium Parent Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 pt-8 pb-32 px-4 md:px-6 relative overflow-hidden">
         <div className="max-w-6xl mx-auto flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3 md:gap-4">
               <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-2xl">
                  👨‍👩‍👧‍👦
               </div>
               <div>
                  <h1 className="text-white font-black text-lg md:text-xl">بوابة متابعة ولي الأمر</h1>
                  <p className="text-indigo-200 text-[10px] md:text-xs font-bold">مرحبا بك في لوحة تحكم الطالب</p>
               </div>
            </div>
            <button onClick={handleLogout} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-lg border border-white/10">
               <FaSignOutAlt />
            </button>
         </div>

         {/* Hero Card */}
         <div className="max-w-6xl mx-auto mt-12 relative z-10">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl text-white">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div className="space-y-1">
                     <p className="text-indigo-200 text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] mb-1">اسم الطالب المتابع</p>
                     <h2 className="text-3xl md:text-5xl font-black tracking-tight">{parentData.studentName}</h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-yellow-400 text-indigo-950 px-6 py-2 rounded-2xl text-sm md:text-base font-black shadow-xl">
                       كود الطالب: {parentData.studentCode}
                    </div>
                  </div>
               </div>
               
               <div className="max-w-2xl">
                 <div className="flex justify-between items-center mb-3">
                   <p className="text-[11px] md:text-xs font-black text-indigo-100 opacity-80 uppercase tracking-widest text-right">مستوى الالتزام الأكاديمي العام</p>
                   <p className="text-lg md:text-xl font-black text-yellow-400">85%</p>
                 </div>
                 <div className="h-3 md:h-4 bg-white/10 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div className="h-full bg-gradient-to-l from-yellow-300 to-yellow-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(250,204,21,0.5)]" style={{ width: '85%' }}></div>
                 </div>
               </div>
            </div>
         </div>
         
         <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/5 rounded-full -mr-48 -mt-48 blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/5 rounded-full -ml-48 -mb-48 blur-[100px] animate-pulse"></div>
      </div>

      {/* Stats Quick Grid */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-12 mb-12 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
         <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[3rem] shadow-xl shadow-indigo-900/5 flex flex-col items-center border border-gray-100 transition-transform hover:-translate-y-1 text-right">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
               <FaStar size={20} />
            </div>
            <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">التقدير العام</p>
            <p className="text-xl md:text-2xl font-black text-indigo-900">جيد جداً</p>
         </div>
         
         <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[3rem] shadow-xl shadow-indigo-900/5 flex flex-col items-center border border-gray-100 transition-transform hover:-translate-y-1 text-right">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-3 shadow-sm">
               <FaCheckCircle size={20} />
            </div>
            <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">الاختبارات</p>
            <p className="text-xl md:text-2xl font-black text-gray-900">{examResults.length}</p>
         </div>

         <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[3rem] shadow-xl shadow-indigo-900/5 flex flex-col items-center border border-gray-100 transition-transform hover:-translate-y-1 text-right">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-3 shadow-sm">
               <FaTrophy size={20} />
            </div>
            <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">أعلى درجة</p>
            <p className="text-xl md:text-2xl font-black text-blue-900">
               {examResults.length > 0 ? Math.max(...examResults.map(r => r.score)) : '---'}
            </p>
         </div>

         <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[3rem] shadow-xl shadow-indigo-900/5 flex flex-col items-center border border-gray-100 transition-transform hover:-translate-y-1 text-right">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-3 shadow-sm">
               <FaUserCheck size={20} />
            </div>
            <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">نسبة الحضور</p>
            <p className="text-xl md:text-2xl font-black text-orange-900">85%</p>
         </div>
      </div>

      {/* Exam Results List */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-8">
         <div className="flex items-center justify-between">
            <h3 className="font-black text-indigo-900 text-xl md:text-2xl flex items-center gap-3">
               <FaChartLine className="text-yellow-500" /> سجل نتائج الاختبارات الدوري
            </h3>
            <div className="hidden md:block h-1 flex-1 mx-6 bg-gray-100 rounded-full"></div>
         </div>

         {examResults.length === 0 ? (
            <div className="bg-white p-16 md:p-24 rounded-[3rem] md:rounded-[4rem] text-center border-4 border-dashed border-gray-100 text-gray-300">
               <FaBook size={80} className="mx-auto mb-6 opacity-10" />
               <p className="text-lg font-black tracking-tight">لا توجد نتائج مسجلة حتى الآن في السجل</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
               {examResults.map((res) => {
                  const percentage = (res.score / res.exams.max_score) * 100;
                  let badgeColor = "bg-gray-100 text-gray-600";
                  let label = "تحتاج تركيز";
                  let icon = "📄";

                  if (percentage >= 90) { badgeColor = "bg-yellow-100 text-yellow-700"; label = "ممتاز 🔥"; icon = "🏆"; }
                  else if (percentage >= 75) { badgeColor = "bg-green-100 text-green-700"; label = "جيد جداً"; icon = "🏅"; }
                  else if (percentage >= 50) { badgeColor = "bg-blue-100 text-blue-700"; label = "جيد"; icon = "📈"; }

                  return (
                     <div key={res.id} className="bg-white p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-gray-200/50 border border-gray-100 group hover:scale-[1.02] transition-all flex flex-col justify-between text-right">
                        <div>
                           <div className="flex justify-between items-start mb-6">
                              <div className="flex gap-4">
                                 <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:bg-indigo-50 transition-colors">
                                    {icon}
                                 </div>
                                 <div className="shrink-0 max-w-[120px]">
                                    <h4 className="font-black text-gray-800 text-lg leading-tight mb-1">{res.exams.title}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{res.exams.courses?.name}</p>
                                 </div>
                              </div>
                              <div className={`px-4 py-2 rounded-xl text-[10px] font-black shrink-0 ${badgeColor} shadow-sm uppercase tracking-tighter`}>
                                 {label}
                              </div>
                           </div>

                           <div className="space-y-4">
                              <div className="flex justify-between items-end">
                                 <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-gray-800 tracking-tighter">{res.score}</span>
                                    <span className="text-sm text-gray-400 font-bold">/ {res.exams.max_score}</span>
                                 </div>
                                 <div className="flex flex-col items-end">
                                    <span className="text-2xl font-black text-indigo-600 tracking-tight">{Math.round(percentage)}%</span>
                                    <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">{res.exams.exam_date}</p>
                                 </div>
                              </div>
                              <div className="h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-100 shadow-inner">
                                 <div className={`h-full rounded-full transition-all duration-1000 ${percentage >= 50 ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]' : 'bg-red-500'}`} style={{ width: `${percentage}%` }}></div>
                              </div>
                           </div>
                        </div>

                        {res.teacher_comment && (
                           <div className="mt-8 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 text-[11px] md:text-xs text-indigo-800 leading-relaxed font-bold relative overflow-hidden group-hover:bg-indigo-50">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-600/5 rounded-full translate-x-8 -translate-y-8"></div>
                              <span className="text-lg relative z-10 block mb-1">💬 تعليق المدرس:</span>
                              <span className="relative z-10 opacity-90">{res.teacher_comment}</span>
                           </div>
                        )}
                     </div>
                  );
               })
            }
            </div>
         )}
      </div>

      {/* Footer Support */}
      <div className="max-w-6xl mx-auto px-6 mt-20 text-center border-t border-gray-100 pt-10">
         <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-black text-indigo-900 border-2 border-indigo-50 px-6 py-2 rounded-full inline-block"> {parentData.studentName} الأكاديمي • Classora</p>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">نظام الإدارة التعليمية المتكامل • {new Date().getFullYear()}</p>
         </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { FaUserFriends, FaLock, FaSignInAlt, FaExclamationCircle, FaKey } from 'react-icons/fa';

export default function ParentLogin() {
  const [studentId, setStudentId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 🔍 Search for student with matching ID and PIN code
      const { data, error: authError } = await supabase
        .from('students')
        .select('*')
        .eq('unique_id', studentId.trim().toUpperCase())
        .eq('access_code', accessCode.trim())
        .single();

      if (authError || !data) {
        throw new Error('بيانات الدخول غير صحيحة، تأكد من كود الطالب والرمز السري');
      }

      // ✅ Login successful - store student data and redirect
      localStorage.setItem('parent_student_data', JSON.stringify({
        studentId: data.id,
        studentName: data.name,
        studentCode: data.unique_id,
        centerId: data.center_id
      }));

      // Redirect to parent dashboard
      router.push('/parent/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl">
      {/* Luxury Parent Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900">
        {/* Animated Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 border-2 border-yellow-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 border-2 border-yellow-400/15 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-32 left-40 w-40 h-40 border-2 border-yellow-400/10 rounded-lg animate-bounce-slow"></div>
        <div className="absolute top-60 left-1/2 w-28 h-28 border-2 border-yellow-400/25 rotate-12 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-36 h-36 border-2 border-yellow-400/20 rounded-full animate-spin-slow"></div>
        
        {/* Parent/Family Symbols */}
        <div className="absolute top-32 left-1/3 text-yellow-400/10 text-6xl font-bold animate-pulse">👨‍👩‍👧‍👦</div>
        <div className="absolute top-1/2 right-1/3 text-yellow-400/10 text-6xl font-bold animate-pulse">🏠</div>
        <div className="absolute bottom-40 left-1/2 text-yellow-400/10 text-6xl font-bold animate-pulse">🎓</div>
        <div className="absolute top-1/4 right-1/4 text-yellow-400/10 text-5xl font-bold animate-pulse">📚</div>
        <div className="absolute bottom-1/4 left-1/4 text-yellow-400/10 text-5xl font-bold animate-pulse">⭐</div>
        <div className="absolute top-3/4 right-1/3 text-yellow-400/10 text-5xl font-bold animate-pulse">🔑</div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-6">
        <div className="max-w-md w-full transition-all duration-500 hover:scale-[1.01]">
          {/* Glass Card */}
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent"></div>
            
            <div className="text-center mb-10 md:mb-12">
              {/* Clean Elegant Logo */}
              <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-8">
                <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-500 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-yellow-400/30 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500">
                  <FaUserFriends className="text-white text-4xl md:text-5xl drop-shadow-lg" />
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent mb-3 tracking-tighter" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                بوابة ولي الأمر
              </h1>
              <div className="flex flex-col gap-1 items-center">
                <p className="text-yellow-100/90 font-bold text-base md:text-lg text-right">تابع رحلة أبنائك التعليمية</p>
                <div className="h-0.5 w-12 bg-yellow-400/30 rounded-full"></div>
                <p className="text-cyan-100/60 text-[10px] md:text-xs font-medium mt-2 tracking-wide uppercase">تحقق من النتائج والالتزام في لحظات</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
              {error && (
                <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-200 p-4 rounded-2xl flex items-center gap-3 shadow-xl animate-shake">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <FaExclamationCircle className="text-red-400" />
                  </div>
                  <span className="text-xs md:text-sm font-bold">{error}</span>
                </div>
              )}

              <div className="space-y-3 text-right">
                <label className="block text-xs md:text-sm font-black text-yellow-400/90 mr-1 flex items-center gap-2 uppercase tracking-widest justify-start">
                  <span>🎓</span> كود الطالب (ID)
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-yellow-400/5 rounded-2xl blur-lg transition-all group-focus-within:bg-yellow-400/10"></div>
                  <input 
                    type="text" 
                    placeholder="S-1234 مثال" 
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="relative w-full p-4 md:p-5 pr-14 bg-white/5 backdrop-blur-md border-2 border-white/10 focus:border-yellow-400/50 rounded-2xl outline-none transition-all font-black text-lg md:text-xl text-white placeholder-white/20 shadow-xl text-right"
                    required
                  />
                  <FaUserFriends className="absolute top-1/2 -translate-y-1/2 right-5 text-yellow-400/40 text-xl" />
                </div>
              </div>

              <div className="space-y-3 text-right">
                <label className="block text-xs md:text-sm font-black text-yellow-400/90 mr-1 flex items-center gap-2 uppercase tracking-widest justify-start">
                  <span>🔑</span> الرمز السري (PIN)
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-yellow-400/5 rounded-2xl blur-lg transition-all group-focus-within:bg-yellow-400/10"></div>
                  <input 
                    type="password" 
                    placeholder="••••" 
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="relative w-full p-4 md:p-5 pr-14 bg-white/5 backdrop-blur-md border-2 border-white/10 focus:border-yellow-400/50 rounded-2xl outline-none transition-all font-black text-lg md:text-xl text-white placeholder-white/20 shadow-xl tracking-[0.5em] text-right"
                    required
                    maxLength={4}
                  />
                  <FaKey className="absolute top-1/2 -translate-y-1/2 right-5 text-yellow-400/40 text-xl" />
                </div>
              </div>

              <button 
                disabled={loading}
                className="relative w-full group overflow-hidden bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-indigo-950 p-4 md:p-5 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl shadow-[0_20px_40px_-10px_rgba(245,158,11,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(245,158,11,0.6)] transition-all hover:-translate-y-1 active:scale-[98%] disabled:opacity-50 disabled:grayscale"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]"></div>
                <div className="relative flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-4 border-indigo-950/30 border-t-indigo-950 rounded-full animate-spin"></div>
                      <span>جاري التحقق...</span>
                    </>
                  ) : (
                    <>
                      <span>دخول للبوابة الآمنة</span>
                      <FaSignInAlt className="text-xl md:text-2xl" />
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Support Section */}
            <div className="mt-10 md:mt-12 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 opacity-40">
                <div className="h-px w-8 bg-white"></div>
                <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">تواصل مع الدعم الفني</p>
                <div className="h-px w-8 bg-white"></div>
              </div>
              <p className="text-cyan-100/40 text-[10px] md:text-[11px] font-medium leading-relaxed">
                في حالة فقدان كود الطالب أو الرمز السري<br/>يرجى مراجعة <span className="text-yellow-400 font-black">قسم شئون الطلاب</span> بالمركز
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Styles */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

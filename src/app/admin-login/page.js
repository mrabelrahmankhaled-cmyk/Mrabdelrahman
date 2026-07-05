'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdminAction } from '../auth-actions'; 
import { FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const formData = new FormData(e.currentTarget);
    
    // استدعاء السيرفر أكشن
    const result = await loginAdminAction(formData);

    if (result?.error) {
      setErrorMsg(result.error);
      setLoading(false);
    } else {
      // ✅ تنظيف الـ LocalStorage القديم عشان لو فيه ID لسنتر قديم ميحصلش تداخل
      localStorage.removeItem("active_center_id"); 
      
      const targetPath = result.role === 'staff' ? '/admin/staff_dashboard' : '/admin/dashboard';
      
      // التوجيه
      window.location.href = targetPath; 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#264653] font-cairo" dir="rtl">
      
      {/* Subtle Chemistry Background (Floating SVGs) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Atom SVG */}
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="absolute top-20 -left-10 w-72 h-72 transform -rotate-12 text-[#2A9D8F]/10"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)"></ellipse>
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)"></ellipse>
        </svg>

        {/* Beaker SVG */}
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="absolute bottom-10 -right-20 w-96 h-96 transform rotate-12 text-white/5"
        >
          <path d="M4.5 3h15"></path>
          <path d="M10 3v4"></path>
          <path d="M14 3v4"></path>
          <path d="M14 7L21 21H3L10 7"></path>
          <path d="M6 16h12"></path>
        </svg>

        {/* Hexagon/Benzene SVG */}
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="absolute top-1/3 right-10 w-48 h-48 opacity-10 text-[#2A9D8F]/20"
        >
          <path d="M12 2L2 7l0 10 10 5 10-5 0-10L12 2z"></path>
        </svg>
      </div>

      {/* Animated Premium Background (Aurora / Glowing Orbs) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 -left-10 w-96 h-96 bg-[#2A9D8F] rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob"></div>
        <div className="absolute bottom-10 -right-10 w-96 h-96 bg-teal-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#21867a] rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-10 relative z-10 border border-gray-100 mx-4 mt-16">
        
        {/* Teacher Image Integration (The Avatar Pop-out) */}
        <div className="relative -mt-28 flex justify-center mb-6">
          {/* REPLACE "/teacher.png" WITH YOUR ACTUAL IMAGE PATH IN THE PUBLIC FOLDER */}
          <img 
            src="/hero-image.png" 
            alt="Admin Avatar" 
            className="w-40 h-40 object-cover rounded-full border-[8px] border-white shadow-xl bg-[#F8F9FA]" 
          />
        </div>
        
        {/* Header & Branding */}
        <div className="text-center mb-8">
          <h1 className="text-[#264653] font-extrabold text-2xl text-center mb-2">
            نظام الإدارة والتحكم
          </h1>
          <p className="text-gray-500 text-sm text-center mb-8">
            منصة الدكتور عبدالرحمن خالد
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[#264653] font-bold text-sm mb-2 block">
              البريد الإلكتروني
            </label>
            <input 
              name="email" type="email" required 
              className="bg-[#F8F9FA] border border-gray-200 rounded-xl px-4 py-3 w-full text-right focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent transition-all text-[#264653]"
              placeholder="admin@example.com"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="text-[#264653] font-bold text-sm mb-2 block">
              كلمة المرور
            </label>
            <div className="relative">
              <input 
                name="password" 
                type={showPassword ? "text" : "password"} required
                className="bg-[#F8F9FA] border border-gray-200 rounded-xl px-4 py-3 w-full text-right focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent transition-all text-[#264653]"
                placeholder="••••••••"
                dir="ltr"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2A9D8F] transition-colors"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <button 
            disabled={loading} 
            className="w-full bg-[#2A9D8F] text-white font-bold rounded-xl py-3 mt-6 hover:bg-teal-600 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {loading ? <FaSpinner className="animate-spin text-white" /> : "دخول لنظام الإدارة"}
          </button>
        </form>
        
      </div>

      {/* Custom Keyframes for the Blob Animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
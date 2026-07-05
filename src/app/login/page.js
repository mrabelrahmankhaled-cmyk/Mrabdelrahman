'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../../lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';

// ─── Icon components (no react-icons dep needed for these) ───
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

// ─── Decorative chemistry molecule SVG ─────────────────────
const MoleculeDecor = ({ className }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 200 200"
    fill="none"
    className={className}
  >
    <circle cx="100" cy="100" r="18" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="40" cy="60" r="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="160" cy="60" r="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="40" cy="140" r="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="160" cy="140" r="12" stroke="currentColor" strokeWidth="1.5" />
    <line x1="82" y1="88" x2="52" y2="68" stroke="currentColor" strokeWidth="1.5" />
    <line x1="118" y1="88" x2="148" y2="68" stroke="currentColor" strokeWidth="1.5" />
    <line x1="82" y1="112" x2="52" y2="132" stroke="currentColor" strokeWidth="1.5" />
    <line x1="118" y1="112" x2="148" y2="132" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// Login Page
// ═══════════════════════════════════════════════════════════════
export default function StudentLoginPage() {
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'device_limit') {
      setError('⚠️ عذراً، لا يمكنك الدخول من هذا الجهاز. مسموح بجهاز واحد فقط مسجل مسبقاً. يرجى التواصل مع سكرتارية السنتر.');
    }
  }, [searchParams]);

  // ──────────────────────────────────────────────────────────
  // Auth logic — UNTOUCHED from original
  // ──────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const input = studentCode.trim();
      let loginPhone = input;
      let isActive = true; // Default to true, we will verify it

      // 1. Identify Input Type (Code vs Phone)
      // If it contains letters (like AK-) or is not purely digits, treat it as a Student Code
      const isCode = /[a-zA-Z]/.test(input) || input.includes('-');

      // 2. Fetch Phone (If Code was entered)
      if (isCode) {
        const { data: students, error: lookupError } = await supabase
          .from('students')
          .select('phone, is_active')
          .eq('unique_id', input)
          .limit(1);

        if (lookupError || !students || students.length === 0) {
          throw new Error('عذراً، كود الطالب غير صحيح أو غير مسجل.');
        }

        loginPhone = students[0].phone;
        isActive = students[0].is_active;
      }

      // 3. Construct Dummy Email & Auth
      const dummyEmail = `${loginPhone.trim()}@student.com`;
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: password
      });

      if (authError || !data?.user) {
        throw new Error('عذراً، بيانات الدخول غير صحيحة.');
      }

      // 4. Status Check & Redirection (If logged in via phone, fetch is_active)
      if (!isCode) {
        const { data: studentData } = await supabase
          .from('students')
          .select('is_active')
          .eq('id', data.user.id)
          .single();

        if (studentData) isActive = studentData.is_active;
      }

      if (!isActive) {
        await supabase.auth.signOut();
        throw new Error('عذراً، حسابك لا يزال قيد المراجعة. يرجى انتظار تفعيل الحساب من الإدارة.');
      }

      // IF EVERYTHING IS SUCCESSFUL
      console.log('✅ Login successful for:', dummyEmail);
      router.push('/portal/dashboard');

    } catch (err) {
      console.error('Login Error:', err);
      setError(err.message || 'حدث خطأ أثناء محاولة الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // UI
  // ──────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="min-h-screen relative overflow-hidden bg-[#264653] flex items-center justify-center p-4"
    >
      {/* ── Background decorations ───────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Teal glow blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#2A9D8F]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#2A9D8F]/8 blur-3xl" />

        {/* Molecule decorations */}
        <MoleculeDecor className="absolute top-8 left-8 w-40 h-40 text-[#F8F9FA]/5" />
        <MoleculeDecor className="absolute bottom-8 right-8 w-48 h-48 text-[#F8F9FA]/5" />

        {/* Floating chemistry emoji hints — very faint */}
        <span className="absolute top-1/4 left-1/4 text-5xl opacity-[0.04] select-none">⚗️</span>
        <span className="absolute top-3/4 right-1/4 text-5xl opacity-[0.04] select-none">🧪</span>
        <span className="absolute top-1/2 left-[10%] text-4xl opacity-[0.04] select-none">⚛️</span>
      </div>

      {/* ── Login card ───────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md">

        {/* Teacher image — overlaps top of card */}
        <div className="flex justify-center mb-0 relative z-20">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#2A9D8F] shadow-xl shadow-[#2A9D8F]/30 bg-white">
            <Image
              src="/hero-image.png"
              alt="د/ عبدالرحمن خالد"
              width={96}
              height={96}
              unoptimized
              className="w-full h-full object-cover object-top"
              priority
            />
          </div>
        </div>

        {/* Card body */}
        <div className="bg-[#F8F9FA] rounded-3xl shadow-2xl shadow-black/30 px-8 pt-6 pb-8 -mt-12">

          {/* Spacer for avatar overlap */}
          <div className="h-8" />

          {/* ── Card header ── */}
          <div className="text-center mb-8">
            <h1 className="text-[#264653] text-2xl font-black leading-snug mb-1">
              منصة الدكتور{' '}
              <span className="text-[#2A9D8F]">عبدالرحمن خالد</span>
            </h1>
            <p className="text-[#264653]/55 text-sm font-medium">
              سجل دخولك دلوقتي وتابع حصصك
            </p>
          </div>

          {/* ── Error alert ── */}
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              <AlertIcon />
              <span className="text-sm font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            {/* Student code field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="student-code"
                className="text-sm font-bold text-[#264653] flex items-center gap-2"
              >
                <span className="w-5 h-5 text-[#2A9D8F]"><UserIcon /></span>
                كود الطالب
              </label>
              <div className="relative">
                <input
                  id="student-code"
                  type="text"
                  placeholder="مثال: AK-100"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  required
                  className="
                    w-full pr-11 pl-4 py-3.5
                    bg-white border-2 border-[#264653]/15 rounded-xl
                    text-[#264653] font-semibold text-base
                    placeholder:text-[#264653]/30
                    focus:outline-none focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/20
                    transition-all duration-200
                  "
                />
                <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#264653]/30">
                  <UserIcon />
                </span>
              </div>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-bold text-[#264653] flex items-center gap-2"
              >
                <span className="w-5 h-5 text-[#2A9D8F]"><LockIcon /></span>
                كلمة السر
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="
                    w-full pr-11 pl-11 py-3.5
                    bg-white border-2 border-[#264653]/15 rounded-xl
                    text-[#264653] font-semibold text-base
                    placeholder:text-[#264653]/30
                    focus:outline-none focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/20
                    transition-all duration-200
                  "
                />
                <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#264653]/30">
                  <LockIcon />
                </span>
                {/* Show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#264653]/40 hover:text-[#2A9D8F] transition-colors text-xs font-bold select-none"
                  aria-label={showPass ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
                >
                  {showPass ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setError('لإعادة تعيين كلمة السر، يرجى التواصل مع سكرتارية السنتر أو المعلم.')}
                className="text-xs text-[#2A9D8F] hover:text-[#264653] font-bold underline-offset-4 hover:underline self-end mt-1 px-1 transition-colors"
              >
                هل نسيت كلمة السر؟
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="
                mt-1 w-full py-4 rounded-xl
                bg-[#2A9D8F] text-[#F8F9FA]
                font-black text-base
                flex items-center justify-center gap-3
                hover:bg-[#238076]
                active:scale-95
                disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                shadow-lg shadow-[#2A9D8F]/30
                transition-all duration-200
              "
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-[#F8F9FA]/30 border-t-[#F8F9FA] rounded-full animate-spin" />
                  جاري الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          {/* ── Card footer ── */}
          <div className="mt-7 pt-6 border-t border-[#264653]/10 flex flex-col items-center gap-3">
            <p className="text-[#264653]/80 text-sm font-semibold text-center">
              ليس لديك حساب؟
            </p>
            <Link
              href="/register"
              className="
                inline-flex items-center gap-2
                text-sm font-bold text-[#2A9D8F]
                hover:text-teal-700
                transition-all duration-200
              "
            >
              <UserIcon />
              إنشاء حساب جديد
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

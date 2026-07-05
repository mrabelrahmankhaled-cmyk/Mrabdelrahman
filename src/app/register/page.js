'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../../lib/supabase-browser';

// ─── Inline SVG icons ────────────────────────────────────────
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);
const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-16 h-16 shrink-0 mx-auto text-[#2A9D8F] mb-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

// ─── Decorative molecule ─────────────────────────────────────
const MoleculeDecor = ({ className }) => (
  <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" className={className}>
    <circle cx="100" cy="100" r="18" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="40"  cy="60"  r="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="160" cy="60"  r="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="40"  cy="140" r="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="160" cy="140" r="12" stroke="currentColor" strokeWidth="1.5" />
    <line x1="82"  y1="88"  x2="52"  y2="68"  stroke="currentColor" strokeWidth="1.5" />
    <line x1="118" y1="88"  x2="148" y2="68"  stroke="currentColor" strokeWidth="1.5" />
    <line x1="82"  y1="112" x2="52"  y2="132" stroke="currentColor" strokeWidth="1.5" />
    <line x1="118" y1="112" x2="148" y2="132" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// ─── Shared input styles ─────────────────────────────────────
const inputCls = `
  w-full px-4 py-3 pr-10
  bg-white border-2 border-[#264653]/15 rounded-xl
  text-[#264653] font-semibold text-sm
  placeholder:text-[#264653]/30 placeholder:font-normal
  focus:outline-none focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/15
  transition-all duration-200
`;

// ─── Field wrapper ───────────────────────────────────────────
function Field({ label, icon: Icon, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#264653]/70 flex items-center gap-1.5">
        <span className="text-[#2A9D8F]"><Icon /></span>
        {label}
      </label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Register Page
// ═══════════════════════════════════════════════════════════════
export default function RegisterPage() {
  const [form, setForm] = useState({
    name:            '',
    phone:           '',
    parent_phone:    '',
    grade:           '',
    password:        '',
    confirmPassword: '',
  });
  
  const [educationalStages, setEducationalStages] = useState([]);
  const [stagesLoading, setStagesLoading]         = useState(true);

  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  
  // Success states
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // ─── Fetch Educational Stages from Supabase ───
  useEffect(() => {
    async function fetchStages() {
      try {
        const { data, error } = await supabase
          .from('educational_stages')
          .select('name');
        
        if (error) throw error;
        setEducationalStages(data || []);
      } catch (err) {
        console.error('Error fetching educational stages:', err);
      } finally {
        setStagesLoading(false);
      }
    }
    fetchStages();
  }, []);

  const setField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Form Validation
    if (!form.name || !form.phone || !form.parent_phone || !form.grade || !form.password || !form.confirmPassword) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('كلمة السر وتأكيدها غير متطابقتين.');
      return;
    }
    if (form.password.length < 6) {
      setError('كلمة السر يجب أن تكون 6 أحرف على الأقل.');
      return;
    }

    setLoading(true);
    try {
      // 2. Supabase Auth (Dummy Email Workaround)
      const dummyEmail = `${form.phone.trim()}@student.com`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dummyEmail,
        password: form.password,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('رقم الموبايل هذا مسجل مسبقاً.');
        }
        throw new Error(authError.message);
      }

      if (!authData?.user?.id) {
        throw new Error('فشل إنشاء الحساب في نظام المصادقة.');
      }

      const userId = authData.user.id;

      // 3. Insert into public.students
      const studentCode = "AK-" + Math.floor(100000 + Math.random() * 900000);

      const { error: insertError } = await supabase
        .from('students')
        .insert([
          {
            id: userId,
            name: form.name,
            phone: form.phone,
            parent_phone: form.parent_phone,
            grade: form.grade,
            unique_id: studentCode,
            is_active: false // CRITICAL: Overriding default so it remains pending
          }
        ]);

      if (insertError) {
        // Rollback auth if insert fails? (Optional but good practice, though complex without backend logic)
        throw new Error('حدث خطأ أثناء حفظ بيانات الطالب. يرجى المحاولة مرة أخرى.');
      }

      // 4. Success State Update
      setGeneratedCode(studentCode); 
      setIsSubmitted(true);

    } catch (err) {
      console.error('Registration Error:', err);
      setError(err.message || 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen relative overflow-hidden bg-[#264653] flex items-center justify-center p-4 py-10"
    >
      {/* ── Background decorations ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#2A9D8F]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#2A9D8F]/8 blur-3xl" />
        <MoleculeDecor className="absolute top-6 left-6 w-36 h-36 text-[#F8F9FA]/5" />
        <MoleculeDecor className="absolute bottom-6 right-6 w-44 h-44 text-[#F8F9FA]/5" />
        <span className="absolute top-1/3 right-[8%] text-5xl opacity-[0.04] select-none">⚗️</span>
        <span className="absolute bottom-1/3 left-[8%] text-5xl opacity-[0.04] select-none">🧪</span>
      </div>

      {/* ── Registration / Success Card ── */}
      <div className="relative z-10 w-full max-w-2xl">

        {/* Avatar — overlaps card */}
        {!isSubmitted && (
          <div className="flex justify-center mb-0 relative z-20">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#2A9D8F] shadow-xl shadow-[#2A9D8F]/30 bg-white">
              <Image
                src="/hero-image.png"
                alt="أ/ عبدالرحمن خالد"
                width={80}
                height={80}
                unoptimized
                priority
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        )}

        {/* Card body */}
        <div className={`bg-[#F8F9FA] rounded-2xl shadow-2xl px-8 pt-8 pb-8 ${!isSubmitted ? '-mt-10' : ''}`}>

          {isSubmitted ? (
            /* ════════ SUCCESS STATE UI ════════ */
            <div className="text-center py-6">
              <CheckCircleIcon />
              <h1 className="text-[#264653] text-3xl font-black mb-4">
                تم تسجيل حسابك بنجاح!
              </h1>
              
              <div className="bg-[#2A9D8F]/10 border border-[#2A9D8F]/20 rounded-xl p-6 my-6 max-w-sm mx-auto">
                <p className="text-[#264653]/70 text-sm font-bold mb-2">كود الطالب الخاص بك:</p>
                <div className="text-3xl font-black text-[#264653] tracking-wider font-mono">
                  {generatedCode}
                </div>
              </div>

              <div className="space-y-3 max-w-md mx-auto mb-8 text-[#264653]">
                <p className="text-sm font-bold text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200">
                  حسابك الآن قيد المراجعة. يرجى انتظار تفعيل الحساب من الإدارة (is_active = true) لتتمكن من تصفح الكورسات.
                </p>
              </div>

              <Link
                href="/login"
                className="
                  inline-flex items-center justify-center
                  px-8 py-3.5 rounded-xl font-bold text-base
                  border-2 border-[#2A9D8F] text-[#2A9D8F]
                  hover:bg-[#2A9D8F] hover:text-[#F8F9FA]
                  transition-all duration-200
                "
              >
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            /* ════════ FORM UI ════════ */
            <>
              {/* Spacer for avatar */}
              <div className="h-2" />

              {/* ── Header ── */}
              <div className="text-center mb-8">
                <h1 className="text-[#264653] text-2xl font-black leading-snug mb-1">
                  إنشاء{' '}
                  <span className="text-[#2A9D8F]">حساب جديد</span>
                </h1>
                <p className="text-[#264653]/50 text-sm font-medium">
                  انضم الآن لطلاب الأستاذ عبدالرحمن خالد
                </p>
              </div>

              {/* ── Alert banners ── */}
              {error && (
                <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
                  <AlertIcon />
                  <span className="text-sm font-semibold leading-relaxed">{error}</span>
                </div>
              )}

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} noValidate>
                {/* 2-column responsive grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

                  {/* Full name — spans full width */}
                  <div className="sm:col-span-2">
                    <Field label="اسم الطالب الرباعي" icon={UserIcon}>
                      <div className="relative">
                        <input
                          id="name"
                          type="text"
                          placeholder="مثال: محمد أحمد عبدالله خالد"
                          value={form.name}
                          onChange={setField('name')}
                          required
                          className={inputCls}
                        />
                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[#264653]/30">
                          <UserIcon />
                        </span>
                      </div>
                    </Field>
                  </div>

                  {/* Student phone */}
                  <Field label="رقم موبايل الطالب" icon={PhoneIcon}>
                    <div className="relative">
                      <input
                        id="phone"
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        value={form.phone}
                        onChange={setField('phone')}
                        required
                        dir="ltr"
                        className={inputCls + ' text-left placeholder:text-right'}
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[#264653]/30">
                        <PhoneIcon />
                      </span>
                    </div>
                  </Field>

                  {/* Parent phone */}
                  <Field label="رقم موبايل ولي الأمر" icon={PhoneIcon}>
                    <div className="relative">
                      <input
                        id="parent_phone"
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        value={form.parent_phone}
                        onChange={setField('parent_phone')}
                        required
                        dir="ltr"
                        className={inputCls + ' text-left placeholder:text-right'}
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[#264653]/30">
                        <PhoneIcon />
                      </span>
                    </div>
                  </Field>

                  {/* Grade select — spans full width */}
                  <div className="sm:col-span-2">
                    <Field label="الصف الدراسي" icon={ChevronIcon}>
                      <div className="relative">
                        <select
                          id="grade"
                          value={form.grade}
                          onChange={setField('grade')}
                          required
                          disabled={stagesLoading}
                          className={inputCls + ' appearance-none cursor-pointer disabled:opacity-50'}
                        >
                          <option value="" disabled>
                            {stagesLoading ? 'جاري التحميل...' : 'اختر الصف الدراسي...'}
                          </option>
                          {educationalStages.map((stage, idx) => (
                            <option key={idx} value={stage.name}>
                              {stage.name}
                            </option>
                          ))}
                        </select>
                        {/* Custom chevron */}
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#264653]/40">
                          <ChevronIcon />
                        </span>
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#264653]/30">
                          <ChevronIcon />
                        </span>
                      </div>
                    </Field>
                  </div>

                  {/* Password */}
                  <Field label="كلمة السر" icon={LockIcon}>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPass ? 'text' : 'password'}
                        placeholder="6 أحرف على الأقل"
                        value={form.password}
                        onChange={setField('password')}
                        required
                        className={inputCls + ' pl-16'}
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[#264653]/30">
                        <LockIcon />
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-[10px] font-bold text-[#264653]/40 hover:text-[#2A9D8F] transition-colors select-none"
                      >
                        {showPass ? 'إخفاء' : 'إظهار'}
                      </button>
                    </div>
                  </Field>

                  {/* Confirm password */}
                  <Field label="تأكيد كلمة السر" icon={LockIcon}>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="أعد كتابة كلمة السر"
                        value={form.confirmPassword}
                        onChange={setField('confirmPassword')}
                        required
                        className={`${inputCls} pl-16 ${
                          form.confirmPassword && form.password !== form.confirmPassword
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                            : form.confirmPassword && form.password === form.confirmPassword
                            ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200'
                            : ''
                        }`}
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[#264653]/30">
                        <LockIcon />
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-[10px] font-bold text-[#264653]/40 hover:text-[#2A9D8F] transition-colors select-none"
                      >
                        {showConfirm ? 'إخفاء' : 'إظهار'}
                      </button>
                    </div>
                    {/* Inline match indicator */}
                    {form.confirmPassword && (
                      <p className={`text-[10px] font-semibold mt-0.5 ${
                        form.password === form.confirmPassword ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {form.password === form.confirmPassword ? '✓ كلمتا السر متطابقتان' : '✗ غير متطابقتين'}
                      </p>
                    )}
                  </Field>

                </div>

                {/* ── Submit ── */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    mt-2 w-full py-3.5 rounded-xl
                    bg-[#2A9D8F] text-[#F8F9FA]
                    font-black text-base
                    flex items-center justify-center gap-2
                    hover:bg-[#264653]
                    active:scale-95
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                    shadow-lg shadow-[#2A9D8F]/25
                    transition-all duration-200
                  "
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#F8F9FA]/30 border-t-[#F8F9FA] rounded-full animate-spin" />
                      جاري إنشاء الحساب...
                    </>
                  ) : (
                    'إنشاء الحساب'
                  )}
                </button>
              </form>

              {/* ── Footer ── */}
              <div className="mt-6 pt-5 border-t border-[#264653]/10 text-center">
                <p className="text-[#264653]/50 text-sm">
                  لديك حساب بالفعل؟{' '}
                  <Link
                    href="/login"
                    className="text-[#2A9D8F] font-bold hover:text-[#264653] underline underline-offset-4 transition-colors duration-200"
                  >
                    سجل دخولك
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

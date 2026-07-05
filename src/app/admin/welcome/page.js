'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase-browser';
import { useAuth } from '../../../context/AuthContext';

const COLORS = [
  { label: 'أزرق',       value: '#2563eb' },
  { label: 'بنفسجي',     value: '#7c3aed' },
  { label: 'نيلي',       value: '#4f46e5' },
  { label: 'وردي',       value: '#db2777' },
  { label: 'برتقالي',   value: '#ea580c' },
  { label: 'أخضر',       value: '#059669' },
  { label: 'فيروزي',    value: '#0d9488' },
  { label: 'أسود أنيق', value: '#1e293b' },
];

export default function WelcomePage() {
  const router = useRouter();
  const { centerId } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    centerType: 'center',
    name: '',
    logoUrl: '',
    primaryColor: '#2563eb',
  });

  // ── Upload ──────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !centerId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${centerId}-welcome-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('center-logos').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('center-logos').getPublicUrl(fileName);
      setForm(p => ({ ...p, logoUrl: publicUrl }));
    } catch (err) {
      alert('فشل رفع الصورة: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Save ────────────────────────────────────────────
  const handleFinish = async () => {
    if (!centerId || !form.name.trim()) return;
    setSaving(true);
    try {
      const isInstructor = form.centerType === 'instructor';

      await supabase.from('center_settings').upsert({
        center_id: centerId,
        center_name:           isInstructor ? null           : form.name.trim(),
        logo_url:              isInstructor ? null           : form.logoUrl || null,
        primary_color:         form.primaryColor,
        instructor_name:       isInstructor ? form.name.trim() : null,
        instructor_photo_url:  isInstructor ? form.logoUrl || null : null,
      }, { onConflict: 'center_id' });

      await supabase.from('centers')
        .update({ center_type: form.centerType })
        .eq('id', centerId);

      // الـ Guard يشيك على center_name — لازم نحطه صح
      // لو instructor mode → نحط الاسم في center_name برضو عشان الـ guard ما يعيد redirect
      if (isInstructor) {
        await supabase.from('center_settings').update({
          center_name: form.name.trim()
        }).eq('center_id', centerId);
      }

      router.replace('/admin/dashboard');
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const canNext1 = form.name.trim().length >= 2;
  const isInstructor = form.centerType === 'instructor';

  return (
    <div className="fixed inset-0 bg-[#050816] flex items-center justify-center z-[9999] p-4 overflow-y-auto" dir="rtl">
      
      {/* ── Ambient Glow ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[180px] transition-all duration-1000 opacity-20"
          style={{ backgroundColor: form.primaryColor }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[180px] transition-all duration-1000 opacity-10"
          style={{ backgroundColor: form.primaryColor }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl">

        {/* ── Progress ── */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 ${
                  step === n
                    ? 'text-white scale-110 shadow-2xl'
                    : step > n
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-white/20 border border-white/10'
                }`}
                style={step === n ? { backgroundColor: form.primaryColor } : {}}
              >
                {step > n ? '✓' : n}
              </div>
              {n < 3 && (
                <div className={`h-[2px] w-12 rounded-full transition-all duration-500 ${step > n ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Card ── */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">

          {/* ═══════ STEP 1: Identity ═══════ */}
          {step === 1 && (
            <div className="p-8 md:p-12 space-y-8">
              <div>
                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-3">الخطوة 1 من 3</p>
                <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
                  أهلاً! 👋<br />
                  <span className="text-white/50 text-2xl font-bold">نبدأ بالأساسيات</span>
                </h1>
              </div>

              {/* Type Toggle */}
              <div>
                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-4">نوع حسابك</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { type: 'center',     emoji: '🏫', title: 'سنتر تعليمي',   sub: 'مدرسة أو مركز بمدرسين متعددين' },
                    { type: 'instructor', emoji: '👨‍🏫', title: 'مدرس مستقل',    sub: 'أنت المدرس وأنت صاحب المنصة' },
                  ].map(({ type, emoji, title, sub }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, centerType: type }))}
                      className={`p-5 rounded-2xl border-2 text-right transition-all duration-300 ${
                        form.centerType === type
                          ? 'border-opacity-100 bg-white/10'
                          : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                      }`}
                      style={form.centerType === type ? { borderColor: form.primaryColor } : {}}
                    >
                      <p className="text-3xl mb-3">{emoji}</p>
                      <p className="font-black text-white text-sm">{title}</p>
                      <p className="text-white/40 text-xs font-bold mt-1">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-3">
                  {isInstructor ? 'اسمك الكامل' : 'اسم المركز'}
                </p>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={isInstructor ? 'أ/ محمد علي...' : 'مركز النور للتعليم...'}
                  className="w-full bg-white/5 border-2 border-white/10 focus:border-white/30 rounded-2xl p-4 text-white font-black placeholder:text-white/20 outline-none transition-all text-lg"
                  style={{ caretColor: form.primaryColor }}
                />
              </div>

              <button
                onClick={() => canNext1 && setStep(2)}
                disabled={!canNext1}
                className="w-full py-5 rounded-2xl font-black text-white text-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ backgroundColor: canNext1 ? form.primaryColor : undefined }}
              >
                التالي ←
              </button>
            </div>
          )}

          {/* ═══════ STEP 2: Look & Feel ═══════ */}
          {step === 2 && (
            <div className="p-8 md:p-12 space-y-8">
              <div>
                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-3">الخطوة 2 من 3</p>
                <h1 className="text-3xl font-black text-white leading-tight">
                  هويتك البصرية 🎨
                </h1>
                <p className="text-white/40 font-bold text-sm mt-2">اختياري — ممكن تعديلها بعدين</p>
              </div>

              {/* Logo / Photo Upload */}
              <div>
                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-4">
                  {isInstructor ? 'صورتك الشخصية' : 'شعار المركز'}
                </p>
                <div className="flex items-center gap-6">
                  {/* Preview */}
                  <div
                    className={`flex-shrink-0 w-20 h-20 flex items-center justify-center border-2 border-dashed border-white/20 overflow-hidden ${
                      isInstructor ? 'rounded-full' : 'rounded-2xl'
                    }`}
                    style={form.logoUrl ? {} : { backgroundColor: `${form.primaryColor}22` }}
                  >
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl opacity-50">{isInstructor ? '🧑‍🏫' : '🏫'}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <input type="file" id="logoInput" hidden accept="image/*" onChange={handleUpload} />
                    <label
                      htmlFor="logoInput"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm cursor-pointer transition-all"
                      style={{ backgroundColor: `${form.primaryColor}22`, color: form.primaryColor }}
                    >
                      {uploading ? '⏳ جاري الرفع...' : '📤 رفع صورة'}
                    </label>
                    <p className="text-white/20 text-xs font-bold mt-2">PNG أو JPG — الحجم الأمثل 400×400</p>
                  </div>
                </div>
              </div>

              {/* Color Swatches */}
              <div>
                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-4">اللون الأساسي</p>
                <div className="grid grid-cols-4 gap-3">
                  {COLORS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, primaryColor: value }))}
                      className={`relative h-12 rounded-xl transition-all duration-200 ${
                        form.primaryColor === value ? 'scale-110 ring-2 ring-white/50 ring-offset-2 ring-offset-transparent' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: value }}
                      title={label}
                    >
                      {form.primaryColor === value && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-lg">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-white/30 text-xs font-bold mt-3 text-center">
                  اللون دا هيظهر في الهيدر والسايدبار والأزرار
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-5 rounded-2xl font-black text-white/40 text-base bg-white/5 hover:bg-white/10 transition-all"
                >
                  → رجوع
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] py-5 rounded-2xl font-black text-white text-lg transition-all active:scale-95"
                  style={{ backgroundColor: form.primaryColor }}
                >
                  التالي ←
                </button>
              </div>
            </div>
          )}

          {/* ═══════ STEP 3: Preview + Done ═══════ */}
          {step === 3 && (
            <div className="p-8 md:p-12 space-y-8">
              <div className="text-center">
                <p className="text-6xl mb-4 animate-bounce">🎉</p>
                <h1 className="text-3xl font-black text-white">كل شيء جاهز!</h1>
                <p className="text-white/40 font-bold mt-2">معاينة سريعة قبل ما تبدأ</p>
              </div>

              {/* Live Preview Card */}
              <div
                className="rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden"
                style={{ backgroundColor: form.primaryColor }}
              >
                {/* Shimmer */}
                <div className="absolute inset-0 bg-white/10 opacity-20" />
                {/* Logo/Photo */}
                <div className={`relative flex-shrink-0 w-14 h-14 overflow-hidden bg-white/20 flex items-center justify-center ${isInstructor ? 'rounded-full border-2 border-white/40' : 'rounded-xl'}`}>
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{isInstructor ? '🧑‍🏫' : '🏫'}</span>
                  )}
                </div>
                {/* Text */}
                <div className="relative">
                  <p className="text-white font-black text-xl leading-tight">
                    {isInstructor ? `أ/ ${form.name}` : form.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-white/70 text-xs font-bold">
                      {isInstructor ? 'مدرس مستقل' : 'سنتر تعليمي'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-white/30 text-xs font-bold text-center">
                هكذا سيظهر اسمك في الهيدر — يمكن تغييره في أي وقت من الإعدادات
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-5 rounded-2xl font-black text-white/40 text-base bg-white/5 hover:bg-white/10 transition-all"
                >
                  → رجوع
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-[2] py-5 rounded-2xl font-black text-white text-lg transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: form.primaryColor }}
                >
                  {saving ? '⏳ جاري الحفظ...' : 'ابدأ الآن 🚀'}
                </button>
              </div>
            </div>
          )}

        </div>

        <p className="text-center text-white/20 text-xs font-bold mt-8 uppercase tracking-widest">
          Smart Center · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

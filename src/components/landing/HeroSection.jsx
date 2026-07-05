'use client';

import Image from 'next/image';
import Link from 'next/link';

// ─────────────────────────────────────────────────
// Decorative molecule SVG — chemistry motif
// ─────────────────────────────────────────────────
const MoleculeDecor = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 200 200"
    className="w-full h-full opacity-[0.06]"
    fill="none"
  >
    <circle cx="100" cy="100" r="18" stroke="#F8F9FA" strokeWidth="2" />
    <circle cx="40"  cy="60"  r="12" stroke="#F8F9FA" strokeWidth="2" />
    <circle cx="160" cy="60"  r="12" stroke="#F8F9FA" strokeWidth="2" />
    <circle cx="40"  cy="140" r="12" stroke="#F8F9FA" strokeWidth="2" />
    <circle cx="160" cy="140" r="12" stroke="#F8F9FA" strokeWidth="2" />
    <circle cx="100" cy="20"  r="10" stroke="#2A9D8F" strokeWidth="2" />
    <circle cx="100" cy="180" r="10" stroke="#2A9D8F" strokeWidth="2" />
    <line x1="100" y1="82"  x2="100" y2="30"  stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="100" y1="118" x2="100" y2="170" stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="82"  y1="88"  x2="52"  y2="68"  stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="118" y1="88"  x2="148" y2="68"  stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="82"  y1="112" x2="52"  y2="132" stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="118" y1="112" x2="148" y2="132" stroke="#F8F9FA" strokeWidth="1.5" />
  </svg>
);

// ─────────────────────────────────────────────────
// Stats data
// ─────────────────────────────────────────────────
const STATS = [
  {
    value: '+2.0M',
    label: 'متابعين على اليوتيوب',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    value: '+1.0M',
    label: 'متابعين على الفيسبوك',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

// ─────────────────────────────────────────────────
// HeroSection
// ─────────────────────────────────────────────────
export default function HeroSection() {
  return (
    <section
      dir="rtl"
      className="relative w-full overflow-hidden bg-[#264653]"
    >
      {/* ── Background decorations ─────────────────── */}
      {/* Large molecule pattern — top-left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 w-72 h-72"
      >
        <MoleculeDecor />
      </div>
      {/* Bottom-left blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 w-96 h-72"
      >
        <MoleculeDecor />
      </div>
      {/* Teal radial glow behind image */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_70%_50%,_#2A9D8F1A_0%,_transparent_70%)]"
      />
      {/* Horizontal separator glow line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2A9D8F]/40 to-transparent"
      />

      {/* ── Content wrapper ────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-16 lg:px-20 pt-36 pb-0 md:pt-32 lg:pt-36 flex flex-col md:flex-row-reverse items-center justify-between gap-6 md:gap-0">

        {/* ══════════════════════════════════════════
            LEFT (in RTL = image side)
        ══════════════════════════════════════════ */}
        <div className="relative w-full md:w-[55%] lg:w-[55%] flex justify-center items-end self-end">
          {/* Decorative blob behind teacher */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[90%] rounded-full bg-[#2A9D8F]/10 blur-3xl"
          />

          <Image
            src="/hero-image.png"
            alt="الدكتور عبدالرحمن خالد — مدرس الكيمياء"
            width={800}
            height={850}
            priority={true}
            unoptimized={true}
            className="relative z-10 w-full max-w-[650px] md:max-w-full h-auto object-contain drop-shadow-2xl select-none"
          />

          {/* ── Floating trust card ─────────────────── */}
          <div
            className="
              absolute bottom-8 left-4 md:left-6 z-20
              flex items-center gap-3
              bg-[#1d3740]/80 backdrop-blur-md
              border border-[#2A9D8F]/30
              rounded-2xl px-4 py-3
              shadow-xl
            "
          >
            <div className="w-10 h-10 rounded-full bg-[#2A9D8F]/20 border border-[#2A9D8F]/50 flex items-center justify-center shrink-0 text-xl">
              ⚗️
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#F8F9FA]/50 leading-none mb-1">مدرس الكيمياء</p>
              <p className="text-sm font-bold text-[#F8F9FA] leading-none">عبدالرحمن خالد</p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            RIGHT (in RTL = text side)
        ══════════════════════════════════════════ */}
        <div className="w-full md:w-[42%] lg:w-[42%] flex flex-col gap-7 text-right pb-16 md:pb-24">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 self-start bg-[#2A9D8F]/15 border border-[#2A9D8F]/35 rounded-full px-4 py-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2A9D8F] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2A9D8F]" />
            </span>
            <span className="text-sm font-semibold text-[#2A9D8F] tracking-wide">
              منصة الدكتور عبدالرحمن خالد
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-[#F8F9FA] text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.35] tracking-tight">
            منصتك الأولى لتعلم وفهم{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#2A9D8F]">الكيمياء</span>
              {/* wavy underline */}
              <svg
                aria-hidden="true"
                viewBox="0 0 160 10"
                className="absolute -bottom-1 right-0 w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 6 Q40 1 80 6 Q120 11 158 6"
                  stroke="#2A9D8F"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
            </span>{' '}
            بأسلوب بسيط وممتع
          </h1>

          {/* H2 / Sub-heading */}
          <p className="text-[#F8F9FA]/70 text-base sm:text-lg leading-relaxed max-w-lg">
            أهلاً بيك في بيتك التاني! مع الدكتور عبدالرحمن خالد، هتلاقي كل اللي
            تحتاجه علشان تتفوق في الكيمياء وتفهمها صح.
          </p>

          {/* CTA button */}
          <div className="flex flex-wrap gap-4 items-center">
            <Link
              href="/register"
              id="hero-subscribe-btn"
              className="
                inline-flex items-center gap-2
                px-8 py-4 rounded-full
                bg-[#2A9D8F] text-[#F8F9FA]
                text-base font-bold
                shadow-lg shadow-[#2A9D8F]/30
                hover:bg-[#238076] hover:shadow-xl hover:shadow-[#2A9D8F]/40
                hover:-translate-y-0.5
                active:scale-95 active:shadow-none
                transition-all duration-200
              "
            >
              اشترك دلوقتي !
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 rotate-180 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            {/* Optional ghost link */}
            <Link
              href="/login"
              id="hero-login-link"
              className="
                text-sm font-semibold text-[#F8F9FA]/60
                hover:text-[#F8F9FA]
                underline underline-offset-4 decoration-[#2A9D8F]/40
                hover:decoration-[#2A9D8F]
                transition-all duration-200
              "
            >
              لديك حساب؟ سجّل الدخول
            </Link>
          </div>

          {/* ── Stats row ────────────────────────────── */}
          <div className="flex items-start gap-8 pt-6 mt-2 border-t border-[#F8F9FA]/10">
            {STATS.map((stat, i) => (
              <div key={stat.label} className="flex flex-col gap-1.5">
                <span className="text-[#2A9D8F] text-3xl font-bold tabular-nums leading-none">
                  {stat.value}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#F8F9FA]/55">
                  <span className="text-[#F8F9FA]/40">{stat.icon}</span>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

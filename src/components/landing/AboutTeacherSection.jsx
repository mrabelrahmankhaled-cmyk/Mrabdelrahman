'use client';

import Image from 'next/image';

// ─────────────────────────────────────────────────────────────
// Features data — DRY, edit here to update all 3 items
// ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: 1,
    title: 'شروحات فيديو احترافية',
    description: 'كل درس مصوّر بجودة عالية مع أمثلة وتطبيقات تخلي الكيمياء واضحة ومبسّطة.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  },
  {
    id: 2,
    title: 'تجارب وأمثلة تفاعلية',
    description: 'شرح المفاهيم المجردة بأمثلة من الحياة العملية وتجارب مرئية تثبّت المعلومة.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 0 1 .45 1.278 2.25 2.25 0 0 1-2.25 2.25H5.698A2.25 2.25 0 0 1 3.45 16.278 2.25 2.25 0 0 1 3.9 15M19.8 15H4.2" />
      </svg>
    ),
  },
  {
    id: 3,
    title: 'امتحانات وتقييمات منتظمة',
    description: 'بعد كل وحدة فيه امتحان لقياس مستواك وضمان إنك فاهم قبل ما تكمل.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
];

// ─────────────────────────────────────────────────────────────
// Decorative quote mark SVG
// ─────────────────────────────────────────────────────────────
const QuoteMark = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 48 48"
    fill="currentColor"
    className="w-12 h-12 text-[#F8F9FA]/20"
  >
    <path d="M13 30c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6c.4 0 .8 0 1.2.1C8.8 20.5 11.6 17 16 16v4c-2.1.5-3.7 2-4.5 4 .5-.1 1-.1 1.5-.1 2.8 0 5 2.2 5 5v1Zm22 0c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6c.4 0 .8 0 1.2.1C30.8 20.5 33.6 17 38 16v4c-2.1.5-3.7 2-4.5 4 .5-.1 1-.1 1.5-.1 2.8 0 5 2.2 5 5v1Z" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// AboutTeacherSection
// ─────────────────────────────────────────────────────────────
export default function AboutTeacherSection() {
  return (
    <section
      id="about"
      dir="rtl"
      className="bg-[#264653] py-20 px-6 md:px-16 lg:px-20 overflow-hidden"
    >
      {/* Subtle molecule pattern in background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03] select-none"
        style={{
          backgroundImage: `radial-gradient(circle, #F8F9FA 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row gap-12 md:gap-16 items-center">

        {/* ══════════════════════════════════════════════
            RIGHT COLUMN — Text / Info
        ══════════════════════════════════════════════ */}
        <div className="flex-1 md:basis-1/2 flex flex-col gap-8 text-right">

          {/* Eyebrow badge */}
          <span className="inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full bg-[#F8F9FA]/10 border border-[#F8F9FA]/15 text-sm font-semibold text-[#F8F9FA]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] shrink-0 inline-block" />
            من هو الأستاذ؟
          </span>

          {/* Heading */}
          <div>
            <h2 className="text-[#F8F9FA] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3">
              أ/ عبدالرحمن{' '}
              <span className="text-[#2A9D8F]">خالد</span>
            </h2>
            <p className="text-[#F8F9FA]/50 text-base font-medium tracking-wide">
              مدرس كيمياء • يوتيوبر تعليمي • +2 مليون متابع
            </p>
          </div>

          {/* Bio paragraph */}
          <p className="text-[#F8F9FA]/75 text-base sm:text-lg leading-relaxed max-w-xl">
            الأستاذ عبدالرحمن خالد واحد من أبرز مدرّسي الكيمياء في العالم
            العربي. بيقدّم محتوى تعليمي فريد بأسلوب مبسّط وممتع يوصل لكل
            طالب. رسالته الأساسية إن الكيمياء مش صعبة — لازم بس تتعلّمها
            بالطريقة الصح.
          </p>

          {/* Features list */}
          <ul className="flex flex-col gap-4">
            {FEATURES.map((feat) => (
              <li key={feat.id} className="flex items-start gap-4">
                {/* Icon chip */}
                <div className="
                  w-10 h-10 rounded-xl shrink-0
                  bg-[#2A9D8F] text-[#F8F9FA]
                  flex items-center justify-center
                  shadow-md shadow-[#2A9D8F]/30
                  mt-0.5
                ">
                  {feat.icon}
                </div>

                <div className="flex flex-col gap-0.5">
                  <h3 className="text-[#F8F9FA] text-base font-bold leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-[#F8F9FA]/60 text-sm leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Social proof strip */}
          <div className="flex items-center gap-8 pt-6 border-t border-[#F8F9FA]/10">
            <div className="flex flex-col gap-0.5 text-center">
              <span className="text-[#2A9D8F] text-2xl font-black tabular-nums">+2M</span>
              <span className="text-[#F8F9FA]/50 text-xs">يوتيوب</span>
            </div>
            <div className="w-px h-8 bg-[#F8F9FA]/10" />
            <div className="flex flex-col gap-0.5 text-center">
              <span className="text-[#2A9D8F] text-2xl font-black tabular-nums">+1M</span>
              <span className="text-[#F8F9FA]/50 text-xs">فيسبوك</span>
            </div>
            <div className="w-px h-8 bg-[#F8F9FA]/10" />
            <div className="flex flex-col gap-0.5 text-center">
              <span className="text-[#2A9D8F] text-2xl font-black tabular-nums">+500K</span>
              <span className="text-[#F8F9FA]/50 text-xs">طالب استفاد</span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            LEFT COLUMN — Photo + Quote block
        ══════════════════════════════════════════════ */}
        <div className="flex-1 md:basis-1/2 flex flex-col gap-6 items-center w-full">

          {/* Teacher photo — uses hero-image.png as fallback */}
          <div className="relative w-full max-w-sm">
            {/* Teal glow halo */}
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[2.5rem] bg-[#2A9D8F]/15 blur-2xl"
            />

            <div className="relative rounded-3xl overflow-hidden border border-[#F8F9FA]/10 shadow-2xl bg-[#1d3a45]">
              <Image
                src="/hero-image.png"
                alt="الأستاذ عبدالرحمن خالد"
                width={480}
                height={520}
                unoptimized
                className="w-full h-auto object-contain object-bottom"
              />
              {/* Bottom fade */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#264653]/40 via-transparent to-transparent pointer-events-none"
              />
            </div>
          </div>

          {/* Quote block */}
          <div className="w-full max-w-sm bg-[#2A9D8F] rounded-2xl p-6 shadow-xl shadow-[#2A9D8F]/20 relative overflow-hidden">
            {/* Decorative quote marks */}
            <div className="absolute -top-2 -right-2">
              <QuoteMark />
            </div>

            <blockquote className="relative z-10 text-right">
              <p className="text-[#F8F9FA] text-base sm:text-lg font-medium leading-relaxed mb-4">
                &ldquo;الكيمياء مش حفظ — الكيمياء فهم. وأنا هنا عشان أوصّلك
                لمرحلة إنك تحب المادة دي وتتفوق فيها.&rdquo;
              </p>

              <footer className="flex items-center gap-3 justify-end">
                <div className="text-right">
                  <cite className="text-[#F8F9FA] text-sm font-bold not-italic">
                    أ/ عبدالرحمن خالد
                  </cite>
                  <p className="text-[#F8F9FA]/70 text-xs">مدرس كيمياء</p>
                </div>
                {/* Avatar initials circle */}
                <div className="w-10 h-10 rounded-full bg-[#F8F9FA]/20 border-2 border-[#F8F9FA]/40 flex items-center justify-center text-[#F8F9FA] text-sm font-bold shrink-0">
                  ع.خ
                </div>
              </footer>
            </blockquote>

            {/* Subtle inner pattern */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#238076]/30 to-transparent"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

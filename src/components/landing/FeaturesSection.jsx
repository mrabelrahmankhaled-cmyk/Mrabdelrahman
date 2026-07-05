'use client';

// ─────────────────────────────────────────────────────────────
// Features data — edit here to update all cards
// ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    number: '01',
    title: 'شرح مبسّط ومتميّز',
    description: 'أسلوب شرح فريد يخلي الكيمياء سهلة وممتعة لكل مستوى.',
    icon: '🎓',
  },
  {
    number: '02',
    title: 'فيديوهات عالية الجودة',
    description: 'محتوى مصور بأعلى جودة لضمان أفضل تجربة تعليمية.',
    icon: '🎥',
  },
  {
    number: '03',
    title: 'امتحانات وتدريبات',
    description: 'بنك ضخم من الأسئلة والامتحانات لتثبيت المعلومة وتقييم مستواك.',
    icon: '📝',
  },
  {
    number: '04',
    title: 'متابعة مستمرة',
    description: 'الدكتور دايماً موجود للرد على الأسئلة ومتابعة تقدمك.',
    icon: '💬',
  },
  {
    number: '05',
    title: 'منهج كامل ومنظّم',
    description: 'المنهج مقسّم بشكل منطقي يضمن تغطية كل الأجزاء بدون فراغات.',
    icon: '📚',
  },
  {
    number: '06',
    title: 'ملخصات وملفات PDF',
    description: 'ملخصات مرئية وملفات للتحميل تساعدك في المراجعة السريعة.',
    icon: '📄',
  },
  {
    number: '07',
    title: 'مجتمع طلابي',
    description: 'انضم لمجتمع من الطلاب المتميزين للنقاش والتعاون وتبادل الخبرات.',
    icon: '🤝',
  },
  {
    number: '08',
    title: 'وصول مدى الحياة',
    description: 'اشترك مرة وادرس في أي وقت — الوصول للمحتوى بلا قيود.',
    icon: '♾️',
  },
];

// ─────────────────────────────────────────────────────────────
// Single Feature Card
// ─────────────────────────────────────────────────────────────
function FeatureCard({ number, title, description, icon }) {
  return (
    <div
      className="
        group relative flex flex-col justify-between
        bg-[#264653] rounded-2xl
        p-6 pt-8 pb-0
        overflow-hidden
        transition-transform duration-300 hover:-translate-y-1
        shadow-md hover:shadow-xl hover:shadow-[#264653]/30
        min-h-[260px]
      "
    >
      {/* ── Large background number ── */}
      <span
        aria-hidden="true"
        className="
          absolute top-3 left-4
          text-[80px] font-black leading-none
          text-[#F8F9FA]/[0.06]
          select-none pointer-events-none
          transition-all duration-300 group-hover:text-[#F8F9FA]/[0.1]
        "
      >
        {number}
      </span>

      {/* ── Card body ── */}
      <div className="relative z-10 flex flex-col gap-4">
        {/* Icon */}
        <div className="flex items-center justify-between">
          <span className="text-4xl">{icon}</span>
          <span className="text-sm font-bold text-[#2A9D8F] tabular-nums tracking-widest">
            {number}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[#F8F9FA] text-xl font-bold leading-snug">
          {title}
        </h3>

        {/* Description */}
        <p className="text-[#F8F9FA]/65 text-sm leading-relaxed">
          {description}
        </p>
      </div>

      {/* ── Bottom teal accent bar ── */}
      <div
        className="
          mt-6 h-1 w-0 rounded-full
          bg-[#2A9D8F]
          transition-all duration-500
          group-hover:w-full
        "
        aria-hidden="true"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FeaturesSection
// ─────────────────────────────────────────────────────────────
export default function FeaturesSection() {
  return (
    <section
      id="features"
      dir="rtl"
      className="bg-[#F8F9FA] py-20 px-6 md:px-16 lg:px-20"
    >
      <div className="max-w-7xl mx-auto">

        {/* ── Section header ── */}
        <div className="text-center mb-14">
          {/* Eyebrow label */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#264653]/8 border border-[#264653]/15 text-sm font-semibold text-[#264653] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] inline-block" />
            ليه تشترك معانا؟
          </span>

          <h2 className="text-[#264653] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
            كل اللي تحتاجه في{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#2A9D8F]">مكان واحد</span>
              {/* underline accent */}
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
                  opacity="0.5"
                />
              </svg>
            </span>
          </h2>

          <p className="text-[#264653]/60 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            منصة الدكتور عبدالرحمن خالد مش بس دروس — دي تجربة تعليمية متكاملة
            صُممت عشان توصّلك للتفوق.
          </p>
        </div>

        {/* ── Cards grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.number} {...feature} />
          ))}
        </div>

        {/* ── Bottom CTA nudge ── */}
        <div className="mt-14 text-center">
          <p className="text-[#264653]/50 text-sm">
            مستني إيه؟{' '}
            <a
              href="/register"
              className="font-bold text-[#2A9D8F] hover:underline underline-offset-4 transition-all"
            >
              اشترك دلوقتي واستمتع بالتجربة كلها ←
            </a>
          </p>
        </div>

      </div>
    </section>
  );
}

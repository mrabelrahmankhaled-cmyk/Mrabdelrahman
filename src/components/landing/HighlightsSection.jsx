'use client';

import Image from 'next/image';

// ─────────────────────────────────────────────────────────────
// Highlights data — 3 value proposition cards
// ─────────────────────────────────────────────────────────────
const HIGHLIGHTS = [
  {
    id: 1,
    title: 'شرح يوصل لكل طالب',
    description:
      'الأستاذ عبدالرحمن بيشرح بأسلوب مبسّط ومبتكر يناسب كل المستويات، سواء كنت في البداية أو عايز تتفوق.',
    bg: 'bg-[#264653]',
    personImage: '/hero-image.png',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    id: 2,
    title: 'متابعة ودعم مستمر',
    description:
      'مش بس شرح وخلاص — فيه متابعة حقيقية، ردود على الأسئلة، وتقييم مستمر لضمان تقدمك وتفوقك.',
    bg: 'bg-[#2A9D8F]',
    personImage: '/hero-image.png',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    id: 3,
    title: 'محتوى متجدد وحديث',
    description:
      'المحتوى بيتحدّث باستمرار ليواكب التغييرات في المناهج والامتحانات، وعشان دايماً تكون جاهز.',
    bg: 'bg-[#264653]',
    personImage: '/hero-image.png',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
];

// ─────────────────────────────────────────────────────────────
// Decorative chemistry SVG background pattern
// ─────────────────────────────────────────────────────────────
const ChemPattern = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 300 300"
    className="absolute inset-0 w-full h-full opacity-[0.08]"
    fill="none"
  >
    {/* Molecule ring */}
    <circle cx="150" cy="150" r="60"  stroke="#F8F9FA" strokeWidth="1.5" />
    <circle cx="150" cy="75"  r="18"  stroke="#F8F9FA" strokeWidth="1.5" />
    <circle cx="215" cy="112" r="18"  stroke="#F8F9FA" strokeWidth="1.5" />
    <circle cx="215" cy="188" r="18"  stroke="#F8F9FA" strokeWidth="1.5" />
    <circle cx="150" cy="225" r="18"  stroke="#F8F9FA" strokeWidth="1.5" />
    <circle cx="85"  cy="188" r="18"  stroke="#F8F9FA" strokeWidth="1.5" />
    <circle cx="85"  cy="112" r="18"  stroke="#F8F9FA" strokeWidth="1.5" />
    {/* Bond lines */}
    <line x1="150" y1="93"  x2="150" y2="90"  stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="150" y1="210" x2="150" y2="207" stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="200" y1="120" x2="197" y2="117" stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="100" y1="120" x2="103" y2="117" stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="200" y1="180" x2="197" y2="183" stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="100" y1="180" x2="103" y2="183" stroke="#F8F9FA" strokeWidth="1.5" />
    {/* Flask at bottom right */}
    <path d="M240 240 L255 270 Q260 280 250 280 L230 280 Q220 280 225 270 Z"
      stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="240" y1="240" x2="240" y2="225" stroke="#F8F9FA" strokeWidth="1.5" />
    <line x1="238" y1="225" x2="242" y2="225" stroke="#F8F9FA" strokeWidth="2" />
    {/* Small circles as atoms */}
    <circle cx="50"  cy="50"  r="6" stroke="#F8F9FA" strokeWidth="1.5" />
    <circle cx="260" cy="60"  r="6" stroke="#F8F9FA" strokeWidth="1.5" />
    <circle cx="40"  cy="250" r="5" stroke="#F8F9FA" strokeWidth="1.5" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// Single Highlight Card
// ─────────────────────────────────────────────────────────────
function HighlightCard({ title, description, bg, personImage, icon, index }) {
  const isMiddle = index === 1;

  return (
    <div
      className={`
        group relative flex flex-col items-center w-full max-w-sm
        ${isMiddle ? 'sm:-mt-6' : ''}
        transition-transform duration-300 hover:-translate-y-2
      `}
    >
      {/* ── Image wrapper ─────────────────────────────── */}
      <div
        className={`
          relative w-full rounded-3xl overflow-hidden
          ${bg}
          h-[340px] sm:h-[380px]
          shadow-xl
        `}
      >
        {/* Decorative chemistry pattern */}
        <ChemPattern />

        {/* Subtle inner glow ring */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-[#F8F9FA]/10 pointer-events-none"
        />

        {/* Teacher / person image — absolute, bottom-anchored */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center overflow-hidden h-[95%]">
          <Image
            src={personImage}
            alt={title}
            width={320}
            height={380}
            unoptimized
            className="
              h-full w-auto object-contain object-bottom
              transition-transform duration-500
              group-hover:scale-110
              select-none
            "
          />
        </div>

        {/* Top gradient fade */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"
        />
      </div>

      {/* ── Text card — overlaps the image at the bottom ── */}
      <div
        className="
          relative -mt-8 mx-4 w-[calc(100%-2rem)]
          bg-white rounded-2xl shadow-lg
          p-5 z-10
          transition-shadow duration-300 group-hover:shadow-xl
        "
      >
        {/* Icon chip */}
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="
            w-11 h-11 rounded-xl shrink-0
            bg-[#2A9D8F] text-[#F8F9FA]
            flex items-center justify-center
            shadow-md shadow-[#2A9D8F]/30
          ">
            {icon}
          </div>

          {/* Number badge */}
          <span className="text-xs font-black text-[#264653]/20 tabular-nums text-5xl leading-none select-none">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <h3 className="text-[#264653] text-lg font-bold mb-2 leading-snug">
          {title}
        </h3>
        <p className="text-[#264653]/60 text-sm leading-relaxed">
          {description}
        </p>

        {/* Bottom teal accent */}
        <div
          aria-hidden="true"
          className="mt-4 h-0.5 w-0 rounded-full bg-[#2A9D8F] transition-all duration-500 group-hover:w-full"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HighlightsSection
// ─────────────────────────────────────────────────────────────
export default function HighlightsSection() {
  return (
    <section
      id="highlights"
      dir="rtl"
      className="bg-[#F8F9FA] py-20 px-6 md:px-16 lg:px-20 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">

        {/* ── Section header ── */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#264653]/8 border border-[#264653]/15 text-sm font-semibold text-[#264653] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] inline-block" />
            ليه تختار منصتنا؟
          </span>

          <h2 className="text-[#264653] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
            تجربة تعليمية{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#2A9D8F]">مختلفة</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 120 10"
                className="absolute -bottom-1 right-0 w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 6 Q30 1 60 6 Q90 11 118 6"
                  stroke="#2A9D8F"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
            </span>{' '}
            بكل المعنى
          </h2>

          <p className="text-[#264653]/60 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            مش مجرد دروس أونلاين — دي رحلة تعليمية كاملة صُممت عشان توصّلك
            للتفوق خطوة بخطوة.
          </p>
        </div>

        {/* ── Cards grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 justify-items-center items-start">
          {HIGHLIGHTS.map((item, index) => (
            <HighlightCard key={item.id} {...item} index={index} />
          ))}
        </div>

      </div>
    </section>
  );
}

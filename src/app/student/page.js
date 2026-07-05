'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { 
  FaPlayCircle, FaBolt, FaAward, FaStar, FaYoutube, FaFacebook, 
  FaInstagram, FaTiktok, FaWhatsapp, FaTelegram, FaArrowLeft,
  FaCheckCircle, FaUserGraduate, FaChevronLeft, FaQuoteRight, 
  FaQuestionCircle, FaShieldAlt, FaRocket, FaLaptopCode, FaPhoneAlt
} from 'react-icons/fa';

export default function StudentLandingPage() {
  const { user, centerId } = useAuth();
  const [settings, setSettings] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(null);
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 50], ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.8)"]);
  const navBlur = useTransform(scrollY, [0, 50], ["blur(0px)", "blur(20px)"]);
  const navShadow = useTransform(scrollY, [0, 50], ["none", "0 10px 30px rgba(0,0,0,0.05)"]);

  useEffect(() => {
    async function fetchData() {
      if (!centerId) return;
      try {
        const [settingsRes, coursesRes] = await Promise.all([
          supabase.from('center_settings').select('*').eq('center_id', centerId).maybeSingle(),
          supabase.from('courses').select('*, instructors(name)').eq('center_id', centerId).limit(6)
        ]);

        if (settingsRes.data) setSettings(settingsRes.data);
        if (coursesRes.data) setCourses(coursesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [centerId]);

  const primaryColor = settings?.primary_color || '#FF4500';
  const secondaryColor = settings?.secondary_color || '#0f172a';
  const heroBgColor = settings?.hero_bg_color || primaryColor;
  const template = settings?.landing_page_template || 'elite';

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
       <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}></div>
       </div>
    </div>
  );

  const getSocialIcon = (platform) => {
    switch (platform) {
      case 'youtube': return <FaYoutube />;
      case 'facebook': return <FaFacebook />;
      case 'instagram': return <FaInstagram />;
      case 'tiktok': return <FaTiktok />;
      case 'whatsapp': return <FaWhatsapp />;
      case 'telegram': return <FaTelegram />;
      default: return <FaBolt />;
    }
  };

  const FAQS = [
    { q: 'إزاي أقدر أشترك في الكورسات؟', a: 'تقدر تشتري أكواد التفعيل من أقرب سنتر ليك، أو تشحن محفظتك وتفعل الكورس مباشرة من خلال ميزة شحن المحفظة أونلاين.' },
    { q: 'هل الفيديوهات بتفضل موجودة لآخر السنة؟', a: 'أيوة طبعاً، أي حصة أو مراجعة بتفعلها بتفضل معاك لآخر السنة تقدر تشوفها في أي وقت ومن أي مكان.' },
    { q: 'إيه اللي يحصل لو واجهت مشكلة فنية؟', a: 'عندنا فريق دعم فني متكامل متاح 24 ساعة، تقدر تتواصل معاهم من خلال زر الدعم في صفحة حسابك.' },
    { q: 'ممكن أحضر من كذا جهاز؟', a: 'للحفاظ على أمان حسابك، النظام بيسمحلك تفتح الحساب من جهازين كحد أقصى (مثلاً موبايل ولابتوب).' }
  ];

  // 🏛️ CLASSIC TEMPLATE
  if (template === 'classic') {
    return (
      <div className="min-h-screen bg-slate-50 text-right font-sans" dir="rtl">
        <nav className="bg-white border-b border-slate-200 h-16 flex items-center px-6 sticky top-0 z-[100]">
           <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
              <span className="font-black text-xl text-slate-800 tracking-tight">{settings?.instructor_name || 'أكاديمية المعلم'}</span>
              <div className="flex gap-4">
                 <Link href="/login" className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-xs" style={{ backgroundColor: primaryColor }}>دخول</Link>
              </div>
           </div>
        </nav>
        <section className="bg-white py-20 border-b border-slate-200">
           <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                 <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">{settings?.hero_title || 'تعلم بذكاء'}</h1>
                 <p className="text-slate-500 text-lg mb-10 leading-relaxed font-bold">{settings?.hero_subtitle}</p>
                 <Link href="/student/courses" className="text-white px-10 py-4 rounded-xl font-black text-lg shadow-xl shadow-slate-200 inline-block" style={{ backgroundColor: primaryColor }}>{settings?.hero_cta_text}</Link>
              </div>
              <div className="flex justify-center">
                 <img src={settings?.instructor_photo_url} className="max-h-[500px] object-contain" alt="" />
              </div>
           </div>
        </section>
        <section className="py-20 max-w-7xl mx-auto px-6">
           <h2 className="text-2xl font-black text-slate-800 mb-12 border-r-4 pr-4" style={{ borderRightColor: primaryColor }}>الكورسات المتاحة</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {courses.map(c => (
                <div key={c.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                   <h3 className="font-black text-lg mb-4">{c.name}</h3>
                   <Link href={`/student/courses/${c.id}`} className="font-black text-xs hover:underline flex items-center gap-2" style={{ color: primaryColor }}>عرض التفاصيل <FaArrowLeft size={10} /></Link>
                </div>
              ))}
           </div>
        </section>
      </div>
    );
  }

  // ⚡ MODERN TEMPLATE
  if (template === 'modern') {
    return (
      <div className="min-h-screen bg-slate-900 text-right text-white selection:bg-indigo-500" dir="rtl">
        <header className="fixed top-0 inset-x-0 h-20 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 z-[100] flex items-center px-8">
            <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
              <span className="font-black text-2xl tracking-tighter" style={{ color: primaryColor }}>{settings?.instructor_name || 'MODERN ACADEMY'}</span>
              <Link href="/student/courses" className="px-6 py-2 rounded-full font-black text-xs" style={{ backgroundColor: primaryColor }}>المواد الدراسية</Link>
            </div>
        </header>

        <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
               <span className="px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 inline-block border" style={{ backgroundColor: `${primaryColor}11`, color: primaryColor, borderColor: `${primaryColor}33` }}>Next Gen Education</span>
               <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tighter">
                 {settings?.hero_title || 'مستقبل التعليم الرقمي'}
               </h1>
               <p className="text-slate-400 text-xl font-bold mb-12 leading-relaxed">{settings?.hero_subtitle}</p>
               <Link href="/student/courses" className="px-12 py-5 rounded-2xl font-black text-xl shadow-2xl hover:opacity-90 transition-all inline-block" style={{ backgroundColor: primaryColor, shadowColor: `${primaryColor}33` }}>{settings?.hero_cta_text}</Link>
            </motion.div>
            <div className="relative group">
               <div className="absolute inset-0 blur-[120px] opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: primaryColor }}></div>
               <img src={settings?.instructor_photo_url} className="relative z-10 w-full max-h-[600px] object-contain rounded-[4rem]" alt="" />
            </div>
        </section>

        <section className="py-32 bg-slate-800/50">
           <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                 {courses.map(c => (
                   <div key={c.id} className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 hover:border-opacity-50 transition-all group" style={{ hoverBorderColor: primaryColor }}>
                      <div className="w-12 h-12 rounded-2xl mb-8 flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}><FaBolt /></div>
                      <h3 className="text-xl font-black mb-4 min-h-[56px]">{c.name}</h3>
                      <Link href={`/student/courses/${c.id}`} className="font-black text-xs group-hover:translate-x-[-10px] transition-transform flex items-center gap-2" style={{ color: primaryColor }}>ابدأ التعلم الآن <FaArrowLeft size={10} /></Link>
                   </div>
                 ))}
              </div>
           </div>
        </section>
      </div>
    );
  }

  // 🏆 ELITE TEMPLATE (Default)
  return (
    <div className="min-h-screen bg-white text-right" dir="rtl">
      
      {/* 💎 ELITE NAVBAR */}
      <motion.nav 
        style={{ backgroundColor: navBg, backdropFilter: navBlur, boxShadow: navShadow }}
        className="fixed top-0 inset-x-0 z-[100] h-20 transition-all flex items-center"
      >
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
               <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black group-hover:opacity-80 transition-opacity" style={{ backgroundColor: primaryColor }}>
                  {settings?.instructor_name?.[0] || 'N'}
               </div>
                <span className="font-black text-xl tracking-tighter text-slate-800">
                   {settings?.instructor_name ? `أ/ ${settings.instructor_name}` : (settings?.center_name || 'NEXUS ACADEMY')}
                </span>
             </Link>

            <div className="hidden md:flex items-center gap-8 font-black text-xs text-slate-500 uppercase tracking-widest">
                <Link href="/student/courses" className="hover:text-black transition-colors">الكورسات</Link>
                <a href="#features" className="hover:text-black transition-colors">ليه احنا؟</a>
                <a href="#about" className="hover:text-black transition-colors">عن المعلم</a>
            </div>

            <div className="flex items-center gap-4">
                {user ? (
                   <Link href="/student/courses" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-black transition-all shadow-xl shadow-slate-200">
                      لوحة التحكم
                   </Link>
                ) : (
                   <>
                     <Link href="/login" className="text-slate-500 font-black text-xs hover:text-black px-4">تسجيل دخول</Link>
                     <Link href="/login" style={{ backgroundColor: primaryColor }} className="text-white px-6 py-2.5 rounded-xl font-black text-xs hover:opacity-90 transition-all shadow-xl shadow-slate-200">ابدأ الآن</Link>
                   </>
                )}
            </div>
        </div>
      </motion.nav>

      {/* 🚀 ELITE HERO SECTION */}
      <section className="relative min-h-screen flex items-center pt-32 pb-24 overflow-hidden">
        {/* Layered Background */}
        <div className="absolute inset-0 bg-slate-50 -z-20"></div>
        <div 
          className="absolute top-0 right-0 w-full h-[800px] -z-10"
          style={{ 
            background: `radial-gradient(circle at 80% 20%, ${heroBgColor}22 0%, transparent 60%)` 
          }}
        ></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] -z-10"></div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative">
           
           {/* Text Block */}
           <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8 }}
             className="relative z-20 text-center lg:text-right"
           >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 mb-8 border-r-4"
                style={{ borderRightColor: primaryColor }}
              >
                  <FaRocket style={{ color: primaryColor }} className="animate-bounce" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">مستقبلك يبدأ من هنا</span>
              </motion.div>

              <h1 className="text-5xl md:text-8xl font-black leading-[1.1] text-slate-900 mb-8">
                {settings?.hero_title || (settings?.instructor_name ? `أكاديمية أ/ ${settings.instructor_name}` : 'مستقبلك التعليمي الرقمي')}
              </h1>
              
              <p className="text-lg md:text-2xl font-bold text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {settings?.hero_subtitle || `انضم لأكبر كيان تعليمي لطلاب ${courses[0]?.grade || 'جميع المراحل'} في ${settings?.instructor_subject || 'المادة'}. أحدث أساليب الشرح التفاعلي والمتابعة الذكية.`}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start">
                  <Link href="/student/courses" style={{ backgroundColor: primaryColor }} className="w-full sm:w-auto text-white px-12 py-5 rounded-3xl font-black text-xl shadow-2xl shadow-slate-200 hover:scale-105 transition-transform flex items-center justify-center gap-4 group">
                    {settings?.hero_cta_text || 'ابدأ رحلة النجاح'}
                    <FaArrowLeft className="group-hover:-translate-x-2 transition-transform" />
                  </Link>
                  <Link href="#about" className="text-slate-700 font-black flex items-center gap-3 hover:text-black transition-colors px-6">
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><FaPlayCircle size={20} style={{ color: primaryColor }} /></div>
                     شاهد نبذة عنا
                  </Link>
              </div>

              {/* Stats Indicators */}
              <div className="mt-20 flex flex-wrap justify-center lg:justify-start gap-12">
                 {(settings?.stats || [
                   { label: 'طلاب يثقون فينا', value: '+100K' },
                   { label: 'أوائل جمهورية', value: '+250' },
                   { label: 'عام من الخبرة', value: '+15' }
                 ]).map((stat, i) => (
                    <div key={i} className="text-center lg:text-right">
                       <p className="text-4xl font-black text-slate-900 mb-1">{stat.value}</p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                    </div>
                 ))}
              </div>
           </motion.div>

           {/* Image Block */}
           <motion.div
             initial={{ opacity: 0, x: -50 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 1, delay: 0.2 }}
             className="relative flex justify-center lg:justify-end"
           >
              <div className="relative w-full max-w-xl aspect-[4/5] md:h-[700px]">
                  {/* Geometric Decorations */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full blur-[100px] -z-10 animate-pulse" style={{ backgroundColor: `${primaryColor}22` }}></div>
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white shadow-2xl rounded-[3rem] p-8 hidden md:flex items-center justify-center animate-bounce-slow" style={{ color: primaryColor }}>
                      <FaAward size={64} />
                  </div>
                  
                  {/* The Photo with Gradient Fade */}
                  <div className="h-full w-full relative overflow-hidden rounded-[4rem] group">
                    {settings?.instructor_photo_url ? (
                       <>
                         <img 
                          src={settings.instructor_photo_url} 
                          className="h-full w-full object-contain filter drop-shadow-2xl z-10 relative group-hover:scale-105 transition-transform duration-700" 
                          alt="" 
                         />
                         <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white to-transparent z-20"></div>
                       </>
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center italic text-slate-400 font-bold">Photo Placeholder</div>
                    )}
                  </div>

                  {/* Floating Badge */}
                  <div className="absolute bottom-10 -left-10 bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 z-30 max-w-xs flex items-center gap-5">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center">
                         <FaCheckCircle size={32} />
                      </div>
                      <div>
                         <p className="font-black text-slate-800 text-lg leading-tight">معتمد وموثوق</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Certified Educator</p>
                      </div>
                  </div>
              </div>
           </motion.div>
        </div>
      </section>

      {/* 🌀 SUCCESS MARQUEE */}
      <div style={{ backgroundColor: secondaryColor }} className="py-6 overflow-hidden flex whitespace-nowrap border-y border-white/5">
        <div className="flex animate-marquee gap-24 items-center">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex gap-24 items-center">
                <span className="text-white/20 text-3xl font-black uppercase italic">
                  {settings?.marquee_text || 'The Legend Academy • Top Ranked in Egypt 2026 • Innovative Future •'}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* 🛡️ WHY US SECTION (Enhanced Benefit Grid) */}
      <section id="features" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              {/* Header Block */}
              <div className="lg:col-span-1">
                 <p style={{ color: primaryColor }} className="font-black text-xs uppercase tracking-[0.3em] mb-4">لماذا نحن الخيار الأول؟</p>
                 <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
                    {settings?.instructor_name ? `ليه تشترك في أكاديمية أ/ ${settings.instructor_name}؟` : 'بنطوع المنهج عشان يكون أسهل ليك'}
                 </h2>
                 <p className="text-slate-500 font-bold leading-relaxed mb-10">
                    {settings?.instructor_subject ? `مادة ${settings.instructor_subject} مش بس قوانين، دي طريقة تفكير. هنا بنتعلم إزاي نحل بذكاء وبأقل مجهود ممكن.` : 'الرياضيات أو أي مادة تانية مش بس قوانين، دي طريقة تفكير. هنا بنتعلم إزاي نحل بذكاء وبأقل مجهود ممكن.'}
                 </p>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 text-slate-800">
                       <FaShieldAlt style={{ color: primaryColor }} />
                       <span className="font-black text-xs uppercase tracking-widest">أمان كامل للبيانات</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-800">
                       <FaLaptopCode style={{ color: primaryColor }} />
                       <span className="font-black text-xs uppercase tracking-widest">أحدث تقنيات البث والأسئلة</span>
                    </div>
                 </div>
              </div>

              {/* Grid Block */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                {(settings?.features || [
                  { title: 'شرح بسيط ومفهوم', desc: 'تبسيط أصعب المعلومات بأسلوب سلس يخليك تفهم قبل ما تحفظ.' },
                  { title: 'بنك أسئلة عالمي', desc: 'أسئلة وتدريبات تغطي كافة الأفكار المتوقعة في الامتحان.' },
                  { title: 'متابعة لا تنام', desc: 'فريق عمل متأهب للرد على استفساراتك الأكاديمية خلال لحظات.' },
                  { title: 'تقارير أداء ذكية', desc: 'اعرف نقاط قوتك وضعفك من خلال تحليل ذكي لنتائج اختباراتك.' }
                ]).map((feat, i) => (
                  <motion.div 
                    key={i}
                    viewport={{ once: true }}
                    whileHover={{ y: -10 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-100 transition-all group"
                  >
                     <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-900 font-black text-2xl mb-8 shadow-sm group-hover:text-white transition-colors duration-500 overflow-hidden" style={{ hoverBackgroundColor: primaryColor }}>
                        {feat.icon_url ? (
                           <img src={feat.icon_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                           i + 1
                        )}
                     </div>
                     <h3 className="text-2xl font-black text-slate-900 mb-4">{feat.title}</h3>
                     <p className="text-slate-500 font-bold text-sm leading-relaxed">{feat.desc}</p>
                  </motion.div>
                ))}
              </div>
           </div>
        </div>
      </section>

      {/* 👨‍🏫 TEACHER STORY (Elite About) */}
      <section id="about" className="py-40 bg-white">
          <div className="max-w-7xl mx-auto px-6">
              <div className="rounded-[5rem] overflow-hidden flex flex-col lg:flex-row relative" style={{ backgroundColor: secondaryColor }}>
                 {/* Decorative Icon */}
                 <FaQuoteRight className="absolute top-20 right-20 text-white/5 text-[15rem] -rotate-12 pointer-events-none" />
                 
                 {/* Content Side */}
                 <div className="flex-1 p-12 md:p-24 relative z-10 flex flex-col justify-center">
                    <p style={{ color: primaryColor }} className="font-black text-xs uppercase tracking-[0.5em] mb-8">كلمة من القلب</p>
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-10 leading-tight">
                       " {settings?.about_title || 'إحنا مش بس بنشحن، إحنا بنبني عقول'} "
                    </h2>
                    <p className="text-white/60 text-lg md:text-xl font-bold leading-relaxed mb-12 max-w-xl">
                       {settings?.about_description || 'رؤيتنا دايماً هي تطوير شكل التعليم في مصر، وجعل الطالب المصري قادر على المنافسة عالمياً من خلال فهم حقيقي مش مجرد حفظ.'}
                    </p>

                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
                          <img src={settings?.instructor_photo_url} className="w-full h-full object-cover" alt="" />
                       </div>
                       <div>
                          <p className="text-2xl font-black text-white mb-1">{settings?.instructor_name ? `أ/ ${settings.instructor_name}` : 'أستاذ المادة'}</p>
                          <p className="text-xs text-white/40 font-black uppercase tracking-widest">{settings?.instructor_title || 'Expert Educator'}</p>
                       </div>
                    </div>
                 </div>

                 {/* Visual Side */}
                 <div className="flex-1 min-h-[500px] relative">
                    <div className="absolute inset-x-0 bottom-0 top-0 lg:top-20 bg-white/5 rounded-t-[5rem] mx-10 lg:ml-20 lg:mr-0">
                        {settings?.lifestyle_photo_url ? (
                           <img src={settings.lifestyle_photo_url} className="w-full h-full object-cover rounded-t-[5rem]" alt="" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center"><FaImage className="text-white/10" size={100} /></div>
                        )}
                    </div>
                 </div>
              </div>
          </div>
      </section>

      {/* ❓ ELITE FAQ SECTION */}
      <section className="py-32 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
           <div className="text-center mb-16">
              <FaQuestionCircle className="mx-auto mb-6" style={{ color: primaryColor }} size={48} />
              <h2 className="text-4xl font-black text-slate-800">أسئلة شائعة (FAQ)</h2>
              <p className="text-slate-400 font-bold mt-2 italic">كل اللي محتاج تعرفه قبل ما تخوض التجربة</p>
           </div>

           <div className="space-y-4">
              {(settings?.faqs && settings.faqs.length > 0 ? settings.faqs : FAQS).map((faq, i) => (
                <div key={i} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                   <button 
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full p-8 text-right flex items-center justify-between group"
                   >
                       <span className={`text-lg font-black transition-colors ${activeFaq === i ? 'opacity-100' : 'text-slate-800'}`} style={{ color: activeFaq === i ? primaryColor : undefined }}>{faq.q}</span>
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeFaq === i ? 'text-white rotate-180' : 'bg-slate-50 text-slate-300'}`} style={{ backgroundColor: activeFaq === i ? primaryColor : undefined }}>
                          <FaChevronLeft size={14} />
                       </div>
                   </button>
                   <AnimatePresence>
                     {activeFaq === i && (
                       <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                       >
                         <div className="p-8 pt-0 text-slate-500 font-bold leading-relaxed border-t border-slate-50">
                            {faq.a}
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* 📞 ELITE FOOTER - Simplified */}
      <footer style={{ backgroundColor: secondaryColor }} className="pt-20 pb-10 text-white">
         <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12 border-b border-white/5 pb-10">
               
               {/* Branding */}
               <div className="max-w-md text-right">
                  <h2 className="text-3xl font-black mb-4 text-white tracking-tighter">
                    {settings?.instructor_name ? `أ/ ${settings.instructor_name}` : 'NEXUS'}<span style={{ color: primaryColor }}>.</span>
                  </h2>
                  <p className="text-white/40 text-sm font-bold leading-relaxed">
                     {settings?.instructor_name 
                      ? `المنصة الرسمية لـ أ/ ${settings.instructor_name} لتقديم أفضل تجربة تعليمية في مصر.`
                      : 'تجربة تعليمية تتخطى الحدود بأحدث التقنيات.'}
                  </p>
               </div>

               {/* Simple Contact & Social */}
               <div className="flex flex-col items-start md:items-end gap-6 w-full md:w-auto">
                  <div className="flex items-center gap-4">
                     {(settings?.social_links || [
                       { platform: 'youtube', url: '#' },
                       { platform: 'facebook', url: '#' },
                       { platform: 'whatsapp', url: '#' }
                     ]).map((social, i) => (
                        <a key={i} href={social.url} target="_blank" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/50 transition-all hover:bg-white/10" style={{ hoverColor: primaryColor }}>
                           {getSocialIcon(social.platform)}
                        </a>
                     ))}
                  </div>
                  <div className="flex flex-col md:items-end gap-1">
                     <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">الدعم الفني</span>
                     <span className="text-xl font-black tracking-tighter text-white" dir="ltr">{settings?.support_phone || '+20 123 456 789'}</span>
                  </div>
               </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 opacity-30 text-[9px] font-black uppercase tracking-[0.4em]">
               <p>© {new Date().getFullYear()} Classora Smart Management System</p>
               <div className="flex gap-8">
                  <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                  <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
               </div>
            </div>
         </div>
      </footer>

      {/* 🪄 GLOBAL ANIMATION OVERLAY */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        ::selection {
          background: ${primaryColor};
          color: white;
        }
      `}</style>
    </div>
  );
}

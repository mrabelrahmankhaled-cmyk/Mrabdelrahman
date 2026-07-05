'use client';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Users, 
  ShieldAlert, 
  ClipboardCheck, 
  LayoutDashboard, 
  MessageCircle, 
  MessageSquare, 
  IdCard, 
  BarChart3 
} from 'lucide-react';

const features = [
  {
    title: "متجر متكامل (Store)",
    description: "إدارة كاملة للمخازن، بيع الكتب، المذكرات، والأدوات المكتبية مع جرد آلي وتقارير أرباح.",
    icon: <ShoppingCart className="w-8 h-8 text-orange-500" />,
    badge: "المخازن والمبيعات"
  },
  {
    title: "منصة الطالب وولي الأمر",
    description: "تطبيقات مخصصة للطالب لمتابعة حصصه، وتطبيقات لأولياء الأمور لمتابعة غياب ودرجات أولادهم لحظة بلحظة.",
    icon: <Users className="w-8 h-8 text-emerald-500" />,
    badge: "بوابات ذكية"
  },
  {
    title: "الرقابة الأمنية (Security)",
    description: "نظام مراقبة متطور لمنع التلاعب في الحسابات أو تسجيل حضور وهمي، مع سجل كامل لكل حركة في السيستم.",
    icon: <ShieldAlert className="w-8 h-8 text-red-500" />,
    badge: "أمان مطلق"
  },
  {
    title: "نظام اختبارات ذكي",
    description: "أنشئ اختباراتك، سجل الدرجات، والسيستم هيقارن مستويات الطلاب آلياً ويعرفك مين محتاج اهتمام أكتر.",
    icon: <ClipboardCheck className="w-8 h-8 text-blue-500" />,
    badge: "الجانب الأكاديمي"
  },
  {
    title: "داشبورد الموظف الذكي",
    description: "لوحة تحكم للموظفين مصممة لزيادة الإنتاجية وتقليل الأخطاء البشرية في إدخال البيانات.",
    icon: <LayoutDashboard className="w-8 h-8 text-cyan-500" />,
    badge: "كفاءة الموظفين"
  },
  {
    title: "شات مباشر ودعم",
    description: "تواصل مباشر بين الإدارة وأولياء الأمور لحل المشاكل والاستفسارات داخل السيستم بكل سهولة.",
    icon: <MessageCircle className="w-8 h-8 text-purple-500" />,
    badge: "تواصل فعال"
  },
  {
    title: "تكامل الواتساب آلي",
    description: "إرسال رسائل حضور وغياب وتنبيهات مادية مباشرة على واتساب ولي الأمر بدون تدخل يدوي.",
    icon: <MessageSquare className="w-8 h-8 text-green-500" />,
    badge: "WhatsApp API"
  },
  {
    title: "إنشاء كارنيهات الطلاب",
    description: "بضغطة زر، السيستم بيصدر كارنيه احترافي لكل طالب عليه الـ QR Code الخاص به للتحضير السريع.",
    icon: <IdCard className="w-8 h-8 text-indigo-500" />,
    badge: "هوية الطالب"
  },
  {
    title: "تقارير شاملة (Analytics)",
    description: "تقرير مفصل لكل طالب يوضح مستواه التعليمي، حضوره، والتزامه المادي خلال السنة بالكامل.",
    icon: <BarChart3 className="w-8 h-8 text-amber-500" />,
    badge: "بيانات دقيقة"
  },
];

export const Features = () => {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-6"
            dir="rtl"
          >
            نظام واحد.. إمكانيات لانهائية
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
            dir="rtl"
          >
            كل اللي يحتاجه سنترك <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">في مكان واحد</span>
          </motion.h2>
          <p className="text-neutral-400 text-lg md:text-xl" dir="rtl">
            Classora مش مجرد برنامج حضور وانصراف، ده نظام إدارة متكامل لإدارة كل تفصيلة في المركز التعليمي بتاعك.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="p-8 rounded-[2.5rem] border border-white/5 bg-gradient-to-b from-white/[0.05] to-transparent hover:from-white/[0.08] transition-all group relative overflow-hidden"
              dir="rtl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-start gap-4 mb-6">
                 <div className="p-4 rounded-2xl bg-black/40 border border-white/10 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-all duration-300">
                   {feature.icon}
                 </div>
                 <div className="flex-1">
                    <div className="inline-flex px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold border border-blue-500/20 mb-2">
                      {feature.badge}
                    </div>
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{feature.title}</h3>
                 </div>
              </div>
              
              <p className="text-neutral-400 leading-relaxed text-md">
                {feature.description}
              </p>
              
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="text-blue-400 text-sm font-bold flex items-center gap-2">
                    اعرف أكتر 
                    <span className="text-lg">←</span>
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

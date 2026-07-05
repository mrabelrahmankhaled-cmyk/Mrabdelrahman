'use client';
import { motion } from 'framer-motion';
import { ShoppingCart, MessageSquare, IdCard, BarChart3, ShieldAlert, GraduationCap } from 'lucide-react';

const deepDives = [
  {
    title: "المتجر والعهدة (Store)",
    description: "نظام كاشير متكامل لإدارة مبيعات الكتب والملازم والأدوات. جرد فوري، تقارير أرباح، وتنبيهات بنقص المخزون.",
    icon: <ShoppingCart className="w-10 h-10 text-orange-400" />,
    stats: "جرد آلي 100%",
    color: "from-orange-500/20 to-orange-500/5",
    borderColor: "border-orange-500/20"
  },
  {
    title: "تكامل الواتساب (WhatsApp)",
    description: "وداعاً للرسائل اليدوية. السيستم بيبعت رسالة فورية لولي الأمر (حضر، غاب، دفع، امتحن) مباشرة على الواتساب.",
    icon: <MessageSquare className="w-10 h-10 text-green-400" />,
    stats: "+10K رسالة يومياً",
    color: "from-green-500/20 to-green-500/5",
    borderColor: "border-green-500/20"
  },
  {
    title: "كارنيه الطالب الذكي",
    description: "تصميم وإصدار كارنيهات احترافية بـ QR Code بضغطة زر واحدة. تحضير آلاف الطلاب في دقائق.",
    icon: <IdCard className="w-10 h-10 text-indigo-400" />,
    stats: "تحضير في 0.5 ثانية",
    color: "from-indigo-500/20 to-indigo-500/5",
    borderColor: "border-indigo-500/20"
  },
  {
    title: "تقارير الطالب الشاملة",
    description: "ملف كامل لكل طالب بيجمع (حضور، درجات، مديونيات، ملاحظات). ولي الأمر بيشوف تطور ابنه برسم بياني.",
    icon: <BarChart3 className="w-10 h-10 text-blue-400" />,
    stats: "تحليل ذكي للمستوى",
    color: "from-blue-500/20 to-blue-500/5",
    borderColor: "border-blue-500/20"
  },
  {
    title: "الرقابة والأمان (Security)",
    description: "نظام مراقبة لكل حركة بيعملها الموظف. بنمنع أي تلاعب في الحسابات أو حذف بيانات بدون إذن.",
    icon: <ShieldAlert className="w-10 h-10 text-red-400" />,
    stats: "أمان بنكي للداتا",
    color: "from-red-500/20 to-red-500/5",
    borderColor: "border-red-500/20"
  },
  {
    title: "أنظمة تعليمية متطورة",
    description: "امتحانات، بنك أسئلة، وتوزيع طلاب على المجموعات بذكاء. بنوفر وقت المدرس عشان يركز في الشرح وبس.",
    icon: <GraduationCap className="w-10 h-10 text-cyan-400" />,
    stats: "تطوير أكاديمي مستمر",
    color: "from-cyan-500/20 to-cyan-500/5",
    borderColor: "border-cyan-500/20"
  }
];

export const DeepDive = () => {
  return (
    <section className="py-32 bg-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-24" dir="rtl">
           <motion.span 
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             className="text-blue-500 font-bold tracking-widest uppercase text-sm mb-4 block"
           >
             Professional Tools
           </motion.span>
           <motion.h2 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             className="text-4xl md:text-6xl font-bold text-white mb-8"
           >
             أدوات احترافية <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">تليق بمكانتك</span>
           </motion.h2>
           <p className="text-neutral-500 text-xl max-w-2xl mx-auto">
             كل ميزة في Classora تم تطويرها بعناية لتلبية احتياجات أكبر السناتر التعليمية في مصر.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {deepDives.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-10 rounded-[3rem] border ${item.borderColor} bg-gradient-to-br ${item.color} group hover:scale-[1.02] transition-all duration-500`}
              dir="rtl"
            >
              <div className="mb-8 p-6 rounded-3xl bg-black/40 border border-white/5 w-fit group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
              <p className="text-neutral-400 leading-relaxed mb-8 text-lg">
                {item.description}
              </p>
              <div className="flex items-center justify-between">
                 <span className="text-sm font-bold text-white/50">{item.stats}</span>
                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <span className="text-white">←</span>
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

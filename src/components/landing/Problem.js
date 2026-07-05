'use client';
import { motion } from 'framer-motion';
import { XCircle, Clock, MessageSquareOff } from 'lucide-react';

const problems = [
  {
    title: "فوضى الحسابات",
    description: "مش عارف مين دفع ومين عليه فلوس؟ المديونيات بتكتر والورق بيضيع.",
    icon: <XCircle className="w-8 h-8 text-red-500" />,
    label: "خسارة فلوس"
  },
  {
    title: "تضييع الوقت",
    description: "نص الحصة بيضيع في الغياب والنداء بالأسماء؟ الوقت ده بفلوس لسنترك وللمدرس.",
    icon: <Clock className="w-8 h-8 text-orange-500" />,
    label: "مجهود مهدر"
  },
  {
    title: "شكاوى أولياء الأمور",
    description: "ولي الأمر بيزعل لما ميعرفش مستوى ابنه أو غيابه غير متأخر. التواصل اليدوي صعب.",
    icon: <MessageSquareOff className="w-8 h-8 text-red-400" />,
    label: "صداع مستمر"
  }
];

export const Problem = () => {
  return (
    <section className="py-24 bg-neutral-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-bold text-white mb-6"
            dir="rtl"
          >
            لسه بتضيع وقتك وفلوسك في الورق؟
          </motion.h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100px" }}
            className="h-1.5 bg-red-600 mx-auto rounded-full"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-8 rounded-3xl border border-white/5 bg-white/5 relative group"
              dir="rtl"
            >
              <div className="absolute top-4 left-4 px-3 py-1 bg-red-500/10 text-red-500 text-xs rounded-full border border-red-500/20">
                {item.label}
              </div>
              <div className="mb-6 p-4 rounded-2xl bg-black/50 border border-white/10 w-fit group-hover:border-red-500/50 transition-colors">
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
              <p className="text-neutral-400 leading-relaxed text-lg">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
        
        {/* Solution Bridge Animation */}
        <motion.div 
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           className="mt-20 p-8 rounded-3xl bg-blue-600/10 border border-blue-600/20 text-center"
           dir="rtl"
        >
           <h3 className="text-2xl font-bold text-blue-400 mb-2">Classora.. مديرك المالي والإداري الشاطر</h3>
           <p className="text-neutral-300">مش مجرد سيستم، ده شريك نجاحك. صممناه خصيصاً عشان يحل كل مشاكل السناتر في مصر.</p>
        </motion.div>
      </div>
    </section>
  );
};

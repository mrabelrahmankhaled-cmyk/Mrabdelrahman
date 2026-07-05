'use client';
import { motion } from 'framer-motion';

const stats = [
  { value: "+50,000", label: "طالب نشط يومياً", icon: "💎" },
  { value: "+100", label: "خبير تعليمي يثق بنا", icon: "🎖️" },
  { value: "0.01s", label: "سرعة استجابة النظام", icon: "🚀" },
  { value: "+1M", label: "عملية مالية ناجحة", icon: "💰" },
];

export const SocialProof = () => {
  return (
    <section className="py-24 bg-neutral-950 relative border-y border-white/5">
       <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4" dir="rtl">شركاء النجاح</h2>
            <p className="text-neutral-500" dir="rtl">أرقام تعكس الثقة والقوة التقنية لـ Classora</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
             {stats.map((stat, idx) => (
                <motion.div
                   key={idx}
                   initial={{ opacity: 0, scale: 0.9 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   transition={{ delay: idx * 0.1 }}
                   className="text-center p-6"
                   dir="rtl"
                >
                   <div className="text-4xl mb-4">{stat.icon}</div>
                   <div className="text-4xl md:text-5xl font-bold text-blue-500 mb-2">{stat.value}</div>
                   <div className="text-neutral-400 font-medium">{stat.label}</div>
                </motion.div>
             ))}
          </div>
       </div>
    </section>
  );
};

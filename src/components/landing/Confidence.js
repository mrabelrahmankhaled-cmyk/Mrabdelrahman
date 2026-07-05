'use client';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Trophy, Heart } from 'lucide-react';

const stats = [
  { label: "دقة في البيانات", value: "100%", icon: <ShieldCheck className="w-5 h-5" /> },
  { label: "سرعة في التحضير", value: "0.2s", icon: <Zap className="w-5 h-5" /> },
  { label: "طلاب مسجلين", value: "+50K", icon: <Trophy className="w-5 h-5" /> },
  { label: "سنتر تعليمي", value: "+50", icon: <Heart className="w-5 h-5" /> },
];

export const Confidence = () => {
  return (
    <section className="py-24 bg-neutral-950 border-y border-white/5 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          
          <div className="flex-1 text-right" dir="rtl">
            <motion.h2 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="text-4xl md:text-5xl font-bold text-white mb-6"
            >
              ليه السناتر الكبيرة بتختار <br />
              <span className="text-blue-500">Classora؟</span>
            </motion.h2>
            <p className="text-xl text-neutral-400 mb-8 leading-relaxed">
              إحنا مش بس بنقدملك برنامج، إحنا بنصمم لك تجربة إدارة تعيشك في المستقبل. نظامنا مبني على ثقة مئات المدرسين اللي قدروا يوفروا ساعات من مجهودهم وفلوسهم بفضل أدواتنا الذكية.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                   className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-colors"
                >
                  <div className="text-blue-500 mb-3">{stat.icon}</div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-neutral-500">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex-1 relative">
             <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               whileInView={{ opacity: 1, scale: 1 }}
               className="relative z-10 p-2 rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_0_100px_rgba(37,99,235,0.3)] rotate-3 hover:rotate-0 transition-transform duration-700"
             >
                <div className="bg-black rounded-[2.8rem] p-10 text-center">
                   <div className="text-6xl mb-6">🔒</div>
                   <h3 className="text-3xl font-bold text-white mb-4">أمان بياناتك مسؤوليتنا</h3>
                   <p className="text-neutral-400 mb-8">نستخدم أحدث تقنيات التشفير لضمان خصوصية بيانات الطلاب والعمليات المالية في سنترك.</p>
                   <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer">
                      جرب النسخة الديمو
                   </div>
                </div>
             </motion.div>
             
             {/* Decorative background blur */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/20 blur-[120px] rounded-full"></div>
          </div>

        </div>
      </div>
    </section>
  );
};

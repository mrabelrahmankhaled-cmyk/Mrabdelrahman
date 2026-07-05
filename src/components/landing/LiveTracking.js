'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Bell, CheckCircle, Wallet } from 'lucide-react';
import { useState, useEffect } from 'react';

const notifications = [
  { id: 1, text: "تم تسجيل حضور 50 طالب في حصة مستر محمد", icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
  { id: 2, text: "ولي الأمر (أحمد) دفع قيمة الشهر", icon: <Wallet className="w-4 h-4 text-blue-500" /> },
  { id: 3, text: "تنبيه: نسبة الغياب زادت في مجموعة الساعة 4", icon: <Bell className="w-4 h-4 text-orange-500" /> },
];

export const LiveTracking = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % notifications.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-24 bg-black relative overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Content Side */}
          <div className="flex-1 text-right order-2 lg:order-1" dir="rtl">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="mb-6 inline-flex px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-bold border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              متابعة لايف
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight"
            >
              الكل تحت عينك
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl text-neutral-400 mb-10 leading-relaxed"
            >
              تابع مستوى الطلاب، درجات الامتحانات، وأداء المدرسين من تليفونك وأنت في البيت. سواء كنت في السنتر أو مسافر، سنترك الذكي معاك في كل مكان.
            </motion.p>

            <div className="space-y-6">
              {[
                { title: "تقارير مالية لحظية", desc: "شوف كل جنية دخل وخرج من السنتر في ثواني." },
                { title: "إشعارات الغياب والدرجات", desc: "رسائل تلقائية لأولياء الأمور بكل التفاصيل." },
                { title: "أداء المدرسين والمجموعات", desc: "تحليل دقيق لنمو كل مجموعة تعليمية." }
              ].map((item, i) => (
                <motion.div 
                   key={i} 
                   initial={{ opacity: 0, x: 20 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.4 + (i * 0.1) }}
                   className="flex items-start gap-4"
                >
                  <div className="mt-1 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                  <div>
                    <h4 className="text-white font-bold mb-1">{item.title}</h4>
                    <p className="text-neutral-500 text-sm">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Interactive Phone Simulation Side */}
          <div className="flex-1 relative order-1 lg:order-2">
            <div className="relative mx-auto w-[280px] h-[580px] bg-neutral-900 rounded-[3rem] border-8 border-neutral-800 shadow-2xl overflow-hidden shadow-cyan-500/10">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 rounded-b-2xl z-20"></div>
              
              {/* Screen Content */}
              <div className="absolute inset-0 bg-black p-4 flex flex-col">
                <div className="mt-10 mb-6 flex justify-between items-center px-2">
                   <div className="w-10 h-10 rounded-full bg-white/5"></div>
                   <div className="h-4 w-24 bg-white/5 rounded-full"></div>
                </div>
                
                {/* Stats Grid inside Phone */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                   <div className="p-3 bg-neutral-800/50 rounded-2xl border border-white/5">
                      <div className="text-[10px] text-neutral-500 mb-1">الطلاب اليوم</div>
                      <div className="text-lg font-bold text-white">450</div>
                   </div>
                   <div className="p-3 bg-neutral-800/50 rounded-2xl border border-white/5">
                      <div className="text-[10px] text-neutral-500 mb-1">التحصيل</div>
                      <div className="text-lg font-bold text-emerald-400">12K</div>
                   </div>
                </div>

                {/* Dashboard Chart Simulation */}
                <div className="h-40 bg-neutral-800/30 rounded-2xl border border-white/5 p-4 flex items-end gap-1.5 relative mb-6">
                   {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
                      <motion.div 
                        key={i} 
                        className="flex-1 bg-cyan-500/40 rounded-t-sm" 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.1, duration: 1 }}
                      />
                   ))}
                   <div className="absolute top-3 right-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                         <LineChart className="w-4 h-4 text-cyan-400" />
                      </div>
                   </div>
                </div>

                {/* Live Notifications Feed */}
                <div className="flex-1 space-y-3 relative">
                  <div className="text-xs text-neutral-500 mb-2 px-1">الإشعارات اللحظية</div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-white/5 border border-white/5 rounded-xl flex gap-3 items-center"
                    >
                      <div className="shrink-0">{notifications[index].icon}</div>
                      <p className="text-[11px] text-neutral-300 leading-tight text-right w-full" dir="rtl">{notifications[index].text}</p>
                    </motion.div>
                  </AnimatePresence>
                  
                  {/* Decorative static items */}
                  {[1,2].map(i => (
                    <div key={i} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex gap-3 items-center opacity-40">
                      <div className="w-4 h-4 rounded-full bg-neutral-700"></div>
                      <div className="h-2 flex-grow bg-neutral-800 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glowing backgrounds behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 blur-[100px] -z-10 rounded-full"></div>
          </div>

        </div>
      </div>
    </section>
  );
};

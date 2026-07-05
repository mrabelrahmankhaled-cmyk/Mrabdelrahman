'use client';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const plans = [
  {
    name: "باقة البداية (Starter)",
    price: "مكالمة للمبيعات",
    description: "للأعداد الصغيرة والمجموعات الخاصة.",
    features: ["إدارة الطلاب", "تسجيل حضور يدوي", "تقارير بسيطة", "دعم فني واتساب"],
    cta: "ابدأ الآن",
    popular: false
  },
  {
    name: "باقة المحترفين (Pro)",
    price: "الأكثر طلباً",
    description: "للشركات والسناتر المتوسطة (كل المميزات).",
    features: ["الغياب بـ QR Code", "إدارة مديونيات متطورة", "رسائل SMS تلقائية", "تقارير مالية شاملة", "دعم فني مباشر 24/7"],
    cta: "اختار البرو",
    popular: true
  },
  {
    name: "باقة المؤسسات (Enterprise)",
    price: "حلول مخصصة",
    description: "للأعداد الكبيرة والحلول المخصصة.",
    features: ["تعدد الفروع", "برمجة خاصة", "سيرفرات مخصصة", "مدير حساب خاص", "ربط مع أنظمة أخرى"],
    cta: "تواصل معنا",
    popular: false
  }
];

export const Pricing = () => {
  return (
    <section className="py-24 bg-black relative">
       <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" dir="rtl">باقات بسيطة وواضحة</h2>
            <p className="text-neutral-500" dir="rtl">اختار الخطة اللي تناسب حجم شغلك</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative p-8 rounded-3xl border ${plan.popular ? 'border-blue-600 bg-blue-600/5' : 'border-white/5 bg-white/5'} flex flex-col`}
                dir="rtl"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                    الأفضل قيمة
                  </div>
                )}
                
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="text-blue-500 font-bold text-xl mb-4">{plan.price}</div>
                <p className="text-neutral-400 mb-8 h-12 leading-tight">{plan.description}</p>
                
                <div className="space-y-4 mb-8 flex-grow">
                   {plan.features.map((feature, fIdx) => (
                     <div key={fIdx} className="flex items-center gap-3 text-neutral-300">
                        <Check className="w-5 h-5 text-blue-500 shrink-0" />
                        <span>{feature}</span>
                     </div>
                   ))}
                </div>

                <button className={`w-full py-4 rounded-2xl font-bold transition-all ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                   {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
       </div>
    </section>
  );
};

'use client';
import { motion } from 'framer-motion';
import { GraduationCap, User, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const portals = [
    {
        title: "بوابة الطالب",
        description: "متابعة الحصص، الواجبات، والنتائج التعليمية.",
        icon: <GraduationCap className="w-8 h-8 text-emerald-400" />,
        href: "/login",
        color: "emerald"
    },
    {
        title: "ولي الأمر",
        description: "متابعة غياب ودرجات الطلاب والمستحقات المالية.",
        icon: <User className="w-8 h-8 text-green-400" />,
        href: "/parent/login",
        color: "green"
    },
    {
        title: "الإدارة والموظفين",
        description: "لوحة التحكم الكاملة لإدارة المركز والمخازن.",
        icon: <ShieldCheck className="w-8 h-8 text-cyan-400" />,
        href: "/admin-login",
        color: "cyan"
    }
];

export const Portals = () => {
    return (
        <section className="py-24 bg-black relative">
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-3xl md:text-4xl font-bold text-white mb-4"
                        dir="rtl"
                    >
                        الدخول للأنظمة
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-neutral-500"
                        dir="rtl"
                    >
                        اختر البوابة المناسبة للوصول إلى خدماتك
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {portals.map((portal, idx) => (
                        <Link href={portal.href} key={idx} className="block">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                whileHover={{ y: -10 }}
                                className="group relative p-8 rounded-3xl border border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all overflow-hidden h-full"
                                dir="rtl"
                            >
                                <div className={`absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-all`}></div>

                                <div className="mb-6 p-4 rounded-2xl bg-black/50 border border-white/10 w-fit group-hover:border-blue-500/50 transition-colors">
                                    {portal.icon}
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">{portal.title}</h3>
                                <p className="text-neutral-400 mb-6 flex-grow">{portal.description}</p>

                                <div className="flex items-center text-white font-medium group-hover:text-blue-400 transition-colors">
                                    <span>دخول الآن</span>
                                    <span className="mr-2 group-hover:translate-x-[-4px] transition-transform">←</span>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

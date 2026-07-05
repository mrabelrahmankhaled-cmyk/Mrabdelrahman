'use client';
import { useAuth } from '../context/AuthContext';
import { FaLock } from 'react-icons/fa';
import Link from 'next/link';

export default function FeatureGuard({ featureId, children }) {
    const { allowedFeatures, loading } = useAuth();

    // 1. لو السيستم لسه بيحمل البيانات، بنعرض شاشة تحميل بسيطة
    if (loading) {
        return <div className="min-h-[60vh] flex items-center justify-center text-slate-400 font-bold animate-pulse">جاري التحقق من الصلاحيات... ⏳</div>;
    }

    // 2. لو الميزة المطلوبة مش موجودة في باقة العميل (المنع الصارم)
    if (!allowedFeatures?.includes(featureId)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <FaLock className="text-5xl" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-3">هذه الميزة غير متاحة 🔒</h2>
                <p className="text-slate-500 font-bold mb-8 max-w-md leading-relaxed">
                    عفواً، الباقة الحالية للمركز لا تتضمن صلاحية الوصول إلى هذه الصفحة. يرجى ترقية الباقة للاستفادة من كافة مميزات النظام.
                </p>
                <Link 
                    href="/admin/upgrade" /* رابط صفحة طلب الترقية (هنعملها بعدين) */
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all"
                >
                    طلب ترقية الباقة 🚀
                </Link>
            </div>
        );
    }

    // 3. لو العميل معاه الصلاحية، بنعرضله محتوى الصفحة عادي جداً
    return <>{children}</>;
}
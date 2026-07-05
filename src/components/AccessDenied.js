'use client';
import Link from 'next/link';
import { FaLock } from 'react-icons/fa';

export default function AccessDenied() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
            <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-50 text-center max-w-md w-full animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-lg shadow-red-100 rotate-3">
                    <FaLock />
                </div>
                
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-4 tracking-tight">
                    غير مصرح لك بالدخول لهذه الصفحة 🔒
                </h1>
                
                <p className="text-slate-500 font-bold mb-8 text-sm leading-relaxed">
                    يبدو أن هذا الجزء غير مفعل في باقتك الحالية أو لا تملك الصلاحية الكافية للوصول إليه.
                </p>

                <Link 
                    href="/admin/dashboard" 
                    className="inline-flex items-center justify-center px-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-black transition-all active:scale-95 group"
                >
                    <span className="border-b-2 border-transparent group-hover:border-white transition-all">العودة للرئيسية</span>
                </Link>
            </div>
        </div>
    );
}

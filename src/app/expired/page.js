'use client';
import { FaLock, FaWhatsapp } from 'react-icons/fa';

export default function ExpiredPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm">
                    <FaLock />
                </div>
                
                <h1 className="text-2xl font-black text-slate-800 mb-2">عفواً، تم إيقاف الحساب!</h1>
                
                <p className="text-slate-500 mb-8 font-bold text-sm leading-relaxed">
                    يبدو أن فترة اشتراك المركز الخاص بك قد انتهت، أو تم إيقاف الحساب مؤقتاً من قبل الإدارة. يرجى تجديد الاشتراك لاستعادة الوصول الفوري إلى بياناتك وطلابك.
                </p>
                
                {/* 🔴 غير رقم التليفون هنا لرقمك إنت عشان يتواصلوا معاك */}
                <a 
                    href="https://wa.me/201000000000" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-green-500 text-white p-4 rounded-xl font-black shadow-lg hover:bg-green-600 transition-all flex justify-center items-center gap-2"
                >
                    <FaWhatsapp className="text-xl" /> تواصل مع الدعم للتجديد
                </a>

                <div className="mt-6 pt-6 border-t border-slate-100">
                    <a href="/" className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors">
                        العودة للصفحة الرئيسية
                    </a>
                </div>
            </div>
        </div>
    );
}
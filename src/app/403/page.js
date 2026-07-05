import Link from 'next/link';
import { FaLock } from 'react-icons/fa';

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center" dir="rtl">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-200">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaLock className="text-4xl text-red-500" />
        </div>
        
        <h1 className="text-3xl font-black text-gray-800 mb-2">غير مصرح لك بالدخول</h1>
        <p className="text-gray-500 font-bold mb-8">
          عفواً، لا تملك الصلاحيات الكافية للوصول إلى هذه الصفحة.
          <br/>
          تأكد من تسجيل الدخول بالحساب الصحيح.
        </p>

        <Link href="/" className="block w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
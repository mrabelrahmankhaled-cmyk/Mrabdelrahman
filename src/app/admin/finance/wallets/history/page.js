'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase';
import { useSearchParams } from 'next/navigation';
import { 
  FaHistory, FaSearch, FaUserGraduate, FaArrowDown, 
  FaArrowUp, FaFileInvoice, FaCalendarAlt, FaPrint, FaTrashAlt, FaUserTie, FaWallet, FaStickyNote, FaCoins, FaChartLine, FaChevronRight
} from 'react-icons/fa';
import { useAuth } from '../../../../../context/AuthContext';
import { toast } from 'sonner';

export default function WalletHistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">جاري تحميل السجل...</div>}>
      <WalletHistoryContent />
    </Suspense>
  );
}

function WalletHistoryContent() {
  const { centerId } = useAuth(); // ← استخراج centerId من الـ context
  
  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);
  
  const searchParams = useSearchParams();
  const urlStudentId = searchParams.get('studentId');
  
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(urlStudentId || 'all');
  const [centerConfig, setCenterConfig] = useState(null); // لإعدادات الهيدر في الطباعة

  useEffect(() => {
    if (centerId) {
      fetchInitialData();
    }
  }, [selectedStudentId, centerId]);

const fetchInitialData = async () => {
    if (!centerId) return;
    
    setLoading(true);

    // (جديد) جلب إعدادات السنتر عشان الهيدر بتاع الطباعة
    const { data: settings } = await supabase.from('center_settings').select('*').eq('center_id', centerId).maybeSingle();
    if (settings) setCenterConfig(settings);

    // جلب الطلاب (كودك القديم)
    const { data: stData } = await supabase.from('students').select('id, name').eq('has_wallet', true).eq('center_id', centerId);
    setStudents(stData || []);

    // جلب العمليات (كودك القديم)
    let query = supabase
      .from('wallet_transactions')
      .select(`
        *,
        students ( name, unique_id, grade ),
        staff_info:staff_profiles!created_by ( full_name, email )
      `)
      .eq('center_id', centerId) // فلترة حسب المركز
      .order('created_at', { ascending: false });

    if (selectedStudentId !== 'all') {
      query = query.eq('student_id', selectedStudentId);
    }

    const { data, error } = await query;
    if (!error) setTransactions(data || []);
    setLoading(false);
};

  const filteredTransactions = transactions.filter(t => {
    const studentName = t.students?.name || '';
    const studentCode = t.students?.unique_id || '';
    const search = searchTerm.toLowerCase();
    
    return studentName.toLowerCase().includes(search) || studentCode.includes(search);
  });

  const specs = filteredTransactions; 
  const stats = useMemo(() => {
    const recharge = specs
      .filter(t => t.amount > 0)
      .reduce((acc, t) => acc + t.amount, 0);
    const deduction = specs
      .filter(t => t.amount < 0)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    
    return { recharge, deduction, count: specs.length };
  }, [specs]);

  // التحقق من وجود centerId قبل عرض المحتوى
  if (!centerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p>جاري التحقق من صلاحيات الدخول...</p>
        </div>
      </div>
    );
  }

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'recharge': return 'bg-green-100 text-green-700 border-green-200';
      case 'session_payment': return 'bg-red-100 text-red-700 border-red-200';
      case 'correction': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'recharge': return 'إيداع/شحن';
      case 'session_payment': return 'خصم حصة';
      case 'correction': return 'تعديل رصيد';
      default: return type;
    }
  };

const handlePrint = () => {
    // 1. التأكد من وجود الجدول
    const printContent = document.getElementById('printable-table');
    if (!printContent) {
        alert("خطأ: لم يتم العثور على محتوى الجدول. تأكد من أن الجدول يحمل id='printable-table'");
        return;
    }

    // 2. تجهيز البيانات للهيدر
    const currentStudent = students.find(s => s.id === selectedStudentId);
    const pageTitle = currentStudent ? `كشف حساب - ${currentStudent.name}` : 'كشف حساب مجمع';
    const dateStr = new Date().toLocaleDateString('ar-EG');

    const toastId = toast.loading('جاري تجهيز كشف الحساب للطباعة...');
    setTimeout(() => toast.dismiss(toastId), 2000);

    // 3. إنشاء الـ Iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '1200px'; // 🚨 زودنا العرض
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    // 4. كتابة المحتوى (مع CSS احترافي عشان نضمن الشكل)
    doc.open();
    doc.write(`
        <html dir="rtl">
            <head>
                <title>${pageTitle}</title>
                <style>
                    @page { size: A4; margin: 10mm; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, sans-serif; 
                        padding: 20px; 
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    }
                    
                    /* براندنج احترافي */
                    .header { 
                        text-align: center; 
                        margin-bottom: 30px; 
                        border-bottom: 3px solid ${centerConfig?.primary_color || '#2563eb'}; 
                        padding-bottom: 20px; 
                        background: white;
                        border-radius: 15px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    .header img { 
                        height: 80px; 
                        margin-bottom: 15px; 
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header h1 { 
                        margin: 0; 
                        font-size: 24px; 
                        color: ${centerConfig?.primary_color || '#2563eb'}; 
                        font-weight: 900;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                    }
                    .header p { 
                        margin: 8px 0 0; 
                        color: #64748b; 
                        font-size: 14px; 
                        font-weight: bold;
                        background: ${centerConfig?.primary_color || '#2563eb'}20;
                        padding: 8px 15px;
                        border-radius: 20px;
                        display: inline-block;
                    }
                    
                    /* معلومات التقرير */
                    .info-box { 
                        display: flex; 
                        justify-content: space-between; 
                        background: white; 
                        padding: 15px 20px; 
                        border: 2px solid ${centerConfig?.primary_color || '#2563eb'}20; 
                        border-radius: 10px; 
                        font-size: 12px; 
                        font-weight: bold; 
                        margin-top: 15px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    }
                    .info-box span {
                        background: ${centerConfig?.primary_color || '#2563eb'}10;
                        padding: 5px 10px;
                        border-radius: 5px;
                    }

                    /* شياكة احترافية */
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 20px; 
                        font-size: 11px; 
                        background: white;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    th { 
                        background: linear-gradient(135deg, ${centerConfig?.primary_color || '#2563eb'} 0%, ${centerConfig?.primary_color || '#2563eb'}dd 100%); 
                        color: white; 
                        font-weight: 800; 
                        padding: 15px 10px; 
                        border: none;
                        text-align: center;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    td { 
                        padding: 12px 8px; 
                        border-bottom: 1px solid #e2e8f0; 
                        color: #334155;
                        text-align: center;
                    }
                    tr:nth-child(even) { background: #f8fafc; }
                    tr:hover { background: ${centerConfig?.primary_color || '#2563eb'}05; }
                    
                    /* تحسينات النصوص */
                    .text-right { text-align: right !important; }
                    .font-bold { font-weight: bold; }
                    
                    /* ألوان المبالغ (محاكاة) */
                    .text-green-600 { color: #16a34a; font-weight: bold; }
                    .text-red-600 { color: #dc2626; font-weight: bold; }

                    /* إخفاء العناصر غير المرغوبة */
                    svg, button, .no-print { display: none !important; }

                    /* تحسينات إضافية */
                    .footer { 
                        text-align: center; 
                        font-size: 10px; 
                        color: #64748b; 
                        margin-top: 30px;
                        padding: 15px;
                        background: white;
                        border-radius: 10px;
                        border: 2px solid ${centerConfig?.primary_color || '#2563eb'}20;
                        page-break-inside: avoid;
                    }
                    .watermark {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 100px;
                        color: rgba(0,0,0,0.03);
                        font-weight: 900;
                        pointer-events: none;
                        z-index: -1;
                    }
                    
                    /* تجنب انقسام الصفح للخلايا الطويلة */
                    .note-text {
                        word-wrap: break-word;
                        max-width: 200px;
                        line-height: 1.4;
                    }
                    
                    /* لو الملاحظات طويلة جداً، خليها تاخد صفحة جديدة */
                    .long-content {
                        page-break-before: auto;
                        page-break-after: auto;
                        page-break-inside: avoid;
                    }
                </style>
            </head>
            <body>
                <div class="watermark">${centerConfig?.center_name || 'SYSTEM'}</div>
                
                <div class="header">
                    ${centerConfig?.logo_url ? `<img src="${centerConfig.logo_url}" />` : ''}
                    <h1>${centerConfig?.center_name || 'السنتر التعليمي'}</h1>
                    <p>تقرير مالي تفصيلي - حركات المحفظة</p>
                    
                    <div class="info-box">
                        <span>📅 التاريخ: ${dateStr}</span>
                        <span>👤 الطالب: ${currentStudent ? currentStudent.name : 'جميع الطلاب'}</span>
                        <span>📄 عدد العمليات: ${filteredTransactions.length}</span>
                    </div>
                </div>

                ${printContent.innerHTML}

                <div class="footer">
                    <strong>${centerConfig?.center_name || 'السنتر التعليمي'}</strong><br>
                    ${centerConfig?.address || ''}<br>
                    📞 ${centerConfig?.center_phone || '-'}<br>
                    <em>تم استخراج التقرير آلياً من النظام في ${dateStr} - الساعة ${new Date().toLocaleTimeString('ar-EG')}</em>
                </div>
            </body>
        </html>
    `);
    doc.close();

    // 5. التنفيذ (بدون انتظار تحميل ملفات خارجية)
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // حذف الـ Iframe بعد الانتهاء لتنظيف الذاكرة
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 1000);
    }, 500);
 };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto mb-20 md:mb-0" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 print:hidden">
        <div className="text-center md:text-right w-full md:w-auto">
          <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
            <Link 
              href="/admin/finance/wallets"
              className="group flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all active:scale-95 border border-gray-200 shadow-sm"
              title="العودة لشحن المحافظ"
            >
              <FaChevronRight className="text-xs group-hover:translate-x-1 transition-transform" />
              <span className="text-xs font-black">رجوع</span>
            </Link>
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center gap-3">
              <FaHistory className="text-blue-600 shrink-0" /> سجل حركات المحافظ
            </h1>
          </div>
          <p className="text-gray-500 font-bold mt-1 text-xs md:text-sm">تتبع عمليات الشحن والخصم لكل طالب</p>
        </div>
        <button 
          onClick={handlePrint}
          className="w-full md:w-auto bg-gray-800 text-white px-6 py-4 md:py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 text-sm md:text-base"
        >
          <FaPrint className="shrink-0" /> طباعة كشف الحساب
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 print:hidden">
        <div className="relative group">
          <FaSearch className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="بحث باسم الطالب أو الكود..."
            className="w-full h-14 p-4 pr-12 rounded-2xl border-2 border-gray-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 shadow-sm transition-all text-sm bg-white text-gray-900 appearance-none opacity-100 placeholder:text-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="w-full h-14 px-4 pr-8 rounded-2xl border-2 border-gray-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 shadow-sm bg-white font-bold text-gray-900 text-sm appearance-none transition-all cursor-pointer opacity-100"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23111827\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'left 1rem center', backgroundSize: '1.5em' }}
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
        >
          <option value="all" className="text-gray-900">كل الطلاب</option>
          {students.map(s => (
            <option key={s.id} value={s.id} className="text-gray-900">{s.name}</option>
          ))}
        </select>
      </div>

      {/* Summary Stats */}
      {!loading && filteredTransactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 print:hidden">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl">
              <FaArrowUp />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي الإيداعات</p>
              <p className="text-xl font-black text-gray-800">{stats.recharge.toLocaleString()} <span className="text-xs">ج</span></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-xl">
              <FaArrowDown />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي الخصومات</p>
              <p className="text-xl font-black text-gray-800">{stats.deduction.toLocaleString()} <span className="text-xs">ج</span></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">
              <FaChartLine />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">عدد العمليات</p>
              <p className="text-xl font-black text-gray-800">{stats.count} <span className="text-xs">عملية</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div 
          id="printable-table"
          className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-xl overflow-hidden"
        >
          <div className="max-h-[70vh] overflow-auto custom-scrollbar">
            <table className="w-full min-w-[1200px] text-right border-collapse">
            <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
              <tr className="border-b">
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 whitespace-nowrap">التاريخ والوقت</th>
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 whitespace-nowrap">اسم الطالب</th>
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 whitespace-nowrap text-center">الصف الدراسي</th>
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 whitespace-nowrap text-center">كود الطالب</th>
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 whitespace-nowrap text-center">نوع العملية</th>
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 text-center whitespace-nowrap">المبلغ</th>
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 text-center whitespace-nowrap">الرصيد بعد</th>
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 whitespace-nowrap">الموظف المسؤول</th>
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 whitespace-nowrap">البيان/الوصف</th>
                <th className="p-4 md:p-5 text-xs md:text-sm font-black text-gray-600 w-[200px] whitespace-nowrap">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="10" className="p-10 text-center text-gray-400 font-bold animate-pulse">جاري تحميل السجل...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan="10" className="p-10 text-center text-gray-400 font-bold">لا توجد حركات مسجلة حالياً</td></tr>
              ) : filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                  
                  {/* 1. التاريخ والوقت */}
                  <td className="p-4 md:p-5 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <div className="text-xs md:text-sm font-black text-gray-800 flex items-center gap-2">
                        <FaCalendarAlt className="text-blue-500 text-[10px]" />
                        {new Date(t.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </div>
                      <div className="text-[9px] md:text-[10px] font-bold text-gray-400 mr-5 italic">
                        {new Date(t.created_at).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                  </td>

                  {/* 2. اسم الطالب */}
                  <td className="p-4 md:p-5 whitespace-nowrap">
                    <div className="font-black text-gray-800 text-xs md:text-sm group-hover:text-blue-600 transition-colors">
                      {t.students?.name}
                    </div>
                  </td>

                  {/* 3. الصف الدراسي */}
                  <td className="p-4 md:p-5 whitespace-nowrap text-center">
                    <div dir="ltr" className="inline-flex flex-row-reverse items-center gap-1 px-2 py-0.5 bg-gray-100/80 text-gray-500 text-[9px] md:text-[10px] font-bold rounded-md border border-gray-200/50 shadow-sm w-fit mx-auto">
                      <span>{t.students?.grade || 'غير محدد'}</span>
                    </div>
                  </td>

                  {/* 4. كود الطالب */}
                  <td className="p-4 md:p-5 text-center whitespace-nowrap">
                    <span dir="ltr" className="px-3 py-1.5 bg-blue-50/50 text-blue-500 text-[10px] md:text-[11px] font-black font-mono rounded-md border border-blue-100/50 shadow-sm inline-block">
                      {t.students?.unique_id || '-'}
                    </span>
                  </td>

                  {/* 5. نوع العملية */}
                  <td className="p-4 md:p-5 text-center whitespace-nowrap">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-black border inline-block ${getBadgeStyle(t.type)}`}>
                      {getTypeLabel(t.type)}
                    </span>
                  </td>

                  {/* 6. المبلغ */}
                  <td className="p-4 md:p-5 text-center font-black whitespace-nowrap">
                    <div className={`flex items-center justify-center gap-1 text-sm ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.amount >= 0 ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                      {Math.abs(t.amount).toFixed(2)} ج
                    </div>
                  </td>

                  {/* 7. الرصيد بعد العملية */}
                  <td className="p-4 md:p-5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 bg-gray-50 border border-gray-200 rounded-lg py-1 px-2 w-fit mx-auto">
                          <FaWallet className="text-gray-400 text-[10px]" />
                          <span className="font-black text-gray-700 text-xs">
                             {t.balance_after !== null && t.balance_after !== undefined ? Number(t.balance_after).toFixed(2) : '-'} ج
                          </span>
                      </div>
                  </td>

                  {/* 8. الموظف المسؤول */}
                  <td className="p-4 md:p-5 whitespace-nowrap">
                     <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg w-fit border border-gray-100">
                        <FaUserTie className="text-gray-400 text-xs"/>
                        <span className="text-xs font-bold text-gray-700">
                          {t.staff_info?.full_name || t.staff_info?.email || (t.created_by ? `ID: ${String(t.created_by).substring(0,6)}...` : 'مسؤول النظام')}
                        </span>
                     </div>
                  </td>

                  {/* 9. البيان */}
                  <td className="p-4 md:p-5 whitespace-nowrap">
                    <div className="text-xs text-gray-500 font-medium italic truncate max-w-[200px]">{t.description || '---'}</div>
                  </td>

                  {/* 10. الملاحظات (جديد) */}
                  <td className="p-4 md:p-5">
                    {t.notes ? (
                      <div className="flex items-start gap-1.5 bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                          <FaStickyNote className="text-yellow-500 text-xs flex-shrink-0 mt-0.5" />
                          <span className="text-[10px] font-bold text-gray-600 leading-tight note-text whitespace-normal">{t.notes}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\:hidden { display: none !important; }
          table { width: 100% !important; border: 1px solid #eee !important; }
          th { background: #f9fafb !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
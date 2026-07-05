'use client';
import { useState, useEffect } from 'react';
import { FaPrint, FaTimes, FaUserPlus, FaTrash, FaMoneyBillWave, FaChartLine, FaUserCheck, FaCalendarCheck, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

export default function DailyReportModal({ isOpen, onClose, stats, expenses, sessions, currentUser, centerName, logoUrl }) {
  // 🔒 تثبيت التاريخ والوقت أول ما المودال يتفتح
  const [reportDate] = useState(() => new Date());
  
  // 👥 إدارة قائمة الموظفين (ميزة مهمة من كودك القديم)
  const [staffList, setStaffList] = useState([currentUser || 'المستخدم الحالي']); 
  const [newStaffName, setNewStaffName] = useState('');

  // تحديث القائمة لو المستخدم اتغير
  // ✅ صح: شيلنا الأقواس المربعة عشان React يفهم إن دي دالة تحديث State
useEffect(() => {
  if (currentUser) {
    setStaffList(prev => {
      if (prev.includes(currentUser)) return prev;
      return [currentUser, ...prev];
    });
  }
}, [currentUser]);

  // إضافة موظف يدوياً
  const addStaff = () => {
    if (newStaffName.trim()) {
      setStaffList([...staffList, newStaffName.trim()]);
      setNewStaffName('');
    }
  };

  // حذف موظف
  const removeStaff = (index) => {
    setStaffList(staffList.filter((_, i) => i !== index));
  };

  // 🧮 الحسابات المالية
  const totalRevenue = stats?.revenue || stats?.totalIncome || 0;
  
  const totalExpenses = Array.isArray(expenses)
    ? expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    : Number(expenses) || 0;

  const netCash = totalRevenue - totalExpenses;

  // إحصائيات الحصص
  const totalSessionsCount = sessions?.length || 0;
  // افتراض ان الحصص الملغاة بيبقى في اسمها كلمة "ملغاة" أو ليها حالة
  const cancelledSessionsCount = sessions?.filter(s => s.topic?.includes('ملغاة') || s.status === 'cancelled').length || 0;
  const activeSessionsCount = totalSessionsCount - cancelledSessionsCount;

  // تنسيق التاريخ والوقت
  const todayStr = reportDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = reportDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  // 🖨️ موتور الطباعة القوي (Iframe Method)
  const handlePrint = () => {
    const printElement = document.getElementById('daily-report-printable');
    if (!printElement) return;

    // تجميع الاستايلات
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(style => style.outerHTML)
        .join('');

    // إنشاء Iframe مخفي
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px'; // بعيد عن العين
    iframe.style.top = '0';
    iframe.style.width = '1000px';
    iframe.style.height = '1000px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    doc.open();
    doc.write(`
        <html dir="rtl" lang="ar">
            <head>
                <title>تقرير اليوم - ${todayStr}</title>
                ${styles}
                <style>
                    @page { size: A4; margin: 10mm; }
                    @media print {
                        html, body {
                            visibility: visible !important;
                            height: auto !important;
                            overflow: visible !important;
                            background-color: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        body * { visibility: visible !important; }
                        #daily-report-printable {
                            width: 100% !important;
                            position: static !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                        }
                        /* إخفاء أزرار التحكم في الطباعة */
                        .no-print, button, input { display: none !important; }
                        
                        /* تنسيق الجداول */
                        table { width: 100% !important; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 6px; font-size: 11px; text-align: center; }
                        thead { background-color: #f3f4f6 !important; color: black !important; font-weight: bold; }
                        
                        /* تحجيم اللوجو */
                        img { max-height: 80px !important; width: auto !important; }
                        
                        /* منع قص الصفوف */
                        tr { break-inside: avoid; }
                    }
                    body { font-family: 'Tajawal', sans-serif; padding: 20px; }
                </style>
            </head>
            <body>
                <div id="daily-report-printable">
                    ${printElement.innerHTML}
                </div>
            </body>
        </html>
    `);
    doc.close();

    // الطباعة بعد تحميل الاستايل
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 3000);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in zoom-in-95">
      
      {/* الكونتينر الرئيسي */}
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* الهيدر (أزرار التحكم - لا تطبع) */}
        <div className="bg-gray-900 p-4 flex justify-between items-center text-white shrink-0 no-print">
            <h3 className="font-bold text-lg flex items-center gap-2">🖨️ معاينة تقرير اليوم</h3>
            <button onClick={onClose} className="bg-gray-800 p-2 rounded-full hover:bg-red-500 transition"><FaTimes/></button>
        </div>

        {/* 📄 جسم التقرير (الجزء اللي هينطبع) */}
        <div id="daily-report-printable" className="flex-1 overflow-y-auto p-8 bg-white" style={{ direction: 'rtl' }}>
            
            {/* 1. الترويسة */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 mb-1">{centerName || 'Smart Center'}</h1>
                    <p className="text-gray-500 font-bold">تقرير إغلاق الوردية اليومي</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">REF: {reportDate.getTime().toString().slice(-8)}</p>
                </div>
                {logoUrl && (
                    <img src={logoUrl} alt="Logo" className="h-20 object-contain" />
                )}
                <div className="text-left">
                    <p className="font-bold text-lg text-gray-800">{todayStr}</p>
                    <p className="text-sm text-gray-500 font-mono" dir="ltr">{timeStr}</p>
                </div>
            </div>

            {/* 2. ملخص الأرقام (المالية) */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1">إيراد الحصص</p>
                    <p className="text-xl font-black text-blue-800">{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-black text-red-400 uppercase mb-1">المصروفات</p>
                    <p className="text-xl font-black text-red-800">{totalExpenses.toLocaleString()}</p>
                </div>
                <div className="bg-gray-900 text-white p-3 rounded-xl text-center shadow-md print:bg-black print:text-white print:border-2 print:border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">صافي الخزينة (كاش)</p>
                    <p className="text-xl font-black">{netCash.toLocaleString()} ج.م</p>
                </div>
            </div>

            {/* 3. الجداول التفصيلية */}
            <div className="space-y-6">
                
                {/* المصروفات */}
                {Array.isArray(expenses) && expenses.length > 0 && (
                    <div>
                        <h4 className="font-bold text-sm text-red-700 mb-2 border-b border-red-100 pb-1 flex items-center gap-2"><FaMoneyBillWave/> تفاصيل المصروفات</h4>
                        <table className="w-full text-sm text-center">
                            <thead className="bg-red-50 text-red-900">
                                <tr>
                                    <th>البند / الوصف</th>
                                    <th>المبلغ</th>
                                    <th>المسؤول</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((exp, idx) => (
                                    <tr key={idx} className="border-b">
                                        <td className="text-right pr-2">{exp.title || exp.description}</td>
                                        <td className="font-bold text-red-600">{exp.amount}</td>
                                        <td className="text-[10px] text-gray-500">
                                            <div className="font-bold text-gray-700">{exp.staff_name || '-'}</div>
                                            <div dir="ltr">{exp.created_at ? new Date(exp.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}


                {/* إحصائيات الحصص السريعة */}
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-500 border p-2 rounded-lg bg-gray-50 print:bg-white print:border-gray-300">
                    <div className="flex justify-between items-center">
                        <span><FaCheckCircle className="inline text-green-500"/> حصص ناجحة: {activeSessionsCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span><FaTimesCircle className="inline text-red-500"/> حصص ملغاة: {cancelledSessionsCount}</span>
                    </div>
                </div>
            </div>

            {/* 4. طاقم العمل (الميزة اللي طلبتها) */}
            <div className="mt-6 border-t pt-4">
                <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2"><FaUserCheck/> طاقم عمل الوردية</h4>
                
                {/* عرض القائمة */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {staffList.map((staff, idx) => (
                        <div key={idx} className="group relative bg-gray-100 px-3 py-1 rounded-md text-xs font-bold text-gray-700 border border-gray-300 flex items-center gap-2 print:bg-white print:border-black">
                            {staff}
                            {/* زر الحذف (يختفي في الطباعة) */}
                            <button 
                                onClick={() => removeStaff(idx)} 
                                className="text-red-400 hover:text-red-600 no-print opacity-0 group-hover:opacity-100 transition-opacity"
                                title="إزالة"
                            >
                                <FaTrash size={8}/>
                            </button>
                        </div>
                    ))}
                </div>

                {/* إضافة موظف (يختفي في الطباعة) */}
                <div className="flex gap-2 no-print max-w-sm">
                    <input 
                        type="text" 
                        placeholder="إضافة اسم موظف آخر..." 
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1 outline-none focus:border-blue-500"
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addStaff()}
                    />
                    <button onClick={addStaff} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-700">
                        <FaUserPlus/>
                    </button>
                </div>
            </div>

            {/* 5. الفوتر والتوقيعات */}
            <div className="mt-10 pt-6 border-t-2 border-dashed border-gray-300 flex justify-between items-end">
                <div className="text-center w-1/3">
                    <p className="font-bold text-xs mb-8">الموظف المسؤول</p>
                    <div className="border-b border-black w-2/3 mx-auto"></div>
                </div>
                
                <div className="flex flex-col items-center">
                    <QRCodeSVG value={`Report|${reportDate.toISOString()}|Net:${netCash}`} size={60} />
                    <p className="text-[8px] mt-1 text-gray-400 font-mono tracking-widest uppercase">System Generated</p>
                </div>

                <div className="text-center w-1/3">
                    <p className="font-bold text-xs mb-8">مدير المركز</p>
                    <div className="border-b border-black w-2/3 mx-auto"></div>
                </div>
            </div>

        </div>

        {/* الفوتر (زرار الطباعة) */}
        <div className="p-4 border-t bg-gray-50 flex gap-3 shrink-0 no-print">
            <button 
                onClick={handlePrint}
                className="flex-1 bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-lg"
            >
                <FaPrint /> طباعة التقرير (A4)
            </button>
            <button 
                onClick={onClose}
                className="px-6 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition"
            >
                إغلاق
            </button>
        </div>

      </div>
    </div>
  );
}
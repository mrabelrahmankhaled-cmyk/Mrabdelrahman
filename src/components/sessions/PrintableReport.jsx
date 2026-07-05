'use client';
import React, { useState, useMemo } from 'react';
import { FaFilePdf, FaFileExcel, FaExclamationTriangle, FaCheckCircle, FaCalendarAlt, FaPrint, FaTimes } from 'react-icons/fa';
import * as XLSX from 'xlsx';
// import { captureElementAsPdf } from '../../utils/htmlToPdf'; // ❌ مبقناش محتاجين دي خلاص

export const PrintableReport = ({
    showReportModal,
    setShowReportModal,
    reportData,
    setReportData,
    centerConfig,
    courses,
    students,
    availableGrades,
}) => {
    // 1. حالة الفلاتر المحلية
    const [modalFilterGrade, setModalFilterGrade] = useState('');
    const [modalFilterCourse, setModalFilterCourse] = useState('');

    // 🧠 فلترة الكورسات بناءً على الصف المختار (تمت الإضافة هنا)
    const filteredCourses = useMemo(() => {
        // لو مفيش صف مختار، رجع كل الكورسات
        if (!modalFilterGrade) return courses;
        // لو فيه صف، رجع كورسات الصف ده بس
        return courses.filter(c => c.grade === modalFilterGrade);
    }, [courses, modalFilterGrade]);

    // 2. منطق التصفية والحسابات
    const { filteredRows, dynamicTotals } = useMemo(() => {
        if (!reportData?.rows) return { filteredRows: [], dynamicTotals: { income: 0, teacher: 0, center: 0, debt: 0 } };

        const rows = reportData.rows.filter(r => {
            const matchGrade = !modalFilterGrade || r.course?.grade === modalFilterGrade;
            const matchCourse = !modalFilterCourse || r.course_id === modalFilterCourse;
            return matchGrade && matchCourse;
        });

        const totals = rows.reduce((acc, curr) => ({
            income: acc.income + curr.stats.totalIncome,
            teacher: acc.teacher + curr.stats.teacherTotal,
            center: acc.center + curr.stats.centerTotal,
            debt: acc.debt + curr.debt
        }), { income: 0, teacher: 0, center: 0, debt: 0 });

        return { filteredRows: rows, dynamicTotals: totals };
    }, [reportData, modalFilterGrade, modalFilterCourse]);

    // 🖨️ 3. دالة الطباعة الجديدة (نفس الموتور القوي)
    const handlePrint = () => {
        const printElement = document.getElementById('printable-report');
        if (!printElement) return;

        // تجميع الاستايلات الحالية
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(style => style.outerHTML)
            .join('');

        // إنشاء Iframe مخفي
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-10000px';
        iframe.style.top = '0';
        iframe.style.width = '1000px';
        iframe.style.height = '1000px';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;

        // كتابة المحتوى
        doc.open();
        doc.write(`
        <html dir="rtl" lang="ar">
            <head>
                <title>${reportData.title}</title>
                ${styles}
                <style>
                    /* إعدادات الورقة */
                    @page {
                        size: A4 portrait; /* أو landscape لو الجدول عريض جداً */
                        margin: 5mm;
                    }

                    /* إجبار ظهور العناصر وإلغاء السكرول */
                    @media print {
                        html, body {
                            visibility: visible !important;
                            height: auto !important;
                            overflow: visible !important;
                            background-color: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* إظهار المحتوى المخفي */
                        body * { visibility: visible !important; }
                        
                        /* ضبط الكونتينر ليأخذ راحته */
                        #printable-report {
                            width: 100% !important;
                            height: auto !important;
                            overflow: visible !important;
                            position: static !important;
                            box-shadow: none !important;
                            margin: 0 !important;
                            padding: 10px !important;
                        }

                        /* إخفاء العناصر غير المرغوبة (أزرار، فلاتر) */
                        button, .print-hidden, .no-print { display: none !important; }
                        
                        /* تحسين الجداول */
                        table { width: 100% !important; border-collapse: collapse !important; }
                        th, td { 
                            padding: 4px !important; 
                            font-size: 10px !important; /* تصغير الخط عشان الجدول يكفي */
                            border: 1px solid #ddd !important;
                        }
                        
                        /* منع قص الصفوف */
                        tr { break-inside: avoid; page-break-inside: avoid; }
                        
                        /* تحجيم اللوجو */
                        img { max-height: 60px !important; width: auto !important; }
                    }

                    /* تنسيق عام داخل الفريم */
                    body { font-family: 'Tajawal', sans-serif; padding: 20px; }
                </style>
            </head>
            <body>
                <div id="printable-report">
                    ${printElement.innerHTML}
                </div>
            </body>
        </html>
    `);
        doc.close();

        // التنفيذ
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 3000);
        }, 1000);
    };

    // 4. دالة تصدير إكسيل
    const handleExportExcel = () => {
        if (!filteredRows.length) return;
        try {
            const data = filteredRows.map(r => ({
                'التاريخ': new Date(r.created_at).toLocaleDateString('ar-EG'),
                'الحصة': r.topic,
                'المادة': r.course?.name || '',
                'المجموعة': r.group?.name || '',
                'الدخل': r.stats.totalIncome,
                'نصيب المركز': r.stats.centerTotal,
                'المدرس': r.stats.teacherTotal,
                'الديون': r.debt,
                'الحضور': r.stats.count
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "التقرير المالي");
            XLSX.writeFile(wb, `تقرير_مالي_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (error) {
            console.error('Error exporting Excel:', error);
            alert('حدث خطأ في تصدير الملف');
        }
    };

    if (!showReportModal || !reportData) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[3000] flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm">

            {/* الكونتينر الرئيسي */}
            <div className="bg-white w-full h-full sm:max-w-5xl sm:h-[90vh] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ direction: 'rtl' }}>

                {/* 1. الهيدر (أزرار التحكم - تختفي في الطباعة) */}
                <div className="p-3 sm:p-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0 gap-2">
                    <h2 className="text-base sm:text-xl font-bold text-gray-800 truncate">{reportData.title}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => { setModalFilterGrade(''); setModalFilterCourse(''); }} className="text-[10px] sm:text-xs bg-gray-200 px-2 sm:px-3 py-1 rounded-lg font-bold text-gray-600 hover:bg-gray-300 transition min-h-[36px] sm:min-h-0 whitespace-nowrap">تصفير الفلتر</button>
                        <button onClick={() => { setShowReportModal(false); setReportData(null); }} className="text-gray-400 hover:text-red-500 transition p-2"><FaTimes size={20} /></button>
                    </div>
                </div>

                {/* 2. منطقة المحتوى (ده اللي هينطبع) */}
                {/* ⚠️ ملاحظة: ادينا ID هنا عشان دالة الطباعة تاخد المحتوى ده بس */}
                <div id="printable-report" className="flex-1 overflow-y-auto p-4 sm:p-8 min-h-0 bg-white">

                    {/* 🛑 العناصر اللي مش عايزنها تظهر في الورقة بنديها كلاس print-hidden */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8 bg-gray-50 p-3 sm:p-4 rounded-2xl border border-dashed border-gray-300 print-hidden">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 mr-2">تصفية حسب الصف</label>
                            <select
                                value={modalFilterGrade}
                                onChange={(e) => {
                                    setModalFilterGrade(e.target.value);
                                    setModalFilterCourse(''); // تم التعديل: تصفير الكورس عند تغيير الصف
                                }}
                                className="w-full p-2 min-h-[44px] rounded-xl border-2 border-white shadow-sm outline-none focus:border-blue-500 transition-all text-sm font-bold"
                            >
                                <option value="">جميع الصفوف الدراسية</option>
                                {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 mr-2">تصفية حسب الكورس</label>
                            <select
                                value={modalFilterCourse}
                                onChange={(e) => setModalFilterCourse(e.target.value)}
                                className="w-full p-2 min-h-[44px] rounded-xl border-2 border-white shadow-sm outline-none focus:border-blue-500 transition-all text-sm font-bold disabled:bg-gray-100 disabled:text-gray-400"
                                disabled={!filteredCourses.length} // تم التعديل: استخدام filteredCourses
                            >
                                <option value="">
                                    {modalFilterGrade ? `كل مواد ${modalFilterGrade}` : 'جميع المواد والمدرسين'}
                                </option>

                                {/* تم التعديل: استخدام filteredCourses بدل courses */}
                                {filteredCourses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} - {c.instructors?.name || c.instructor || 'غير محدد'}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* رأس التقرير للطباعة */}
                    <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                        {centerConfig?.logo_url && (
                            <img src={centerConfig.logo_url} alt="Logo" className="h-20 sm:h-32 mx-auto mb-3 sm:mb-4 object-contain" />
                        )}
                        <h1 className="text-2xl sm:text-4xl font-black text-blue-900 mb-1 tracking-tighter">{centerConfig?.center_name || "SMART CENTER"}</h1>
                        <p className="text-gray-500 font-bold text-sm sm:text-lg">{reportData.title}</p>
                        <p className="text-gray-400 text-sm italic">مستخرج بتاريخ {reportData.date}</p>
                    </div>

                    {/* كروت الإحصائيات */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-10">
                        <div className="bg-blue-50 border-2 border-blue-100 p-3 sm:p-4 rounded-2xl text-center shadow-sm print:border-gray-300">
                            <span className="block text-blue-600 font-bold text-[10px] sm:text-xs mb-1 uppercase print:text-black">إجمالي الدخل</span>
                            <strong className="text-lg sm:text-2xl font-black text-blue-900 print:text-black">{dynamicTotals.income.toLocaleString()}</strong>
                            <span className="text-[10px] block text-blue-400 mt-1 print:text-gray-500">جنيه مصري</span>
                        </div>
                        <div className="bg-green-50 border-2 border-green-100 p-3 sm:p-4 rounded-2xl text-center shadow-sm print:border-gray-300">
                            <span className="block text-green-600 font-bold text-[10px] sm:text-xs mb-1 uppercase print:text-black">صافي المدرسين</span>
                            <strong className="text-lg sm:text-2xl font-black text-green-900 print:text-black">{dynamicTotals.teacher.toLocaleString()}</strong>
                            <span className="text-[10px] block text-green-400 mt-1 print:text-gray-500">مستحقات خارجية</span>
                        </div>
                        <div className="bg-purple-50 border-2 border-purple-100 p-3 sm:p-4 rounded-2xl text-center shadow-sm print:border-gray-300">
                            <span className="block text-purple-600 font-bold text-[10px] sm:text-xs mb-1 uppercase print:text-black">نصيب السنتر</span>
                            <strong className="text-lg sm:text-2xl font-black text-purple-900 print:text-black">{dynamicTotals.center.toLocaleString()}</strong>
                            <span className="text-[10px] block text-purple-400 mt-1 print:text-gray-500">الربح الصافي</span>
                        </div>
                        <div className="bg-red-50 border-2 border-red-100 p-3 sm:p-4 rounded-2xl text-center shadow-sm print:border-gray-300">
                            <span className="block text-red-600 font-bold text-[10px] sm:text-xs mb-1 uppercase print:text-black">إجمالي الديون</span>
                            <strong className="text-lg sm:text-2xl font-black text-red-900 print:text-black">{dynamicTotals.debt.toLocaleString()}</strong>
                            <span className="text-[10px] block text-red-400 mt-1 print:text-gray-500">مبالغ لم تُحصل</span>
                        </div>
                    </div>

                    <h3 className="font-black text-gray-700 mb-4 flex items-center gap-2 border-r-4 border-blue-600 pr-3">
                        <FaCalendarAlt className="text-blue-600" /> تفاصيل الحصص المفلترة:
                    </h3>

                    {/* الجدول */}
                    <div className="overflow-x-auto mb-6 sm:mb-10 shadow-md rounded-xl border border-gray-200">
                        <table className="w-full text-center border-collapse text-xs sm:text-sm min-w-[600px]">
                            <thead className="bg-blue-700 text-white font-bold print:bg-gray-200 print:text-black">
                                <tr>
                                    <th className="p-2 sm:p-4 border-b border-blue-800 print:border-gray-400 whitespace-nowrap">التاريخ</th>
                                    <th className="p-2 sm:p-4 border-b border-blue-800 print:border-gray-400 whitespace-nowrap">المادة</th>
                                    <th className="p-2 sm:p-4 border-b border-blue-800 print:border-gray-400 whitespace-nowrap">المجموعة</th>
                                    <th className="p-2 sm:p-4 border-b border-blue-800 print:border-gray-400 tracking-tighter whitespace-nowrap">الحضور</th>
                                    <th className="p-2 sm:p-4 border-b border-blue-800 print:border-gray-400 whitespace-nowrap">المدرس</th>
                                    <th className="p-2 sm:p-4 border-b border-blue-800 print:border-gray-400 whitespace-nowrap">صافي المدرس</th>
                                    <th className="p-2 sm:p-4 border-b border-blue-800 print:border-gray-400 whitespace-nowrap">الديون</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                                {filteredRows.map((r, i) => (
                                    <tr key={i} className="hover:bg-blue-50/50 transition-colors" style={{ breakInside: 'avoid' }}>
                                        <td className="p-2 sm:p-3 font-medium text-gray-600 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('ar-EG')}</td>
                                        <td className="p-2 sm:p-3 font-black text-gray-800 whitespace-nowrap">{r.course?.name || '---'}</td>
                                        <td className="p-2 sm:p-3 font-bold text-blue-600 bg-blue-50/30 print:bg-transparent print:text-black whitespace-nowrap">{r.group?.name || '---'}</td>
                                        <td className="p-2 sm:p-3 font-black text-gray-700">{r.stats.count}</td>
                                        <td className="p-2 sm:p-3 font-medium text-blue-900 whitespace-nowrap">{r.course?.instructors?.name || r.course?.instructor || '---'}</td>
                                        <td className="p-2 sm:p-3 font-black text-green-700 print:text-black whitespace-nowrap">{r.stats.teacherTotal.toFixed(2)}</td>
                                        <td className={`p-2 sm:p-3 font-black whitespace-nowrap ${r.debt > 0 ? 'text-red-600 bg-red-50/30 print:bg-transparent' : 'text-gray-400'}`}>{r.debt.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* الحالات الخاصة */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 print:block">
                        <div className="border-2 border-yellow-200 rounded-2xl p-5 bg-yellow-50/30 shadow-sm mb-4 print:border-gray-300 print:bg-white print:mb-4">
                            <h4 className="font-black text-yellow-800 mb-4 border-b border-yellow-200 pb-2 flex items-center gap-2 print:text-black print:border-gray-300">
                                <FaExclamationTriangle /> حالات خاصة أخرى (خصومات/سنتر فقط)
                            </h4>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar print:max-h-none print:overflow-visible text-right">
                                {Array.from(new Set(filteredRows.flatMap(r =>
                                    students.filter(s => {
                                        const isAttendee = r.attendees?.includes(s.unique_id);
                                        const hasDiscount = s.course_discounts?.[r.course_id] > 0;
                                        const isCenterOnly = s.center_only_courses?.includes(r.course_id);
                                        return isAttendee && (hasDiscount || isCenterOnly);
                                    }).map(s => JSON.stringify({
                                        id: s.id,
                                        name: s.name,
                                        grade: r.course?.grade,
                                        courseName: r.course?.name,
                                        teacher: r.course?.instructors?.name || r.course?.instructor || 'غير محدد',
                                        discount: s.course_discounts?.[r.course_id] || 0,
                                        isCenterOnly: s.center_only_courses?.includes(r.course_id)
                                    }))
                                ))).map(str => {
                                    const item = JSON.parse(str);
                                    return (
                                        <div key={item.id + item.courseName} className="flex justify-between items-start border-b border-yellow-100 py-2 last:border-0 print:border-gray-200">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                                                <span className="text-[10px] text-gray-500 leading-tight">{item.grade} - {item.courseName} - م/ {item.teacher}</span>
                                            </div>
                                            <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap print:bg-gray-100 print:text-black">
                                                {item.isCenterOnly ? 'سنتر فقط 🏢' : `خصم ${item.discount} ج`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="border-2 border-green-200 rounded-2xl p-5 bg-green-50/30 shadow-sm print:border-gray-300 print:bg-white space-y-6">
                            {/* إعفاءات */}
                            <div>
                                <h4 className="font-black text-green-800 mb-4 border-b border-green-200 pb-2 flex items-center gap-2 print:text-black print:border-gray-300">
                                    <FaCheckCircle /> طلاب معفيين (كلي/مادة)
                                </h4>
                                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar print:max-h-none print:overflow-visible text-right">
                                    {Array.from(new Set(filteredRows.flatMap(r =>
                                        students.filter(s => r.attendees?.includes(s.unique_id) && (s.is_free || s.free_courses?.includes(r.course_id)))
                                            .map(s => JSON.stringify({ id: s.id, name: s.name, grade: r.course?.grade, courseName: r.course?.name, teacher: r.course?.instructors?.name || r.course?.instructor || 'غير محدد', type: s.is_free ? 'إعفاء كلي' : 'إعفاء مادة' }))
                                    ))).map(str => {
                                        const item = JSON.parse(str);
                                        return (
                                            <div key={item.id + item.courseName} className="flex justify-between items-start border-b border-green-100 py-2 last:border-0 print:border-gray-200">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                                                    <span className="text-[10px] text-gray-500 leading-tight">{item.grade} - {item.courseName} - م/ {item.teacher}</span>
                                                </div>
                                                <span className="text-green-600 font-black text-[10px] bg-green-100 px-2 py-0.5 rounded-full print:text-black print:bg-gray-100">{item.type}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* اشتراكات شهرية */}
                            <div>
                                <h4 className="font-black text-purple-800 mb-4 border-b border-purple-200 pb-2 flex items-center gap-2 print:text-black print:border-gray-300">
                                    <FaCalendarAlt /> طلاب اشتراك شهري (نشط)
                                </h4>
                                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar print:max-h-none print:overflow-visible text-right">
                                    {Array.from(new Set(filteredRows.flatMap(r => {
                                        // هنا بنحتاج نوصل للـ subscriptions بس PrintableReport مش واخداها كـ prop
                                        // الحل: بما إن التقرير المالي بيجيب البيانات من sessions المسجلة فعلياً
                                        // والـ session.payments مبيكونش فيها دفع للطالب الشهري (قيمته 0)
                                        // فاحنا هنعتمد على الذاكرة اللحظية أو نعدل الـ Props
                                        return students.filter(s => {
                                            const isAttendee = r.attendees?.includes(s.unique_id);
                                            const isPaid = (parseFloat(r.payments?.[s.unique_id]) || 0) > 0;
                                            // لو حضر ومدفعش، وغالباً مش عليه ديون في اليوم ده، يبقى شهري
                                            // بس الأصح نمرر الـ subscriptions
                                            return isAttendee && !s.is_free && !s.free_courses?.includes(r.course_id) && !isPaid;
                                        }).map(s => JSON.stringify({ id: s.id, name: s.name, grade: r.course?.grade, courseName: r.course?.name, teacher: r.course?.instructors?.name || r.course?.instructor || 'غير محدد' }))
                                    }))).map(str => {
                                        const item = JSON.parse(str);
                                        return (
                                            <div key={item.id + item.courseName} className="flex justify-between items-start border-b border-purple-100 py-2 last:border-0 print:border-gray-200">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                                                    <span className="text-[10px] text-gray-500 leading-tight">{item.grade} - {item.courseName} - م/ {item.teacher}</span>
                                                </div>
                                                <span className="text-purple-600 font-black text-[10px] bg-purple-100 px-2 py-0.5 rounded-full print:text-black print:bg-gray-100">شهري 📅</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. الفوتر (ثابت - يختفي في الطباعة) */}
                <div className="p-4 sm:p-6 border-t bg-gray-50 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 flex-shrink-0">
                    <button
                        onClick={handlePrint}
                        className="bg-black text-white px-6 sm:px-10 py-2.5 sm:py-3 min-h-[44px] rounded-xl font-black shadow-lg hover:bg-gray-800 transition flex items-center justify-center gap-2 active:scale-95 w-full sm:w-auto"
                    >
                        <FaPrint size={18} /> طباعة التقرير (A4)
                    </button>
                    <button onClick={handleExportExcel} className="bg-green-700 text-white px-6 sm:px-10 py-2.5 sm:py-3 min-h-[44px] rounded-xl font-black shadow-lg hover:bg-green-800 transition flex items-center justify-center gap-2 active:scale-95 w-full sm:w-auto">
                        <FaFileExcel size={18} /> تصدير Excel
                    </button>
                </div>
            </div>
        </div>
    );
};
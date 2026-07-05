'use client';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaChalkboardTeacher, FaCheckCircle, FaPhoneAlt, FaHeadset, FaUser, FaUserGraduate } from 'react-icons/fa';

export default function PrintCardPage() {
    // ❌ تم حذف (params) و (useAuth) و (supabase) لعدم الحاجة إليهم
    
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [centerConfig, setCenterConfig] = useState(null);

    useEffect(() => {
        // ✅ التعديل هنا: قراءة البيانات من المتصفح مباشرة بدلاً من السيرفر
        // هذا يمنع "التعليق" في التبويبات الخلفية
        const storedData = localStorage.getItem('print_card_data');

        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                
                // تحديث الحالة بالبيانات المستلمة
                setStudent(parsedData.student);
                setCenterConfig(parsedData.center);
                setLoading(false);

                // تنظيف البيانات (اختياري للأمان)
                localStorage.removeItem('print_card_data');

            } catch (err) {
                console.error("Error parsing print data:", err);
                setError(true);
                setLoading(false);
            }
        } else {
            // لو مفيش بيانات (تم فتح الصفحة مباشرة دون المرور بالداشبورد)
            setError(true);
            setLoading(false);
        }
    }, []);

    // ✅ دالة الطباعة المباشرة
    const handlePrint = () => {
        window.print();
    };

    // تشغيل الطباعة تلقائياً عند جاهزية البيانات
    useEffect(() => {
        if (student) {
            const timer = setTimeout(() => {
                handlePrint();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [student]);

    // عرض حالات التحميل والخطأ
    if (error) return <div className="p-10 text-center text-red-500 font-bold">❌ عذراً، لم يتم العثور على بيانات الطالب (يرجى المحاولة من لوحة التحكم).</div>;
    if (loading) return <div className="p-10 text-center font-bold text-blue-600 animate-pulse text-xl">جاري تجهيز الكارت...</div>;

    // 👇👇👇 التصميم كما هو تماماً (لم يتم حذف أي شيء) 👇👇👇
    return (
        <>
            {/* ✅ الـ CSS الجديد */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
                
                body { 
                    font-family: 'Cairo', sans-serif;
                }
                
                * { 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                }
                
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    #id-card,
                    #id-card * {
                        visibility: visible;
                    }
                    
                    #id-card {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                    }
                    
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }
                }
            `}</style>

            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 print:bg-white p-4">
                
                <div className="mb-6 flex gap-4 print:hidden">
                    <button onClick={handlePrint} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
                        <FaHeadset /> إعادة الطباعة
                    </button>
                    <button onClick={() => window.close()} className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold">
                        إغلاق
                    </button>
                </div>

                {/* الكارنيه الرئيسي */}
                <div id="id-card" className="w-[450px] h-[270px] border-[2px] border-blue-600 rounded-2xl overflow-hidden bg-white flex flex-col text-right shadow-2xl print:shadow-none relative" dir="rtl">
                    
                    {/* Header */}
                    <div className="bg-blue-600 h-[50px] text-white flex items-center justify-between px-5 relative z-20">
                        <div className="flex items-center gap-2">
                            {centerConfig?.logo_url ? (
                                <img 
                                    src={centerConfig.logo_url} 
                                    alt="logo" 
                                    className="h-8 w-8 object-contain bg-white rounded-lg p-0.5"
                                />
                            ) : (
                                <FaChalkboardTeacher className="text-white text-xl" />
                            )}
                            <h2 className="text-[14px] font-black uppercase tracking-wider">
                                {centerConfig?.center_name || "اسم السنتر"}
                            </h2>
                        </div>
                        <div className="flex flex-col items-center border-l border-white/30 pl-3">
                             <span className="text-[8px] font-black opacity-80 leading-none">STUDENT</span>
                             <span className="text-[10px] font-bold opacity-100 uppercase">ID CARD</span>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex flex-row flex-grow relative overflow-hidden p-3 pt-1">
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                            <FaUserGraduate size={150} />
                        </div>

                        <div className="flex-[1.6] flex flex-col justify-between z-10 pr-1 h-full">
                            <div>
                                <h3 className="text-[22px] font-black text-blue-950 mb-0.5 leading-tight">{student.name}</h3>
                                <div className="flex items-center gap-2 text-blue-700 font-bold text-[11px] mb-2">
                                    <FaCheckCircle size={8} /> الصف: {student.grade}
                                </div>
                                
                                <div className="bg-white p-1 border border-gray-100 rounded shadow-sm inline-block">
                                    <img 
                                        src={`https://barcode.tec-it.com/barcode.ashx?data=${student.unique_id}&code=Code128&translate-esc=true`} 
                                        alt="Barcode"
                                        className="h-9 w-auto object-contain"
                                    />
                                    <p className="text-[8px] font-mono text-center font-bold text-gray-400 mt-0.5">{student.unique_id}</p>
                                </div>
                            </div>

                            <div className="space-y-0.5 bg-gray-50/90 p-2 rounded-xl border border-gray-100 mb-1">
                                 <div className="flex items-center justify-between text-[10px] text-gray-700 font-bold">
                                     <span className="flex items-center gap-1"><FaUser size={7} className="text-blue-500"/> موبايل الطالب:</span>
                                     <span className="font-mono">{student.phone || '---'}</span>
                                 </div>
                                 <div className="flex items-center justify-between text-[10px] text-gray-700 font-bold">
                                     <span className="flex items-center gap-1"><FaPhoneAlt size={7} className="text-green-600"/> موبايل ولي الأمر:</span>
                                     <span className="font-mono">{student.parent_phone || '---'}</span>
                                 </div>
                                 {centerConfig?.center_phone && (
                                    <div className="flex items-center justify-between text-[10px] text-red-600 font-black border-t border-gray-200 mt-1 pt-1">
                                        <span className="flex items-center gap-1"><FaHeadset size={8}/> تواصل مع السنتر:</span>
                                        <span className="font-mono">{centerConfig.center_phone}</span>
                                    </div>
                                 )}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center border-r border-dashed border-gray-200 pl-1 h-full">
                            <p className="text-[10px] font-black text-blue-600 mb-1 uppercase">بوابة الطالب</p>
                            <div className="p-1.5 bg-white border border-blue-50 rounded-xl shadow-sm">
                                <QRCodeSVG 
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/students/${student.unique_id}`} 
                                    size={80} 
                                    level={"H"} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-100 h-[30px] flex items-center justify-center border-t border-gray-200">
                        <p className="text-[10px] font-bold text-blue-600 italic">
                            {centerConfig?.report_footer || "إدارة السنتر تتمنى لكم التوفيق"}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
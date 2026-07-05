'use client';
import { useState, useEffect, use } from 'react';
import { supabase } from '../../../../lib/supabase';
import { FaWhatsapp, FaFilePdf, FaArrowRight, FaFilter, FaUsers, FaChartPie, FaHistory } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link'; // 👈 مكتبة الروابط
import StudentTimeline from '../../../../components/StudentTimeline'; // 👈 استدعاء التايم لاين
import { useAuth } from '../../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId

export default function StudentReportPage({ params }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const { centerId } = useAuth(); // ← استخراج centerId من الـ context

  // --- State ---
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]); 
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [centerConfig, setCenterConfig] = useState({
    center_name: 'Smart Center',
    primary_color: '#2563eb',
    logo_url: '',
    report_footer: 'شكراً لاهتمامكم - إدارة السنتر'
  });

  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [reportData, setReportData] = useState([]);
  const [stats, setStats] = useState({ attended: 0, absent: 0, debt: 0, totalPaid: 0 });

  // 🔥 State للتبويبات (الإضافة الجديدة)
  const [activeTab, setActiveTab] = useState('report'); 

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      if (!studentId || !centerId) return; // ← التحقق من وجود centerId
      setLoading(true);
      try {
        // 1. جلب إعدادات السنتر
        const { data: config } = await supabase
            .from('center_settings')
            .select('*')
            .eq('center_id', centerId) // ← فلترة حسب المركز
            .single();
        if (config) setCenterConfig(config);

        let studentData = null;

        // 2. البحث بالـ unique_id
        const { data: byUnique } = await supabase
          .from('students')
          .select('*')
          .eq('unique_id', studentId)
          .eq('center_id', centerId) // ← فلترة حسب المركز
          .maybeSingle();

        studentData = byUnique;

        // 3. البحث بالـ UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
        if (!studentData && isUUID) {
          const { data: byId } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .eq('center_id', centerId) // ← فلترة حسب المركز
            .maybeSingle();
          studentData = byId;
        }

        if (!studentData) {
          setStudent(null);
          setLoading(false);
          return;
        }

        setStudent(studentData);

        // 4. جلب الكورسات والحصص والمجموعات
        const [coursesRes, sessionsRes, groupsRes] = await Promise.all([
          supabase
            .from('courses')
            .select('*, instructors(id, name)')
            .eq('center_id', centerId), // ← فلترة حسب المركز
          supabase
            .from('sessions')
            .select('*')
            .eq('center_id', centerId) // ← فلترة حسب المركز
            .order('created_at', { ascending: false }),
          supabase
            .from('groups')
            .select('*')
            .eq('center_id', centerId) // ← فلترة حسب المركز
        ]);

        setCourses(coursesRes.data || []);
        setGroups(groupsRes.data || []);
        
        const enrolled = studentData.enrolled_courses || [];
        const relevantSessions = (sessionsRes.data || []).filter(s => enrolled.includes(s.course_id));
        setAllSessions(relevantSessions);

      } catch (error) {
        console.error("Error:", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId, centerId]); // ← إضافة centerId للـ dependencies

  useEffect(() => {
    if (!student || !allSessions) return;
    calculateStatsAndFilter();
  }, [selectedCourseId, allSessions, student]);

  const calculateStatsAndFilter = () => {
    let attended = 0, absent = 0, debt = 0, totalPaid = 0;

    const filtered = allSessions.filter(s => {
      const isRightCourse = selectedCourseId === 'ALL' || s.course_id === selectedCourseId;
      
      const courseJoinDateRaw = student.enrollment_dates?.[s.course_id];
      const joinDate = courseJoinDateRaw ? new Date(courseJoinDateRaw) : new Date(student.created_at);
      const sessionDate = new Date(s.created_at);
      joinDate.setHours(0, 0, 0, 0);
      sessionDate.setHours(0, 0, 0, 0);
      const isAfterJoining = sessionDate >= joinDate;

      const isPresent = s.attendees && (
        s.attendees.includes(student.unique_id) || s.attendees.includes(student.id)
      );
      const studentGroupId = student.group_ids?.[s.course_id];
      const isMyGroupSession = s.group_id === studentGroupId;
      const isCancelled = s.topic && s.topic.includes('ملغاة');

      return isRightCourse && isAfterJoining && (isMyGroupSession || isPresent || isCancelled);
    });

    const processed = filtered.map(session => {
      const isAttended = session.attendees && (
        session.attendees.includes(student.unique_id) || session.attendees.includes(student.id)
      );
      
      const course = courses.find(c => c.id === session.course_id);
      const sessionGroupInfo = groups.find(g => g.id === session.group_id);

      let sessionPrice = parseFloat(session.price) || 0;
      if (student.is_free) sessionPrice = 0;
      else if (student.course_discounts?.[session.course_id]) {
        sessionPrice = Math.max(0, sessionPrice - parseFloat(student.course_discounts[session.course_id]));
      }

      const paidAmount = parseFloat(session.payments?.[student.id] || session.payments?.[student.unique_id] || 0);
      let debtAmount = 0;

      if (isAttended) {
        attended++;
        totalPaid += paidAmount;
        if (paidAmount < sessionPrice) {
          debtAmount = sessionPrice - paidAmount;
          debt += debtAmount;
        }
      } else {
        // ✅ لا تحسب غياب للحصص الملغية
        if (!session.topic || !session.topic.includes('ملغاة')) {
          absent++;
        }
      }

      return {
        ...session,
        courseName: course?.name,
        instructor: course?.instructors?.name || course?.instructor || 'غير محدد',
        groupName: sessionGroupInfo?.name || 'مجموعة عامة',
        isAttended,
        sessionPrice,
        paidAmount,
        debtAmount,
        date: new Date(session.created_at).toLocaleDateString('ar-EG')
      };
    });

    setReportData(processed);
    setStats({ attended, absent, debt, totalPaid });
  };

  const sendWhatsApp = () => {
    if (!student?.parent_phone) return alert('لا يوجد رقم ولي أمر');
    let phone = student.parent_phone.replace(/\D/g, '');
    if (phone.startsWith('01')) phone = '20' + phone.substring(1);

    const msg = encodeURIComponent(
      `📊 *تقرير متابعة الطالب: ${student.name}*\n` +
      `🏫 سنتر: ${centerConfig.center_name}\n` +
      `✅ حضور: ${stats.attended} | ❌ غياب: ${stats.absent}\n` +
      `💰 مديونية: ${stats.debt} ج.م\n` +
      `🔗 الرابط: ${window.location.href}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

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

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">جاري تحميل التقرير...</div>;
  if (!student) return <div className="p-10 text-center text-red-500 font-bold">الطالب غير موجود</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen" dir="rtl">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <div className="flex items-start gap-4">
            {/* 🔥🔥 1. زر الرجوع الجديد 🔥🔥 */}
            <Link href="/admin/students" className="mt-1 p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition shadow-sm" title="عودة للطلاب">
                <FaArrowRight size={20} />
            </Link>
            
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaUsers style={{color: centerConfig.primary_color}} /> ملف المتابعة الأكاديمية
                </h1>
                <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">تحديث لحظي لبيانات الطالب الأكاديمية والمالية</p>
            </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button onClick={sendWhatsApp} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-600 transition shadow-lg shadow-green-100">
                <FaWhatsapp size={20} /> مشاركة التقرير
            </button>
            <button onClick={() => window.print()} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-lg" style={{backgroundColor: centerConfig.primary_color}}>
                <FaFilePdf size={18} /> طباعة / حفظ PDF
            </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0">
        
        {/* بيانات الطالب (ثابتة) */}
        <div className="flex flex-col md:flex-row justify-between items-center border-b pb-6 mb-6 gap-6">
            <div className="flex items-center gap-6">
                {centerConfig.logo_url ? (
                    <img src={centerConfig.logo_url} alt="Logo" className="w-20 h-20 object-contain" />
                ) : (
                    <div className="w-20 h-20 text-white rounded-full flex items-center justify-center text-3xl font-bold" style={{backgroundColor: centerConfig.primary_color}}>
                        {student.name.substring(0,2)}
                    </div>
                )}
                <div>
                    <h2 className="text-2xl font-bold" style={{color: centerConfig.primary_color}}>{student.name}</h2>
                    <div className="text-gray-600 mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 text-sm">
                        <p>📚 الصف: <strong>{student.grade}</strong></p>
                        <p>🆔 الكود: <span className="font-mono">{student.unique_id}</span></p>
                        <p>📞 الطالب: {student.phone}</p>
                        <p>👨‍👦 ولي الأمر: {student.parent_phone}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {courses.filter(c => student.enrolled_courses?.includes(c.id)).map(c => {
                        const gId = student.group_ids?.[c.id];
                        const gName = groups.find(g => g.id === gId)?.name;
                        return gName && (
                          <span key={c.id} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold border border-blue-100 flex items-center gap-1">
                            <FaUsers size={10}/> {c.name}: {gName}
                          </span>
                        );
                      })}
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm print:border-black">
                <QRCodeSVG value={window.location.href} size={80} level={"H"} includeMargin={true} />
                <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">رابط التقرير المباشر</p>
            </div>
        </div>

        {/* 🔥🔥 2. أزرار التبويبات (Tabs) 🔥🔥 */}
        <div className="flex gap-2 border-b border-gray-100 pb-1 mb-6 print:hidden">
            <button 
                onClick={() => setActiveTab('report')}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all text-sm ${activeTab === 'report' ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <FaChartPie /> التقرير الأكاديمي
            </button>
            <button 
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all text-sm ${activeTab === 'timeline' ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <FaHistory /> سجل النشاط (Timeline)
            </button>
        </div>

        {/* 🔥🔥 3. محتوى التقرير (يظهر فقط لو activeTab = report) 🔥🔥 */}
        <div className={activeTab === 'report' ? 'block' : 'hidden print:block'}>
            {/* الفلتر الشيك */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 print:hidden">
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <FaFilter style={{color: centerConfig.primary_color}}/> تخصيص التقرير حسب المادة:
                </label>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => setSelectedCourseId('ALL')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedCourseId === 'ALL' ? 'text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
                        style={selectedCourseId === 'ALL' ? {backgroundColor: centerConfig.primary_color} : {}}
                    >الكل</button>
                    {courses.map(course => student.enrolled_courses?.includes(course.id) && (
                        <button 
                            key={course.id}
                            onClick={() => setSelectedCourseId(course.id)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedCourseId === course.id ? 'text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
                            style={selectedCourseId === course.id ? {backgroundColor: centerConfig.primary_color} : {}}
                        >{course.name}</button>
                    ))}
                </div>
            </div>

            <div className="hidden print:block mb-4 text-center">
                <h3 className="text-xl font-bold border-b inline-block pb-1" style={{borderColor: centerConfig.primary_color}}>
                    {selectedCourseId === 'ALL' ? `تقرير شامل - ${centerConfig.center_name}` : 
                     `تقرير مادة: ${courses.find(c=>c.id === selectedCourseId)?.name} - ${centerConfig.center_name}`}
                </h3>
            </div>

            {/* إحصائيات متطورة */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border-2 text-center shadow-sm flex flex-col justify-center items-center" style={{borderColor: centerConfig.primary_color}}>
                    <p className="font-bold mb-2 text-xs" style={{color: centerConfig.primary_color}}>📈 نسبة الالتزام</p>
                    {(() => {
                        const percentage = Math.round((stats.attended / (reportData.length || 1)) * 100);
                        const isLow = percentage < 50;
                        const circleColor = isLow ? '#ef4444' : centerConfig.primary_color; 
                        return (
                            <div className="relative w-16 h-16 flex items-center justify-center mb-1">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-gray-100" />
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="transparent" strokeDasharray={176} strokeDashoffset={176 - (176 * (stats.attended / (reportData.length || 1)))} style={{ color: circleColor }} className="transition-all duration-1000" />
                                </svg>
                                <span className="absolute text-lg font-black" style={{ color: circleColor }}>{percentage}%</span>
                            </div>
                        );
                    })()}
                </div>

                <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                    <p className="text-green-800 font-bold mb-1">✅ الحضور</p>
                    <p className="text-3xl font-black text-green-600">{stats.attended} <span className="text-xs font-normal">حصة</span></p>
                </div>

                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                    <p className="text-red-800 font-bold mb-1">❌ الغياب</p>
                    <p className="text-3xl font-black text-red-600">{stats.absent} <span className="text-xs font-normal">حصة</span></p>
                </div>

                <div className={`p-4 rounded-xl border-2 text-center shadow-md transition-all ${stats.debt > 0 ? 'bg-orange-50 border-orange-400 animate-pulse print:animate-none' : 'bg-blue-50 border-blue-100'}`} style={stats.debt === 0 ? {borderColor: centerConfig.primary_color} : {}}>
                    <p className={`${stats.debt > 0 ? 'text-orange-800' : ''} font-bold mb-1`} style={stats.debt === 0 ? {color: centerConfig.primary_color} : {}}>
                        {stats.debt > 0 ? '⚠️ مديونية حالية' : '💰 الموقف المالي'}
                    </p>
                    <p className={`text-3xl font-black ${stats.debt > 0 ? 'text-orange-600' : ''}`} style={stats.debt === 0 ? {color: centerConfig.primary_color} : {}}>
                        {stats.debt} <span className="text-sm font-normal">ج.م</span>
                    </p>
                </div>
            </div>

            {/* سجل الحصص */}
            <div>
                <h3 className="text-lg font-bold text-gray-700 mb-4 border-r-4 pr-3" style={{borderColor: centerConfig.primary_color}}>
                    سجل الحصص {selectedCourseId !== 'ALL' && '(مفلتر)'}
                </h3>
                {reportData.length === 0 ? (
                    <p className="text-center text-gray-500 py-8 bg-gray-50 rounded border border-dashed text-sm">
                        لا يوجد سجل حصص حالياً.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700 border-b border-gray-300">
                                    <th className="p-3 border">التاريخ</th>
                                    <th className="p-3 border">الحصة / المادة</th>
                                    <th className="p-3 border text-center">الحالة</th>
                                    <th className="p-3 border text-center">الماليات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 border-b">
                                        <td className="p-3 border text-gray-500">{item.date}</td>
                                        <td className="p-3 border">
                                            <div className="font-bold">{item.topic}</div>
                                            <div className="text-[10px] text-gray-400">
                                                {item.courseName} - {item.instructor} | م: <span className="font-bold text-blue-600">{item.groupName}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 border text-center">
                                            {item.isAttended ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold">حضر</span>
                                            ) : item.topic && item.topic.includes('ملغاة') ? (
                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold">ملغاة</span>
                                            ) : (
                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold">غياب</span>
                                            )}
                                        </td>
                                        <td className="p-3 border text-center font-bold">
                                            {item.isAttended ? (
                                                item.debtAmount > 0 ? <span className="text-red-600">-{item.debtAmount} ج</span> : <span className="text-green-600">✔</span>
                                            ) : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer الطباعة الديناميكي */}
            <div className="hidden print:flex mt-12 justify-between text-gray-500 text-[10px] border-t pt-4 font-bold">
                <p>{centerConfig.report_footer}</p>
                <div className="text-center">
                    <p>إدارة: {centerConfig.center_name}</p>
                    <p>{new Date().toLocaleString('ar-EG')}</p>
                </div>
            </div>
        </div>

        {/* 🔥🔥 4. محتوى التايم لاين الجديد (يظهر فقط لو activeTab = timeline) 🔥🔥 */}
        {activeTab === 'timeline' && (
            <div className="animate-in fade-in duration-300 print:hidden">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex items-center gap-3">
                    <FaHistory className="text-blue-500 text-xl"/>
                    <div>
                        <h3 className="font-bold text-blue-800">سجل الأحداث الكامل (Timeline)</h3>
                        <p className="text-xs text-blue-600">تاريخ الطالب الكامل منذ التسجيل، يشمل التعديلات والمدفوعات والإجراءات الإدارية.</p>
                    </div>
                </div>
                <StudentTimeline studentId={student.id} />
            </div>
        )}

      </div>
    </div>
  );
}
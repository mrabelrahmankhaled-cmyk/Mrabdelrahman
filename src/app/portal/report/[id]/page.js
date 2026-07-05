'use client';
import { useState, useEffect, use } from 'react';
import { supabase } from '../../../../lib/supabase-browser';
import { FaFilePdf, FaFilter, FaUsers, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaGraduationCap, FaPhoneAlt, FaBuilding, FaMapMarkerAlt, FaGlobe, FaWhatsapp, FaStamp } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

export default function StudentReportPage({ params }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;

  // --- State ---
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]); 
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [centerConfig, setCenterConfig] = useState({
    center_name: 'منصة الأستاذ عبدالرحمن خالد',
    primary_color: '#264653',
    logo_url: '',
    report_footer: 'شكراً لاهتمامكم - إدارة المنصة',
    address: '',
    center_phone: ''
  });

  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [reportData, setReportData] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [stats, setStats] = useState({ attended: 0, absent: 0, debt: 0, totalPaid: 0 });

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) return;
      setLoading(true);
      try {
        // --- 1. Fetch Student FIRST to get center_id ---
        let studentData = null;
        const { data: byUnique } = await supabase
          .from('students')
          .select('*')
          .eq('unique_id', studentId)
          .maybeSingle();
        studentData = byUnique;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
        if (!studentData && isUUID) {
          const { data: byId } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .maybeSingle();
          studentData = byId;
        }

        if (!studentData) {
          setStudent(null);
          setLoading(false);
          return;
        }
        setStudent(studentData);

        // --- 2. Fetch Center Settings using student's center_id ---
        if (studentData.center_id) {
          const { data: config, error: configError } = await supabase
            .from('center_settings')
            .select('*')
            .eq('center_id', studentData.center_id)
            .maybeSingle();
          
          if (configError) console.error("Config Fetch Error:", configError);
          if (config) setCenterConfig(config);
        }

        // --- 3. Fetch the rest of the data ---
        const [coursesRes, sessionsRes, groupsRes, examsRes] = await Promise.all([
          supabase.from('courses').select('*, instructors(id, name)'),
          supabase.from('sessions').select('*').order('created_at', { ascending: false }),
          supabase.from('groups').select('*'),
          supabase.from('exam_results').select('*, exams(*, courses(*, instructors(name)))').eq('student_id', studentData.id)
        ]);

        setCourses(coursesRes.data || []);
        setGroups(groupsRes.data || []);
        setExamResults(examsRes.data?.filter(r => r.exams?.is_published) || []);
        
        const enrolled = studentData.enrolled_courses || [];
        const relevantSessions = (sessionsRes.data || []).filter(s => enrolled.includes(s.course_id));
        setAllSessions(relevantSessions);

      } catch (error) {
        console.error("Critical Fetch Error:", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

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

// --- 🛡️ THE ULTIMATE STABILITY PRINT ENGINE 🛡️ ---
const printStyles = `
  @media print {
    /* 1. Aggressive Reset of all Parent Containers */
    html, body, main, section, div[class*="layout"], #__next {
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
      display: block !important;
      position: static !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    /* 2. Atomic Removal of UI Noise */
    header, nav, aside, footer, .border-b, .no-print, .print-hidden, .sticky, .fixed, #sidebar-container {
      display: none !important;
      height: 0 !important;
    }

    /* 3. The Document Wrapper (Perfect A4 Isolation) */
    #printable-area {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 1cm !important;
      position: static !important;
    }

    /* 4. The Stability Layout (Block-Flow) */
    .grid {
      display: block !important; /* Forces elements to wait for each other */
      width: 100% !important;
    }

    /* Stats: 2x2 Matrix for high readability */
    .md\\:grid-cols-4 {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 15pt !important;
    }
    .md\\:grid-cols-4 > div {
      flex: 1 1 calc(48% - 15pt) !important;
      margin-bottom: 10pt !important;
    }

    /* Exams & Sections: Sequential Block Flow */
    .md\\:grid-cols-2 {
      display: block !important;
    }
    .grid > div {
      position: static !important;
      margin-bottom: 20pt !important;
      page-break-inside: avoid !important;
    }

    /* 5. Pagination & Tables */
    .section-container {
      margin-bottom: 30pt !important;
      page-break-inside: auto !important;
    }

    table { width: 100% !important; border-collapse: collapse !important; }
    thead { display: table-header-group !important; }
    tr { page-break-inside: avoid !important; }

    /* 6. Professional Polish */
    @page { size: A4; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-shadow: none !important; }
    
    /* Document Identity Scale */
    h1 { font-size: 28pt !important; }
    .rounded-\\[2.5rem\\], .rounded-\\[3rem\\] { border-radius: 1rem !important; }
  }
`;

  if (loading) return <div className="p-10 text-center text-gray-400 font-black animate-pulse" dir="rtl">جاري تجميع التقرير...</div>;
  if (!student) return <div className="p-10 text-center text-red-500 font-black" dir="rtl">عذراً، لم نتمكن من الوصول لملف الطالب.</div>;

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-20" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      {/* 🚀 Header Action Bar (Screen Only) */}
      <div className="sticky top-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-100 print:hidden">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-[#264653]">
                <FaGraduationCap size={20} />
             </div>
             <span className="font-black text-[#264653] tracking-tight text-sm hidden md:block">منصة الأستاذ عبدالرحمن خالد | تقرير الأداء الأكاديمي</span>
          </div>

          {/* 
            <button 
              onClick={() => {
                setTimeout(() => {
                  window.print();
                }, 100);
              }} 
              className="flex items-center gap-2 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              style={{backgroundColor: centerConfig.primary_color}}
            >
              <FaFilePdf />
              <span>طباعة التقرير الرسمي</span>
            </button>
          */}
        </div>
      </div>

      <div id="printable-area" className="max-w-5xl mx-auto px-4 md:px-0 mt-8">
        
        {/* 🏢 THE OFFICIAL DOCUMENT CORE */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-gray-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          
          {/* --- TOP BRANDING: OFFICIAL LETTERHEAD --- */}
          <div className="relative p-6 md:p-14 border-b-4 md:border-b-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 md:gap-10" style={{borderColor: centerConfig.primary_color}}>
             <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-current opacity-[0.02] rounded-full translate-x-20 md:translate-x-32 -translate-y-20 md:-translate-y-32" style={{color: centerConfig.primary_color}}></div>
             
             <div className="flex items-center gap-6 md:gap-10 flex-col md:flex-row text-center md:text-right relative z-10 w-full md:w-auto">
                {/* 🏆 Center Logo / Initial */}
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl md:rounded-[2.5rem] flex items-center justify-center text-4xl md:text-5xl font-black text-[#F8F9FA] bg-[#264653] shadow-2xl">
                  AK
                </div>
                
                {/* 🏦 Center Details (From Settings) */}
                <div className="space-y-3">
                   <div className="flex flex-col gap-1">
                      <h1 className="text-3xl md:text-5xl font-black text-[#264653] tracking-tighter leading-tight md:leading-none">منصة الأستاذ عبدالرحمن خالد</h1>
                      <div className="flex items-center gap-3 justify-center md:justify-start mt-2">
                        <div className="h-[2px] w-8 md:w-12 rounded-full bg-[#2A9D8F]"></div>
                        <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[#2A9D8F]">لتعلم الكيمياء - ثانوية عامة</p>
                      </div>
                   </div>

                   <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 md:gap-x-6 gap-y-2 pt-1 md:pt-2">
                      {centerConfig.address && (
                        <div className="flex items-center gap-2 text-gray-500 font-bold text-[10px] md:text-xs">
                          <FaMapMarkerAlt style={{color: centerConfig.primary_color}} /> {centerConfig.address}
                        </div>
                      )}
                      {centerConfig.center_phone && (
                        <div className="flex items-center gap-2 text-gray-500 font-bold text-[10px] md:text-xs">
                          <FaPhoneAlt style={{color: centerConfig.primary_color}} /> {centerConfig.center_phone}
                        </div>
                      )}
                   </div>
                </div>
             </div>

             {/* QR ID Section */}
             <div className="flex flex-col items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100 relative z-10">
                <div className="w-20 h-20 md:w-28 md:h-28">
                  <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : ''} size="100%" level="H" includeMargin={true} />
                </div>
                <div className="text-center">
                  <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">كود التحقق الذكي</p>
                  <p className="text-[9px] md:text-[10px] font-black mt-1 text-[#264653]">{student.unique_id}</p>
                </div>
             </div>
          </div>

          <div className="p-6 md:p-16">
            
            {/* --- STUDENT IDENTITY BAR --- */}
            <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8 mb-10 md:mb-14">
               <div className="flex items-center gap-4 md:gap-6 w-full lg:w-auto">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-2xl md:text-3xl font-black shadow-sm text-[#264653]">
                    {student.name?.substring(0,1)}
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-[10px] md:text-[11px] text-gray-400 font-black uppercase block mb-0.5 md:mb-1">بيانات الطالب</span>
                    <h2 className="text-xl md:text-2xl font-bold text-[#264653] leading-none">{student.name}</h2>
                    <p className="text-[10px] md:text-xs font-bold text-gray-500 mt-1 md:mt-2">{student.grade}</p>
                  </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full lg:w-auto">
                  <div className="bg-white px-5 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-sm border border-gray-50 min-w-[140px]">
                    <span className="block text-[9px] md:text-[10px] text-gray-400 font-black mb-1">موبايل الطالب</span>
                    <span className="font-black text-gray-800 text-xs md:text-sm tracking-wider">{student.phone || 'غير مسجل'}</span>
                  </div>
                  <div className="bg-white px-5 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-sm border border-gray-50 min-w-[140px]">
                    <span className="block text-[9px] md:text-[10px] text-gray-400 font-black mb-1">ولي الأمر</span>
                    <span className="font-black text-gray-800 text-xs md:text-sm tracking-wider">{student.parent_phone || 'غير مسجل'}</span>
                  </div>
               </div>
            </div>

            {/* --- CORE STATISTICS DASHBOARD --- */}
            <div className="section-container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-10 md:mb-16 print:flex print:flex-wrap print:gap-x-4">
                {/* Discipline Score */}
                <div className="relative group bg-white border-2 border-[#2A9D8F] rounded-2xl md:rounded-[3rem] p-5 md:p-8 text-center shadow-xl shadow-[#264653]/5 transition-transform hover:-translate-y-1 print:flex-1 print:min-w-[20%]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 md:px-4 py-0.5 md:py-1 rounded-full border-2 border-[#2A9D8F] text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#2A9D8F] print:static print:mb-2">الالتزام</div>
                    <span className="text-3xl md:text-5xl font-black leading-none text-[#264653]">{Math.round((stats.attended / (reportData.length || 1)) * 100)}%</span>
                    <p className="text-[9px] md:text-[10px] text-gray-400 font-black mt-2 md:mt-3 uppercase">المستوى العام</p>
                </div>

                {/* Attendance */}
                <div className="bg-green-50/30 border border-green-100 rounded-2xl md:rounded-[3rem] p-5 md:p-8 text-center transition-transform hover:-translate-y-1 print:flex-1 print:min-w-[20%]">
                    <FaCheckCircle className="text-green-500 mx-auto mb-2 md:mb-4 w-6 h-6 md:w-8 md:h-8"/>
                    <span className="text-2xl md:text-4xl font-black text-green-600 leading-none">{stats.attended}</span>
                    <p className="text-[9px] md:text-[10px] text-green-700 font-black mt-2 md:mt-3 uppercase">حضور مؤكد</p>
                </div>

                {/* Absence */}
                <div className="bg-red-50/30 border border-red-100 rounded-2xl md:rounded-[3rem] p-5 md:p-8 text-center transition-transform hover:-translate-y-1 print:flex-1 print:min-w-[20%]">
                    <FaTimesCircle className="text-red-500 mx-auto mb-2 md:mb-4 w-6 h-6 md:w-8 md:h-8"/>
                    <span className="text-2xl md:text-4xl font-black text-red-600 leading-none">{stats.absent}</span>
                    <p className="text-[9px] md:text-[10px] text-red-700 font-black mt-2 md:mt-3 uppercase">غياب رسمي</p>
                </div>

                {/* Financial Debt */}
                <div className={`rounded-2xl md:rounded-[3rem] p-5 md:p-8 text-center border-2 transition-transform hover:-translate-y-1 print:flex-1 print:min-w-[20%] ${stats.debt > 0 ? 'bg-orange-50 border-orange-400 shadow-xl shadow-orange-100' : 'bg-gray-50/50 border-gray-100'}`}>
                    <FaExclamationTriangle className={`${stats.debt > 0 ? 'text-orange-500' : 'text-gray-300'} mx-auto mb-2 md:mb-4 w-6 h-6 md:w-8 md:h-8`}/>
                    <span className={`text-2xl md:text-4xl font-black leading-none ${stats.debt > 0 ? 'text-orange-600' : 'text-gray-800'}`}>{stats.debt}</span>
                    <p className={`text-[9px] md:text-[10px] font-black mt-2 md:mt-3 uppercase ${stats.debt > 0 ? 'text-orange-800' : 'text-gray-400'}`}>{stats.debt > 0 ? 'مديونية' : 'خالص'}</p>
                </div>
              </div>
            </div>

            {/* --- FILTERS (Screen Only) --- */}
            <div className="mb-10 p-6 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 print:hidden">
               <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"><FaFilter size={12}/></div>
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">تخصيص عرض السجلات لولي الأمر:</span>
               </div>
               <div className="flex flex-wrap gap-2.5">
                  <button onClick={() => setSelectedCourseId('ALL')} className={`p-4 rounded-2xl font-black text-xs transition-all ${selectedCourseId === 'ALL' ? 'text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`} style={selectedCourseId === 'ALL' ? {backgroundColor: centerConfig.primary_color} : {}}>كافة المواد</button>
                  {courses.filter(c => student.enrolled_courses?.includes(c.id)).map(course => (
                    <button key={course.id} onClick={() => setSelectedCourseId(course.id)} className={`p-4 px-6 rounded-2xl font-black text-xs transition-all ${selectedCourseId === course.id ? 'text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`} style={selectedCourseId === course.id ? {backgroundColor: centerConfig.primary_color} : {}}>{course.name}</button>
                  ))}
               </div>
            </div>

            {/* --- DETAILED LOGS TABLE --- */}
            <div className="section-container mb-12 md:mb-16">
               <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-10">
                  <h3 className="text-lg md:text-xl font-bold text-[#264653] leading-none border-r-4 border-[#2A9D8F] pr-2">سجل المتابعة والالتزام المالي</h3>
               </div>
               <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right border-collapse min-w-[600px] md:min-w-full">
                       <thead>
                          <tr className="bg-[#F8F9FA] text-[#264653] text-sm font-black uppercase border-b border-gray-100">
                             <th className="p-4 md:p-6">التاريخ</th>
                             <th className="p-4 md:p-6">بيانات الحصة</th>
                             <th className="p-4 md:p-6 text-center">حضور / غياب</th>
                             <th className="p-4 md:p-6 text-center">الحالة المالية</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {reportData.map((item, idx) => (
                             <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                <td className="p-4 md:p-6 text-gray-500 font-bold whitespace-nowrap text-[11px] md:text-xs tracking-tight">{item.date}</td>
                                <td className="p-4 md:p-6">
                                   <div className="font-black text-[#264653] mb-1 leading-tight text-xs md:text-sm">{item.topic || 'محاضرة أكاديمية معتمدة'}</div>
                                   <div className="text-[9px] md:text-[10px] text-gray-400 font-bold flex gap-3">
                                      <span className="px-2 py-0.5 rounded bg-[#2A9D8F]/10 text-[#2A9D8F]">{item.courseName}</span>
                                      <span className="hidden sm:inline">• {item.instructor}</span>
                                   </div>
                                </td>
                                <td className="p-4 md:p-6 text-center">
                                   <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black tracking-widest ${item.isAttended ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {item.isAttended ? 'حاضر ✔' : 'غياب ✘'}
                                   </span>
                                </td>
                                <td className="p-4 md:p-6 text-center font-black">
                                   {item.isAttended ? (item.debtAmount > 0 ? <span className="text-red-500 bg-red-50 px-2 md:px-3 py-1 rounded-lg text-xs tracking-tighter">-{item.debtAmount}ج</span> : <span className="text-green-600 text-[11px] md:text-xs tracking-widest">خالص ✔</span>) : '---'}
                                </td>
                             </tr>
                          ))}
                          {reportData.length === 0 && (
                            <tr><td colSpan="4"><div className="m-8 p-8 text-center text-gray-400 font-black tracking-widest text-[10px] md:text-xs border-dashed border-2 border-gray-100 rounded-xl">لا توجد سجلات حالية للعرض.</div></td></tr>
                          )}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>

            {/* --- ACADEMIC ASSESSMENT LOG --- */}
            <div className="section-container">
               <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-10">
                  <h3 className="text-lg md:text-xl font-bold text-[#264653] leading-none border-r-4 border-[#2A9D8F] pr-2">نتائج الاختبارات والتقييمات</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 print:flex print:flex-wrap print:gap-4">
                  {examResults.filter(r => selectedCourseId === 'ALL' || r.exams?.course_id === selectedCourseId).map((res, idx) => {
                     const perc = Math.round((res.score / res.exams.max_score) * 100);
                     const isExcel = perc >= 90;
                     const isPass = perc >= 50;
                     return (
                        <div key={idx} className="p-6 md:p-10 bg-white border border-gray-100 rounded-3xl md:rounded-[3rem] shadow-sm flex flex-col justify-between hover:shadow-2xl transition-all border-b-8 print:flex-1 print:min-w-[45%]" style={{borderBottomColor: isExcel ? centerConfig.primary_color : isPass ? '#10b981' : '#ef4444'}}>
                           <div className="flex justify-between items-start mb-6 md:mb-8">
                              <div className="flex-1 text-right">
                                 <h4 className="font-black text-gray-900 text-lg md:text-xl mb-1 leading-tight">{res.exams.title}</h4>
                                 <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">{res.exams.courses?.name} • الأسبوع {idx + 1}</p>
                              </div>
                              <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black text-white shrink-0 ${isExcel ? 'bg-blue-600' : isPass ? 'bg-green-600' : 'bg-red-600'}`}>
                                 {isExcel ? 'ممتاز ⭐' : isPass ? 'ناجح ✅' : 'دون المتوقع ⚠️'}
                              </div>
                           </div>
                           <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between border-t pt-6 md:pt-8 border-gray-50 gap-4">
                              <p className="text-[9px] md:text-[10px] text-gray-400 font-bold italic leading-relaxed max-w-full sm:max-w-[60%] border-r-4 pr-4 md:pr-5 text-right" style={{borderColor: centerConfig.primary_color}}>{res.teacher_comment || 'أداء أكاديمي موثق بنظام المتابعة الذكي'}</p>
                              <div className="text-right sm:text-left w-full sm:w-auto">
                                 <span className="text-3xl md:text-4xl font-black text-gray-900 leading-none">{res.score}<span className="text-sm text-gray-300 ml-1 md:ml-2 font-bold font-mono">/ {res.exams.max_score}</span></span>
                                 <div className={`text-[10px] md:text-xs font-black mt-2 md:mt-3 flex items-center gap-2 justify-end ${isPass ? 'text-blue-600' : 'text-red-400'}`}>
                                    {perc}% من المجموع
                                 </div>
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>



          </div>

          {/* --- CORPORATE FOOTER (MODERN STYLE) --- */}
          <div className="bg-[#264653] p-10 md:p-16 text-[#F8F9FA] print:bg-white print:text-gray-400 print:border-t-4 print:border-gray-50 print:p-14">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 md:gap-12 print:flex print:justify-between">
                <div className="space-y-4 text-center md:text-right w-full md:w-auto">
                   <p className="text-2xl md:text-3xl font-black leading-none tracking-tighter uppercase">منصة الأستاذ عبدالرحمن خالد</p>
                   <p className="text-xs md:text-sm font-bold opacity-80 max-w-sm leading-loose border-r-0 md:border-r-2 pr-0 md:pr-6 mx-auto md:mx-0 border-[#2A9D8F]">لتعلم الكيمياء - ثانوية عامة</p>
                </div>
                
                <div className="flex flex-col items-center md:items-end gap-5 w-full md:w-auto">
                   <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:gap-2 mb-2 md:mb-4 w-full justify-center md:justify-end">
                      {centerConfig.center_phone && (
                        <div className="flex items-center gap-3 text-xs md:text-sm font-black opacity-90 justify-center md:justify-end">
                           <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><FaWhatsapp className="text-[#2A9D8F]"/></div>
                           <span className="tracking-wider">{centerConfig.center_phone}</span>
                        </div>
                      )}
                   </div>
                   <div className="opacity-40 font-black text-[8px] md:text-[9px] uppercase tracking-[0.2em] md:tracking-[0.4em] flex flex-col gap-1 items-center md:items-end text-center md:text-right">
                      <span>منصة الأستاذ عبدالرحمن خالد - لتعلم الكيمياء © 2026</span>
                      <span>تاريخ الإصدار: {new Date().toLocaleString('ar-EG')}</span>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
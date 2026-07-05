'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { 
 FaChalkboardTeacher, FaPrint, FaQrcode, FaCheck, FaTrash, 
 FaWhatsapp, FaSearch, FaFileInvoiceDollar, FaEye, FaTimesCircle, FaCheckCircle, 
 FaLock, FaCalendarAlt, FaFileExcel, FaFilter, FaUndo, FaExclamationTriangle, FaWallet, FaUsers , FaToggleOff, FaToggleOn
} from 'react-icons/fa';

export default function SessionsPage() {
 // =============================================================================
 // 1. GLOBAL STATE & VARIABLES
 // =============================================================================
 const [sessions, setSessions] = useState([]);
 const [courses, setCourses] = useState([]);
 const [students, setStudents] = useState([]);
 const [groups, setGroups] = useState([]); 
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [centerConfig, setCenterConfig] = useState(null);
 const [modalFilterGrade, setModalFilterGrade] = useState('');
 const [modalFilterCourse, setModalFilterCourse] = useState('');
 // حالة وضع الدمج / التحضير التلقائي
const [isAutoMode, setIsAutoMode] = useState(false);

 // Form State
 const [selectedGrade, setSelectedGrade] = useState('');
 const [newSession, setNewSession] = useState({ topic: '', course_id: '', group_id: '', price: '', fixed_share: '', scheduled_start_time: '' });
 const [toast, setToast] = useState({ show: false, msg: '', type: '' });
 
 // Search & Filter States
 const [filterDate, setFilterDate] = useState('');
 const [filterCourse, setFilterCourse] = useState('');
 const [filterGrade, setFilterGrade] = useState(''); 

 // Modal & Print States
 const [activeSession, setActiveSession] = useState(null); 
 const [reportData, setReportData] = useState(null); 
 const [showReportModal, setShowReportModal] = useState(false); 
 const [reportType, setReportType] = useState(null); 
 const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); 

 // Attendance & Payment States
 const [attendanceMap, setAttendanceMap] = useState({});
 const [paymentsMap, setPaymentsMap] = useState({});
 const [scannerActive, setScannerActive] = useState(false);
 const [modalSearchTerm, setModalSearchTerm] = useState('');
 
 const barcodeBuffer = useRef('');
 const barcodeTimeout = useRef(null);
 const qrScannerRef = useRef(null);

 // =============================================================================
 // 2. CORE LOGIC FUNCTIONS
 // =============================================================================

 const calculateTotalStudentDebt = (studentId) => {
   let totalDebt = 0;
   const student = students.find(s => s.id === studentId || s.unique_id === studentId);
   if (!student) return 0;

   sessions.forEach(session => {
       if (session.attendees?.includes(student.unique_id)) {
           const isFree = student.is_free === true || student.is_free === 1;
           if (isFree) return;

           let sessionPrice = parseFloat(session.price) || 0;
           let discount = parseFloat(student.course_discounts?.[session.course_id]) || 0;
           let required = Math.max(0, sessionPrice - discount);
           let paid = parseFloat(session.payments?.[student.unique_id]) || 0;
           
           if (required > paid) {
               totalDebt += (required - paid);
           }
       }
   });
   return totalDebt;
 };

const handleAttendanceChange = useCallback(async (studentId, isChecked, isBarcode = false) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !activeSession) return;

    // 1. منع تكرار التحضير
    if (isChecked && attendanceMap[studentId]) {
        if (isBarcode) {
            new Audio('https://assets.mixkit.co/active_storage/sfx/1073/1073-preview.mp3').play().catch(() => {}); 
            showToast(`🚨 الطالب ${student.name} حاضر بالفعل!`, 'error');
        }
        return;
    }

    // 🚀 2. منطق دمج المجموعات
    if (isChecked && activeSession.group_id) {
        const studentGroupId = student.group_ids?.[activeSession.course_id];
        if (studentGroupId !== activeSession.group_id) {
            const registeredGroupName = groups.find(g => g.id === studentGroupId)?.name || "غير مسكن";
            if (!isAutoMode) {
                const proceed = window.confirm(`⚠️ تنبيه: الطالب مسجل في (${registeredGroupName}) وليس في مجموعة هذه الحصة. هل تريد تحضيره يدوياً؟`);
                if (!proceed) return;
            } else {
                showToast(`حضور إضافي: ${student.name}`, 'success');
            }
        }
    }

    const courseData = courses.find(c => c.id === activeSession.course_id);
    const teacherName = courseData?.instructor || "غير محدد";

    let required = parseFloat(activeSession.price) || 0;
    if (student.is_free) {
        required = 0;
    } else if (student.course_discounts?.[activeSession.course_id]) {
        required = Math.max(0, required - parseFloat(student.course_discounts[activeSession.course_id]));
    }

    if (isChecked) {
        // 🚀 3. تنبيه المديونية
        const debt = calculateTotalStudentDebt(studentId);
        const limit = centerConfig?.debt_limit || 300;

        if (debt >= limit) {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
            if (!isAutoMode) {
                const proceed = window.confirm(`تنبيه مالي: الطالب ${student?.name} تخطى حد المديونية مسبقاً (${debt} ج). هل تريد الاستمرار؟`);
                if (!proceed) return;
            } else {
                showToast(`🛑 مديونية عالية: ${student.name} (${debt} ج)`, 'error');
            }
        }

        // --- السيناريو الأول: الدفع (محفظة أو كاش) ---
        if (student?.has_wallet && required > 0 && !attendanceMap[studentId]) {
            const walletBalance = parseFloat(student.wallet_balance) || 0;

            if (walletBalance >= required) {
                // ... (خصم المحفظة) ...
                const newBalance = walletBalance - required;
                const { error: walletError } = await supabase
                    .from('students')
                    .update({ wallet_balance: newBalance })
                    .eq('id', student.id);

                if (!walletError) {
                    await supabase.from('wallet_transactions').insert([{
                        student_id: student.id,
                        amount: -required,
                        type: 'session_payment',
                        description: `خصم حضور: ${activeSession.topic} - مادة: ${courseData?.name} - مدرس: ${teacherName}`
                    }]);

                    // 🔥 1. تسجيل Audit Log (محفظة)
                    await supabase.from('audit_logs').insert({
                        table_name: 'sessions',
                        record_id: student.id, 
                        action: 'ATTENDANCE',
                        new_data: { 
                            details: `حضور (خصم محفظة): ${activeSession.topic}`,
                            amount: required,
                            course_id: activeSession.course_id
                        }
                    });

                    // باقي كود المحفظة...
                    const isExternal = student.group_ids?.[activeSession.course_id] !== activeSession.group_id;
                    await supabase.from('student_activities').insert([{
                        student_id: student.unique_id,
                        type: 'attendance',
                        title: isExternal ? 'حضور حصة بديلة ✅' : 'تم تسجيل الحضور (محفظة)',
                        description: isExternal 
                            ? `حضر الطالب حصة مادة ${courseData?.name} في مجموعة غير مجموعته. تم خصم ${required} ج من المحفظة.`
                            : `حضر الطالب حصة: ${activeSession.topic} للمادة: ${courseData?.name}. تم خصم ${required} ج من المحفظة.`,
                        note: isExternal ? `المجموعة الأصلية: ${groups.find(g => g.id === student.group_ids?.[activeSession.course_id])?.name || 'غير محدد'}` : `المدرس: ${teacherName}`
                    }]);

                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, wallet_balance: newBalance } : s));
                    setPaymentsMap(prev => ({ ...prev, [studentId]: required }));
                    
                    // رسالة واتساب المحفظة...
                    const parentPhone = student.parent_phone?.replace(/\D/g, '');
                    if (parentPhone) {
                        const msg = `ادارة: ${centerConfig?.center_name || "السنتر"}\n` +
                                    `تم خصم حصة: ${activeSession.topic}\n` +
                                    `الطالب: ${student.name}\n` +
                                    `القيمة: ${required} جنيه\n` +
                                    `الرصيد المتبقي بمحفظته: ${newBalance.toFixed(2)} جنيه`;
                        window.open(`https://wa.me/2${parentPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }
                }
            } else {
                // ... (رصيد غير كافي - كاش) ...
                const confirmCash = window.confirm(`الرصيد غير كافٍ بالمحفظة للطالب ${student.name}. هل تم تحصيل ${required} جنيه كاش؟`);
                
                if (confirmCash) {
                    setPaymentsMap(prev => ({ ...prev, [studentId]: required }));
                    await supabase.from('student_activities').insert([{
                        student_id: student.unique_id,
                        type: 'attendance',
                        title: 'تم تسجيل الحضور (كاش)',
                        description: `حضر الطالب حصة: ${activeSession.topic}. تم تحصيل ${required} ج نقداً لعدم كفاية الرصيد.`,
                        note: `المدرس: ${teacherName}`
                    }]);
                    showToast(`تم تحصيل ${required} ج كاش من ${student.name}`, 'success');

                    // 🔥 2. تسجيل Audit Log (كاش)
                    await supabase.from('audit_logs').insert({
                        table_name: 'sessions',
                        record_id: student.id,
                        action: 'ATTENDANCE',
                        new_data: { 
                            details: `حضور (دفع نقدي): ${activeSession.topic}`,
                            amount: required,
                            course_id: activeSession.course_id
                        }
                    });

                } else {
                    return; 
                }
            }
        
        // --- السيناريو الثاني: حضور عادي (مجاني أو سبق دفعه أو بدون محفظة) ---
        } else if (!paymentsMap[studentId]) {
            setPaymentsMap(prev => ({ ...prev, [studentId]: required }));
            await supabase.from('student_activities').insert([{
                student_id: student.unique_id,
                type: 'attendance',
                title: 'تم تسجيل الحضور',
                description: `دخل الطالب الآن حصة: ${activeSession.topic} - ${courseData?.name}`,
                note: `المدرس: ${teacherName}`
            }]);

            // 🔥 3. تسجيل Audit Log (حضور فقط/إعفاء)
            // ⚠️ ملاحظة: تم نقله هنا داخل الـ else if عشان ميتكررش
            await supabase.from('audit_logs').insert({
                table_name: 'sessions',
                record_id: student.id,
                action: 'ATTENDANCE',
                new_data: { 
                    details: `تسجيل حضور: ${activeSession.topic}`,
                    amount: 0,
                    course_id: activeSession.course_id
                }
            });
        }

        if (isBarcode) new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3').play().catch(() => {});
    } 
    // --- حالة إلغاء الحضور (Uncheck) ---
    else if (!isChecked && attendanceMap[studentId]) {
        if (student?.has_wallet && paymentsMap[studentId] > 0) {
            const refundAmount = paymentsMap[studentId];
            const newBalance = (parseFloat(student.wallet_balance) || 0) + refundAmount;
            const confirmRefund = window.confirm(`هل تريد إلغاء الحضور وإرجاع مبلغ ${refundAmount} جنيه لمحفظة ${student.name}؟`);
            if (confirmRefund) {
                const { error: refundError } = await supabase
                    .from('students')
                    .update({ wallet_balance: newBalance })
                    .eq('id', student.id);

                if (!refundError) {
                    await supabase.from('wallet_transactions').insert([{
                        student_id: student.id,
                        amount: refundAmount,
                        type: 'refund',
                        description: `استرداد (إلغاء حضور): ${activeSession.topic} - مدرس: ${teacherName}`
                    }]);
                    
                    // 🔥 ممكن كمان نضيف Audit Log للاسترداد هنا لو حابب مستقبلاً

                    await supabase.from('student_activities').insert([{
                        student_id: student.unique_id,
                        type: 'note',
                        title: 'إلغاء تسجيل حضور',
                        description: `تم إلغاء حضور الطالب في حصة: ${activeSession.topic} وإرجاع المبلغ للمحفظة.`
                    }]);
                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, wallet_balance: newBalance } : s));
                    alert(`تم إلغاء الحضور وإعادة المبلغ للمحفظة بنجاح.`);
                }
            } else {
                return; 
            }
        } else {
            await supabase.from('student_activities').insert([{
                student_id: student.unique_id,
                type: 'note',
                title: 'إلغاء تسجيل حضور',
                description: `تم إلغاء حضور الطالب في حصة: ${activeSession.topic}`
            }]);
        }
        setPaymentsMap(prev => {
            const newPayments = { ...prev };
            delete newPayments[studentId];
            return newPayments;
        });
    }
    setAttendanceMap(prev => ({ ...prev, [studentId]: isChecked }));
}, [activeSession, students, courses, paymentsMap, attendanceMap, centerConfig, groups, isAutoMode]);

 const handlePhysicalBarcodeScan = useCallback((e) => {
   if (!activeSession || activeSession.is_completed) return;
   if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
   if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
   
   if (e.key === 'Enter') {
     if (barcodeBuffer.current.length > 2) {
       const code = barcodeBuffer.current.trim();
       const student = students.find(s => s.unique_id === code);
       if (student) {
         const isEnrolled = student.enrolled_courses?.includes(activeSession.course_id);
         if (!isEnrolled) {
           new Audio('https://assets.mixkit.co/active_storage/sfx/1073/1073-preview.mp3').play().catch(() => {});
           alert(`⚠️ الطالب ${student.name} غير مسجل بهذا الكورس!`);
           barcodeBuffer.current = '';
           return;
         }
         handleAttendanceChange(student.id, true, true);
       } else {
         new Audio('https://assets.mixkit.co/active_storage/sfx/1073/1073-preview.mp3').play().catch(() => {});
         alert('⚠️ لم يتم العثور على الطالب بهذا الكود');
       }
     }
     barcodeBuffer.current = '';
     return;
   }

   if (e.key.length === 1 && /[0-9a-zA-Z]/.test(e.key)) {
     barcodeBuffer.current += e.key;
   }

   barcodeTimeout.current = setTimeout(() => {
     barcodeBuffer.current = '';
   }, 100);
 }, [activeSession, students, handleAttendanceChange]);

 const availableGrades = useMemo(() => {
   const grades = courses.map(c => c.grade).filter(Boolean);
   return [...new Set(grades)].sort();
 }, [courses]);

 const filteredCoursesForCreation = useMemo(() => {
   if (!selectedGrade) return [];
   return courses.filter(c => c.grade === selectedGrade);
 }, [courses, selectedGrade]);

 const liveStats = useMemo(() => {
   if (!activeSession) return { count: 0, totalIncome: 0, centerTotal: 0, teacherTotal: 0 };
   const attendeesCount = Object.values(attendanceMap).filter(v => v === true).length;
   const totalIncome = Object.values(paymentsMap).reduce((a, b) => a + (parseFloat(b) || 0), 0);
   const centerTotal = attendeesCount * (parseFloat(activeSession.fixed_share) || 0);
   const teacherTotal = totalIncome - centerTotal;
   return { count: attendeesCount, totalIncome, centerTotal, teacherTotal };
 }, [activeSession, attendanceMap, paymentsMap]);

 const fetchData = async () => {
   setLoading(true);
   setError(null);
   try {
     const [sRes, cRes, stRes, gRes] = await Promise.all([
       supabase.from('sessions').select('*').order('created_at', { ascending: false }),
       supabase.from('courses').select('*'),
       supabase.from('students').select('*'),
       supabase.from('groups').select('*, schedule:schedule(*)')
     ]);
     
     if (sRes.error) throw sRes.error;
     if (cRes.error) throw cRes.error;
     if (stRes.error) throw stRes.error;

     setSessions(sRes.data || []);
     setCourses(cRes.data || []);
     setStudents(stRes.data || []);
     setGroups(gRes.data || []);

   } catch (error) {
     console.error('Error fetching data:', error);
     setError(error.message || 'حدث خطأ غير معروف في تحميل البيانات');
   } finally {
     const { data: config } = await supabase.from('center_settings').select('*').maybeSingle();
     setCenterConfig(config);
     setLoading(false);
   }
 };

 useEffect(() => {
   fetchData(); 
   window.addEventListener('keydown', handlePhysicalBarcodeScan);
 return () => window.removeEventListener('keydown', handlePhysicalBarcodeScan);
}, []);

 useEffect(() => {
   if (!scannerActive || !activeSession) return;
   const qrScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true }, false);
   const onScanSuccess = (decodedText) => {
     const student = students.find(s => s.unique_id === decodedText);
     if (student) {
       const isEnrolled = student.enrolled_courses?.includes(activeSession.course_id);
       if (!isEnrolled) {
         new Audio('https://assets.mixkit.co/active_storage/sfx/1073/1073-preview.mp3').play().catch(() => {});
         alert(`⚠️ الطالب ${student.name} غير مسجل بهذا الكورس!`);
         return;
       }
       handleAttendanceChange(student.id, true, true);
     } else {
       new Audio('https://assets.mixkit.co/active_storage/sfx/1073/1073-preview.mp3').play().catch(() => {});
       alert('⚠️ لم يتم العثور على الطالب بهذا الكود');
     }
   };
   qrScanner.render(onScanSuccess, (e) => {});
   qrScannerRef.current = qrScanner;
   return () => {
     if (qrScannerRef.current) {
       qrScannerRef.current.clear().catch(console.error);
       qrScannerRef.current = null;
     }
   };
 }, [scannerActive, activeSession, students, handleAttendanceChange]);

 const reloadData = () => {
   setError(null);
   fetchData();
 };

const handleCreateSession = async (e) => {
  e.preventDefault();
  const topic = newSession.topic?.trim();
  const courseId = newSession.course_id;
  const groupId = newSession.group_id;
  const finalPrice = parseFloat(newSession.price) || 0;
  const fixedShare = parseFloat(newSession.fixed_share) || 0;

  if (!courseId || !topic || !groupId) {
    alert('⚠️ بيانات ناقصة! تأكد من اختيار المادة، المجموعة، وعنوان الحصة.');
    return;
  }

  try {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ 
          topic: topic, 
          course_id: courseId, 
          group_id: groupId, 
          price: finalPrice, 
          fixed_share: fixedShare,
          scheduled_start_time: newSession.scheduled_start_time, 
          attendees: [], 
          payments: {}, 
          is_completed: false 
      }])
      .select();

    if (error) throw error;
    if (data && data[0]) {
      setSessions([data[0], ...sessions]);
      setNewSession({ topic: '', course_id: '', group_id: '', price: '', fixed_share: '', scheduled_start_time: '' });
      setSelectedGrade('');
      alert('تم فتح الدفتر بنجاح ✅');
    }
  } catch (error) {
    console.error('Error creating session:', error);
    alert('حدث خطأ أثناء الاتصال بقاعدة البيانات');
  } finally {
    setLoading(false);
  }
};

 const handleDeleteSession = async (id) => {
   if (!confirm("هل أنت متأكد من حذف هذه الحصة؟")) return;
   try {
     const { error } = await supabase.from('sessions').delete().eq('id', id);
     if (error) throw error;
     setSessions(sessions.filter(s => s.id !== id));
     alert('تم حذف الحصة بنجاح');
   } catch (error) {
     console.error('Error deleting session:', error);
     alert('حدث خطأ في حذف الحصة');
   }
 };

 const showToast = (msg, type = 'success') => {
   setToast({ show: false, msg: '', type: '' });
   setTimeout(() => {
       setToast({ show: true, msg, type });
   }, 10);
   setTimeout(() => {
       setToast(prev => ({ ...prev, show: false }));
   }, 3000);
 };

const saveLedger = async (silent = false) => {
   if (!activeSession) return null;
   try {
     const attendeesList = [];
     for (const [studentId, isPresent] of Object.entries(attendanceMap)) {
       if (isPresent) {
         const student = students.find(s => s.id === studentId);
         if (student && student.unique_id) attendeesList.push(student.unique_id);
       }
     }
     const paymentsForDB = {};
     Object.entries(paymentsMap).forEach(([studentId, amount]) => {
       const student = students.find(s => s.id === studentId);
       if (student && student.unique_id) paymentsForDB[student.unique_id] = amount;
     });

     const { error } = await supabase
       .from('sessions')
       .update({ attendees: attendeesList, payments: paymentsForDB })
       .eq('id', activeSession.id);

     if (error) throw error;
     setSessions(prev => prev.map(s => 
       s.id === activeSession.id ? { ...s, attendees: attendeesList, payments: paymentsForDB } : s
     ));
     if (!silent) showToast('تم حفظ الدفتر المالي بنجاح 💾');
     return { attendeesList, paymentsForDB };
   } catch (error) {
     showToast('حدث خطأ في حفظ الدفتر', 'error');
     return null;
   }
 };

 const handleEndSession = async () => {
   if (!confirm("إنهاء الجلسة سيقفل الحسابات ويمنع التعديل. هل أنت متأكد؟")) return;
   try {
     const ledgerResult = await saveLedger(true); 
     if (!ledgerResult) return;
     const { error } = await supabase
       .from('sessions')
       .update({ 
         is_completed: true, 
         calculated_revenue: liveStats.totalIncome, 
         calculated_center_share: liveStats.centerTotal 
       })
       .eq('id', activeSession.id);
     if (error) throw error;
     setSessions(prev => prev.map(s => 
       s.id === activeSession.id 
         ? { 
             ...s, 
             is_completed: true, 
             calculated_revenue: liveStats.totalIncome, 
             calculated_center_share: liveStats.centerTotal,
             attendees: ledgerResult.attendeesList,
             payments: ledgerResult.paymentsForDB
           } 
         : s
     ));
     closeSession();
     showToast('تم إغلاق الجلسة بنجاح 🔒');
   } catch (error) {
     showToast('حدث خطأ في إنهاء الجلسة', 'error');
   }
 };

 const openSession = (session) => {
   setActiveSession(session);
   setModalSearchTerm('');
   const attMap = {};
   const payMap = {};
   if (students.length > 0) {
     (session.attendees || []).forEach(unique_id => {
       const student = students.find(s => s.unique_id === unique_id);
       if (student) {
         attMap[student.id] = true;
         if (session.payments && session.payments[unique_id] !== undefined) {
           payMap[student.id] = session.payments[unique_id];
         }
       }
     });
   }
   setAttendanceMap(attMap);
   setPaymentsMap(payMap);
   setScannerActive(false);
 };

 const closeSession = () => {
   setActiveSession(null);
   setScannerActive(false);
   setReportType(null); 
   setShowReportModal(false);
   setAttendanceMap({});
   setPaymentsMap({});
 };

 const getSessionDisplayStats = (session) => {
   const count = session.attendees?.length || 0;
   let income = 0;
   if (session.payments && typeof session.payments === 'object') {
     income = Object.values(session.payments).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
   }
   const center = count * (parseFloat(session.fixed_share) || 0);
   const teacher = Math.max(0, income - center);
   return { count, totalIncome: income, centerTotal: center, teacherTotal: teacher };
 };

 const visibleSessions = useMemo(() => {
   return sessions.filter(session => {
     const course = courses.find(c => c.id === session.course_id);
     if (filterDate && !session.created_at?.startsWith(filterDate)) return false;
     if (filterCourse && session.course_id !== filterCourse) return false;
     if (filterGrade && course?.grade !== filterGrade) return false;
     return true;
   });
}, [sessions, filterDate, filterCourse, filterGrade, courses]);

 const filteredStudents = useMemo(() => {
   if (!activeSession || !activeSession.course_id) return [];
   let enrolledOnly = students.filter(s => s.enrolled_courses?.includes(activeSession.course_id));
   enrolledOnly.sort((a, b) => {
      const aMatch = a.group_ids?.[activeSession.course_id] === activeSession.group_id ? 0 : 1;
      const bMatch = b.group_ids?.[activeSession.course_id] === activeSession.group_id ? 0 : 1;
      return aMatch - bMatch;
   });
   if (modalSearchTerm.trim()) {
     const term = modalSearchTerm.toLowerCase();
     return enrolledOnly.filter(s => 
       (s.name && s.name.toLowerCase().includes(term)) ||
       (s.unique_id && s.unique_id.toLowerCase().includes(term))
     );
   }
   return enrolledOnly;
 }, [activeSession, students, modalSearchTerm]);

 const handlePrint = (type) => {
   setReportType(type); 
   setTimeout(() => {
     window.print();
     setReportType(null); 
   }, 500);
 };

 const generateReport = (type) => {
   let filteredSessions = [];
   let title = "";
   if (type === 'daily') {
     const day = filterDate || new Date().toISOString().slice(0, 10);
     filteredSessions = sessions.filter(s => s.created_at?.startsWith(day));
     title = `التقرير المالي اليومي (${new Date(day).toLocaleDateString('ar-EG')})`;
   } else {
     const [year, month] = reportMonth.split('-');
     filteredSessions = sessions.filter(s => {
       const d = new Date(s.created_at);
       return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
     });
     title = `التقرير المالي لشهر ${month}/${year}`;
   }
   let totals = { income: 0, center: 0, teacher: 0, debt: 0, attendance: 0 };
   const rows = filteredSessions.map(s => {
     const stats = getSessionDisplayStats(s);
     let sessionDebt = 0;
     s.attendees?.forEach(unique_id => {
       const student = students.find(x => x.unique_id === unique_id);
       if (student) {
         let required = parseFloat(s.price) || 0;
         if (student.is_free) required = 0;
         else if (student.course_discounts?.[s.course_id]) {
           const discount = parseFloat(student.course_discounts[s.course_id]) || 0;
           required = Math.max(0, required - discount);
         }
         const paid = parseFloat(s.payments?.[unique_id]) || 0;
         if (paid < required) sessionDebt += (required - paid);
       }
     });
     totals.income += stats.totalIncome; totals.center += stats.centerTotal; totals.teacher += stats.teacherTotal;
     totals.attendance += stats.count; totals.debt += sessionDebt;
     return { ...s, stats, debt: sessionDebt, course: courses.find(c => c.id === s.course_id), group: groups.find(g => g.id === s.group_id) };
   });
   setReportData({ rows, totals, title, date: new Date().toLocaleDateString('ar-EG') });
   setShowReportModal(true);
 };

 const handleExportExcel = () => {
   if (!reportData) return;
   try {
     const data = reportData.rows.map(r => ({
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

const handleMassAbsentAlert = () => {
 const absentStudents = filteredStudents.filter(student => !attendanceMap[student.id]);
 if (absentStudents.length === 0) {
   alert("لا يوجد طلاب غائبين في هذه القائمة حالياً 🎉");
   return;
 }
 if (!confirm(`سيتم فتح ${absentStudents.length} محادثة واتساب لإرسال التنبيهات. هل تريد الاستمرار؟`)) return;
 const courseData = courses.find(c => c.id === activeSession?.course_id);
 const courseName = courseData?.name || "غير محدد";
 const sessionTopic = activeSession?.topic && activeSession.topic !== "." ? activeSession.topic : `حصة ${courseName}`;
 absentStudents.forEach((student, index) => {
   setTimeout(() => {
     let phone = student.parent_phone?.replace(/\D/g, '') || '';
     if (phone.startsWith('01')) phone = '2' + phone;
     let template = centerConfig?.msg_absent || 
       `إدارة [center] \nالسيد ولي أمر الطالب/(ة) [name]\nنحيطكم علماً بغياب الطالب عن حصة [topic]`;
     const finalMsg = template
       .replace(/\[name\]/g, student.name)
       .replace(/\[topic\]/g, sessionTopic)
       .replace(/\[center\]/g, centerConfig?.center_name || "SMART CENTER");
     window.open(`https://wa.me/${phone}?text=${encodeURIComponent(finalMsg)}`, `_blank_${student.id}`);
   }, index * 1300); 
 });
};

const handleStartActualLesson = async () => {
  if (!activeSession) return;
  if (!confirm("هل بدأ المستر الشرح الآن؟ سيتم إرسال تنبيه فوري لأولياء الأمور بالحالة الجديدة.")) return;

  const now = new Date().toISOString();
  const courseData = courses.find(c => c.id === activeSession.course_id);
  const teacherName = courseData?.instructor || "المدرس";

  try {
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ actual_start_time: now })
      .eq('id', activeSession.id);

    if (updateError) throw updateError;

    const { data: groupStudents } = await supabase
      .from('students')
      .select('unique_id')
      .eq(`group_ids->>${activeSession.course_id}`, activeSession.group_id);

    if (groupStudents && groupStudents.length > 0) {
      const actualTimeStr = new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      
      const activities = groupStudents.map(s => ({
        student_id: s.unique_id,
        type: 'attendance',
        title: 'بدأ الشرح الفعلي ✍️',
        description: `بدأ الآن مستر ${teacherName} شرح حصة ${activeSession.topic}.`,
        note: `وقت الجدول: ${activeSession.scheduled_start_time || '---'} | بدأ فعلياً: ${actualTimeStr}`
      }));

      await supabase.from('student_activities').insert(activities);
    }

    setActiveSession({ ...activeSession, actual_start_time: now });
    showToast("تم تسجيل بدء الشرح وإبلاغ أولياء الأمور ✅");
  } catch (e) {
    console.error(e);
    showToast("حدث خطأ أثناء تسجيل بدء الشرح", "error");
  }
};

 if (loading) {
   return (
     <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
       <div className="text-center">
         <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
         <h2 className="text-xl font-bold text-gray-700 mb-2">جاري تحميل البيانات...</h2>
         <p className="text-gray-500">يرجى الانتظار قليلاً</p>
         <div className="mt-4 h-2 w-64 bg-gray-200 rounded-full overflow-hidden">
           <div className="h-full bg-blue-500 animate-pulse"></div>
         </div>
       </div>
     </div>
   );
 }

 if (error) {
   return (
     <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
       <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200 max-w-md text-center">
         <div className="text-red-500 text-4xl mb-4">⚠️</div>
         <h2 className="text-xl font-bold text-red-600 mb-2">خطأ في تحميل البيانات</h2>
         <p className="text-gray-600 mb-6">{error}</p>
         <div className="flex gap-4">
           <button onClick={reloadData} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-bold transition">إعادة المحاولة</button>
           <button onClick={() => window.location.reload()} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-bold transition">تحديث الصفحة</button>
         </div>
       </div>
     </div>
   );
 }

 return (
   <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen relative">
     
     {/* 🚀 الـ Toast المعدل مكانه هنا ليكون فوق أي مودال */}
     {toast.show && (
       <div 
         style={{ zIndex: 99999 }}
         className={`fixed top-10 left-1/2 -translate-x-1/2 min-w-[320px] px-8 py-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white text-center font-black animate-bounce flex items-center justify-center gap-3 border-2 ${toast.type === 'error' ? 'bg-red-600 border-red-400' : 'bg-green-600 border-green-400'}`}
       >
         {toast.type === 'error' ? <FaTimesCircle size={28}/> : <FaCheckCircle size={28}/>}
         <span className="text-xl">{toast.msg}</span>
       </div>
     )}

     <div className="print:hidden mb-4">
       <button onClick={reloadData} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition">
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
         </svg>
         تحديث البيانات
       </button>
     </div>

<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 print:hidden">
 <div className="flex flex-wrap justify-between items-center mb-6">
   <div className="flex items-center gap-4">
 {centerConfig?.logo_url ? (
   <img 
     src={centerConfig.logo_url} 
     alt="Logo" 
     className="h-20 md:h-24 w-auto object-contain transition-all" 
   />
 ) : (
   <FaChalkboardTeacher className="text-blue-600 text-4xl" />
 )}
 <h1 className="text-3xl font-black text-gray-800 tracking-tight">
   {centerConfig?.center_name || "الأوائل"}
 </h1>
</div>
   <div className="flex items-center bg-gray-100 p-1 rounded-lg border">
     <input 
       type="month" 
       value={reportMonth} 
       onChange={e => setReportMonth(e.target.value)} 
       className="bg-transparent border-none text-sm p-1 outline-none" 
     />
     <button 
       onClick={() => generateReport('monthly')} 
       className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-md font-bold text-sm ml-2 transition"
     >
       عرض شهري
     </button>
   </div>
 </div>

<div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner">
 <div className="flex-1 w-full">
   <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">تصفية بالصف</label>
   <select 
     value={filterGrade} 
     onChange={e => setFilterGrade(e.target.value)} 
     className="w-full h-[42px] px-3 border border-gray-300 rounded-lg bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
   >
     <option value="">كل الصفوف</option>
     {availableGrades.map(grade => (
       <option key={grade} value={grade}>{grade}</option>
     ))}
   </select>
 </div>

 <div className="flex-1 w-full">
   <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">تصفية بالمادة</label>
   <select 
     value={filterCourse} 
     onChange={e => setFilterCourse(e.target.value)} 
     className="w-full h-[42px] px-3 border border-gray-300 rounded-lg bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
   >
     <option value="">كل المواد</option>
     {courses.map(c => (
       <option key={c.id} value={c.id}>{c.name} - {c.instructor}</option>
     ))}
   </select>
 </div>

 <div className="flex-1 w-full">
   <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">تصفية بالتاريخ</label>
   <input 
     type="date" 
     value={filterDate} 
     onChange={e => setFilterDate(e.target.value)} 
     className="w-full h-[42px] px-3 border border-gray-300 rounded-lg bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all" 
   />
 </div>

 <div className="flex items-end gap-2">
   <button 
     onClick={() => generateReport('daily')} 
     className="flex-1 h-[42px] bg-[#00a651] hover:bg-[#008541] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
   >
     <FaCalendarAlt className="text-xs" /> تقرير اليوم
   </button>
   
   {(filterDate || filterCourse || filterGrade) && (
     <button 
       onClick={() => {setFilterDate(''); setFilterCourse(''); setFilterGrade('');}} 
       className="w-[42px] h-[42px] bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg flex items-center justify-center transition shadow-sm"
     >
       <FaUndo className="text-xs" />
     </button>
   )}
 </div>
</div>
</div>

     {/* سكشن إنشاء حصة مطور (مع المجموعة) */}
     <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-8 print:hidden">
       <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">✨ إنشاء جلسة جديدة (فتح دفتر)</h2>
       <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
           <div><label className="text-xs font-bold text-gray-500 mb-1">1. الصف الدراسي</label>
             <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setNewSession({...newSession, course_id: '', group_id: '', price: '', fixed_share: ''}); }} className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm focus:border-blue-500" required>
               <option value="">اختر الصف...</option>{availableGrades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
             </select>
           </div>
           <div><label className="text-xs font-bold text-gray-500 mb-1">2. الكورس</label>
             <select value={newSession.course_id} 
               onChange={(e) => { 
                 const c = courses.find(course => course.id === e.target.value); 
                 setNewSession({ 
                   ...newSession, 
                   course_id: e.target.value, 
                   price: c ? c.price : '', 
                   fixed_share: c ? c.center_tax : '',
                   group_id: '' 
                 }); 
               }} 
               className="w-full p-2.5 border rounded-lg bg-white text-sm focus:border-blue-500 shadow-sm" required disabled={!selectedGrade}>
               <option value="">{selectedGrade ? 'اختر المادة' : '--- اختر الصف أولاً ---'}</option>{filteredCoursesForCreation.map(c => <option key={c.id} value={c.id}>{c.name} ({c.instructor})</option>)}
             </select>
           </div>
           {/* جديد: اختيار المجموعة */}
           <div><label className="text-xs font-bold text-blue-500 mb-1">3. المجموعة</label>
             <select 
              value={newSession.group_id} 
onChange={(e) => {
    const groupId = e.target.value;
    const selectedGroup = groups.find(g => g.id === groupId);
    
    // 1. الحصول على رقم اليوم الحالي (الأحد=0 ... السبت=6)
    const todayIndex = new Date().getDay(); 
    const dayNamesArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // 2. البحث في المواعيد مع التأكد من مطابقة النوع (رقم مع رقم)
    const todaySchedule = selectedGroup?.schedule?.find(s => 
        Number(s.day_of_week) === todayIndex
    );

    let autoStartTime = "";
    let autoTopic = "";

    if (todaySchedule) {
        // ✅ حالة التطابق: الحصة في موعدها الرسمي
        // سحب الوقت كما هو نصاً من قاعدة البيانات لمنع تلاعب المناطق الزمنية
        const rawTime = todaySchedule.start_time; 
        const timeParts = rawTime.split(':');
        const hours = timeParts[0];
        const minutes = timeParts[1];

        // تنسيق الوقت للعرض 12 ساعة (ص/م)
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'م' : 'ص';
        const displayHours = h % 12 || 12;

        autoStartTime = `${hours}:${minutes}`; 
        autoTopic = `حصة ${dayNamesArabic[todayIndex]} (${displayHours}:${minutes} ${ampm})`;
    } else {
        // ⚠️ حالة عدم التطابق (حصة إضافية)
        // نضع وقت الجهاز الحالي بدلاً من تركه فارغاً لضبط المنبه
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        autoStartTime = currentTime;
        autoTopic = `حصة إضافية بتاريخ ${now.toLocaleDateString('ar-EG')}`;
    }

    setNewSession({
        ...newSession, 
        group_id: groupId,
        scheduled_start_time: autoStartTime, // سيظهر الآن بجانب المنبه
        topic: autoTopic
    });
}}
              className="w-full p-2.5 border-2 border-blue-200 bg-blue-50 rounded-lg text-sm font-bold focus:border-blue-500 shadow-sm transition-all" 
              required 
              disabled={!newSession.course_id}
            >
              <option value="">-- اختر المجموعة --</option>
              {groups
                .filter(g => g.course_id === newSession.course_id)
                .map(g => <option key={g.id} value={g.id}>{g.name}</option>)
              }
            </select>
           </div>

{/* عرض البيانات التلقائية بدلاً من الخانات اليدوية */}
<div className="md:col-span-1">
 <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
   <FaCalendarAlt className="text-purple-500" /> تفاصيل الحصة (آلي)
 </label>
 <div className="p-2.5 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-[11px] font-black text-gray-600">
   {newSession.topic || "بانتظار اختيار المجموعة..."}
 </div>
</div>
           
           <div className="flex gap-2">
               <div><label className="text-xs font-bold text-gray-500">سعر الطالب</label><input type="number" min="0" step="0.01" value={newSession.price} onChange={e => setNewSession({...newSession, price: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm text-center font-bold text-green-700" placeholder="0.00" /></div>
               <div><label className="text-xs font-bold text-red-500">رسوم السنتر</label><input type="number" min="0" step="0.01" value={newSession.fixed_share} onChange={e => setNewSession({...newSession, fixed_share: e.target.value})} className="w-full p-2.5 border border-red-200 bg-red-50 rounded-lg text-sm text-center font-bold text-red-500" placeholder="0.00" /></div>
               <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition">إنشاء وحفظ</button>
           </div>
       </form>
     </div>

     <div className="grid grid-cols-1 gap-4 print:hidden">
       {visibleSessions.length === 0 ? (
         <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-10 text-center">
           <div className="text-gray-400 text-4xl mb-4">📚</div><h3 className="text-lg font-bold text-gray-500 mb-2">لا توجد حصص مسجلة</h3>
           <p className="text-gray-400 mb-6">لم يتم العثور على حصص مطابقة لمعايير البحث</p>
           <button onClick={reloadData} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-6 py-2 rounded-lg font-bold text-sm transition">تحديث القائمة</button>
         </div>
       ) : (
         visibleSessions.map(session => {
           const stats = getSessionDisplayStats(session);
           const course = courses.find(x => x.id === session.course_id);
           const group = groups.find(x => x.id === session.group_id); 
           const isClosedList = session.is_completed;
           return (
               <div key={session.id} className={`bg-white rounded-lg shadow-sm border p-4 flex flex-col md:flex-row justify-between items-center gap-4 transition hover:shadow-md ${isClosedList ? 'opacity-90 grayscale-[0.5] border-gray-300' : 'border-l-4 border-l-blue-500'}`}>
                   <div className="flex-1 w-full text-right">
                       <h3 className={`font-bold text-lg mb-1 ${isClosedList ? 'text-gray-600' : 'text-blue-600'}`}>
 {course?.name || 'غير معروف'} <span className="text-blue-600 font-black">({group?.name || 'بدون مجموعة'})</span>
 <span className="text-gray-800 font-medium text-base">: {session.topic}</span>
 
 {/* إضافة توقيت الحصة والبدء الفعلي */}
 <span className="mr-2 text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 font-bold">
   ⏰ {session.scheduled_start_time ? (
    (() => {
        const [h, m] = session.scheduled_start_time.split(':');
        let hours = parseInt(h);
        const ampm = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12 || 12;
        return `${hours}:${m} ${ampm}`;
    })()
  ) : '--:--'}
 </span>
 
 {session.actual_start_time && (
   <span className="mr-1 text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded border border-green-100 font-bold">
     ✍️ بدأ الشرح
   </span>
 )}

 {isClosedList && <span className="mr-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded border border-gray-300 font-bold">منتهية 🔒</span>}
</h3>
                       <p className="text-gray-500 text-sm">👨‍🏫 {course?.instructor || 'غير معروف'} | 📅 {new Date(session.created_at).toLocaleDateString('ar-EG')}</p>
                   </div>
                   <div className="flex gap-2 flex-wrap justify-center">
                       <div className="stat-badge bg-yellow-50 text-yellow-800 border-yellow-200"><span>الحضور</span><strong>{stats.count}</strong></div>
                       <div className="stat-badge bg-green-50 text-green-800 border-green-200"><span>الدخل</span><strong>{stats.totalIncome.toFixed(2)}</strong></div>
                       <div className="stat-badge bg-red-50 text-red-800 border-red-200"><span>السنتر</span><strong>{stats.centerTotal.toFixed(2)}</strong></div>
                       <div className="stat-badge bg-blue-50 text-blue-800 border-blue-200"><span>المدرس</span><strong>{stats.teacherTotal.toFixed(2)}</strong></div>
                   </div>
                   <div className="flex gap-2 mt-2 md:mt-0">
                       <button onClick={() => openSession(session)} className="bg-gray-700 hover:bg-black text-white px-5 py-2 rounded font-bold text-sm transition">إدارة الدفتر</button>
                       {!isClosedList && <button onClick={() => handleDeleteSession(session.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded transition border border-red-200"><FaTrash/></button>}
                   </div>
               </div>
           );
         })
       )}
     </div>

{showReportModal && reportData && (
    <div className="fixed inset-0 bg-black/60 z-[3000] flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:p-0 print:static">
        <div id="printable-report" className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col print:h-auto print:shadow-none print:w-full">
            
            {/* 1. الهيدر (ثابت) */}
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0 print:hidden">
                <h2 className="text-xl font-bold text-gray-800">{reportData.title}</h2>
                <div className="flex gap-2">
                   <button onClick={() => { setModalFilterGrade(''); setModalFilterCourse(''); }} className="text-xs bg-gray-200 px-3 py-1 rounded-lg font-bold text-gray-600 hover:bg-gray-300 transition">تصفير الفلتر</button>
                   <button onClick={() => { setShowReportModal(false); setReportData(null); }} className="text-2xl text-gray-400 font-bold hover:text-red-500 transition">&times;</button>
                </div>
            </div>

            {/* 2. منطقة المحتوى القابلة للتمرير */}
            <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-white print:p-4 print:overflow-visible">
                
                {/* 🚀 بار الفلترة داخل المودال (يختفي في الطباعة) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-300 print:hidden">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-400 mr-2">تصفية حسب الصف</label>
                        <select 
                            value={modalFilterGrade} 
                            onChange={(e) => setModalFilterGrade(e.target.value)}
                            className="w-full p-2 rounded-xl border-2 border-white shadow-sm outline-none focus:border-blue-500 transition-all text-sm font-bold"
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
                            className="w-full p-2 rounded-xl border-2 border-white shadow-sm outline-none focus:border-blue-500 transition-all text-sm font-bold"
                        >
                            <option value="">جميع المواد والمدرسين</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.instructor}</option>)}
                        </select>
                    </div>
                </div>

                {/* رأس التقرير (اللوجو والاسم) */}
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                    {centerConfig?.logo_url && (
                      <img src={centerConfig.logo_url} alt="Logo" className="h-32 mx-auto mb-4 object-contain" />
                    )}
                    <h1 className="text-4xl font-black text-blue-900 mb-1 tracking-tighter">{centerConfig?.center_name || "SMART CENTER"}</h1>
                    <p className="text-gray-500 font-bold text-lg">{reportData.title}</p>
                    <p className="text-gray-400 text-sm italic">مستخرج بتاريخ {reportData.date}</p>
                </div>

                {(() => {
                    const filteredRows = reportData.rows.filter(r => {
                        const matchGrade = !modalFilterGrade || r.course?.grade === modalFilterGrade;
                        const matchCourse = !modalFilterCourse || r.course_id === modalFilterCourse;
                        return matchGrade && matchCourse;
                    });

                    const dynamicTotals = filteredRows.reduce((acc, curr) => ({
                        income: acc.income + curr.stats.totalIncome,
                        teacher: acc.teacher + curr.stats.teacherTotal,
                        center: acc.center + curr.stats.centerTotal,
                        debt: acc.debt + curr.debt
                    }), { income: 0, teacher: 0, center: 0, debt: 0 });

                    return (
                        <>
                            {/* كروت الإحصائيات الملونة */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 print:mb-6">
                                <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl text-center shadow-sm">
                                    <span className="block text-blue-600 font-bold text-xs mb-1 uppercase">إجمالي الدخل</span>
                                    <strong className="text-2xl font-black text-blue-900">{dynamicTotals.income.toFixed(2)}</strong>
                                    <span className="text-[10px] block text-blue-400 mt-1">جنيه مصري</span>
                                </div>
                                <div className="bg-green-50 border-2 border-green-100 p-4 rounded-2xl text-center shadow-sm">
                                    <span className="block text-green-600 font-bold text-xs mb-1 uppercase">صافي المدرسين</span>
                                    <strong className="text-2xl font-black text-green-900">{dynamicTotals.teacher.toFixed(2)}</strong>
                                    <span className="text-[10px] block text-green-400 mt-1">مستحقات خارجية</span>
                                </div>
                                <div className="bg-purple-50 border-2 border-purple-100 p-4 rounded-2xl text-center shadow-sm">
                                    <span className="block text-purple-600 font-bold text-xs mb-1 uppercase">نصيب السنتر</span>
                                    <strong className="text-2xl font-black text-purple-900">{dynamicTotals.center.toFixed(2)}</strong>
                                    <span className="text-[10px] block text-purple-400 mt-1">الربح الصافي</span>
                                </div>
                                <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl text-center shadow-sm">
                                    <span className="block text-red-600 font-bold text-xs mb-1 uppercase">إجمالي الديون</span>
                                    <strong className="text-2xl font-black text-red-900">{dynamicTotals.debt.toFixed(2)}</strong>
                                    <span className="text-[10px] block text-red-400 mt-1">مبالغ لم تُحصل</span>
                                </div>
                            </div>

                            <h3 className="font-black text-gray-700 mb-4 flex items-center gap-2 border-r-4 border-blue-600 pr-3">
                                <FaCalendarAlt className="text-blue-600"/> تفاصيل الحصص المفلترة:
                            </h3>
                            
                            <div className="overflow-x-auto mb-10 shadow-md rounded-xl border border-gray-200">
                                <table className="w-full text-center border-collapse text-sm">
                                    <thead className="bg-blue-700 text-white font-bold">
                                        <tr>
                                            <th className="p-4 border-b border-blue-800">التاريخ</th>
                                            <th className="p-4 border-b border-blue-800">المادة</th>
                                            <th className="p-4 border-b border-blue-800">المجموعة</th>
                                            <th className="p-4 border-b border-blue-800 tracking-tighter">الحضور</th>
                                            <th className="p-4 border-b border-blue-800">المدرس</th>
                                            <th className="p-4 border-b border-blue-800">صافي المدرس</th>
                                            <th className="p-4 border-b border-blue-800">الديون</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRows.map((r, i) => (
                                            <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="p-3 font-medium text-gray-600">{new Date(r.created_at).toLocaleDateString('ar-EG')}</td>
                                                <td className="p-3 font-black text-gray-800">{r.course?.name || '---'}</td>
                                                <td className="p-3 font-bold text-blue-600 bg-blue-50/30">{r.group?.name || '---'}</td>
                                                <td className="p-3 font-black text-gray-700">{r.stats.count}</td>
                                                <td className="p-3 font-medium text-blue-900">{r.course?.instructor || '---'}</td>
                                                <td className="p-3 font-black text-green-700">{r.stats.teacherTotal.toFixed(2)}</td>
                                                <td className={`p-3 font-black ${r.debt > 0 ? 'text-red-600 bg-red-50/30' : 'text-gray-400'}`}>{r.debt.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 🚀 قسم الحالات الخاصة المطور: بدون تكرار ومع تفاصيل كاملة */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* صندوق الخصومات الجزئية */}
                                <div className="border-2 border-yellow-200 rounded-2xl p-5 bg-yellow-50/30 shadow-sm">
                                    <h4 className="font-black text-yellow-800 mb-4 border-b border-yellow-200 pb-2 flex items-center gap-2">
                                        <FaExclamationTriangle/> طلاب بخصومات جزئية (مدمج)
                                    </h4>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Array.from(new Set(filteredRows.flatMap(r => 
                                            students.filter(s => r.attendees?.includes(s.unique_id) && s.course_discounts?.[r.course_id] > 0)
                                            .map(s => JSON.stringify({
                                                id: s.id, 
                                                name: s.name, 
                                                grade: r.course?.grade, 
                                                courseName: r.course?.name, 
                                                teacher: r.course?.instructor,
                                                discount: s.course_discounts[r.course_id]
                                            }))
                                        ))).map(str => {
                                            const item = JSON.parse(str);
                                            return (
                                              <div key={item.id + item.courseName} className="flex justify-between items-start border-b border-yellow-100 py-2 last:border-0">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                                                    <span className="text-[10px] text-gray-500 leading-tight">
                                                        {item.grade} - {item.courseName} - م/ {item.teacher}
                                                    </span>
                                                </div>
                                                <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap">-{item.discount} ج</span>
                                              </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* صندوق الإعفاء الكامل */}
                                <div className="border-2 border-green-200 rounded-2xl p-5 bg-green-50/30 shadow-sm">
                                    <h4 className="font-black text-green-800 mb-4 border-b border-green-200 pb-2 flex items-center gap-2">
                                        <FaCheckCircle/> طلاب إعفاء كامل (مدمج)
                                    </h4>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Array.from(new Set(filteredRows.flatMap(r => 
                                            students.filter(s => r.attendees?.includes(s.unique_id) && s.is_free)
                                            .map(s => JSON.stringify({
                                                id: s.id, 
                                                name: s.name, 
                                                grade: r.course?.grade, 
                                                courseName: r.course?.name, 
                                                teacher: r.course?.instructor
                                            }))
                                        ))).map(str => {
                                            const item = JSON.parse(str);
                                            return (
                                              <div key={item.id + item.courseName} className="flex justify-between items-start border-b border-green-100 py-2 last:border-0">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                                                    <span className="text-[10px] text-gray-500 leading-tight">
                                                        {item.grade} - {item.courseName} - م/ {item.teacher}
                                                    </span>
                                                </div>
                                                <span className="text-green-600 font-black text-[10px] bg-green-100 px-2 py-0.5 rounded-full">إعفاء</span>
                                              </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* 3. الفوتر (ثابت) */}
            <div className="p-6 border-t bg-gray-50 flex justify-center gap-4 flex-shrink-0 print:hidden">
                <button onClick={() => window.print()} className="bg-red-600 text-white px-10 py-3 rounded-xl font-black shadow-lg hover:bg-red-700 transition flex items-center gap-2 active:scale-95">
                    <FaPrint size={20}/> طباعة التقرير المفلتر
                </button>
                <button onClick={handleExportExcel} className="bg-green-700 text-white px-10 py-3 rounded-xl font-black shadow-lg hover:bg-green-800 transition flex items-center gap-2 active:scale-95">
                    <FaFileExcel size={20}/> تصدير Excel
                </button>
            </div>
        </div>
    </div>
)}

     {activeSession && !showReportModal && (
 <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-2 backdrop-blur-sm print:bg-white print:p-0">
   <div className="bg-white w-full max-w-[98%] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:shadow-none print:w-full print:h-auto">
     
     {/* هيدر المودال المطور */}
     <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:hidden shadow-sm">
       <div className="flex items-center gap-4 flex-wrap">
         <div>
           <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
             <FaChalkboardTeacher className="text-blue-600" />
             {activeSession.topic}
             {activeSession.is_completed && <span className="mr-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">مغلقة 🔒</span>}
           </h2>
           <div className="flex gap-3 mt-1">
             <span className="text-[10px] font-bold text-gray-500 bg-white border px-2 py-0.5 rounded-md shadow-sm">
               المدرس: {courses.find(c => c.id === activeSession.course_id)?.instructor || '---'}
             </span>
             <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md shadow-sm">
               موعد الجدول: {activeSession.scheduled_start_time ? (
  (() => {
    const [h, m] = activeSession.scheduled_start_time.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12; // تحويل الساعة 0 لـ 12
    return `${hours}:${m} ${ampm}`;
  })()
) : '--:--'}
             </span>
           </div>
         </div>

         {!activeSession.is_completed && (
           <div className="flex gap-2 items-center mr-4 border-r pr-4 border-gray-200">
             {/* ✅ زر بدء الشرح الفعلي */}
             {!activeSession.actual_start_time ? (
               <button 
                 onClick={handleStartActualLesson} 
                 className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-black shadow-lg shadow-green-100 transition-all animate-pulse active:scale-95"
               >
                 <FaCheckCircle /> بدء الشرح الفعلي الآن
               </button>
             ) : (
               <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-[10px] font-black border-2 border-green-200 flex items-center gap-2">
                 <FaCheckCircle className="animate-bounce" /> بدأ الشرح {new Date(activeSession.actual_start_time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
               </div>
             )}

             <button onClick={handleEndSession} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-black shadow-lg shadow-red-100 transition-all active:scale-95">
               <FaLock /> إنهاء الجلسة
             </button>
           </div>
         )}
       </div>
       
       <button onClick={closeSession} className="w-10 h-10 rounded-full bg-white border-2 hover:bg-red-50 text-gray-400 hover:text-red-500 font-bold text-xl flex items-center justify-center transition-all shadow-sm">&times;</button>
     </div>
     
     {/* محتوى المودال القابل للتمرير */}
     <div className="flex-1 overflow-y-auto p-4">
       
       {/* إيصال المدرس (يظهر في الطباعة أو عند طلب المعاينة) */}
       {reportType === 'receipt' && (
         <div id="printable-receipt" className="hidden print:block p-8 bg-white text-black text-right dir-rtl">
           <div className="max-w-2xl mx-auto border-4 border-double border-gray-800 p-6 rounded-lg bg-white">
             <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                 {centerConfig?.logo_url && (
                   <img src={centerConfig.logo_url} alt="Center Logo" className="h-32 mx-auto mb-4 object-contain" />
                 )}
                 <h1 className="text-2xl font-bold mb-1">{centerConfig?.center_name || "SMART CENTER"}</h1>
                 <h2 className="text-xl bg-gray-100 inline-block px-4 py-1 rounded border border-black font-bold">إيصال تسوية مالية (مدرس)</h2>
             </div>

             <div className="grid grid-cols-2 gap-y-3 mb-6 text-base font-bold text-gray-800">
                 <p><span>التاريخ:</span> {new Date(activeSession.created_at).toLocaleDateString('ar-EG')}</p>
                 <p><span>المدرس:</span> {courses.find(c => c.id === activeSession.course_id)?.instructor || '---'}</p>
                 <p><span>المادة:</span> {courses.find(c => c.id === activeSession.course_id)?.name || '---'}</p>
                 <p><span>المجموعة:</span> {groups.find(g => g.id === activeSession.group_id)?.name || '---'}</p>
                 <p><span>الصف الدراسي:</span> {courses.find(c => c.id === activeSession.course_id)?.grade || '---'}</p> 
                 <p><span>عدد الحضور:</span> {liveStats.count} طالب</p>
             </div>

             <div className="border-t-2 border-gray-400 pt-4 mb-6">
                 <table className="w-full text-center border-collapse border border-black text-sm font-bold">
                     <thead className="bg-gray-50">
                         <tr><th className="border border-black p-2">البيان</th><th className="border border-black p-2">القيمة</th></tr>
                     </thead>
                     <tbody>
                         <tr>
                             <td className="border border-black p-2 text-right">إجمالي المحصل من الطلاب</td>
                             <td className="border border-black p-2">{liveStats.totalIncome.toFixed(2)} ج.م</td>
                         </tr>
                         <tr>
                             <td className="border border-black p-2 text-right">رسوم السنتر المتفق عليها (عن كل طالب)</td>
                             <td className="border border-black p-2 text-red-600">{parseFloat(activeSession.fixed_share).toFixed(2)} ج.م</td>
                         </tr>
                         <tr className="bg-gray-100 text-lg">
                             <td className="border border-black p-2 text-right font-black">صافي مستحقات المدرس (المستلم)</td>
                             <td className="border border-black p-2 text-blue-900 font-black">{liveStats.teacherTotal.toFixed(2)} ج.م</td>
                         </tr>
                     </tbody>
                 </table>
             </div>

             <div className="mb-8">
                 <p className="font-bold mb-2 text-[11px] underline">ملاحظات الحالات الخاصة (إعفاء/خصم):</p>
                 <div className="text-[10px] grid grid-cols-2 gap-x-4 italic text-gray-600">
                     {students.filter(s => attendanceMap[s.id] && (s.course_discounts?.[activeSession.course_id] > 0 || s.is_free)).map(s => (
                         <div key={s.id} className="border-b border-gray-200 py-0.5">• {s.name} : {s.is_free ? 'إعفاء كامل' : `خصم ${s.course_discounts[activeSession.course_id]} ج`}</div>
                     ))}
                 </div>
             </div>

             <div className="flex justify-between mt-12 px-8 font-bold text-sm">
                 <div className="text-center"><p className="mb-8 italic">إدارة السنتر</p><p>........................</p></div>
                 <div className="text-center"><p className="mb-8 italic">توقيع المدرس</p><p>........................</p></div>
                 <div className="mt-4 text-center text-xs text-gray-500 italic">
                   {centerConfig?.report_footer || ""}
                 </div>
             </div>
           </div>
         </div>
       )}

{/* قسم التحضير والجدول (يختفي في طباعة الإيصال) */}
       {reportType !== 'receipt' && (
         <>
           <div className="flex flex-col md:flex-row gap-4 mb-4 print:hidden bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm items-end">
               
               {/* 1. خانة الباركود (تم دمج منطق isAutoMode هنا) */}
               <div className="flex-[2] w-full relative">
                   <label className="block text-[10px] font-black text-blue-600 mb-1 uppercase tracking-wider">⚡ تحضير سريع (باركود)</label>
                   <div className="relative">
                       <FaQrcode className="absolute top-3 right-3 text-blue-500 animate-pulse"/>
                       <input 
                           type="text" 
                           placeholder="وجه السكانر هنا..." 
                           className="w-full p-2.5 pr-10 border-2 border-blue-400 rounded-lg outline-none focus:ring-4 focus:ring-blue-100 bg-white font-bold text-blue-800 shadow-sm"
                           onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                   const code = e.target.value.trim();
                                   const student = students.find(s => s.unique_id === code);
                                   if (student) {
                                       const isEnrolled = student.enrolled_courses?.includes(activeSession.course_id);
                                       // التعديل: إذا لم يكن مسجلاً وكنا في الوضع العادي نطلب تأكيد، وإلا حضره فوراً
                                       if (!isEnrolled && !isAutoMode) {
                                           new Audio('https://assets.mixkit.co/active_storage/sfx/1073/1073-preview.mp3').play().catch(() => {});
                                           alert(`⚠️ الطالب ${student.name} غير مسجل بهذا الكورس!`);
                                       } else {
                                           handleAttendanceChange(student.id, true, true);
                                       }
                                       e.target.value = ''; 
                                   } else {
                                       new Audio('https://assets.mixkit.co/active_storage/sfx/1073/1073-preview.mp3').play().catch(() => {});
                                       alert("⚠️ الكود غير صحيح أو طالب غير مسجل");
                                       e.target.value = '';
                                   }
                               }
                           }}
                           autoFocus 
                       />
                   </div>
               </div>

               {/* 🚀 إضافة زر وضع الدمج (Switch) بجانب الباركود مباشرة */}
               <div className="flex-1 w-full">
                   <button 
                       type="button"
                       onClick={() => setIsAutoMode(!isAutoMode)}
                       className={`w-full h-[46px] rounded-lg border-2 flex items-center justify-between px-4 transition-all ${
                           isAutoMode 
                           ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
                           : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200'
                       }`}
                   >
                       <div className="flex flex-col items-start leading-none text-right">
                           <span className="text-[9px] font-black uppercase opacity-80">وضع الدمج</span>
                           <span className="text-[11px] font-bold">{isAutoMode ? 'نشط الآن' : 'معطل'}</span>
                       </div>
                       <div className="text-2xl">
                           {isAutoMode ? <FaToggleOn /> : <FaToggleOff />}
                       </div>
                   </button>
               </div>

               <div className="flex-[2] w-full relative">
                   <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">🔍 بحث يدوي بالاسم</label>
                   <div className="relative">
                       <FaSearch className="absolute top-3.5 right-3 text-gray-400"/>
                       <input 
                           type="text" 
                           placeholder="بحث بالاسم أو الكود..." 
                           value={modalSearchTerm} 
                           onChange={(e) => setModalSearchTerm(e.target.value)} 
                           className="w-full p-2.5 pr-10 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-500 shadow-sm transition" 
                       />
                   </div>
               </div>

               <div className="flex-1 w-full flex items-end">
                   <button onClick={() => setScannerActive(!scannerActive)} className="w-full h-[46px] bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95">
                       <FaQrcode /> {scannerActive ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
                   </button>
               </div>
           </div>

           {scannerActive && <div className="mb-4 mx-auto w-full max-w-sm"><div id="reader" className="border-4 border-purple-600 rounded-lg overflow-hidden shadow-md"></div></div>}
           
           <div className="border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white mb-10">
               <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-200 print:hidden">
    <div className="flex items-center gap-4">
        {/* شارة عدد الحضور */}
        <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-xl border border-green-200 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-green-800 font-black text-xs md:text-sm">
                عدد الحضور: {filteredStudents.filter(s => attendanceMap[s.id]).length} طالب
            </p>
        </div>

        {/* شارة عدد الغائبين */}
        <div className="flex items-center gap-2 bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 shadow-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <p className="text-red-800 font-black text-xs md:text-sm">
                عدد الغائبين حالياً: {filteredStudents.filter(s => !attendanceMap[s.id]).length} طالب
            </p>
        </div>
    </div>
    
    <button 
        onClick={handleMassAbsentAlert}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold text-[10px] md:text-xs flex items-center gap-2 shadow-md transition active:scale-95"
    >
        <FaWhatsapp className="text-base" /> مراسلة جميع الغائبين
    </button>
</div>
               <div className="overflow-x-auto">
                   <table className="w-full text-right border-collapse text-sm">
                       <thead className="bg-gray-800 text-white sticky top-0 z-10 font-bold">
                           <tr>
                               <th className="p-3">الطالب</th>
                               <th className="p-3 text-center">المجموعة</th>
                               <th className="p-3 text-center">حالة الحضور</th>
                               <th className="p-3 text-center">المطلوب</th>
                               <th className="p-3 text-center">المدفوع</th>
                               <th className="p-3 text-center">المتبقي</th>
                               <th className="p-3 text-center">تسجيل</th>
                               <th className="p-3 text-center print:hidden">واتساب</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {filteredStudents.length === 0 ? (
                               <tr><td colSpan="8" className="p-10 text-center text-gray-400 italic">لا توجد نتائج</td></tr>
                           ) : (
                               filteredStudents.map(student => {
                                   const isPresent = attendanceMap[student.id] || false;
                                   const totalStudentDebt = calculateTotalStudentDebt(student.id);
                                   const studentGroupId = student.group_ids?.[activeSession.course_id];
                                   const isSameGroup = studentGroupId === activeSession.group_id;

                                   let required = parseFloat(activeSession.price) || 0;
                                   if (student.is_free) { required = 0; } 
                                   else if (student.course_discounts?.[activeSession.course_id]) {
                                       required = Math.max(0, required - parseFloat(student.course_discounts[activeSession.course_id]));
                                   }
                                   
                                   const paid = parseFloat(paymentsMap[student.id]) || 0;
                                   const remaining = isPresent ? Math.max(0, required - paid) : 0;

                                   return (
                                       <tr key={student.id} className={`hover:bg-blue-50 transition-colors ${isPresent ? 'bg-green-50' : ''} ${!isSameGroup ? 'opacity-70' : ''}`}>
                                           <td className="p-2">
                                   <div className="flex flex-col gap-1">
                                       <div className="flex flex-wrap items-center gap-1.5">
                                           <span className="font-black text-gray-800">{student.name}</span>
                                           
                                           {/* عرض رصيد المحفظة (أيقونة) */}
                                           {student.has_wallet && (
                                               <FaWallet className="text-blue-500 text-[10px]" title={`رصيد المحفظة: ${student.wallet_balance} ج`} />
                                           )}
                                           
                                           {/* شارة الإعفاء */}
                                           {student.is_free && (
                                               <span className="bg-green-100 text-green-700 text-[8px] px-1.5 py-0.5 rounded-md font-black border border-green-200 flex items-center gap-0.5">
                                                   <FaCheckCircle size={7} /> اعفاء
                                               </span>
                                           )}
                                           
                                           {/* شارة الخصم */}
                                           {student.course_discounts?.[activeSession.course_id] > 0 && !student.is_free && (
                                               <span className="bg-orange-100 text-orange-700 text-[8px] px-1.5 py-0.5 rounded-md font-black border border-orange-200">
                                                   خصم {student.course_discounts[activeSession.course_id]} ج
                                               </span>
                                           )}
                                           
                                           {/* تنبيه المديونية العالية */}
                                           {calculateTotalStudentDebt(student.id) >= (centerConfig?.debt_limit || 300) && (
                                               <FaExclamationTriangle className="text-red-600 text-xs animate-bounce" />
                                           )}
                                       </div>

                                       {/* عرض الرصيد والديون كنص تحت الاسم */}
                                       <div className="flex flex-col gap-0.5">
                                           <div className="text-[10px] text-gray-400 font-mono leading-none">{student.unique_id}</div>
                                           
                                           {student.has_wallet && (
                                               <div className="text-[10px] font-bold text-blue-600 italic">
                                                   💰 محفظة: {parseFloat(student.wallet_balance || 0).toFixed(2)} ج
                                               </div>
                                           )}
                                           
                                           {calculateTotalStudentDebt(student.id) > 0 && (
                                               <div className="text-[9px] font-bold text-red-500 italic underline">
                                                   مديونية سابقة: {calculateTotalStudentDebt(student.id).toFixed(2)} ج
                                               </div>
                                           )}
                                       </div>
                                   </div>
                               </td>
                                                                           
                                           <td className="p-2 text-center">
                                               <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isSameGroup ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                   {groups.find(g => g.id === studentGroupId)?.name || 'غير مسكن'}
                                               </span>
                                           </td>

                                           <td className="p-2 text-center font-bold">
                                               {isPresent ? <span className="text-green-600 text-[10px]">✅ حاضر</span> : <span className="text-red-400 text-[10px]">❌ غاب</span>}
                                           </td>
                                           
                                           <td className="p-2 text-center font-bold text-gray-700">
                                               {required.toFixed(2)}
                                           </td>
                                           
                                           <td className="p-2 text-center">
                                               <input 
                                                   type="number" 
                                                   step="0.01" 
                                                   className="w-16 p-1 border-2 rounded text-center font-bold outline-none" 
                                                   value={paid || ''} 
                                                   onChange={(e) => { 
                                                       setPaymentsMap({...paymentsMap, [student.id]: parseFloat(e.target.value) || 0}); 
                                                       if(parseFloat(e.target.value) > 0 && !isPresent) handleAttendanceChange(student.id, true); 
                                                   }} 
                                                   disabled={activeSession.is_completed} 
                                               />
                                           </td>
                                           
                                           <td className={`p-2 text-center font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                               {remaining.toFixed(2)}
                                           </td>
                                           
                                           <td className="p-2 text-center">
                                               <input 
                                                   type="checkbox" 
                                                   className="w-5 h-5 accent-blue-600 cursor-pointer" 
                                                   checked={isPresent} 
                                                   onChange={(e) => handleAttendanceChange(student.id, e.target.checked)} 
                                                   disabled={activeSession.is_completed} 
                                               />
                                           </td>

                                           <td className="p-2 text-center print:hidden">
                                               {!isPresent && student.parent_phone && (
                                                   <button 
                                                       onClick={() => { 
                                                           let phone = student.parent_phone?.replace(/\D/g, '') || ''; 
                                                           if (phone.startsWith('01')) phone = '2' + phone;
                                                           const courseData = courses.find(c => c.id === activeSession?.course_id);
                                                           const sessionTopic = activeSession?.topic && activeSession.topic !== "." 
                                                               ? activeSession.topic 
                                                               : `حصة ${courseData?.name || ''}`;
                                                           let template = centerConfig?.msg_absent || "نحيطكم علماً بغياب الطالب [name] عن حصة [topic]";
                                                           const finalMsg = template
                                                               .replace(/\[name\]/g, student.name)
                                                               .replace(/\[topic\]/g, sessionTopic)
                                                               .replace(/\[center\]/g, centerConfig?.center_name || "SMART CENTER");
                                                           window.open(`https://wa.me/${phone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
                                                       }} 
                                                       className="text-green-600 hover:text-green-800 text-xl transition-transform active:scale-90"
                                                   >
                                                       <FaWhatsapp />
                                                   </button>
                                               )}
                                           </td>
                                       </tr>
                                   );
                               })
                           )}
                       </tbody>
                   </table>
               </div>
           </div>
         </>
       )}
       </div>

     {/* الجزء بتاع الزراير اللي في أسفل المودال */}
     <div className="p-3 border-t bg-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
         <div className="flex gap-4 font-bold text-sm bg-white p-2 rounded-lg border shadow-sm">
             <span className="text-green-600">المحصل: {liveStats.totalIncome.toFixed(2)} ج</span>
             <span className="text-blue-600">صافي المدرس: {liveStats.teacherTotal.toFixed(2)} ج</span>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
             <button onClick={() => handlePrint('receipt')} className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-md transition">
                 <FaFileInvoiceDollar /> إيصال مدرس
             </button>
             <button onClick={() => handlePrint('ledger')} className="flex-1 md:flex-none bg-gray-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-md transition">
                 <FaPrint /> طباعة الدفتر
             </button>
             {!activeSession.is_completed && (
                 <button onClick={() => saveLedger(false)} className="flex-1 md:flex-none bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-xs shadow-md transition">
                     <FaCheck /> حفظ التعديلات
                 </button>
             )}
         </div>
     </div> 
   </div> 
 </div> 
)}

{reportType === 'ledger' && activeSession && (
    <div id="printable-ledger" className="hidden print:block p-8 bg-white">
           <div className="text-center mb-6 border-b-2 border-black pb-4">
       {centerConfig?.logo_url && (
         <img src={centerConfig.logo_url} alt="Logo" className="h-16 mx-auto mb-2 object-contain" />
       )}
       <h1 className="text-2xl font-bold">{centerConfig?.center_name || "دفتر حضور وانصراف وحسابات"}</h1>
       <h2 className="text-xl text-blue-800">{activeSession.topic} - {groups.find(g=>g.id===activeSession.group_id)?.name}</h2>
               <p className="text-gray-500 font-bold">تاريخ الحصة: {new Date(activeSession.created_at).toLocaleDateString('ar-EG')}</p>
           </div>
           <table className="w-full border-collapse border-2 border-black text-sm text-center">
               <thead><tr className="bg-gray-100 font-bold"><th className="border-2 border-black p-2">م</th><th className="border-2 border-black p-2">اسم الطالب</th><th className="border-2 border-black p-2">الحالة</th><th className="border-2 border-black p-2">المطلوب</th><th className="border-2 border-black p-2">المدفوع</th><th className="border-2 border-black p-2">المتبقي</th></tr></thead>
               <tbody>{filteredStudents.map((s, i) => {
                   const isPresent = attendanceMap[s.id];
                   const paid = parseFloat(paymentsMap[s.id]) || 0;
                   let required = parseFloat(activeSession.price) || 0;
                   if (s.is_free) required = 0;
                   else if (s.course_discounts?.[activeSession.course_id]) {
                     const discount = parseFloat(s.course_discounts[activeSession.course_id]) || 0;
                     required = Math.max(0, required - discount);
                   }
                   const remaining = isPresent ? Math.max(0, required - paid) : 0;
                   return (
                       <tr key={s.id}>
                           <td className="border-2 border-black p-2">{i+1}</td><td className="border-2 border-black p-2 text-right font-bold">{s.name}</td><td className="border-2 border-black p-2">{isPresent ? '✅' : '❌'}</td>
                           <td className="border-2 border-black p-2">{required.toFixed(2)}</td><td className="border-2 border-black p-2">{paid.toFixed(2)}</td><td className="border-2 border-black p-2 font-bold">{remaining.toFixed(2)}</td>
                       </tr>
                   );
               })}</tbody>
           </table>
           <div className="mt-8 flex justify-between font-bold border-t-2 border-black pt-4">
               <p>إجمالي الحضور: {liveStats.count}</p><p>إجمالي المحصل: {liveStats.totalIncome.toFixed(2)} ج.م</p><p>اعتماد الإدارة: ....................</p>
           </div>
       </div>
     )}
     
<style jsx global>{`
 .stat-badge { 
   padding: 5px 12px; 
   border-radius: 12px; 
   text-align: center; 
   min-width: 85px; 
   border: 1px solid; 
   display: flex; 
   flex-direction: column; 
   justify-content: center; 
   box-shadow: 0 2px 4px rgba(0,0,0,0.05); 
 }
 .stat-badge span { 
   font-size: 0.65rem; 
   font-weight: bold; 
   display: block; 
   margin-bottom: 2px; 
   text-transform: uppercase; 
 }
 .stat-badge strong { 
   font-size: 1.1rem; 
 }

 @media print {
   body * { 
     visibility: hidden; 
   }
   
   #printable-ledger, #printable-ledger *, 
   #printable-receipt, #printable-receipt *,
   #printable-report, #printable-report * { 
     visibility: visible !important; 
   }

   #printable-report thead, 
   #printable-report thead tr {
     background-color: #1d4ed8 !important;
     -webkit-print-color-adjust: exact !important;
     print-color-adjust: exact !important;
   }
   
   #printable-report thead th {
     color: white !important;
     background-color: #1d4ed8 !important;
     -webkit-print-color-adjust: exact !important;
   }

   table {
     border-collapse: collapse !important;
     width: 100% !important;
   }
   th, td {
     border: 1px solid #000 !important;
   }

   #__next, body, html {
     height: auto !important;
     overflow: visible !important;
   }

   #printable-ledger, #printable-receipt, #printable-report { 
     position: absolute !important; 
     left: 0 !important; 
     top: 0 !important; 
     width: 100% !important; 
     display: block !important; 
     background: white !important; 
     z-index: 9999 !important;
   }

   .fixed, .modal, [class*="bg-black/"], .backdrop-blur-sm { 
     background: none !important; 
     backdrop-filter: none !important; 
     position: static !important;
   }

   .bg-yellow-50\/30 { background-color: #fefce8 !important; -webkit-print-color-adjust: exact; }
   .bg-green-50\/30 { background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact; }
   
   @page { 
     size: auto; 
     margin: 5mm; 
   }
 }
`}</style>
   </div>
 );
}
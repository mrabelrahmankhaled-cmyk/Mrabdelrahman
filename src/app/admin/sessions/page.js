'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation'; // ← عشان نقرأ URL parameters
import { supabaseBrowser } from '../../../lib/supabase'; // ← نستخدم browser client
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext'; // ← استخدام الـ context للحصول على role
import Link from 'next/link';
import { 
  FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';
import { Toaster } from 'react-hot-toast'; // 🆕 Import Toaster for notifications

// Import our new modular components and hooks
import { useSessionData } from '../../../hooks/useSessionData';
import { useAttendance } from '../../../hooks/useAttendance';
import { useScanner } from '../../../hooks/useScanner';
import { 
  calculateTotalStudentDebt, 
  getSessionDisplayStats, 
  getAvailableGrades, 
  filterCoursesByGrade,
  calculateShareDistribution,
  calculateSessionDebt,
  calculateRequiredPayment
} from '../../../utils/sessionCalculations';

import { SessionsHeader } from '../../../components/sessions/SessionsHeader';
import { CreateSessionForm } from '../../../components/sessions/CreateSessionForm';
import { SessionCard } from '../../../components/sessions/SessionCard';
import { SessionModal } from '../../../components/sessions/SessionModal';
import { PrintableReport } from '../../../components/sessions/PrintableReport';

export default function SessionsPage() {
  const searchParams = useSearchParams(); // ← عشان نقرأ URL parameters
  const router = useRouter(); // ← عشان نعمل redirect
  
  // ملاحظة: لا حاجة للتحقق من المصادقة هنا لأن:
  // 1. الـ middleware يتحقق من المصادقة على مستوى الـ route
  // 2. الـ admin layout يتحقق من المصادقة على مستوى الـ layout
  // 3. التحقق الإضافي هنا يسبب مشاكل في التوقيت
  
  // =============================================================================
  // 0. RUNTIME RENDER GUARDS (Crash Protection)
  // =============================================================================
  const {
    sessions, setSessions,
    courses, setCourses,
    students, setStudents,
    groups, setGroups,
    loading,
    error,
    centerConfig,
    reloadData,
    loadMore,
    loadingMore,
    hasMore,
    refreshData,
    exams,
    subscriptions
  } = useSessionData();

  // 🪄 الـ Magic Effect - استقبال البيانات من Dashboard
  useEffect(() => {
    console.log("🔍 Magic Effect - searchParams:", searchParams.toString());
    
    const action = searchParams.get('action');
    console.log("🔍 Action:", action);
    
    if (action === 'create') {
      // 1. نقرأ البيانات من الرابط
      const courseId = searchParams.get('course_id');
      const groupId = searchParams.get('group_id');
      const topic = searchParams.get('topic');
      const examId = searchParams.get('exam_id');
      const scheduled_start_time = searchParams.get('scheduled_start_time');
      
      console.log("🔍 Data from URL:", { courseId, groupId, topic, examId, scheduled_start_time });

      // 2. نملأ الفورم أوتوماتيك للموظف
      if (courseId && groupId && topic) {
        console.log("🚀 Setting form data...");
        
        const formData = {
          course_id: courseId,
          group_id: groupId,
          topic: topic,
          price: '',
          fixed_share: '',
          scheduled_start_time: scheduled_start_time || '',
          session_type: examId ? 'exam' : 'lesson',
          linked_exam_id: examId || ''
        };
        
        console.log("🚀 Form data being set:", formData);
        
        setNewSession(formData);
        
        // 3. نفتح المودال أو نعمل Focus على الفورم
        console.log("🚀 Opening modal...");
        setShowCreateForm(true);
        
        // 4. ننتظر شوية ونتأكد إن الفورم اتملأ
        setTimeout(() => {
          console.log("🔍 Checking form after timeout:", newSession);
          console.log("🔍 Selected grade:", selectedGrade);
          
          // نضمن إن الـ scheduled_start_time اتمل في الـ input
          const timeInput = document.getElementById('scheduled_start_time');
          if (timeInput && scheduled_start_time) {
            timeInput.value = scheduled_start_time;
            console.log("🕐 Set scheduled_start_time:", scheduled_start_time);
          }
        }, 1000);
        
        console.log("✅ Done! Form should be filled now.");
      } else {
        console.log("❌ Missing data:", { courseId, groupId, topic });
      }
    }
  }, [searchParams, courses]);

  if (!Array.isArray(sessions)) return null;
  if (!Array.isArray(students)) return null;

  // =============================================================================
  // 1. LOCAL STATE
  // =============================================================================
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });
  const [activeSession, setActiveSession] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState(null);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Submit guards for race conditions
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSavingLedger, setIsSavingLedger] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isStartingLesson, setIsStartingLesson] = useState(false);
  
  // Filter states
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [filterCourse, setFilterCourse] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [modalFilterGrade, setModalFilterGrade] = useState('');
  const [modalFilterCourse, setModalFilterCourse] = useState('');
  
  // Form states
  const [selectedGrade, setSelectedGrade] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false); // ← إضافة المتغير الناقص
  const [newSession, setNewSession] = useState({ 
    price: '', 
    fixed_share: '', 
    scheduled_start_time: '',
    session_type: 'lesson',
    linked_exam_id: ''
  });

  const [userRole, setUserRole] = useState(null); // 'admin' or 'staff'
  
  // Modal states
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isAutoMode, setIsAutoMode] = useState(false);

  // 🔄 Auto-update grade when course_id changes
  useEffect(() => {
    if (newSession.course_id && courses.length > 0) {
      const selectedCourse = courses.find(c => c.id === newSession.course_id);
      if (selectedCourse) {
        console.log("🔄 Auto-updating grade to:", selectedCourse.grade);
        console.log("💰 Course price data:", { 
          price: selectedCourse.price, 
          fixed_share: selectedCourse.fixed_share,
          center_tax: selectedCourse.center_tax 
        });
        
        setSelectedGrade(selectedCourse.grade);
        
        // نحدث السعر والرسوم
        setNewSession(prev => ({
          ...prev,
          price: selectedCourse.price || '',
          fixed_share: selectedCourse.fixed_share || selectedCourse.center_tax || ''
        }));
      }
    }
  }, [newSession.course_id, courses, centerConfig]);

  // =============================================================================
  // 🆕 إضافة جديدة: تحديث البيانات عند تغيير التاريخ
  // =============================================================================
  useEffect(() => {
    // نجلب حصص التاريخ المحدد (أو النهاردة) + الحصص المفتوحة
    console.log("📅 Fetching sessions for:", filterDate || 'All Open + History');
    refreshData(filterDate || null); 
  }, [filterDate, refreshData]);

  // =============================================================================
  // 2. USER ROLE FETCHING (استخدام الـ context)
  // =============================================================================
  const { centerId, role: authRole, loading: authLoading, allowedFeatures } = useAuth(); // ← استخدام centerId و role من الـ context
  
  // 🛡️ Route Protection
  useEffect(() => {
    if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_sessions')) {
        // toast.error("🔒 Access Denied"); // Toast might not show if redirected immediately
        router.replace('/admin/dashboard');
    }
  }, [allowedFeatures, authLoading, router]);

  // تحديث userRole عندما يتغير authRole من الـ context
  useEffect(() => {
    if (authRole && !authLoading) {
      setUserRole(authRole);
    }
  }, [authRole, authLoading]);

  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);

  // =============================================================================
  // 3. BUSINESS LOGIC HOOKS
  // =============================================================================
  const attendanceHook = useAttendance(
    activeSession, 
    students, 
    courses, 
    groups, 
    centerConfig, 
    isAutoMode, 
    setStudents,
    subscriptions // 🆕 تزويد الاشتراك الشهري
  );

  const scannerHook = useScanner(
    activeSession, 
    students, 
    attendanceHook.handleAttendanceChange,
    groups,           // 🆕 إضافة المجموعات
    isAutoMode        // 🆕 إضافة وضع الأوتو
  );

  // =============================================================================
  // 4. CALCULATIONS & DERIVED STATE
  // =============================================================================
  const availableGrades = useMemo(() => getAvailableGrades(courses), [courses]);
  
  const filteredCoursesForCreation = useMemo(() => 
    filterCoursesByGrade(courses, selectedGrade), 
    [courses, selectedGrade]
  );

  // 🧠 تصفية قائمة الكورسات بناءً على الصف المختار (Cascade)
  const headerFilteredCourses = useMemo(() => {
    // لو مفيش صف مختار، اعرض كل الكورسات
    if (!filterGrade) return courses;
    
    // لو فيه صف، هات الكورسات اللي Grade بتاعها بيطابق الصف المختار
    return courses.filter(c => c.grade === filterGrade);
  }, [courses, filterGrade]);
  

  const visibleSessions = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return [];
    return sessions.filter(session => {
      const course = courses?.find(c => c.id === session.course_id);

    // 👇 التعديل هنا: اسمح بالمرور لو التاريخ مطابق.. أو.. لو الحصة لسه مفتوحة
      if (filterDate) {
          const isSameDay = session.created_at?.startsWith(filterDate);
          const isActive = !session.is_completed; // الحصة لسه شغالة
          
          // لو التاريخ مش هو هو، وكمان الحصة مقفولة -> اخفيها
          // (بمعنى: اظهرها لو هي في نفس اليوم، أو لو هي لسه مفتوحة ومحتاجة تتقفل)
          if (!isSameDay && !isActive) return false;
      }

      if (filterCourse && session.course_id !== filterCourse) return false;
      if (filterGrade && course?.grade !== filterGrade) return false;
      return true;
    });
  }, [sessions, filterDate, filterCourse, filterGrade, courses]);

  const filteredStudents = useMemo(() => {
    if (!activeSession || !activeSession.course_id || !students || !Array.isArray(students)) return [];
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

  const liveStats = useMemo(() => {
    if (!activeSession || !attendanceHook?.attendanceMap || !attendanceHook?.paymentsMap) {
      return { count: 0, totalIncome: 0, centerTotal: 0, teacherTotal: 0 };
    }
    const attendeesCount = Object.values(attendanceHook.attendanceMap).filter(v => v === true).length;
    const totalIncome = Object.values(attendanceHook.paymentsMap).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    const { centerTotal, teacherTotal } = calculateShareDistribution(
      totalIncome, 
      attendeesCount, 
      activeSession.fixed_share
    );
    return { count: attendeesCount, totalIncome, centerTotal, teacherTotal };
  }, [activeSession, attendanceHook.attendanceMap, attendanceHook.paymentsMap]);

  // =============================================================================
  // 5. EVENT HANDLERS
  // =============================================================================
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ show: false, msg: '', type: '' });
    setTimeout(() => {
      setToast({ show: true, msg, type });
    }, 10);
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (isCreatingSession) return;

    // 🔒 Security Check
    if (!allowedFeatures?.includes('action_add_session')) {
        showToast('🔒 هذه الخاصية غير مفعلة (إضافة حصة)', 'error');
        return;
    }
    
    const topic = newSession.topic?.trim();
    const courseId = newSession.course_id;
    const groupId = newSession.group_id;
    const finalPrice = parseFloat(newSession.price) || 0;
    const fixedShare = parseFloat(newSession.fixed_share) || 0;

    if (!courseId || !topic || !groupId) {
      alert('⚠️ بيانات ناقصة! تأكد من اختيار المادة، المجموعة، وعنوان الحصة.');
      return;
    }

    if (!centerId) {
      alert('⚠️ لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
      return;
    }

    setIsCreatingSession(true);
    try {
      const { data, error } = await supabaseBrowser
        .from('sessions')
        .insert([{ 
          topic: topic, 
          course_id: courseId, 
          group_id: groupId, 
          price: finalPrice, 
          fixed_share: fixedShare,
          scheduled_start_time: newSession.scheduled_start_time, 
          session_type: newSession.session_type || 'lesson',
          linked_exam_id: newSession.linked_exam_id || null,
          attendees: [], 
          payments: {}, 
          is_completed: false,
          center_id: centerId
        }])
        .select();

      if (error) throw error;
      const safeData = Array.isArray(data) ? data : [];
      if (safeData.length > 0) {
        setSessions([safeData[0], ...sessions]);
        setNewSession({ 
          topic: '', 
          course_id: '', 
          group_id: '', 
          price: '', 
          fixed_share: '', 
          scheduled_start_time: '',
          session_type: 'lesson',
          linked_exam_id: ''
        });
        setSelectedGrade('');
        alert('تم فتح الدفتر بنجاح ✅');
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error creating session:', error);
      }
      alert('حدث خطأ أثناء الاتصال بقاعدة البيانات');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleDeleteSession = async (id, isCompleted) => {
    // 🔒 Security Check
    if (!allowedFeatures?.includes('action_delete_session')) {
        showToast('🔒 هذه الخاصية غير مفعلة (حذف حصة)', 'error');
        return;
    }
  // نستخدم userRole اللي جبناه من useEffect (مش من user_metadata)
  console.log(`🗑️ Deleting session: ${id} | isCompleted: ${isCompleted} | userRole: ${userRole}`);
  console.log(`🔍 Current user state:`, { userRole, user: 'checking...' });

  // لو userRole null، نحاول نجيبه من user_metadata كـ fallback
  let currentRole = userRole;
  if (!currentRole) {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    currentRole = session?.user?.user_metadata?.role;
    console.log(`🔄 Fallback to user_metadata: ${currentRole}`);
  }

  if (currentRole !== 'admin' && isCompleted) {
    alert(`⛔ غير مسموح للموظفين بحذف حصة مكتملة.\nدورك الحالي: ${currentRole || 'غير محدد'}`);
    return;
  }

  if (!confirm("هل أنت متأكد من الحذف؟")) return;

  const { error } = await supabaseBrowser.from('sessions').delete().eq('id', id).eq('center_id', centerId);
  if (!error) {
    setSessions(prev => prev.filter(s => s.id !== id));
    showToast("تم الحذف بنجاح ✅");
  } else {
    showToast("فشل الحذف", "error");
  }
};

  const openSession = useCallback((session) => {
    setActiveSession({ ...session });
    setModalSearchTerm('');
    attendanceHook.initializeSessionData({ ...session });
    scannerHook.stopCameraScanner();
  }, [attendanceHook, scannerHook]);

  const closeSession = useCallback(() => {
    setActiveSession(null);
    scannerHook.stopCameraScanner();
    setReportType(null);
    setShowReportModal(false);
    attendanceHook.clearAttendanceData();
  }, [attendanceHook, scannerHook]);

  const saveLedger = useCallback(async (silent = false) => {
    if (isSavingLedger) return null;
    setIsSavingLedger(true);
    
    try {
      const result = await attendanceHook.saveAttendanceData(silent);
      if (result) {
        setSessions(prev => prev.map(s => 
          s.id === activeSession.id 
            ? { ...s, attendees: result.attendeesList, payments: result.paymentsForDB } 
            : s
        ));
        
        if (!silent) {
          showToast('✅ تم حفظ بيانات الحضور والمدفوعات بنجاح', 'success');
        }
        
        return result;
      }
    } catch (error) {
      console.error('Error saving ledger:', error);
      if (!silent) {
        showToast('❌ حدث خطأ أثناء حفظ البيانات', 'error');
      }
    } finally {
      setIsSavingLedger(false);
    }
    
    return null;
  }, [attendanceHook, activeSession, showToast, setSessions, isSavingLedger]);

  // 🆕 Expose saveLedger to window for auto-save
  useEffect(() => {
    window.saveLedger = saveLedger;
    return () => {
      delete window.saveLedger;
    };
  }, [saveLedger]);

  const handleEndSession = useCallback(async () => {
    // 🔒 Security Check
    if (!allowedFeatures?.includes('action_manage_sessions')) {
        showToast('🔒 هذه الخاصية غير مفعلة (إنهاء حصة)', 'error');
        return;
    }

    if (!confirm("إنهاء الجلسة سيقفل الحسابات ويمنع التعديل. هل أنت متأكد؟")) return;
    if (isEndingSession) return;
    
    setIsEndingSession(true);
    try {
      const ledgerResult = await saveLedger(true);
      if (!ledgerResult) return;
      const { error } = await supabaseBrowser
        .from('sessions')
        .update({ 
          is_completed: true, 
          calculated_revenue: liveStats.totalIncome, 
          calculated_center_share: liveStats.centerTotal 
        })
        .eq('id', activeSession.id)
        .eq('center_id', centerId);
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
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error ending session:', error);
      }
      showToast('حدث خطأ في إنهاء الجلسة', 'error');
    } finally {
      setIsEndingSession(false);
    }
  }, [activeSession, liveStats, saveLedger, closeSession, showToast, setSessions, isEndingSession]);

  const handleStartActualLesson = useCallback(async () => {
    // 🔒 Security Check
    if (!allowedFeatures?.includes('action_manage_sessions')) {
        showToast('🔒 هذه الخاصية غير مفعلة (بدء حصة)', 'error');
        return;
    }

    if (!activeSession) return;
    if (!confirm("هل بدأ المستر الشرح الآن؟ سيتم إرسال تنبيه فوري لأولياء الأمور بالحالة الجديدة.")) return;
    if (isStartingLesson) return;

    setIsStartingLesson(true);
    try {
      const now = new Date().toISOString();
      const courseData = courses.find(c => c.id === activeSession.course_id);
      const teacherName = courseData?.instructors?.name || courseData?.instructor || "المدرس";

      const { error: updateError } = await supabaseBrowser
        .from('sessions')
        .update({ actual_start_time: now })
        .eq('id', activeSession.id)
        .eq('center_id', centerId);

      if (updateError) throw updateError;

      const { data: groupStudents } = await supabaseBrowser
        .from('students')
        .select('id, unique_id')
        .eq(`group_ids->>${activeSession.course_id}`, activeSession.group_id)
        .eq('center_id', centerId);

      const safeGroupStudents = Array.isArray(groupStudents) ? groupStudents : [];
      if (safeGroupStudents.length > 0) {
        const actualTimeStr = new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        
        const activities = safeGroupStudents.map(s => ({
          student_id: s.id, // ← Use UUID (id) instead of unique_id
          type: 'attendance',
          title: 'بدأ الشرح الفعلي ✍️',
          description: `بدأ الآن مستر ${teacherName} شرح حصة ${activeSession.topic}.`,
          note: `وقت الجدول: ${activeSession.scheduled_start_time || '---'} | بدأ فعلياً: ${actualTimeStr}`
        }));

        await supabaseBrowser.from('student_activities').insert(activities.map(activity => ({
          ...activity,
          center_id: centerId
        })));
      }

      setActiveSession({ ...activeSession, actual_start_time: now });
      showToast("تم تسجيل بدء الشرح وإبلاغ أولياء الأمور ✅");
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error starting lesson:', e);
      }
      showToast("حدث خطأ أثناء تسجيل بدء الشرح", "error");
    } finally {
      setIsStartingLesson(false);
    }
  }, [activeSession, courses, showToast, setActiveSession, isStartingLesson]);

  const handleMassAbsentAlert = useCallback(() => {
    // 🔒 Security Check
    if (!allowedFeatures?.includes('action_whatsapp_integration')) {
        showToast('🔒 هذه الخاصية غير مفعلة (واتساب)', 'error');
        return;
    }

    const absentStudents = filteredStudents.filter(student => !attendanceHook.attendanceMap[student.id]);
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
  }, [filteredStudents, attendanceHook.attendanceMap, courses, activeSession, centerConfig]);

  const generateReport = useCallback((type) => {
    // 🔒 Security Check
    if (!allowedFeatures?.includes('action_export_reports')) {
        showToast('🔒 هذه الخاصية غير مفعلة (التقارير)', 'error');
        return;
    }

    if (!sessions || !Array.isArray(sessions)) return;
    
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
    
    // Safe initialization with defaults
    let totals = { income: 0, center: 0, teacher: 0, debt: 0, attendance: 0 };
    const rows = (filteredSessions || []).map(s => {
      // Safe stats calculation with fallbacks
      const stats = getSessionDisplayStats(s) || { count: 0, totalIncome: 0, centerTotal: 0, teacherTotal: 0 };
      const sessionDebt = calculateSessionDebt(s, students, subscriptions) || 0;
      
      // Safe accumulation with validation
      totals.income += (stats.totalIncome || 0); 
      totals.center += (stats.centerTotal || 0); 
      totals.teacher += (stats.teacherTotal || 0);
      totals.attendance += (stats.count || 0); 
      totals.debt += sessionDebt;
      
      return { 
        ...s, 
        stats, 
        debt: sessionDebt, 
        course: courses?.find(c => c.id === s.course_id) || {}, 
        group: groups?.find(g => g.id === s.group_id) || {} 
      };
    });
    
    setReportData({ rows, totals, title, date: new Date().toLocaleDateString('ar-EG') });
    setShowReportModal(true);
  }, [sessions, filterDate, reportMonth, students, courses, groups]);

  // =============================================================================
  // 6. EFFECTS
  // =============================================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      scannerHook.handlePhysicalBarcodeScan(e);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannerHook.handlePhysicalBarcodeScan]);

  // =============================================================================
  // 7. RENDER
  // =============================================================================
  if (loading || authLoading) {
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
      

      
      {/* Toast notifications */}
      {toast.show && (
        <div 
          style={{ zIndex: 999999 }}
          className={`fixed top-10 left-1/2 -translate-x-1/2 min-w-[320px] px-8 py-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white text-center font-black animate-bounce flex items-center justify-center gap-3 border-2 ${toast.type === 'error' ? 'bg-red-600 border-red-400' : 'bg-green-600 border-green-400'}`}
        >
          {toast.type === 'error' ? <FaTimesCircle size={28}/> : <FaCheckCircle size={28}/>}
          <span className="text-xl">{toast.msg}</span>
        </div>
      )}

      {/* Reload button */}
      <div className="print:hidden mb-4">
        <button onClick={reloadData} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث البيانات
        </button>
      </div>

      {/* Header with filters */}
      <SessionsHeader
        centerConfig={centerConfig}
        reportMonth={reportMonth}
        setReportMonth={setReportMonth}
        generateReport={generateReport}
        filterGrade={filterGrade}
        setFilterGrade={(val) => {
            setFilterGrade(val);
            setFilterCourse(''); 
        }}
        filterCourse={filterCourse}
        setFilterCourse={setFilterCourse}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        availableGrades={availableGrades}
        courses={headerFilteredCourses}
        allowedFeatures={allowedFeatures} // 🔒
      />

      {/* Create session form */}
      <CreateSessionForm
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        newSession={newSession}
        setNewSession={setNewSession}
        availableGrades={availableGrades}
        filteredCoursesForCreation={filteredCoursesForCreation}
        courses={courses}
        groups={groups}
        exams={exams}
        handleCreateSession={handleCreateSession}
        loading={loading || isCreatingSession}
        allowedFeatures={allowedFeatures} // 🔒
      />

      {/* Sessions list */}
      <div className="grid grid-cols-1 gap-4 print:hidden">
        {visibleSessions.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-10 text-center">
            <div className="text-gray-400 text-4xl mb-4">📚</div>
            <h3 className="text-lg font-bold text-gray-500 mb-2">لا توجد حصص مسجلة</h3>
            <p className="text-gray-400 mb-6">لم يتم العثور على حصص مطابقة لمعايير البحث</p>
            <button onClick={reloadData} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-6 py-2 rounded-lg font-bold text-sm transition">تحديث القائمة</button>
          </div>
        ) : (
          <>
            {visibleSessions.map(session => {
              const stats = getSessionDisplayStats(session);
              const course = courses?.find(x => x.id === session.course_id);
              const group = groups?.find(x => x.id === session.group_id);
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  stats={stats}
                  course={course}
                  group={group}
                  userRole={userRole}
                  onOpenSession={openSession}
                  onDeleteSession={handleDeleteSession}
                  allowedFeatures={allowedFeatures} // 🔒
                />
              );
            })}

            {/* زر عرض المزيد */}
            {hasMore && !filterDate && !filterCourse && !filterGrade && (
              <div className="flex justify-center mt-6 mb-10">
                <button 
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 px-10 py-3 rounded-2xl font-black text-sm shadow-sm transition active:scale-95 flex items-center gap-3 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      جاري التحميل...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                      عرض المزيد من الحصص
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Session modal */}
      {activeSession && !showReportModal && (
        <SessionModal
          activeSession={activeSession}
          sessions={sessions}
          subscriptions={subscriptions}
          onCloseSession={closeSession}
          courses={courses}
          groups={groups}
          centerConfig={centerConfig}
          attendanceMap={attendanceHook.attendanceMap}
          paymentsMap={attendanceHook.paymentsMap}
          setAttendanceMap={attendanceHook.setAttendanceMap}
          setPaymentsMap={attendanceHook.setPaymentsMap}
          handleAttendanceChange={attendanceHook.handleAttendanceChange}
          scannerActive={scannerHook.scannerActive}
          toggleCameraScanner={scannerHook.toggleCameraScanner}
          handleManualBarcodeInput={scannerHook.handleManualBarcodeInput}
          handleBarcodeInput={scannerHook.handleBarcodeInput} // 🆕 New input field handler
          modalSearchTerm={modalSearchTerm}
          setModalSearchTerm={setModalSearchTerm}
          filteredStudents={filteredStudents}
          isAutoMode={isAutoMode}
          setIsAutoMode={setIsAutoMode}
          liveStats={liveStats}
          reportType={reportType}
          setReportType={setReportType}
          saveLedger={saveLedger}
          handleEndSession={handleEndSession}
          handleStartActualLesson={handleStartActualLesson}
          handleMassAbsentAlert={handleMassAbsentAlert}
          students={students}
          setStudents={setStudents}  
          calculateTotalStudentDebt={calculateTotalStudentDebt}
          isSavingLedger={isSavingLedger}
          isEndingSession={isEndingSession}
          isStartingLesson={isStartingLesson}
          allowedFeatures={allowedFeatures} // 🔒
          calculateRequiredPayment={(student, session) => {
            // البحث بدقة عن اشتراك يخص هذه المادة وتاريخ الحصة حصراً
            const studentSubs = (subscriptions || []).filter(s => s.student_id === student.id && s.course_id === session.course_id);
            const activeSub = studentSubs.find(sub => {
              if (!sub.expires_at) return false;
              const expiryDate = new Date(sub.expires_at);
              expiryDate.setHours(23, 59, 59, 999);
              return expiryDate >= new Date(session.created_at);
            });
            return calculateRequiredPayment(student, session, !!activeSub);
          }}
        />
      )}

      {/* Printable report modal */}
      <PrintableReport
        showReportModal={showReportModal}
        setShowReportModal={setShowReportModal}
        reportData={reportData}
        setReportData={setReportData}
        centerConfig={centerConfig || {}}
        modalFilterGrade={modalFilterGrade}
        setModalFilterGrade={setModalFilterGrade}
        modalFilterCourse={modalFilterCourse}
        setModalFilterCourse={setModalFilterCourse}
        availableGrades={availableGrades || []}
        courses={courses || []}
        students={students || []}
      />

     

      <Toaster position="top-center" reverseOrder={false} />

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
      `}</style>
    </div>
  );
}
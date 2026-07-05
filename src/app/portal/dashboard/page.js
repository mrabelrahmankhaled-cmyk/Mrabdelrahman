'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { 
  FaClock, FaMapMarkerAlt, FaChalkboardTeacher, FaBell, FaQrcode, 
  FaCheckCircle, FaInfoCircle, FaWifi, FaSync, FaExclamationTriangle, 
  FaBellSlash, FaHourglassHalf, FaWallet, FaFileInvoiceDollar , FaUserGraduate ,FaSearch, FaSignOutAlt, FaFileAlt,
  FaAward, FaTrophy, FaMedal, FaStar, FaTimes,FaPlayCircle, FaArrowRight, FaShieldAlt
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { setupStudentPushNotifications } from '../../../lib/student-notifications';
import { getCenterSettings } from '../../../lib/settings';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function StudentDashboard() {
  const { centerId, signOut } = useAuth();
  const router = useRouter();
  console.log("🔍 [StudentDashboard] centerId from useAuth:", centerId);
  
  // --------------------------------------------------------------------------
  // ✅ FIX: 1. Declare all Hooks (useState, useRef, etc.) at the TOP
  // --------------------------------------------------------------------------

  const [mounted, setMounted] = useState(false);
  const [mySchedule, setMySchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState(null);
  const [uniqueCode, setUniqueCode] = useState('');
  const [centerSettings, setCenterSettings] = useState({
    name: 'منصة الدكتور عبدالرحمن خالد',
    logo: 'AK',
    logo_url: null,
    description: '',
    primary_color: '#264653',
    phone: '',
    address: ''
  });
  const [isConnected, setIsConnected] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrolledCoursesList, setEnrolledCoursesList] = useState([]);
  
  // --- المميزات الجديدة: حالة الإحصائيات ---
  const [stats, setStats] = useState({ wallet: 0, debt: 0, rate: 0, attended: 0, total: 0 });

  // --- ⏱️ حالات العد التنازلي الجديدة مع الأيام ---
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isNow: false });
  const [notified, setNotified] = useState(false);
  const [examResults, setExamResults] = useState([]);
  const [electronicExams, setElectronicExams] = useState([]); // 🆕
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [showBadgesModal, setShowBadgesModal] = useState(false);

  const unsubscribeRef = useRef(null);
  
  // 🔥 تحسين الخطر الثالث: استخدام مرجع واحد للـ IntersectionObserver لمنع استهلاك الذاكرة
  const observer = useRef(null);
  // 🔥 تحسين الخطر الرابع: منع Chaos الصوت في الإرسال الجماعي
  const lastAudioTime = useRef(0);
  // 🔥 جديد: مرجع لحفظ آخر وقت جلب للبيانات (TTL Cache)
  const lastFetchTime = useRef(0);

  // --------------------------------------------------------------------------
  // ✅ FIX: 2. Define Helper Functions
  // --------------------------------------------------------------------------

  // 5️⃣ ✅ إصلاح الخطر رقم 1: قناة عالمية واحدة بدلاً من مئات القنوات
  const subscribeToGlobalNotifications = (currentUserId) => {
    const channel = supabase
      .channel('notifications-global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          // فلترة داخل الـ payload
            if (payload.new.student_id === currentUserId) {
                // Initialize with empty seen_by and is_read false
                const newNotif = { 
                    ...payload.new, 
                    is_read: false, 
                    seen_by: payload.new.seen_by || [] 
                };
                
                setNotifications((prev) => [newNotif, ...prev]);
            
            const now = Date.now();
            if (document.visibilityState === 'visible' && (now - lastAudioTime.current > 3000)) {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
              audio.play().catch(() => {});
              lastAudioTime.current = now;
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => supabase.removeChannel(channel);
  };

  // 10️⃣ جلب وتحديث الإشعارات فقط (Separation of Concerns)
  const refreshNotificationsOnly = async (userId) => {
    // 📌 جلب center_id من localStorage أو centerId من الـ hook
    const currentCenterId = centerId || localStorage.getItem('active_center_id');
    
    if (!userId) return;

    let notifsQuery = supabase
        .from('notifications')
        .select(`*, notification_views!left (id)`)
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

    if (currentCenterId) {
        notifsQuery = notifsQuery.eq('center_id', currentCenterId);
    }

    const { data: notifs, error } = await notifsQuery;

    if (error) {
        console.error("DEBUG: ❌ Fetch Notifications Error:", error);
    }

    const processed = notifs?.map(n => {
        const isReadInArray = n.seen_by && Array.isArray(n.seen_by) && userId && n.seen_by.includes(userId);
        const isReadInViews = n.notification_views && Array.isArray(n.notification_views) && n.notification_views.length > 0;
        const finalRead = !!(isReadInArray || isReadInViews);
        
        console.log(`DEBUG: 🔔 Notif[${n.id}] | Title: ${n.title} | Final Read: ${finalRead} | Array: ${isReadInArray} | Views: ${isReadInViews}`);
        
        return {
            ...n,
            is_read: finalRead
        };
    }) || [];
    
    console.log("DEBUG: 📊 Total Notifications Processed:", processed.length);
    console.log("DEBUG: 🔴 Unread Count Calced:", processed.filter(n => !n.is_read).length);
    
    // ✅ ملاحظة Senior 3: في الـ Refresh بنعمل Replace كامل للقائمة لضمان دقة الـ Pagination
    setNotifications(processed);
  };

  const getAttendanceStatsFrontend = async (studentCode, groupIds) => {
    // التحقق من وجود center_id في localStorage أو استخدام centerId من الـ hook
    const currentCenterId = centerId || localStorage.getItem('active_center_id');
    if (!currentCenterId) return null;
    
    // 🔥 Frontend function - شغال 100%
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, attendees, created_at')
      .in('group_id', groupIds)
      .eq('center_id', currentCenterId) // ← فلترة حسب المركز
      .is('deleted_at', null);

    if (error) {
      console.error('❌ Sessions fetch error:', error);
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-red-100 max-w-md w-full text-center animate-fade-in">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <FaExclamationTriangle className="text-red-500 text-2xl animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-red-800 mb-2">حدث خطأ في تحميل البيانات</h2>
            <p className="text-gray-600 mb-4">لا يمكن تحميل معلومات الطالب حالياً</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-mono">{error.message}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-all transform hover:scale-105"
            >
              <FaRedo className="ml-2" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    const total = sessions.length;

    const attended = sessions.filter(s =>
      Array.isArray(s.attendees) &&
      s.attendees.includes(studentCode)
    );

    const rate = total > 0
      ? Math.round((attended.length / total) * 100)
      : 0;

    return {
      total_sessions: total,
      attended_sessions: attended.length,
      attendance_rate: rate,
      last_attendance_date:
        attended.length > 0
          ? attended.sort((a, b) =>
              new Date(b.created_at) - new Date(a.created_at)
            )[0].created_at
          : null
    };
  };

  const refreshStatsOnly = async (userId, uniqueId, groupIds) => {
    // التحقق من وجود center_id في localStorage أو استخدام centerId من الـ hook
    const currentCenterId = centerId || localStorage.getItem('active_center_id');
    if (!currentCenterId) return;
    
    // 🔥 Safety checks for parameters
    if (!uniqueId) {
      console.log('❌ refreshStatsOnly: uniqueId is null/undefined');
      return;
    }
    
    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      console.log('❌ refreshStatsOnly: groupIds is empty or invalid:', groupIds);
      return;
    }

    console.log('🔍 DEBUG - Frontend stats call:', {
      studentCode: uniqueId,
      groupIds: groupIds,
      groupIdsLength: groupIds.length
    });

    try {
      // ✅ استخدم Frontend function بدل RPC
      const attendanceStats = await getAttendanceStatsFrontend(uniqueId, groupIds);

      if (!attendanceStats) {
        console.error('❌ Frontend stats returned null');
        return;
      }

      console.log('✅ Frontend stats success:', attendanceStats);

      const { data: enrollment } = await supabase
        .from('students')
        .select('wallet_balance, total_debt')
        .eq('id', userId)
        .eq('center_id', currentCenterId) // ← فلترة حسب المركز
        .single();

      setStats({
          wallet: enrollment?.wallet_balance || 0,
          debt: enrollment?.total_debt || 0,
          rate: attendanceStats.attendance_rate,
          attended: attendanceStats.attended_sessions,
          total: attendanceStats.total_sessions
      });
    } catch (err) {
      console.error('❌ Frontend stats exception:', err);
    }
  };

  const fetchExamResults = async (userId, currentCenterId) => {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams (
            title,
            max_score,
            exam_date,
            is_published,
            courses (name, instructor, instructors(name))
          )
        `)
        .eq('student_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const publishedResults = data?.filter(r => r.exams?.is_published) || [];
      setExamResults(publishedResults);
      return publishedResults; // Return for chain calculation
    } catch (err) {
      console.error('❌ fetchExamResults error:', err);
      return [];
    }
  };

  const calculateBadges = (attendanceRate, totalSessions, results) => {
    const badges = [];

    // 1. وسام الالتزام (Consistency)
    if (attendanceRate >= 90 && totalSessions >= 8) {
        badges.push({
            id: 'consistency',
            title: 'وسام الالتزام والوفاء',
            icon: <FaMedal className="text-emerald-500" />,
            desc: 'للحفاظ على نسبة حضور تتعدى الـ 90% طوال الحصص الماضية.',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-100'
        });
    }

    // 2. وسام العباقرة (Genius)
    const avgScore = results.length > 0 
        ? results.reduce((acc, r) => acc + (r.score / r.exams.max_score) * 100, 0) / results.length 
        : 0;
    
    if (avgScore >= 90 && results.length >= 3) {
        badges.push({
            id: 'genius',
            title: 'وسام العبقرية',
            icon: <FaAward className="text-amber-500" />,
            desc: 'لتحقيق متوسط درجات يتخطى الـ 90% في الاختبارات.',
            color: 'bg-amber-50 text-amber-700 border-amber-100'
        });
    }

    // 3. وسام العلامة الكاملة (Perfect Score)
    const hasPerfectScore = results.some(r => r.score === r.exams.max_score);
    if (hasPerfectScore) {
        badges.push({
            id: 'perfect',
            title: 'جامع الدرجات النهائية',
            icon: <FaTrophy className="text-blue-500" />,
            desc: 'لتحطيم الأرقام القياسية والحصول على الدرجة النهائية في اختبار واحد على الأقل.',
            color: 'bg-blue-50 text-blue-700 border-blue-100'
        });
    }

    // 5. وسام إدارة المحفظة (Wallet Master)
    if (stats.wallet > 0 && stats.debt === 0) {
        badges.push({
            id: 'wallet_master',
            title: 'وسام الوعي المالي',
            icon: <FaWallet className="text-emerald-500" />,
            desc: 'للحفاظ على محفظة إيجابية خالية من الديون.',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-100'
        });
    }

    // 6. وسام محارب الاختبارات (Exam Warrior)
    if (results.length >= 5) {
        badges.push({
            id: 'exam_warrior',
            title: 'محارب الامتحانات',
            icon: <FaShieldAlt className="text-slate-700" />,
            desc: 'لاجتياز أكثر من 5 اختبارات بنجاح وثبات.',
            color: 'bg-slate-50 text-slate-700 border-slate-200'
        });
    }

    // 7. وسام ملك الحضور (Attendance King)
    if (attendanceRate === 100 && totalSessions >= 5) {
        badges.push({
            id: 'attendance_king',
            title: 'ملك الالتزام التام',
            icon: <FaCheckCircle className="text-blue-600" />,
            desc: 'لحضور جميع الحصص المتاحة بدون أي غياب.',
            color: 'bg-blue-50 text-blue-700 border-blue-100'
        });
    }

    setEarnedBadges(badges);
  };

  // 1️⃣1️⃣ Main Data Fetching (Production Version)
  const fetchStudentData = async (userId) => {
      lastFetchTime.current = Date.now();
      
      // التحقق من وجود center_id في localStorage أو استخدام centerId من الـ hook
      const currentCenterId = centerId || localStorage.getItem('active_center_id') || null;
      
      let query = supabase
        .from('students')
        .select('name, grade, group_ids, unique_id, wallet_balance, total_debt, enrolled_courses')
        .eq('id', userId);
        
      if (currentCenterId) {
        query = query.eq('center_id', currentCenterId);
      }
      
      const { data: enrollment } = await query.single();

      if (enrollment) {
        setStudentName(enrollment?.name || '');
        setUniqueCode(enrollment?.unique_id || '');
        
        const { data: tokenExists } = await supabase.from('student_device_tokens').select('id').eq('student_id', userId).limit(1);
        if (tokenExists?.length > 0) setIsPushEnabled(true);

        // ✅ تصحيح ملاحظة Senior 1: تنظيف الـ IDs فوراً
        const groupIds = [...new Set(Object.values(enrollment?.group_ids || {}).filter(Boolean))];
        if (groupIds.length > 0) {
          let scheduleQuery = supabase
            .from('schedule')
            .select('*, groups(*, courses(*, instructors(id, name))), rooms(*), exams(*)')
            .in('group_id', groupIds);
            
          if (currentCenterId) {
            scheduleQuery = scheduleQuery.eq('center_id', currentCenterId);
          }
          
          const { data: schedule } = await scheduleQuery;
          setMySchedule(schedule || []);
          await refreshStatsOnly(userId, enrollment?.unique_id, groupIds);
        }

        // ✅ Fetch all possible course IDs (Full, Partial Lesson, Partial Chapter)
        const [onlineRes, lessonRes, chapterRes] = await Promise.all([
          supabase.from('student_online_enrollments').select('course_id').eq('student_id', userId),
          supabase.from('student_lesson_access').select('course_id').eq('student_id', userId),
          supabase.from('student_chapter_access').select('course_id').eq('student_id', userId)
        ]);

        const allCourseIds = new Set([
          ...(enrollment?.enrolled_courses || []),
          ...(onlineRes.data?.map(e => e.course_id) || []),
          ...(lessonRes.data?.map(l => l.course_id) || []),
          ...(chapterRes.data?.map(c => c.course_id) || [])
        ]);

        const uniqueCourseIds = Array.from(allCourseIds).filter(Boolean);

        if (uniqueCourseIds.length > 0) {
          let coursesQuery = supabase
            .from('courses')
            .select('id, name, thumbnail_url, instructors(name)')
            .in('id', uniqueCourseIds);
          
          const { data: coursesData } = await coursesQuery;
          setEnrolledCoursesList(coursesData || []);
        } else {
          setEnrolledCoursesList([]);
        }

        await refreshNotificationsOnly(userId);
        const results = await fetchExamResults(userId, currentCenterId);
        
        // ✅ Fetch Electronic Exams
        let eExamsQuery = supabase
          .from('exams')
          .select('*')
          .eq('is_published', true)
          .eq('is_electronic', true);
          
        if (currentCenterId) {
          eExamsQuery = eExamsQuery.eq('center_id', currentCenterId);
        }
          
        const { data: eExams } = await eExamsQuery;
        
        // Filter by group_id, course_id AND exclude already taken exams
        const takenExamIds = new Set(results?.map(r => r.exam_id) || []);
        
        const enrolledExams = eExams?.filter(ex => {
          const studentGroups = [...new Set(Object.values(enrollment?.group_ids || {}).filter(Boolean))];
          const studentCourses = enrollment?.enrolled_courses || [];
          
          // Must not be already taken
          if (takenExamIds.has(ex.id)) return false;

          return (!ex.group_id || studentGroups.includes(ex.group_id)) && 
                   (!ex.course_id || studentCourses.includes(ex.course_id)) && 
                   (!ex.grade || ex.grade === enrollment?.grade);
        }) || [];
        setElectronicExams(enrolledExams);

        // Calculate badges after data is ready
        const currentGroupIds = [...new Set(Object.values(enrollment?.group_ids || {}).filter(Boolean))];
        if (currentGroupIds.length > 0) {
            const attendance = await getAttendanceStatsFrontend(enrollment?.unique_id, currentGroupIds);
            if (attendance) {
                calculateBadges(attendance.attendance_rate, attendance.total_sessions, results);
            }
        }
      } else {
        // Handle case where student is not found for this center
        console.warn('Student record not found for this user in center:', currentCenterId);
        setStudentName('');
        setUniqueCode('');
        setMySchedule([]);
        setElectronicExams([]);
      }
  };

  const markAsSeen = async (notifId) => {
    if (!studentId || !notifId) return;

    // ✅ منع التكرار
    const notif = notifications.find(n => n.id === notifId);
    if (!notif) {
        console.warn("DEBUG: ⚠️ markAsSeen called for non-existent notif:", notifId);
        return;
    }
    if (notif.is_read) {
        console.log("DEBUG: ⏩ markAsSeen: Notif already read:", notifId);
        return;
    }

    console.log("DEBUG: 👀 TRIGERRED markAsSeen for:", notifId, notif.title);
    // تحديث محلي فوري وشامل
    setNotifications(prev => prev.map(n => 
        n.id === notifId 
            ? { ...n, is_read: true, seen_by: Array.isArray(n.seen_by) ? [...n.seen_by, studentId] : [studentId] } 
            : n
    ));

    // تحديث السيرفر - الطريقة الأساسية (RPC)
    try {
        const { error: rpcError } = await supabase.rpc('mark_notification_as_seen', { 
            p_notif_id: notifId, 
            p_student_id: studentId 
        });

        if (rpcError) {
            console.warn("DEBUG: ⚠️ RPC failed, trying Direct Insert fallback...", rpcError);
            const { error: insertError } = await supabase.from('notification_views').upsert({
                notification_id: notifId,
                student_id: studentId,
                center_id: notif.center_id
            });
            if (insertError) console.error("DEBUG: ❌ Fallback also failed:", insertError);
            else console.log("DEBUG: ✅ Fallback success!");
        }
    } catch (err) {
        console.error("DEBUG: ❌ Critical Error in markAsSeen server update:", err);
    }
  };

  const handleEnableNotifications = async () => {
    console.log("🔍 [handleEnableNotifications] centerId:", centerId);
    console.log("🔍 [handleEnableNotifications] studentId:", studentId);
    
    if (!centerId) {
      toast.error("لا يمكن تفعيل التنبيهات. معرف المركز غير متوفر.");
      return;
    }
    
    const success = await setupStudentPushNotifications(studentId, centerId);
    if (success) {
      toast.success("تم تفعيل التنبيهات بنجاح! 🔔");
      setIsPushEnabled(true);
    } else {
      toast.error("فشل تفعيل التنبيهات. يرجى التأكد من السماح بالإشعارات في المتصفح.");
    }
  };

  // 🔔 Professional Toast for lesson reminder
  const lessonReminderToast = (lesson) => {
    if (!lesson) return;
    
    const courseName = lesson.groups?.courses?.name || 'الحصة';
    const instructorName = lesson.groups?.courses?.instructors?.name || lesson.groups?.courses?.instructor || 'المدرس';
    const roomName = lesson.rooms?.name || '---';
    
    toast.custom((t) => (
      <div className="flex items-start gap-4 p-4 rounded-xl shadow-lg
        bg-gradient-to-r from-emerald-500 to-sky-500 text-white
        w-[340px] animate-in slide-in-from-top fade-in">
        
        <div className="text-2xl">🔔</div>

        <div className="flex-1">
          <p className="font-bold text-sm mb-1">
            حصة قربت!
          </p>

          <p className="text-sm opacity-90">
            {courseName} مع م/ {instructorName}
          </p>

          <p className="text-xs opacity-80 mt-1">
            ⏰ بعد 10 دقائق — 📍 قاعة {roomName}
          </p>
        </div>

        <button
          onClick={() => toast.dismiss(t)}
          className="text-white/80 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>
    ), {
      duration: 12000,
    });
  };

  // 🔔 Notification before 10 minutes - Updated to use toast
  const triggerNotification = (session) => {
    if (!session) return;
    
    // Show professional toast
    lessonReminderToast(session);
    
    // Audio notification
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.play().catch(() => {});
    
    // Set notified flag
    setNotified(true);
    
    // Store in localStorage to prevent repeat after refresh
    const key = `notified_${session.id}`;
    localStorage.setItem(key, 'true');
  };

  // --------------------------------------------------------------------------
  // ✅ FIX: 3. Define Effects and Memos (Must come before any return)
  // --------------------------------------------------------------------------

  // 6️⃣ Schedule Memoization
  const scheduleByDay = useMemo(() => {
    const map = {};
    const sortedSchedule = [...mySchedule].sort((a, b) => a.start_time.localeCompare(b.start_time));
    sortedSchedule.forEach(s => {
      if (!map[s.day_of_week]) map[s.day_of_week] = [];
      map[s.day_of_week].push(s);
    });
    return map;
  }, [mySchedule]);

  // 7️⃣ Next Lesson Logic - Fixed to use JS standard day system
  const nextLesson = useMemo(() => {
    if (mySchedule.length === 0) return null;
    
    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (0=Sunday, 1=Monday, etc.)

    // Convert all lessons to full date objects and calculate actual time difference
    const lessonsWithTime = mySchedule.map(lesson => {
      let targetDate = new Date();
      const [h, m] = lesson.start_time.split(':');
      targetDate.setHours(parseInt(h), parseInt(m), 0, 0);

      // Use JS standard day system
      let dayDiff = lesson.day_of_week - currentDay;
      if (dayDiff < 0 || (dayDiff === 0 && targetDate < now)) {
        dayDiff += 7;
      }
      targetDate.setDate(targetDate.getDate() + dayDiff);

      return {
        ...lesson,
        targetDate,
        diffMs: targetDate - now
      };
    });

    // Filter out lessons that have already passed
    const upcomingLessons = lessonsWithTime.filter(l => l.diffMs > 0);

    // If no upcoming lessons, return null
    if (upcomingLessons.length === 0) return null;

    // Sort by actual time difference and return the nearest one
    const sortedByDiff = upcomingLessons.sort((a, b) => a.diffMs - b.diffMs);
    const nearestLesson = sortedByDiff[0];
    
    // Reset notification when lesson changes
    if (nearestLesson) {
      const key = `notified_${nearestLesson.id}`;
      if (!localStorage.getItem(key)) {
        setNotified(false);
      }
    }
    
    return nearestLesson;
  }, [mySchedule]);

  // 9️⃣ Notification Filtering (Updated to use is_read)
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeFilter === 'warning') return n.type === 'warning';
      if (activeFilter === 'unread') return !n.is_read;
      return true;
    });
  }, [notifications, activeFilter]);

  // 10️⃣ منطق التحية اليومية المتغيرة
  const dailyGreeting = useMemo(() => {
    const hours = new Date().getHours();
    const day = new Date().getDay(); // 0: Sunday, 5: Friday, etc.
    
    // تحيات بناءً على الوقت
    let timeGreeting = "أهلاً بك";
    if (hours >= 5 && hours < 12) timeGreeting = "صباح الخير والهمة";
    else if (hours >= 12 && hours < 17) timeGreeting = "طاب يومك بنور العلم";
    else if (hours >= 17 && hours < 21) timeGreeting = "مساء التميز";
    else timeGreeting = "ليلة هادئة وموفقة";

    // جمل تحفيزية بناءً على اليوم
    const motivationalSayings = [
      "اليوم خطوة جديدة نحو حلمك الكبير 🚀",      // Sunday
      "بداية أسبوع مليئة بالتركيز والإنجاز 📚", // Monday
      "استمر في السعي، فالعلم نور الطريق ✨",      // Tuesday
      "أنت تصنع مستقبلك الآن بكل حصة تحضرها 🎓", // Wednesday
      "قاربت الأسبوع على النهاية، استمر بقوة 💪", // Thursday
      "جمعة مباركة، تذكر أن الراحة جزء من التقدم 🌴", // Friday
      "يوم جديد، فرصة جديدة لتكون أفضل مما كنت 🌟" // Saturday
    ];

    return {
      title: timeGreeting,
      subtitle: motivationalSayings[day] || "مستعد لرحلة التعلم؟"
    };
  }, []);

  // 1️⃣ Initialize Dashboard
  useEffect(() => {
    setMounted(true);
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setStudentId(user.id);
            // Ensure we fetch data even if centerId isn't fully ready in hook yet (handled inside function)
            await fetchStudentData(user.id);
            // ✅ تعديل الخطر 1: الاشتراك في قناة عامة
            unsubscribeRef.current = subscribeToGlobalNotifications(user.id);
        }
    };
    init();
    return () => {
        if (unsubscribeRef.current) unsubscribeRef.current();
        if (observer.current) observer.current.disconnect();
    };
  }, []);

  // 2️⃣ 🔥 تحديث البيانات تلقائياً (Focus) - محسن لطلب الضروريات فقط
  useEffect(() => {
    if (!studentId) return;
    
    const handleFocus = () => {
      // ✅ حل الخطر 3: منع حرق الـ RPC بـ TTL (60 ثانية)
      const now = Date.now();
      if (now - lastFetchTime.current < 60000) return;

      console.log("Dashboard focused: Refreshing stats and notifications...");
      refreshNotificationsOnly(studentId); 
      
      // ✅ تصحيح ملاحظة Senior 1: تنظيف الـ IDs باستخدام Set لمنع الـ Array-in-Array
      const currentGroupIds = [...new Set(mySchedule.map(s => s.group_id))];
      
      if (currentGroupIds.length > 0 && uniqueCode) {
         refreshStatsOnly(studentId, uniqueCode, currentGroupIds); 
      }
      lastFetchTime.current = now;
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [studentId, uniqueCode, mySchedule]);

  // 3. تحسين الـ IntersectionObserver (إصلاح الخطر الثالث 🔥)
  useEffect(() => {
    if (!notifications.length) return;

    observer.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const notifId = entry.target.getAttribute('data-id');
          if (notifId) {
            markAsSeen(notifId);
            observer.current.unobserve(entry.target);
          }
        }
      });
    }, { threshold: 0.1 }); // More sensitive to catch items quickly

    // Observe all unread cards
    const cards = document.querySelectorAll('.notif-card[data-unread="true"]');
    cards.forEach(card => observer.current.observe(card));

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [notifications]);

  // 4️⃣ Secure QR Token Generation
  useEffect(() => {
    if (!uniqueCode) return;
    const generateSecureToken = () => {
      const timestamp = Math.floor(Date.now() / 30000);
      setQrToken(`${uniqueCode}_${timestamp}`); 
    };
    generateSecureToken();
    const interval = setInterval(generateSecureToken, 30000);
    return () => clearInterval(interval);
  }, [uniqueCode]);

  // Fetch center settings
  useEffect(() => {
    const fetchCenterSettings = async () => {
      if (centerId) {
        const settings = await getCenterSettings(centerId);
        setCenterSettings(settings);
      }
    };
    
    // We only run this if centerId exists
    if (centerId) {
      fetchCenterSettings();
    }
  }, [centerId]);


  // 8️⃣ Countdown Timer Logic مع تحسينات الـ UX والأيام والتنبيه
  useEffect(() => {
    if (!nextLesson) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = nextLesson.targetDate - now;
      const diffSeconds = Math.floor(diff / 1000);
      const isNow = diff <= 0;

      if (isNow) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isNow: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isNow: false });

        // 🔔 Notification before 10 minutes (wider window for background throttling)
        if (diffSeconds <= 610 && diffSeconds >= 580 && !notified) {
          const key = `notified_${nextLesson.id}`;
          if (!localStorage.getItem(key)) {
            triggerNotification(nextLesson);
          }
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextLesson, timeLeft.isNow, notified]);

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // --------------------------------------------------------------------------
  // ✅ FIX: 4. Conditional Returns (Moved to the bottom)
  // --------------------------------------------------------------------------

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 pt-0 md:p-6 md:pt-6" dir="rtl">
      
      {/* 📱 Compact Top App Bar */}
      <div className="flex justify-between items-center w-full bg-white p-4 sticky top-0 z-40 shadow-sm md:rounded-2xl mb-4 md:mb-6 md:mx-auto max-w-4xl">
        {/* Right side: Greeting / Logo */}
        <div className="flex items-center gap-3">
          <div className="h-9 flex items-center shrink-0">
            <img src="/logo.png" alt="Logo" className="h-full w-auto object-contain" />
          </div>
          <span className="font-black text-[#264653] text-sm">
            {dailyGreeting.title}، {studentName || 'بطل'}
          </span>
        </div>
        
        {/* Left side: Icons */}
        <div className="flex items-center gap-5">
          <button 
            onClick={handleEnableNotifications}
            className={`text-xl transition-colors relative ${isPushEnabled ? 'text-[#2A9D8F]' : 'text-gray-400 hover:text-[#2A9D8F]'}`}
          >
            {isPushEnabled ? <FaBell /> : <FaBellSlash />}
            {/* Optional notification badge could go here */}
          </button>
          <button 
            onClick={async () => {
              await signOut();
              router.replace('/login');
            }}
            className="text-red-500 hover:text-red-600 transition-colors text-xl"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      {/* Onboarding Alert */}
      {mounted && typeof window !== 'undefined' && Notification.permission !== 'granted' && !isPushEnabled && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl p-4 text-white flex justify-between items-center shadow-lg border-b-4 border-black/10">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl"><FaBellSlash /></div>
              <div>
                <p className="text-xs font-black">لا تفوّت حصصك!</p>
                <p className="text-[10px] opacity-80 font-bold">فعل تنبيهات الموبايل لتصلك مواعيد الامتحانات فوراً</p>
              </div>
            </div>
            <button onClick={handleEnableNotifications} className="bg-white text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-50 transition-colors">تفعيل الآن</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6 px-4 md:px-0">
        <div className="bg-[#264653] rounded-[1.5rem] md:rounded-[2.5rem] pt-5 px-5 md:pt-8 md:px-8 pb-0 shadow-xl border border-[#264653]/10 mb-6 relative flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
          
          <div className="flex-1 z-10 w-full mb-4 md:mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
              <div className="flex flex-col items-start gap-3 w-full md:w-auto">
                <div className="h-16 md:h-20 flex items-center justify-start shrink-0">
                  <img 
                    src="/logo.png" 
                    alt="Center Logo" 
                    className="h-full w-auto object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base md:text-2xl font-black text-[#F8F9FA] leading-tight mt-1">
                    أهلاً بك في منصتنا
                  </h1>
                  <p className="text-[9px] md:text-sm text-gray-300 font-bold mt-1 line-clamp-1">{centerSettings.description}</p>
                </div>
              </div>
              
              <div className="text-right md:text-left w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-white/10">
                <p className="text-sm md:text-xl font-black text-[#2A9D8F] mb-0.5">
                    مستعد لرحلة اليوم؟
                </p>
                <p className="text-[9px] md:text-sm text-gray-300 font-bold leading-relaxed">{dailyGreeting.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="block z-10 self-end mr-auto -mt-6 md:-mt-16">
             <img src="/hero-image.png" alt="د/ عبدالرحمن خالد" className="w-44 md:w-[280px] object-contain drop-shadow-2xl" />
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-2xl font-black text-[#264653]">لوحة التحكم</h1>
               {isConnected && (
                 <span className="flex items-center gap-1 bg-green-100 text-green-600 text-[8px] px-2 py-0.5 rounded-full font-bold animate-pulse border border-green-200">
                   <FaWifi size={8} /> مباشر
                 </span>
               )}
            </div>
            <p className="text-[#264653] font-bold text-sm opacity-80">إليك جدول حصصك وتنبيهاتك اللحظية</p>
          </div>
          
          <Link href="/portal/inbox">
              <div 
                onClick={async () => {
                  // 1. تصفية العداد محلياً فوراً للراحة النفسية
                  const unreadNotifs = notifications.filter(n => !n.is_read);
                  if (unreadNotifs.length === 0) return;

                  setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

                  // 2. تحديث قاعدة البيانات لكل اللي متحملين وغير مقروئين
                  try {
                      for (const n of unreadNotifs) {
                          // محاولة RPC
                          const { error: rpcError } = await supabase.rpc('mark_notification_as_seen', { 
                              p_notif_id: n.id, 
                              p_student_id: studentId 
                          });

                          // لو فشل أو مش موجود، جرب Insert مباشر (الخطة البديلة المضمونة)
                          if (rpcError) {
                             await supabase.from('notification_views').upsert({
                                notification_id: n.id,
                                student_id: studentId,
                                center_id: n.center_id
                             });
                          }
                      }
                      console.log("DEBUG: 🎊 All notifications cleared via Bell Click");
                  } catch (e) {
                      console.error("Failed to clear notifications:", e);
                  }
                }}
                className="relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer group"
              >
                <FaBell className="text-2xl text-blue-600 group-hover:scale-110 transition-transform" />
                {notifications.filter(n => !n.is_read).length > 0 && studentId && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce font-black border-2 border-white">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </div>
          </Link>
        </div>
      </div>

      {/* كروت الإحصائيات */}
      <div className="max-w-4xl mx-auto px-4 md:px-0 grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center transition-all hover:shadow-md">
            <FaChalkboardTeacher className="text-[#2A9D8F] mb-1.5 md:mb-2 text-sm md:text-base" />
            <p className="text-[9px] md:text-[10px] font-black text-[#264653] uppercase tracking-tighter">الكورسات المشترك بها</p>
            <p className="text-base md:text-lg font-black text-[#2A9D8F]">{enrolledCoursesList.length}</p>
        </div>
        <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center transition-all hover:shadow-md">
            <FaFileAlt className="text-[#2A9D8F] mb-1.5 md:mb-2 text-sm md:text-base" />
            <p className="text-[9px] md:text-[10px] font-black text-[#264653] uppercase tracking-tighter">الامتحانات المنجزة</p>
            <p className="text-base md:text-lg font-black text-[#2A9D8F]">{examResults.length}</p>
        </div>
        <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center transition-all hover:shadow-md">
            <FaWallet className="text-[#2A9D8F] mb-1.5 md:mb-2 text-sm md:text-base" />
            <p className="text-[9px] md:text-[10px] font-black text-[#264653] uppercase tracking-tighter">رصيد المحفظة</p>
            <p className="text-base md:text-lg font-black text-[#2A9D8F]">{stats.wallet} ج</p>
        </div>
        <div 
            onClick={() => earnedBadges.length > 0 && setShowBadgesModal(true)}
            className={`group p-3 md:p-6 rounded-xl md:rounded-[2rem] shadow-sm border flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden ${earnedBadges.length > 0 ? 'bg-indigo-50/50 border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-2' : 'bg-white border-indigo-50'}`}
        >
            <span className={`text-base md:text-xl mb-1 ${earnedBadges.length > 0 ? 'animate-bounce' : ''}`}>🏆</span>
            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">الأوسمة</p>
            <p className="text-base md:text-xl font-black text-indigo-700 leading-none">{earnedBadges.length}</p>
            
            {earnedBadges.length > 0 ? (
                <div className="mt-2 flex flex-col items-center gap-1.5 opacity-0 md:opacity-100 h-0 md:h-auto overflow-hidden transition-all">
                    <div className="flex gap-1">
                        {earnedBadges.slice(0, 3).map((b, idx) => (
                            <div key={idx} className="text-xs">
                                {b.id === 'consistency' ? '📅' : b.id === 'genius' ? '🥇' : b.id === 'perfect' ? '💯' : '✨'}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <span className="text-[6px] md:text-[8px] font-bold text-slate-300 mt-1 italic">اجتهد لتنال أول وسام 🚀</span>
            )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto mb-12">
         <div className="flex justify-between items-center mb-6 px-4">
            <h2 className="text-xl font-black text-[#264653] flex items-center gap-2">
               <FaPlayCircle className="text-[#2A9D8F]" /> متابعة التعلم (كورساتي)
            </h2>
            <Link href="/student/courses" className="text-xs font-black text-[#2A9D8F] hover:underline">
               عرض كل الكورسات ←
            </Link>
         </div>

         {enrolledCoursesList.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 shadow-md flex flex-col items-center justify-center text-center border-t-4 border-[#2A9D8F]">
               <div className="w-20 h-20 bg-[#F8F9FA] text-[#2A9D8F] rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                  <FaStar />
               </div>
               <h3 className="text-lg font-black text-[#264653] mb-2">لم تشترك في أي كورسات بعد. ابدأ رحلتك الآن!</h3>
               <p className="text-sm font-bold text-gray-500 mb-6">اكتشف المحتوى التعليمي المتاح وابدأ في التعلم فوراً.</p>
               <Link href="/student/courses" className="bg-[#2A9D8F] text-[#F8F9FA] px-8 py-3 rounded-xl font-black text-sm hover:bg-[#264653] transition-colors shadow-md">
                  تصفح الكورسات المتاحة
               </Link>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {enrolledCoursesList.map(course => (
                  <Link href={`/student/courses/${course.id}`} key={course.id} className="bg-white rounded-2xl overflow-hidden shadow-md group hover:shadow-xl transition-all border border-gray-100 flex flex-col">
                     <div className="aspect-video w-full bg-[#264653]/5 relative overflow-hidden">
                        {course.thumbnail_url ? (
                           <img src={course.thumbnail_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                           <div className="w-full h-full bg-[#264653] flex items-center justify-center text-[#F8F9FA] font-black">
                              <FaPlayCircle size={30} className="opacity-50" />
                           </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80"></div>
                        <div className="absolute bottom-3 right-3">
                           <span className="bg-[#2A9D8F] text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm">مفعل</span>
                        </div>
                     </div>
                     <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-black text-[#264653] text-sm mb-1 group-hover:text-[#2A9D8F] transition-colors line-clamp-2">{course.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 mt-auto flex items-center gap-1">
                           <FaUserGraduate className="text-[#2A9D8F]" /> {course.instructors?.name || 'الدكتور عبدالرحمن خالد'}
                        </p>
                     </div>
                  </Link>
               ))}
            </div>
         )}
      </div>

      {/* 💳 Digital Student ID Card - Replacing the old banner */}
      <div className="max-w-4xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
        <div className="relative bg-gradient-to-r from-[#264653] to-[#2A9D8F] rounded-[2.5rem] p-8 md:p-10 shadow-xl overflow-hidden flex flex-col md:flex-row items-center gap-8 border border-white/10">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#E9C46A]/10 rounded-full blur-[60px] translate-y-10 -translate-x-10"></div>
            
            <div className="flex-1 text-center md:text-right relative z-10">
               <div className="inline-block bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-4">
                  بطاقة الدخول الذكية <FaQrcode className="inline mr-1" />
               </div>
               <h2 className="text-3xl md:text-4xl font-black text-white mb-2">{studentName || 'طالب متميز'}</h2>
               <p className="text-white/80 font-bold text-sm md:text-base flex items-center justify-center md:justify-start gap-2">
                  <FaCheckCircle className="text-[#E9C46A]" /> الكود التعريفي: <span className="font-mono tracking-wider bg-black/20 px-2 py-0.5 rounded">{uniqueCode || '-----'}</span>
               </p>
               <p className="text-white/60 text-[10px] mt-4 max-w-sm font-bold mx-auto md:mx-0">
                  أظهر هذا الكود (QR) عند دخول السنتر لتسجيل حضورك تلقائياً. يتم تحديث الكود باستمرار لحمايتك.
               </p>
            </div>

            <div className="relative z-10 bg-white p-4 rounded-[2rem] shadow-2xl shrink-0 group">
                <div className="absolute inset-0 bg-[#E9C46A] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                <div className="relative bg-white rounded-2xl p-2 border border-slate-100">
                   {qrToken ? (
                       <QRCodeSVG value={qrToken} size={140} level="H" fgColor="#264653" />
                   ) : (
                       <div className="w-[140px] h-[140px] bg-slate-100 flex items-center justify-center rounded-xl">
                          <FaSync className="animate-spin text-slate-300 text-2xl" />
                       </div>
                   )}
                </div>
                <div className="text-center mt-3 flex items-center justify-center gap-1.5 text-emerald-600 font-black text-[10px]">
                   <span className="relative flex h-2.5 w-2.5">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                   </span>
                   نشط ومحمي
                </div>
            </div>
        </div>
      </div>

      {/* ⚡ Electronic Exams Section */}
      {electronicExams.length > 0 && (
        <div className="max-w-4xl mx-auto mb-12">
           <div className="flex items-center gap-3 mb-6 px-4">
              <h2 className="text-xl font-black text-slate-800">الامتحانات الإلكترونية المتاحة ⚡</h2>
              <span className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-[10px] font-black animate-pulse">مباشر الآن</span>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {electronicExams.map(ex => (
                <div key={ex.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-sm hover:shadow-xl hover:border-pink-200 transition-all group">
                   <div className="flex justify-between items-start gap-4 mb-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                            <FaFileAlt />
                         </div>
                         <div>
                            <h4 className="font-black text-slate-800 text-sm">{ex.title}</h4>
                            <p className="text-[10px] font-bold text-slate-400">مدة الامتحان: {ex.duration_minutes} دقيقة</p>
                         </div>
                      </div>
                      <div className="bg-slate-50 px-3 py-1 rounded-lg text-[8px] font-black text-slate-400">
                         {ex.exam_date}
                      </div>
                   </div>

                   <Link
                     href={`/portal/exams/${ex.id}`}
                     className="w-full h-12 bg-pink-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-pink-700 shadow-lg shadow-pink-100 transition-all active:scale-95"
                   >
                      دخول الامتحان الآن <FaArrowRight className="rotate-180" />
                   </Link>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* 🗓️ Row 2: Content Grid (Schedule & Notifications) */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Weekly Schedule - 2/3 Width */}
        <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 overflow-hidden h-full">
                    <div className="flex justify-between items-center mb-8 px-2">
                        <h3 className="font-black text-slate-800 text-lg flex items-center gap-3 border-r-4 border-blue-600 pr-4"> 
                            جدولك الأسبوعي
                        </h3>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-black uppercase tracking-wider">مواعيد الحصص</span>
                    </div>

                    {mySchedule.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                            {loading ? (
                                <div className="space-y-4 px-4 text-right">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 animate-pulse">
                                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                  <div className="text-3xl opacity-20">📅</div>
                                  <p className="text-slate-400 text-xs font-bold">لا توجد مواعيد مسجلة لهذه المجموعات</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((dayName, index) => {
                                const daySessions = mySchedule.filter(s => Number(s.day_of_week) === index);
                                if (daySessions.length === 0) return null;
                                return (
                                    <div key={index} className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                                        <div className="w-full sm:w-16 shrink-0 bg-slate-900 rounded-2xl py-2 sm:py-3 text-center shadow-lg shadow-slate-200 flex sm:flex-col items-center justify-center gap-2 sm:gap-1">
                                            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">يوم</span>
                                            <span className="text-xs font-black text-white">{dayName}</span>
                                        </div>
                                        <div className="flex-1 w-full space-y-3">
                                            {daySessions.map((session, sIdx) => (
                                                <div key={sIdx} className={`${session.exam_id ? 'bg-rose-50/50 border-rose-100 hover:shadow-rose-100' : 'bg-white border-slate-100 hover:shadow-slate-100/50'} p-4 md:p-5 rounded-2xl md:rounded-3xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}>
                                                    <div className="min-w-0 flex-1">
                                                        {session.exam_id && (
                                                            <span className="inline-block bg-rose-100 text-rose-600 text-[8px] font-black px-2 py-0.5 rounded-full mb-1 border border-rose-200">
                                                                إختبار ورقي بالسنتر 📝
                                                            </span>
                                                        )}
                                                        <h4 className="text-xs md:text-sm font-black text-slate-800 mb-1.5 group-hover:text-blue-600 transition-colors truncate">
                                                            {session.exam_id ? session.exams?.title : session.groups?.courses?.name}
                                                        </h4>
                                                        <div className="text-[9px] md:text-[10px] text-slate-500 font-bold flex items-center gap-2">
                                                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${session.exam_id ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                                                              {session.exam_id ? <FaFileAlt size={10} /> : <FaUserGraduate size={10} />}
                                                            </div>
                                                            <span className="truncate">{session.exam_id ? `مادة / ${session.groups?.courses?.name}` : `د/ ${session.groups?.courses?.instructors?.name || session.groups?.courses?.instructor}`}</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50">
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl shadow-sm ${session.exam_id ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
                                                            <FaClock className={`${session.exam_id ? 'text-rose-200' : 'text-blue-400'} text-[10px]`} />
                                                            <span className="text-[10px] md:text-[12px] font-black font-mono tracking-tighter" dir="ltr">
                                                                {(() => {
                                                                    let [h, m] = session.start_time.split(':');
                                                                    let hours = parseInt(h);
                                                                    const ampm = hours >= 12 ? 'م' : 'ص';
                                                                    hours = hours % 12 || 12;
                                                                    return `${hours}:${m} ${ampm}`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                        <p className="text-[8px] md:text-[9px] text-slate-400 font-black flex items-center gap-1.5">
                                                            <FaMapMarkerAlt className="text-blue-400" /> {session.rooms?.name || 'قاعة 1'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
        </div>

        {/* 🔔 Notifications - 1/3 Width */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-3 uppercase tracking-tight">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <FaBell size={16} />
                </div>
                أحدث التنبيهات
              </h3>
              
              <Link href="/portal/inbox" className="text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-2xl transition-all border border-blue-100">
                 الكل ←
              </Link>
          </div>
          
          <div className="space-y-4">
            {notifications.length === 0 ? (
                <div className="bg-slate-50/50 p-10 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
                    <FaBellSlash className="text-slate-200 text-2xl mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-400">لا توجد تنبيهات</p>
                </div>
            ) : (
                notifications.slice(0, 4).map((notif) => {
                    const isUnread = !notif.is_read;
                    const isWarning = notif.type === 'warning';
                    return (
                        <Link href="/portal/inbox" key={notif.id}>
                            <div 
                                data-id={notif.id}
                                data-unread={isUnread}
                                className={`notif-card p-5 rounded-[2.2rem] border-2 transition-all duration-300 relative group cursor-pointer hover:shadow-xl ${isUnread ? 'bg-white border-blue-100 shadow-md' : 'bg-slate-50/50 border-transparent opacity-80'}`}
                            >
                                {isUnread && (
                                  <div className="absolute top-5 left-5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                                )}
                                <div className="flex gap-4 items-start">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isWarning ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                      {isWarning ? <FaExclamationTriangle size={16}/> : <FaInfoCircle size={16}/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-slate-800 text-[12px] mb-1 line-clamp-1">{notif.title}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed line-clamp-2">{notif.message}</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })
            )}
          </div>
        </div>
      </div>

      {/* 🏆 Row 3: Full Width Exam Results */}
      <div className="max-w-4xl mx-auto mb-16 px-4 md:px-0">
        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-50/50 rounded-full blur-[100px] -translate-y-32 translate-x-32"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 mb-12 text-center md:text-right">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 flex items-center justify-center md:justify-start gap-4 mb-2"> 
                        <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center shadow-inner text-2xl">
                          🏆
                        </div>
                        حصاد التميز والنتائج
                    </h3>
                    <p className="text-slate-400 font-bold text-sm">استعرض مجهودك ودرجاتك في الاختبارات الماضية</p>
                </div>
                <Link href={`/portal/report/${uniqueCode}`} className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-xs hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200/50 flex items-center gap-4">
                  فتح التقرير التفصيلي الكامل
                  <span className="text-xl">←</span>
                </Link>
            </div>

            {examResults.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                    <p className="text-slate-400 font-black text-sm italic">لا توجد نتائج اختبارات منشورة حالياً ✨</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {examResults.map((res) => {
                        const percentage = (res.score / res.exams.max_score) * 100;
                        const isExcellent = percentage >= 90;
                        let statusColor = percentage >= 90 ? "bg-amber-100 text-amber-700" : percentage >= 75 ? "bg-emerald-100 text-emerald-700" : percentage >= 50 ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700";
                        let statusText = percentage >= 90 ? "مستوى عبقري 🔥" : percentage >= 75 ? "مستوى مشرف" : percentage >= 50 ? "مستوى جيد" : "تحتاج لمراجعة";

                        return (
                            <div key={res.id} className={`group relative p-6 md:p-8 bg-white rounded-[2rem] md:rounded-[2.5rem] border-2 transition-all duration-500 hover:shadow-2xl flex flex-col gap-6 ${isExcellent ? 'border-amber-100 shadow-xl shadow-amber-50' : 'border-slate-50'}`}>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-center gap-3 md:gap-5 min-w-0">
                                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-3xl shadow-lg transition-transform shrink-0 group-hover:rotate-12 ${isExcellent ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {isExcellent ? '🥇' : percentage >= 75 ? '🥈' : '🎖️'}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-slate-800 text-sm md:text-lg mb-1 group-hover:text-blue-600 transition-colors leading-tight">{res.exams.title}</h4>
                                            <p className="text-[10px] md:text-[11px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></span>
                                              {res.exams.courses?.name} — د/ {res.exams.courses?.instructors?.name || res.exams.courses?.instructor || 'غير محدد'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 text-[8px] font-black text-slate-300 font-mono shrink-0">
                                        {res.exams.exam_date}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center gap-6 mt-2">
                                    <div className="space-y-3 text-center">
                                        <div className="flex items-baseline justify-center gap-2">
                                            <span className="text-5xl md:text-6xl font-black text-slate-800 tracking-tighter">{res.score}</span>
                                            <span className="text-sm md:text-base text-slate-300 font-black">/ {res.exams.max_score}</span>
                                        </div>
                                        <div className={`px-5 py-2 rounded-2xl text-[10px] md:text-[11px] font-black inline-flex shadow-sm ${statusColor}`}>
                                            {statusText}
                                        </div>
                                    </div>
                                    
                                    <div className="relative flex items-center justify-center">
                                         <svg className="w-24 h-24 md:w-28 md:h-28 transform -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="10" fill="transparent" 
                                                strokeDasharray="251.2"
                                                strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                                                strokeLinecap="round"
                                                className={`transition-all duration-1000 ${isExcellent ? 'text-amber-500' : percentage >= 50 ? 'text-emerald-500' : 'text-rose-500'}`} 
                                            />
                                         </svg>
                                         <span className="absolute text-base md:text-lg font-black text-slate-800">{Math.round(percentage)}%</span>
                                    </div>
                                </div>

                                {res.teacher_comment && (
                                    <div className="p-5 bg-slate-50/80 rounded-3xl border border-slate-100 text-xs text-slate-500 italic font-bold leading-relaxed">
                                        💬 {res.teacher_comment}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      {/* 🏆 Achievements Multi-Badge Modal */}
      {showBadgesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in transition-all">
              <div className="bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                          <svg width="100%" height="100%"><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1"/></pattern><rect width="100%" height="100%" fill="url(#grid)" /></svg>
                      </div>
                      <button onClick={() => setShowBadgesModal(false)} className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md">
                          <FaTimes size={16} />
                      </button>
                      
                      <div className="relative z-10">
                          <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-2xl animate-float">
                              <FaTrophy size={40} className="text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)]" />
                          </div>
                          <h2 className="text-2xl font-black mb-1">صندوق التميز</h2>
                          <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest opacity-80">أوسمة الطالب: {studentName}</p>
                      </div>
                  </div>

                  {/* Modal Content */}
                  <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
                      <div className="space-y-4">
                          {earnedBadges.map((badge, idx) => (
                              <div key={idx} className={`flex items-center gap-5 p-5 bg-white rounded-3xl border shadow-sm transition-all hover:shadow-md animate-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${idx * 150}ms` }}>
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner ${badge.color}`}>
                                      {badge.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h3 className="font-black text-slate-800 text-sm mb-1">{badge.title}</h3>
                                      <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{badge.desc}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 bg-white border-t border-slate-100 text-center">
                       <button 
                          onClick={() => setShowBadgesModal(false)}
                          className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200"
                       >
                           استمرار في التميز 😉
                       </button>
                  </div>
              </div>
          </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
          40%, 43% { transform: translateY(-10px); }
        }
        .animate-bounce {
          animation: bounce 2s ease-in-out infinite;
        }
        @keyframes slide-in-from-top {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: slide-in-from-top 0.3s ease-out;
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(1.05); opacity: 0; }
        }
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}




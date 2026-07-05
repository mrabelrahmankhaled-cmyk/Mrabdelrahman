'use client';
import { useState, useEffect } from 'react';
// تأكد من مسار ملف supabase حسب هيكل مشروعك
import { supabase } from '../../../lib/supabase-browser'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaClock, FaUsers, FaChalkboardTeacher, 
  FaCheckCircle, FaExclamationCircle, FaSpinner, FaArrowLeft, FaCalendarDay, FaTimesCircle, FaPlus, FaFileAlt, FaCoins, FaUserClock, FaSignInAlt, FaSignOutAlt
} from 'react-icons/fa';
import dynamic from 'next/dynamic';
import { useAuth } from '../../../context/AuthContext';

// 🚀 Dynamic Import for better LCP
const DailyReportModal = dynamic(() => import('../../../components/DailyReportModal'), { ssr: false });
import AccessDenied from '../../../components/AccessDenied';

// ══════════════════════════════════════════════════════════════
// StaffDashboard — Fully Responsive Premium UI
// ══════════════════════════════════════════════════════════════
export default function StaffDashboard() {
  const router = useRouter();
  const { centerId, allowedFeatures, user, loading: authLoading } = useAuth(); // ← استخراج centerId و allowedFeatures و user

  // 🛡️ Package Guard
  if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_staff_dashboard')) {
    return <AccessDenied />;
  }
  
  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
      if (name) setCurrentUserName(name);
    }
  }, [user]);

  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalStudents: 0, todaySessions: 0, openSessions: 0, revenue: 0, netCashInDrawer: 0 });
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [cancelledSessions, setCancelledSessions] = useState([]);
  const [activeSessionsMap, setActiveSessionsMap] = useState({}); // 🧠 بيانات الحصص كاملة
  const [todayExpenses, setTodayExpenses] = useState(0); // 💸 مصروفات اليوم
  const [expensesList, setExpensesList] = useState([]); // 👈 ضيف ده (مخزن لقائمة المصروفات)
  const [showExpenseModal, setShowExpenseModal] = useState(false); // 📊 مودال المصروفات
  const [showReportModal, setShowReportModal] = useState(false); // 📜 مودال تقرير اليوم
  const [currentUserName, setCurrentUserName] = useState('موظف عام'); // 👤 اسم الموظف الحالي
  const [centerSettings, setCenterSettings] = useState({ center_name: '', logo_url: '' }); // 🏢 إعدادات السنتر

  // 🕐 Attendance State
  const [attendanceRecord, setAttendanceRecord] = useState(null); // سجل حضور اليوم
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
  // ⏳ Live Progress Ticker - يخلي الصفحة تحس بالوقت
  const [ticker, setTicker] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date().getDate()); // نتابع اليوم الحالي

  useEffect(() => {
    // عداد بيحدث الصفحة كل 60 ثانية عشان البار يتحرك
    const timer = setInterval(() => {
      const now = new Date();
      setTicker(now);
      
      // 🔄 تحقق لو اليوم اتغير (من 12 ص لـ 12 ص)
      if (now.getDate() !== currentDay) {
        console.log("📅 Day changed! Refreshing dashboard...");
        setCurrentDay(now.getDate());
        fetchDashboardData(); // نعمل refresh للبيانات
      }
    }, 60000); 

    return () => clearInterval(timer);
  }, [currentDay]);

  useEffect(() => {
    if (centerId) {
      fetchDashboardData();
      fetchCenterSettings();
    }
  }, [currentDay, centerId]);

  // جلب حضور الموظف لما يتوفر user
  useEffect(() => {
    if (user && centerId) {
      fetchMyAttendance(user.id);
    }
  }, [user, centerId]);

  // 🔄 حارس تغيير اليوم (Day Change Guard)
  useEffect(() => {
    const checkMidnight = setInterval(async () => {
      const actualDay = new Date().getDate();
      
      if (actualDay !== currentDay) {
        console.log("🌅 Day changed! Refreshing data from:", currentDay, "to:", actualDay);
        
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 1); // اليوم اللي فات
        const oldDateString = oldDate.toISOString().split('T')[0];
        
        const { error: deleteError } = await supabase
          .from('expenses')
          .delete()
          .gte('created_at', `${oldDateString}T00:00:00`)
          .lte('created_at', `${oldDateString}T23:59:59`);
          
        if (deleteError) {
          console.error("❌ Error deleting old expenses:", deleteError);
        } else {
          console.log("🗑️ Deleted old expenses from:", oldDateString);
        }
        
        setCurrentDay(actualDay);
        fetchDashboardData(); // 🔄 refresh الداتا مش reload الصفحة
      }
    }, 60000); // يفحص كل دقيقة (60000 مللي ثانية)

    return () => clearInterval(checkMidnight);
  }, [currentDay]);

  // Refresh لما الصفحة تركز تاني (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const today = new Date().getDate();
        if (today !== currentDay) {
          setCurrentDay(today);
          fetchDashboardData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentDay]);

  const fetchCenterSettings = async () => {
    if (!centerId) return;
    
    try {
      const { data: settingsData, error } = await supabase
        .from('center_settings')
        .select('center_name, logo_url')
        .eq('center_id', centerId)
        .single();
      
      if (error || !settingsData) {
        setCenterSettings({ center_name: 'Smart Center', logo_url: '' });
      } else {
        setCenterSettings(settingsData);
      }
    } catch (error) {
      setCenterSettings({ center_name: 'Smart Center', logo_url: '' });
    }
  };

  // 🕐 جلب سجل حضور الموظف الحالي لهذا اليوم
  const fetchMyAttendance = async (userId) => {
    if (!centerId || !userId) return;
    const todayDate = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('center_id', centerId)
      .eq('staff_id', userId)
      .eq('date', todayDate)
      .maybeSingle();
    setAttendanceRecord(data || null);
  };

  // 📍 جلب GPS (اختياري — لا يمنع التسجيل لو رُفض)
  const getGeoLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()    => resolve({ lat: null, lng: null }),
      { timeout: 5000 }
    );
  });

  // ✅ تسجيل الحضور (مع GPS + Device + كشف التأخير حسب الجدول الأسبوعي)
  const handleCheckIn = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setAttendanceLoading(true);

    const { lat, lng } = await getGeoLocation();
    const deviceInfo  = navigator.userAgent.substring(0, 120);
    const todayDate   = new Date().toISOString().split('T')[0];
    const now         = new Date();
    const todayDayOfWeek = now.getDay(); // 0=الأحد ... 6=السبت

    // 1️⃣ جلب جدول اليوم الحالي من staff_schedules
    let attendanceStatus = 'present';
    let lateNote = '';

    const { data: todaySchedule } = await supabase
      .from('staff_schedules')
      .select('*')
      .eq('center_id', centerId)
      .eq('staff_id', session.user.id)
      .eq('day_of_week', todayDayOfWeek)
      .maybeSingle();

    if (todaySchedule) {
      if (todaySchedule.is_day_off) {
        // يوم إجازة — نبلغه بس نسمحله يدخل
        lateNote = '\n🏖️ ملحوظة: انهاردة ليس يوم عملك المجدول';
      } else if (todaySchedule.expected_check_in) {
        const [expH, expM] = todaySchedule.expected_check_in.split(':').map(Number);
        const tolerance    = todaySchedule.late_tolerance_min || 15;
        const expectedTime = new Date(now);
        expectedTime.setHours(expH, expM, 0, 0);
        const deadlineTime = new Date(expectedTime.getTime() + tolerance * 60000);
        if (now > deadlineTime) {
          const lateMinutes = Math.floor((now - expectedTime) / 60000);
          attendanceStatus = 'late';
          lateNote = `\n⚠️ تأخرت ${lateMinutes} دقيقة عن الوقت المحدد (${todaySchedule.expected_check_in.slice(0,5)})`;
        }
      }
    }

    // 2️⃣ تسجيل الحضور
    const { data, error } = await supabase.from('staff_attendance').insert([{
      center_id:   centerId,
      staff_id:    session.user.id,
      staff_name:  currentUserName,
      check_in:    now.toISOString(),
      date:        todayDate,
      latitude:    lat,
      longitude:   lng,
      device_info: deviceInfo,
      status:      attendanceStatus
    }]).select().single();

    if (!error && data) {
      setAttendanceRecord(data);
      const gpsNote = lat ? `\n📍 تم تسجيل موقعك` : `\n⚠️ الموقع غير مفعّل`;
      alert(`✅ تم تسجيل حضورك!${gpsNote}${lateNote}`);
    } else {
      alert('❌ حدث خطأ أثناء التسجيل: ' + error?.message);
    }
    setAttendanceLoading(false);
  };

  // 🚪 تسجيل الانصراف
  const handleCheckOut = async () => {
    if (!attendanceRecord) return;
    setAttendanceLoading(true);

    const checkOutTime = new Date().toISOString();
    const diff = new Date(checkOutTime) - new Date(attendanceRecord.check_in);
    const durationMinutes = Math.floor(diff / 60000);
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;

    const { data, error } = await supabase
      .from('staff_attendance')
      .update({
        check_out:        checkOutTime,
        duration_minutes: durationMinutes
      })
      .eq('id', attendanceRecord.id)
      .select().single();

    if (!error && data) {
      setAttendanceRecord(data);
      alert(`✅ تم تسجيل انصرافك!\n⏱️ مدة عملك: ${h} ساعة و${m} دقيقة`);
    } else {
      alert('❌ حدث خطأ أثناء التسجيل');
    }
    setAttendanceLoading(false);
  };


  const fetchDashboardData = async () => {
    if (!centerId) return;
    
    try {
      setLoading(true);
      
      // 1. جلب الجلسة أولاً لأنها ضرورية لبيانات المستخدم
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        console.error("❌ Auth Error:", authError);
        router.push('/login');
        return;
      }

      if (session?.user) {
        let name = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
        if (!name && session.user.email) {
          name = session.user.email.split('@')[0];
        }
        setCurrentUserName(name || 'موظف عام');
      }
      
      const todayDate = new Date().toISOString().split('T')[0];
      const todayIndex = new Date().getDay(); // 0 = الأحد

      // 🚀 2. التحميل المتوازي لكل بيانات الداشبورد لتقليل LCP
      const [scheduleRes, sessionsRes, studentsRes, expensesRes, settingsRes] = await Promise.all([
        supabase
          .from('schedule')
          .select(`*, groups (id, name, courses (id, name, instructor, instructor_id, instructors(id, name), grade)), rooms (name), exams (*)`)
          .eq('center_id', centerId).eq('day_of_week', todayIndex).order('start_time', { ascending: true }),
        
        supabase
          .from('sessions')
          .select('group_id, topic, payments, fixed_share, actual_start_time, is_completed, status')
          .eq('center_id', centerId).gte('created_at', `${todayDate}T00:00:00`).lte('created_at', `${todayDate}T23:59:59`),
        
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true }).eq('center_id', centerId),
        
        supabase
          .from('expenses')
          .select('title, amount, created_by, staff_name, created_at, is_admin')
          .eq('center_id', centerId).eq('expense_date', todayDate).eq('is_admin', false),
          
        supabase
          .from('center_settings')
          .select('center_name, logo_url')
          .eq('center_id', centerId).maybeSingle()
      ]);

      // استخراج البيانات بعد انتهاء الطلبات المتوازية
      const scheduleData = scheduleRes.data || [];
      const sessionsData = sessionsRes.data || [];
      const studentsCount = studentsRes.count || 0;
      const expensesData = expensesRes.data || [];
      const settingsData = settingsRes.data;

      // تحديث إعدادات السنتر فوراً
      if (settingsData) setCenterSettings(settingsData);

      // معالجة بيانات الحصص
      const activeIds = [];
      const cancelledIds = [];
      const activeSessionsMapData = {};

      sessionsData.forEach(s => {
        if (s.status === 'cancelled' || (s.topic && s.topic.includes('ملغاة'))) {
          cancelledIds.push(s.group_id);
        } else {
          activeIds.push(s.group_id);
          activeSessionsMapData[s.group_id] = s;
        }
      });

      const todayScheduleGroupIds = scheduleData.map(item => item.group_id);
      const todaySessions = sessionsData.filter(s => todayScheduleGroupIds.includes(s.group_id));
      const cancelledTodaySessions = todaySessions.filter(s => s.status === 'cancelled' || s.topic?.includes('ملغاة')).map(s => s.group_id);
      const cancelledScheduleIds = scheduleData.filter(item => cancelledTodaySessions.includes(item.group_id)).map(item => item.group_id);

      const netProfit = calculateCenterNetProfit(sessionsData);
      const totalDailyExpenses = expensesData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      
      setTodayExpenses(totalDailyExpenses);
      setExpensesList(expensesData);
      setTodaysSchedule(scheduleData);
      setActiveSessions(activeIds);
      setCancelledSessions(cancelledScheduleIds);
      setActiveSessionsMap(activeSessionsMapData);
      
      setStats({
        totalStudents: studentsCount,
        todaySessions: scheduleData.length,
        openSessions: activeIds.length,
        revenue: netProfit,
        netCashInDrawer: netProfit - totalDailyExpenses
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      // ✅ بمجرد انتهاء التحميل، سيظهر الـ Hero Banner فوراً
      setLoading(false);
    }
  };


  const formatTime = (time) => {
    if (!time) return '';
    let [h, m] = time.split(':');
    h = parseInt(h);
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const getProgressStats = (startTime, endTime) => {
    const now = new Date();
    const start = new Date(now.toDateString() + ' ' + startTime);
    const end = new Date(now.toDateString() + ' ' + endTime);
    const totalDuration = end - start;
    const elapsed = now - start;

    if (elapsed < 0) return { percent: 0, color: 'bg-green-500', text: 'لم تبدأ' };
    if (elapsed > totalDuration) return { percent: 100, color: 'bg-gray-400', text: 'انتهت' };

    const percent = Math.floor((elapsed / totalDuration) * 100);
    let color = 'bg-green-500';
    if (percent > 50) color = 'bg-amber-500';
    if (percent > 85) color = 'bg-red-500';

    const remainingMins = Math.floor((totalDuration - elapsed) / 60000);
    return { percent, color, text: `متبقي ${remainingMins} دقيقة` };
  };

  const getDelayAlert = (startTime, isOpened) => {
    const now = new Date();
    const start = new Date(now.toDateString() + ' ' + startTime);
    const diffInMinutes = Math.floor((now - start) / 60000);

    if (isOpened || diffInMinutes < 5) return null;

    return {
      isLate: true,
      minutes: diffInMinutes,
      msg: `متأخرة منذ ${diffInMinutes} دقيقة`,
      style: 'border-red-400 bg-red-50 shadow-red-200' 
    };
  };

  const getSessionStatus = (start, end, sessionData) => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    if (sessionData?.is_completed) return 'finished';
    if (sessionData?.actual_start_time) return 'active';

    if (sessionData && !sessionData.actual_start_time && currentTime >= start) {
      return 'teacher-not-started';
    }

    if (currentTime > start && !sessionData) {
      return 'late-start';
    }

    if (sessionData && !sessionData.is_completed && currentTime > end) return 'overtime';
    if (currentTime > end) return 'finished';
    if (currentTime >= start && currentTime <= end) return 'active';
    
    return 'upcoming';
  };

  const handleCancelSession = async (item) => {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      router.push('/login');
      return;
    }
    
    if (!centerId) {
      alert('⚠️ لم يتم تحديد المركز!');
      return;
    }
    
    const reason = prompt("لماذا تم إلغاء الحصة؟ (مثال: اعتذار المدرس)");
    if (!reason) return;

    try {
      const { error } = await supabase.from('sessions').insert([{
        course_id: item.groups?.courses?.id,
        group_id: item.groups?.id,
        topic: `ملغاة - ${reason}`,
        status: 'cancelled',
        price: 0,
        attendees: [],
        is_completed: true,
        created_at: new Date().toISOString(),
        center_id: centerId
      }]);

      if (error) throw error;
      setCancelledSessions([...cancelledSessions, item.groups?.id]);
      alert('✅ تم إلغاء الحصة بنجاح');
      
    } catch (error) {
      alert("حدث خطأ أثناء الإلغاء");
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      router.push('/login');
      return;
    }
    
    if (!centerId) {
      alert('⚠️ لم يتم تحديد المركز!');
      return;
    }
    
    const form = e.target;
    const title = form.title.value;
    const amount = parseFloat(form.amount.value);

    if (!amount || !title) return;

    const { error } = await supabase.from('expenses').insert([
      { 
        title: title, 
        amount: amount,
        category: 'مصروفات نثرية',
        created_by: session.user.id,
        staff_name: currentUserName || 'مستخدم غير معروف',
        created_at: new Date().toISOString(),
        center_id: centerId,
        expense_date: new Date().toISOString().split('T')[0],
        is_admin: false // 🛡️ تحديد أنه مصروف موظف (يظهر للمدير ولا يظهر لغيره)
      }
    ]);

    if (!error) {
      const newExpense = { title, amount, staff_name: currentUserName || 'أنا' };
      setTodayExpenses(prev => prev + amount);
      setExpensesList(prev => [...prev, newExpense]);
      setStats(prev => ({
        ...prev,
        netCashInDrawer: prev.netCashInDrawer - amount
      }));
      setShowExpenseModal(false);
      alert("تم تسجيل المصروف وخصمه من الدرج ✅");
    } else {
      alert("حدث خطأ أثناء التسجيل");
    }
  };

  const calculateCenterNetProfit = (sessions) => {
    if (!sessions || sessions.length === 0) return 0;
    return sessions.reduce((total, session) => {
      if (session.status === 'cancelled' || session.topic?.includes('ملغاة') || !session.payments) {
        return total;
      }
      const numberOfStudents = Object.keys(session.payments).length;
      const centerShare = (Number(session.fixed_share) || 0) * numberOfStudents;
      return total + centerShare;
    }, 0);
  };

  if (!centerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 animate-pulse flex items-center justify-center">
            <FaSpinner className="text-blue-500 text-2xl" />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">مصادقة الدخول...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 animate-in fade-in duration-700 min-h-screen bg-slate-50/50 pb-24 md:pb-12" dir="rtl">
      
      {/* ── HEADER & WELCOME BANNER ── */}
      <div className="relative overflow-hidden bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-sm border border-slate-100 group">
        {/* Animated Background Decoration */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100/40 transition-colors duration-1000"></div>
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-48 h-48 bg-emerald-50/50 rounded-full blur-3xl group-hover:bg-emerald-100/40 transition-colors duration-1000"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex-1 text-center lg:text-right space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-right-4 duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              منصة سمارت التعليمية
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black text-slate-800 leading-tight">
              أهلاً بك، <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-indigo-600">{currentUserName}</span> ✨
            </h2>
            <p className="text-slate-500 font-bold text-sm md:text-lg max-w-xl mx-auto lg:mr-0 leading-relaxed">
              يوم جديد من الإنجاز بانتظارك! دعنا نساعدك في إدارة حصص اليوم بكل سلاسة واحترافية.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
              {allowedFeatures?.includes('academic:sessions') && (
                <Link 
                  href="/admin/sessions" 
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-3 active:scale-95 text-sm md:text-base group"
                >
                  <span>ابدأ إدارة الحصص</span>
                  <FaArrowLeft className="text-xs opacity-60 group-hover:-translate-x-1 transition-transform" />
                </Link>
              )}
              {(allowedFeatures?.includes('finance:reports') || allowedFeatures?.includes('expenses:view')) && (
                <button 
                  onClick={() => setShowReportModal(true)}
                  aria-label="عرض تقرير اليوم"
                  className="bg-white text-slate-600 border-2 border-slate-100 px-8 py-4 rounded-2xl font-black hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-95 text-sm md:text-base"
                >
                  <FaFileAlt className="text-blue-500" />
                  تقرير اليوم
                </button>
              )}
            </div>
          </div>

          {/* Animated Illustration */}
          <div className="w-full max-w-[280px] md:max-w-[350px] relative animate-in zoom-in slide-in-from-left-8 duration-1000 aspect-square">
            <div className="absolute inset-0 bg-blue-400/10 blur-[80px] rounded-full animate-pulse"></div>
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl relative z-10 transition-transform duration-1000">
               {/* Animated Book/Tablet Shell */}
               <rect x="40" y="40" width="120" height="130" rx="15" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
               <rect x="50" y="55" width="100" height="85" rx="5" fill="#ffffff" />
               
               {/* Progress Lines */}
               <rect x="60" y="70" width="60" height="6" rx="3" fill="#3b82f6" className="animate-pulse" />
               <rect x="60" y="85" width="80" height="6" rx="3" fill="#e2e8f0" />
               <rect x="60" y="100" width="40" height="6" rx="3" fill="#e2e8f0" />

               {/* Floating Graduation Cap Icon */}
               <g className="animate-bounce" style={{ animationDuration: '3s' }}>
                  <path d="M100,50 L140,70 L100,90 L60,70 Z" fill="#1e293b" />
                  <path d="M60,70 L60,100 C60,100 80,110 100,110 C120,110 140,100 140,100 L140,70" fill="#1e293b" opacity="0.9" />
                  <path d="M140,70 L140,90" stroke="#f59e0b" strokeWidth="2" />
                  <circle cx="140" cy="90" r="3" fill="#f59e0b" />
               </g>

               {/* Decorative Circles */}
               <circle cx="170" cy="150" r="8" fill="#34d399" className="animate-pulse" />
               <circle cx="30" cy="50" r="6" fill="#fbbf24" className="animate-bounce" style={{ animationDuration: '4s' }} />
            </svg>
            
            {/* Status Overlays */}
            <div className="absolute -bottom-2 -left-2 bg-emerald-500 text-white p-3 rounded-2xl shadow-xl shadow-emerald-200 border-4 border-white animate-bounce" style={{ animationDuration: '3.5s' }}>
               <FaCheckCircle />
            </div>
            <div className="absolute -top-4 -right-2 bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-200 border-4 border-white animate-pulse">
               <FaCalendarDay />
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS SUMMARY ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-1 md:px-0">
        
        {/* Sessions Card */}
        {allowedFeatures?.includes('academic:sessions') && (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] p-6 shadow-xl shadow-blue-100 relative overflow-hidden group">
            <div className="absolute -left-4 -top-4 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-xl">
                  <FaClock />
                </div>
                <div className="text-[10px] font-black bg-emerald-400 text-emerald-900 px-2 py-1 rounded-lg shadow-sm">
                  {stats.openSessions} تم فتحها
                </div>
              </div>
              <p className="font-black text-blue-100/80 text-[10px] uppercase tracking-widest mb-1">حصص الجدول اليوم</p>
              <h3 className="text-4xl font-black tracking-tighter">{stats.todaySessions}</h3>
            </div>
          </div>
        )}

        {/* كارت الطلاب (Students Card) */}
        {loading ? (
             <div className="h-32 bg-white rounded-[2rem] border border-slate-100 animate-pulse"></div>
        ) : allowedFeatures?.includes('students:view') && (
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-purple-200 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">إجمالي الطلاب</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stats.totalStudents}</h3>
              </div>
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                <FaUsers />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 mb-2 uppercase">
                <span>نسبة الحضور التقديرية</span>
                <span className="text-purple-600 font-black">85%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[85%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.4)]"></div>
              </div>
            </div>
          </div>
        )}

        {/* كارت صافي الخزنة */}
        {loading ? (
            <div className="h-32 bg-white rounded-[2rem] border border-slate-100 animate-pulse sm:col-span-1 lg:col-span-2"></div>
        ) : (allowedFeatures?.includes('expenses:view') || allowedFeatures?.includes('finance:reports')) && (
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-[2rem] p-6 shadow-xl shadow-emerald-100 relative overflow-hidden group sm:col-span-1 lg:col-span-2">
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/5 rounded-full translate-x-10 translate-y-10 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-xl">
                    <FaCoins strokeWidth={3} />
                  </div>
                  <button 
                    onClick={() => setShowExpenseModal(true)}
                    aria-label="تسجيل مصروف جديد"
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl font-black text-[10px] md:text-xs transition-all flex items-center gap-2 border border-white/10 active:scale-95 shadow-lg"
                  >
                    <FaPlus /> تسجيل مصروف
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-auto">
                  <div>
                      <p className="font-black text-emerald-50 text-[10px] uppercase tracking-widest mb-1">صافي الخزنة الآن</p>
                      <h3 className="text-3xl md:text-4xl font-black flex items-baseline gap-2">
                        {Math.floor(stats.netCashInDrawer || 0).toLocaleString()} 
                        <span className="text-sm font-bold opacity-75">ج.م</span>
                      </h3>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs font-black">
                      <div className="bg-black/20 px-3 py-2 rounded-xl border border-white/5 backdrop-blur-sm">
                        <span className="opacity-60 ml-1">الدخل:</span>
                        {Math.floor(stats.revenue || 0).toLocaleString()}
                      </div>
                      <div className="bg-red-500/30 px-3 py-2 rounded-xl border border-red-400/20 backdrop-blur-sm">
                        <span className="opacity-60 ml-1">الصرف:</span>
                        {todayExpenses.toLocaleString()}
                      </div>
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ATTENDANCE CARD — يظهر فقط لو الباقة تدعم الحضور ── */}
      {allowedFeatures?.includes('page_staff_attendance') && (
      <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Info */}
          <div className="flex items-center gap-5 flex-1">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0 ${
              !attendanceRecord ? 'bg-slate-100 text-slate-400' :
              attendanceRecord.check_out ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-600 text-white'
            }`}>
              <FaUserClock />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">حضورك اليوم</p>
              <h3 className="text-lg font-black text-slate-800">
                {!attendanceRecord && 'لم تسجّل حضورك بعد'}
                {attendanceRecord && !attendanceRecord.check_out && (
                  <span className="text-blue-600">حاضر منذ {new Date(attendanceRecord.check_in).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
                {attendanceRecord?.check_out && (
                  <span className="text-emerald-600">انصرفت — مدة عملك: {(() => {
                    const diff = new Date(attendanceRecord.check_out) - new Date(attendanceRecord.check_in);
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    return `${h}س ${m}د`;
                  })()}</span>
                )}
              </h3>
              {attendanceRecord?.check_in && (
                <p className="text-[11px] text-slate-400 font-bold mt-1">
                  دخول: {new Date(attendanceRecord.check_in).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  {attendanceRecord.check_out && (
                    <> · خروج: {new Date(attendanceRecord.check_out).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full lg:w-auto">
            {!attendanceRecord && (
              <button
                onClick={handleCheckIn}
                disabled={attendanceLoading}
                className="flex-1 lg:flex-none h-14 px-8 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {attendanceLoading ? <FaSpinner className="animate-spin" /> : <FaSignInAlt />}
                تسجيل الحضور
              </button>
            )}
            {attendanceRecord && !attendanceRecord.check_out && (
              <button
                onClick={handleCheckOut}
                disabled={attendanceLoading}
                className="flex-1 lg:flex-none h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
              >
                {attendanceLoading ? <FaSpinner className="animate-spin" /> : <FaSignOutAlt />}
                تسجيل الانصراف
              </button>
            )}
            {attendanceRecord?.check_out && (
              <div className="flex-1 lg:flex-none h-14 px-8 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-sm flex items-center justify-center gap-3 border border-emerald-100">
                <FaCheckCircle /> تم تسجيل يومك بنجاح ✨
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── TIMELINE ── */}
      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <FaClock className="text-slate-500 text-sm md:text-base"/>
            </div>
            توقيت الحصص
          </h2>
          <span className="bg-slate-50 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100">
             {todaysSchedule.length} موعد مُدرج
          </span>
        </div>
{loading ? (
    <div className="space-y-6">
        <div className="h-24 bg-slate-50 rounded-[2rem] animate-pulse"></div>
        <div className="h-24 bg-slate-50 rounded-[2rem] animate-pulse"></div>
    </div>
) : todaysSchedule.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center animate-in fade-in duration-1000">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <FaExclamationCircle className="text-5xl text-slate-300" />
            </div>
            <h3 className="text-slate-500 font-black text-xl">لا توجد حصص مجدولة</h3>
            <p className="text-slate-400 text-xs font-bold mt-2">يبدو أن هذا اليوم خالي من المواعيد المسبقة</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {todaysSchedule.map((item) => {
              const sessionData = activeSessionsMap[item.group_id];
              const status = getSessionStatus(item.start_time, item.end_time, sessionData);
              const isOpened = activeSessions.includes(item.groups?.id);
              const isCancelled = cancelledSessions.includes(item.groups?.id);
              const progress = getProgressStats(item.start_time, item.end_time);
              const delayAlert = getDelayAlert(item.start_time, isOpened);
              
              if (isCancelled) {
                return (
                  <div key={item.id} className="flex flex-col md:flex-row items-center gap-5 p-5 md:p-6 rounded-3xl border-2 border-slate-100 bg-slate-50/50 opacity-60 grayscale transition-all shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <FaTimesCircle size={24} />
                    </div>
                    <div className="flex-1 text-center md:text-right">
                      <h3 className="font-black text-slate-600 line-through text-base md:text-lg">{item.groups?.courses?.name || 'حصة عامة'}</h3>
                      <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">حالة الحصة: تم الإلغاء لليوم</p>
                    </div>
                  </div>
                );
              }
              
              let cardStyle = "border-slate-100 bg-white hover:border-blue-300 hover:shadow-xl hover:-translate-y-1";
              if (status === 'active') cardStyle = "border-emerald-500 bg-emerald-50/20 shadow-lg shadow-emerald-50";
              if (status === 'teacher-not-started') cardStyle = "border-amber-400 bg-amber-50 shadow-amber-50";
              if (status === 'overtime') cardStyle = "border-red-400 bg-red-50 animate-pulse";
              if (status === 'late-start' || (delayAlert?.isLate && !isOpened)) cardStyle = "border-rose-500 bg-rose-50 shadow-rose-100 animate-in shake duration-500";
              if (status === 'finished') cardStyle = "opacity-50 grayscale bg-slate-50 border-slate-200";

              return (
                <div 
                  key={item.id} 
                  className={`relative flex flex-col md:flex-row items-stretch md:items-center gap-6 p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-500 shadow-sm ${cardStyle}`}
                >
                  {/* Floating Alerts */}
                  <div className="absolute -top-3 left-6 flex gap-2">
                    {delayAlert?.isLate && !isOpened && (
                      <div className="bg-rose-600 text-white text-[9px] md:text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
                        <FaClock /> {delayAlert.msg}
                      </div>
                    )}
                    {status === 'overtime' && (
                      <div className="bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
                        🚨 وقت إضافي
                      </div>
                    )}
                    {sessionData?.actual_start_time && (
                      <div className="bg-emerald-600 text-white text-[9px] font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
                        ✨ الحصة بدأت فعلياً
                      </div>
                    )}
                  </div>

                  {/* Time Section */}
                  <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:border-l md:pl-8 border-slate-100 md:min-w-[140px] gap-2">
                    <div className="text-right md:text-center w-full">
                      <span className="block text-2xl md:text-3xl font-black text-slate-800 tracking-tighter" dir="ltr">
                        {formatTime(item.start_time)}
                      </span>
                      <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest block mt-1">
                        بانتظار {formatTime(item.end_time)}
                      </span>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg md:text-2xl font-black text-slate-800 leading-none flex items-center gap-2">
                        {item.exam_id && <FaFileAlt className="text-amber-500 shrink-0" size={18} />}
                        {item.exam_id ? item.exams?.title : (item.groups?.courses?.name || 'حصة غير مسماة')}
                      </h3>
                      
                      {item.exam_id ? (
                        <span className="text-[9px] md:text-[10px] bg-amber-500 text-white px-3 py-1 rounded-lg font-black tracking-widest uppercase">
                          امتحان مجدول
                        </span>
                      ) : (
                        <span className="text-[9px] md:text-[10px] bg-slate-900 text-white px-3 py-1 rounded-lg font-black tracking-widest uppercase">
                          {item.groups?.courses?.grade || 'عام'}
                        </span>
                      )}
                      
                      {status === 'active' && isOpened && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full font-black text-[9px] md:text-[10px] animate-pulse">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> جارية الآن
                        </div>
                      )}
                    </div>

                    <div className="flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm font-black text-slate-500 flex">
                      <div className="flex items-center gap-2">
                        <FaChalkboardTeacher className="text-blue-500"/> 
                        {item.groups?.courses?.instructors?.name || item.groups?.courses?.instructor || item.exams?.instructors?.name || 'مدرس لم يحدد'}
                      </div>
                      <div className="flex items-center gap-2">
                        <FaUsers className="text-purple-500"/> 
                        {item.groups?.name || 'مجموعة عامة'}
                      </div>
                      <div className="bg-slate-50 text-slate-600 px-3 py-1 rounded-xl text-[10px] font-black border border-slate-100">{item.rooms?.name || 'قاعة غير محددة'}</div>
                    </div>

                    {/* Progress Track */}
                    {status === 'active' && (
                      <div className="w-full mt-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">تتبع المسار الزمني</span>
                          <span className={`text-[10px] font-black ${progress.percent > 85 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                            {progress.text} • {progress.percent}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-[2px]">
                          <div 
                            style={{ width: `${progress.percent}%` }} 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${progress.color} shadow-lg shadow-current/20 shadow-inner`}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Section */}
                  <div className="flex flex-row md:flex-col lg:flex-row gap-3 items-center md:min-w-[180px]">
                    {isOpened ? (
                      <div className="flex-1 bg-emerald-50 text-emerald-600 border border-emerald-100 h-14 md:h-16 rounded-2xl flex items-center justify-center gap-2 font-black text-xs md:text-sm shadow-inner opacity-80">
                        <FaCheckCircle /> مفتوحة
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          const courseId = item.groups?.courses?.id || item.exams?.course_id;
                          const groupId = item.groups?.id || item.exams?.group_id;
                          const name = item.exam_id ? item.exams?.title : (item.groups?.courses?.name || 'غير محدد');
                          const today = new Date().toLocaleDateString('ar-EG');
                          const examParam = item.exam_id ? `&exam_id=${item.exam_id}` : '';
                          const url = `/admin/sessions?action=create&course_id=${courseId}&group_id=${groupId}${examParam}&topic=${item.exam_id ? 'امتحان' : 'حصة'} ${name} - ${today}&scheduled_start_time=${item.start_time}`;
                          router.push(url);
                        }}
                        className={`flex-1 h-14 md:h-16 rounded-2xl font-black text-xs md:text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3
                          ${delayAlert?.isLate 
                            ? 'bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700 animate-pulse border-none' 
                            : 'bg-slate-900 text-white hover:bg-black shadow-slate-200 border-none'
                          }
                        `}
                      >
                        {delayAlert?.isLate ? 'فتح فوراً 🚨' : (<span>{item.exam_id ? 'بدء الامتحان' : 'فتح الحصة'}</span>)}
                      </button>
                    )}

                    {!isOpened && (
                      <button 
                        onClick={() => handleCancelSession(item)}
                        className="w-14 h-14 md:w-16 md:h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-100 shrink-0 md:order-last active:scale-95"
                        title="إلغاء الحصة"
                      >
                        <FaTimesCircle size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[5000] p-0 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md p-8 md:p-10 rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3 leading-tight">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <FaCoins />
                  </div>
                  تسجيل مصروف
                </h3>
                <button 
                  onClick={() => setShowExpenseModal(false)} 
                  aria-label="إغلاق التنبيه"
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <FaTimesCircle size={24} />
                </button>
             </div>
            
            <form onSubmit={handleAddExpense} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mr-1">بيان الصرف</label>
                <input 
                  type="text" 
                  name="title"
                  placeholder="مثال: شاي، صيانة، مستلزمات..."
                  className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none font-black text-sm transition-all"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mr-1">المبلغ (ج.م)</label>
                <input 
                  type="number" 
                  name="amount"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none font-black text-lg transition-all"
                  required
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 md:h-16 rounded-2xl transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                >
                  تسجيل وخصم ✅
                </button>
                <button 
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black h-14 md:h-16 rounded-2xl transition-all active:scale-95"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReportModal && (
        <DailyReportModal 
          isOpen={showReportModal} 
          onClose={() => setShowReportModal(false)}
          stats={stats}
          expenses={expensesList} 
          sessions={todaysSchedule}
          currentUser={currentUserName || 'Admin'} 
          centerName={centerSettings?.center_name}
          logoUrl={centerSettings?.logo_url}
        />
      )}
    </div>
  );
}

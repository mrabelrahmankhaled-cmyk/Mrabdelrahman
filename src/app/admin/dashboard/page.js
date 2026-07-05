'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../../lib/supabase-browser';

// 🚀 Lazy load heavy charts for better mobile performance
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });

import { 
  TrendingUp, Users, DollarSign, AlertCircle, Award, 
  MessageCircle, Phone, Eraser, X, Clock, Calculator, Star , Activity, Skull, AlertTriangle, CheckCircle, TrendingDown,
  HelpCircle, Info
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId
import { motion, AnimatePresence } from 'framer-motion';
import AccessDenied from '../../../components/AccessDenied';

// دالة لتوليد نصائح ذكية بناءً على الإحصائيات المالية
const getAINarrative = (stats) => {
  // ✅ 1. ضفنا totalDebt و collectionRate عشان نستخدمهم في الحكم
  const { totalRevenue, expectedMonthly, gapPercentage, revenueGap, liveBalance, totalDebt, collectionRate } = stats;

  // 1️⃣ حماية من نقص البيانات (Defensive Check)
  if (!expectedMonthly || expectedMonthly === 0) {
    return {
      message: "أهلاً بك يا هندسة. سجل حصصك اليوم، وبمجرد إدخال البيانات، سأقوم بتحليل أداء السنتر المالي والسلوكي هنا فوراً.",
      mood: 'info'
    };
  }

  // 2️⃣ سيناريو: السنتر لسه ما بدأش تحصيل (Activity Gap)
  if (totalRevenue === 0 && expectedMonthly > 0) {
    return {
      message: "الجدول مليان حصص بس لسه مفيش تحصيل دخل الخزنة. أول ما السكرتارية تبدأ تستلم الفلوس، هحللك الفجوة المالية هنا.",
      mood: 'info'
    };
  }

  // 3️⃣ سيناريو: الخطر المالي الصريح (عجز الخزنة) - الأولوية القصوى 🚨
  if (liveBalance < 0) {
    return {
      message: `🚨 طوارئ: الخزنة فيها عجز ${Math.abs(liveBalance).toLocaleString()} ج.م. لازم نوقف المصاريف فوراً ونحصل المتأخرات.`,
      mood: 'danger'
    };
  }

  // 🔥 4️⃣ التعديل الجديد: كشف الديون "المستخبية"
  // لو فيه مليم ديون، ممنوع يطلع رسالة نجاح خضراء، حتى لو الدخل بالملايين
  if (totalDebt > 0) {
    return {
      message: `الوضع ظاهرياً جيد، ولكن انتبه! ⚠️ لديك ديون معلقة بقيمة ${totalDebt.toLocaleString()} ج.م. (نسبة التحصيل ${collectionRate}%). لا تفرح بالدخل قبل تصفير الديون تماماً.`,
      mood: 'warning' // لون برتقالي للتنبيه
    };
  }

  // 5️⃣ سيناريو: فجوة التحصيل الكبيرة (Level 3 Danger)
  if (gapPercentage > 15) {
    return {
      message: `خد بالك! فيه فجوة تحصيل ${gapPercentage}%.. إحنا المفروض نكون حصلنا ${expectedMonthly.toLocaleString()} ج، بس اللي دخل فعلاً ${totalRevenue.toLocaleString()} ج. فيه ${revenueGap.toLocaleString()} ج ضايعين.`,
      mood: 'danger' 
    };
  }

  // 6️⃣ سيناريو: النجاح الكامل (Success)
  // 🔒 الشرط هنا بقى صارم: لازم (totalDebt === 0)
  if (gapPercentage <= 10 && totalRevenue > 0 && totalDebt === 0) {
    return {
      message: "السنتر شغال زي الكتاب ما بيقول! 🚀 لا توجد ديون، والسيولة ممتازة. الله ينور يا هندسة.",
      mood: 'success'
    };
  }

  // Fallback (لو مفيش أي شرط انطبق)
  return {
    message: "الوضع مستقر حالياً. تابع رادار المخاطر بانتظام لتجنب أي تسرب للطلاب الأسبوع القادم.",
    mood: 'info'
  };
};
export default function AdminDashboard() {
  const { centerId, allowedFeatures, loading: authLoading } = useAuth(); // ← استخراج centerId من الـ context
  // --- Hooks and state declarations (always run to keep hook order stable) ---
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingTickets: 0,
    unreadMessages: 0,
    expectedMonthly: 0,
    revenueGap: 0,
    gapPercentage: 0,
    liveBalance: 0,
    totalDebt: 0,
    collectionRate: 0
  });
  const [centerData, setCenterData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topTeachers, setTopTeachers] = useState([]);
  const [debtorStudents, setDebtorStudents] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [peakHourData, setPeakHourData] = useState([]);
  const [livePeeks, setLivePeeks] = useState({ current: [], upcoming: [] });
  const [anomalies, setAnomalies] = useState([]);
  const [activities, setActivities] = useState([
    { id: 'startup', text: 'بدء مراقبة نبض السنتر الذكي...', type: 'info', count: 1, time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const addActivity = (text, type = 'info') => {
    setActivities(prev => {
      if (prev.length > 0 && prev[0].text === text) {
        const updated = [...prev];
        updated[0] = { ...updated[0], count: (updated[0].count || 1) + 1, time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) };
        return updated;
      }
      return [
        { id: Date.now() + Math.random(), text, type, count: 1, time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) },
        ...prev
      ].slice(0, 3);
    });
  };

  // --- إضافة: State لحفظ سجل الطالب المختار للعرض ---
  const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);
  const [operatingMode, setOperatingMode] = useState('balanced'); // options: conservative, balanced, aggressive

  // 🛡️ Package Guard
  if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_admin_dashboard')) {
    return <AccessDenied />;
  }

  // دالة لتحويل الوقت لنظام 12 ساعة
  const formatTime12 = (timeStr) => {
    if (!timeStr) return 'غير محدد';
    try {
      const [h, m] = timeStr.split(':');
      let hour = parseInt(h);
      const ampm = hour >= 12 ? 'م' : 'ص';
      hour = hour % 12 || 12;
      return `${hour}:${m} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);

  useEffect(() => {
    if (centerId) {
      fetchDashboardData();
      fetchCenterInfo();
    }
  }, [centerId]);

  async function fetchCenterInfo() {
    try {
      const { data, error } = await supabase
        .from('centers')
        .select('*, packages(name)')
        .eq('id', centerId)
        .single();
      if (!error) setCenterData(data);
    } catch (e) { console.error(e); }
  }

  // 🆕 Real-time subscriptions for admin dashboard
  useEffect(() => {
    console.log('🧐 Checking centerId for Realtime:', centerId);
    if (!centerId) {
      console.warn('⚠️ Cannot start Realtime: centerId is missing!');
      return;
    }
    
    console.log('🚀 Attempting to connect to Pulse (Realtime)...');
    const channel = supabase.channel(`pulse-${centerId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: centerId },
      },
    });
    
    // Listen to sessions changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sessions',
      filter: `center_id=eq.${centerId}`
    }, (payload) => {
      console.log('📡 Realtime Session Event:', payload);
      if (payload.eventType === 'INSERT') addActivity('إشعار: تم فتح حصة تعليمية جديدة الآن', 'success');
      if (payload.eventType === 'UPDATE') {
        const oldLen = payload.old?.attendees?.length || 0;
        const newLen = payload.new?.attendees?.length || 0;
        if (newLen > oldLen) addActivity('الآن: طالب جديد قام بتسجيل حضوره بنجاح', 'success');
        else addActivity('تحديث: تم تعديل بيانات إحدى المجموعات', 'info');
      }
      fetchDashboardData();
    });

    // Listen to students changes
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'students',
      filter: `center_id=eq.${centerId}`
    }, (payload) => {
      console.log('📡 Realtime Student Event:', payload);
      addActivity(`مبروك: انضمام الطالب (${payload.new.name || 'جديد'}) لأسرة السنتر`, 'success');
      fetchDashboardData();
    });

    // Listen to expenses
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'expenses',
      filter: `center_id=eq.${centerId}`
    }, (payload) => {
      console.log('📡 Realtime Expense Event:', payload);
      addActivity('تنبيه مالي: تم تسجيل مصروفات جديدة من الخزنة', 'warning');
      fetchDashboardData();
    });

    channel.subscribe((status) => {
      console.log('📡 Realtime Status Changed:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅✅✅ SUCCESS: Admin Pulse is now LIVE and Listening!');
        addActivity('نظام المراقبة اللحظي متصل الآن ✅', 'info');
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('❌ ERROR: Failed to connect to Realtime. Check Supabase Dash!');
        addActivity('فشل في الاتصال بنبض السنتر ❌', 'warning');
      }
    });

    return () => {
      console.log('🔌 Disconnecting from Pulse channel...');
      supabase.removeChannel(channel);
    };
  }, [centerId]);

  // 1. دالة تصفير المديونية (تحديث الحصص لجعل المديونية صفر)
  const clearStudentDebt = async (student) => {
    if (!centerId) {
      alert('⚠️ لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    
    const confirmClear = window.confirm(`هل أنت متأكد من تصفير مديونية الطالب ${student.name}؟ سيتم اعتبار جميع حصصه السابقة مدفوعة بالكامل.`);
    if (!confirmClear) return;

    try {
      setLoading(true);
      const { data: sessions } = await supabase.from('sessions').select('*').eq('center_id', centerId);
      
      for (const session of sessions) {
        if (session.attendees?.includes(student.id)) {
          const payments = session.payments || {};
          const sessionPrice = parseFloat(session.price) || 0;
          
          payments[student.id] = sessionPrice;

          await supabase
            .from('sessions')
            .update({ payments: payments })
            .eq('id', session.id)
            .eq('center_id', centerId);
        }
      }
      alert("تم تصفير مديونية الطالب بنجاح!");
      await fetchDashboardData(); 
    } catch (err) {
      console.error("Clear Debt Error:", err);
      alert("حدث خطأ أثناء تصفير المديونية");
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppReminder = (student) => {
    let cleanPhone = student.phone.replace(/\s+/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '2' + cleanPhone;
    } else if (!cleanPhone.startsWith('2')) {
      cleanPhone = '2' + cleanPhone;
    }

    const message = `إدارة سنتر الأوائل تحييكم. نود تذكيركم بأن الطالب/ة: ${student.name} لديه مديونية إجمالية قدرها ${student.amount} ج.م عن عدد (${student.sessionCount}) حصص. يرجى المراجعة لتسوية الحساب.`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

const calculateStudentRisk = (student, sessions, config) => {
    let score = 0;
    let reasons = [];

    // جلب حد المديونية من الإعدادات (أو 300 كقيمة افتراضية)
    const debtLimit = config?.debt_limit || 300;

    // ترتيب الحصص من الأحدث للأقدم
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
    );

    // آخر 4 حصص إجمالية في السنتر
    const last4Sessions = sortedSessions.slice(0, 4);
    
    // الحصص اللي حضرها الطالب من آخر 4 حصص
    const attendedCount = last4Sessions.filter(s => s.attendees?.includes(student.id)).length;

    // 1️⃣ تحليل الغياب (الوزن: 30)
    if (attendedCount <= 1) { 
      score += 30;
      reasons.push("غياب متكرر (حضر حصة واحدة أو أقل من آخر 4)");
    } else if (attendedCount === 2) {
      score += 15;
      reasons.push("تذبذب في الحضور");
    }

    // 2️⃣ تحليل المديونية المالي (تعديل جذري هنا 🔥)
    if (student.amount > 0) {
      // أ) كارثة مالية: المبلغ أكبر من 1000 جنيه (أولوية قصوى)
      if (student.amount >= 1000) {
        score += 80; // هيظهر فوراً
        reasons.push(`🚨 مبلغ ضخم جداً (${student.amount} ج)`);
      }
      // ب) تجاوز الحد المسموح (أكبر من 300 جنيه)
      else if (student.amount >= debtLimit) {
        score += 50; // هيظهر فوراً لأن شرط الظهور 40
        reasons.push(`تجاوز حد المديونية المسموح (${debtLimit} ج)`);
      }
      // ج) تراكم عدد حصص (3 حصص أو أكتر)
      else if (student.sessionCount >= 3) {
        score += 40;
        reasons.push("مديونية متراكمة لـ 3 حصص أو أكثر");
      } 
      // د) مديونية عادية
      else {
        score += 15;
        reasons.push("يوجد مديونية معلقة");
      }
    }

    // 3️⃣ تحليل التشتت (حضور مجموعات مختلفة)
    const mySessions = sessions.filter(s => s.attendees?.includes(student.id)).slice(0, 4);
    const differentCourses = new Set(mySessions.map(s => s.course_id)).size;
    if (differentCourses > 1) {
      score += 10;
      reasons.push("تغيير المجموعات (حضور تعويضي)");
    }

    return { score: Math.min(score, 100), reasons };
  };

async function fetchDashboardData() {
    if (!centerId) return;
    
    setLoading(true);
    try {
      // 1️⃣ جلب الجداول الأساسية مع فلترة حسب المركز
      const { data: sessions } = await supabase.from('sessions').select('*').eq('center_id', centerId);
      const { data: students } = await supabase.from('students').select('*').eq('center_id', centerId);
      const { data: courses } = await supabase.from('courses').select('*, instructors(id, name)').eq('center_id', centerId);
      const { data: schedule } = await supabase
        .from('schedule')
        .select(`
          *, 
          rooms(name), 
          groups(
            *, 
            courses(
              *, 
              instructors(id, name)
            )
          )
        `)
        .eq('center_id', centerId);
      
      const { data: rooms } = await supabase.from('rooms').select('capacity').eq('center_id', centerId);
      const totalCenterCapacity = rooms?.reduce((sum, r) => sum + (r.capacity || 0), 0) || 150; 
      const { data: allExpenses } = await supabase.from('expenses').select('amount').eq('center_id', centerId);
      const { data: storeSales } = await supabase.from('store_sales').select('price_sold').eq('center_id', centerId);
      
      // 🆕 جلب اشتراكات الشهر الحالي
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { data: monthSubs } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('month_year', currentMonthYear)
        .eq('center_id', centerId);
      
      let totalIncome = 0;
      let totalExpenses = 0;
      
      // أ) دخل الحصص
      sessions?.forEach(session => {
        const payments = session.payments || {};
        Object.values(payments).forEach(amount => {
          totalIncome += parseFloat(amount) || 0;
        });
        // مصروفات جوه الحصة
        if (session.expenses) totalExpenses += parseFloat(session.expenses) || 0;
      });

      // ب) إيراد المتجر
      storeSales?.forEach(sale => {
        totalIncome += parseFloat(sale.price_sold) || 0;
      });

      // 🆕 ج) دخل الاشتراكات الشهرية
      monthSubs?.forEach(sub => {
        totalIncome += parseFloat(sub.amount_paid || 0);
      });

      // ج) المصروفات العامة
      allExpenses?.forEach(ex => {
        totalExpenses += parseFloat(ex.amount) || 0;
      });

      const financialData = {
        income: totalIncome,
        balance: totalIncome - totalExpenses
      };

      // 🆕 2️⃣ جلب إعدادات السنتر (عشان نعرف debt_limit) - ✅ ده التعديل المهم
      const { data: settingsData } = await supabase
        .from('center_settings')
        .select('*')
        .eq('center_id', centerId)
        .maybeSingle();
      
      // تجهيز الإعدادات (لو مفيش داتا، نستخدم قيمة افتراضية 300)
      const currentConfig = settingsData || { debt_limit: 300 };

      let totalPaidActual = 0;
      let globalDebtSum = 0; 
      let globalRequiredSum = 0;
      let teacherIncomeMap = {};
      let studentDebtMap = {}; 
      let studentSessionPayments = {}; // 🆕 لتتبع ما تم دفعه حصة بحصة sKey -> cId -> totalPaid

      const daysOfWeekShort = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const timelineMap = {};
      const timelineKeys = [];
      
      for (let i = 9; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        timelineKeys.push(dateStr);
        timelineMap[dateStr] = { 
          name: daysOfWeekShort[d.getDay()] + ` ${d.getDate()}/${d.getMonth()+1}`, 
          income: 0, 
          debt: 0 
        };
      }

      sessions?.forEach(session => {
        const sessionPrice = parseFloat(session.price) || 0;
        const attendees = session.attendees || [];
        const payments = session.payments || {};
        const sessionDate = session.created_at || session.date;
        const dStr = (sessionDate || "").split('T')[0];
        
        let sessionPaid = 0;
        Object.values(payments).forEach(amount => {
          sessionPaid += parseFloat(amount) || 0;
        });
        totalPaidActual += sessionPaid;
        if (timelineMap[dStr]) timelineMap[dStr].income += sessionPaid;

        // --- تحليل المدرسين ---
        const course = courses?.find(c => c.id === session.course_id);
        if (course) {
          const instructor = course.instructors?.name || course.instructor || "غير معروف";
          if (!teacherIncomeMap[instructor]) {
            teacherIncomeMap[instructor] = { totalIncome: 0, centerShare: 0, totalRequired: 0 };
          }
          teacherIncomeMap[instructor].totalIncome += sessionPaid;
          teacherIncomeMap[instructor].centerShare += (parseFloat(session.calculated_center_share) || 0); 
        }

        attendees.forEach(studentId => {
          const studentInfo = students?.find(s => s.unique_id === studentId || s.id === studentId);
          if (!studentInfo) return;
          
          const sKey = studentInfo.id; // استخدام الـ ID لتوحيد المفتاح
          const rawPayment = payments[studentId]; 
          
          const isFreeStudent = studentInfo?.is_free === true || studentInfo?.is_free === 1;
          if (isFreeStudent) return;

          // 🆕 فحص إعفاء المادة لهذا الطالب
          let studentDiscount = 0;
          try {
            const discounts = studentInfo?.course_discounts;
            if (discounts && typeof discounts === 'object') {
              studentDiscount = parseFloat(discounts[session.course_id]) || 0;
            }
          } catch (e) { console.error("Discount Parse Error", e); }

          // جلب بيانات المادة لمعرفة سعر الشهر
          const course = courses?.find(c => c.id === session.course_id);
          const monthlyPrice = parseFloat(course?.monthly_price || 0);

          // 🚨 القاعدة الذهبية: لو الطالب عنده إعفاء مادة صريح (free_courses) أو خصم يغطي الشهر
          const isExplicitExempt = studentInfo?.free_courses?.includes(session.course_id);
          const isCourseExempted = isExplicitExempt || (studentDiscount >= monthlyPrice && monthlyPrice > 0);
          
          let requiredAmount = 0;
          if (!isCourseExempted) {
             // 🆕 فحص حالة "سنتر فقط" (الطالب يدفع نصيب السنتر ومعفي من نصيب المستر)
             const isCenterOnly = studentInfo?.center_only_courses?.includes(session.course_id);
             if (isCenterOnly) {
                requiredAmount = parseFloat(session.fixed_share) || 0;
             } else {
                requiredAmount = Math.max(0, sessionPrice); 
             }
          }

          if (isCourseExempted) return;

          // 🆕 فحص لو الطالب عنده اشتراك مفعل للمادة دي في شهر الحصة
          const sessDate = session.created_at || session.date;
          const sessMonthYear = sessDate ? `${new Date(sessDate).getFullYear()}-${String(new Date(sessDate).getMonth() + 1).padStart(2, '0')}` : currentMonthYear;
          
          const hasActiveSub = monthSubs?.some(s => 
            s.student_id === sKey && 
            s.course_id === session.course_id && 
            s.month_year === sessMonthYear
          );

          const isMonthlyForCourse = studentInfo.monthly_courses?.includes(session.course_id);
          const isGlobalMonthly = studentInfo.subscription_type === 'شهري';
          const isMonthly = isMonthlyForCourse || isGlobalMonthly;

          // 🚨 القاعدة الجديدة: لو الطالب معندوش اشتراك نشط، المطلوب منه حالياً هو "تمن الحصة" بس
          // ده بيخلي كفاءة التحصيل 100% طالما الطالب بيدفع حصة بحصة
          if (!hasActiveSub) {
            globalRequiredSum += requiredAmount;
            if (course) {
              const instructorName = course.instructors?.name || course.instructor || "غير معروف";
              teacherIncomeMap[instructorName].totalRequired += requiredAmount;
            }
          }

          const paidAmount = parseFloat(rawPayment) || 0;
          const debt = requiredAmount - paidAmount;

          // 🚨 تصحيح مديونية الحصة: لو الطالب "شهري" حقيقي أو عنده اشتراك، ملوش دين هنا
          const effectiveDebt = (hasActiveSub || isMonthly) ? 0 : debt;

          if (effectiveDebt > 0) {
            if (effectiveDebt < 1) return; 
            
            globalDebtSum += effectiveDebt; 
            const dStr = (session.created_at || session.date || "").split('T')[0];
            if (timelineMap[dStr]) timelineMap[dStr].debt += effectiveDebt;

            if (!studentDebtMap[sKey]) {
              studentDebtMap[sKey] = { 
                amount: 0, 
                sessionCount: 0, 
                lastSession: session.topic, 
                history: [],
                isHighRisk: false 
              };
            }
            studentDebtMap[sKey].amount += effectiveDebt;
            studentDebtMap[sKey].sessionCount += 1;

            if (studentDebtMap[sKey].amount >= (currentConfig.debt_limit || 300) || studentDebtMap[sKey].sessionCount >= 4) {
                studentDebtMap[sKey].isHighRisk = true;
            }

            studentDebtMap[sKey].history.push({
               topic: session.topic || 'حصة',
               date: session.date || new Date(session.created_at).toLocaleDateString(),
               amount: effectiveDebt
            });
          }
        });
      });

      // 🆕 3️⃣ تحليل الاشتراكات الشهرية (الدخل والديون) - فقط لو حضر حصة واحدة على الأقل
      students?.forEach(student => {
        if (student.is_free === true || student.is_free === 1) return;

        const studentMonthlyIds = student.monthly_courses || [];
        if (studentMonthlyIds.length === 0 && student.subscription_type !== 'شهري') return;

        const sKey = student.id;

        studentMonthlyIds.forEach(cId => {
          const course = courses?.find(c => c.id === cId);
          if (!course) return;

          // 🆕 تعريف اسم المدرس وتجهيز بياناته بشكل صحيح
          const instructorName = course.instructors?.name || course.instructor || "غير معروف";
          if (!teacherIncomeMap[instructorName]) {
            teacherIncomeMap[instructorName] = { totalIncome: 0, centerShare: 0, totalRequired: 0 };
          }

          // 🆕 فحص: هل الطالب حضر أي حصة في المادة دي "هذا الشهر"؟
          const hasAttendedThisMonth = sessions?.some(sess => {
            const sDate = (sess.created_at || sess.date || "");
            return sess.course_id === cId && 
                   sDate.startsWith(currentMonthYear) && 
                   (sess.attendees?.includes(student.id) || sess.attendees?.includes(student.unique_id));
          });

          // لو محضرش خالص وحسابه شهري، ميبقاش عليه دين لسه
          if (!hasAttendedThisMonth) return;

          // 🆕 حساب الخصم الخاص بالمادة لهذا الطالب (حالة إعفاء مادة)
          let courseDiscount = 0;
          try {
            const discounts = student.course_discounts;
            if (discounts && typeof discounts === 'object') {
              courseDiscount = parseFloat(discounts[cId]) || 0;
            }
          } catch (e) {}

          const price = Math.max(0, parseFloat(course.monthly_price || 0) - courseDiscount);
          const sub = monthSubs?.find(s => s.student_id === student.id && s.course_id === cId);
          
          // 🆕 حساب الكاش المدفوع في الحصص لهذا الشهر فقط
          let sessionCashPaid = 0;
          sessions?.forEach(sess => {
            const sDate = (sess.created_at || sess.date || "");
            if (sess.course_id === cId && sDate.startsWith(currentMonthYear)) {
              const p = sess.payments || {};
              sessionCashPaid += parseFloat(p[student.id] || p[student.unique_id] || 0);
            }
          });

          if (sub) {
            teacherIncomeMap[instructorName].totalRequired += price;
            // ملاحظة: الـ globalRequiredSum هيتحسب مرة واحدة تحت مع الـ price
          }

          if (sub) {
            const paid = parseFloat(sub.amount_paid || 0);
            totalPaidActual += paid;
            teacherIncomeMap[instructorName].totalIncome += paid;

            const isPartial = sub.notes?.startsWith('[جزئي]');
            if (isPartial) {
              const debt = Math.max(0, price - paid - sessionCashPaid); // خصم الكاش من باقي الاشتراك
              if (debt > 0) {
                globalDebtSum += debt;
                if (!studentDebtMap[sKey]) {
                  studentDebtMap[sKey] = { amount: 0, sessionCount: 0, lastSession: 'باقي اشتراك', history: [], isHighRisk: false };
                }
                studentDebtMap[sKey].amount += debt;
                studentDebtMap[sKey].history.push({
                   topic: `باقي اشتراك مادة ${course.name}`,
                   date: 'اشتراك شهري',
                   amount: debt
                });
              }
            }
          }
          // 🆕 ملحوظة: تم حذف الـ else if (price > 0) عشان ميبقاش فيه ديون "وهمية" 
          // الطالب هيتحسب عليه ديون حصص فقط لو مدافعش كاش، إلا لو بدأ يدفع اشتراك فعلاً
          
          globalRequiredSum += price;
        });
      });

      const debtList = Object.entries(studentDebtMap).map(([id, info]) => {
        const studentInfo = students?.find(s => s.unique_id === id || s.id === id);
        return {
          id,
          name: studentInfo?.name || "طالب غير معروف",
          amount: info.amount,
          sessionCount: info.sessionCount,
          lastSession: info.lastSession,
          history: info.history,
          phone: studentInfo?.phone || "",
          isHighRisk: info.isHighRisk 
        };
      }).filter(st => st.amount > 0).sort((a, b) => b.amount - a.amount);

      setDebtorStudents(debtList.slice(0, 10));

      // 🔥 إضافة رادار المخاطر (الإنذار المبكر) 🔥
      const riskList = debtList
        .map(st => ({
          ...st,
          // ✅ 3️⃣ تمرير currentConfig للدالة هنا
          risk: calculateStudentRisk(st, sessions, currentConfig) 
        }))
        .filter(st => st.risk.score >= 40)
        .sort((a, b) => b.risk.score - a.risk.score)
        .slice(0, 5);

      setAtRiskStudents(riskList);

      // --- تحليل المدرسين المتقدم (Premium Matrix) ---
      const rankedTeachers = Object.entries(teacherIncomeMap)
        .map(([name, data]) => {
            const colRate = data.totalRequired > 0 ? (data.totalIncome / data.totalRequired) * 100 : 100;
            
            // حساب "قوة الحضور" للمدرس (اختياري: متوسط حضور طلابه)
            const teacherSessions = sessions?.filter(s => {
              const c = courses?.find(course => course.id === s.course_id);
              return (c?.instructors?.name || c?.instructor) === name;
            }) || [];
            
            let totalPossible = 0;
            let totalActual = 0;
            teacherSessions.forEach(ts => {
              totalActual += (ts.attendees?.length || 0);
              
              const c = courses?.find(course => course.id === ts.course_id);
              // ✅ حساب دقيق للطلاب المسجلين في المادة دي (مع مراعاة الأنواع المختلفة)
              const enrolledInCourseCount = students?.filter(st => {
                const coursesArr = Array.isArray(st.enrolled_courses) ? st.enrolled_courses : [];
                return coursesArr.map(String).includes(String(c?.id)) || 
                       String(st.course_id) === String(c?.id) ||
                       st.monthly_courses?.includes(c?.id);
              }).length;
              
              totalPossible += (enrolledInCourseCount || ts.attendees?.length || 1); 
            });
            const attendanceStrength = totalPossible > 0 ? (totalActual / totalPossible) * 100 : 0;

            return { 
                name, 
                income: data.totalIncome,
                profit: data.centerShare,
                collectionRate: Math.round(colRate),
                attendanceStrength: Math.round(attendanceStrength),
                score: (data.totalIncome * 0.5) + (colRate * 0.3) + (attendanceStrength * 0.2)
            }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      
      setTopTeachers(rankedTeachers);

      // 🆕 دمج كل أنواع الدخل في الشارت (اشتراكات + مبيعات)
      monthSubs?.forEach(sub => {
        const dStr = (sub.created_at || "").split('T')[0];
        if (timelineMap[dStr]) timelineMap[dStr].income += parseFloat(sub.amount_paid || 0);
      });
      storeSales?.forEach(sale => {
        const dStr = (sale.created_at || "").split('T')[0];
        const paid = parseFloat(sale.price_sold || 0);
        if (timelineMap[dStr]) timelineMap[dStr].income += paid;
        totalPaidActual += paid;
      });

      const timelineIncomeSum = Object.values(timelineMap).reduce((sum, d) => sum + d.income, 0);
      const avgDailyIncome = timelineIncomeSum / timelineKeys.length;
      
      const chartDataPoints = timelineKeys.map(key => ({
        ...timelineMap[key],
        trend: avgDailyIncome
      }));

      const expectedMonthlyRevenue = avgDailyIncome * 30;
      const revenueGap = globalDebtSum; 

      // تحديث النسبة بناءً على الدين الفعلي
      const gapPercentage = globalRequiredSum > 0 ? Math.round((revenueGap / globalRequiredSum) * 100) : 0;

      setStats({
        totalRevenue: financialData?.income || 0,
        totalDebt: globalDebtSum, 
        activeStudents: students?.length || 0,
        lateStudents: debtList.length, 
        collectionRate: (totalPaidActual + globalDebtSum) > 0 ? Math.round((totalPaidActual / (totalPaidActual + globalDebtSum)) * 100) : 0,
        totalRequired: globalRequiredSum,
        liveBalance: financialData?.balance || 0,
        revenueGap: revenueGap,
        gapPercentage: gapPercentage
      });

      setChartData(chartDataPoints);

      // --- 🆕 رادار "نبض السنتر الذكي" (Today vs Baseline vs Safety) ---
      const today = new Date();
      const currentHour = today.getHours();
      const todayStr = today.toISOString().split('T')[0];
      const currentDay = today.getDay();

      const todayActualMap = {};
      const todayScheduledMap = {};
      const historicalBaseMap = {}; // متوسط آخر 4 أسابيع لنفس اليوم
      
      // تهيئة الخرائط بالساعات
      for (let i = 8; i <= 22; i++) {
        todayActualMap[i] = 0;
        todayScheduledMap[i] = 0;
        historicalBaseMap[i] = { sum: 0, count: 0 };
      }

      // 1. حساب الواقعي اليوم
      sessions?.filter(s => (s.created_at || s.date || "").startsWith(todayStr)).forEach(s => {
        const hour = new Date(s.created_at || s.date).getHours();
        if (hour >= 8 && hour <= 22) todayActualMap[hour] += (s.attendees?.length || 0);
      });

      // 2. حساب المعتاد التاريخي (4 أسابيع سابقة)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(today.getDate() - 28);
      
      sessions?.forEach(s => {
        const sDate = new Date(s.created_at || s.date);
        const sDateStr = (s.created_at || s.date || "").split('T')[0];
        
        // لو نفس يوم الأسبوع، وفي آخر 4 أسابيع، ومش النهاردة
        if (sDate.getDay() === currentDay && sDate >= fourWeeksAgo && sDateStr !== todayStr) {
          const hour = sDate.getHours();
          if (hour >= 8 && hour <= 22) {
            historicalBaseMap[hour].sum += (s.attendees?.length || 0);
            historicalBaseMap[hour].count++;
          }
        }
      });

      // 3. حساب المجدول
      schedule?.filter(sched => sched.day_of_week === currentDay).forEach(sched => {
        const startHour = parseInt(sched.start_time?.split(':')[0]);
        const endHour = parseInt(sched.end_time?.split(':')[0]);
        const groupStudentCount = (sched.groups?.enrolled_count || students?.filter(st => st.course_id === sched.groups?.course_id).length || 20);

        for (let h = startHour; h < endHour; h++) {
          if (h >= 8 && h <= 22) todayScheduledMap[h] += groupStudentCount;
        }
      });

      // 4. بناء البيانات النهائية مع مؤشر السرعة والذكاء الهجين
      const peakData = Object.keys(todayActualMap).map(hour => {
        const h = parseInt(hour);
        const actual = todayActualMap[h];
        const scheduled = todayScheduledMap[h];
        const hist = historicalBaseMap[h];
        const baseline = hist.count > 0 ? Math.round(hist.sum / hist.count) : (scheduled * 0.5); // لو مفيش تاريخي نفترض 50% من الجدول

        // أ) مؤشر الضغط (Actual vs Capacity)
        const loadIndex = Math.round((actual / totalCenterCapacity) * 100);

        // ب) مؤشر السرعة (Velocity) - الفرق عن الساعة السابقة
        const prevActual = todayActualMap[h-1] || 0;
        const velocityIndex = actual - prevActual;

        // ج) نسبة الالتزام
        const commitmentRate = scheduled > 0 ? Math.round((actual / scheduled) * 100) : 0;

        return {
          hour: `${hour}:00`,
          actual,
          baseline,
          scheduled,
          commitmentRate,
          loadIndex,
          velocityIndex,
          label: h > 12 ? `${h-12} م` : h === 12 ? "12 م" : `${h} ص`
        };
      });

      // 5. كشف الشذوذ الذكي (Anomaly Detection)
      const detectedAnomalies = [];
      peakData.forEach(d => {
        // لو الزيادة عن المعتاد التاريخي > 30% أو انخفاض > 30%
        if (d.baseline >= 5) {
          if (d.actual > d.baseline * 1.3) {
            detectedAnomalies.push({ hour: d.label, type: 'spike', message: `🔥 ضغط غير معتاد الساعة ${d.label} (+${Math.round((d.actual/d.baseline - 1)*100)}% عن المعدل الأسبوعي)` });
          } else if (d.actual < d.baseline * 0.7) {
            detectedAnomalies.push({ hour: d.label, type: 'drop', message: `⚠️ انخفاض حضور الساعة ${d.label} (-${Math.round((1 - d.actual/d.baseline)*100)}% عن المعدل الأسبوعي)` });
          }
        }
        
        // تنبيه السرعة (Velocity Alert)
        if (d.velocityIndex > 15 && parseInt(d.hour) === currentHour) {
          detectedAnomalies.push({ hour: 'الآن', type: 'velocity', message: `⚡ موجة دخول سريعة رُصدت الآن (+${d.velocityIndex} طالب جديد) - استعد للتنظيم عند المداخل.` });
        }
      });

      setAnomalies(detectedAnomalies);
      setPeakHourData(peakData);

      // --- 🆕 Live Schedule Peek (Now & Next) ---
      // ملاحظة: نستخدم today و currentDay المعرفين سابقاً في حساب الرادار
      const currentTimeStr = today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const currentSess = [];
      const upcomingSess = [];

      schedule?.forEach(sched => {
        if (sched.day_of_week === currentDay) {
          if (currentTimeStr >= sched.start_time && currentTimeStr < sched.end_time) {
            currentSess.push(sched);
          } else if (sched.start_time > currentTimeStr) {
            upcomingSess.push(sched);
          }
        }
      });

      setLivePeeks({
        current: currentSess,
        upcoming: upcomingSess.sort((a,b) => a.start_time.localeCompare(b.start_time)).slice(0, 3)
      });

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
}

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen text-right relative" dir="rtl">
      
      {/* 🎟️ ويدجت حالة الاشتراك (SaaS Status) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Award size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الباقة الحالية</p>
            <p className="text-sm font-black text-slate-800">{centerData?.packages?.name || 'تحميل...'}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تاريخ الانتهاء</p>
            <p className={`text-sm font-black ${new Date(centerData?.subscription_end_date) < new Date() ? 'text-red-500' : 'text-slate-600'}`}>
              {centerData?.subscription_end_date ? new Date(centerData.subscription_end_date).toLocaleDateString('ar-EG') : 'مدى الحياة ♾️'}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${centerData?.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs font-black text-slate-500">{centerData?.is_active ? 'نشط' : 'موقوف'}</span>
          </div>
        </div>
      </div>
      
      {selectedStudentHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
               <button onClick={() => setSelectedStudentHistory(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X/></button>
               <h3 className="text-base md:text-xl font-black text-gray-800">سجل متأخرات: {selectedStudentHistory.name}</h3>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
               {selectedStudentHistory.history.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="text-left font-black text-red-600">{item.amount} ج</div>
                    <div className="text-right">
                       <p className="font-bold text-gray-800 text-sm">{item.topic}</p>
                       <p className="text-[10px] text-gray-500 flex items-center gap-1 justify-end"><Clock size={10}/> {item.date}</p>
                    </div>
                 </div>
               ))}
            </div>
            <button onClick={() => setSelectedStudentHistory(null)} className="w-full mt-4 md:mt-6 bg-gray-900 text-white py-3 min-h-[44px] rounded-xl font-bold hover:bg-black transition-all text-sm md:text-base">إغلاق</button>
          </div>
        </div>
      )}

      {/* 🧠 2. إضافة المحلل الذكي العربي هنا 🔥 */}
    <div className={`mb-4 md:mb-6 lg:mb-8 p-3 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all duration-500 relative hover:z-[50] ${
      getAINarrative(stats).mood === 'danger' ? 'bg-red-50 border-red-200' :
      getAINarrative(stats).mood === 'warning' ? 'bg-orange-50 border-orange-200' :
      'bg-emerald-50 border-emerald-200'
    }`}>
      <div className="flex items-start gap-3 md:gap-4">
        <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${
          getAINarrative(stats).mood === 'danger' ? 'bg-red-500' :
          getAINarrative(stats).mood === 'warning' ? 'bg-orange-500' :
          'bg-emerald-500'
        } text-white shadow-lg animate-pulse`}>
          <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm md:text-lg font-black text-gray-800 flex items-center gap-1 md:gap-2 mb-1 flex-wrap">
            تقرير الذكاء الاصطناعي الصباحي
            <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full text-gray-500 font-bold border border-gray-100 uppercase">AI Advisor</span>
            <div className="group/ai-info relative inline-block">
              <Info size={14} className="text-gray-300 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/ai-info:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center font-bold">
                دي "كبسولة الصباح" الذكية. المحلل الآلي بيبص على كل أرقامك (فلوس، غياب، مدرسين) وبيديك ملخص سريع بالوضع النهاردة ونصيحة تركز على إيه عشان تكبر السنتر.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
              </div>
            </div>
          </h3>
          <p className="text-sm md:text-lg text-gray-700 font-bold leading-relaxed">
            {getAINarrative(stats).message}
          </p>
        </div>
      </div>
    </div>

    <CenterHealthWidget stats={stats} centerId={centerId} />

    {/* 🆕 مراقب الحصص المباشر (Now & Next) */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
       {/* 🟢 الحصص الجارية الآن */}
       <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm relative group hover:z-[50]">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-[4rem] -mr-6 -mt-6 transition-all group-hover:scale-150 group-hover:bg-emerald-100"></div>
          <div className="flex justify-between items-center mb-4 relative z-10">
             <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                الحصص الجارية الآن
                <div className="group/now-info relative">
                  <Info size={14} className="text-gray-300 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/now-info:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center font-bold">
                    دي المجموعات اللي المفروض تكون موجودة جوه القاعات دلوقتي بناءً على الجدول. بتساعدك تتابع حركة المدرسين والقاعات لحظة بلحظة.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
                  </div>
                </div>
             </div>
             <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md uppercase">Live Now</div>
          </div>
          <div className="space-y-3 relative z-10">
             {livePeeks.current.length > 0 ? livePeeks.current.map((sess, idx) => (
                <div key={idx} className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                   <div className="text-left">
                      <p className="text-[10px] text-emerald-600 font-black">قاعة: {sess.rooms?.name || 'غير معروفة'}</p>
                      <p className="text-xs font-bold text-gray-500">{formatTime12(sess.start_time)} - {formatTime12(sess.end_time)}</p>
                   </div>
                   <div className="text-right">
                      <h4 className="font-black text-gray-800 text-sm">
                        {sess.groups?.courses?.name} 
                        <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-lg text-blue-500 mr-2 border border-blue-50">
                          {sess.groups?.courses?.grade}
                        </span>
                      </h4>
                      <p className="text-[10px] text-gray-500 font-bold">أ/ {sess.groups?.courses?.instructors?.name || sess.groups?.courses?.instructor || 'غير محدد'}</p>
                   </div>
                </div>
             )) : (
                <div className="py-4 text-center text-gray-400 text-xs font-bold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   لا توجد حصص جارية في هذا الوقت ☕
                </div>
             )}
          </div>
       </div>

       {/* 🟡 الحصص القادمة */}
       <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-sm relative group hover:z-[50]">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-[4rem] -mr-6 -mt-6 transition-all group-hover:scale-150 group-hover:bg-blue-100"></div>
          <div className="flex justify-between items-center mb-4 relative z-10">
             <div className="flex items-center gap-2 text-blue-600 font-black text-sm">
                <Clock size={16} />
                الحصص القادمة (اليوم)
                <div className="group/next-info relative">
                  <Info size={14} className="text-gray-300 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/next-info:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center font-bold">
                    المجموعات اللي عليها الدور النهاردة. عشان تجهز نفسك وتوجه الموظفين والطلاب للقاعات الصح قبل ما الزحمة تبدأ.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
                  </div>
                </div>
             </div>
             <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md uppercase">Up Next</div>
          </div>
          <div className="space-y-3 relative z-10">
             {livePeeks.upcoming.length > 0 ? livePeeks.upcoming.map((sess, idx) => (
                <div key={idx} className="flex justify-between items-center bg-blue-50/30 p-3 rounded-2xl border border-blue-100/30">
                   <div className="text-left">
                      <p className="text-[10px] text-blue-600 font-black">تبدأ: {formatTime12(sess.start_time)}</p>
                      <p className="text-xs font-bold text-gray-400">قاعة: {sess.rooms?.name || 'غير معروفة'}</p>
                   </div>
                   <div className="text-right">
                      <h4 className="font-black text-gray-800 text-sm">
                        {sess.groups?.courses?.name}
                        <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-lg text-blue-400 mr-2 border border-blue-50">
                          {sess.groups?.courses?.grade}
                        </span>
                      </h4>
                      <p className="text-[10px] text-gray-500 font-bold">أ/ {sess.groups?.courses?.instructors?.name || sess.groups?.courses?.instructor || 'غير محدد'}</p>
                   </div>
                </div>
             )) : (
                <div className="py-4 text-center text-gray-400 text-xs font-bold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   لا توجد حصص متبقية لليوم ✨
                </div>
             )}
          </div>
       </div>
    </div>

    {/* 📡 نبض السنتر (Live Pulse) */}
    <div className="mb-6 bg-white rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm relative group hover:z-[50]">
      <div className="flex justify-between items-center mb-4">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-cyan-600">
               <Activity className="w-5 h-5 animate-pulse" />
               <h3 className="font-black text-sm md:text-lg">نبض السنتر (الآن)</h3>
               <div className="group/pulse-info relative">
                 <Info size={14} className="text-gray-300 cursor-help" />
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/pulse-info:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center font-bold">
                   تحديث لحظي لكل اللي بيحصل في السنتر دلوقتي. أي خصم مالي، أي حضور طالب، أو حتى تسجيل غياب بيظهر هنا فوراً بالدقيقة والثانية.
                   <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
                 </div>
               </div>
            </div>
            <button 
              onClick={() => addActivity('تجربة: تم رصد حركة ذكية في السنتر الآن ✨', 'success')}
              className="text-[10px] bg-white border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 active:scale-95 transition-all text-gray-500 font-bold"
            >
              اختبار النبض الذكي
            </button>
         </div>
         <div className="text-[10px] bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded-full font-bold border border-cyan-100">Live Update</div>
      </div>
      
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {activities.map((act) => (
            <motion.div
              key={act.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="flex items-center justify-between p-2.5 bg-gray-50/30 rounded-xl border border-transparent hover:border-gray-100 transition-colors group/item"
            >
               <span className="text-[9px] text-gray-300 font-mono group-hover/item:text-gray-400 transition-colors">{act.time}</span>
               <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-gray-500 group-hover/item:text-gray-700 transition-colors">
                      {act.text}
                      {act.count > 1 && <span className="mr-2 bg-cyan-100 text-cyan-600 px-1.5 py-0.5 rounded-md text-[9px]">({act.count} مرات)</span>}
                    </span>
                  </div>
                  <div className={`w-1 h-1 rounded-full ${
                    act.type === 'success' ? 'bg-emerald-400' : 
                    act.type === 'warning' ? 'bg-orange-400' : 
                    'bg-blue-400'
                  }`} />
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {activities.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-xs font-bold">جاري مراقبة نبض السنتر...</div>
        )}
      </div>
    </div>

      {/* 1. KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8 lg:mb-10">
  {/* 1. كارت صافي الدخل (قبل المصاريف) */}
  <StatCard 
    title="صافي دخل السنتر" 
    value={`${stats.totalRevenue.toLocaleString()} ج.م`} 
    icon={<TrendingUp/>} 
    color="bg-emerald-500" 
    description="مجموع كل المبالغ اللي دخلت الخزنة فعلياً من الحصص والاشتراكات."
  />

  {/* 2. كارت الخزنة (بعد المصاريف) */}
  <StatCard 
    title="رصيد الخزنة الحالي" 
    value={`${stats.liveBalance?.toLocaleString()} ج.م`} 
    icon={<Activity/>} 
    color={stats.liveBalance >= 0 ? "bg-teal-600" : "bg-red-600 animate-bounce"} 
    description="المبلغ الموجود حالياً في الدرج بعد خصم المصروفات المسجلة."
  />
        <StatCard 
          title="إجمالي المديونيات" 
          value={`${stats.totalDebt.toLocaleString()} ج.م`} 
          icon={<AlertCircle/>} 
          color="bg-red-500" 
          description="ديون الطلاب (فرق الثمن المطلوب والحاصل فعلياً)."
        />
        <div className="relative group">
  <StatCard 
    title="إجمالي قيمة الحصص" 
    value={`${stats.totalRequired?.toLocaleString() || 0} ج.م`} 
    icon={<Calculator/>} 
    color="bg-blue-600" 
    description="مجموع (الفلوس اللي دخلت + الديون اللي لسه برة) بناءً على الحصص اللي تمت فعلاً."
  />
  
  {/* 🔴 كارت فجوة التحصيل الصغير */}
  {stats.gapPercentage > 0 && (
    <div className="absolute -bottom-2 right-4 bg-red-100 border border-red-200 px-2 py-1 rounded-lg flex items-center gap-1 animate-bounce shadow-sm">
      <TrendingDown size={12} className="text-red-600" />
      <span className="text-[10px] font-black text-red-700">
        فجوة: {stats.gapPercentage}% (-{stats.revenueGap.toLocaleString()} ج)
      </span>
    </div>
  )}
</div>
        <StatCard 
          title="الطلاب النشطين" 
          value={stats.activeStudents} 
          icon={<Users/>} 
          color="bg-blue-500" 
          description="عدد الطلاب المسجلين بالسنتر كطلاب منتظمين."
        />
        <StatCard 
          title="متأخرين عن السداد" 
          value={stats.lateStudents} 
          icon={<Award/>} 
          color="bg-orange-500" 
          description="عدد الطلاب اللي عليهم أي مبلغ دين (مليم واحد أو أكتر)."
        />
        <StatCard 
            title="نسبة التحصيل" 
            value={`${stats.collectionRate}%`} 
            icon={<TrendingUp/>} 
            color={stats.collectionRate < 70 ? "bg-red-600 animate-pulse" : "bg-purple-500"} 
            description="كفاءة السكرتارية في لم الفلوس (المدفوع ÷ المطلوب)."
        />
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6 lg:mb-8">
        <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3 md:mb-6">
            <h3 className="text-sm md:text-lg font-bold flex items-center gap-2">📈 التحصيل مقابل المديونية (مع خط التوقع)</h3>
            <div className="group/info-chart relative">
              <Info size={14} className="text-gray-300 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/info-chart:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center">
                بيقارن بين <span className="text-emerald-400">الفلوس اللي دخلت</span> وبين <span className="text-red-400">الديون اللي لسه برا</span>. 
                الخط المقطع هو "متوسط الأداء" اللي بيعرفك إنت ماشي صح ولا محتاج تشد حيلك في التحصيل.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
          <div className="h-56 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${Math.round(value).toLocaleString()} ج.م`} />
                <Legend verticalAlign="top" height={36}/>
                <Line name="الدخل الفعلي" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} />
                <Line name="المديونية" type="monotone" dataKey="debt" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                <Line name="متوسط الأداء" type="monotone" dataKey="trend" stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3 md:mb-6">
            <h3 className="text-sm md:text-lg font-bold flex items-center gap-2">👨‍🏫 أداء المدرسين (دخل)</h3>
            <div className="group/info-teachers relative">
              <Info size={14} className="text-gray-300 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/info-teachers:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center">
                بيوضح <span className="text-blue-400">إجمالي دخل كل مدرس</span> مقابل <span className="text-purple-400">صافي ربح السنتر</span> منه. 
                بيساعدك تعرف مين المدرسين اللي "شايلين السنتر" ومين محتاج دعم وتنشيط.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
          <div className="h-56 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTeachers.length > 0 ? topTeachers : chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} ج.م`} />
                <Bar name="إجمالي الدخل" dataKey="income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="صافي ربح السنتر" dataKey="profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🆕 رادار ساعات الذروة (Peak Hour Radar) */}
      <div className="mb-6 md:mb-8">
        <div className="bg-white p-4 md:p-8 rounded-[2.5rem] shadow-xl border border-gray-100 relative group">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 opacity-20"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-inner">
                   <Activity size={24} className="animate-pulse" />
                 </div>
                 <div>
                   <div className="flex items-center gap-2">
                     <h3 className="text-xl font-black text-slate-800 tracking-tight">الرادار الذكي (حالة السنتر)</h3>
                     <div className="group/rad relative">
                        <HelpCircle size={14} className="text-gray-300 cursor-help" />
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 bg-gray-900 text-white text-[11px] rounded-2xl opacity-0 group-hover/rad:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center font-bold">
                          رادار ذكي يحلل <span className="text-blue-400">الازدحام اللحظي</span> بناءً على <span className="text-purple-400">تاريخ السنتر</span> وليس مجرد نسب ثابتة.
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-gray-900" />
                        </div>
                     </div>
                   </div>
                   <p className="text-xs text-gray-400 font-bold font-arabic">وضع التشغيل الحالي: {operatingMode === 'conservative' ? 'محافظ (Conservative)' : operatingMode === 'aggressive' ? 'جريء (Aggressive)' : 'متوازن (Balanced)'}</p>
                 </div>
              </div>

              <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 w-fit">
                {['conservative', 'balanced', 'aggressive'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setOperatingMode(mode)}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${operatingMode === mode ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {mode === 'conservative' ? 'حذر' : mode === 'aggressive' ? 'مكثف' : 'افتراضي'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
               <div className="flex-1 min-w-[140px] bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">🔥 ذروة اليوم</p>
                  <p className="text-xs font-black text-slate-700">
                    { peakHourData.length > 0 ? [...peakHourData].sort((a,b) => b.loadIndex - a.loadIndex)[0]?.label : '...' }
                    <span className="text-[10px] text-red-500 mr-1">
                       ({ peakHourData.length > 0 ? [...peakHourData].sort((a,b) => b.loadIndex - a.loadIndex)[0]?.loadIndex : 0 }%)
                    </span>
                  </p>
               </div>
               <div className="flex-1 min-w-[140px] bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">😴 أهدأ فترة</p>
                  <p className="text-xs font-black text-emerald-700">
                    { peakHourData.length > 0 ? [...peakHourData].filter(d => d.loadIndex > 0).sort((a,b) => a.loadIndex - b.loadIndex)[0]?.label || 'صباحاً' : '...' }
                  </p>
               </div>
               {anomalies.length > 0 && (
                  <div className="flex-1 min-w-[200px] bg-red-50 p-3 rounded-2xl border border-red-100 animate-pulse">
                     <p className="text-[9px] font-black text-red-400 uppercase mb-1">⚠️ تنبيه شذوذ</p>
                     <p className="text-[10px] font-bold text-red-700 leading-tight">{anomalies[0].message}</p>
                  </div>
               )}
            </div>
          </div>

          <div className="mb-8 grid grid-cols-5 md:grid-cols-15 gap-1.5 h-12">
             {peakHourData.map((hr, idx) => {
                // منطق هجين: حدود أمان ثابتة + مقارنة تاريخية
                const isAboveBase = hr.baseline > 0 && hr.actual > hr.baseline * 1.2;
                
                // تعريف الـ Thresholds بناءً على وضع التشغيل
                const thresholds = {
                  conservative: { danger: 90, peak: 75, normal: 50 },
                  balanced: { danger: 95, peak: 85, normal: 60 },
                  aggressive: { danger: 105, peak: 95, normal: 75 }
                }[operatingMode];

                const getBoxColor = () => {
                  if (hr.loadIndex >= thresholds.danger) return 'bg-slate-900 border-slate-900 shadow-lg';
                  if (hr.loadIndex >= thresholds.peak || isAboveBase) return 'bg-red-500 border-red-600';
                  if (hr.loadIndex >= thresholds.normal) return 'bg-amber-400 border-amber-500';
                  if (hr.loadIndex > 0) return 'bg-emerald-400 border-emerald-500';
                  return 'bg-gray-100 border-gray-100';
                };

                return (
                  <div 
                    key={idx} 
                    className={`relative group/hm rounded-lg transition-all border ${getBoxColor()}`}
                  >
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 text-white text-[8px] rounded opacity-0 group-hover/hm:opacity-100 pointer-events-none z-10 font-bold">
                        {hr.label}: {hr.loadIndex}% سعة {isAboveBase ? '(فوق المعتاد)' : ''}
                     </div>
                  </div>
                );
             })}
          </div>
          
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHourData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const getStatusText = (rate) => {
                         if (rate >= 110) return { t: 'ضغط زائد 🔥', c: 'text-orange-600' };
                         if (rate >= 90) return { t: 'طبيعي ✅', c: 'text-emerald-600' };
                         return { t: 'تأخر حضور ⚠️', c: 'text-amber-600' };
                      };
                      
                      const histRel = d.baseline > 0 ? Math.round((d.actual / d.baseline) * 100) : 100;

                      return (
                        <div className="bg-white/95 backdrop-blur-md p-4 shadow-2xl rounded-[1.5rem] border border-gray-100 text-right min-w-[200px]">
                          <p className="text-[10px] text-gray-400 font-black mb-3 border-b pb-2 flex justify-between items-center">
                             <span>الساعة {d.label}</span>
                             {d.velocityIndex > 10 && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[8px] animate-pulse">موجة دخول ⚡</span>}
                          </p>
                          <div className="space-y-3">
                             <div>
                                <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">الضغط النسبي (تاريخي)</p>
                                <div className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded-xl">
                                   <span className={`text-[10px] font-black ${histRel > 120 ? 'text-red-600' : histRel > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {histRel > 120 ? 'أعلى من المعتاد' : histRel > 80 ? 'معدل طبيعي' : 'أهدأ من المعتاد'}
                                   </span>
                                   <span className="text-xs font-black">{histRel}%</span>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-2 text-center pt-2">
                                <div className="bg-blue-50/50 p-2 rounded-xl">
                                   <p className="text-[8px] text-blue-400 font-bold">حضور اليوم</p>
                                   <p className="text-xs font-black text-blue-600">{d.actual}</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl">
                                   <p className="text-[8px] text-slate-400 font-bold">المتوسط (Baseline)</p>
                                   <p className="text-xs font-black text-slate-500">{d.baseline}</p>
                                </div>
                             </div>
                             {d.velocityIndex > 5 && (
                                <p className="text-[8px] text-orange-500 font-bold text-center">
                                   + {d.velocityIndex} طلاب دخلوا خلال الساعة الماضية
                                </p>
                             )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                 <Bar name="حضور اليوم" dataKey="actual" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={30} animationDuration={2000} />
                 <Bar name="المعدل المعتاد (Baseline)" dataKey="baseline" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={20} animationDuration={2200} />
                 <Bar name="السعة المخططة (الجدول)" dataKey="scheduled" fill="#f1f5f9" radius={[6, 6, 0, 0]} barSize={15} animationDuration={2500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 items-start">
                 <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm"><TrendingDown size={14}/></div>
                 <div>
                    <p className="text-xs font-black text-emerald-800 mb-1">توقع وسعة تشغيلية</p>
                    <p className="text-[10px] text-emerald-600 font-bold leading-relaxed">
                       { peakHourData.filter(d => d.loadIndex < 60 && d.hour > "10:00").length > 0 ? 
                         `يتوفر مساحات هادئة الساعة ${peakHourData.filter(d => d.loadIndex < 60 && d.hour > "10:00")[0].label}. ينصح بنقل حصص التعويضي لهذه الفترة.` :
                         'الجدول ممتلئ بكثافة اليوم. يفضل زيادة عدد موظفي الأمن عند المداخل.' }
                    </p>
                 </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 items-start">
                 <div className="p-2 bg-blue-500 text-white rounded-lg shadow-sm"><Info size={14}/></div>
                 <div>
                    <p className="text-xs font-black text-blue-800 mb-1">نصيحة تشغيلية</p>
                    <p className="text-[10px] text-blue-600 font-bold leading-relaxed">
                       بناءً على ذروة الـ {peakHourData.length > 0 ? [...peakHourData].sort((a,b) => b.loadIndex - a.loadIndex)[0]?.loadIndex : 0}% المتوقعة، يفضل مراجعة كفاءة التكييف في القاعات الرئيسية.
                    </p>
                 </div>
              </div>
          </div>
        </div>
      </div>

      {/* 3. High Risk Section & Reorganized Flow */}
      <div className="grid grid-cols-1 gap-6">
        {/* أ) طلاب يحتاجون متابعة مالية */}
        <div className="bg-white rounded-2xl shadow-sm p-3 md:p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <h3 className="text-sm md:text-lg font-bold flex items-center gap-2 text-red-600">
              <AlertCircle size={20}/> طلاب يحتاجون متابعة مالية
            </h3>
            <div className="group/info-risk relative">
              <HelpCircle size={14} className="text-gray-300 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/info-risk:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center">
                دي "قائمة التحصيل المستعجلة". بيظهر فيها الطلاب اللي سحبوا حصص ومسددوش، مع علامة تنبيه <span className="text-red-400">(!)</span> للديون اللي بدأت تبقى خطيرة ومحتاجة مكالمة تليفون فوراً.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
             {debtorStudents.length > 0 ? (
               <table className="w-full text-xs md:text-sm text-right">
                  <thead>
                    <tr className="border-b text-gray-400">
                      <th className="pb-3 pr-2 font-bold whitespace-nowrap text-xs md:text-sm">الطالب / عدد الحصص</th>
                      <th className="pb-3 text-center font-bold whitespace-nowrap text-xs md:text-sm">المبلغ</th>
                      <th className="pb-3 pl-2 text-left font-bold whitespace-nowrap text-xs md:text-sm">إجراء</th>
                    </tr>
                  </thead>
                 <tbody>
                    {debtorStudents.map((st, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-4 pr-2 whitespace-nowrap">
                           <div className="flex items-center gap-2">
                             {st.isHighRisk && (
                                 <span className="p-1 bg-red-100 text-red-600 rounded-full animate-pulse" title="مديونية خطيرة">
                                     <AlertCircle size={12}/>
                                 </span>
                             )}
                             <div onClick={() => setSelectedStudentHistory(st)} className={`font-bold cursor-pointer hover:text-blue-600 transition-colors text-sm md:text-base ${st.isHighRisk ? 'text-red-700' : 'text-gray-800'}`}>
                                 {st.name}
                             </div>
                           </div>
                           <div className="text-[10px] md:text-xs text-gray-400 font-bold uppercase underline cursor-pointer" onClick={() => setSelectedStudentHistory(st)}>عرض سجل {st.sessionCount} حصص متأخرة</div>
                        </td>
                        <td className="py-3 md:py-4 text-center text-red-600 font-black whitespace-nowrap text-sm md:text-lg">{st.amount.toLocaleString()} ج</td>
                        <td className="py-3 md:py-4 text-left whitespace-nowrap">
                          <div className="flex justify-end gap-2 md:gap-3 px-1 md:px-2">
                             <a href={`tel:${st.phone}`} className="p-3 md:p-2 min-w-[44px] min-h-[44px] bg-blue-50 text-blue-600 rounded-lg transition-transform active:scale-90 flex items-center justify-center" title="اتصال هاتف"><Phone size={16}/></a>
                             <button onClick={() => clearStudentDebt(st)} className="p-3 md:p-2 min-w-[44px] min-h-[44px] bg-orange-50 text-orange-600 rounded-lg transition-transform active:scale-90 hover:bg-orange-100 flex items-center justify-center" title="تصفير مديونية الطالب"><Eraser size={16}/></button>
                             <button onClick={() => sendWhatsAppReminder(st)} className="p-3 md:p-2 min-w-[44px] min-h-[44px] bg-green-50 text-green-600 rounded-lg transition-transform active:scale-90 hover:bg-green-100 flex items-center justify-center" title="إرسال واتساب"><MessageCircle size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             ) : (
               <div className="text-center py-6 md:py-10">
                 <p className="text-green-500 font-bold text-sm md:text-lg">لا توجد مديونيات متأخرة حالياً 🎉</p>
                 <p className="text-gray-400 text-xs">جميع الطلاب سددوا مستحقاتهم بالكامل</p>
               </div>
             )}
          </div>
        </div>

        {/* ب) لوحة تميز المعلمين (العرض الكامل) */}
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl">
                  <Award size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-gray-800">لوحة تميز المعلمين (Insights)</h3>
                    <div className="group/matrix-info relative">
                      <HelpCircle size={16} className="text-gray-300 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/matrix-info:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center font-bold">
                        رادار المدرسين: بنقيم فيه المدرس بناءً على <span className="text-blue-400">قوة تحصيل فلوسه</span> و <span className="text-emerald-400">ثبات حضور طلابه (Retention)</span>. المدرس الناجح مش بس اللي بيدخل فلوس، هو اللي بيعرف يحافظ على طلابه للنهاية.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">ترتيب المدرسين حسب القوة الشرائية وربح المكان</p>
                </div>
              </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topTeachers.length > 0 ? topTeachers.map((teacher, index) => (
              <TeacherRank 
                key={index}
                name={`أ/ ${teacher.name}`} 
                income={teacher.income.toLocaleString()} 
                rank={index + 1} 
                collectionRate={teacher.collectionRate}
                attendanceStrength={teacher.attendanceStrength}
              />
            )) : (
              <p className="text-center text-gray-400 text-sm py-4 col-span-full">لا توجد بيانات كافية للتحليل</p>
            )}
          </div>
        </div>
      </div>

      {/* 📡 رادار الإنذار المبكر (AI Insights) */}
      <div className="bg-white rounded-2xl shadow-lg p-3 md:p-6 border-t-4 border-orange-500 mt-4 md:mt-6 lg:mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 md:mb-6">
    <div className="flex items-center gap-2 text-orange-600">
      <Activity className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
      <h3 className="text-base md:text-xl font-black">رادار المخاطر (توقع الغياب)</h3>
      <div className="group/risk-info relative">
        <Info size={16} className="text-gray-300 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/risk-info:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center font-bold">
          نظام تنبؤ ذكي: بيمسح سلوك الطلاب (دفع، حضور، غياب مفاجئ) وبيعرفك مين "على وشك التسرب" قبل ما يبطل يحضر فعلاً. دي فرصتك تلحق الطالب بمكالمة تليفون قبل ما يضيع من السنتر.
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
    <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded-lg font-bold">تحليل سلوكي لحظي</span>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
    {atRiskStudents.length > 0 ? atRiskStudents.map((st, i) => (
      <div key={i} className="bg-gray-50 rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
        {/* مؤشر النسبة */}
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
        
        <div className="flex justify-between items-start mb-3">
          <div className="text-left">
            <span className="text-lg">
       {st.risk.score >= 70 ? '🚨' : st.risk.score >= 40 ? '😐' : '😄'}
        </span>
          </div>
          <div className="text-right">
            <h4 className="font-black text-gray-800">{st.name}</h4>
            <p className="text-[10px] text-gray-400 font-bold">آخر ظهور: {st.lastSession}</p>
          </div>
        </div>

        <div className="space-y-1 mb-4">
          {st.risk.reasons.map((reason, idx) => (
            <p key={idx} className="text-[10px] text-gray-600 flex items-center gap-1 justify-end">
              {reason} <AlertTriangle size={10} className="text-orange-400" />
            </p>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
           <a href={`tel:${st.phone}`} className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
             <Phone size={16}/> اتصال
           </a>
           <button onClick={() => sendWhatsAppReminder(st)} className="flex-1 bg-green-500 text-white py-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-transform active:scale-95">
             <MessageCircle size={16}/> واتساب
           </button>
        </div>
      </div>
    )) : (
      <div className="col-span-full py-10 text-center bg-green-50 rounded-2xl border border-green-100">
        <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
        <p className="text-green-700 font-bold">جميع الطلاب منتظمون سلوكياً ومالياً</p>
      </div>
    )}
  </div>
</div>
    </div>
  );
}

function StatCard({ title, value, icon, color, description }) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 md:gap-4 transition-all hover:shadow-lg hover:-translate-y-1 group relative hover:z-[50]">
      <div className={`p-2.5 md:p-3 w-fit rounded-xl text-white transition-all duration-300 shadow-md group-hover:scale-110 ${color}`}>{icon}</div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-gray-500 text-xs md:text-sm font-bold">{title}</p>
          {description && (
            <div className="group/info relative">
              <HelpCircle size={12} className="text-gray-300 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 bg-gray-900 text-white text-[11px] rounded-xl opacity-0 group-hover/info:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed translate-y-2 group-hover/info:translate-y-0 text-center">
                 {description}
                 <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
              </div>
            </div>
          )}
        </div>
        <h4 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">{value}</h4>
      </div>
    </div>
  );
}

function TeacherRank({ name, income, rank, collectionRate, attendanceStrength }) {
  const colors = ["from-yellow-400 to-orange-500", "from-slate-300 to-slate-500", "from-orange-400 to-red-600"];
  const badge = rank === 1 ? "نجم السنتر ⭐" : rank === 2 ? "المميز 🥈" : "المجتهد 🥉";

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="relative p-6 bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden group transition-all"
    >
      {/* Background Glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${colors[rank-1] || 'from-blue-400 to-indigo-600'} opacity-[0.03] rounded-full blur-3xl group-hover:opacity-10 transition-opacity`} />
      
      <div className="flex justify-between items-start mb-6">
        <div className={`px-3 py-1 bg-gradient-to-r ${colors[rank-1] || 'from-blue-500 to-indigo-600'} text-white text-[10px] font-bold rounded-full shadow-lg`}>
          {badge}
        </div>
        <div className="text-left">
          <span className="text-2xl font-black text-gray-800">{income} <span className="text-xs text-gray-400 font-bold">ج.م</span></span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center font-black text-xl text-gray-400 border border-gray-100 uppercase">
          {name.split(' ')[1]?.substring(0, 2) || 'TR'}
        </div>
        <div className="text-right">
          <h4 className="font-black text-gray-800 text-lg">{name}</h4>
          <p className="text-[10px] text-gray-400 font-bold">إجمالي دخل المدرس</p>
        </div>
      </div>

      <div className="space-y-4 text-[11px] font-black text-gray-600">
        <div>
          <div className="flex justify-between mb-1">
            <span>{collectionRate}%</span>
            <span>كفاءة التحصيل</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${collectionRate}%` }} className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span>{attendanceStrength}%</span>
            <span>قوة الحضور (Retention)</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${attendanceStrength}%` }} className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ... (دالة TeacherRank اللي عندك فوق زي ما هي) ...

// 👇👇 انسخ الكود ده وحطه في آخر الملف تحت TeacherRank 👇👇

function CenterHealthWidget({ stats, centerId }) {
  const [score, setScore] = useState(100);
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState([]);

  useEffect(() => {
    // ننتظر حتى تتوفر الإحصائيات الأساسية و centerId لحساب المؤشر
    if (stats.totalRevenue !== undefined && centerId) {
      calculateHealth();
    }
  }, [stats, centerId]);

const calculateHealth = async () => {
    // التحقق من وجود centerId قبل تنفيذ أي استعلامات
    if (!centerId) {
      console.error('❌ No centerId found in calculateHealth - skipping execution');
      setLoading(false);
      return;
    }

    // ✅ Guard: '00000000-0000-0000-0000-000000000001' is a placeholder UUID
    // set by the settings recovery tool when no real center exists.
    // Querying Supabase with this UUID causes 502 + CORS errors because
    // no row exists in the centers table for it.
    const RESERVED_CENTER_ID = '00000000-0000-0000-0000-000000000001';
    if (centerId === RESERVED_CENTER_ID) {
      console.warn('⚠️ CenterHealthWidget: placeholder centerId detected — skipping DB queries.');
      setScore(0);
      setRisks([{ label: 'لم يتم ربط الحساب بسنتر حقيقي. يرجى التواصل مع الإدارة.', type: 'critical' }]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let currentScore = 100;
    let detectedRisks = [];

    // =========================================================
    // 1️⃣ التحليل المالي (النسخة الصارمة جداً 🔥)
    // =========================================================

    // أ) خصم فوري لأي مديونية (حتى لو جنيه واحد)
    if (stats.totalDebt > 0) {
      // لو الديون مبلغ كبير (فوق 1000) اخصم 25 درجة
      // لو مبلغ بسيط (تحت 1000) اخصم 15 درجة
      const debtPenalty = stats.totalDebt > 1000 ? 25 : 15;
      
      currentScore -= debtPenalty;
      
      detectedRisks.push({ 
        label: `يوجد ديون معلقة (${stats.totalDebt.toLocaleString()} ج)`, 
        type: 'financial_warning' 
      });
    }

    // ب) خصم لو نسبة التحصيل مش مثالية (أقل من 95%)
    // (الكود القديم كان بيخصم لو أقل من 70% بس، وده تسيب)
    if (stats.collectionRate < 95) {
      const collectionPenalty = 10; // خصم ثابت 10 درجات
      currentScore -= collectionPenalty;
      
      detectedRisks.push({ 
         label: `نسبة التحصيل ${stats.collectionRate}% (أقل من المستهدف 95%)`, 
         type: 'warning' 
      });
    }

    // =========================================================
    // 2️⃣ التحليل الأمني (Audit Logs) - استثناء الأدمنز
    // =========================================================
    try {
      const { data: adminUsers } = await supabase
        .from("staff_profiles") 
        .select('email')
        .eq('role', 'admin')
        .eq('center_id', centerId); // ← فلترة حسب المركز

      const adminEmails = adminUsers?.map(u => u.email) || [];

      let auditQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq('action', 'DELETE')
        .eq('center_id', centerId); // ← فلترة حسب المركز

      if (adminEmails.length > 0) {
        const emailsString = `(${adminEmails.map(e => `"${e}"`).join(',')})`;
        auditQuery = auditQuery.filter('performed_by', 'not.in', emailsString);
      }

      const { count: criticalCount } = await auditQuery;

      if (criticalCount && criticalCount > 0) {
        currentScore -= (criticalCount * 10);
        detectedRisks.push({ 
          label: `تنبيه أمني: تم رصد ${criticalCount} عمليات حذف بواسطة موظفين`, 
          type: 'critical' 
        });
      }
    } catch (e) { console.error('Audit Check Failed', e); }

    // =========================================================
    // 3️⃣ تحليل المخزون (Stock) - تجاهل المؤرشف
    // =========================================================
    try {
      const { count: outOfStock } = await supabase
        .from('store_products')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 2)
        .eq('is_archived', false)
        .eq('center_id', centerId); // ← فلترة حسب المركز 

      if (outOfStock && outOfStock > 0) {
        currentScore -= 5;
        detectedRisks.push({ label: `يوجد ${outOfStock} منتجات نشطة توشك على النفاذ`, type: 'stock' });
      }
    } catch (e) { console.error('Stock Check Failed', e); }

    // ضبط النتيجة النهائية
    const finalScore = Math.max(0, currentScore);
    setScore(finalScore);
    setRisks(detectedRisks);
    setLoading(false);
  };

  const getColor = () => {
    if (score >= 85) return 'text-green-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const getBarColor = () => {
    if (score >= 85) return 'bg-green-500 shadow-green-200';
    if (score >= 60) return 'bg-orange-500 shadow-orange-200';
    return 'bg-red-500 shadow-red-200';
  };

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100 relative group mb-4 md:mb-6 lg:mb-8 hover:z-[50]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 relative z-10">
        
        {/* الجزء الأيمن: العناوين */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-xl bg-gray-50 ${getColor()}`}>
              <Activity size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-xl font-black text-gray-800">مؤشر صحة السنتر</h2>
                <div className="group/health-info relative">
                   <HelpCircle size={16} className="text-gray-300 cursor-help" />
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-4 bg-gray-900 text-white text-[11px] rounded-xl opacity-0 group-hover/health-info:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed text-center font-bold">
                      دي "الدرجة النهائية" لإدارة سنترك. لو الدرجة نقصت، بص على المشاكل (الديون، نقص المخزون، أو حركات حذف مريبة) وحلها عشان السنتر يرجع 100% صحي.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-gray-900" />
                   </div>
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-gray-400 font-bold">تحليل فوري للأداء المالي، الأمني، والتشغيلي</p>
            </div>
          </div>
          
          {/* المخاطر */}
          <div className="space-y-2 mt-4">
            {loading ? (
              <p className="text-xs text-gray-400 animate-pulse">جاري تحليل البيانات...</p>
            ) : risks.length > 0 ? (
              risks.map((risk, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-bold bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-100 animate-in slide-in-from-right duration-500" style={{animationDelay: `${idx * 100}ms`}}>
                  {risk.type === 'critical' ? <Skull size={14}/> : <AlertTriangle size={14}/>}
                  {risk.label}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-100">
                <CheckCircle size={14}/> الحالة ممتازة! النظام مستقر تماماً.
              </div>
            )}
          </div>
        </div>

        {/* الجزء الأيسر: العداد */}
        <div className="flex flex-col items-center justify-center w-full md:w-auto min-w-[150px] bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-2xl">
          <div className={`text-6xl md:text-7xl font-black ${getColor()} drop-shadow-sm transition-all duration-1000`}>
            {loading ? '...' : score}
            <span className="text-lg text-gray-300 font-bold">/100</span>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full mt-4 overflow-hidden shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${getBarColor()}`} 
              style={{ width: `${score}%` }}
            ></div>
          </div>
          <p className="text-xs md:text-sm text-gray-400 mt-3 font-bold">
            {score >= 85 ? 'أداء ممتاز 🚀' : score >= 60 ? 'يحتاج انتباه ⚠️' : 'وضع خطر 🚨'}
          </p>
        </div>
      </div>

      {/* خلفية جمالية */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${score >= 85 ? 'via-green-500' : 'via-red-500'} to-transparent opacity-20`}></div>
    </div>
  );
}

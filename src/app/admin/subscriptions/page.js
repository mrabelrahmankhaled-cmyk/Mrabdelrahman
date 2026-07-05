'use client';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { 
  FaCalendarAlt, FaUserGraduate, FaCheckCircle, FaTimesCircle, 
  FaFilter, FaSearch, FaMoneyCheckAlt, FaFileExcel, FaLock, FaWhatsapp 
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function SubscriptionsPage() {
  const { centerId, allowedFeatures, loading: authLoading } = useAuth();
  
  // States
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [students, setStudents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]); // List of paid subs for selected month/course
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentAmounts, setPaymentAmounts] = useState({}); // Tracking manual amount inputs student_id -> amount
  const [bulkAmounts, setBulkAmounts] = useState({}); // 🆕 Tracking bulk amount inputs student_id -> total
  const [paymentNotes, setPaymentNotes] = useState({}); // 🆕 Tracking notes inputs student_id -> note
  const [centerSettings, setCenterSettings] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'unpaid'
  const [lastSessions, setLastSessions] = useState({}); // student_id -> last_session_date
  const [selectedGrade, setSelectedGrade] = useState(''); // 🆕 فلتر الصف الدراسي
  const [isPartialPayment, setIsPartialPayment] = useState({}); // student_id -> boolean
  const [editingStudentId, setEditingStudentId] = useState(null); // student_id being updated

  // 1. Fetch Initial Data
  useEffect(() => {
    if (centerId) {
      fetchCourses();
    }
  }, [centerId]);

  // 2. Refetch students and subs when filters change
  useEffect(() => {
    if (centerId && selectedCourse && selectedMonth) {
      fetchData();
    }
  }, [centerId, selectedCourse, selectedMonth]);

  const fetchCourses = async () => {
    const { data } = await supabaseBrowser
      .from('courses')
      .select('id, name, grade, instructor, monthly_price, instructors(name)')
      .eq('center_id', centerId);
    setCourses(data || []);
    // إتاحة "كل المواد" كاختيار افتراضي أو متاح
    setSelectedCourse('all');

    if (data?.length > 0) {
      const uniqueGrades = [...new Set(data.map(c => c.grade))].sort();
      if (uniqueGrades.length > 0) {
        setSelectedGrade(uniqueGrades[0]);
      }
    }

    // Fetch center name for the receipt
    const { data: settings } = await supabaseBrowser
      .from('center_settings')
      .select('center_name')
      .eq('center_id', centerId)
      .single();
    if (settings) setCenterSettings(settings);
  };

  // ✅ قائمة الصفوف الدراسية المتاحة
  const availableGrades = useMemo(() => {
    return [...new Set(courses.map(c => c.grade))].sort();
  }, [courses]);

  // ✅ قائمة المواد المفلترة بناءً على الصف المختار
  const filteredCoursesByGrade = useMemo(() => {
    return courses.filter(c => c.grade === selectedGrade);
  }, [courses, selectedGrade]);

  // ✅ تغيير المادة تلقائياً عند تغيير الصف
  const handleGradeChange = (grade) => {
    setSelectedGrade(grade);
    const firstCourseOfGrade = courses.find(c => c.grade === grade);
    if (firstCourseOfGrade) {
      setSelectedCourse(firstCourseOfGrade.id);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let query = supabaseBrowser
        .from('students')
        .select('*')
        .eq('center_id', centerId);
      
      if (selectedCourse !== 'all') {
        query = query.contains('enrolled_courses', [selectedCourse]);
      } else if (selectedGrade) {
        // لو مختارين "كل المواد" لصف دراسي محدد
        query = query.eq('grade', selectedGrade);
      }

      const { data: studentsData } = await query;

      // جلب كافة اشتراكات الشهر لكل المواد لنتمكن من عرض حالة "كل مادة" في التاجات
      const { data: subsData } = await supabaseBrowser
        .from('student_subscriptions')
        .select('*')
        .eq('center_id', centerId)
        .eq('month_year', selectedMonth);

      setStudents(studentsData || []);
      setSubscriptions(subsData || []);
      
      // جلب آخر حصة حضور لكل طالب لبيان المنقطعين
      if (studentsData?.length > 0) {
        const { data: activityData } = await supabaseBrowser
          .from('student_activities')
          .select('student_id, created_at')
          .eq('type', 'attendance')
          .in('student_id', studentsData.map(s => s.id))
          .order('created_at', { ascending: false });
        
        const lastSessionMap = {};
        activityData?.forEach(s => {
          if (!lastSessionMap[s.student_id]) {
            lastSessionMap[s.student_id] = s.created_at;
          }
        });
        setLastSessions(lastSessionMap);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ فصل الطلاب "الشهريين" لهذا الكورس عن فلتر البحث لحساب الإحصائيات بدقة
  const monthlyStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedCourse === 'all') {
        return (s.monthly_courses && s.monthly_courses.length > 0) || s.subscription_type === 'شهري';
      }
      const isMonthlyForThisCourse = s.monthly_courses?.includes(selectedCourse);
      const isGlobalMonthly = s.subscription_type === 'شهري';
      return isMonthlyForThisCourse || isGlobalMonthly;
    });
  }, [students, selectedCourse]);

  const filteredStudents = useMemo(() => {
    return monthlyStudents.filter(s => {
      const isPaid = subscriptions.some(sub => sub.student_id === s.id && sub.course_id === selectedCourse);
      const matchesSearch = s.name.includes(searchTerm) || s.unique_id.includes(searchTerm);
      const matchesFilter = statusFilter === 'all' || (statusFilter === 'paid' ? isPaid : !isPaid);
      return matchesSearch && matchesFilter;
    });
  }, [monthlyStudents, searchTerm, statusFilter, subscriptions, selectedCourse]);

  const stats = useMemo(() => {
    // 🆕 حسابات الإحصائيات (تتحمل حالة الكل أو مادة محددة)
    let collectedRevenue = 0;
    let totalDiscounts = 0;
    let remainingDebt = 0;
    let totalMonthlyStudentsCount = monthlyStudents.length;
    let settledStudentsCount = 0;

    monthlyStudents.forEach(s => {
      const targetCourses = selectedCourse === 'all' 
        ? courses.filter(c => s.monthly_courses?.includes(c.id))
        : courses.filter(c => c.id === selectedCourse);

      let studentFullySettled = targetCourses.length > 0;

      targetCourses.forEach(c => {
        const sub = subscriptions.find(ps => ps.student_id === s.id && ps.course_id === c.id);
        const price = parseFloat(c.monthly_price || 0);

        if (sub) {
          const paid = parseFloat(sub.amount_paid || 0);
          collectedRevenue += paid;
          
          const isPartial = sub.notes?.startsWith('[جزئي]');
          if (isPartial) {
            remainingDebt += (price - paid);
            studentFullySettled = false;
          } else {
            totalDiscounts += (price - paid);
          }
        } else {
          remainingDebt += price;
          studentFullySettled = false;
        }
      });

      if (studentFullySettled && targetCourses.length > 0) settledStudentsCount++;
    });

    return {
      total: totalMonthlyStudentsCount,
      paid: settledStudentsCount,
      unpaid: totalMonthlyStudentsCount - settledStudentsCount,
      percent: totalMonthlyStudentsCount > 0 ? Math.round((settledStudentsCount / totalMonthlyStudentsCount) * 100) : 0,
      collectedRevenue,
      totalDiscounts,
      remainingRevenue: remainingDebt
    };
  }, [monthlyStudents, subscriptions, selectedCourse, courses]);

  // 🛡️ حماية الصفحة: توضع بعد كافة الـ Hooks لضمان ثبات الترتيب
  if (authLoading || (allowedFeatures && !allowedFeatures.includes('page_subscriptions'))) {
    if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_subscriptions')) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-red-500" dir="rtl">
                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-red-50 text-center max-w-md">
                   <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                      <FaLock />
                   </div>
                   <h2 className="text-2xl font-black mb-4">هذه الصفحة مقفولة! 🔒</h2>
                   <p className="text-gray-500 font-bold mb-8">عذراً، نظام الاشتراكات الشهرية غير مفعل في باقتك الحالية. يرجى التواصل مع الإدارة للتفعيل.</p>
                   <Link href="/admin/dashboard" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl font-black hover:bg-slate-800 transition shadow-lg shadow-gray-200">
                      العودة للرئيسية
                   </Link>
                </div>
            </div>
        );
    }
    return <div className="min-h-screen flex items-center justify-center font-black text-gray-400 font-black">جاري التحقق من الصلاحيات... ⏳</div>;
  }

  const sendWhatsAppReceipt = (student, amount, courseNames, expiryDate) => {
    const phone = student.parent_phone || student.phone;
    if (!phone) return toast.error('رقم الهاتف غير مسجل');

    const centerName = centerSettings?.center_name || 'المركز التعليمي';
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

    const coursesText = Array.isArray(courseNames) ? courseNames.join(' + ') : courseNames;
    const isMulti = Array.isArray(courseNames) && courseNames.length > 1;

    const message = `*سند سداد الكتروني ${isMulti ? '(مجمع)' : ''}*
---------------------------
المركز: *${centerName}*
الطالب: *${student.name}*
المواد: *${coursesText}*
الشهر: *${selectedMonth}*
المبلغ الاجمالي: *${amount} ج.م*
صلاحية الاشتراك حتى: *${new Date(expiryDate).toLocaleDateString('ar-EG')}*
---------------------------
*شكرا لتعاملكم معنا*`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const sendWhatsAppReminder = (student, courseName) => {
    const phone = student.parent_phone || student.phone;
    if (!phone) return toast.error('رقم الهاتف غير مسجل');

    const centerName = centerSettings?.center_name || 'المركز التعليمي';
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

    const message = `تذكير سداد اشتراك ✅
---------------------------
ولي أمر الطالب: *${student.name}*
نود تذكير سيادتكم بأن اشتراك مادة *${courseName}* لشهر (${selectedMonth}) لم يسدد بعد.
نرجو من حضراتكم التكرم بالسداد في أقرب حصة لضمان استمرار انتظام الطالب.

المركز: *${centerName}*
شكرا لتفهمكم.`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const payBulkSubscriptions = async (studentId, coursesToPay, totalAmountProvided) => {
    if (!coursesToPay.length) return;
    setIsLoading(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      const isoExpiry = expiryDate.toISOString();

      // توزيع المبلغ المدفوع تناسبياً على المواد (لتسجيل دقيق لكل مادة)
      const totalExpected = coursesToPay.reduce((sum, c) => sum + parseFloat(c.monthly_price || 0), 0);
      const ratio = totalAmountProvided / (totalExpected || 1);

      const inserts = coursesToPay.map(c => ({
        student_id: studentId,
        course_id: c.id,
        month_year: selectedMonth,
        amount_paid: Math.round((c.monthly_price || 0) * ratio),
        center_id: centerId,
        expires_at: isoExpiry
      }));

      const { error } = await supabaseBrowser
        .from('student_subscriptions')
        .insert(inserts);

      if (error) throw error;
      toast.success(`تم سداد ${coursesToPay.length} مواد (إجمالي: ${totalAmountProvided} ج.م) ✅`);
      fetchData();
    } catch (error) {
      toast.error('حدث خطأ أثناء السداد المجمع: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubscription = async (studentId, currentAmount = 0, isPaid, note = '', isPartial = false) => {
    try {
      if (isPaid) {
        // Delete subscription
        const { error } = await supabaseBrowser
          .from('student_subscriptions')
          .delete()
          .match({ 
            student_id: studentId, 
            course_id: selectedCourse, 
            month_year: selectedMonth 
          });
        if (error) throw error;
        toast.success('تم إلغاء تسجيل الدفع');
      } else {
        // Create subscription
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1); // 🆕 نظام "نفس اليوم الشهر القادم"

        // إضافة وسم [جزئي] للملاحظة لو سداد جزئي
        const finalNote = isPartial ? `[جزئي] ${note}` : note;

        const { error } = await supabaseBrowser
          .from('student_subscriptions')
          .insert({
            student_id: studentId,
            course_id: selectedCourse,
            month_year: selectedMonth,
            amount_paid: currentAmount,
            center_id: centerId,
            notes: finalNote,
            expires_at: expiryDate.toISOString()
          });
        if (error) throw error;
        toast.success(isPartial ? 'تم تسجيل سداد جزئي ⚠️' : 'تم تسجيل سداد كامل ✅');
      }
      fetchData();
    } catch (error) {
      toast.error('حدث خطأ: ' + error.message);
    }
  };

  const updateSubscription = async (studentId, newAmount, isPartial, currentNote) => {
    setIsLoading(true);
    try {
      // تنظيف النوت من الوسم القديم وإضافة الجديد حسب الاختيار
      const cleanNote = currentNote?.replace('[جزئي]', '').trim();
      const finalNote = isPartial ? `[جزئي] ${cleanNote}` : cleanNote;

      const { error } = await supabaseBrowser
        .from('student_subscriptions')
        .update({
          amount_paid: newAmount,
          notes: finalNote
        })
        .match({ 
          student_id: studentId, 
          course_id: selectedCourse, 
          month_year: selectedMonth 
        });

      if (error) throw error;
      toast.success(isPartial ? 'تم تحديث السداد الجزئي ⚠️' : 'تم إكمال السداد بنجاح ✅');
      setEditingStudentId(null);
      fetchData();
    } catch (error) {
      toast.error('خطأ في التحديث: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportExcel = () => {
    const isAll = selectedCourse === 'all';
    let rows = [];

    if (isAll) {
      // 🆕 تقرير ملخص مالي لكل طالب (سطر واحد لكل طالب)
      filteredStudents.forEach(s => {
        const studentMonthlyIds = s.monthly_courses || [];
        if (studentMonthlyIds.length === 0) return;

        let totalRequired = 0;
        let totalPaid = 0;
        let totalRemaining = 0;
        let totalDiscount = 0; // 🆕 إجمالي الخصم
        let paidCount = 0;
        let detailsArray = [];

        studentMonthlyIds.forEach(cId => {
          const course = courses.find(c => c.id === cId);
          if (!course) return;
          
          const sub = subscriptions.find(ps => ps.student_id === s.id && ps.course_id === cId);
          const price = parseFloat(course.monthly_price || 0);
          const paid = parseFloat(sub?.amount_paid || 0);
          
          const isPartial = sub?.notes?.startsWith('[جزئي]');
          const remaining = sub ? (isPartial ? (price - paid) : 0) : price;
          const discount = (sub && !isPartial) ? (price - paid) : 0; // الخصم يحسب فقط لو السداد كامل والمدفوع أقل من السعر

          totalRequired += price;
          totalPaid += paid;
          totalRemaining += remaining;
          totalDiscount += discount;

          let statusIcon = '❌';
          if (sub) {
            statusIcon = isPartial ? `⚠️ (باقي ${price - paid})` : (discount > 0 ? `✅ (خصم ${discount})` : '✅');
            if (!isPartial) paidCount++;
          }
          detailsArray.push(`${course.name}: ${statusIcon}`);
        });

        rows.push({
          'كود الطالب': s.unique_id,
          'اسم الطالب': s.name,
          'الصف الدراسي': s.grade || '---',
          'الشهر': selectedMonth,
          'عدد المواد': studentMonthlyIds.length,
          'سدد كم مادة': paidCount,
          'إجمالي المطلوب': totalRequired,
          'إجمالي المدفوع': totalPaid,
          'إجمالي الخصومات': totalDiscount,
          'إجمالي المتأخرات': totalRemaining,
          'تفاصيل المواد': detailsArray.join(' | '),
          'موبايل ولي الأمر': s.parent_phone || '---',
          'آخر حضور': lastSessions[s.id] ? new Date(lastSessions[s.id]).toLocaleDateString('ar-EG') : 'لم يحضر'
        });
      });
    } else {
      // 📄 تقرير تفصيلي لمادة واحدة
      const currentCourse = courses.find(c => c.id === selectedCourse);
      const price = parseFloat(currentCourse?.monthly_price || 0);

      filteredStudents.forEach(s => {
        const sub = subscriptions.find(sub => sub.student_id === s.id && sub.course_id === selectedCourse);
        const isPaid = !!sub;
        const isPartial = sub?.notes?.startsWith('[جزئي]');
        const paidAmount = parseFloat(sub?.amount_paid || 0);
        const remainingAmount = isPaid ? (isPartial ? (price - paidAmount) : 0) : price;
        const discountAmount = (isPaid && !isPartial) ? (price - paidAmount) : 0; // 🆕
        
        let statusText = isPaid ? (isPartial ? 'سداد جزئي ⚠️' : 'سداد كامل ✅') : 'لم يدفع ❌';

        rows.push({
          'كود الطالب': s.unique_id,
          'اسم الطالب': s.name,
          'المادة': currentCourse?.name,
          'حالة السداد': statusText,
          'السعر الأصلي': price,
          'المبلغ المدفوع': isPaid ? paidAmount : 0,
          'قيمة الخصم': discountAmount,
          'المتبقي': remainingAmount,
          'تاريخ السداد': sub?.payment_date ? new Date(sub.payment_date).toLocaleString('ar-EG') : (sub?.created_at ? new Date(sub.created_at).toLocaleString('ar-EG') : '---'),
          'ملاحظات': sub?.notes?.replace('[جزئي]', '').trim() || '---',
          'موبايل ولي الأمر': s.parent_phone || '---',
          'آخر حضور': lastSessions[s.id] ? new Date(lastSessions[s.id]).toLocaleDateString('ar-EG') : 'لم يحضر'
        });
      });
    }
    
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // توسيع العواميد
    ws['!cols'] = isAll 
      ? [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 60 }, { wch: 15 }, { wch: 15 }]
      : [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الاشتراكات");
    ws['!dir'] = 'rtl';
    XLSX.writeFile(wb, `اشتراكات_${isAll ? 'عام' : courses.find(c => c.id === selectedCourse)?.name}_${selectedMonth}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <Toaster />
      
      {/* Header & Stats */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
              <FaMoneyCheckAlt className="text-blue-600" />
              إدارة الاشتراكات الشهرية
            </h1>
            <p className="text-gray-500 text-sm mt-1">تتبع وتحصيل اشتراكات مادة معينة لشهر محدد</p>
          </div>
          
          <button 
            onClick={exportExcel}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl font-black hover:bg-green-700 transition shadow-lg shadow-green-100"
          >
            <FaFileExcel />
            <span>تصدير كشف الشهر</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="إجمالي الطلاب" value={stats.total} icon={<FaUserGraduate />} color="blue" />
          <StatCard 
            label="تم التحصيل" 
            value={`${stats.collectedRevenue} ج.م`} 
            icon={<FaCheckCircle />} 
            color="green" 
            subLabel={stats.totalDiscounts > 0 ? `(+ ${stats.totalDiscounts} ج.م خصومات)` : `${stats.paid} طالب`} 
          />
          <StatCard 
            label="متأخرات مالية" 
            value={`${stats.remainingRevenue} ج.م`} 
            icon={<FaTimesCircle />} 
            color="red" 
            subLabel={`على ${stats.unpaid} طالب لم يدفع`} 
          />
          <div className="bg-white p-5 rounded-3xl border-2 border-gray-100 flex flex-col justify-center items-center shadow-sm">
            <span className="text-xs font-bold text-gray-400 mb-1">نسبة التحصيل المالي</span>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
               <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${stats.percent}%` }}></div>
            </div>
            <span className="mt-2 font-black text-blue-600">{stats.percent}%</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-8 bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-500 mb-2">الصف الدراسي:</label>
              <select 
                value={selectedGrade} 
                onChange={e => handleGradeChange(e.target.value)}
                className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-blue-500 transition"
              >
                {availableGrades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 mb-2">اختر المادة:</label>
              <select 
                value={selectedCourse} 
                onChange={e => setSelectedCourse(e.target.value)}
                className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-blue-500 transition"
              >
                <option value="all">📁 كل المواد (تقرير شامل)</option>
                {filteredCoursesByGrade.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.instructors?.name || c.instructor || 'مدرس المادة'})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-black text-gray-500 mb-2">اختر الشهر:</label>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-blue-500 transition text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 mb-2">بحث (اسم أو كود):</label>
              <div className="relative">
                <FaSearch className="absolute right-3 top-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="ابحث..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pr-10 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'الكل', count: stats.total },
              { id: 'paid', label: 'المسددين', count: stats.paid },
              { id: 'unpaid', label: 'المتأخرين', count: stats.unpaid }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                  statusFilter === tab.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="max-w-7xl mx-auto overflow-hidden">
        <div className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm overflow-x-auto custom-scrollbar">
          <table className="w-full text-right border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100 text-gray-600">
                <th className="p-4 text-xs font-black italic whitespace-nowrap">كود</th>
                <th className="p-4 text-xs font-black whitespace-nowrap">اسم الطالب</th>
                <th className="p-4 text-xs font-black text-center whitespace-nowrap">تفاصيل الاشتراك</th>
                <th className="p-4 text-xs font-black text-center whitespace-nowrap">المبلغ والملاحظات</th>
                <th className="p-4 text-xs font-black text-center whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                const sub = subscriptions.find(s => s.student_id === student.id && s.course_id === selectedCourse);
                const isPaid = !!sub;
                const isAllSelected = selectedCourse === 'all';
                
                // حساب المواد الشهرية للطالب والمدرسين والتكلفة الإجمالية
                const studentMonthlyIds = student.monthly_courses || [];
                const studentSubs = subscriptions.filter(s => s.student_id === student.id);
                const totalTargeted = studentMonthlyIds.length;
                const totalPaidCount = studentSubs.filter(s => !s.notes?.startsWith('[جزئي]')).length;

                // 🆕 تعريف المتغيرات للمادة المختارة حالياً لإصلاح الخطأ
                const isPartial = sub?.notes?.startsWith('[جزئي]');
                const cleanNote = sub?.notes?.replace('[جزئي]', '').trim();

                return (
                  <tr key={student.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition">
                    <td className="p-4 text-xs font-black text-gray-400">#{student.unique_id}</td>
                    <td className="p-4">
                       <div className="font-bold text-gray-800">{student.name}</div>
                       <div className="flex flex-col gap-0.5 mt-1 text-[10px] font-bold">
                         <span className="text-gray-400">طالب: {student.phone || '---'}</span>
                         <span className="text-blue-600">ولي أمر: {student.parent_phone || '---'}</span>
                         {lastSessions[student.id] ? (
                           <span className="text-gray-400 mt-1">آخر حضور: {new Date(lastSessions[student.id]).toLocaleDateString('ar-EG')}</span>
                         ) : (
                           <span className="text-orange-500 mt-1 italic animate-pulse">⚠️ لم يحضر من قبل</span>
                         )}
                       </div>
                    </td>
                    <td className="p-4">
                      {/* 🆕 قائمة المواد التفصيلية */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-[300px]">
                        {studentMonthlyIds.map(cId => {
                          const course = courses.find(c => c.id === cId);
                          const courseSub = studentSubs.find(s => s.course_id === cId);
                          const isCPaid = !!courseSub;
                          const isCPartial = courseSub?.notes?.startsWith('[جزئي]');
                          const cExpiry = courseSub?.expires_at ? new Date(courseSub.expires_at) : null;
                          const isCExpired = cExpiry ? cExpiry < new Date() : false;

                          return (
                            <div 
                              key={cId} 
                              onClick={() => {
                                if (selectedCourse !== cId) {
                                  setSelectedCourse(cId);
                                  toast.success(`إدارة مادة: ${course?.name}`, { id: 'switch', duration: 1000 });
                                }
                              }}
                              className={`p-2 rounded-xl border-2 transition-all cursor-pointer ${
                                selectedCourse === cId ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-gray-50 bg-white hover:border-blue-200'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <span className="text-[10px] font-black text-gray-700 truncate">{course?.name}</span>
                                <div className={`px-1.5 py-0.5 rounded text-[8px] font-black whitespace-nowrap ${
                                  !isCPaid ? 'bg-red-100 text-red-600' : (isCPartial ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600')
                                }`}>
                                  {!isCPaid ? 'لم يدفع' : (isCPartial ? 'جزئي' : 'مسدد')}
                                </div>
                              </div>
                              
                              {isCPaid && (
                                <div className="flex flex-col gap-0.5 border-t border-gray-100 pt-1 mt-1">
                                  <div className="flex justify-between text-[8px] font-bold">
                                    <span className="text-gray-400">تاريخ السداد:</span>
                                    <span className="text-gray-600">{new Date(courseSub.payment_date || courseSub.created_at).toLocaleDateString('ar-EG')}</span>
                                  </div>
                                  <div className="flex justify-between text-[8px] font-bold">
                                    <span className="text-gray-400">تاريخ الانتهاء:</span>
                                    <span className={isCExpired ? 'text-red-500' : 'text-green-600'}>
                                      {cExpiry?.toLocaleDateString('ar-EG')}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {!isCPaid && <div className="text-[8px] font-bold text-gray-300 mt-1 italic">بانتظار السداد...</div>}
                            </div>
                          );
                        })}
                      </div>

                      {/* إيصال مجمع */}
                      {studentSubs.length > 1 && (
                        <button 
                          onClick={() => {
                            const totalPaid = studentSubs.reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0);
                            const cNames = courses.filter(c => studentSubs.some(s => s.course_id === c.id)).map(c => c.name).join(' + ');
                            const latestExp = new Date(Math.max(...studentSubs.map(s => new Date(s.expires_at))));
                            sendWhatsAppReceipt(student, totalPaid, cNames, latestExp);
                          }}
                          className="mt-2 w-full bg-purple-50 text-purple-600 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 hover:bg-purple-100 transition border border-purple-100"
                        >
                          <FaWhatsapp size={14} /> إيصال مجمع ({studentSubs.length} مواد)
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-center">
                        {isAllSelected ? (
                           <div className="flex flex-col items-center gap-1">
                              <div className="p-2 bg-blue-50/50 rounded-2xl border border-blue-100">
                                <div className="text-[10px] font-black text-blue-600 mb-1">ملخص حالة الطالب</div>
                                <div className="flex gap-2">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[12px] font-black text-gray-700">{totalPaidCount} / {totalTargeted}</span>
                                    <span className="text-[8px] font-bold text-gray-400">المواد</span>
                                  </div>
                                  <div className="w-[1px] h-6 bg-blue-100 mx-1"></div>
                                  <div className="flex flex-col items-center">
                                    <span className={`text-[12px] font-black ${totalPaidCount === totalTargeted ? 'text-green-600' : 'text-orange-500'}`}>
                                      {Math.round((totalPaidCount/totalTargeted)*100)}%
                                    </span>
                                    <span className="text-[8px] font-bold text-gray-400">الالتزام</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-[8px] text-gray-400 font-bold mt-2 italic">📌 اختر مادة محددة لتعديل المبالغ</p>
                           </div>
                        ) : isPaid ? (
                           <div className="flex flex-col items-center gap-1">
                             {editingStudentId === student.id ? (
                               <div className="flex flex-col gap-1 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
                                 <input 
                                   type="number"
                                   className="w-20 p-1 text-center bg-white border border-blue-200 rounded text-xs font-black"
                                   value={paymentAmounts[student.id] ?? sub.amount_paid}
                                   onChange={(e) => setPaymentAmounts(prev => ({ ...prev, [student.id]: e.target.value }))}
                                 />
                                 <button
                                    onClick={() => setIsPartialPayment(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                                    className={`px-2 py-0.5 rounded text-[8px] font-black border ${
                                      (isPartialPayment[student.id] ?? isPartial)
                                        ? 'bg-orange-50 text-orange-600 border-orange-200' 
                                        : 'bg-green-50 text-green-600 border-green-200'
                                    }`}
                                  >
                                    {(isPartialPayment[student.id] ?? isPartial) ? '⚠️ سداد جزئي' : '✅ سداد كامل'}
                                  </button>
                                  <div className="flex gap-1 mt-1">
                                    <button 
                                      onClick={() => updateSubscription(student.id, parseFloat(paymentAmounts[student.id] ?? sub.amount_paid), isPartialPayment[student.id] ?? isPartial, sub.notes)}
                                      className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-black"
                                    >حفظ</button>
                                    <button 
                                      onClick={() => setEditingStudentId(null)}
                                      className="bg-gray-400 text-white px-2 py-1 rounded text-[9px] font-black"
                                    >إلغاء</button>
                                  </div>
                               </div>
                             ) : (
                               <>
                                 <div className="flex items-center gap-2">
                                   <span className="font-black text-green-600 text-sm">{sub.amount_paid} ج.م</span>
                                   <button 
                                     onClick={() => {
                                       const course = courses.find(c => c.id === selectedCourse);
                                       const courseWithTeacher = course ? `${course.name} (${course.instructors?.name || course.instructor || 'مدرس المادة'})` : '';
                                       sendWhatsAppReceipt(student, sub.amount_paid, courseWithTeacher, sub.expires_at);
                                     }}
                                     className="text-green-500 hover:text-green-600 transition p-1"
                                     title="إرسال إيصال واتساب"
                                   >
                                     <FaWhatsapp size={18} />
                                   </button>
                                 </div>
                                 {isPartial && (
                                   <button 
                                     onClick={() => {
                                       setEditingStudentId(student.id);
                                       setIsPartialPayment({ [student.id]: true });
                                     }}
                                     className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition"
                                   >
                                     ✏️ تعديل المبلغ / إكمال السداد
                                   </button>
                                 )}
                               </>
                             )}
                             {cleanNote && (
                               <span className="text-[9px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100 font-bold max-w-[120px] truncate" title={cleanNote}>
                                 📝 {cleanNote}
                               </span>
                             )}
                           </div>
                        ) : (
                           <div className="flex flex-col items-center gap-2">
                              <div className="flex flex-col items-center">
                                <input 
                                  type="number" 
                                  placeholder="المبلغ"
                                  value={paymentAmounts[student.id] ?? (courses.find(c => c.id === selectedCourse)?.monthly_price || 0)}
                                  onChange={(e) => setPaymentAmounts(prev => ({ ...prev, [student.id]: e.target.value }))}
                                  className="w-20 p-2 text-center bg-gray-50 border border-gray-100 rounded-lg text-xs font-black outline-none focus:border-blue-500 shadow-sm"
                                />
                                {courses.find(c => c.id === selectedCourse)?.monthly_price > 0 && (
                                  <span className="text-[8px] text-gray-400 font-bold mt-1">المتوقع: {courses.find(c => c.id === selectedCourse)?.monthly_price} ج.م</span>
                                )}
                              </div>
                              
                              {/* 🆕 اختيار نوع السداد */}
                              <button
                                onClick={() => setIsPartialPayment(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                                className={`px-2 py-1 rounded-lg text-[8px] font-black transition-all border ${
                                  isPartialPayment[student.id] 
                                    ? 'bg-orange-50 text-orange-600 border-orange-200' 
                                    : 'bg-green-50 text-green-600 border-green-200'
                                }`}
                              >
                                {isPartialPayment[student.id] ? '⚠️ سداد جزئي (عليه باقي)' : '✅ سداد كامل (سواء بخصم أو لا)'}
                              </button>

                              <input 
                                type="text"
                                placeholder="إضافة ملاحظة..."
                                value={paymentNotes[student.id] || ''}
                                onChange={(e) => setPaymentNotes(prev => ({ ...prev, [student.id]: e.target.value }))}
                                className="w-32 p-1.5 text-right bg-blue-50/50 border border-blue-100 rounded-lg text-[9px] font-bold outline-none focus:border-blue-400 placeholder:text-gray-300"
                              />
                           </div>
                        )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                         {!isPaid && !isAllSelected && (
                           <div className="flex flex-col gap-2">
                             <button
                               onClick={() => {
                                 const coursePrice = courses.find(c => c.id === selectedCourse)?.monthly_price || 0;
                                 const finalAmount = parseFloat(paymentAmounts[student.id] ?? coursePrice);
                                 const note = paymentNotes[student.id] || '';
                                 const isPartial = isPartialPayment[student.id] || false;
                                 toggleSubscription(student.id, finalAmount, false, note, isPartial);
                               }}
                               disabled={isLoading}
                               className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-green-700 shadow-md shadow-green-100 transition-all w-32"
                             >
                               تسجيل سداد
                             </button>

                             <button
                               onClick={() => sendWhatsAppReminder(student, courses.find(c => c.id === selectedCourse)?.name)}
                               className="flex items-center justify-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all border border-blue-100"
                             >
                               <FaWhatsapp size={14} /> تذكير بالدفع
                             </button>
                           </div>
                         )}
                        
                        {/* 🆕 زرار سداد كافة المواد مع إمكانية الخصم */}
                        {(() => {
                          const unpaidCourses = courses.filter(c => 
                            studentMonthlyIds.includes(c.id) && 
                            !subscriptions.some(sub => sub.student_id === student.id && sub.course_id === c.id)
                          );
                          
                          if (unpaidCourses.length > 1) {
                            const totalExpected = unpaidCourses.reduce((sum, c) => sum + parseFloat(c.monthly_price || 0), 0);
                            const currentBulkAmount = bulkAmounts[student.id] ?? totalExpected;

                            return (
                              <div className="flex flex-col gap-1 border-t border-purple-50 pt-2 mt-1 w-full items-center">
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] text-purple-400 font-bold">إجمالي الخصم:</span>
                                  <input 
                                    type="number"
                                    value={currentBulkAmount}
                                    onChange={(e) => setBulkAmounts(prev => ({ ...prev, [student.id]: e.target.value }))}
                                    className="w-16 p-1 text-center bg-purple-50 border border-purple-100 rounded text-[10px] font-black outline-none focus:border-purple-500"
                                  />
                                </div>
                                <button
                                  onClick={() => payBulkSubscriptions(student.id, unpaidCourses, parseFloat(currentBulkAmount))}
                                  disabled={isLoading}
                                  className="bg-purple-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-purple-700 shadow-md shadow-purple-100 group w-full"
                                >
                                  سداد كافّة المواد ({unpaidCourses.length})
                                </button>
                                {parseFloat(currentBulkAmount) < totalExpected && (
                                  <span className="text-[7px] text-orange-500 font-black animate-pulse">⚠️ خصم مجمع بقيمة {totalExpected - currentBulkAmount} ج</span>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {isPaid && (
                          <button
                            onClick={() => toggleSubscription(student.id, 0, true)}
                            disabled={isLoading}
                            className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-100 transition-all shadow-sm"
                          >
                            إلغاء السداد
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-400 font-bold italic">
                    لا يوجد طلاب يطابقون البحث في هذه المادة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, subLabel }) {
  const colors = {
    blue: 'border-blue-100 bg-blue-100/50 text-blue-600',
    green: 'border-green-100 bg-green-100/50 text-green-600',
    red: 'border-red-100 bg-red-100/50 text-red-600'
  };
  
  return (
    <div className={`p-5 rounded-[2rem] border-2 flex items-center gap-4 bg-white border-opacity-50 shadow-sm transition-all hover:shadow-md`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
        <div className="text-lg font-black text-gray-800 leading-tight">{value}</div>
        {subLabel && <div className="text-[10px] font-bold text-gray-400 mt-0.5">{subLabel}</div>}
      </div>
    </div>
  );
}

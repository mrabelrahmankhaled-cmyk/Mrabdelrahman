'use client';
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase-browser';
import { calculateTotalStudentDebt, calculateRequiredPayment } from '../utils/sessionCalculations';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';


// 👇 الدالة السحرية لرسم رسالة تأكيد احترافية وتنتظر الرد
const showCustomConfirm = (title, message) => {
  return new Promise((resolve) => {
    toast.custom((t) => (
      <div className="bg-white p-5 rounded-3xl shadow-2xl border-2 border-orange-100 max-w-sm w-full animate-fade-in" dir="rtl">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-orange-50 w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0">
            💰
          </div>
          <h3 className="text-sm font-black text-gray-800">{title}</h3>
        </div>
        <p className="text-xs text-gray-600 mb-6 font-bold leading-relaxed">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(true); // 👈 رد بنعم
            }}
            className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-xs font-black hover:bg-green-600 transition shadow-sm"
          >
            نعم، تأكيد
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(false); // 👈 رد بلا
            }}
            className="flex-1 bg-red-50 text-red-600 border border-red-100 py-2.5 rounded-xl text-xs font-black hover:bg-red-100 transition"
          >
            لا، تراجع
          </button>
        </div>
      </div>
    ), {
      duration: Infinity, // 👈 عشان الرسالة متختفيش لوحدها قبل ما يختار
      position: 'top-center',
    });
  });
};

/**
 * Hook for managing attendance logic and state
 * Handles wallet deductions, refunds, and attendance tracking
 */
export const useAttendance = (activeSession, students, courses, groups, centerConfig, isAutoMode, setStudents, subscriptions) => {
  const { centerId, user } = useAuth();
  const [attendanceMap, setAttendanceMap] = useState({});
  const [paymentsMap, setPaymentsMap] = useState({});

  // Stub toast function - the main component will handle actual toasts
  const showToast = useCallback((msg, type = 'success') => {
    console.log(`Toast (${type}): ${msg}`);
  }, []);

  /**
   * Handle attendance change with wallet logic and debt checking
   */
  const handleAttendanceChange = useCallback(async (studentId, isChecked, isBarcode = false, allowWalletAuto = true) => {
    if (!students || !Array.isArray(students)) return;
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

    // 🚀 2. منطق دمج المجموعات (تم نقله لـ useScanner.js)
    /* 
    // ⚠️ تم تعطيل الـ check هنا عشان useScanner.js بيعمله دلوقتي
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
    */

    const courseData = courses.find(c => c.id === activeSession.course_id);
    const teacherName = courseData?.instructor || "غير محدد";

    // ✅ التشييك على الاشتراك الشهري
    const sub = (subscriptions || []).find(s => s.student_id === studentId && s.course_id === activeSession.course_id);
    const expiryDate = sub?.expires_at ? new Date(sub.expires_at) : null;
    const isMonthlyPaid = expiryDate ? expiryDate > new Date() : false;
    const isExpired = expiryDate ? expiryDate <= new Date() : false;

    let required = calculateRequiredPayment(student, activeSession, isMonthlyPaid);

    if (isChecked) {
      // 🚀 3. تنبيه المديونية
      const debt = calculateTotalStudentDebt(studentId, students, courses.flatMap(c => c.sessions || []));
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

      // 🚨 تنبيه انتهاء الاشتراك
      if (isExpired && !isAutoMode) {
         const proceed = window.confirm(`⚠️ تنبيه: اشتراك الطالب ${student.name} في هذه المادة منتهي بتاريخ (${expiryDate.toLocaleDateString('ar-EG')}). هل تريد تحضيره كمديونية/كاش؟`);
         if (!proceed) return;
      }

      // --- السيناريو الأول: الدفع (محفظة أو كاش) ---
      if (allowWalletAuto && student?.has_wallet && required > 0 && !attendanceMap[studentId]) {
        const walletBalance = parseFloat(student.wallet_balance) || 0;

        if (walletBalance >= required) {
          // ... (خصم المحفظة) ...
          const newBalance = walletBalance - required;
          const { error: walletError } = await supabase
            .from('students')
            .update({ wallet_balance: newBalance })
            .eq('id', student.id)
            .eq('center_id', centerId); // ← فلترة حسب المركز

          if (!walletError) {
            await supabase.from('wallet_transactions').insert([{
              student_id: student.id,
              amount: -required,
              type: 'session_payment',
              center_id: centerId, // ← إضافة center_id
              description: `خصم حضور: ${activeSession.topic} - مادة: ${courseData?.name} - مدرس: ${teacherName}`
            }]);

            // 🔥 1. تسجيل Audit Log (محفظة)
            await supabase.from('audit_logs').insert({
              table_name: 'sessions',
              record_id: student.id, 
              action: 'ATTENDANCE',
              user_id: user?.id, // 🆕 تسجيل المسؤول
              center_id: centerId, // ← إضافة center_id
              new_data: { 
                details: `حضور (خصم محفظة): ${activeSession.topic}`,
                amount: required,
                course_id: activeSession.course_id
              }
            });

            // باقي كود المحفظة...
            const isExternal = student.group_ids?.[activeSession.course_id] !== activeSession.group_id;
            await supabase.from('student_activities').insert([{
              student_id: student.id, // ← Use student.id (UUID) instead of unique_id
              type: 'attendance',
              title: isExternal ? 'حضور حصة بديلة ✅' : 'تم تسجيل الحضور (محفظة)',
              center_id: centerId, // ← إضافة center_id
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
              const waWindow = window.open(
                  `https://wa.me/2${parentPhone}?text=${encodeURIComponent(msg)}`, 
                  'WhatsAppWindow', // 👈 الاسم الثابت ده بيخليها نفس النافذة تتحدث كل مرة
                  'width=600,height=700,left=100,top=100,resizable=yes,scrollbars=yes'
                );

                // محاولة إرجاع التركيز (الماوس) للصفحة بتاعتك عشان تكمل سكان فوراً
                if (window.focus) {
                  window.focus();
                }
            }
          }
        } else {
          // ... (رصيد غير كافي - كاش) ...
          const confirmCash = await showCustomConfirm(
  'تأكيد تحصيل كاش',
  `الرصيد غير كافٍ بالمحفظة للطالب ${student.name}. هل تم تحصيل ${required} جنيه كاش؟`
);
          
          if (confirmCash) {
            setPaymentsMap(prev => ({ ...prev, [studentId]: required }));
            await supabase.from('student_activities').insert([{
              student_id: student.id, // ← Use student.id (UUID) instead of unique_id
              type: 'attendance',
              title: 'تم تسجيل الحضور (كاش)',
              center_id: centerId, // ← إضافة center_id
              description: `حضر الطالب حصة: ${activeSession.topic}. تم تحصيل ${required} ج نقداً لعدم كفاية الرصيد.`,
              note: `المدرس: ${teacherName}`
            }]);
            showToast(`تم تحصيل ${required} ج كاش من ${student.name}`, 'success');

            // 🔥 2. تسجيل Audit Log (كاش)
            await supabase.from('audit_logs').insert({
              table_name: 'sessions',
              record_id: student.id,
              action: 'ATTENDANCE',
              user_id: user?.id, // 🆕 تسجيل المسؤول
              center_id: centerId, // ← إضافة center_id
              new_data: { 
                details: `حضور (دفع نقدي): ${activeSession.topic}`,
                amount: required,
                course_id: activeSession.course_id
              }
            });

          } else {
            return false;
          }
        }
      
      // --- السيناريو الثاني: حضور عادي (مجاني أو سبق دفعه أو بدون محفظة) ---
      } else if (!paymentsMap[studentId]) {
        setPaymentsMap(prev => ({ ...prev, [studentId]: required }));
        await supabase.from('student_activities').insert([{
          student_id: student.id, // ← Use student.id (UUID) instead of unique_id
          type: 'attendance',
          center_id: centerId, // ← إضافة center_id
          description: `دخل الطالب الآن حصة: ${activeSession.topic} - ${courseData?.name}`,
          note: `المدرس: ${teacherName}`
        }]);

        // 🔥 3. تسجيل Audit Log (حضور فقط/إعفاء)
        // ⚠️ ملاحظة: تم نقله هنا داخل الـ else if عشان ميتكررش
        await supabase.from('audit_logs').insert({
          table_name: 'sessions',
          record_id: student.id,
          action: 'ATTENDANCE',
          user_id: user?.id, // 🆕 تسجيل المسؤول
          center_id: centerId, // ← إضافة center_id
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
        const confirmRefund = await showCustomConfirm(
  'تأكيد إلغاء الحضور',
  `هل تريد إلغاء الحضور وإرجاع مبلغ ${refundAmount} جنيه لمحفظة ${student.name}؟`
);
        if (confirmRefund) {
          const { error: refundError } = await supabase
            .from('students')
            .update({ wallet_balance: newBalance })
            .eq('id', student.id)
            .eq('center_id', centerId); // ← فلترة حسب المركز

          if (!refundError) {
            await supabase.from('wallet_transactions').insert([{
              student_id: student.id,
              amount: refundAmount,
              type: 'refund',
              description: `استرداد (إلغاء حضور): ${activeSession.topic} - مدرس: ${teacherName}`,
              center_id: centerId
            }]);
            
            // 🔥 سجل Audit Log لإلغاء الحضور
            await supabase.from('audit_logs').insert({
              table_name: 'sessions',
              record_id: student.id,
              action: 'REFUND',
              user_id: user?.id, // 🆕 تسجيل المسؤول
              center_id: centerId,
              new_data: { 
                details: `إلغاء حضور واسترداد مبلغ: ${activeSession.topic}`,
                amount: refundAmount,
                course_id: activeSession.course_id
              }
            });

            await supabase.from('student_activities').insert([{
              student_id: student.id, // ← Use student.id (UUID)
              type: 'note',
              title: 'إلغاء تسجيل حضور',
              description: `تم إلغاء حضور الطالب في حصة: ${activeSession.topic} وإرجاع المبلغ للمحفظة.`,
              center_id: centerId
            }]);
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, wallet_balance: newBalance } : s));
            toast.success('تم إلغاء الحضور وإعادة المبلغ للمحفظة بنجاح.', {
            duration: 4000,
            position: 'top-center',
            style: {
              background: '#d1fae5', // لون أخضر فاتح مريح
              color: '#065f46',      // لون خط أخضر غامق
              fontWeight: 'bold',
              borderRadius: '16px'
            }
});
          }
        } else {
          return false;
        }
      } else {
        await supabase.from('student_activities').insert([{
          student_id: student.id, // ← Use student.id (UUID)
          type: 'note',
          title: 'إلغاء تسجيل حضور',
          description: `تم إلغاء حضور الطالب في حصة: ${activeSession.topic}`,
          center_id: centerId
        }]);

        // 🔥 سجل Audit Log لإلغاء الحضور (بدون استرداد)
        await supabase.from('audit_logs').insert({
          table_name: 'sessions',
          record_id: student.id,
          action: 'LOGOUT',
          user_id: user?.id, // 🆕 تسجيل المسؤول
          center_id: centerId,
          new_data: { 
            details: `إلغاء حضور (بدون دفع): ${activeSession.topic}`,
            course_id: activeSession.course_id
          }
        });
      }
      setPaymentsMap(prev => {
        const newPayments = { ...prev };
        delete newPayments[studentId];
        return newPayments;
      });
    }
    setAttendanceMap(prev => ({ ...prev, [studentId]: isChecked }));
    return true;
  }, [activeSession, students, courses, paymentsMap, attendanceMap, centerConfig, groups, isAutoMode, setStudents, centerId, user]);

  /**
   * Initialize attendance and payment maps for a session
   */
  const initializeSessionData = useCallback((session) => {
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
  }, [students]);

  /**
   * Clear attendance data
   */
  const clearAttendanceData = useCallback(() => {
    setAttendanceMap({});
    setPaymentsMap({});
  }, []);

  /**
   * Save attendance data to database
   */
  const saveAttendanceData = useCallback(async (silent = false) => {
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
        .eq('id', activeSession.id)
        .eq('center_id', centerId);

      if (error) throw error;
      if (!silent) showToast('تم حفظ الدفتر المالي بنجاح 💾');
      return { attendeesList, paymentsForDB };
    } catch (error) {
      showToast('حدث خطأ في حفظ الدفتر', 'error');
      return null;
    }
  }, [activeSession, attendanceMap, paymentsMap, students, centerId]);

  return {
    attendanceMap,
    paymentsMap,
    setAttendanceMap,
    setPaymentsMap,
    handleAttendanceChange,
    initializeSessionData,
    clearAttendanceData,
    saveAttendanceData
  };
};

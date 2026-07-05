'use client';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; // 1. Import createPortal
import Link from 'next/link'; // 🆕 Import Link
import { supabase } from '../../lib/supabase-browser'; // 🆕 import supabase
import toast from 'react-hot-toast'; // 🆕 Import toast notifications
//import './SessionModal.css';
import {
  FaChalkboardTeacher, FaCheckCircle, FaLock, FaQrcode, FaSearch, FaWhatsapp,
  FaToggleOff, FaToggleOn, FaWallet, FaExclamationTriangle, FaCheck, FaPrint, FaFileInvoiceDollar,
  FaFilter, FaUsers, FaUserCheck, FaUserTimes, FaMoneyBillWave, FaExclamationCircle, FaUserPlus,
  FaPercentage, FaFileExcel
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

/**
 * SessionModal Component
 * Updated to a two-column layout:
 * - Left Column: Stats & Filters (w-80)
 * - Right Column: Table & Tools (flex-1)
 * Using Portal for printing to avoid CSS conflicts
 */
export const SessionModal = ({
  activeSession,
  onCloseSession,
  courses,
  groups,
  centerConfig,
  attendanceMap,
  paymentsMap,
  setAttendanceMap,
  setPaymentsMap,
  handleAttendanceChange,
  scannerActive,
  toggleCameraScanner,
  handleManualBarcodeInput,
  handleBarcodeInput,
  modalSearchTerm,
  setModalSearchTerm,
  filteredStudents,
  isAutoMode,
  setIsAutoMode,
  liveStats,
  saveLedger,
  handleEndSession,
  handleStartActualLesson,
  handleMassAbsentAlert,
  students,
  setStudents,
  sessions,
  calculateTotalStudentDebt,
  calculateRequiredPayment,
  isSavingLedger,
  isEndingSession,
  subscriptions // 🆕 تزويد الاشتراكات
}) => {

  // 🆕 Debug props
  console.log('🔍 SessionModal Props:', {
    setStudents: typeof setStudents,
    setStudentsValue: setStudents,
    studentsLength: students?.length
  });

  const [printView, setPrintView] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1); // 🆕 Pagination
  const PAGE_SIZE = 50; // 🆕 عدد الطلاب في الصفحة
  const [isScannerExpanded, setIsScannerExpanded] = useState(true); // 🆕 Scanner section expandable
  const [highlightedStudentId, setHighlightedStudentId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [singleResultId, setSingleResultId] = useState(null);
  const [mounted, setMounted] = useState(false);
  // 👇 الذاكرة اللي بتحفظ مين حضر الأول (الأحدث فالأقدم)
  const [attendanceOrder, setAttendanceOrder] = useState([]);

  useEffect(() => {
    if (!attendanceMap) return;
    const currentAttendedIds = Object.keys(attendanceMap).filter(id => attendanceMap[id]);

    setAttendanceOrder(prev => {
      let newOrder = [...prev];
      let changed = false;

      // أي طالب بيحضر جديد، بنزقه في أول القائمة
      currentAttendedIds.forEach(id => {
        if (!newOrder.includes(id)) {
          newOrder.unshift(id);
          changed = true;
        }
      });

      // لو مسحنا حضور حد بالغلط، نشيله من الترتيب
      const filteredOrder = newOrder.filter(id => currentAttendedIds.includes(id));
      if (filteredOrder.length !== newOrder.length) changed = true;

      return changed ? filteredOrder : prev;
    });
  }, [attendanceMap]);
  // 👆 ----------------------------------------------- 👆



  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = (type) => {
    setPrintView(type);
    setTimeout(() => {
      window.print();
      setPrintView(null);
    }, 500);
  };

  const handleExportExcel = () => {
    try {
      if (enhancedFilteredStudents.length === 0) {
        toast.error('لا توجد بيانات لتصديرها');
        return;
      }

      const rows = enhancedFilteredStudents.map((student, index) => {
        const isPresent = attendanceMap[student.id] || false;
        const paid = parseFloat(paymentsMap[student.id]) || 0;
        const required = calculateRequiredPayment(student, activeSession);
        const remaining = isPresent ? Math.max(0, required - paid) : 0;

        return {
          'م': index + 1,
          'اسم الطالب': student.name,
          'الكود': student.unique_id,
          'الصف الدراسي': student.grade || '-',
          'الحالة': isPresent ? 'حاضر' : 'غائب',
          'المطلوب': required.toFixed(2),
          'المدفوع': paid.toFixed(2),
          'المتبقي': remaining.toFixed(2),
          'نوع الاشتراك': (() => {
            const sub = (subscriptions || []).find(s => s.student_id === student.id && s.course_id === activeSession.course_id);
            let isMonthly = false;
            if (sub?.expires_at) {
              const expiryDate = new Date(sub.expires_at);
              expiryDate.setHours(23, 59, 59, 999);
              isMonthly = expiryDate >= new Date(activeSession.created_at);
            }

            if (student.is_free) return 'إعفاء كلي';
            if (student.free_courses?.includes(activeSession.course_id)) return 'إعفاء مادة';
            if (isMonthly) return 'اشتراك شهري';
            if (student.center_only_courses?.includes(activeSession.course_id)) return 'سنتر فقط';
            if (student.course_discounts?.[activeSession.course_id] > 0) return 'خصم خاص';
            return 'عادي';
          })(),
          'موبايل ولي الأمر': student.parent_phone || '-',
          'تاريخ الحصة': new Date(activeSession.created_at).toLocaleDateString('ar-EG')
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "حضور الحصة");

      // تنسيق العواميد
      ws['!cols'] = [
        { wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];

      XLSX.writeFile(wb, `كشف_حضور_${activeSession.topic}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('تم تصدير ملف الإكسل بنجاح! 🚀');
    } catch (error) {
      console.error('Export Error:', error);
      toast.error('حدث خطأ أثناء التصدير');
    }
  };

  // 🆕 حالة النافذة المنبثقة للإضافة السريعة
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newStudentData, setNewStudentData] = useState({ name: '', phone: '', parent_phone: '', discount: 0, is_free: false, has_wallet: false });
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [tempStudents, setTempStudents] = useState([]); // 🆕 temporary students list
  const [recentlyAddedStudentIds, setRecentlyAddedStudentIds] = useState([]); // 🆕 Track newly added students for sorting
  const [processingPayments, setProcessingPayments] = useState({});
  const [walletPrompt, setWalletPrompt] = useState({ visible: false, student: null, amount: 0 });

  // 🆕 دالة التحقق إذا الطالب في المجموعة الحالية
  const isStudentInCurrentGroup = (student) => {
    const studentGroups = student.group_ids || {};
    const currentGroupId = activeSession.group_id;
    const currentCourseId = activeSession.course_id;

    const isInGroup = studentGroups[currentCourseId] === currentGroupId;

    console.log('🔍 Group Check:', {
      studentName: student.name,
      studentGroups: studentGroups,
      currentGroupId: currentGroupId,
      currentCourseId: currentCourseId,
      isInGroup: isInGroup
    });

    return isInGroup;
  };

  // 🆕 Custom handler للـ scanner
  const handleCustomAttendance = (studentId) => {
    console.log('🔍 Custom attendance handler called:', studentId);

    // البحث في كل الطلاب (الأصليين + الجدد)
    const student = allStudents.find(s => s.id === studentId || s.unique_id === studentId);
    if (!student) {
      console.log('❌ Student not found:', studentId);
      return false;
    }

    console.log('✅ Student found:', student.name);

    // التحقق من المجموعة
    const isInGroup = isStudentInCurrentGroup(student);
    console.log('🔍 Student in current group:', isInGroup);

    if (!isInGroup) {
      console.log('❌ Student not in current group, skipping');
      return false;
    }

    // تسجيل الحضور
    handleAttendanceChange(studentId, true);
    console.log('✅ Attendance recorded for:', student.name);

    return true;
  };

  // 🆕 دمج الطلاب الأصليين مع الطلاب الجدد
  const allStudents = useMemo(() => {
    const merged = [...tempStudents, ...students];
    console.log('🔍 All Students:', merged.length);
    console.log('🔍 Temp Students:', tempStudents);
    console.log('🔍 Original Students:', students);

    // Debug: طباعة كل طالب مع بياناته
    merged.forEach(student => {
      console.log(`👤 Student: ${student.name}`, {
        id: student.id,
        unique_id: student.unique_id,
        group_ids: student.group_ids,
        is_temporary: student.is_temporary,
        isInCurrentGroup: isStudentInCurrentGroup(student)
      });
    });

    return merged;
  }, [tempStudents, students]);

  // 🆕 إضافة الـ custom handler للـ scanner
  useEffect(() => {
    // إرسال الـ custom handler للـ scanner
    if (typeof window !== 'undefined' && window.setCustomAttendanceHandler) {
      window.setCustomAttendanceHandler(handleCustomAttendance);
    }
  }, [handleCustomAttendance]);

  // 🆕 تحديث الـ students في useScanner
  useEffect(() => {
    if (typeof window !== 'undefined' && window.updateScannerStudents) {
      window.updateScannerStudents(allStudents);
    }
  }, [allStudents]);

  const course = courses?.find(c => c.id === activeSession.course_id);
  const group = groups?.find(g => g.id === activeSession.group_id);

  console.log('🔍 Course:', course);
  console.log('🔍 Group:', group);
  console.log('🔍 Active Session:', activeSession);
  console.log('🔍 All Groups:', groups);

  // 🆕 دالة التحقق من الطالب المكرر
  const checkDuplicateStudent = (name, phone) => {
    return students.find(s =>
      s.name.toLowerCase().trim() === name.toLowerCase().trim() ||
      (phone && s.phone === phone)
    );
  };

  // 🆕 دالة التحقق إذا الطالب مؤقت
  const isTemporaryStudent = (studentId) => {
    const tempStudent = tempStudents.find(s => s.id === studentId);
    console.log('Checking if student is temporary:', studentId, tempStudent);
    return tempStudent;
  };

  // 🆕 دالة معالجة الحضور للطلاب المؤقتين
  const handleTemporaryStudentAttendance = (studentId, isPresent) => {
    const tempStudent = isTemporaryStudent(studentId);
    if (tempStudent) {
      // للطلاب المؤقتين، نستخدم handleAttendanceChange عادي
      handleAttendanceChange(studentId, isPresent);
      return true;
    }
    return false;
  };

  // 🆕 دالة معالجة الدفع للطلاب المؤقتين
  const handleTemporaryStudentPayment = (studentId, amount) => {
    const tempStudent = isTemporaryStudent(studentId);
    if (tempStudent) {
      // للطلاب المؤقتين، نستخدم setPaymentsMap عادي
      setPaymentsMap(prev => ({ ...prev, [studentId]: amount.toString() }));
      return true;
    }
    return false;
  };

  // 🆕 دالة موحدة للتعامل مع الحضور (للطلاب المؤقتين والأصليين)
  const handleStudentAttendance = (studentId, isPresent, allowWalletAuto = true) => {
    // للطلاب المؤقتين، نستخدم setAttendanceMap مباشر
    if (isTemporaryStudent(studentId)) {
      console.log('Handling attendance for temporary student:', studentId, isPresent);
      setAttendanceMap(prev => ({ ...prev, [studentId]: isPresent }));
    } else {
      // للطلاب الأصليين، نستخدم handleAttendanceChange عادي
      handleAttendanceChange(studentId, isPresent, false, allowWalletAuto);
    }
  };

  // 🆕 دالة موحدة للتعامل مع الدفع (للطلاب المؤقتين والأصليين)
  const handleStudentPayment = (studentId, amount) => {
    // للطلاب المؤقتين، نستخدم setPaymentsMap مباشر
    if (isTemporaryStudent(studentId)) {
      console.log('Handling payment for temporary student:', studentId, amount);
      setPaymentsMap(prev => ({ ...prev, [studentId]: amount.toString() }));
    } else {
      // للطلاب الأصليين، نستخدم setPaymentsMap عادي
      setPaymentsMap(prev => ({ ...prev, [studentId]: amount.toString() }));
    }
  };

  // 🆕 التحقق إذا الطالب جديد في الكورس (باستخدام عمود is_new_in_course من الداتابيز)
  const isNewInCourse = useCallback((student, courseId) => {
    // الطالب جديد لو عليه علامة is_new_in_course في الداتابيز
    if (student.is_new_in_course) return true;

    // Fallback: لو مفيش العلم، نتحقق من enrollment_dates
    const enrollmentDates = student.enrollment_dates || {};
    const enrollmentDate = enrollmentDates[courseId];

    if (!enrollmentDate) return false;

    const enrolled = new Date(enrollmentDate);
    const today = new Date();
    const diffInDays = Math.floor((today - enrolled) / (1000 * 60 * 60 * 24));

    // لو سجل من أقل من يوم يبقى جديد
    return diffInDays < 1;
  }, []);

  const enhancedFilteredStudents = useMemo(() => {
    let filtered = filteredStudents;

    // 🆕 دمج الطلاب الأصليين مع الطلاب الجدد
    const allStudentsForFilter = [...tempStudents, ...filtered];

    console.log('🔍 Enhanced Filter - Before:', filtered.length);
    console.log('🔍 Enhanced Filter - All Students:', allStudentsForFilter.length);

    // تطبيق الفلتر
    filtered = allStudentsForFilter.filter(student => {
      const isPresent = attendanceMap[student.id];

      switch (filterType) {
        case 'present': return isPresent;
        case 'absent': return !isPresent;
        case 'paid':
          if (student.is_free) return isPresent;
          const paidAmount = parseFloat(paymentsMap[student.id]) || 0;
          const paidRequired = calculateRequiredPayment(student, activeSession);
          return paidAmount >= paidRequired;
        case 'unpaid':
          if (student.is_free) return false;
          const unpaidAmount = parseFloat(paymentsMap[student.id]) || 0;
          const unpaidRequired = calculateRequiredPayment(student, activeSession);
          return isPresent && unpaidAmount < unpaidRequired;
        case 'exempt': return (student.is_free || student.free_courses?.includes(activeSession.course_id)) && isPresent;
        case 'monthly': {
          const sub = (subscriptions || []).find(sub => sub.student_id === student.id && sub.course_id === activeSession.course_id);
          return isPresent && sub?.expires_at && new Date(sub.expires_at) > new Date();
        }
        case 'centerOnly': return isPresent && student.center_only_courses?.includes(activeSession.course_id);
        case 'discount':
          // طالب عليه خصم: مش معفى وعليه خصم في الكورس الحالي
          const sub = (subscriptions || []).find(sub => sub.student_id === student.id && sub.course_id === activeSession.course_id);
          const isMonthly = sub?.expires_at && new Date(sub.expires_at) > new Date();
          return !student.is_free && !student.free_courses?.includes(activeSession.course_id) && !student.center_only_courses?.includes(activeSession.course_id) && !isMonthly && (student.course_discounts?.[activeSession.course_id] > 0) && isPresent;
        case 'new': return isPresent && isNewInCourse(student, activeSession.course_id);
        default: return true;
      }
    });

    console.log('🔍 Enhanced Filter - After:', filtered.length);

    // 🆕 ترتيب الطلاب: الجدد (المؤقتين أو المضافين حديثاً) في الأول
    // 🆕 ترتيب الطلاب: الجدد في الأول، وبعدهم الأحدث حضوراً
    // 🆕 تجهيز قاموس سريع جداً لترتيب الحضور (عشان الـ Performance تفضل 100%)
    const attendanceOrderMap = new Map();
    attendanceOrder.forEach((id, index) => {
      attendanceOrderMap.set(id, index);
    });

    // ترتيب الطلاب
    filtered.sort((a, b) => {
      // 1. أولوية للطلاب الجدد
      const aIsNew = tempStudents.some(s => s.id === a.id) || recentlyAddedStudentIds.includes(a.id);
      const bIsNew = tempStudents.some(s => s.id === b.id) || recentlyAddedStudentIds.includes(b.id);
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;

      // 2. أولوية للي لسه مسجل حضور حالاً (سحب مباشر من القاموس السريع)
      const indexA = attendanceOrderMap.has(a.id) ? attendanceOrderMap.get(a.id) : -1;
      const indexB = attendanceOrderMap.has(b.id) ? attendanceOrderMap.get(b.id) : -1;

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return 0;
    });

    return filtered;
    // 👇 ركز هنا جداً: لازم تضيف attendanceOrder بين القوسين دول عشان الجدول يحس بالتغيير
  }, [filteredStudents, tempStudents, recentlyAddedStudentIds, attendanceMap, paymentsMap, filterType, activeSession, calculateRequiredPayment, isNewInCourse, attendanceOrder]);

  const [attendanceHistory, setAttendanceHistory] = useState([]);



  useEffect(() => {
    if (!attendanceMap) return;
    const currentAttendedIds = Object.keys(attendanceMap).filter(id => attendanceMap[id]);

    setAttendanceHistory(prev => {
      let newHistory = [...prev];
      let changed = false;

      currentAttendedIds.forEach(id => {
        if (!newHistory.includes(id)) {
          newHistory.unshift(id);
          changed = true;
        }
      });

      const filteredHistory = newHistory.filter(id => currentAttendedIds.includes(id));
      if (filteredHistory.length !== newHistory.length) changed = true;

      return changed ? filteredHistory : prev;
    });
  }, [attendanceMap]);

  // 2️⃣ إنشاء القائمة المترتبة النهائية
  const sortedStudentsForDisplay = useMemo(() => {
    if (!enhancedFilteredStudents) return [];

    return [...enhancedFilteredStudents].sort((a, b) => {
      const indexA = attendanceHistory.indexOf(a.id);
      const indexB = attendanceHistory.indexOf(b.id);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB; // الاتنين حضروا -> رتب بالأحدث
      if (indexA !== -1) return -1; // الأول حضر -> طلعه فوق
      if (indexB !== -1) return 1;  // التاني حضر -> طلعه فوق
      return 0; // محدش حضر -> سيبهم زي ما هما
    });
  }, [enhancedFilteredStudents, attendanceHistory]);

  // 🆕 Pagination Logic
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return enhancedFilteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [enhancedFilteredStudents, currentPage]);

  const totalPages = Math.ceil(enhancedFilteredStudents.length / PAGE_SIZE);

  // 🔄 Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, modalSearchTerm]);

  // 🆕 Auto Save Logic
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const autoSaveTimeoutRef = useRef(null);

  // 🆕 Auto Save Effect - يحفظ بعد أي تغيير مهم بس
  useEffect(() => {
    if (!autoSaveEnabled || !activeSession) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔥 Auto-Save: Triggering automatic save...');
        await saveLedger(true); // silent save
        setLastSaveTime(new Date());
        console.log('✅ Auto-Save: Completed successfully');
      } catch (error) {
        console.error('❌ Auto-Save: Failed:', error);
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    // 🆕 التغييرات المهمة بس
    attendanceMap,           // تغيير الحضور (مهم)
    paymentsMap,             // تغيير المدفوعات (مهم)
    tempStudents,            // إضافة طالب جديد (مهم)
    autoSaveEnabled,         // تغيير في الـ auto-save (مهم)
    activeSession?.id        // تغيير في الحصة (مهم)
  ]);

  // 🆕 Auto Save Effect - يحفظ بعد أي تغيير مهم بس
  useEffect(() => {
    if (!autoSaveEnabled || !activeSession) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔥 Auto-Save: Real change detected, saving...');
        await saveLedger(true); // silent save
        setLastSaveTime(new Date());
        console.log('✅ Auto-Save: Completed successfully');
      } catch (error) {
        console.error('❌ Auto-Save: Failed:', error);
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    // 🆕 التغييرات المهمة بس
    attendanceMap,           // تغيير الحضور (مهم)
    paymentsMap,             // تغيير المدفوعات (مهم)
    tempStudents,            // إضافة طالب جديد (مهم)
    autoSaveEnabled,         // تغيير في الـ auto-save (مهم)
    activeSession?.id        // تغيير في الحصة (مهم)
  ]);

  // 🆕 Manual Auto-Save Trigger
  const triggerAutoSave = useCallback(async () => {
    if (!autoSaveEnabled || !activeSession) return;

    try {
      console.log('🔥 Auto-Save: Manual trigger...');
      await saveLedger(true);
      setLastSaveTime(new Date());
      console.log('✅ Auto-Save: Manual save completed');
    } catch (error) {
      console.error('❌ Auto-Save: Manual save failed:', error);
    }
  }, [autoSaveEnabled, activeSession, saveLedger]);

  // 🆕 Trigger Auto-Save بعد أي عملية مهمة
  const triggerAutoSaveAfterOperation = useCallback(async () => {
    if (!autoSaveEnabled || !activeSession) return;

    // انتظر شوية عشان الـ state يتحدث
    setTimeout(async () => {
      try {
        console.log('🔥 Auto-Save: Triggering after operation...');
        await saveLedger(true);
        setLastSaveTime(new Date());
        console.log('✅ Auto-Save: Post-operation save completed');
      } catch (error) {
        console.error('❌ Auto-Save: Post-operation save failed:', error);
      }
    }, 500);
  }, [autoSaveEnabled, activeSession, saveLedger]);

  // 🆕 Toggle Auto-Save
  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled(prev => {
      const newState = !prev;
      console.log('🔍 Auto-Save:', newState ? 'Enabled' : 'Disabled');

      // 🆕 Trigger Auto-Save بعد تغيير الـ auto-save
      if (newState) {
        setTimeout(() => {
          triggerAutoSaveAfterOperation();
        }, 100);
      }

      return newState;
    });
  }, [triggerAutoSaveAfterOperation]);

  const enhancedStats = useMemo(() => {
    // 🆕 دمج الطلاب الأصليين مع الطلاب الجدد للإحصائيات بس
    const allStudentsForStats = [...tempStudents, ...filteredStudents];

    const present = allStudentsForStats.filter(s => attendanceMap[s.id]).length;
    const absent = allStudentsForStats.filter(s => !attendanceMap[s.id]).length;
    const paid = allStudentsForStats.filter(s => {
      const isPresent = attendanceMap[s.id] || false;

      // الطالب المعفي يعتبر "دافع" لما يحضر بس
      if (s.is_free) {
        console.log('Exempt student present:', s.name, isPresent);
        return isPresent;
      }

      const paid = parseFloat(paymentsMap[s.id]) || 0;
      const required = calculateRequiredPayment(s, activeSession);
      return paid >= required;
    }).length;
    const unpaid = allStudentsForStats.filter(s => {
      const isPresent = attendanceMap[s.id] || false;
      if (!isPresent || s.is_free) return false;

      const paid = parseFloat(paymentsMap[s.id]) || 0;
      const required = calculateRequiredPayment(s, activeSession);
      return paid < required;
    }).length;

    const exempt = allStudentsForStats.filter(s => {
      return s.is_free && attendanceMap[s.id];
    }).length;

    const discount = allStudentsForStats.filter(s => {
      // طالب عليه خصم (ليس معفى وعليه خصم في الكورس الحالي)
      return !s.is_free && (s.course_discounts?.[activeSession.course_id] > 0) && attendanceMap[s.id];
    }).length;

    const newStudents = allStudentsForStats.filter(s => {
      // طالب جديد في الكورس (حاضر وجديد في الكورس ده)
      return attendanceMap[s.id] && isNewInCourse(s, activeSession.course_id);
    }).length;

    const monthlyCount = allStudentsForStats.filter(s => {
      const sub = (subscriptions || []).find(sub => sub.student_id === s.id && sub.course_id === activeSession.course_id);
      return attendanceMap[s.id] && sub?.expires_at && new Date(sub.expires_at) > new Date();
    }).length;

    const centerOnlyCount = allStudentsForStats.filter(s => {
      return attendanceMap[s.id] && s.center_only_courses?.includes(activeSession.course_id);
    }).length;

    const exemptCourseCount = allStudentsForStats.filter(s => {
      return attendanceMap[s.id] && s.free_courses?.includes(activeSession.course_id);
    }).length;

    return {
      total: allStudentsForStats.length,
      present,
      absent,
      paid,
      unpaid,
      exempt,
      discount,
      new: newStudents,
      monthly: monthlyCount,
      centerOnly: centerOnlyCount,
      exemptCourse: exemptCourseCount
    };
  }, [filteredStudents, tempStudents, attendanceMap, paymentsMap, activeSession, calculateRequiredPayment, isNewInCourse]);

  const tabStats = useMemo(() => enhancedStats, [enhancedStats]);

  // 🆕 دالة التحقق من مستوى الكورس
  const checkCourseLevelCompatibility = (student, targetCourseId) => {
    const targetCourse = courses?.find(c => c.id === targetCourseId);
    if (!targetCourse || !targetCourse.grade) return { compatible: true }; // لو مفيش grade، نسمح

    // لو الطالب مش عنده grade، نسمح
    if (!student.grade) return { compatible: true };

    // تحويل المستويات لأرقام للمقارنة
    const getGradeLevel = (grade) => {
      const gradeMap = {
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
        '7': 7, '8': 8, '9': 9, '10': 10, '11': 11, '12': 12,
        '1st': 1, '2nd': 2, '3rd': 3,
        'primary': 6, 'prep': 9, 'secondary': 12,
        'ابتدائي': 6, 'إعدادي': 9, 'ثانوي': 12,
        'أولى ابتدائي': 1, 'ثانية ابتدائي': 2, 'ثالثة ابتدائي': 3,
        'رابعة ابتدائي': 4, 'خامسة ابتدائي': 5, 'سادسة ابتدائي': 6,
        'أولى إعدادي': 7, 'ثانية إعدادي': 8, 'ثالثة إعدادي': 9,
        'أولى ثانوي': 10, 'ثانية ثانوي': 11, 'ثالثة ثانوي': 12,
        'صف أول ثانوي': 10, 'صف ثاني ثانوي': 11, 'صف ثالث ثانوي': 12,
        'الصف الأول الثانوي': 10, 'الصف الثاني الثانوي': 11, 'الصف الثالث الثانوي': 12,
        ' الصف الأول الثانوي': 10, ' الصف الثاني الثانوي': 11, ' الصف الثالث الثانوي': 12,
        'اول ثانوي': 10, 'ثان ثانوي': 11, 'ثالث ثانوي': 12
      };

      // نظف النص من spaces و normalize
      const cleanGrade = grade?.toString().trim().toLowerCase();

      // لو رقم مباشر
      if (!isNaN(cleanGrade)) return parseInt(cleanGrade);

      // لو نص
      return gradeMap[cleanGrade] || 0;
    };

    const studentGrade = getGradeLevel(student.grade);
    const courseGrade = getGradeLevel(targetCourse.grade);

    console.log('Grade Check:', {
      studentGrade: student.grade,
      courseGrade: targetCourse.grade,
      studentLevel: studentGrade,
      courseLevel: courseGrade
    });

    // لو مستوى الطالب مختلف عن مستوى الكورس
    if (studentGrade > 0 && courseGrade > 0 && studentGrade !== courseGrade) {
      return {
        compatible: false,
        message: `⚠️ لا يمكن إضافة الطالب لهذا الكورس!\n\n` +
          `مستوى الطالب: ${student.grade}\n` +
          `مستوى الكورس: ${targetCourse.grade}\n\n` +
          `يجب أن يكون مستوى الطالب مطابقًا لمستوى الكورس.`
      };
    }

    return { compatible: true };
  };
  const findStudentById = (studentId) => {
    return students.find(s =>
      s.unique_id === studentId ||
      s.id === studentId ||
      s.phone === studentId
    );
  };

  // 🆕 دالة توليد كود طالب جديد
  const generateStudentCode = () => {
    // نبدأ من 5027 ونزود كل مرة
    const lastCode = 5027;
    const newCodeNumber = lastCode + Math.floor(Math.random() * 1000);
    return `S-${newCodeNumber}`;
  };

  // 🆕 متغير عشان نعرف آخر كود استخدمناه (لو محتجيناه)
  let lastUsedCode = 5027;
  const handleBarcodeOrIdSearch = (studentId) => {
    const student = findStudentById(studentId);

    if (!student) {
      toast.error('❌ الطالب غير موجود في السنتر');
      return;
    }

    // 🆕 التحقق من مستوى الكورس
    const compatibilityCheck = checkCourseLevelCompatibility(student, activeSession.course_id);
    if (!compatibilityCheck.compatible) {
      toast.error('❌ ' + compatibilityCheck.message);
      return;
    }

    // التحقق من الكورس الحالي
    const existsInCurrentCourse = student.enrolled_courses?.includes(activeSession.course_id);

    if (existsInCurrentCourse) {
      // السيناريو 3: الطالب موجود في نفس الكورس
      scrollToStudent(student.id);
      handleAttendanceChange(student.id, true);
      toast.success(`✅ تم تسجيل حضور الطالب: ${student.name} (${student.unique_id})`);
      // 🆕 إضافة الطالب لقائمة الجدد للترتيب
      setRecentlyAddedStudentIds(prev => [student.id, ...prev]);
    } else {
      // السيناريو 2: الطالب موجود في كورس تاني
      const courseNames = student.enrolled_courses?.map(id => courses.find(c => c.id === id)?.name || id).join(', ') || 'لا يوجد';

      const toastId = toast(
        <div className="text-right" dir="rtl">
          <p className="font-bold mb-2">⚠️ الطالب موجود بالفعل في السنتر</p>
          <p>الاسم: {student.name}</p>
          <p>الكود: {student.unique_id}</p>
          <p>المستوى: {student.grade || 'غير محدد'}</p>
          <p>الكورسات الحالية: {courseNames}</p>
          <p className="mt-2 font-bold">هل تريد إضافته لكورس "{course?.name}"؟</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                toast.dismiss(toastId);
                // 🆕 إضافة الطالب لقائمة الجدد للترتيب
                setRecentlyAddedStudentIds(prev => [student.id, ...prev]);
                addExistingStudentToNewCourse(student);
              }}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700"
            >
              ✅ نعم، أضفه
            </button>
            <button
              onClick={() => toast.dismiss(toastId)}
              className="bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-400"
            >
              ❌ إلغاء
            </button>
          </div>
        </div>,
        {
          duration: 10000,
          icon: '⚠️'
        }
      );
    }
  };
  const addExistingStudentToNewCourse = async (student) => {
    try {
      // 🆕 التحقق من مستوى الكورس قبل الإضافة
      const compatibilityCheck = checkCourseLevelCompatibility(student, activeSession.course_id);
      if (!compatibilityCheck.compatible) {
        toast.error('❌ ' + compatibilityCheck.message);
        return;
      }
      // 1. تحديث بيانات الطالب في الداتابيز
      const updatedEnrolledCourses = [...(student.enrolled_courses || []), activeSession.course_id];
      const updatedEnrollmentDates = {
        ...student.enrollment_dates,
        [activeSession.course_id]: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('students')
        .update({
          enrolled_courses: updatedEnrolledCourses,
          enrollment_dates: updatedEnrollmentDates
        })
        .eq('id', student.id);

      if (updateError) throw updateError;

      // 6. تحديث الحصة
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('attendees, payments')
        .eq('id', activeSession.id)
        .single();

      console.log('Current Session Data:', sessionData);
      console.log('New Student ID:', student.id);

      const newAttendees = Array.from(
        new Set([...(sessionData?.attendees || []), student.id])
      );

      console.log('New Attendees:', newAttendees);

      await supabase
        .from('sessions')
        .update({ attendees: newAttendees })
        .eq('id', activeSession.id);

      // 🆕 تحديث بيانات الطالب في الداتابيز مع علامة جديد في الكورس
      const { error: studentUpdateError } = await supabase
        .from('students')
        .update({
          enrolled_courses: updatedEnrolledCourses,
          enrollment_dates: updatedEnrollmentDates,
          is_new_in_course: true,
          group_ids: { ...student.group_ids, [activeSession.course_id]: activeSession.group_id }
        })
        .eq('id', student.id);

      if (studentUpdateError) {
        console.error('Error updating student in database:', studentUpdateError);
        toast.error('❌ حدث خطأ في تحديث بيانات الطالب في الداتابيز');
        return;
      }

      console.log('✅ Student updated in database successfully');

      // 🆕 تحديث الـ state فوراً
      setStudents(prev => prev.map(s =>
        s.id === student.id
          ? {
            ...s,
            enrolled_courses: updatedEnrolledCourses,
            enrollment_dates: updatedEnrollmentDates,
            is_new_in_course: true, // 🆕 علامة إنه طالب جديد في الكورس
            group_ids: { ...s.group_ids, [activeSession.course_id]: activeSession.group_id }
          }
          : s
      ));

      // 🆕 إزالة الطالب من tempStudents بعد التحديث
      setTempStudents(prev => prev.filter(s => s.id !== student.id));

      // 🆕 حساب المبلغ المطلوب وتسجيل الدفع
      let requiredAmount = 0;
      if (!student.is_free) {
        requiredAmount = calculateRequiredPayment(student, activeSession);
      }

      console.log('🔍 Required Amount for existing student:', requiredAmount);

      // 🆕 تسجيل الدفع في الحصة لو فيه مبلغ مطلوب
      if (requiredAmount > 0) {
        const { data: sessionDataForPayment } = await supabase
          .from('sessions')
          .select('payments')
          .eq('id', activeSession.id)
          .single();

        const currentPayments = sessionDataForPayment?.payments || {};
        const updatedPayments = {
          ...currentPayments,
          [student.id]: requiredAmount
        };

        await supabase
          .from('sessions')
          .update({ payments: updatedPayments })
          .eq('id', activeSession.id);

        // 🆕 تحديث الـ paymentsMap في الـ state
        setPaymentsMap(prev => ({ ...prev, [student.id]: requiredAmount }));

        // 🆕 تحديث محفظة الطالب لو معاه محفظة
        if (student.has_wallet) {
          const { data: currentStudent } = await supabase
            .from('students')
            .select('wallet_balance')
            .eq('id', student.id)
            .single();

          const currentBalance = currentStudent?.wallet_balance || 0;
          const newBalance = currentBalance - requiredAmount;

          await supabase
            .from('students')
            .update({ wallet_balance: newBalance })
            .eq('id', student.id);
        }
      }

      // 4. تسجيل الحضور
      setAttendanceMap(prev => ({ ...prev, [student.id]: true }));

      // 🆕 إضافة الطالب لقائمة الجدد للترتيب
      setRecentlyAddedStudentIds(prev => [student.id, ...prev]);

      // 🆕 Trigger Auto-Save بعد تسجيل الحضور
      triggerAutoSaveAfterOperation();

      // 5. التركيز على الطالب وبعدها إقفال مودال التسجيل
      scrollToStudent(student.id);

      toast.success(`✅ تم بنجاح:\n1. إضافة الطالب: ${student.name}\n2. لكورس: ${course?.name}\n3. تسجيل الحضور\n${requiredAmount > 0 ? `4. تسجيل دفع ${requiredAmount} ج` : ''}`);
      duration: 4000,

        setShowQuickAdd(false); // ده هيقفل المودال فوراً حتى لو كنت بتسجل بالباركود
      setNewStudentData({ name: '', phone: '', parent_phone: '', discount: 0, is_free: false, has_wallet: false });

    } catch (error) {
      console.error("Error adding student to course:", error);
      toast.error('❌ حدث خطأ أثناء إضافة الطالب للكورس: ' + error.message);
    }
  };

  // 🟢 دالة إضافة طالب جديد (السيناريوهات الثلاثة + معالجة الأخوات والتكرار الخاطئ)
  const handleQuickAddStudent = async () => {
    if (!newStudentData.name.trim()) {
      toast.error('❌ يرجى إدخال اسم الطالب');
      return;
    }

    // 1️⃣ نبحث بالاسم الأول
    const nameMatchStudent = students.find(s =>
      s.name.toLowerCase().trim() === newStudentData.name.toLowerCase().trim()
    );

    // 2️⃣ نفصل البحث: رقم الطالب لوحده، ورقم ولي الأمر لوحده عشان نحدد نوع التكرار
    const studentPhoneMatch = newStudentData.phone ? students.find(s => s.phone === newStudentData.phone) : null;
    const parentPhoneMatch = newStudentData.parent_phone ? students.find(s => s.parent_phone === newStudentData.parent_phone) : null;

    let existingStudentInCenter = nameMatchStudent;

    // 3️⃣ التحقق الذكي: لو الاسم مختلف بس في رقم متكرر (طالب أو ولي أمر)
    if (!existingStudentInCenter && (studentPhoneMatch || parentPhoneMatch)) {
      const matchedStudent = studentPhoneMatch || parentPhoneMatch;
      const isStudentPhoneDuplicate = !!studentPhoneMatch; // عشان نعرف التكرار في رقم الطالب ولا ولي الأمر

      const userChoice = await new Promise((resolve) => {
        toast.custom((t) => (
          <div className={`bg-white p-5 rounded-3xl shadow-2xl border-2 ${isStudentPhoneDuplicate ? 'border-red-100' : 'border-blue-100'} max-w-sm w-full animate-fade-in`} dir="rtl">
            <div className="flex items-center gap-3 mb-3">
              <div className={`${isStudentPhoneDuplicate ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'} w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0`}>
                {isStudentPhoneDuplicate ? '⚠️' : '👨‍👩‍👧‍👦'}
              </div>
              <h3 className="text-sm font-black text-gray-800">
                {isStudentPhoneDuplicate ? 'تحذير: رقم الطالب الشخصي متكرر!' : 'رقم ولي أمر مسجل مسبقاً!'}
              </h3>
            </div>

            <p className="text-xs text-gray-600 mb-2 font-bold leading-relaxed">
              هذا الرقم مسجل بالفعل باسم الطالب: <span className={`${isStudentPhoneDuplicate ? 'text-red-600' : 'text-blue-600'} text-sm`}>{matchedStudent.name}</span>
            </p>

            <p className="text-xs text-gray-800 mb-4 font-bold bg-gray-50 p-2 rounded-lg">
              {isStudentPhoneDuplicate
                ? `من غير المنطقي تطابق رقم الطالب! هل تقصد نفس الطالب "${matchedStudent.name}" وتم كتابة الاسم بشكل مختلف؟ أم أنه خطأ في إدخال الرقم؟`
                : `هل المضاف حالياً "${newStudentData.name}" طالب جديد (أخ/أخت) لـ "${matchedStudent.name}" أم أنه نفس الطالب القديم؟`
              }
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => { toast.dismiss(t.id); resolve('SAME_STUDENT'); }}
                className="w-full bg-blue-50 text-blue-700 py-2.5 border border-blue-200 rounded-xl text-xs font-black hover:bg-blue-100 transition"
              >
                🔄 نعم، هو نفس الطالب القديم
              </button>

              <button
                onClick={() => { toast.dismiss(t.id); resolve('NEW_STUDENT'); }}
                className={`w-full ${isStudentPhoneDuplicate ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-500 text-white shadow-sm hover:bg-green-600'} py-2.5 rounded-xl text-xs font-black transition`}
              >
                {isStudentPhoneDuplicate ? '⚠️ تجاهل وإضافة كطالب جديد برقم مكرر' : '✅ إضافة كطالب جديد (أخ/أخت)'}
              </button>

              <button
                onClick={() => { toast.dismiss(t.id); resolve('CANCEL'); }}
                className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl text-xs font-black hover:bg-gray-200 transition"
              >
                ❌ إلغاء لمراجعة الأرقام
              </button>
            </div>
          </div>
        ), { duration: Infinity, position: 'top-center' });
      });

      if (userChoice === 'CANCEL') return;
      if (userChoice === 'SAME_STUDENT') existingStudentInCenter = matchedStudent;
      if (userChoice === 'NEW_STUDENT') existingStudentInCenter = null;
    }

    if (existingStudentInCenter) {
      // 🆕 التحقق إذا الطالب موجود في الكورس الحالي (السيناريو 3)
      const existsInCurrentCourse = existingStudentInCenter.enrolled_courses?.includes(activeSession.course_id);

      if (existsInCurrentCourse) {
        // السيناريو 3: الطالب موجود في نفس الكورس
        scrollToStudent(existingStudentInCenter.id);
        handleAttendanceChange(existingStudentInCenter.id, true);
        toast.success('✅ الطالب موجود بالفعل في هذا الكورس وتم تسجيل حضوره');
        // 🆕 إضافة الطالب لقائمة الجدد للترتيب
        setRecentlyAddedStudentIds(prev => [existingStudentInCenter.id, ...prev]);
        setTimeout(() => setShowQuickAdd(false), 100); // 🆕 إقفال مودال التسجيل بعد تأخير بسيط
        return;
      } else {
        // السيناريو 2: الطالب موجود في كورس تاني
        const courseNames = existingStudentInCenter.enrolled_courses?.map(id => courses.find(c => c.id === id)?.name || id).join(', ') || 'لا يوجد';

        const toastId = toast(
          <div className="text-right" dir="rtl">
            <p className="font-bold mb-2">⚠️ الطالب موجود بالفعل في السنتر</p>
            <p>الاسم: {existingStudentInCenter.name}</p>
            <p>الكود: {existingStudentInCenter.unique_id}</p>
            <p>الكورسات الحالية: {courseNames}</p>
            <p className="mt-2 font-bold">هل تريد إضافته لكورس "{course?.name}"؟</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  toast.dismiss(toastId);
                  setTimeout(() => setShowQuickAdd(false), 100); // 🆕 إقفال مودال التسجيل بعد تأخير بسيط
                  // 🆕 إضافة الطالب لقائمة الجدد للترتيب
                  setRecentlyAddedStudentIds(prev => [existingStudentInCenter.id, ...prev]);
                  addExistingStudentToNewCourse(existingStudentInCenter);
                }}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700"
              >
                ✅ نعم، أضفه
              </button>
              <button
                onClick={() => toast.dismiss(toastId)}
                className="bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-400"
              >
                ❌ إلغاء
              </button>
            </div>
          </div>,
          {
            duration: 10000,
            icon: '⚠️'
          }
        );
        return;
      }
    }

    // 🆕 السيناريو 1: طالب جديد في السنتر (مش موجود خالص)
    setIsAddingStudent(true);
    try {
      console.log('New Student Check:', {
        courseGrade: course?.grade,
        courseId: activeSession.course_id
      });

      // 🆕 التحقق من مستوى الكورس للطالب الجديد
      const compatibilityCheck = checkCourseLevelCompatibility(
        { grade: course?.grade }, // نستخدم grade الكورس كـ grade الطالب الجديد
        activeSession.course_id
      );
      console.log('Compatibility Result:', compatibilityCheck);

      if (!compatibilityCheck.compatible) {
        toast.error('❌ ' + compatibilityCheck.message);
        setIsAddingStudent(false);
        return;
      }
      // جلب الموظف الحالي
      const { data: { user } } = await supabase.auth.getUser();

      // 2. توليد كود
      const uniqueId = generateStudentCode();
      console.log('Generated Student Code:', uniqueId);

      // 3. تجهيز بيانات الطالب
      const studentPayload = {
        name: newStudentData.name.trim(),
        phone: newStudentData.phone,
        parent_phone: newStudentData.parent_phone,
        unique_id: uniqueId,
        grade: course?.grade || null,
        center_id: activeSession.center_id,
        enrolled_courses: [activeSession.course_id],
        enrollment_dates: { [activeSession.course_id]: new Date().toISOString() },
        is_new_in_course: true,
        is_active: false,
        group_ids: { [activeSession.course_id]: activeSession.group_id },
        course_discounts: newStudentData.discount > 0 ? { [activeSession.course_id]: newStudentData.discount } : {},

        // التحكم في المحفظة بناءً على اختيار المستخدم
        has_wallet: newStudentData.has_wallet,
        wallet_balance: 0,
        is_free: newStudentData.is_free || false,
      };

      console.log('Student Payload:', studentPayload);
      console.log('Active Session:', activeSession);

      // 4. الحفظ في الداتابيز
      const { data: savedStudent, error: studentError } = await supabase
        .from('students')
        .insert([studentPayload])
        .select()
        .single();

      if (studentError) throw studentError;

      // 5. حساب المبلغ المطلوب
      let requiredAmount = 0;
      if (!savedStudent.is_free) {
        const studentForCalc = { ...savedStudent, is_temporary: false };
        requiredAmount = calculateRequiredPayment(studentForCalc, activeSession);
      }

      console.log('🔍 Required Amount:', requiredAmount);
      console.log('🔍 Student is_free:', savedStudent.is_free);
      console.log('🔍 Student has_wallet:', savedStudent.has_wallet);
      console.log('🔍 Student discount:', newStudentData.discount);
      console.log('🔍 Session price:', activeSession.price);

      // =========================================================================
      // 🚀 تطبيق منطق التحقق (Debt Guard Logic) قبل تسجيل الحضور
      // =========================================================================

      // حساب المديونية الكلية للطالب الجديد (هنا هتكون 0 طبعاً، بس عشان لو في منطق مستقبلي)
      const totalDebt = 0;
      const debtLimit = centerConfig?.debt_limit || 300;

      // لو عليه مديونية (نظرياً) وهو بيسجل
      if (totalDebt >= debtLimit && !isAutoMode) {
        // تشغيل صوت التنبيه
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });

        const confirmMsg = `🛑 تنبيه هام: السياسات المالية\n\n` +
          `الطالب: ${savedStudent.name}\n` +
          `إجمالي المديونية: ${totalDebt} ج\n` +
          `الحد المسموح: ${debtLimit} ج\n\n` +
          `هل تريد تجاوز المنع وتسجيل الحضور؟`;

        // لو رفض، هنوقف عملية تسجيل الحضور والدفع، بس الطالب خلاص اتكريت
        if (!confirm(confirmMsg)) {
          toast.info(`ℹ️ تم إنشاء الطالب ${savedStudent.name} ولكن لم يتم تسجيل الحضور بسبب المديونية.`);
          setTempStudents(prev => [{ ...savedStudent, is_temporary: false }, ...prev]);
          setIsAddingStudent(false);
          setShowQuickAdd(false);
          return;
        }
      }
      // =========================================================================

      // 6. تنفيذ العمليات المالية وتحديث الحصة
      const updates = [];

      // أ) لو فيه فلوس وهيدفع (ومعاه محفظة)
      if (requiredAmount > 0 && savedStudent.has_wallet) {
        console.log('🔍 Wallet Logic: Student has wallet and required amount > 0');
        console.log('🔍 Wallet Logic: Deducting', requiredAmount, 'from wallet');

        updates.push(
          supabase.from('wallet_transactions').insert({
            student_id: savedStudent.id,
            amount: -requiredAmount,
            type: 'session_payment',
            description: `حضور حصة: ${activeSession.topic}`,
            created_by: user?.id,
            balance_after: -requiredAmount, // هيتسجل عليه بالسالب
            created_at: new Date().toISOString()
          })
        );

        // تحديث رصيد الطالب في جدول الطلاب
        updates.push(
          supabase.from('students')
            .update({ wallet_balance: -requiredAmount })
            .eq('id', savedStudent.id)
        );
      } else {
        console.log('🔍 Wallet Logic: No wallet deduction needed');
        console.log('🔍 Wallet Logic: requiredAmount:', requiredAmount, 'has_wallet:', savedStudent.has_wallet);
      }

      // 6. تحديث الحصة
      const { data: currentSessionData } = await supabase
        .from('sessions')
        .select('attendees, payments')
        .eq('id', activeSession.id)
        .single();

      console.log('Current Session Data:', currentSessionData);
      console.log('New Student ID:', savedStudent.id);

      const newAttendees = [...(currentSessionData?.attendees || []), savedStudent.id];
      const newPayments = { ...(currentSessionData?.payments || {}) };

      console.log('🔍 Payment Logic: Student is_free:', savedStudent.is_free);
      console.log('🔍 Payment Logic: Required amount:', requiredAmount);

      if (requiredAmount > 0) {
        newPayments[savedStudent.id] = requiredAmount;
        console.log('🔍 Payment Logic: Added payment for student:', savedStudent.id, 'amount:', requiredAmount);
      } else {
        console.log('🔍 Payment Logic: No payment needed (free student or zero amount)');
      }

      console.log('New Attendees:', newAttendees);
      console.log('New Payments:', newPayments);

      updates.push(
        supabase.from('sessions')
          .update({
            attendees: newAttendees,
            payments: newPayments
          })
          .eq('id', activeSession.id)
      );

      await Promise.all(updates);

      // 🆕 تسجيل الحضور فوراً (قبل أي تحديث للـ state عشان الإحصائيات)
      console.log('🔍 Registering attendance for new student:', savedStudent.name);
      setAttendanceMap(prev => ({ ...prev, [savedStudent.id]: true }));
      if (requiredAmount > 0) {
        setPaymentsMap(prev => ({ ...prev, [savedStudent.id]: requiredAmount }));
      }

      // 🆕 حفظ الحضور في الداتابيز
      handleAttendanceChange(savedStudent.id, true);

      // 7. تحديث الواجهة
      const studentForDisplay = {
        ...savedStudent,
        is_temporary: false,
        is_new_in_course: true, // 🆕 علامة إنه طالب جديد في الكورس
        wallet_balance: savedStudent.has_wallet ? -requiredAmount : 0,
        group_ids: { ...savedStudent.group_ids, [activeSession.course_id]: activeSession.group_id }
      };

      console.log('Student for Display:', studentForDisplay);
      console.log('Group IDs:', studentForDisplay.group_ids);
      console.log('Current Group ID:', activeSession.group_id);

      setTempStudents(prev => [studentForDisplay, ...prev]);

      // 🆕 تحديث الداتابيز للطالب الجديد
      console.log('🔍 Updating new student in database:', {
        studentId: savedStudent.id,
        group_ids: { ...savedStudent.group_ids, [activeSession.course_id]: activeSession.group_id },
        wallet_balance: savedStudent.has_wallet ? -requiredAmount : 0
      });

      const { error: newStudentUpdateError } = await supabase
        .from('students')
        .update({
          group_ids: { ...savedStudent.group_ids, [activeSession.course_id]: activeSession.group_id },
          wallet_balance: savedStudent.has_wallet ? -requiredAmount : 0
        })
        .eq('id', savedStudent.id);

      if (newStudentUpdateError) {
        console.error('Error updating new student in database:', newStudentUpdateError);
        toast.error('❌ حدث خطأ في تحديث بيانات الطالب الجديد في الداتابيز');
        return;
      }

      console.log('✅ New student updated in database successfully');

      // 🆕 تحديث الـ state فوراً
      if (typeof setStudents === 'function') {
        setStudents(prev => {
          console.log('🔍 Adding new student to state:', savedStudent.name);
          console.log('🔍 Current students count:', prev.length);

          // لو الطالب مش موجود، نضيفه
          if (!prev.find(s => s.id === savedStudent.id)) {
            const newStudents = [...prev, {
              ...savedStudent,
              is_new_in_course: true, // 🆕 علامة إنه طالب جديد
              group_ids: { ...savedStudent.group_ids, [activeSession.course_id]: activeSession.group_id },
              wallet_balance: savedStudent.has_wallet ? -requiredAmount : 0
            }];
            console.log('🔍 New students count after adding:', newStudents.length);
            return newStudents;
          }
          // لو موجود، نحدثه
          const updatedStudents = prev.map(s =>
            s.id === savedStudent.id
              ? {
                ...s,
                is_new_in_course: true, // 🆕 علامة إنه طالب جديد
                group_ids: { ...s.group_ids, [activeSession.course_id]: activeSession.group_id },
                wallet_balance: savedStudent.has_wallet ? -requiredAmount : 0
              }
              : s
          );
          console.log('🔍 Updated existing student:', savedStudent.name);
          return updatedStudents;
        });
      } else {
        console.log('🔍 setStudents is not a function, using tempStudents only');
      }

      // 🆕 إزالة الطالب من tempStudents بعد التحديث
      setTempStudents(prev => prev.filter(s => s.id !== savedStudent.id));

      // 🆕 تأكد نهائي إن الحضور ثابت
      setTimeout(() => {
        setAttendanceMap(prev => ({ ...prev, [savedStudent.id]: true }));
        console.log('🔍 Final attendance confirmation for:', savedStudent.name);

        // 🆕 Trigger Auto-Save بعد إضافة طالب جديد
        triggerAutoSaveAfterOperation();
      }, 100);

      setModalSearchTerm(savedStudent.name);
      setSingleResultId(savedStudent.id);
      setCurrentPage(1); // 🆕 رجوع لصفحة 1 عشان الطالب الجديد يظهر فوراً

      // 🆕 إضافة الطالب لقائمة الجدد للترتيب
      setRecentlyAddedStudentIds(prev => [savedStudent.id, ...prev]);

      setShowQuickAdd(false);
      setNewStudentData({ name: '', phone: '', parent_phone: '', discount: 0, is_free: false, has_wallet: false });

      toast.success(`✅ تم بنجاح:\n1. تسجيل الطالب: ${savedStudent.name}\n2. تسجيل الحضور\n${requiredAmount > 0 ? `3. تسجيل دفع ${requiredAmount} ج` : ''}`);

    } catch (error) {
      console.error("Critical Error:", error);
      toast.error('❌ حدث خطأ في النظام: ' + error.message);
    } finally {
      setIsAddingStudent(false);
    }
  };

  // 1️⃣ مرجع (Ref) بيحتفظ بآخر تحديث للقائمة عشان الـ scroll يقرا الترتيب الجديد
  const latestStudentsRef = useRef([]);
  useEffect(() => {
    latestStudentsRef.current = enhancedFilteredStudents;
  }, [enhancedFilteredStudents]);

  const scrollToStudent = useCallback((studentId) => {
    // لغينا السكرول المزعج لأن الطالب أوتوماتيك بيطلع في أول صف!
    // هنكتفي بس بإننا نخليه ينور (Highlight) عشان السكرتيرة تتأكد إنه اتسجل
    setHighlightedStudentId(studentId);
  }, []); // 👈 شيلنا الـ dependencies الكتير عشان ميعملش re-render على الفاضي

  const enhancedHandleBarcodeInput = useCallback((e) => {
    handleBarcodeInput(e);
    const value = e.target.value;
    if (value && value.length >= 3) {
      const student = filteredStudents.find(s =>
        s.unique_id === value || s.name.includes(value) || s.phone?.endsWith(value)
      );
      if (student && isScanning) scrollToStudent(student.id);
    }
  }, [handleBarcodeInput, filteredStudents, scrollToStudent, isScanning]);

  useEffect(() => {
    if (!highlightedStudentId) return;
    const timer = setTimeout(() => setHighlightedStudentId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedStudentId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && singleResultId) {
        handleAttendanceChange(singleResultId, true);
        setSingleResultId(null);
        setModalSearchTerm('');
      }
      if (e.key === 'Escape') setSingleResultId(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [singleResultId, handleAttendanceChange, setModalSearchTerm]);

  // Define Receipt Content
  const receiptContent = (
    <div id="printable-receipt" dir="rtl" className="hidden print:block p-8 bg-white text-right w-full relative z-[99999]">
      <div className="mx-auto border-4 border-double border-gray-800 p-6 rounded-lg">
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          {centerConfig?.logo_url && <img src={centerConfig.logo_url} alt="Center Logo" className="h-24 mx-auto mb-2 object-contain" />}
          <h1 className="text-2xl font-bold mb-1">{centerConfig?.center_name || "SMART CENTER"}</h1>
          <h2 className="text-xl bg-gray-100 inline-block px-4 py-1 rounded border border-black font-bold">إيصال تسوية مالية (مدرس)</h2>
        </div>

        <div className="grid grid-cols-2 gap-y-3 mb-6 text-base font-bold text-gray-800">
          <p><span>التاريخ:</span> {new Date(activeSession.created_at).toLocaleDateString('ar-EG')}</p>
          <p><span>المدرس:</span> {course?.instructors?.name || course?.instructor || '---'}</p>
          <p><span>المادة:</span> {course?.name || '---'}</p>
          <p><span>المجموعة:</span> {group?.name || '---'}</p>
          <p><span>الصف:</span> {course?.grade || '---'}</p>
          <p><span>عدد الحضور:</span> {liveStats?.count || 0} طالب</p>
        </div>

        {/* 🆕 Breakdown of cases for the teacher */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-bold text-gray-700 bg-gray-50 p-2 rounded border">
          <div className="flex justify-between"><span>منتظمين:</span> <span>{students.filter(s => attendanceMap[s.id] && !s.is_free && !s.free_courses?.includes(activeSession.course_id) && !s.center_only_courses?.includes(activeSession.course_id) && !((subscriptions || []).some(sub => sub.student_id === s.id && sub.course_id === activeSession.course_id && (sub.expires_at ? new Date(sub.expires_at) > new Date() : false)))).length}</span></div>
          <div className="flex justify-between"><span>اشتراك شهري:</span> <span>{(subscriptions || []).filter(sub => sub.course_id === activeSession.course_id && attendanceMap[sub.student_id] && (sub.expires_at ? new Date(sub.expires_at) > new Date() : false)).length}</span></div>
          <div className="flex justify-between"><span>إعفاء (كلي/مادة):</span> <span>{students.filter(s => attendanceMap[s.id] && (s.is_free || s.free_courses?.includes(activeSession.course_id))).length}</span></div>
          <div className="flex justify-between"><span>سنتر فقط:</span> <span>{students.filter(s => attendanceMap[s.id] && s.center_only_courses?.includes(activeSession.course_id)).length}</span></div>
        </div>

        <div className="border-t-2 border-gray-400 pt-4 mb-6">
          <table className="w-full text-center border-collapse border border-black text-sm font-bold">
            <thead className="bg-gray-50">
              <tr><th className="border border-black p-2">البيان</th><th className="border border-black p-2">القيمة</th></tr>
            </thead>
            <tbody>
              <tr><td className="border border-black p-2 text-right">إجمالي المحصل</td><td className="border border-black p-2">{liveStats?.totalIncome?.toFixed(2) || '0.00'} ج.م</td></tr>
              <tr><td className="border border-black p-2 text-right">حصة السنتر</td><td className="border border-black p-2 text-red-600">{liveStats?.centerTotal?.toFixed(2) || '0.00'} ج.م</td></tr>
              <tr className="bg-gray-100 text-lg"><td className="border border-black p-2 text-right font-black">صافي المدرس</td><td className="border border-black p-2 text-blue-900 font-black">{liveStats?.teacherTotal?.toFixed(2) || '0.00'} ج.م</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <p className="font-bold mb-2 text-[11px] underline">ملاحظات الحالات الخاصة (إعفاء/خصم/اشتراك):</p>
          <div className="text-[10px] grid grid-cols-2 gap-x-4 italic text-gray-600">
            {students.filter(s => {
              const sub = (subscriptions || []).find(sub => sub.student_id === s.id && sub.course_id === activeSession.course_id);
              const isMonthly = sub?.expires_at ? new Date(sub.expires_at) > new Date() : false;
              const isCenterOnly = s.center_only_courses?.includes(activeSession.course_id);
              const isFreeCourse = s.free_courses?.includes(activeSession.course_id);
              const hasDiscount = s.course_discounts?.[activeSession.course_id] > 0;

              return attendanceMap[s.id] && (s.is_free || isFreeCourse || isCenterOnly || isMonthly || hasDiscount);
            }).map(s => {
              const sub = (subscriptions || []).find(sub => sub.student_id === s.id && sub.course_id === activeSession.course_id);
              const isMonthly = sub?.expires_at ? new Date(sub.expires_at) > new Date() : false;
              const isCenterOnly = s.center_only_courses?.includes(activeSession.course_id);
              const isFreeCourse = s.free_courses?.includes(activeSession.course_id);
              const discount = s.course_discounts?.[activeSession.course_id] || 0;

              let label = '';
              if (isMonthly) label = 'اشتراك شهري 📅';
              else if (s.is_free) label = 'إعفاء كلي 🎓';
              else if (isFreeCourse) label = 'إعفاء مادة 📚';
              else if (isCenterOnly) label = 'سنتر فقط 🏢';
              else if (discount > 0) label = `خصم ${discount} ج`;

              return (
                <div key={s.id} className="border-b border-gray-200 py-0.5">
                  • {s.name} : <span className="font-bold">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between mt-12 px-8 font-bold text-sm">
          <div className="text-center"><p className="mb-8 italic">إدارة السنتر</p><p>........................</p></div>
          <div className="text-center"><p className="mb-8 italic">توقيع المدرس</p><p>........................</p></div>
        </div>
      </div>
    </div>
  );

  // Define Ledger Content
  const ledgerContent = (
    <div id="printable-ledger" dir="rtl" className="hidden print:block p-8 bg-white w-full relative z-[99999]">
      <div className="watermark">{centerConfig?.center_name || 'SYSTEM'}</div>

      <div className="header" style={{ textAlign: 'center' }}>
        {centerConfig?.logo_url && <img src={centerConfig.logo_url} alt="Logo" style={{ marginBottom: '20px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />}
        <h1 style={{ color: centerConfig?.primary_color || '#2563eb', marginTop: centerConfig?.logo_url ? '0' : '20px' }}>{centerConfig?.center_name || "دفتر الحضور"}</h1>
        <h2 style={{ background: (centerConfig?.primary_color || '#2563eb') + '20', display: 'inline-block' }}>دفتر حضور وتحصيل - {activeSession.topic}</h2>
        <p>المجموعة: {group?.name} | المدرس: {course?.instructors?.name || course?.instructor || '---'}</p>
      </div>

      <div className="meta" style={{ border: '2px solid ' + (centerConfig?.primary_color || '#2563eb') + '20' }}>
        <span style={{ background: (centerConfig?.primary_color || '#2563eb') + '10' }}>📅 التاريخ: {new Date(activeSession.created_at).toLocaleDateString('ar-EG')}</span>
        <span style={{ background: (centerConfig?.primary_color || '#2563eb') + '10' }}>👥 الحضور: {enhancedFilteredStudents.filter(s => attendanceMap[s.id]).length} طالب</span>
        <span style={{ background: (centerConfig?.primary_color || '#2563eb') + '10' }}>💰 المحصل: {enhancedFilteredStudents.reduce((sum, s) => sum + (parseFloat(paymentsMap[s.id]) || 0), 0).toFixed(2)} ج</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>م</th>
            <th>اسم الطالب</th>
            <th>ملاحظة</th>
            <th>الحالة</th>
            <th>المطلوب</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
          </tr>
        </thead>
        <tbody>
          {sortedStudentsForDisplay.map((s, i) => {
            const isPresent = attendanceMap[s.id];
            const paid = parseFloat(paymentsMap[s.id]) || 0;
            let required = calculateRequiredPayment(s, activeSession);
            const remaining = isPresent ? Math.max(0, required - paid) : 0;
            return (
              <tr key={s.id}>
                <td style={{ fontWeight: 'bold', color: centerConfig?.primary_color || '#2563eb' }}>{i + 1}</td>
                <td style={{ textAlign: 'right', paddingRight: '15px', fontWeight: 'bold' }}>{s.name}</td>
                <td style={{ fontSize: '10px', color: '#666' }}>
                  {(() => {
                    const sub = (subscriptions || []).find(sub => sub.student_id === s.id && sub.course_id === activeSession.course_id);
                    let isMonthly = false;
                    if (sub?.expires_at) {
                      const expiryDate = new Date(sub.expires_at);
                      expiryDate.setHours(23, 59, 59, 999);
                      isMonthly = expiryDate >= new Date(activeSession.created_at);
                    }
                    if (s.is_free) return 'إعفاء كلي';
                    if (s.free_courses?.includes(activeSession.course_id)) return 'إعفاء مادة';
                    if (isMonthly) return 'شهري 📅';
                    if (s.center_only_courses?.includes(activeSession.course_id)) return 'سنتر فقط';
                    if (s.course_discounts?.[activeSession.course_id] > 0) return 'خصم';
                    return '-';
                  })()}
                </td>
                <td style={{ fontSize: '16px' }}>{isPresent ? '✅' : '❌'}</td>
                <td style={{ fontFamily: 'monospace', background: '#fef3c7', padding: '8px', borderRadius: '5px' }}>{required.toFixed(2)} ج</td>
                <td style={{ fontFamily: 'monospace', background: '#d1fae5', padding: '8px', borderRadius: '5px' }}>{paid.toFixed(2)} ج</td>
                <td style={{ fontFamily: 'monospace', background: remaining > 0 ? '#fee2e2' : '#d1fae5', padding: '8px', borderRadius: '5px', fontWeight: 'bold' }}>{remaining.toFixed(2)} ج</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="footer">
        <strong>{centerConfig?.center_name || 'السنتر التعليمي'}</strong><br />
        {centerConfig?.address || ''}<br />
        📞 {centerConfig?.center_phone || '-'}<br />
        <em>تم استخراج التقرير آلياً من النظام في {new Date().toLocaleDateString('ar-EG')} - الساعة {new Date().toLocaleTimeString('ar-EG')}</em>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-2 backdrop-blur-sm print:bg-white print:p-0 print:static">
      <div id="modal-content" className="bg-white w-full max-w-[98%] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:shadow-none print:w-full print:h-auto">

        {/* ================= Header ================= */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:hidden shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <FaChalkboardTeacher className="text-blue-600" />
                {activeSession.topic}
                {activeSession.session_type === 'exam' && (
                  <span className="mr-2 text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-200 font-extrabold animate-pulse">📝 امتحان</span>
                )}
                {activeSession.is_completed && <span className="mr-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">مغلقة 🔒</span>}
              </h2>
              <div className="flex gap-3 mt-1 items-center">
                <span className="text-[10px] font-bold text-gray-500 bg-white border px-2 py-0.5 rounded-md shadow-sm">
                  المدرس: {course?.instructors?.name || course?.instructor || '---'}
                </span>

                {activeSession.session_type === 'exam' && activeSession.linked_exam_id && (
                  <Link
                    href={`/admin/exams?activeExam=${activeSession.linked_exam_id}`}
                    className="text-[10px] bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1 rounded-full font-black shadow-lg hover:shadow-orange-200 transition-all hover:scale-105 flex items-center gap-1"
                  >
                    📊 رصد درجات الامتحان
                  </Link>
                )}
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md shadow-sm">
                  موعد الجدول: {activeSession.scheduled_start_time ? (
                    (() => {
                      const [h, m] = activeSession.scheduled_start_time.split(':');
                      let hours = parseInt(h);
                      const ampm = hours >= 12 ? 'م' : 'ص';
                      hours = hours % 12 || 12;
                      return `${hours}:${m} ${ampm}`;
                    })()
                  ) : '--:--'}
                </span>
              </div>
            </div>

            {!activeSession.is_completed && (
              <div className="flex gap-2 items-center mr-4 border-r pr-4 border-gray-200">
                {/* 🆕 Auto-Save Controls */}
                <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1 shadow-sm border">
                  <button
                    onClick={toggleAutoSave}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition ${autoSaveEnabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {autoSaveEnabled ? <FaToggleOn size={12} /> : <FaToggleOff size={12} />}
                    Auto-Save
                  </button>

                  <button
                    onClick={triggerAutoSave}
                    disabled={!autoSaveEnabled}
                    className={`px-2 py-1 rounded text-xs font-bold transition ${autoSaveEnabled
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    حفظ
                  </button>

                  {lastSaveTime && (
                    <span className="text-xs text-gray-500">
                      {new Date(lastSaveTime).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>

                {!activeSession.actual_start_time ? (
                  <button
                    onClick={handleStartActualLesson}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-black shadow-lg shadow-green-100 transition-all animate-pulse active:scale-95"
                  >
                    <FaCheckCircle /> بدء الشرح الفعلي الآن
                  </button>
                ) : (
                  <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-[10px] font-black border-2 border-green-200 flex items-center gap-2">
                    <FaCheckCircle className="animate-bounce" /> بدأ الشرح {new Date(activeSession.actual_start_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                <button
                  onClick={handleEndSession}
                  disabled={isEndingSession}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-black shadow-lg shadow-red-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  <FaLock /> {isEndingSession ? 'جاري...' : 'إنهاء الجلسة'}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onCloseSession}
            className="w-10 h-10 rounded-full bg-white border-2 hover:bg-red-50 text-gray-400 hover:text-red-500 font-bold text-xl flex items-center justify-center transition-all shadow-sm"
          >
            &times;
          </button>
        </div>

        {/* ================= 🟢 MODIFIED BODY: Two-Column Layout ================= */}
        <div className="flex-1 overflow-hidden bg-white print:hidden flex flex-col md:flex-row">

          {/* 🟢 Left Column: Dashboard & Filters (Fixed Width w-80) */}
          <div className="w-full md:w-80 bg-gray-50 border-l border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">

            {/* Stats Dashboard - Vertical Layout */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 border-b pb-2">لوحة الإحصائيات</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 p-2 rounded-lg text-center border border-blue-100">
                  <FaUsers className="text-blue-600 mx-auto text-sm mb-1" />
                  <span className="block text-[10px] text-gray-500">الإجمالي</span>
                  <span className="block text-lg font-black text-blue-800">{enhancedStats.total}</span>
                </div>
                <div className="bg-green-50 p-2 rounded-lg text-center border border-green-100">
                  <FaUserCheck className="text-green-600 mx-auto text-sm mb-1" />
                  <span className="block text-[10px] text-gray-500">حضور</span>
                  <span className="block text-lg font-black text-green-800">{enhancedStats.present}</span>
                </div>
                <div className="bg-red-50 p-2 rounded-lg text-center border border-red-100">
                  <FaUserTimes className="text-red-600 mx-auto text-sm mb-1" />
                  <span className="block text-[10px] text-gray-500">غياب</span>
                  <span className="block text-lg font-black text-red-800">{enhancedStats.absent}</span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg text-center border border-emerald-100">
                  <FaMoneyBillWave className="text-emerald-600 mx-auto text-sm mb-1" />
                  <span className="block text-[10px] text-gray-500">دافع</span>
                  <span className="block text-lg font-black text-emerald-800">{enhancedStats.paid}</span>
                </div>
              </div>
              <div className="mt-2 bg-orange-50 p-2 rounded-lg text-center border border-orange-100">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <FaExclamationCircle className="text-orange-600" />
                  <span className="text-[10px] text-gray-500">عليه فلوس (مديون)</span>
                </div>
                <span className="block text-xl font-black text-orange-800">{enhancedStats.unpaid}</span>
              </div>
            </div>

            {/* Filter Tabs - Vertical Layout */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 px-1">تصفية القائمة</h3>
              {[
                { key: 'all', label: 'الكل', icon: FaUsers, count: tabStats.total, color: 'blue' },
                { key: 'present', label: 'حضور', icon: FaUserCheck, count: tabStats.present, color: 'green' },
                { key: 'absent', label: 'غياب', icon: FaUserTimes, count: tabStats.absent, color: 'red' },
                { key: 'new', label: 'جدد', icon: FaUserPlus, count: tabStats.new, color: 'cyan' },
                { key: 'paid', label: 'دافع', icon: FaMoneyBillWave, count: tabStats.paid, color: 'emerald' },
                { key: 'unpaid', label: 'عليه فلوس', icon: FaExclamationCircle, count: tabStats.unpaid, color: 'orange' },
                { key: 'monthly', label: 'اشتراك شهري', icon: FaCheckCircle, count: tabStats.monthly, color: 'purple' },
                { key: 'centerOnly', label: 'سنتر فقط', icon: FaCheckCircle, count: tabStats.centerOnly, color: 'blue' },
                { key: 'exempt', label: 'إعفاء', icon: FaCheckCircle, count: tabStats.exemptCourse + tabStats.exempt, color: 'purple' },
                { key: 'discount', label: 'خصم', icon: FaPercentage, count: tabStats.discount, color: 'pink' }
              ].map(({ key, label, icon: Icon, count, color }) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`
                            w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold text-xs transition-all border-2
                            ${filterType === key
                      ? `bg-white shadow-md border-${color}-300 ring-2 ring-${color}-100`
                      : `text-gray-500 hover:bg-white hover:shadow-sm border-transparent hover:border-gray-200`
                    }
                        `}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={filterType === key ? `text-${color}-500` : "text-gray-400"} />
                    <span>{label}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] min-w-[26px] text-center font-black ${filterType === key
                    ? (key === 'discount' ? 'bg-pink-100 text-pink-700' : `bg-${color}-100 text-${color}-700`)
                    : 'bg-gray-200 text-gray-600'
                    }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* WhatsApp Button */}
            <button onClick={handleMassAbsentAlert} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 mt-auto">
              <FaWhatsapp className="text-lg" />
              <div className="flex flex-col items-start leading-tight">
                <span>مراسلة الغائبين</span>
                <span className="text-[9px] opacity-80">({tabStats.absent} طالب)</span>
              </div>
            </button>

          </div>

          {/* 🟢 Right Column: Tools & Table (flex-1) */}
          <div className="flex-1 flex flex-col overflow-hidden relative">

            {/* Scanner Controls - Collapsible */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => setIsScannerExpanded(!isScannerExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 animate-pulse">⚡</span>
                  <span className="text-xs font-black text-blue-800 uppercase tracking-wider">أدوات التحضير السريع</span>
                </div>
                <span className="text-blue-600 text-lg transform transition-transform duration-200" style={{ transform: isScannerExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>
              {isScannerExpanded && (
                <div className="p-4 bg-white">
                  <div className="flex flex-col xl:flex-row gap-3 items-end">
                    {/* 1. Barcode */}
                    <div className="flex-[2] w-full relative">
                      <label className="block text-[10px] font-black text-blue-600 mb-1 uppercase tracking-wider">⚡ تحضير سريع (باركود)</label>
                      <div className="relative">
                        <FaQrcode className="absolute top-3 right-3 text-blue-500 animate-pulse" />
                        <input
                          type="text"
                          placeholder="وجه السكانر هنا..."
                          className="w-full p-2.5 pr-10 border-2 border-blue-400 rounded-lg outline-none focus:ring-4 focus:ring-blue-100 bg-white font-bold text-blue-800 shadow-sm"
                          onChange={(e) => {
                            setIsScanning(true);
                            enhancedHandleBarcodeInput(e);
                            setTimeout(() => setIsScanning(false), 100);
                          }}
                          onFocus={() => setIsScanning(true)}
                          onBlur={() => setIsScanning(false)}
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* 2. Auto Mode */}
                    <div className="flex-1 w-full xl:w-auto">
                      <button
                        type="button"
                        onClick={() => setIsAutoMode(!isAutoMode)}
                        className={`w-full h-[46px] rounded-lg border-2 flex items-center justify-between px-3 transition-all ${isAutoMode ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200'}`}
                      >
                        <div className="flex flex-col items-start leading-none text-right">
                          <span className="text-[9px] font-black uppercase opacity-80">وضع الدمج</span>
                          <span className="text-[10px] font-bold">{isAutoMode ? 'نشط' : 'معطل'}</span>
                        </div>
                        <div className="text-xl">{isAutoMode ? <FaToggleOn /> : <FaToggleOff />}</div>
                      </button>
                    </div>

                    {/* 3. Search */}
                    <div className="flex-[2] w-full relative">
                      <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">🔍 بحث يدوي بالاسم</label>
                      <div className="relative">
                        <FaSearch className="absolute top-3.5 right-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="بحث بالاسم أو الكود..."
                          value={modalSearchTerm}
                          onChange={(e) => {
                            setModalSearchTerm(e.target.value);
                            const value = e.target.value;
                            const cleanValue = value.split('_')[0];
                            if (value && value.length >= 2) {
                              const matches = filteredStudents.filter(s =>
                                s.unique_id === cleanValue || s.name.includes(cleanValue) || s.phone?.endsWith(cleanValue)
                              );
                              setSingleResultId(matches.length === 1 ? matches[0].id : null);
                            } else {
                              setSingleResultId(null);
                            }
                          }}
                          className="w-full p-2.5 pr-10 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-500 shadow-sm transition"
                        />
                      </div>
                    </div>

                    {/* 4. Camera */}
                    <div className="flex-1 w-full xl:w-auto flex items-end">
                      <button onClick={toggleCameraScanner} className="w-full h-[46px] bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95">
                        <FaQrcode /> {scannerActive ? 'إيقاف' : 'كاميرا'}
                      </button>
                    </div>

                    {/* 5. Quick Add Student */}
                    <div className="flex-1 w-full xl:w-auto flex items-end">
                      <button
                        onClick={() => setShowQuickAdd(true)}
                        className="w-full h-[46px] bg-blue-800 hover:bg-blue-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                      >
                        <FaUserPlus /> جديد
                      </button>
                    </div>
                  </div>
                  {scannerActive && <div className="mt-4 mx-auto w-full max-w-sm"><div id="reader" className="border-4 border-purple-600 rounded-lg overflow-hidden shadow-md"></div></div>}
                </div>
              )}
            </div>

            {/* Table Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-right border-collapse text-sm">
                  <thead className="bg-gray-900 text-white sticky top-0 z-10 font-bold">
                    <tr>
                      <th className="p-4 text-xs uppercase tracking-wider">الطالب</th>
                      <th className="p-4 text-xs text-center uppercase tracking-wider">المجموعة</th>
                      <th className="p-4 text-xs text-center uppercase tracking-wider">حالة الحضور</th>
                      <th className="p-4 text-xs text-center uppercase tracking-wider">المطلوب</th>
                      <th className="p-4 text-xs text-center uppercase tracking-wider">المدفوع</th>
                      <th className="p-4 text-xs text-center uppercase tracking-wider">المتبقي</th>
                      <th className="p-4 text-xs text-center uppercase tracking-wider">تسجيل</th>
                      <th className="p-4 text-xs text-center uppercase tracking-wider">واتساب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {enhancedFilteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-10 text-center text-gray-400 italic bg-gray-50">
                          {filterType === 'all' ? 'لا توجد نتائج مطابقة للبحث' : `لا يوجد طلاب في فئة "${filterType}" حالياً`}
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map(student => {
                        const isPresent = attendanceMap[student.id] || false;
                        const isHighlighted = highlightedStudentId === student.id;

                        const totalStudentDebt = calculateTotalStudentDebt
                          ? calculateTotalStudentDebt(student.id, students, sessions, subscriptions)
                          : 0;

                        const studentGroupId = student.group_ids?.[activeSession.course_id];
                        const isSameGroup = studentGroupId === activeSession.group_id;

                        // ✅ التشييك على الاشتراك الشهري في تاريخ الحصة
                        const sub = (subscriptions || []).find(s => s.student_id === student.id && s.course_id === activeSession.course_id);
                        const expiryDate = sub?.expires_at ? new Date(sub.expires_at) : null;

                        let isMonthlyActive = false;
                        let isExpired = false;

                        if (expiryDate) {
                          const limitDate = new Date(expiryDate);
                          limitDate.setHours(23, 59, 59, 999);
                          const sessionDate = new Date(activeSession.created_at);
                          isMonthlyActive = limitDate >= sessionDate;
                          isExpired = limitDate < sessionDate;
                        }

                        const isCenterOnly = student.center_only_courses?.includes(activeSession.course_id);

                        let required = calculateRequiredPayment(student, activeSession);
                        const paid = parseFloat(paymentsMap[student.id]) || 0;
                        const remaining = isPresent ? Math.max(0, required - paid) : 0;

                        return (
                          <tr
                            key={student.id}
                            id={`student-${student.id}`}
                            className={`
                                    hover:bg-blue-50 transition-all duration-200
                                    ${isPresent ? 'bg-green-50/50' : ''}
                                    ${!isSameGroup ? 'opacity-60 bg-gray-50' : ''}
                                    ${isHighlighted ? 'ring-2 ring-blue-500 bg-yellow-50 !opacity-100' : ''}
                                    ${singleResultId === student.id ? 'ring-2 ring-green-500 bg-green-50 !opacity-100' : ''}
                                `}
                          >
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-black text-gray-800 text-sm">{student.name}</span>
                                  {student.is_temporary && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-blue-200">جديد ({student.id})</span>}
                                  {student.is_new_in_course && <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-purple-200 flex items-center gap-0.5">🆕 جديد في الكورس</span>}
                                  {student.has_wallet && <FaWallet className="text-blue-500 text-xs" title={`رصيد: ${student.wallet_balance} ج`} />}
                                  {student.is_free && <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-green-200 flex items-center gap-0.5"><FaCheckCircle size={8} /> إعفاء كلي</span>}
                                  {student.free_courses?.includes(activeSession.course_id) && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-emerald-200 flex items-center gap-0.5"><FaCheckCircle size={8} /> إعفاء مادة</span>}
                                  {isCenterOnly && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-blue-200 flex items-center gap-0.5" title="يدفع نصيب السنتر فقط (المدرس متنازل)"><FaCheckCircle size={8} /> سنتر فقط</span>}

                                  {/* 🆕 شارات الاشتراك الشهري */}
                                  {isMonthlyActive && (
                                    <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-purple-200 flex items-center gap-0.5" title={`ينتهي في: ${expiryDate.toLocaleDateString('ar-EG')}`}>
                                      📅 شهري (نشط)
                                    </span>
                                  )}
                                  {isExpired && (
                                    <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-red-200 flex items-center gap-0.5 animate-pulse" title={`انتهى في: ${expiryDate.toLocaleDateString('ar-EG')}`}>
                                      ⚠️ شهري (منتهي)
                                    </span>
                                  )}

                                  {student.course_discounts?.[activeSession.course_id] > 0 && !student.is_free && !isMonthlyActive && <span className="bg-orange-100 text-orange-700 text-[9px] px-1.5 py-0.5 rounded font-black border border-orange-200">خصم {student.course_discounts[activeSession.course_id]} ج</span>}
                                  {totalStudentDebt >= (centerConfig?.debt_limit || 300) && <FaExclamationTriangle className="text-red-600 text-xs animate-bounce" />}
                                </div>

                                <div className="flex flex-col gap-0.5">
                                  <div className="text-[10px] text-gray-400 font-mono leading-none">{student.unique_id}</div>
                                  {student.has_wallet && <div className="text-[10px] font-bold text-blue-600 italic">💰 محفظة: {parseFloat(student.wallet_balance || 0).toFixed(2)} ج</div>}

                                  {totalStudentDebt > 0 && (
                                    <div className="text-[9px] font-bold text-white bg-red-600 px-2 py-0.5 rounded mt-1 w-fit shadow-sm flex items-center gap-1">
                                      <FaExclamationTriangle size={8} className="text-yellow-300" />
                                      <span>مديونية: {totalStudentDebt.toFixed(2)} ج</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center align-middle">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold ${isSameGroup ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                                {groups.find(g => g.id === studentGroupId)?.name || 'غير مسكن'}
                              </span>
                            </td>
                            <td className="p-3 text-center align-middle">
                              {isPresent ?
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black">✅ حاضر</span> :
                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-400 px-2 py-1 rounded text-[10px] font-bold">❌ غاب</span>
                              }
                            </td>
                            <td className="p-3 text-center align-middle font-bold text-gray-700">
                              <div className="flex flex-col items-center">
                                <span>{required.toFixed(2)}</span>
                                {required === 0 && (isMonthlyActive || student.is_free || student.free_courses?.includes(activeSession.course_id)) && (
                                  <span className="text-[8px] text-gray-400 font-bold">
                                    ({isMonthlyActive ? 'اشتراك شهري' : student.is_free ? 'إعفاء كلي' : 'إعفاء مادة'})
                                  </span>
                                )}
                                {isCenterOnly && !isMonthlyActive && !student.is_free && !student.free_courses?.includes(activeSession.course_id) && (
                                  <span className="text-[8px] text-blue-400 font-bold">
                                    (نصيب السنتر فقط)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center align-middle">
                              <input
                                type="number" step="0.01"
                                className="w-20 p-1.5 border border-gray-300 rounded text-center font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                                value={paid || ''}
                                onChange={(e) => {
                                  handleStudentPayment(student.id, parseFloat(e.target.value) || 0);
                                  if (parseFloat(e.target.value) > 0 && !isPresent) handleStudentAttendance(student.id, true);
                                }}
                                disabled={activeSession.is_completed}
                              />
                            </td>
                            <td className={`p-3 text-center align-middle font-black ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{remaining.toFixed(2)}</td>
                            <td className="p-3 text-center align-middle">
                              <div className="flex justify-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isPresent}
                                    onChange={(e) => {
                                      const isChecking = e.target.checked;
                                      if (isChecking) {
                                        const limit = centerConfig?.debt_limit || 300;
                                        if (totalStudentDebt >= limit) {
                                          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
                                          if (!isAutoMode) {
                                            const confirmMsg = `🛑 تنبيه هام: السياسات المالية\n\n` +
                                              `الطالب: ${student.name}\n` +
                                              `إجمالي المديونية: ${totalStudentDebt} ج\n` +
                                              `الحد المسموح: ${limit} ج\n\n` +
                                              `هل تريد تجاوز المنع والسماح له بالدخول؟`;
                                            if (!confirm(confirmMsg)) return;
                                          }
                                        }

                                        // If student has wallet and balance > 0, prompt user to choose Wallet or Cash
                                        const walletBal = parseFloat(student.wallet_balance || 0);
                                        const requiredToggle = calculateRequiredPayment(student, activeSession);
                                        const paidToggle = parseFloat(paymentsMap[student.id]) || 0;
                                        const dueOnToggle = Math.max(0, requiredToggle - paidToggle);
                                        if (student.has_wallet && walletBal > 0 && dueOnToggle > 0) {
                                          setWalletPrompt({ visible: true, student, amount: dueOnToggle });
                                          return; // wait for user's choice
                                        }
                                      }
                                      handleStudentAttendance(student.id, isChecking);
                                      if (isChecking) scrollToStudent(student.id);
                                    }}
                                    disabled={activeSession.is_completed}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                {/* wallet prompt handled via modal when toggling attendance */}
                              </div>
                            </td>
                            <td className="p-3 text-center align-middle">
                              {!isPresent && student.parent_phone && (
                                <button onClick={() => {
                                  let phone = student.parent_phone?.replace(/\D/g, '') || '';
                                  if (phone.startsWith('01')) phone = '2' + phone;
                                  const courseData = courses.find(c => c.id === activeSession?.course_id);
                                  const sessionTopic = activeSession?.topic && activeSession.topic !== "." ? activeSession.topic : `حصة ${courseData?.name || ''}`;
                                  let template = centerConfig?.msg_absent || "نحيطكم علماً بغياب الطالب [name] عن حصة [topic]";
                                  const finalMsg = template.replace(/\[name\]/g, student.name).replace(/\[topic\]/g, sessionTopic).replace(/\[center\]/g, centerConfig?.center_name || "SMART CENTER");
                                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
                                }} className="bg-green-50 text-green-600 hover:bg-green-600 hover:text-white p-2 rounded-lg transition-all shadow-sm active:scale-95"><FaWhatsapp /></button>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>

                {/* 🆕 Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="text-xs text-gray-600">
                      <span className="font-bold">{(currentPage - 1) * PAGE_SIZE + 1}</span>
                      {' '}-{' '}
                      <span className="font-bold">{Math.min(currentPage * PAGE_SIZE, enhancedFilteredStudents.length)}</span>
                      {' '}من{' '}
                      <span className="font-bold">{enhancedFilteredStudents.length}</span>
                      {' '}طالب
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ← السابق
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`min-w-[32px] px-2 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        التالي →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ================= Footer ================= */}
        <div className="p-3 border-t bg-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
          <div className="flex gap-4 font-bold text-sm bg-white p-3 rounded-xl border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <span className="text-green-600">المحصل: {liveStats?.totalIncome?.toFixed(2) || '0.00'} ج</span>
            </div>
            <div className="w-px h-6 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span className="text-lg">👨‍🏫</span>
              <span className="text-blue-600">صافي المدرس: {liveStats?.teacherTotal?.toFixed(2) || '0.00'} ج</span>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {/* Receipt Button */}
            <button
              onClick={handleExportExcel}
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-md transition"
            >
              <FaFileExcel /> إكسل الحضور
            </button>
            <button onClick={() => handlePrint('receipt')} className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-md transition">
              <FaFileInvoiceDollar /> إيصال مدرس
            </button>
            {/* Ledger Button */}
            <button onClick={() => handlePrint('ledger')} className="flex-1 md:flex-none bg-gray-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-md transition">
              <FaPrint /> طباعة الدفتر
            </button>
            {!activeSession.is_completed && (
              <button
                onClick={() => saveLedger(false)}
                disabled={isSavingLedger}
                className="flex-1 md:flex-none bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-200 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center gap-2"
              >
                <FaCheck className="text-lg" /> {isSavingLedger ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            )}
          </div>
        </div>

        {/* ================= PORTALS ================= */}
        {mounted && printView === 'receipt' && createPortal(receiptContent, document.body)}
        {mounted && printView === 'ledger' && createPortal(ledgerContent, document.body)}

        {/* Wallet Choice Modal */}
        {walletPrompt.visible && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-xl w-full max-w-md">
              <h3 className="text-lg font-black mb-2">الطالب لديه رصيد في المحفظة</h3>
              <p className="text-sm text-gray-600 mb-4">هل تريد خصم قيمة الحصة من المحفظة أو تسجيلها كـ كاش؟</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setWalletPrompt({ visible: false, student: null, amount: 0 })} className="px-3 py-2 rounded bg-red-50 text-red-600 font-bold">إلغاء</button>
                <button
                  onClick={async () => {
                    // Cash path: mark attendance but prevent auto-wallet deduction
                    const s = walletPrompt.student;
                    setWalletPrompt({ visible: false, student: null, amount: 0 });
                    await handleStudentAttendance(s.id, true, false);
                    scrollToStudent(s.id);
                  }}
                  className="px-3 py-2 rounded bg-gray-100 text-gray-800 font-bold"
                >دفع كاش</button>
                <button
                  onClick={async () => {
                    const s = walletPrompt.student;
                    const amountToPay = walletPrompt.amount;
                    setProcessingPayments(prev => ({ ...prev, [s.id]: true }));
                    try {
                      const currentBalance = parseFloat(s.wallet_balance || 0);
                      if (currentBalance < amountToPay) {
                        toast.error('رصيد المحفظة غير كافٍ');
                        setProcessingPayments(prev => ({ ...prev, [s.id]: false }));
                        return;
                      }

                      const newBalance = currentBalance - amountToPay;
                      const { error: updErr } = await supabase
                        .from('students')
                        .update({ wallet_balance: newBalance })
                        .eq('id', s.id)
                        .eq('center_id', activeSession.center_id);
                      if (updErr) throw updErr;

                      const { error: txErr } = await supabase.from('wallet_transactions').insert([{
                        student_id: s.id,
                        amount: -amountToPay,
                        type: 'session_payment',
                        description: `دفع من المحفظة لحصة: ${activeSession.topic}`,
                        created_by: (await supabase.auth.getUser()).data.user?.id || null,
                        balance_after: newBalance,
                        center_id: activeSession.center_id
                      }]);
                      if (txErr) throw txErr;

                      const { data: sessData, error: sessErr } = await supabase
                        .from('sessions')
                        .select('payments')
                        .eq('id', activeSession.id)
                        .single();
                      if (sessErr) throw sessErr;
                      const currentPayments = sessData?.payments || {};
                      const studentKey = s.unique_id || s.id;
                      const updatedAmount = (parseFloat(currentPayments[studentKey]) || 0) + amountToPay;
                      const updatedPayments = { ...currentPayments, [studentKey]: updatedAmount };

                      const { error: updatePaymentsErr } = await supabase
                        .from('sessions')
                        .update({ payments: updatedPayments })
                        .eq('id', activeSession.id);
                      if (updatePaymentsErr) throw updatePaymentsErr;

                      await supabase.from('audit_logs').insert({
                        table_name: 'sessions',
                        record_id: s.id,
                        action: 'PAYMENT_FROM_WALLET',
                        user_id: (await supabase.auth.getUser()).data.user?.id || null,
                        center_id: activeSession.center_id,
                        new_data: { amount: amountToPay, balance_after: newBalance, session_id: activeSession.id }
                      });

                      await supabase.from('student_activities').insert([{ 
                        student_id: s.id,
                        type: 'payment',
                        title: 'دفع من المحفظة',
                        description: `تم خصم ${amountToPay} ج من محفظة الطالب لحضور ${activeSession.topic}`,
                        center_id: activeSession.center_id
                      }]);

                      // Update local state
                      setPaymentsMap(prev => ({ ...prev, [s.id]: updatedAmount }));
                      setStudents(prev => prev.map(st => st.id === s.id ? { ...st, wallet_balance: newBalance } : st));
                      setAttendanceMap(prev => ({ ...prev, [s.id]: true }));

                      toast.success('تم السحب من المحفظة وتحديث الدفتر بنجاح');
                    } catch (err) {
                      console.error('Wallet modal payment error:', err);
                      toast.error('فشل عملية الدفع من المحفظة');
                    } finally {
                      setProcessingPayments(prev => ({ ...prev, [s.id]: false }));
                      setWalletPrompt({ visible: false, student: null, amount: 0 });
                      scrollToStudent(s.id);
                    }
                  }}
                  disabled={processingPayments[walletPrompt.student?.id]}
                  className="px-3 py-2 rounded bg-blue-600 text-white font-black"
                >{processingPayments[walletPrompt.student?.id] ? '...' : 'دفع من المحفظة'}</button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            direction: rtl !important;
          }
          /* إخفاء كل العناصر بشكل صريح */
          body > * {
            display: none !important;
          }
          /* إظهار منطقة الطباعة فقط */
          #printable-ledger, #printable-receipt {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 10px !important;
            z-index: 99999 !important;
          }
          #printable-ledger *, #printable-receipt * {
            visibility: visible !important;
          }
          @page {
            size: auto;
            margin: 15mm;
          }
        }
        
        #printable-ledger {
          font-family: 'Segoe UI', Tahoma, sans-serif; 
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        #printable-ledger .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 3px solid #2563eb; 
          padding-bottom: 20px; 
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        #printable-ledger .header img { 
          height: 80px; 
          margin-bottom: 15px; 
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        #printable-ledger .header h1 { 
          margin: 0; 
          font-size: 24px; 
          color: #2563eb; 
          font-weight: 900;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        #printable-ledger .header h2 { 
          margin: 8px 0 0; 
          color: #64748b; 
          font-size: 16px; 
          font-weight: bold;
          background: #2563eb20;
          padding: 8px 15px;
          border-radius: 20px;
          display: inline-block;
        }
        #printable-ledger .header p { 
          margin: 8px 0 0; 
          color: #64748b; 
          font-size: 14px; 
          font-weight: bold;
        }
        
        #printable-ledger .meta { 
          display: flex; 
          justify-content: space-between; 
          font-size: 12px; 
          margin-bottom: 20px; 
          font-weight: bold;
          background: white;
          padding: 15px 20px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          border: 2px solid #2563eb20;
        }
        #printable-ledger .meta span {
          background: #2563eb10;
          padding: 5px 10px;
          border-radius: 5px;
        }
        
        #printable-ledger table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 12px; 
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        #printable-ledger th { 
          background: linear-gradient(135deg, #2563eb 0%, #2563ebdd 100%); 
          color: white; 
          font-weight: 800; 
          padding: 15px 10px; 
          border: none;
          text-align: center;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        #printable-ledger td { 
          padding: 12px 8px; 
          border-bottom: 1px solid #e2e8f0; 
          color: #334155;
          text-align: center;
        }
        #printable-ledger tr:nth-child(even) { background: #f8fafc; }
        #printable-ledger tr:hover { background: #2563eb05; }
        
        #printable-ledger .footer { 
          text-align: center; 
          font-size: 10px; 
          color: #64748b; 
          margin-top: 30px;
          padding: 15px;
          background: white;
          border-radius: 10px;
          border: 2px solid #2563eb20;
        }
        #printable-ledger .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 100px;
          color: rgba(0,0,0,0.03);
          font-weight: 900;
          pointer-events: none;
          z-index: -1;
        }
        
        @media print {
          #printable-ledger .header { page-break-inside: avoid !important; }
          #printable-ledger .meta { page-break-inside: avoid !important; }
          #printable-ledger .footer { page-break-inside: avoid !important; }
          
          /* السماح للجدول بالانقسام بين الصفحات */
          #printable-ledger table { 
            page-break-inside: auto !important; 
          }
          #printable-ledger thead { 
            display: table-header-group !important; /* تكرار الرأس في كل صفحة */
          }
          #printable-ledger tbody { 
            page-break-inside: auto !important; 
          }
          
          /* منع انقسام الصف الواحد في نص الكلام */
          #printable-ledger tr { 
            page-break-inside: avoid !important; 
            page-break-after: auto !important; 
          }
          #printable-ledger td { 
            page-break-inside: avoid !important; 
          }
        }
        `
      }} />

      {/* ================= Quick Add Modal (Overlay) ================= */}
      {/* ================= Quick Add Modal (Overlay) ================= */}
      {showQuickAdd && (
        <div className="absolute inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-blue-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
              <FaUserPlus className="text-blue-600" /> تسجيل طالب جديد
            </h3>

            <div className="space-y-3">
              {/* البيانات الأساسية */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">اسم الطالب (ثلاثي) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  autoFocus
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                  placeholder="مثال: أحمد محمد علي"
                  value={newStudentData.name}
                  onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">رقم الطالب</label>
                  <input
                    type="tel"
                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-bold text-sm"
                    placeholder="01xxxxxxxxx"
                    value={newStudentData.phone}
                    onChange={e => setNewStudentData({ ...newStudentData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">كود الطالب/باركود</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-bold text-sm"
                      placeholder="S-1001"
                      id="barcodeInput"
                      autoFocus={true}
                      onChange={(e) => {
                        // لو الباركود جاهز (طول أكبر من 5)، نعمل auto submit
                        if (e.target.value.trim().length > 5) {
                          setTimeout(() => {
                            const studentId = e.target.value.trim();
                            if (studentId) {
                              handleBarcodeOrIdSearch(studentId);
                              e.target.value = '';
                              // نرجع focus للحقل تاني
                              setTimeout(() => {
                                document.getElementById('barcodeInput')?.focus();
                              }, 100);
                            }
                          }, 500);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const studentId = e.target.value.trim();
                          if (studentId) {
                            handleBarcodeOrIdSearch(studentId);
                            e.target.value = '';
                            // نرجع focus للحقل
                            setTimeout(() => {
                              document.getElementById('barcodeInput')?.focus();
                            }, 100);
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('barcodeInput');
                        const studentId = input.value.trim();
                        if (studentId) {
                          handleBarcodeOrIdSearch(studentId);
                          input.value = '';
                          // نرجع focus للحقل
                          setTimeout(() => {
                            document.getElementById('barcodeInput')?.focus();
                          }, 100);
                        }
                      }}
                      className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold"
                    >
                      بحث
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">رقم ولي الأمر</label>
                <input
                  type="tel"
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-bold text-sm"
                  placeholder="01xxxxxxxxx"
                  value={newStudentData.parent_phone}
                  onChange={e => setNewStudentData({ ...newStudentData, parent_phone: e.target.value })}
                />
              </div>

              {/* 🟢 إعدادات المصاريف والمحفظة */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2 space-y-3">
                <p className="text-xs font-black text-gray-500 border-b pb-1 mb-2">الإعدادات المالية:</p>

                {/* خيار المحفظة (جديد) */}
                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition border border-transparent hover:border-gray-200">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600"
                    checked={newStudentData.has_wallet === true}
                    onChange={e => setNewStudentData({ ...newStudentData, has_wallet: e.target.checked })}
                  />
                  <div className="flex items-center gap-2">
                    <FaWallet className="text-blue-500" />
                    <span className="text-sm font-bold text-gray-700">تفعيل المحفظة المالية</span>
                  </div>
                </label>

                {/* خيار الإعفاء */}
                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition border border-transparent hover:border-gray-200">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-green-600"
                    checked={newStudentData.is_free}
                    onChange={e => setNewStudentData({ ...newStudentData, is_free: e.target.checked, discount: 0 })}
                  />
                  <div className="flex items-center gap-2">
                    <FaCheckCircle className="text-green-600" />
                    <span className="text-sm font-bold text-gray-700">طالب إعفاء (Free)</span>
                  </div>
                </label>

                {/* خيار الخصم */}
                {!newStudentData.is_free && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-top-1 px-2">
                    <label className="text-xs font-bold text-gray-600 whitespace-nowrap">خصم خاص:</label>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        className="w-full p-2 pr-8 border border-gray-300 rounded-lg outline-none focus:border-orange-500 font-bold text-sm"
                        placeholder="0"
                        value={newStudentData.discount || ''}
                        onChange={e => setNewStudentData({ ...newStudentData, discount: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="absolute top-2 right-3 text-gray-400 text-xs font-bold">ج.م</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 font-bold mt-1 flex items-start gap-2">
                <FaCheckCircle className="mt-0.5 shrink-0" />
                <span>سيتم التسجيل في: {course?.name} - {group?.name}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowQuickAdd(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleQuickAddStudent}
                disabled={isAddingStudent}
                className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50 flex justify-center items-center gap-2 transition"
              >
                {isAddingStudent ? 'جاري الحفظ...' : <>حفظ وتسجيل <FaCheck /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

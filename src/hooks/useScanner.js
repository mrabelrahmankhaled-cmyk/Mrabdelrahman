'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabaseBrowser } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for managing barcode scanner functionality
 * Handles both physical barcode scanner input and camera QR scanning
 * NOW WITH Smart Auto-Routing Validation Layer
 */
// لازم تضيف groups = [] و isAutoMode = false هنا 👇
export const useScanner = (activeSession, students, handleAttendanceChange, groups = [], isAutoMode = false) => {
  const { centerId } = useAuth();
  const [scannerActive, setScannerActive] = useState(false);
  const [suggestedSession, setSuggestedSession] = useState(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [scannedStudent, setScannedStudent] = useState(null); // State for scanned student
  const barcodeBuffer = useRef('');
  const barcodeTimeout = useRef(null);
  const qrScannerRef = useRef(null);

  // 🆕 Professional Sound Manager (Client-side only)
  const sounds = useRef({});
  const lastScannedCode = useRef(null);
  const lastScanTime = useRef(0);
  const [isClient, setIsClient] = useState(false);

  // 🆕 Initialize sounds only on client-side
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      // 🆕 Sound Manager with specified sounds
      sounds.current = {
        success: new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'), // ✅ حضور ناجح
        warning: new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'), // ⚠️ حاضر بالفعل (bubble pop)
        error: new Audio('https://assets.mixkit.co/active_storage/sfx/950/950-preview.mp3'),     // ❌ كود غير موجود
        routing: new Audio('https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3'), // 🔁 حصة تانية (interface back)
        deny: new Audio('https://assets.mixkit.co/active_storage/sfx/1019/1019-preview.mp3')     // ⛔ لا حصة ولا تسجيل
      };
    }
  }, []);

  const playSound = useCallback((type) => {
    if (isClient && sounds.current[type]) {
      sounds.current[type]?.play().catch(() => {});
    }
  }, [isClient]);

  /**
   * Check if student is already attended in the session using sessions.attendees
   * The Freshness Fix - Get real-time data from database
   */
  const checkIfStudentAlreadyAttended = useCallback(async (barcode, sessionId) => {
    try {
      console.log('🔍 Checking attendance using sessions.attendees:', { barcode, sessionId });
      
      // 🆕 The Freshness Fix - Get real-time data with cache control
      console.log('🔍 About to execute sessions query with cache control...');
      
      const { data: sessionData, error } = await supabaseBrowser
        .from('sessions')
        .select('attendees')
        .eq('id', sessionId)
        .eq('center_id', centerId)
        .maybeSingle(); // 🆕 Use maybeSingle() instead of .single()

      console.log('🔍 Sessions query result:', { 
        sessionData, 
        error, 
        attendees: sessionData?.attendees,
        attendeesLength: sessionData?.attendees ? sessionData.attendees.length : 0,
        dataString: JSON.stringify(sessionData)
      });

      if (error || !sessionData) {
        console.log('🔍 No session data found or error:', error);
        return false;
      }

      // 🆕 Check if student barcode exists in attendees array (Array of Strings)
      const attendees = sessionData.attendees || [];
      const isAttended = attendees.includes(barcode);
      
      console.log(`🔍 التحقق من الداتابيز: الطالب ${isAttended ? 'حاضر' : 'غائب'} في الحصة ${sessionId}`);
      console.log('🔍 Attendees array:', attendees);
      console.log('🔍 Barcode to check:', barcode);
      console.log('🔍 Is barcode in attendees:', attendees.includes(barcode));
      
      return isAttended;
    } catch (err) {
      console.error('❌ Error in checkIfStudentAlreadyAttended:', err);
      return false;
    }
  }, [centerId]);

  /**
   * Custom attendance handler that bypasses useAttendance.js check
   * The Logic Gate - Prevent duplicate attendance
   */
 const handleCustomAttendanceChange = useCallback(async (studentId, isChecked, isBarcode = false) => {
    console.log('🔍 Custom attendance handler called:', { studentId, isChecked, isBarcode });
    
    if (!activeSession) return;

    // 🆕 Get student by ID to get barcode
    const student = students.find(s => s.id === studentId);
    if (!student) {
      console.log('🔍 Student not found in students array');
      playSound('error'); // ❌ كود غير موجود
      return false;
    }

    // 🔴 1. الخطوة الأهم: انتظر التحقق الحقيقي من الداتابيز أولاً (هل هو حاضر بالفعل؟)
    const isAlreadyAttended = await checkIfStudentAlreadyAttended(student.unique_id, activeSession.id);
    
    if (isAlreadyAttended) {
      console.log('🛑 إيقاف: الطالب حاضر فعلياً، لن نرسل طلب جديد');
      
      if (isBarcode) {
        playSound('warning'); // ⚠️ حاضر بالفعل 
        
        toast.warning(
          <div className="text-right">
            <div className="font-bold text-orange-800 mb-1">
              ⚠️ الطالب حاضر بالفعل!
            </div>
            <div className="text-sm text-orange-700">
              الطالب: {student.name}
            </div>
            <div className="text-xs text-orange-600">
              الحصة: {activeSession?.topic}
            </div>
          </div>,
          {
            duration: 3000,
            position: 'top-center',
            className: 'border-2 border-orange-300'
          }
        );
      }
      return true; // 🆕 نخرج من الدالة هنا تماماً
    }

    // 🔴 2. التحقق من المجموعة (Group Mismatch Guard) 🆕
    // إذا كان الطالب ينتمي لمجموعة مختلفة عن مجموعة الحصة الحالية
    console.log('🔍 BEFORE GROUP CHECK:', {
      isChecked,
      hasGroupId: !!activeSession?.group_id,
      groupId: activeSession?.group_id,
      groupsLength: groups?.length || 0,
      willEnterIf: !!(isChecked && activeSession?.group_id && (groups?.length || 0) > 0)
    });
    
    if (isChecked && activeSession.group_id && groups.length > 0) {
        const studentGroupId = student.group_ids?.[activeSession.course_id];
        
        console.log('🔍 Group Check:', {
          studentGroupId,
          activeGroupId: activeSession.group_id,
          mismatch: studentGroupId && studentGroupId !== activeSession.group_id
        });
        
        // إذا كان الطالب مسكن في مجموعة، وهذه المجموعة مختلفة عن الحالية
        if (studentGroupId && studentGroupId !== activeSession.group_id) {
            const registeredGroupName = groups.find(g => g.id === studentGroupId)?.name || "مجموعة أخرى";

            if (!isAutoMode) {
                // 🔊 نطلب التأكيد من المستخدم
                // استخدام window.confirm يوقف التنفيذ مؤقتاً
                const currentGroupName = groups.find(g => g.id === activeSession.group_id)?.name || 'الحالية';
                const proceed = window.confirm(
                    `⚠️ تنبيه اختلاف المجموعة:\n\n` + 
                    `👤 الطالب: ${student.name}\n` + 
                    `📅 مسجل في: (${registeredGroupName})\n` +
                    `📍 الحصة الحالية: (${currentGroupName})\n\n` + 
                    `هل تريد تحضيره استثنائياً في هذه الحصة؟` 
                );

                if (!proceed) {
                    // ⛔ السيناريو المطلوب: المستخدم ضغط Cancel (رفض)
                    console.log('🛑 تم رفض الحضور بسبب اختلاف المجموعة');
                    playSound('deny'); // 🔊 تشغيل صوت الرفض
                    
                    toast.error(
                        <div className="text-right">
                            <div className="font-bold text-red-800">⛔ تم منع الدخول</div>
                            <div className="text-xs text-red-600">تم رفض الطالب لاختلاف المجموعة ({registeredGroupName})</div>
                        </div>,
                        { 
                            duration: 4000, 
                            position: 'top-center', 
                            className: 'border-2 border-red-300 bg-red-50' 
                        }
                    );
                    
                    return false; // ❌ نوقف الدالة فوراً وميحضرش
                }
            } else {
                // في وضع Auto Mode بنسجله بس بندي تنبيه أنيق
                toast.warning(
                    <div className="text-right">
                        <div className="font-bold text-amber-800 text-sm">⚠️ حضور استثنائي</div>
                        <div className="text-xs text-amber-700">طالب من: {registeredGroupName}</div>
                    </div>,
                    { 
                        position: 'top-center',
                        duration: 3000,
                        className: 'border-2 border-amber-300 bg-amber-50'
                    }
                );
            }
        }
    }

    // 🟢 3. إذا لم يكن حاضراً ووافقنا على المجموعة، نرسل الطلب لـ useAttendance لتسجيله
    console.log('🟢 طالب جديد، يتم التسجيل الآن...');
    
    // 🆕 Override handleAttendanceChange to prevent useAttendance.js toast
    const originalHandleAttendanceChange = handleAttendanceChange;
    const originalToast = window.toast;
    
    // Temporarily disable toast to prevent useAttendance.js message
    window.toast = () => {};
    
    let attendanceResult = false;
    
      try {
          attendanceResult = await originalHandleAttendanceChange(studentId, isChecked, isBarcode);
          
          // 👇 التعديل هنا: لو الرد false (يعني المستخدم داس "لا" في رسالة الدفع)، بنوقف الاسكانر فوراً
          if (attendanceResult === false) {
            console.log('🛑 تم الإلغاء بناءً على اختيار المستخدم');
            return false; // 👈 ده هيمنع رسالة النجاح إنها تظهر
          }
      
      // 🆕 Auto-Save after successful attendance
      if (isChecked && isBarcode) {
        console.log('🔥 Auto-Save: Triggering save after scanner attendance...');
        
        // 🆕 انتظر 300ms عشان الـ state يتحدث
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 🆕 Trigger save by calling saveLedger function if available
        if (typeof window.saveLedger === 'function') {
          console.log('🔥 Auto-Save: Calling saveLedger...');
          await window.saveLedger(true); // silent save
          console.log('✅ Auto-Save: Success!');
        } else {
          console.log('🔍 Auto-Save: saveLedger not found, will be saved manually');
        }
      }
    } finally {
      // Restore toast
      window.toast = originalToast;
    }
    
    // 🆕 Show success toast (with auto-save indication)
    if (isChecked && isBarcode) {
      playSound('success'); // ✅ حضور ناجح
      toast.success(
        <div className="text-right">
          <div className="font-bold text-green-800 mb-1">
            ✅ تم تسجيل الحضور وحفظه تلقائياً!
          </div>
          <div className="text-sm text-green-700">
            الطالب: {student.name}
          </div>
          <div className="text-xs text-green-600">
            الحصة: {activeSession?.topic}
          </div>
        </div>,
        {
          duration: 3000,
          position: 'top-center',
          className: 'border-2 border-green-300'
        }
      );
    }
    
    // 🆕 Return the actual result from attendance
    return attendanceResult;
  }, [activeSession, students, checkIfStudentAlreadyAttended, handleAttendanceChange, groups, isAutoMode, playSound, centerId]); // 🆕 Added dependencies

  /**
   * Format time to 12-hour format with AM/PM
   */
  const formatTime12Hour = useCallback((timeString) => {
    if (!timeString) return 'محدد';
    
    try {
      // Handle different time formats
      let time;
      if (timeString.includes(':')) {
        // If it's already a time string
        if (timeString.includes('T')) {
          // ISO format: 2026-02-04T19:27:00
          time = new Date(timeString);
        } else {
          // Time only: 19:27:00 or 19:27
          const [hours, minutes] = timeString.split(':');
          time = new Date();
          time.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
      } else {
        return 'محدد';
      }
      
      return time.toLocaleTimeString('ar-EG', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  }, []);

  /**
   * Smart Auto-Routing: Find active sessions for student
   */
  const findActiveSessionsForStudent = useCallback(async (studentId) => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);

      console.log('🔍 Smart Auto-Routing Query:', {
        studentId,
        today,
        currentTime,
        activeSessionId: activeSession?.id
      });

      // 🆕 Get student data first to get enrolled_courses
      const { data: student, error: studentError } = await supabaseBrowser
        .from('students')
        .select('enrolled_courses')
        .eq('id', studentId)
        .eq('center_id', centerId)
        .single();

      if (studentError || !student) {
        console.error('Error finding student:', studentError);
        return [];
      }

      console.log('🔍 Student enrolled courses from students table:', student.enrolled_courses);

      // 🆕 Fixed query with course, group, and instructor data
      let query = supabaseBrowser
        .from('sessions')
        .select(`
          *,
          courses(id, name, grade, instructor, instructors(id, name)),
          groups(id, name),
          instructor:courses(name)
        `)
        .eq('center_id', centerId)
        .eq('status', 'active')
        .eq('is_completed', false)
        .is('archived', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      // Exclude current session only if it exists
      if (activeSession?.id) {
        query = query.neq('id', activeSession.id);
      }

      const { data: activeSessions, error, status, statusText } = await query;

      console.log('🔍 Smart Auto-Routing Response (Fixed):', {
        activeSessions: activeSessions?.length || 0,
        error,
        status,
        statusText,
        activeSession
      });

      if (error) {
        console.error('Error finding active sessions (Fixed):', {
          error,
          status,
          statusText,
          details: error.details,
          message: error.message,
          hint: error.hint
        });
        return [];
      }

      // Filter sessions where student is enrolled
      const matchingSessions = activeSessions?.filter(session => 
        student.enrolled_courses?.includes(session.course_id)
      ) || [];

      console.log('🔍 Smart Auto-Routing Final Result:', {
        studentId,
        currentTime,
        activeSessions: activeSessions?.length || 0,
        studentCourseIds: student.enrolled_courses,
        matchingSessions: matchingSessions.length,
        matchingSessionsData: matchingSessions
      });

      return matchingSessions;
    } catch (error) {
      console.error('❌ Catch block error in findActiveSessionsForStudent:', {
        error,
        message: error.message,
        stack: error.stack
      });
      return [];
    }
  }, [activeSession, centerId]);

  /**
   * Smart Auto-Routing: Handle student not enrolled in current session
   * Always returns false because no attendance was recorded
   */
  const handleStudentNotEnrolled = useCallback(async (student) => {
    const alternativeSessions = await findActiveSessionsForStudent(student.id);
    
    if (alternativeSessions.length > 0) {
      // Student has alternative active sessions
      const alternative = alternativeSessions[0];
      
      // Play routing sound
      playSound('routing'); // 🔁 حصة تانية
      
      // Show suggestion
      setSuggestedSession(alternative);
      setShowSuggestion(true);
      
      // ✅ Professional Toast Notification with Action
      toast.warning(
        <div className="text-right">
          <div className="font-bold text-yellow-800 mb-2">
            ⚠️ الطالب {student.name} غير مسجل في هذه الحصة!
          </div>
          <div className="text-sm text-yellow-700 mb-3">
            لديه حصة نشطة حالياً:
          </div>
          <div className="bg-yellow-100 rounded-lg p-3 mb-3">
            <div className="font-semibold text-yellow-900">
              📚 {alternative.courses?.name}
            </div>
            <div className="text-sm text-yellow-700">
              👥 {alternative.courses?.grade} - {alternative.groups?.name}
            </div>
            <div className="text-xs text-yellow-600">
              �‍🏫 {alternative.courses?.instructors?.name || alternative.courses?.instructor || 'السنتر'}
            </div>
            <div className="text-xs text-yellow-600">
              🕐 {formatTime12Hour(alternative.scheduled_start_time)}
            </div>
          </div>
          <div className="text-xs text-yellow-600">
            يرجى فتح الحصة الصحيحة وتسجيل الحضور هناك.
          </div>
        </div>,
        {
          duration: 8000,
          position: 'top-center',
          className: 'border-2 border-yellow-300'
        }
      );
    } else {
      // No alternative sessions
      playSound('deny'); // ⛔ لا حصة ولا تسجيل
      
      // ✅ Professional Toast Notification
      toast.error(
        <div className="text-right">
          <div className="font-bold text-red-800 mb-2">
            ⚠️ الطالب {student.name} غير مسجل في هذه الحصة!
          </div>
          <div className="text-sm text-red-700">
            وليس لديه حصص أخرى نشطة حالياً.
          </div>
          <div className="text-xs text-red-600 mt-2">
            تأكد من فتح الحصة الصحيحة.
          </div>
        </div>,
        {
          duration: 6000,
          position: 'top-center',
          className: 'border-2 border-red-300'
        }
      );
    }
    
    // ✅ Always return false - no attendance was recorded
    return false;
  }, [findActiveSessionsForStudent]);

  /**
   * Handle barcode input from any input field
   */
  const handleBarcodeInput = useCallback(async (e) => {
    const code = e.target.value.trim();
    if (!code) return;
    const cleanCode = code.split('_')[0];
    
    console.log('🔍 handleBarcodeInput called with code:', code);
    
    const student = students.find(s => s.unique_id === cleanCode);
    console.log('🔍 Found student:', student ? student.name : 'Not found');
    
    if (student) {
      // 🆕 Set scanned student for UI banner
      setScannedStudent(student);
      
      // Smart Auto-Routing Validation - enrolled_courses is array of strings
      const enrolledCourseIds = student.enrolled_courses || [];
      
      console.log('🔍 Scanner Debug - Student enrolled_courses (text[]):', student.enrolled_courses);
      console.log('🔍 Scanner Debug - Enrolled course IDs:', enrolledCourseIds);
      console.log('🔍 Scanner Debug - Active session course ID:', activeSession?.course_id);
      console.log('🔍 Scanner Debug - Is enrolled in current session:', enrolledCourseIds.includes(activeSession.course_id));
      
      if (!enrolledCourseIds.includes(activeSession.course_id)) {
        console.log('🔍 Student not enrolled, calling Smart Auto-Routing');
        // Try Smart Auto-Routing
        handleStudentNotEnrolled(student);
        e.target.value = ''; // Clear input
        return;
      }
      
      console.log('🔍 Student is enrolled, checking attendance...');
      // Student is enrolled - proceed normally
      // 🆕 Use custom attendance handler instead of direct handleAttendanceChange
      console.log('🔍 Calling custom attendance handler...');
      const result = await handleCustomAttendanceChange(student.id, true, true);
      console.log('🔍 Custom attendance handler result:', result);
      
      // Clear input after successful scan
      e.target.value = '';
    } else {
      console.log('🔍 Student not found, showing error');
      // 🆕 Clear scanned student if not found
      setScannedStudent(null);
      playSound('error'); // ❌ كود غير موجود
      toast.error('لم يتم العثور على الطالب بهذا الكود', {
        duration: 3000,
        position: 'top-center'
      });
      e.target.value = '';
    }
  }, [students, activeSession, handleCustomAttendanceChange, handleStudentNotEnrolled, centerId]);

  /**
   * Enhanced: Handle physical barcode scanner input with Smart Auto-Routing
   */
  const handlePhysicalBarcodeScan = useCallback(async (e) => {
    console.log('🔍 handlePhysicalBarcodeScan called:', { key: e.key, target: e.target.tagName, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey });
    
    // 🆕 Ignore modifier keys to prevent interference with barcode buffer
    if (e.ctrlKey || e.altKey || e.metaKey) {
      console.log('🔍 Modifier key pressed, ignoring');
      return;
    }
    
    if (!activeSession || activeSession.is_completed) {
      console.log('🔍 No active session or session completed, returning');
      return;
    }
    
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      console.log('🔍 Target is input/textarea, ignoring');
      return;
    }
    
    if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
    
    if (e.key === 'Enter') {
      console.log('🔍 Enter key pressed, barcodeBuffer:', barcodeBuffer.current);
      
      if (barcodeBuffer.current.length > 2) {
        const code = barcodeBuffer.current.trim();
        const cleanCode = code.split('_')[0];
        console.log('🔍 Processing barcode code:', code);
        
        const student = students.find(s => s.unique_id === cleanCode);
        console.log('🔍 Found student:', student ? student.name : 'Not found');
        
        if (student) {
          console.log('🔍 Student found, proceeding with enrollment check...');
          // 🆕 Set scanned student for UI banner
          setScannedStudent(student);
          
          // Smart Auto-Routing Validation - enrolled_courses is array of strings
          const enrolledCourseIds = student.enrolled_courses || [];
          
          console.log('🔍 Scanner Debug - Student enrolled_courses (text[]):', student.enrolled_courses);
          console.log('🔍 Scanner Debug - Enrolled course IDs:', enrolledCourseIds);
          console.log('🔍 Scanner Debug - Active session course ID:', activeSession?.course_id);
          console.log('🔍 Scanner Debug - Is enrolled in current session:', enrolledCourseIds.includes(activeSession.course_id));
          
          if (!enrolledCourseIds.includes(activeSession.course_id)) {
            console.log('🔍 Student not enrolled, calling Smart Auto-Routing');
            // Try Smart Auto-Routing
            handleStudentNotEnrolled(student);
            barcodeBuffer.current = '';
            return;
          }
          
          console.log('🔍 Student is enrolled, checking attendance...');
          // Student is enrolled - proceed normally
          // 🆕 Use custom attendance handler instead of direct handleAttendanceChange
          console.log('🔍 Calling custom attendance handler...');
          const result = await handleCustomAttendanceChange(student.id, true, true);
          console.log('🔍 Custom attendance handler result:', result);
        } else {
          console.log('🔍 Student not found, showing error');
          // 🆕 Clear scanned student if not found
          setScannedStudent(null);
          playSound('error'); // ❌ كود غير موجود
          toast.error('لم يتم العثور على الطالب بهذا الكود', {
            duration: 3000,
            position: 'top-center'
          });
        }
      }
      barcodeBuffer.current = '';
      return;
    }

    if (e.key.length === 1 && /[0-9a-zA-Z]/.test(e.key)) {
      console.log('🔍 Adding character to buffer:', e.key);
      barcodeBuffer.current += e.key;
    }

    barcodeTimeout.current = setTimeout(() => {
      console.log('🔍 Barcode buffer timeout, clearing');
      barcodeBuffer.current = '';
    }, 100);
  }, [activeSession, students, handleCustomAttendanceChange, handleStudentNotEnrolled, centerId]);

  /**
   * Enhanced: Handle manual barcode input with Smart Auto-Routing
   */
  const handleManualBarcodeInput = useCallback(async (code) => {
    const cleanCode = code.split('_')[0];
    const student = students.find(s => s.unique_id === cleanCode);
    
    if (student) {
      // 🆕 Set scanned student for UI banner
      setScannedStudent(student);
      
      // Smart Auto-Routing Validation - enrolled_courses is array of strings
      const enrolledCourseIds = student.enrolled_courses || [];
      
      console.log('🔍 Scanner Debug - Student enrolled_courses (text[]):', student.enrolled_courses);
      console.log('🔍 Scanner Debug - Enrolled course IDs:', enrolledCourseIds);
      console.log('🔍 Scanner Debug - Active session course ID:', activeSession?.course_id);
      
      const isEnrolled = enrolledCourseIds.includes(activeSession?.course_id);
      console.log('🔍 Scanner Debug - Is enrolled in current session:', isEnrolled);
      
      if (!isEnrolled) {
        // Try Smart Auto-Routing - always returns false
        await handleStudentNotEnrolled(student);
        return false;
      }
      
      // Student is enrolled - proceed normally
      handleAttendanceChange(student.id, true, true);
      
      // 🆕 Success toast for attendance
      toast.success(
        <div className="text-right">
          <div className="font-bold text-green-800 mb-1">
            ✅ تم تسجيل الحضور بنجاح!
          </div>
          <div className="text-sm text-green-700">
            الطالب: {student.name}
          </div>
          <div className="text-xs text-green-600">
            الحصة: {activeSession?.topic}
          </div>
        </div>,
        {
          duration: 3000,
          position: 'top-center',
          className: 'border-2 border-green-300'
        }
      );
      
      return true;
    } else {
      // 🆕 Clear scanned student if not found
      setScannedStudent(null);
      new Audio('https://assets.mixkit.co/active_storage/sfx/1073-preview.mp3').play().catch(() => {});
      toast.error('الكود غير صحيح أو طالب غير مسجل', {
        duration: 3000,
        position: 'top-center'
      });
      return false;
    }
  }, [activeSession, students, handleAttendanceChange, handleStudentNotEnrolled, centerId]);

  /**
   * Enhanced: QR Scanner with Smart Auto-Routing
   */
  const onScanSuccess = useCallback(async (decodedText) => {

    const now = Date.now();
    if (lastScannedCode.current === decodedText && (now - lastScanTime.current) < 3000) {
      return; // تجاهل الكود لو لسه مقري من أقل من 3 ثواني
    }
    lastScannedCode.current = decodedText;
    lastScanTime.current = now;

    const cleanText = decodedText.split('_')[0];
    const student = students.find(s => s.unique_id === cleanText);
    
    if (student) {
      // 🆕 Set scanned student for UI banner
      setScannedStudent(student);
      
      // Smart Auto-Routing Validation - enrolled_courses is array of strings
      const enrolledCourseIds = student.enrolled_courses || [];
      
      const isEnrolled = enrolledCourseIds.includes(activeSession.course_id);
      
      if (!isEnrolled) {
        // Try Smart Auto-Routing - always returns false
        await handleStudentNotEnrolled(student);
        return;
      }
      
      // 🆕 Use custom attendance handler instead of direct handleAttendanceChange
      console.log('🔍 Calling custom attendance handler (QR scan)...');
      await handleCustomAttendanceChange(student.id, true, true);
    } else {
      // 🆕 Clear scanned student if not found
      setScannedStudent(null);
      new Audio('https://assets.mixkit.co/active_storage/sfx/1073-preview.mp3').play().catch(() => {});
      toast.error('لم يتم العثور على الطالب بهذا الكود', {
        duration: 3000,
        position: 'top-center'
      });
    }
  }, [students, activeSession, handleCustomAttendanceChange, handleStudentNotEnrolled, centerId]);

  // 👇 3. مرجع بيحتفظ بأحدث نسخة من دالة الاسكان بدون ما يسبب Re-render للكاميرا
  const latestOnScanSuccess = useRef(onScanSuccess);
  useEffect(() => {
    latestOnScanSuccess.current = onScanSuccess;
  }, [onScanSuccess]);

  /**
   * Toggle camera scanner
   */
  const toggleCameraScanner = useCallback(() => {
    setScannerActive(prev => !prev);
  }, []);

  /**
   * Stop camera scanner
   */
  const stopCameraScanner = useCallback(() => {
    setScannerActive(false);
  }, []);

  // Initialize QR scanner when camera is activated
// 👇 4. تشغيل الكاميرا بثبات (بدون تقطيع أو إغلاق)
  useEffect(() => {
    if (!scannerActive || !activeSession) return;
    
    const qrScanner = new Html5QrcodeScanner(
      "reader", 
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }, 
        rememberLastUsedCamera: true 
      }, 
      false
    );
    
    // استخدمنا الـ ref هنا عشان الكاميرا متعملش ريستارت مع كل طالب!
    qrScanner.render((text) => latestOnScanSuccess.current(text), (e) => {});
    qrScannerRef.current = qrScanner;

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(console.error);
        qrScannerRef.current = null;
      }
    };
  // 👈 ركز هنا: شيلنا onScanSuccess من المصفوفة دي عشان الكاميرا متقفلش!
  }, [scannerActive, activeSession, centerId]);

  return {
    scannerActive,
    toggleCameraScanner,
    stopCameraScanner,
    handlePhysicalBarcodeScan,
    handleManualBarcodeInput,
    handleBarcodeInput, // 🆕 New input field handler
    // 🆕 New Smart Auto-Routing states
    suggestedSession,
    showSuggestion,
    setShowSuggestion,
    // 🆕 Scanned student for UI banner
    scannedStudent,
    setScannedStudent
  };
};

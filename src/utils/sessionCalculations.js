/**
 * Pure business logic calculations for sessions
 * These functions are stateless and can be used anywhere
 */

/**
 * Calculate total debt for a student across all sessions
 * @param {string} studentId - Student ID or unique_id
 * @param {Array} students - Array of student objects
 * @param {Array} sessions - Array of session objects
 * @returns {number} Total debt amount
 */
export const calculateTotalStudentDebt = (studentId, students, sessions, subscriptions = []) => {
  let totalDebt = 0;
  if (!students || !Array.isArray(students) || !sessions || !Array.isArray(sessions)) return 0;
  
  const student = students.find(s => s.id === studentId || s.unique_id === studentId);
  if (!student) return 0;

  sessions.forEach(session => {
    if (session.attendees?.includes(student.unique_id)) {
      // 1. التشييك على الاشتراك الشهري لهذه المادة في تاريخ الحصة
      const sub = (subscriptions || []).find(s => s.student_id === student.id && s.course_id === session.course_id);
      
      let isMonthlyPaid = false;
      if (sub?.expires_at) {
        const expiryDate = new Date(sub.expires_at);
        expiryDate.setHours(23, 59, 59, 999);
        isMonthlyPaid = expiryDate >= new Date(session.created_at);
      }

      // استخدام الدالة الموحدة لحساب المبلغ المطلوب
      const required = calculateRequiredPayment(student, session, isMonthlyPaid);
      const paid = parseFloat(session.payments?.[student.unique_id]) || 0;
      
      if (required > paid) {
        totalDebt += (required - paid);
      }
    }
  });
  return totalDebt;
};

/**
 * Calculate session display statistics
 * @param {Object} session - Session object
 * @returns {Object} Statistics object with count, totalIncome, centerTotal, teacherTotal
 */
export const getSessionDisplayStats = (session) => {
  const count = session.attendees?.length || 0;
  let income = 0;
  if (session.payments && typeof session.payments === 'object') {
    income = Object.values(session.payments).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
  }
  const center = count * (parseFloat(session.fixed_share) || 0);
  const teacher = Math.max(0, income - center);
  return { count, totalIncome: income, centerTotal: center, teacherTotal: teacher };
};

/**
 * Calculate teacher and center share distribution
 * @param {number} totalIncome - Total income from session
 * @param {number} attendeeCount - Number of attendees
 * @param {number} fixedShare - Fixed share per attendee for center
 * @returns {Object} Object with centerTotal and teacherTotal
 */
export const calculateShareDistribution = (totalIncome, attendeeCount, fixedShare) => {
  const centerTotal = attendeeCount * (parseFloat(fixedShare) || 0);
  const teacherTotal = Math.max(0, totalIncome - centerTotal);
  return { centerTotal, teacherTotal };
};

/**
 * Calculate required payment for a student in a session
 * @param {Object} student - Student object
 * @param {Object} session - Session object
 * @param {boolean} isMonthlyPaid - Whether the student paid the monthly subscription
 * @returns {number} Required payment amount
 */
export const calculateRequiredPayment = (student, session, isMonthlyPaid = false) => {
  const courseId = session.course_id;
  
  // 1. إعفاء كلي (طالب حالة)
  if (student.is_free) return 0;
  
  // 2. إعفاء من مادة معينة
  if (student.free_courses?.includes(courseId)) return 0;

  // 3. اشتراك شهري مدفوع لهذه المادة تحديداً
  const isMonthlyForThisCourse = student.monthly_courses?.includes(courseId);
  const isGlobalMonthly = student.subscription_type === 'شهري';
  
  if ((isMonthlyForThisCourse || isGlobalMonthly) && isMonthlyPaid) {
    return 0;
  }
  
  // 4. دفع نصيب السنتر فقط (المدرس متنازل عن نسبته)
  if (student.center_only_courses?.includes(courseId)) {
    return parseFloat(session.fixed_share) || 0;
  }
  
  // 5. الخصم العادي أو السعر الكامل
  let required = parseFloat(session.price) || 0;
  if (student.course_discounts?.[courseId]) {
    required = Math.max(0, required - parseFloat(student.course_discounts[courseId]));
  }
  return required;
};

/**
 * Calculate session debt for reporting
 * @param {Object} session - Session object
 * @param {Array} students - Array of student objects
 * @param {Object} monthlySubsMap - Optional map of student_id -> Boolean (paid)
 * @returns {number} Total debt for the session
 */
export const calculateSessionDebt = (session, students, subscriptions = []) => {
  let sessionDebt = 0;
  if (!session || !students || !Array.isArray(students)) return 0;
  
  session.attendees?.forEach(unique_id => {
    const student = students.find(x => x.unique_id === unique_id);
    if (student) {
      // التشييك على الاشتراك الشهري في تاريخ الحصة (نهاية اليوم)
      const sub = (subscriptions || []).find(s => s.student_id === student.id && s.course_id === session.course_id);
      let isPaidMonthly = false;
      if (sub?.expires_at) {
        const expiryDate = new Date(sub.expires_at);
        expiryDate.setHours(23, 59, 59, 999);
        isPaidMonthly = expiryDate >= new Date(session.created_at);
      }

      const required = calculateRequiredPayment(student, session, isPaidMonthly);
      const paid = parseFloat(session.payments?.[unique_id]) || 0;
      if (paid < required) sessionDebt += (required - paid);
    }
  });
  return sessionDebt;
};

/**
 * Get available grades from courses array
 * @param {Array} courses - Array of course objects
 * @returns {Array} Sorted array of unique grades
 */
export const getAvailableGrades = (courses) => {
  if (!courses || !Array.isArray(courses)) return [];
  const grades = courses.map(c => c.grade).filter(Boolean);
  return [...new Set(grades)].sort();
};

/**
 * Filter courses by grade
 * @param {Array} courses - Array of course objects
 * @param {string} selectedGrade - Selected grade to filter by
 * @returns {Array} Filtered courses array
 */
export const filterCoursesByGrade = (courses, selectedGrade) => {
  if (!courses || !Array.isArray(courses) || !selectedGrade) return [];
  return courses.filter(c => c.grade === selectedGrade);
};

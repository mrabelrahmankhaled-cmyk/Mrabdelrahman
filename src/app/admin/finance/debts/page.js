'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabaseBrowser } from '../../../../lib/supabase';
import { 
  FaExclamationTriangle, FaSearch, FaWhatsapp, FaCheckCircle, 
  FaArrowLeft, FaFileExcel, FaUndo, FaFileDownload, FaUserGraduate,
  FaBookOpen, FaChalkboardTeacher, FaFilter, FaMoneyBillWave, FaSync,
  FaUsers, FaChartPie, FaChevronDown, FaEllipsisV, FaRegClock, FaCreditCard
} from 'react-icons/fa';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../../context/AuthContext';
import { calculateRequiredPayment } from '../../../../utils/sessionCalculations';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function DebtsPage() {
  const { centerId, allowedFeatures, loading: authLoading } = useAuth();
  
  // 📊 Core Data States
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [centerConfig, setCenterConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSettleLoading, setIsSettleLoading] = useState(false);

  // 🔍 Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isFilterVisible, setIsFilterVisible] = useState(true);

  // 🛡️ Route Protection
  const hasAccess = useMemo(() => {
    return !authLoading && allowedFeatures?.includes('students:finance');
  }, [authLoading, allowedFeatures]);

  useEffect(() => {
    if (centerId) {
      fetchData();
    }
  }, [centerId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessRes, studRes, courRes, subsRes, configRes] = await Promise.all([
        supabaseBrowser.from('sessions').select('*').eq('center_id', centerId).order('created_at', { ascending: false }),
        supabaseBrowser.from('students').select('*').eq('center_id', centerId),
        supabaseBrowser.from('courses').select('id, name, instructor, instructors(id, name), grade').eq('center_id', centerId),
        supabaseBrowser.from('student_subscriptions').select('*').eq('center_id', centerId),
        supabaseBrowser.from('center_settings').select('*').eq('center_id', centerId).maybeSingle()
      ]);

      setSessions(sessRes.data || []);
      setStudents(studRes.data || []);
      setCourses(courRes.data || []);
      setSubscriptions(subsRes.data || []);
      setCenterConfig(configRes.data);
    } catch (err) {
      toast.error("خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  // 🧮 Debt Calculation Engine
  const allDebts = useMemo(() => {
    let debts = [];
    sessions.forEach(session => {
      if (session.payments) {
        Object.entries(session.payments).forEach(([studentId, paidAmount]) => {
          const student = students.find(s => s.unique_id === studentId || s.id === studentId);
          if (!student) return;

          const course = courses.find(c => c.id === session.course_id);
          const studentSubs = (subscriptions || []).filter(s => s.student_id === student.id && s.course_id === session.course_id);
          const activeSub = studentSubs.find(sub => {
            if (!sub.expires_at) return false;
            const expiryDate = new Date(sub.expires_at);
            expiryDate.setHours(23, 59, 59, 999);
            return expiryDate >= new Date(session.created_at);
          });
          
          const isPaidMonthly = !!activeSub;
          const required = calculateRequiredPayment(student, session, isPaidMonthly);
          const paid = parseFloat(paidAmount) || 0;
          const debtValue = required - paid;

          if (debtValue > 0) {
            debts.push({
              id: `${session.id}-${studentId}`,
              studentName: student?.name || 'طالب محذوف',
              studentPhone: student?.parent_phone || '',
              courseName: course?.name || '---',
              instructor: course?.instructors?.name || course?.instructor || '---',
              grade: course?.grade || 'غير محدد',
              amount: debtValue,
              sessionId: session.id,
              studentUid: studentId,
              date: session.created_at,
              status: student.center_only_courses?.includes(session.course_id) ? 'centerOnly' : 
                     (isPaidMonthly ? 'monthly' : 
                     (student.course_discounts?.[session.course_id] > 0 ? 'discount' : 'regular')),
              isMonthlyCourse: student.monthly_courses?.includes(session.course_id) || student.subscription_type === 'شهري',
              isPaidMonthly,
              studentId: student.id
            });
          }
        });
      }
    });
    return debts;
  }, [sessions, students, courses, subscriptions]);

  // 🧪 Statistics
  const stats = useMemo(() => {
    return {
      total: allDebts.reduce((s, d) => s + d.amount, 0),
      count: allDebts.length,
      avg: allDebts.length ? allDebts.reduce((s, d) => s + d.amount, 0) / allDebts.length : 0,
      monthly: allDebts.filter(d => d.isMonthlyCourse && !d.isPaidMonthly).length
    };
  }, [allDebts]);

  // 🔍 Filter Logic
  const filteredDebts = useMemo(() => {
    return allDebts.filter(d => {
      const mSearch = d.studentName?.toLowerCase().includes(searchTerm.toLowerCase());
      const mGrade = !selectedGrade || d.grade === selectedGrade;
      const mCourse = !selectedCourse || d.courseName === selectedCourse;
      const mInstructor = !selectedInstructor || d.instructor === selectedInstructor;
      const mStatus = !selectedStatus || 
        (selectedStatus === 'monthly_expired' ? (d.isMonthlyCourse && !d.isPaidMonthly) : d.status === selectedStatus);
      return mSearch && mGrade && mCourse && mInstructor && mStatus;
    });
  }, [allDebts, searchTerm, selectedGrade, selectedCourse, selectedInstructor, selectedStatus]);

  const availableGrades = useMemo(() => [...new Set(allDebts.map(d => d.grade))].filter(Boolean).sort(), [allDebts]);
  const availableCourses = useMemo(() => [...new Set(allDebts.map(d => d.courseName))].filter(Boolean).sort(), [allDebts]);
  const availableInstructors = useMemo(() => [...new Set(allDebts.map(d => d.instructor))].filter(Boolean).sort(), [allDebts]);

  // ⌨️ Handlers
  const handleSettleDebt = async (debt) => {
    if (!centerId) return toast.error('خطأ في المركز');
    
    const confirmSettle = window.confirm(`هل استلمت مبلغ ${debt.amount.toFixed(2)} ج من ${debt.studentName}؟`);
    if (!confirmSettle) return;

    setIsSettleLoading(true);
    try {
      const session = sessions.find(s => s.id === debt.sessionId);
      const updatedPayments = { ...session.payments, [debt.studentUid]: (parseFloat(session.payments[debt.studentUid] || 0) + debt.amount).toFixed(2) };
      
      const { error } = await supabaseBrowser
        .from('sessions')
        .update({ payments: updatedPayments })
        .eq('id', debt.sessionId)
        .eq('center_id', centerId);

      if (error) throw error;

      setSessions(prev => prev.map(s => s.id === debt.sessionId ? { ...s, payments: updatedPayments } : s));
      toast.success("تم تسديد المديونية بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء التسديد");
    } finally {
      setIsSettleLoading(false);
    }
  };

  const handleWhatsApp = (debt) => {
    let p = debt.studentPhone.replace(/\D/g, ''); 
    if (p.startsWith('01')) p = '2' + p;
    let template = centerConfig?.msg_debt || "تذكير مالي: الطالب [name] متبقي عليه مبلغ [amount] ج.م من حصة [topic]";
    const finalMsg = template
      .replace(/\[name\]/g, debt.studentName)
      .replace(/\[amount\]/g, debt.amount.toFixed(2))
      .replace(/\[topic\]/g, debt.courseName);
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(finalMsg)}`, '_blank');
  };

  const handleMassWhatsApp = () => {
    if (filteredDebts.length === 0) return toast.error("القائمة فارغة");
    if (!confirm(`سيتم فتح ${filteredDebts.length} محادثة واتساب متتابعة. هل تريد الاستمرار؟`)) return;

    filteredDebts.forEach((d, i) => {
      setTimeout(() => handleWhatsApp(d), i * 1500);
    });
  };

  const exportToExcel = () => {
    if (filteredDebts.length === 0) return toast.error("لا توجد بيانات لتصديرها");
    const excelRows = filteredDebts.map(d => ({
      "اسم الطالب": d.studentName,
      "الصف": d.grade,
      "المادة": d.courseName,
      "المدرس": d.instructor,
      "المبلغ": d.amount,
      "التاريخ": new Date(d.date).toLocaleDateString('ar-EG'),
      "رقم ولي الأمر": d.studentPhone
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المديونيات");
    XLSX.writeFile(workbook, `مديونيات_الطلاب_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-black animate-pulse">جاري التحقق من الصلاحيات...</p>
      </div>
    </div>
  );

  if (!hasAccess) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-red-100">
        <FaExclamationTriangle size={40} />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">عذراً، غير مصرح لك!</h1>
      <p className="text-slate-500 font-bold mb-8">ليس لديك صلاحية الوصول لسجل المديونيات المالية.</p>
      <Link href="/admin/dashboard" className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:shadow-xl transition-all">العودة للرئيسية</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-cairo pb-10" dir="rtl">
      <Toaster position="top-center" />

      {/* 🏔️ Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-start gap-6">
              <Link href="/admin/finance" className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-slate-100 group shadow-sm mt-2">
                <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
              </Link>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <span className="bg-red-600/10 text-red-600 text-[11px] font-black px-4 py-1.5 rounded-full border border-red-100 uppercase tracking-widest shadow-sm">Financial Risks</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.3] tracking-tight">
                  سجل المديونيات <span className="text-red-600 block md:inline md:mr-2">والدفعات المتأخرة</span>
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-auto">
              {[
                { label: 'إجمالي المديونات', value: stats.total.toFixed(2), unit: 'ج.م', color: 'red', icon: <FaMoneyBillWave /> },
                { label: 'عدد المطالبات', value: stats.count, unit: 'طلب', color: 'blue', icon: <FaUsers /> },
              ].map((s, i) => (
                <div key={i} className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-xl hover:shadow-slate-100 transition-all">
                  <div className={`w-12 h-12 rounded-2xl bg-${s.color}-600 text-white flex items-center justify-center text-xl shadow-lg shadow-${s.color}-100 transition-transform group-hover:rotate-12`}>{s.icon}</div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900">{s.value} <span className="text-xs opacity-40">{s.unit}</span></h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 space-y-8">
        {/* 🔍 Filter Studio */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex flex-col lg:flex-row items-end gap-6">
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mr-1">البحث عن طالب</label>
                <div className="relative group">
                  <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-red-500 transition-all" />
                  <input 
                    type="text" 
                    placeholder="اسم الطالب..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 pr-11 pl-4 bg-slate-50 border-none rounded-xl text-xs font-black outline-none focus:ring-2 ring-red-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mr-1">الصف الدراسي</label>
                <select 
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-xs font-black outline-none focus:ring-2 ring-red-500/10 appearance-none"
                >
                  <option value="">كل الصفوف</option>
                  {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mr-1">المادة</label>
                <select 
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-xs font-black outline-none focus:ring-2 ring-red-500/10 appearance-none"
                >
                  <option value="">كل المواد</option>
                  {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mr-1">المدرس</label>
                <select 
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-xs font-black outline-none focus:ring-2 ring-red-500/10 appearance-none"
                >
                  <option value="">كل المدرسين</option>
                  {availableInstructors.map(i => <option key={i} value={i}>م/ {i}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mr-1">الحالة</label>
                <select 
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-xs font-black outline-none focus:ring-2 ring-red-500/10 appearance-none"
                >
                  <option value="">كل الحالات</option>
                  <option value="monthly_expired">شهري (منتهي) 📅</option>
                  <option value="centerOnly">سنتر فقط 🏢</option>
                  <option value="discount">بخصم خاص 📉</option>
                  <option value="regular">عادي 👤</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
              {(searchTerm || selectedGrade || selectedCourse || selectedInstructor || selectedStatus) && (
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedGrade(''); setSelectedCourse(''); setSelectedInstructor(''); setSelectedStatus(''); }}
                  className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all shrink-0 shadow-sm"
                  title="مسح الكل"
                >
                  <FaUndo size={14} />
                </button>
              )}
              <button 
                onClick={exportToExcel}
                className="flex-1 lg:flex-none px-6 h-12 bg-blue-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-3 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                <FaFileExcel size={16}/> تصدير
              </button>
              <button 
                onClick={handleMassWhatsApp}
                className="flex-1 lg:flex-none px-6 h-12 bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                <FaWhatsapp size={16}/> طلب جماعي
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Debt Ledger Table */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest text-right">
                  <th className="p-6">الطالب والبيانات</th>
                  <th className="p-6">المادة والمحتوى</th>
                  <th className="p-6 text-center">الصف</th>
                  <th className="p-6 text-center">المبلغ المستحق</th>
                  <th className="p-6 text-center">تاريخ المديونية</th>
                  <th className="p-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-6"><div className="h-10 bg-slate-50 rounded-2xl w-48"></div></td>
                      <td className="p-6"><div className="h-10 bg-slate-50 rounded-2xl w-32"></div></td>
                      <td className="p-6"><div className="h-6 bg-slate-50 rounded-full w-20 mx-auto"></div></td>
                      <td className="p-6"><div className="h-8 bg-red-50 rounded-xl w-24 mx-auto"></div></td>
                      <td className="p-6"><div className="h-6 bg-slate-50 rounded-xl w-32 mx-auto"></div></td>
                      <td className="p-6"><div className="h-10 bg-slate-50 rounded-2xl w-32 mx-auto"></div></td>
                    </tr>
                  ))
                ) : filteredDebts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <FaCheckCircle size={80} className="text-emerald-500" />
                        <h3 className="text-2xl font-black text-slate-900">لا يوجد مديونيات متأخرة</h3>
                        <p className="text-sm font-bold">جميع المدفوعات تمت بشكل صحيح في هذا النطاق.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence>
                    {filteredDebts.map((debt, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        key={debt.id} 
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg group-hover:bg-white transition-all shadow-inner">
                                    {debt.studentName?.[0]}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-sm mb-1">{debt.studentName}</h4>
                                    <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold">
                                        <FaPhone size={8}/> {debt.studentPhone || 'بدون رقم'}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="p-6 font-bold">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-700">{debt.courseName}</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black border border-slate-100">م/ {debt.instructor}</span>
                                    {debt.isMonthlyCourse && !debt.isPaidMonthly && <span className="text-[8px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-black border border-red-100">شهري منتهي</span>}
                                    {debt.status === 'centerOnly' && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black border border-indigo-100">سنتر فقط</span>}
                                    {debt.status === 'discount' && <span className="text-[8px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-black border border-amber-100">خصم خاص</span>}
                                </div>
                            </div>
                        </td>
                        <td className="p-6 text-center">
                            <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1 rounded-full border border-blue-100">
                                {debt.grade}
                            </span>
                        </td>
                        <td className="p-6 text-center">
                            <div className="inline-flex flex-col items-center">
                                <span className="text-xl font-black text-red-600 mb-0.5 tracking-tight">{debt.amount.toFixed(2)}</span>
                                <span className="text-[8px] font-black text-slate-300 uppercase">جنيه مصري</span>
                            </div>
                        </td>
                        <td className="p-6 text-center">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black text-slate-600">
                                    {new Date(debt.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 opacity-60 flex items-center gap-1 uppercase tracking-tighter">
                                    <FaRegClock size={8}/> {new Date(debt.date).getFullYear()}
                                </span>
                            </div>
                        </td>
                        <td className="p-6">
                            <div className="flex items-center justify-center gap-3">
                                <button 
                                    onClick={() => handleSettleDebt(debt)}
                                    disabled={isSettleLoading}
                                    className="bg-emerald-600 text-white h-10 px-5 rounded-xl text-[10px] font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all transform active:scale-95 disabled:opacity-50"
                                >
                                    تسديد المبلغ
                                </button>
                                <button 
                                    onClick={() => handleWhatsApp(debt)}
                                    className="w-10 h-10 bg-white text-emerald-600 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm hover:shadow-md hover:bg-emerald-50 transition-all transform active:scale-95"
                                    title="إرسال تذكير"
                                >
                                    <FaWhatsapp size={18}/>
                                </button>
                                <button 
                                    className="w-10 h-10 bg-white text-slate-300 rounded-xl flex items-center justify-center border border-slate-100 hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <FaEllipsisV size={12}/>
                                </button>
                            </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        .font-cairo { font-family: 'Cairo', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// 📱 Reusable Mini Icon (optional but kept inline for now)
function FaPhone({ size }) {
    return <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height={size} width={size} xmlns="http://www.w3.org/2000/svg"><path d="M493.4 24.6l-104-24c-11.3-2.6-22.9 3.3-27.5 13.9l-48 112c-4.2 9.8-1.4 21.3 6.9 28l60.6 49.6c-36 76.7-98.9 140.5-177.2 177.2l-49.6-60.6c-6.7-8.3-18.2-11.1-28-6.9l-112 48C3.9 366.5-2 378.1.6 389.4l24 104C27.1 504.2 36.7 512 48 512c256.1 0 464-207.5 464-464 0-11.2-7.7-20.9-18.6-23.4z"></path></svg>;
}

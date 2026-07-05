'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase-browser';
import { useAuth } from '../../../../context/AuthContext';
import {
  FaClock, FaUsers, FaCheckCircle,
  FaArrowLeft, FaDownload, FaCalendarAlt,
  FaUserClock, FaSync, FaEdit, FaTimes, FaMapMarkerAlt,
  FaDesktop, FaChartBar, FaCalendarDay
} from 'react-icons/fa';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import AccessDenied from '../../../../components/AccessDenied';

// ════════════════════════════════════════
// Helpers
// ════════════════════════════════════════
const formatTime = (ts) => {
  if (!ts) return '---';
  return new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
};
const fmtDuration = (mins) => {
  if (!mins && mins !== 0) return '---';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}س ${m}د`;
};
const toLocalDatetimeInput = (isoStr) => {
  const d = new Date(isoStr);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function StaffAttendancePage() {
  const { centerId, allowedFeatures, loading: authLoading, user } = useAuth();

  if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_staff_attendance')) {
    return <AccessDenied />;
  }

  // ── View Mode ──
  const [viewMode, setViewMode] = useState('monthly'); // 'daily' | 'monthly'

  // ── Daily State ──
  const [dailyDate, setDailyDate]       = useState(new Date().toISOString().split('T')[0]);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // ── Monthly State ──
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // ── Filters ──
  const [selectedStaff, setSelectedStaff] = useState('');

  // ── Override Modal ──
  const [editModal, setEditModal]     = useState(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editReason, setEditReason]   = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // جداول الموظفين الأسبوعية (staff_id => day_of_week[])
  const [staffSchedules, setStaffSchedules] = useState({});

  // ── Fetch ──
  useEffect(() => { if (centerId && viewMode === 'daily') fetchDaily(); }, [centerId, dailyDate, viewMode]);
  useEffect(() => { if (centerId && viewMode === 'monthly') fetchMonthly(); }, [centerId, selectedMonth, viewMode]);

  const fetchDaily = async () => {
    setDailyLoading(true);
    const { data, error } = await supabase
      .from('staff_attendance').select('*')
      .eq('center_id', centerId).eq('date', dailyDate)
      .order('check_in', { ascending: true });
    if (!error) setDailyRecords(data || []);
    else toast.error('خطأ في جلب البيانات');
    setDailyLoading(false);
  };

  const fetchMonthly = async () => {
    setMonthlyLoading(true);
    const [year, month] = selectedMonth.split('-');
    const firstDay = `${year}-${month}-01`;
    const lastDay  = new Date(year, month, 0).toISOString().split('T')[0];

    // جلب سجلات الحضور + جداول الموظفين بالتوازي
    const [attRes, schedRes] = await Promise.all([
      supabase
        .from('staff_attendance').select('*')
        .eq('center_id', centerId)
        .gte('date', firstDay).lte('date', lastDay)
        .order('date', { ascending: true }),
      supabase
        .from('staff_schedules').select('*')
        .eq('center_id', centerId)
    ]);

    if (!attRes.error) setMonthlyRecords(attRes.data || []);
    else toast.error('خطأ في جلب البيانات');

    // تحويل الجداول إلى ماب { staff_id -> { day_of_week -> scheduleRow } }
    if (!schedRes.error && schedRes.data) {
      const map = {};
      schedRes.data.forEach(row => {
        if (!map[row.staff_id]) map[row.staff_id] = {};
        map[row.staff_id][row.day_of_week] = row;
      });
      setStaffSchedules(map);
    }

    setMonthlyLoading(false);
  };

  // ── Staff list from records ──
  const staffList = useMemo(() => {
    const source = viewMode === 'daily' ? dailyRecords : monthlyRecords;
    return [...new Set(source.map(r => r.staff_name).filter(Boolean))];
  }, [dailyRecords, monthlyRecords, viewMode]);

  // ── Daily Filtered ──
  const filteredDaily = useMemo(() => {
    if (!selectedStaff) return dailyRecords;
    return dailyRecords.filter(r => r.staff_name === selectedStaff);
  }, [dailyRecords, selectedStaff]);

  // حساب عدد أيام العمل المنصرمة لموظف بعينه (حسب جدوله)
  const calcExpectedDays = (staffId, year, month, countUntil) => {
    const sched = staffSchedules[staffId]; // { 0: row, 1: row, ... } أو undefined
    let count = 0;
    const d = new Date(year, month - 1, 1);
    while (d <= countUntil && d.getMonth() === parseInt(month) - 1) {
      const dow = d.getDay();
      if (sched) {
        // لو في جدول مخصص → اعتمد عليه
        const dayRow = sched[dow];
        if (dayRow && !dayRow.is_day_off) count++;
      } else {
        // لا يوجد جدول → افتراضي: كل الأيام ما عدا الجمعة والسبت
        if (dow !== 5 && dow !== 6) count++;
      }
      d.setDate(d.getDate() + 1);
    }
    return count || 1;
  };

  // ── Monthly Summary (grouped by staff) ──
  const monthlySummary = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === parseInt(year) &&
      today.getMonth() + 1 === parseInt(month);

    const countUntil = isCurrentMonth
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
      : new Date(year, month, 0);

    // جمع سجلات الحضور حسب الإسم والمعرف باللو جلبنا staff_id
    const map = {};
    monthlyRecords.forEach(r => {
      if (!r.staff_name) return;
      const key = r.staff_id || r.staff_name;
      if (!map[key]) {
        map[key] = {
          staffId:   r.staff_id,
          name:      r.staff_name,
          days:      0,
          absent:    0,
          totalMins: 0,
          late:      0,
          autoOut:   0,
          modified:  0,
          records:   []
        };
      }
      const s = map[key];
      if (r.check_in) s.days++;
      if (r.duration_minutes) s.totalMins += r.duration_minutes;
      if (r.status === 'late')     s.late++;
      if (r.status === 'auto_out') s.autoOut++;
      if (r.is_modified)           s.modified++;
      s.records.push(r);
    });

    // حساب الغياب لكل موظف حسب جدوله الخاص
    const summary = Object.values(map).map(s => {
      const expectedDays = calcExpectedDays(s.staffId, year, month, countUntil);
      return {
        ...s,
        expectedDays,
        absent: Math.max(0, expectedDays - s.days),
      };
    });

    return { summary };
  }, [monthlyRecords, selectedMonth, staffSchedules]);

  const filteredMonthly = useMemo(() => {
    if (!selectedStaff) return monthlySummary.summary;
    return monthlySummary.summary.filter(s => s.name === selectedStaff);
  }, [monthlySummary, selectedStaff]);

  // ── Override ──
  const handleOpenEdit = (record) => {
    setEditModal(record);
    setEditCheckIn(record.check_in ? toLocalDatetimeInput(record.check_in) : '');
    setEditCheckOut(record.check_out ? toLocalDatetimeInput(record.check_out) : '');
    setEditReason('');
  };

  const handleSaveEdit = async () => {
    if (!editReason.trim()) { toast.error('يجب كتابة سبب التعديل'); return; }
    setEditLoading(true);
    try {
      const newIn  = editCheckIn  ? new Date(editCheckIn).toISOString()  : editModal.check_in;
      const newOut = editCheckOut ? new Date(editCheckOut).toISOString() : null;
      const diff   = newOut ? new Date(newOut) - new Date(newIn) : null;
      const { error } = await supabase.from('staff_attendance').update({
        check_in: newIn, check_out: newOut,
        duration_minutes: diff ? Math.floor(diff / 60000) : null,
        status: 'modified', is_modified: true,
        modified_by: user?.id,
        modified_at: new Date().toISOString(),
        modification_reason: editReason
      }).eq('id', editModal.id);
      if (error) throw error;
      toast.success('تم التعديل بنجاح ✅');
      setEditModal(null);
      viewMode === 'daily' ? fetchDaily() : fetchMonthly();
    } catch { toast.error('خطأ أثناء التعديل'); }
    setEditLoading(false);
  };

  // ── Export ──
  const exportDaily = () => {
    const rows = filteredDaily.map(r => ({
      'الموظف': r.staff_name, 'دخول': formatTime(r.check_in),
      'خروج': formatTime(r.check_out), 'مدة العمل': fmtDuration(r.duration_minutes),
      'الحالة': r.is_modified ? 'معدّل' : r.status || '---',
      'GPS': r.latitude ? `${r.latitude}, ${r.longitude}` : '---',
      'التاريخ': r.date
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'الحضور اليومي');
    XLSX.writeFile(wb, `حضور_يومي_${dailyDate}.xlsx`);
  };

  const exportMonthly = () => {
    const rows = filteredMonthly.map(s => ({
      'الموظف':              s.name,
      'أيام الحضور':         s.days,
      'أيام الغياب':         s.absent,
      'أيام العمل المجدولة': s.expectedDays,
      'نسبة الحضور':         `${s.expectedDays > 0 ? Math.round((s.days / s.expectedDays) * 100) : 0}%`,
      'إجمالي ساعات العمل':  fmtDuration(s.totalMins),
      'متوسط يومي':          fmtDuration(s.days > 0 ? Math.round(s.totalMins / s.days) : 0),
      'مرات التأخير':        s.late,
      'انصراف تلقائي':       s.autoOut,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'التقرير الشهري');
    XLSX.writeFile(wb, `تقرير_حضور_${selectedMonth}.xlsx`);
  };

  const getStatusBadge = (r) => {
    if (r.is_modified) return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-black">✏️ معدّل</span>;
    if (r.status === 'auto_out') return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[9px] font-black">⚠️ تلقائي</span>;
    if (r.check_out) return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black">✅ انصرف</span>;
    return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-black animate-pulse">🟢 حاضر</span>;
  };

  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-cairo" dir="rtl">
      <Toaster position="top-center" />

      {/* ── Header ── */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/staff" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 border border-slate-100 shadow-sm transition-all">
              <FaArrowLeft />
            </Link>
            <div>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">HR · Attendance</span>
              <h1 className="text-2xl font-black text-slate-900">سجل <span className="text-blue-600">الحضور والانصراف</span></h1>
            </div>
          </div>

          {/* ── View Toggle ── */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
            <button onClick={() => setViewMode('daily')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'daily' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <FaCalendarDay size={12} /> يومي
            </button>
            <button onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'monthly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <FaChartBar size={12} /> شهري
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Filters Bar ── */}
        <div className="flex flex-wrap gap-3 items-center">
          {viewMode === 'daily' ? (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 h-11 shadow-sm">
              <FaCalendarAlt className="text-slate-400" size={12} />
              <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)}
                className="text-xs font-black text-slate-700 outline-none bg-transparent" />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 h-11 shadow-sm">
              <FaCalendarAlt className="text-slate-400" size={12} />
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                className="text-xs font-black text-slate-700 outline-none bg-transparent" />
            </div>
          )}

          <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 h-11 text-xs font-black text-slate-700 outline-none appearance-none shadow-sm">
            <option value="">كل الموظفين</option>
            {staffList.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <button onClick={() => viewMode === 'daily' ? fetchDaily() : fetchMonthly()}
            className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm">
            <FaSync size={12} />
          </button>

          <button onClick={() => viewMode === 'daily' ? exportDaily() : exportMonthly()}
            className="h-11 px-5 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-black transition-all shadow-md">
            <FaDownload size={12} /> تصدير Excel
          </button>
        </div>

        {/* ══════════════ DAILY VIEW ══════════════ */}
        {viewMode === 'daily' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'الحاضرين', value: dailyRecords.filter(r=>r.check_in).length, icon: <FaUsers />, c: 'blue' },
                { label: 'انصرفوا', value: dailyRecords.filter(r=>r.check_out).length, icon: <FaCheckCircle />, c: 'emerald' },
                { label: 'لا يزالون', value: dailyRecords.filter(r=>r.check_in && !r.check_out).length, icon: <FaClock />, c: 'violet' },
                { label: 'سجلات معدّلة', value: dailyRecords.filter(r=>r.is_modified).length, icon: <FaEdit />, c: 'amber' },
              ].map(s => (
                <div key={s.label} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl bg-${s.c}-50 text-${s.c}-600 flex items-center justify-center text-lg`}>{s.icon}</div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">{s.label}</p>
                    <h3 className="text-xl font-black text-slate-900">{s.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase text-right">
                      {['الموظف','حضور','انصراف','مدة العمل','الحالة','موقع','تعديل'].map(h => (
                        <th key={h} className="p-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {dailyLoading ? [...Array(3)].map((_,i) => (
                      <tr key={i} className="animate-pulse">
                        {[...Array(7)].map((_,j) => <td key={j} className="p-5"><div className="h-8 bg-slate-50 rounded-xl"/></td>)}
                      </tr>
                    )) : filteredDaily.length === 0 ? (
                      <tr><td colSpan="7" className="p-16 text-center">
                        <div className="opacity-25 flex flex-col items-center gap-3">
                          <FaUserClock size={40}/><p className="font-black text-slate-500">لا توجد سجلات</p>
                        </div>
                      </td></tr>
                    ) : filteredDaily.map(r => (
                      <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors ${r.is_modified ? 'bg-amber-50/30' : ''}`}>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">{r.staff_name?.[0]||'?'}</div>
                            <div>
                              <p className="font-black text-sm text-slate-800">{r.staff_name}</p>
                              {r.device_info && <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><FaDesktop size={7}/>{r.device_info.includes('Mobile')?'موبايل':'كمبيوتر'}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-center font-black text-emerald-600 text-sm">{formatTime(r.check_in)}</td>
                        <td className="p-5 text-center font-black text-blue-600 text-sm">{formatTime(r.check_out)}</td>
                        <td className="p-5 text-center"><span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-black">{fmtDuration(r.duration_minutes)}</span></td>
                        <td className="p-5 text-center">{getStatusBadge(r)}</td>
                        <td className="p-5 text-center">
                          {r.latitude ? (
                            <a href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer"
                              className="text-blue-500 text-[10px] font-black flex items-center justify-center gap-1 hover:text-blue-700">
                              <FaMapMarkerAlt size={9}/> عرض
                            </a>
                          ) : <span className="text-slate-300 text-[10px]">---</span>}
                        </td>
                        <td className="p-5 text-center">
                          <button onClick={() => handleOpenEdit(r)}
                            className="w-9 h-9 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl flex items-center justify-center mx-auto border border-slate-100 transition-all">
                            <FaEdit size={11}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══════════════ MONTHLY VIEW ══════════════ */}
        {viewMode === 'monthly' && (
          <>
            {/* Month Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'إجمالي موظفين', value: monthlySummary.summary.length, icon: <FaUsers />, c: 'blue' },
                { label: 'إجمالي سجلات', value: monthlyRecords.length, icon: <FaClock />, c: 'violet' },
                { label: 'إجمالي غيابات', value: monthlySummary.summary.reduce((s,r)=>s+r.absent,0), icon: <FaCalendarAlt />, c: 'red' },
                { label: 'سجلات معدّلة', value: monthlyRecords.filter(r=>r.is_modified).length, icon: <FaEdit />, c: 'amber' },
              ].map(s => (
                <div key={s.label} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl bg-${s.c}-50 text-${s.c}-600 flex items-center justify-center text-lg`}>{s.icon}</div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">{s.label}</p>
                    <h3 className="text-xl font-black text-slate-900">{s.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly Summary Cards */}
            {monthlyLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_,i) => <div key={i} className="h-40 bg-white rounded-[2rem] border border-slate-100 animate-pulse"/>)}
              </div>
            ) : filteredMonthly.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-16 text-center">
                <div className="opacity-25 flex flex-col items-center gap-3">
                  <FaChartBar size={40}/><p className="font-black text-slate-500">لا توجد بيانات لهذا الشهر</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredMonthly.map(s => {
                  const rate = s.expectedDays > 0 ? Math.round((s.days / s.expectedDays) * 100) : 0;
                  const avgMins = s.days > 0 ? Math.round(s.totalMins / s.days) : 0;
                  const rateColor = rate >= 90 ? 'emerald' : rate >= 70 ? 'amber' : 'red';
                  return (
                    <div key={s.name} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-5 hover:shadow-lg transition-all">
                      {/* Staff Header */}
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">
                          {s.name[0]}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-slate-900 text-base">{s.name}</h3>
                          <p className="text-[10px] text-slate-400 font-bold">{s.days} حضور · {s.absent} غياب · من {s.expectedDays} يوم عمل</p>
                        </div>
                        <div className={`text-2xl font-black text-${rateColor}-600`}>{rate}%</div>
                      </div>

                      {/* Attendance Bar */}
                      <div>
                        <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1.5 uppercase">
                          <span>نسبة الحضور</span>
                          <span className={`text-${rateColor}-600`}>{rate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-${rateColor}-500 transition-all duration-700`} style={{ width: `${rate}%` }} />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'إجمالي ساعات', value: fmtDuration(s.totalMins), color: 'bg-blue-50 text-blue-700' },
                          { label: 'متوسط يومي', value: fmtDuration(avgMins), color: 'bg-violet-50 text-violet-700' },
                          { label: 'أيام الغياب', value: s.absent, color: s.absent > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700' },
                          { label: 'مرات التأخير', value: s.late, color: s.late > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500' },
                        ].map(item => (
                          <div key={item.label} className={`${item.color} rounded-2xl p-3`}>
                            <p className="text-[8px] font-black uppercase opacity-60 mb-1">{item.label}</p>
                            <p className="font-black text-base">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Daily Breakdown Mini */}
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">تفاصيل الأيام</p>
                        <div className="flex flex-wrap gap-1">
                          {s.records.sort((a,b) => new Date(a.date)-new Date(b.date)).map(r => (
                            <div key={r.id}
                              title={`${r.date}: ${formatTime(r.check_in)} → ${formatTime(r.check_out)}`}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-black cursor-default transition-all hover:scale-110 ${
                                r.is_modified ? 'bg-amber-100 text-amber-700' :
                                r.status === 'auto_out' ? 'bg-red-100 text-red-700' :
                                r.check_out ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                              {new Date(r.date).getDate()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Manual Override Modal ── */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Admin Override</p>
                <h3 className="text-xl font-black text-slate-900">تعديل سجل الحضور</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">{editModal.staff_name} · {editModal.date}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center">
                <FaTimes/>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">وقت الحضور</label>
                <input type="datetime-local" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 rounded-2xl text-sm font-black outline-none border-2 border-transparent focus:border-blue-500"/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">وقت الانصراف</label>
                <input type="datetime-local" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 rounded-2xl text-sm font-black outline-none border-2 border-transparent focus:border-blue-500"/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">سبب التعديل <span className="text-red-500">*</span></label>
                <textarea value={editReason} onChange={e => setEditReason(e.target.value)}
                  placeholder="مثال: نسي الموظف تسجيل الانصراف..." rows={3}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-amber-400 resize-none"/>
              </div>
              {editModal.is_modified && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-amber-700 uppercase mb-1">آخر تعديل</p>
                  <p className="text-xs text-amber-600 font-bold">{editModal.modification_reason}</p>
                  <p className="text-[9px] text-amber-400 mt-1">{editModal.modified_at ? new Date(editModal.modified_at).toLocaleString('ar-EG') : ''}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveEdit} disabled={editLoading}
                  className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95 disabled:opacity-50">
                  {editLoading ? 'جاري الحفظ...' : 'حفظ التعديل ✅'}
                </button>
                <button onClick={() => setEditModal(null)}
                  className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        .font-cairo { font-family: 'Cairo', sans-serif; }
      `}</style>
    </div>
  );
}

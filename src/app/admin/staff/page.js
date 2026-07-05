'use client';
import { useState, useEffect } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import {
  FaUserPlus, FaTrash, FaUserShield, FaUserTie,
  FaSpinner, FaTimes, FaCheck, FaCalendarAlt
} from 'react-icons/fa';

// ── أسماء الأيام بالعربي ──
const DAYS = [
  { id: 0, label: 'الأحد',     short: 'أ' },
  { id: 1, label: 'الاثنين',   short: 'ا' },
  { id: 2, label: 'الثلاثاء',  short: 'ث' },
  { id: 3, label: 'الأربعاء',  short: 'ر' },
  { id: 4, label: 'الخميس',    short: 'خ' },
  { id: 5, label: 'الجمعة',    short: 'ج' },
  { id: 6, label: 'السبت',     short: 'س' },
];

// الوقت الافتراضي لكل يوم
const defaultDaySchedule = (dayId) => ({
  day_of_week: dayId,
  expected_check_in: '09:00',
  late_tolerance_min: 15,
  is_day_off: dayId === 5 || dayId === 6, // جمعة وسبت = إجازة افتراضية
});

export default function StaffPage() {
  const { centerId, user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: 'staff' });

  // ── حالة Modal الجدول الأسبوعي ──
  const [scheduleModal, setScheduleModal] = useState(null); // { staffId, staffName }
  const [schedule, setSchedule] = useState([]); // 7 أيام
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // حد الموظفين من الباقة
  const [maxStaff, setMaxStaff] = useState(null); // null = غير محدود

  useEffect(() => { if (centerId) { fetchStaff(); fetchMaxStaff(); } }, [centerId]);

  const fetchMaxStaff = async () => {
    const { data: center } = await supabaseBrowser
      .from('centers').select('package_id').eq('id', centerId).single();
    if (!center?.package_id) return;
    const { data: pkg } = await supabaseBrowser
      .from('packages').select('max_staff').eq('id', center.package_id).single();
    if (pkg?.max_staff) setMaxStaff(pkg.max_staff);
  };

  const fetchStaff = async () => {
    if (!centerId) return;
    try {
      const { data, error } = await supabaseBrowser
        .from('staff_profiles').select('*')
        .eq('center_id', centerId).order('created_at', { ascending: false });
      if (error) throw error;
      setStaff(data);
    } catch (e) {
      console.error('Error fetching staff:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── فتح Modal الجدول ──
  const openScheduleModal = async (member) => {
    setScheduleModal({ staffId: member.id, staffName: member.full_name });
    setScheduleLoading(true);

    // جلب الجدول الحالي
    const { data } = await supabaseBrowser
      .from('staff_schedules')
      .select('*')
      .eq('center_id', centerId)
      .eq('staff_id', member.id)
      .order('day_of_week');

    // دمج البيانات الموجودة مع الـ 7 أيام
    const merged = DAYS.map(day => {
      const existing = data?.find(r => r.day_of_week === day.id);
      return existing || defaultDaySchedule(day.id);
    });
    setSchedule(merged);
    setScheduleLoading(false);
  };

  // ── تعديل يوم في الجدول ──
  const updateDay = (dayId, field, value) => {
    setSchedule(prev => prev.map(d =>
      d.day_of_week === dayId ? { ...d, [field]: value } : d
    ));
  };

  // ── حفظ الجدول ──
  const saveSchedule = async () => {
    if (!scheduleModal) return;
    setSavingSchedule(true);
    try {
      // حذف الجدول القديم وإعادة إنشائه
      await supabaseBrowser
        .from('staff_schedules')
        .delete()
        .eq('center_id', centerId)
        .eq('staff_id', scheduleModal.staffId);

      const rows = schedule.map(d => ({
        center_id:          centerId,
        staff_id:           scheduleModal.staffId,
        day_of_week:        d.day_of_week,
        expected_check_in:  d.is_day_off ? null : d.expected_check_in,
        late_tolerance_min: d.late_tolerance_min,
        is_day_off:         d.is_day_off,
      }));

      const { error } = await supabaseBrowser.from('staff_schedules').insert(rows);
      if (error) throw error;

      alert(`✅ تم حفظ جدول ${scheduleModal.staffName} بنجاح`);
      setScheduleModal(null);
    } catch (e) {
      alert('❌ خطأ أثناء الحفظ: ' + e.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, centerId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await supabaseBrowser.from('audit_logs').insert({
        table_name: 'staff_profiles', record_id: result.user?.user?.id,
        action: 'INSERT', user_id: user?.id, center_id: centerId,
        new_data: { details: `تسجيل موظف جديد: ${formData.fullName}`, role: formData.role, email: formData.email }
      });
      alert('تم إضافة الموظف بنجاح ✅');
      setIsModalOpen(false);
      setFormData({ fullName: '', email: '', password: '', role: 'staff' });
      fetchStaff();
    } catch (error) {
      alert('خطأ: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف نهائياً؟')) return;
    const member = staff.find(s => s.id === id);
    try {
      await supabaseBrowser.from('audit_logs').insert({
        table_name: 'staff_profiles', record_id: id, action: 'DELETE',
        user_id: user?.id, center_id: centerId,
        old_data: member, new_data: { details: `حذف موظف: ${member?.full_name || 'مجهول'}` }
      });
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setStaff(staff.filter(s => s.id !== id));
      alert('تم الحذف بنجاح 🗑️');
    } catch (error) {
      alert('فشل الحذف: ' + error.message);
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-2 md:p-0 pb-24 md:pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <FaUserShield className="text-lg md:text-xl" />
            </div>
            إدارة الموظفين
          </h1>
          <p className="text-gray-400 text-[10px] md:text-xs font-bold mt-2">يمكنك إضافة سكرتارية، مدرسين، أو مسؤولين للنظام والتحكم في صلاحياتهم</p>
          {/* عداد الموظفين */}
          {maxStaff && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 max-w-[180px] h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    staff.length >= maxStaff ? 'bg-red-500' :
                    staff.length >= maxStaff * 0.8 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((staff.length / maxStaff) * 100, 100)}%` }}
                />
              </div>
              <span className={`text-[10px] font-black ${
                staff.length >= maxStaff ? 'text-red-600' : 'text-gray-500'
              }`}>
                {staff.length} / {maxStaff} موظف
                {staff.length >= maxStaff && ' — وصلت للحد الأقصى'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={maxStaff !== null && staff.length >= maxStaff}
          className="w-full md:w-auto bg-gray-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-gray-200 hover:bg-black hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <FaUserPlus /> موظف جديد
          {maxStaff !== null && staff.length >= maxStaff && <span className="text-xs opacity-70">— الحد الأقصى</span>}
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <FaSpinner className="animate-spin text-blue-500 text-3xl" />
          <p className="text-gray-400 font-bold text-sm">جاري تحميل البيانات...</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 mx-2">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaUserTie size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-black text-sm md:text-base">لا يوجد موظفين مسجلين حالياً</p>
          <p className="text-gray-300 text-xs font-bold mt-1">ابدأ بإضافة أول موظف للمركز</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-2 md:px-0">
          {staff.map((member) => (
            <div key={member.id} className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col">

              {/* Badge + Delete */}
              <div className="flex justify-between items-start mb-6">
                <div className={`px-3 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider border ${
                  member.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  {member.role === 'admin' ? 'مدير عام' : 'موظف / سكرتارية'}
                </div>
                <button onClick={() => handleDelete(member.id)}
                  className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                  <FaTrash size={12} />
                </button>
              </div>

              {/* Avatar + Name */}
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-inner shrink-0 ${
                  member.role === 'admin' ? 'bg-purple-100/50 text-purple-600' : 'bg-blue-100/50 text-blue-600'
                }`}>
                  {member.role === 'admin' ? <FaUserShield /> : <FaUserTie />}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-black text-gray-800 text-sm md:text-base truncate">{member.full_name}</h3>
                  <p className="text-[9px] text-gray-400 font-bold opacity-70 mt-0.5 uppercase">ID: {member.id.split('-')[0]}</p>
                </div>
              </div>

              {/* Bottom */}
              <div className="mt-auto pt-5 space-y-3">

                {/* زر الجدول الأسبوعي */}
                <button
                  onClick={() => openScheduleModal(member)}
                  className="w-full bg-gradient-to-l from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-100 rounded-2xl p-3.5 text-right transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                        <FaCalendarAlt size={8} /> الجدول الأسبوعي
                      </p>
                      <p className="text-xs font-black text-slate-700 mt-1">
                        اضغط لإعداد أيام ومواعيد الحضور
                      </p>
                    </div>
                    <span className="text-blue-400 text-lg group-hover:translate-x-[-2px] transition-transform">←</span>
                  </div>
                </button>

                {/* تاريخ الانضمام */}
                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50">
                  <p className="text-[10px] text-gray-400 font-bold text-center">تاريخ الانضمام</p>
                  <p className="text-[11px] text-gray-700 font-black text-center mt-0.5" dir="ltr">
                    {new Date(member.created_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════
          Modal الجدول الأسبوعي
      ══════════════════════════════════════════ */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[5000] flex items-end md:items-center justify-center p-0 md:p-4" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 max-h-[95vh] flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center p-6 md:p-8 border-b border-slate-100 flex-shrink-0">
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Weekly Schedule</p>
                <h2 className="text-xl font-black text-slate-900">الجدول الأسبوعي</h2>
                <p className="text-xs text-slate-400 font-bold mt-0.5">{scheduleModal.staffName}</p>
              </div>
              <button onClick={() => setScheduleModal(null)}
                className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all">
                <FaTimes />
              </button>
            </div>

            {/* Days List */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-3">
              {scheduleLoading ? (
                <div className="flex items-center justify-center py-16">
                  <FaSpinner className="animate-spin text-blue-500 text-2xl" />
                </div>
              ) : schedule.map((day) => {
                const dayInfo = DAYS.find(d => d.id === day.day_of_week);
                return (
                  <div key={day.day_of_week}
                    className={`rounded-2xl border p-4 transition-all ${
                      day.is_day_off
                        ? 'bg-slate-50 border-slate-100 opacity-60'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* اسم اليوم */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        day.is_day_off ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      }`}>
                        {dayInfo?.short}
                      </div>
                      <div className="flex-1">
                        <p className={`font-black text-sm ${day.is_day_off ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {dayInfo?.label}
                        </p>
                        {!day.is_day_off && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {/* وقت الدخول */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-slate-400 font-black">دخول:</span>
                              <input
                                type="time"
                                value={day.expected_check_in || '09:00'}
                                onChange={e => updateDay(day.day_of_week, 'expected_check_in', e.target.value)}
                                className="h-8 px-2 bg-slate-50 rounded-xl text-xs font-black border border-slate-200 focus:border-blue-500 outline-none w-28"
                              />
                            </div>
                            {/* هامش التسامح */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-slate-400 font-black">±</span>
                              <select
                                value={day.late_tolerance_min}
                                onChange={e => updateDay(day.day_of_week, 'late_tolerance_min', parseInt(e.target.value))}
                                className="h-8 px-2 bg-slate-50 rounded-xl text-xs font-black border border-slate-200 outline-none"
                              >
                                {[5, 10, 15, 20, 30].map(m => <option key={m} value={m}>{m}د</option>)}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Toggle إجازة */}
                      <button
                        onClick={() => updateDay(day.day_of_week, 'is_day_off', !day.is_day_off)}
                        className={`px-3 h-8 rounded-xl text-[10px] font-black transition-all flex-shrink-0 ${
                          day.is_day_off
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {day.is_day_off ? '🏖️ إجازة' : 'عمل'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 md:p-8 border-t border-slate-100 flex gap-3 flex-shrink-0">
              <button onClick={saveSchedule} disabled={savingSchedule}
                className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-xl">
                {savingSchedule ? <FaSpinner className="animate-spin" /> : <><FaCheck /> حفظ الجدول</>}
              </button>
              <button onClick={() => setScheduleModal(null)}
                className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Modal إضافة موظف
      ══════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[5000] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-md p-6 md:p-10 rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><FaUserPlus /></div>
                تسجيل موظف
              </h2>
              <button onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-6">
              {[
                { label: 'الاسم بالكامل', type: 'text', key: 'fullName', placeholder: 'مثال: أحمد محمد' },
                { label: 'البريد الإلكتروني (للدخول)', type: 'email', key: 'email', placeholder: 'employee@smart.com' },
                { label: 'كلمة المرور', type: 'text', key: 'password', placeholder: 'يفضل كلمة مرور قوية' },
              ].map(f => (
                <div key={f.key} className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 block uppercase tracking-wider">{f.label}</label>
                  <input type={f.type} required={f.key !== 'password'} minLength={f.key === 'password' ? 6 : undefined}
                    className="w-full h-14 px-5 bg-white rounded-2xl font-black text-sm border-2 border-gray-100 focus:border-blue-500 outline-none shadow-sm placeholder:text-gray-400"
                    placeholder={f.placeholder}
                    value={formData[f.key]}
                    onChange={e => setFormData({...formData, [f.key]: e.target.value})}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 block uppercase tracking-wider">صلاحية الوصول</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { role: 'staff', label: 'موظف', sub: 'سكرتارية / مساعد', color: 'blue' },
                    { role: 'admin', label: 'مدير عام', sub: 'Admin Full Access', color: 'purple' },
                  ].map(r => (
                    <button key={r.role} type="button" onClick={() => setFormData({...formData, role: r.role})}
                      className={`h-14 rounded-2xl font-black text-xs border-2 transition-all flex flex-col items-center justify-center ${
                        formData.role === r.role
                          ? `border-${r.color}-600 bg-${r.color}-50 text-${r.color}-700`
                          : 'border-gray-100 bg-gray-50 text-gray-400'
                      }`}>
                      <span>{r.label}</span>
                      <span className="opacity-50 font-bold text-[9px] mt-0.5">{r.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="w-full bg-gray-100 text-gray-500 h-14 rounded-2xl font-black hover:bg-gray-200 transition-all order-2 sm:order-1">
                  إلغاء
                </button>
                <button disabled={processing}
                  className="w-full bg-gray-900 text-white h-14 rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl order-1 sm:order-2">
                  {processing ? <FaSpinner className="animate-spin"/> : <><FaUserPlus /> حفظ الموظف</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
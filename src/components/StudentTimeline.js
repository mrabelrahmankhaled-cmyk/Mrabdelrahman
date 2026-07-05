'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FaCheckCircle, FaEdit, FaUserShield, FaClock, FaHistory, 
  FaMoneyBillWave, FaChalkboardTeacher, FaShoppingCart 
} from 'react-icons/fa';

export default function StudentTimeline({ studentId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) fetchTimeline();
  }, [studentId]);

  const fetchTimeline = async () => {
    setLoading(true);
    
    // التحقق من وجود center_id في localStorage
    const centerId = localStorage.getItem('active_center_id');
    if (!centerId) {
      console.error('No centerId found in localStorage');
      setLoading(false);
      return;
    }
    
    // هنجيب السجلات اللي تخص الطالب ده سواء تعديل بيانات أو حضور أو دفع
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*, staff_profiles(full_name)')
      .eq('record_id', studentId)
      .eq('center_id', centerId) // ← فلترة حسب المركز
      .order('created_at', { ascending: false });

    const formattedEvents = auditLogs?.map(log => {
      // تحليل البيانات المخزنة في new_data
      const details = log.new_data?.details || log.new_data?.message || '';
      const amount = log.new_data?.amount ? `${log.new_data.amount} ج.م` : '';

      return {
        id: log.id,
        action: log.action, // ATTENDANCE, PAYMENT, UPDATE, etc.
        title: getEventTitle(log.action, details),
        date: new Date(log.created_at),
        by: log.staff_profiles?.full_name || 'System',
        desc: amount ? `القيمة: ${amount} - ${details}` : details,
        style: getEventStyle(log.action)
      };
    }) || [];

    setEvents(formattedEvents);
    setLoading(false);
  };

  // 1. تحديد العنوان حسب نوع الحدث
  const getEventTitle = (action, details) => {
    if (action === 'ATTENDANCE') return 'تسجيل حضور حصة';
    if (action === 'PAYMENT') return 'عملية دفع / شراء';
    if (action === 'INSERT') return 'تم إنشاء ملف الطالب';
    if (action === 'UPDATE') return 'تحديث بيانات الملف';
    if (action === 'DELETE') return 'محاولة حذف (Blocked)';
    return 'نشاط إداري';
  };

  // 2. تحديد الألوان والأيقونات (The Magic 🎨)
  const getEventStyle = (action) => {
    switch (action) {
      case 'ATTENDANCE': return { 
        icon: <FaCheckCircle/>, bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' 
      };
      case 'PAYMENT': return { 
        icon: <FaMoneyBillWave/>, bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' 
      };
      case 'UPDATE': return { 
        icon: <FaEdit/>, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' 
      };
      case 'DELETE': return { 
        icon: <FaUserShield/>, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' 
      };
      default: return { 
        icon: <FaHistory/>, bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' 
      };
    }
  };

  if (loading) return <div className="text-center p-4 text-gray-400 text-xs">جاري تحميل السجل...</div>;

  return (
    <div className="relative border-r-2 border-gray-100 mr-4 space-y-6 pr-6 py-4">
      {events.length > 0 ? events.map((event, idx) => (
        <div key={event.id} className="relative flex items-start gap-4 animate-in slide-in-from-right duration-300">
          
          {/* النقطة اللي على الخط */}
          <div className={`absolute -right-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${event.style.text.replace('text', 'bg')}`}></div>

          {/* كارت الحدث */}
          <div className={`flex-1 p-3 rounded-xl border shadow-sm ${event.style.bg} ${event.style.border}`}>
            <div className="flex justify-between items-start">
              <h4 className={`font-bold text-sm flex items-center gap-2 ${event.style.text}`}>
                {event.style.icon} {event.title}
              </h4>
              <span className="text-[10px] opacity-60 font-mono dir-ltr flex items-center gap-1 text-gray-500">
                {event.date.toLocaleDateString('ar-EG')} <FaClock size={8}/> {event.date.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
              </span>
            </div>
            
            {event.desc && (
                <p className="text-xs mt-2 font-bold text-gray-700 bg-white/50 p-2 rounded-lg border border-black/5">
                    {event.desc}
                </p>
            )}

            <p className="text-[10px] mt-2 opacity-80 flex items-center gap-1">
              👤 بواسطة: <span className="font-bold">{event.by}</span>
            </p>
          </div>
        </div>
      )) : (
        <div className="text-center text-gray-400 py-4 text-sm">
          ملف نظيف.. لا توجد تحركات مسجلة.
        </div>
      )}
    </div>
  );
}
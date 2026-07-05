'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { FaClock, FaDoorOpen, FaPlus, FaTrash, FaCalendarAlt, FaCalendarPlus, FaGraduationCap, FaBookOpen, FaUsers, FaEdit } from 'react-icons/fa';

export default function SchedulePage() {
  const [rooms, setRooms] = useState([]);
  const [allGroups, setAllGroups] = useState([]); // كل المجموعات
  const [allCourses, setAllCourses] = useState([]); // كل الكورسات
  const [grades, setGrades] = useState([]); // الصفوف الدراسية
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // حالة التعديل
  const [editingScheduleId, setEditingScheduleId] = useState(null); // معرف الموعد المراد تعديله

  // حالات الفلترة داخل المودال
  const [selectedGrade, setSelectedGrade] = useState('');
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [filteredGroups, setFilteredGroups] = useState([]);

  // 🚀 التعديل المطلوب: ترتيب الأيام بما يتوافق مع نظام JS (الأحد = 0) لضمان مطابقة الحصص
  const days = [
    { id: 0, name: 'الأحد' }, 
    { id: 1, name: 'الاثنين' }, 
    { id: 2, name: 'الثلاثاء' },
    { id: 3, name: 'الأربعاء' }, 
    { id: 4, name: 'الخميس' }, 
    { id: 5, name: 'الجمعة' },
    { id: 6, name: 'السبت' }
  ];

  const [formData, setFormData] = useState({
    group_id: '', room_id: '', day_of_week: 0, start_time: '', end_time: ''
  });

  // 🚀 تحسين الأداء: تحضير خريطة المواعيد (Map) لتجنب الفلترة المتكررة
  const scheduleMap = useMemo(() => {
    const map = {};
    schedule.forEach(s => {
      const key = `${s.day_of_week}_${s.room_id}`;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return map;
  }, [schedule]);

  useEffect(() => {
    fetchData();
  }, []);

  // 1. فلترة الكورسات بناءً على الصف المختار
  useEffect(() => {
    if (selectedGrade) {
      const filtered = allCourses.filter(c => String(c.grade) === String(selectedGrade));
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses([]);
    }
    // في وضع التعديل، لا تقم بتصفير القيم إذا كانت متوافقة مع البيانات الحالية
    if (!isEditMode) {
        setSelectedCourseId('');
        setFilteredGroups([]);
    }
  }, [selectedGrade, allCourses, isEditMode]);

  // 2. فلترة المجموعات بناءً على الكورس المختار
  useEffect(() => {
    if (selectedCourseId) {
      const filtered = allGroups.filter(g => String(g.course_id) === String(selectedCourseId));
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups([]);
    }
     // في وضع التعديل، لا تقم بتصفير القيم إذا كانت متوافقة مع البيانات الحالية
    if (!isEditMode) {
        setFormData(prev => ({ ...prev, group_id: '' }));
    }
  }, [selectedCourseId, allGroups, isEditMode]);

  const fetchData = async () => {
    setLoading(true);
    // جلب القاعات
    const { data: roomsData } = await supabaseBrowser.from('rooms').select('*').eq('is_active', true);
    
    // جلب المجموعات مع الكورسات
    const { data: groupsData } = await supabaseBrowser.from('groups').select('*, courses(name, instructor, instructor_id, instructors(id, name), grade)');
    
    // جلب الكورسات منفصلة لعملية الفلترة
    const { data: coursesData } = await supabaseBrowser.from('courses').select('*, instructors(id, name)');
    
    // جلب الجدول مع الربط الكامل
    const { data: scheduleData } = await supabaseBrowser.from('schedule').select('*, groups(*, courses(*)), rooms(*)');
    
    setRooms(roomsData || []);
    setAllGroups(groupsData || []);
    setAllCourses(coursesData || []);
    setSchedule(scheduleData || []);

    // استخراج الصفوف الفريدة
    const uniqueGrades = [...new Set(coursesData?.map(c => c.grade))].filter(Boolean).sort();
    setGrades(uniqueGrades);

    setLoading(false);
  };

  const handleEditClick = (item) => {
      setIsEditMode(true);
      setEditingScheduleId(item.id);
      
      // تعيين القيم للمودال
      const group = item.groups;
      const course = group.courses;

      setSelectedGrade(course.grade);
      setSelectedCourseId(course.id);
      setFormData({
          group_id: item.group_id,
          room_id: item.room_id,
          day_of_week: item.day_of_week,
          start_time: item.start_time,
          end_time: item.end_time
      });
      setShowModal(true);
  };

 const handleSaveSchedule = async (e) => {
    e.preventDefault();
    
    // 1. التحقق البديهي من الوقت
    if (formData.start_time >= formData.end_time) {
      alert("❌ خطأ: وقت البداية يجب أن يكون قبل وقت النهاية");
      return;
    }

    // 2. التحقق من سعة القاعة
    const group = allGroups.find(g => g.id === formData.group_id);
    const room = rooms.find(r => r.id === formData.room_id);
    
    if (group?.students_count > room?.capacity) {
      if (!confirm(`⚠️ تنبيه: عدد طلاب المجموعة (${group.students_count}) أكبر من سعة القاعة (${room.capacity}). استمرار؟`)) return;
    }

    // 👇👇👇 3. بداية كود فحص التعارض (الجديد) 👇👇👇
    try {
        // بنسأل الداتا بيز: هل فيه حصة في نفس القاعة ونفس اليوم وتتقاطع في الوقت؟
        let query = supabaseBrowser
            .from('schedule')
            .select('id')
            .eq('room_id', formData.room_id)
            .eq('day_of_week', formData.day_of_week)
            // معادلة التداخل: (بداية القديم < نهاية الجديد) && (نهاية القديم > بداية الجديد)
            .lt('start_time', formData.end_time)
            .gt('end_time', formData.start_time);

        // في حالة التعديل، لازم نستثني الحصة الحالية عشان متعملش تعارض مع نفسها
        if (isEditMode && editingScheduleId) {
            query = query.neq('id', editingScheduleId);
        }

        const { data: conflicts, error: conflictError } = await query;

        if (conflictError) throw conflictError;

        if (conflicts && conflicts.length > 0) {
            alert("⛔ فشل الحجز: القاعة مشغولة بالفعل في هذا التوقيت! يرجى اختيار موعد آخر أو قاعة أخرى.");
            return; // 🛑 وقف العملية فوراً
        }
    } catch (err) {
        console.error("Conflict Check Error:", err);
        alert("حدث خطأ أثناء فحص المواعيد، يرجى المحاولة مرة أخرى.");
        return;
    }
    // 👆👆👆 نهاية كود فحص التعارض 👆👆👆


    // 4. الحفظ في قاعدة البيانات (لو عدى من الفحص اللي فوق)
    let error;
    if (isEditMode) {
        const { error: updateError } = await supabaseBrowser
            .from('schedule')
            .update(formData)
            .eq('id', editingScheduleId);
        error = updateError;
    } else {
        const { error: insertError } = await supabaseBrowser.from('schedule').insert([formData]);
        error = insertError;
    }

    if (error) {
      alert("خطأ في الحفظ: " + error.message);
    } else {
      alert(isEditMode ? "تم تعديل الموعد بنجاح ✅" : "تم حفظ الموعد بنجاح ✅");
      setShowModal(false);
      resetModal();
      fetchData();
    }
  };

  const resetModal = () => {
      setFormData({
        group_id: '', room_id: '', day_of_week: 0, start_time: '', end_time: ''
      });
      setSelectedGrade('');
      setSelectedCourseId('');
      setIsEditMode(false);
      setEditingScheduleId(null);
  };

  if (loading) return <div className="p-10 text-center font-black animate-bounce text-blue-600">جاري تنظيم الجدول...</div>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
          <FaCalendarAlt className="text-blue-600" /> جدول إشغال القاعات الأسبوعي
        </h1>
        <button 
          onClick={() => {
              resetModal();
              setShowModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <FaPlus /> حجز موعد جديد
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-4 text-gray-400 font-bold border-l w-24">اليوم</th>
              {rooms.map(room => (
                <th key={room.id} className="p-4 text-blue-900 font-black min-w-[200px]">
                  <div className="flex flex-col items-center">
                    <span className="flex items-center gap-2 text-sm"><FaDoorOpen className="text-blue-500" /> {room.name}</span>
                    <span className="text-[10px] text-gray-400 font-bold mt-1">سعة: {room.capacity} طالب</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="p-4 font-black text-gray-700 border-l bg-gray-50/30 text-center">{day.name}</td>
                {rooms.map(room => {
                  const items = scheduleMap[`${day.id}_${room.id}`] || [];
                  return (
                    <td key={room.id} className="p-2 border-l align-top min-h-[120px]">
                      <div className="flex flex-col gap-2">
                        {items.map(item => {
  // دالة لتحويل الوقت من نظام 24 إلى نظام 12 ساعة
  const formatTime12 = (time24) => {
    if (!time24) return '';
    let [hours, minutes] = time24.split(':');
    hours = parseInt(hours);
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12; // تحويل الساعة 0 لـ 12
    return `${hours}:${minutes} ${ampm}`;
  };

  return (
    <div key={item.id} className="bg-white border-2 border-blue-100 p-2 rounded-xl shadow-sm relative group hover:border-blue-400 transition-all">
      {/* اسم الكورس والمدرس */}
      <div className="flex justify-between items-start mb-1">
        <p className="text-[11px] font-black text-blue-900 leading-tight">
          {item.groups?.courses?.name}
        </p>
        <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded font-bold">
          {item.groups?.courses?.grade}
        </span>
      </div>

      {/* اسم المدرس */}
      <p className="text-[9px] text-green-600 font-bold flex items-center gap-1">
        د/ {item.groups?.courses?.instructors?.name || item.groups?.courses?.instructor || 'غير محدد'}
      </p>
      
      {/* اسم المجموعة */}
      <p className="text-[9px] text-gray-400 font-bold mt-0.5">
        مجموعة: {item.groups?.name}
      </p>

      {/* الوقت بالأرقام العادية (12 ساعة) */}
      <div className="flex justify-between items-center mt-2 border-t pt-1">
        <span className="text-[10px] font-mono font-black text-blue-600 tracking-tighter" dir="ltr">
          {formatTime12(item.start_time)} - {formatTime12(item.end_time)}
        </span>
        <div className="flex gap-1">
             <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEditClick(item);
                }}
                className="text-blue-300 hover:text-blue-600 transition-colors p-1"
                title="تعديل"
             >
                <FaEdit size={12}/>
             </button>
            <button 
                onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if(confirm("هل أنت متأكد من حذف هذا الموعد؟")) {
                        // 1. حذف بصري سريع للمستخدم
                        const oldSchedule = [...schedule];
                        setSchedule(prev => prev.filter(s => s.id !== item.id));

                        // 2. محاولة الحذف من الداتابيز
                        const { error } = await supabaseBrowser
                            .from('schedule')
                            .delete()
                            .eq('id', item.id);

                        if (error) {
                            console.error("Supabase Error:", error);
                            // لو حصل خطأ نرجع الجدول زي ما كان
                            setSchedule(oldSchedule);
                            alert(`فشل الحذف: ${error.message} (تأكد من صلاحيات الـ Policy في سوبابيز)`);
                        } else {
                            console.log("Deleted successfully");
                            // إعادة جلب البيانات للتأكد
                            fetchData();
                        }
                    }
                }}
                className="text-red-300 hover:text-red-600 transition-colors p-1"
                title="حذف"
            >
                <FaTrash size={12}/>
            </button>
        </div>
      </div>
    </div>
  );
})}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* مودال الحجز المطور بالفلاتر */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[5000] flex items-center justify-center p-4">
          <form onSubmit={handleSaveSchedule} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-black text-gray-800 border-b pb-4 flex items-center gap-2">
                <FaCalendarPlus className="text-blue-600"/> {isEditMode ? 'تعديل موعد الحجز' : 'حجز قاعة لمجموعة'}
            </h2>
            
            <div className="space-y-4">
              {/* 1. اختيار الصف الدراسي */}
              <div>
                <label className="block text-xs font-black text-gray-500 mb-2 flex items-center gap-1">
                  <FaGraduationCap className="text-blue-400"/> اختر الصف الدراسي
                </label>
                <select 
                  required className="w-full p-3 bg-gray-50 border rounded-xl outline-none font-bold text-sm focus:border-blue-500"
                  value={selectedGrade}

                    {/* 2. اختيار الكورس */}
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-2 flex items-center gap-1">
                        <FaBookOpen className="text-blue-400"/> اختر الكورس (المدرس)
                      </label>
                      <select 
                        required 
                        disabled={!selectedGrade}
                        className="w-full p-3 bg-gray-50 border rounded-xl outline-none font-bold text-sm focus:border-blue-500 disabled:opacity-50"
                        value={selectedCourseId}
                        onChange={e => setSelectedCourseId(e.target.value)}
                      >
                        <option value="">-- اختر الكورس --</option>
                        {filteredCourses.map(c => (
                          <option key={c.id} value={c.id}>{c.name} (د/ {c.instructors?.name || c.instructor || 'غير محدد'})</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. اختيار المجموعة */}
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-2 flex items-center gap-1">
                        <FaUsers className="text-blue-400"/> اختر المجموعة
                      </label>
                      <select 
                        required 
                        disabled={!selectedCourseId}
                        className="w-full p-3 bg-gray-50 border rounded-xl outline-none font-bold text-sm focus:border-blue-500 disabled:opacity-50"
                        value={formData.group_id}
                        onChange={e => setFormData({...formData, group_id: e.target.value})}
                      >
                        <option value="">-- اختر المجموعة --</option>
                        {filteredGroups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  <select 
                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-sm outline-none"
                    value={formData.day_of_week}
                    onChange={e => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
                  >
                    {days.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 mb-2">الوقت (من - إلى)</label>
                  <div className="flex items-center gap-2">
                    <input type="time" required className="flex-1 p-2 border rounded-lg text-xs font-bold outline-none" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                    <input type="time" required className="flex-1 p-2 border rounded-lg text-xs font-bold outline-none" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white p-3 rounded-2xl font-black hover:bg-blue-700 transition-all">{isEditMode ? 'حفظ التعديلات' : 'تأكيد الحجز'}</button>
              <button type="button" onClick={() => { setShowModal(false); resetModal(); }} className="flex-1 bg-gray-100 text-gray-600 p-3 rounded-2xl font-black">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../../lib/supabase';
import { FaClock, FaDoorOpen, FaPlus, FaTrash, FaCalendarAlt, FaCalendarPlus, FaGraduationCap, FaBookOpen, FaUsers, FaEdit, FaSync, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId

function SchedulePage() {
  const { centerId, user } = useAuth(); // ← استخراج centerId من الـ context
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);
  
  const [rooms, setRooms] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  const [selectedGrade, setSelectedGrade] = useState('');
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedExamTitle, setSelectedExamTitle] = useState(''); // 🆕 Exam Title State

  // States for custom dropdowns in modal
  const [isGradeDropOpen, setIsGradeDropOpen] = useState(false);
  const [isRoomDropOpen, setIsRoomDropOpen] = useState(false);
  const [isCourseDropOpen, setIsCourseDropOpen] = useState(false);
  const [isGroupDropOpen, setIsGroupDropOpen] = useState(false);
  const [isDayDropOpen, setIsDayDropOpen] = useState(false);

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
    group_id: '', exam_id: null, room_id: '', day_of_week: 0, start_time: '', end_time: ''
  });

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
    if (centerId) {
      fetchData();
    }
  }, [centerId]);

  useEffect(() => {
    if (selectedGrade) {
      const filtered = allCourses.filter(c => String(c.grade) === String(selectedGrade));
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses([]);
    }
    if (!isEditMode) {
        setSelectedCourseId('');
        setFilteredGroups([]);
    }
  }, [selectedGrade, allCourses, isEditMode]);

  useEffect(() => {
    if (selectedCourseId) {
      const filtered = allGroups.filter(g => String(g.course_id) === String(selectedCourseId));
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups([]);
    }
    if (!isEditMode) {
        setFormData(prev => ({ ...prev, group_id: '' }));
    }
  }, [selectedCourseId, allGroups, isEditMode]);

  const fetchData = async () => {
    if (!centerId) return;
    
    setLoading(true);
    try {
      const { data: roomsData } = await supabaseBrowser.from('rooms').select('*').eq('is_active', true).eq('center_id', centerId);
      const { data: groupsData } = await supabaseBrowser.from('groups').select('*, courses(name, instructor, instructor_id, instructors(id, name), grade)').eq('center_id', centerId);
      const { data: coursesData } = await supabaseBrowser.from('courses').select('*, instructors(id, name)').eq('center_id', centerId);
      const { data: scheduleData } = await supabaseBrowser
        .from('schedule')
        .select('*, groups(*, courses(*, instructors(id, name))), rooms(*), exams(*)')
        .eq('center_id', centerId);
      
      setRooms(roomsData || []);
      setAllGroups(groupsData || []);
      setAllCourses(coursesData || []);
      setSchedule(scheduleData || []);

      const uniqueGrades = [...new Set(coursesData?.map(c => c.grade))].filter(Boolean).sort();
      setGrades(uniqueGrades);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Effect to handle URL params for pre-filling
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action) return;

    const courseId = searchParams.get('course_id');
    const groupId = searchParams.get('group_id');
    const examId = searchParams.get('exam_id');
    const examTitle = searchParams.get('title');
    const dateParam = searchParams.get('date');

    if (centerId && allCourses.length > 0 && !showModal) {
      if (action === 'create_schedule' && courseId && groupId) {
        const course = allCourses.find(c => c.id === courseId);
        if (course) {
          setSelectedGrade(course.grade);
          setSelectedCourseId(courseId);
          setFormData(prev => ({ ...prev, group_id: groupId, exam_id: null }));
          setSelectedExamTitle('');
          setShowModal(true);
          // 🧹 مسح الرابط لمنع التوهان والتكرار
          router.replace('/admin/schedule', { scroll: false });
        }
      } else if (action === 'schedule_exam' && examId && courseId) {
         const course = allCourses.find(c => c.id === courseId);
         if (course) {
           setSelectedGrade(course.grade);
           setSelectedCourseId(courseId);
           
           let dayOfWeek = 0;
           if (dateParam) {
               const d = new Date(dateParam);
               if (!isNaN(d.getTime())) {
                   dayOfWeek = d.getDay();
               }
           }

           setFormData(prev => ({ ...prev, group_id: groupId || '', exam_id: examId, day_of_week: dayOfWeek }));
           setSelectedExamTitle(examTitle ? decodeURIComponent(examTitle) : 'امتحان جديد');
           setShowModal(true);
           // 🧹 مسح الرابط لمنع التوهان والتكرار
           router.replace('/admin/schedule', { scroll: false });
         }
      }
    }
  }, [searchParams, centerId, allCourses, showModal, router]);

  const handleEditClick = (item) => {
      setIsEditMode(true);
      setEditingScheduleId(item.id);
      
      const group = item.groups;
      const course = group.courses;

      setSelectedGrade(course.grade);
      setSelectedCourseId(course.id);
      setFormData({
          group_id: item.group_id,
          exam_id: item.exam_id, // 🆕 Load exam_id
          room_id: item.room_id,
          day_of_week: item.day_of_week,
          start_time: item.start_time,
          end_time: item.end_time
      });
      setShowModal(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    console.log('🏁 Starting handleSaveSchedule...');
    
    if (!centerId) {
      alert('⚠️ لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    
    if (!formData.room_id) {
        alert("⚠️ يرجى اختيار القاعة.");
        return;
    }

    if (!selectedCourseId) {
        alert("⚠️ يرجى اختيار الكورس.");
        return;
    }

    if (!formData.start_time || !formData.end_time) {
        alert("⚠️ يرجى تحديد وقت البداية والنهاية.");
        return;
    }
    
    if (formData.start_time >= formData.end_time) {
      alert("❌ خطأ: وقت البداية يجب أن يكون قبل وقت النهاية");
      return;
    }

    try {
        console.log('🔍 Checking for conflicts...');
        let query = supabaseBrowser
            .from('schedule')
            .select('id')
            .eq('room_id', formData.room_id)
            .eq('day_of_week', formData.day_of_week)
            .eq('center_id', centerId)
            .lt('start_time', formData.end_time)
            .gt('end_time', formData.start_time);

        if (isEditMode && editingScheduleId) {
            query = query.neq('id', editingScheduleId);
        }

        const { data: conflicts, error: conflictError } = await query;

        if (conflictError) throw conflictError;

        if (conflicts && conflicts.length > 0) {
            alert("⛔ فشل الحجز: القاعة مشغولة بالفعل في هذا التوقيت! يرجى اختيار موعد آخر أو قاعة أخرى.");
            return;
        }

        console.log('💾 Saving to Supabase...');
        const payload = {
            ...formData,
            group_id: formData.group_id || null, 
            center_id: centerId
        };

        if (!payload.group_id && !payload.exam_id) {
            alert("⚠️ يجب اختيار مجموعة أو امتحان للحجز.");
            return;
        }
        
        let result;
        if (isEditMode) {
            result = await supabaseBrowser
                .from('schedule')
                .update(payload)
                .eq('id', editingScheduleId)
                .eq('center_id', centerId)
                .select()
                .single();
        } else {
            result = await supabaseBrowser
                .from('schedule')
                .insert([payload])
                .select()
                .single();
        }

        if (result.error) throw result.error;

        console.log('✅ Save successful, closing modal...');
        // Close UI immediately
        setShowModal(false);
        resetModal();
        fetchData();

        // 🕵️ Log in background (don't let it block)
        try {
            supabaseBrowser.from('audit_logs').insert({
                table_name: 'schedule',
                record_id: result.data?.id,
                action: isEditMode ? 'UPDATE' : 'INSERT',
                user_id: user?.id,
                center_id: centerId,
                new_data: { details: isEditMode ? `تعديل موعد` : `إضافة موعد جديد`, ...payload }
            }).then(); // Fire and forget
        } catch (logErr) {
            console.warn('Audit log failed (non-critical):', logErr);
        }

    } catch (err) {
        console.error("🔥 handleSaveSchedule Error:", err);
        alert("خطأ في الحفظ: " + (err.message || "حدث خطأ غير متوقع"));
    }
  };

  const resetModal = () => {
      setFormData({
        group_id: '', exam_id: null, room_id: '', day_of_week: 0, start_time: '', end_time: ''
      });
      setSelectedGrade('');
      setSelectedCourseId('');
      setSelectedExamTitle('');
      setIsEditMode(false);
      setEditingScheduleId(null);
      setIsGradeDropOpen(false);
      setIsRoomDropOpen(false);
      setIsCourseDropOpen(false);
      setIsGroupDropOpen(false);
      setIsDayDropOpen(false);
  };

  const formatTime12 = (time24) => {
    if (!time24) return '';
    let [hours, minutes] = time24.split(':');
    hours = parseInt(hours);
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  // التحقق من وجود centerId قبل عرض المحتوى
  if (!centerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p>جاري التحقق من صلاحيات الدخول...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto mb-20 md:mb-0" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 md:mb-12">
        <div className="text-center md:text-right w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center justify-center md:justify-start gap-4">
            <FaCalendarAlt className="text-blue-600 shrink-0" /> <span className="truncate">جدول إشغال القاعات</span>
          </h1>
          <p className="text-gray-500 mt-2 text-xs md:text-sm font-bold opacity-80">تنظيم وإدارة المواعيد الأسبوعية لجميع القاعات والمجموعات.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => {
                resetModal();
                setShowModal(true);
            }}
            className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <FaPlus /> <span>حجز موعد جديد</span>
          </button>
          
          <button 
            onClick={fetchData}
            className="bg-white border-2 border-gray-100 text-gray-600 h-14 w-14 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm active:rotate-180 duration-500"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="bg-white rounded-[2.5rem] p-12 shadow-xl shadow-gray-100 border border-gray-100 flex flex-col items-center justify-center gap-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 shadow-lg"></div>
            <span className="font-black text-gray-600 text-lg">جاري تنظيم الجدول الأسبوعي...</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-gray-100 border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-4 md:p-6 text-gray-400 text-[10px] md:text-xs font-black uppercase tracking-widest border-l border-gray-100 w-24 whitespace-nowrap">اليوم</th>
                  {rooms.map(room => (
                    <th key={room.id} className="p-4 md:p-6 text-blue-900 font-black min-w-[180px] md:min-w-[220px] border-l border-gray-100 last:border-l-0 whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <span className="flex items-center gap-2 text-sm md:text-base">
                          <FaDoorOpen className="text-blue-600 shrink-0" /> {room.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100/50 tracking-wider">سعة: {room.capacity} طالب</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/30 transition-colors">
                    <td className="p-4 font-black text-gray-800 border-l border-gray-100 bg-gray-50/50 text-center text-sm md:text-base whitespace-nowrap">{day.name}</td>
                    {rooms.map(room => {
                      const items = scheduleMap[`${day.id}_${room.id}`] || [];
                      return (
                        <td key={room.id} className="p-2 md:p-3 border-l border-b border-gray-100 last:border-l-0 align-top min-h-[120px]">
                          <div className="flex flex-col gap-2">
                            {items.length === 0 ? (
                                <div className="h-8 border-2 border-dashed border-gray-50/50 rounded-xl opacity-30"></div>
                            ) : items.map(item => (
                                <div key={item.id} className={`p-2.5 rounded-xl shadow-sm relative group hover:shadow-lg transition-all duration-300 border-2 ${item.exam_id ? 'bg-red-50 border-red-100 hover:border-red-300' : 'bg-white border-blue-50 hover:border-blue-300'}`}>
                                  <div className="flex justify-between items-start gap-2 mb-1.5">
                                    <h3 className={`text-[11px] md:text-xs font-black leading-tight ${item.exam_id ? 'text-red-800' : 'text-blue-900'}`}>
                                      {item.exam_id ? `📝 امتحان: ${item.exams?.title}` : item.groups?.courses?.name}
                                    </h3>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black border whitespace-nowrap shrink-0 ${item.exam_id ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                      {item.groups?.courses?.grade || 'عام'}
                                    </span>
                                  </div>

                                <div className="space-y-1 mb-2.5">
                                  <p className="text-[9px] md:text-[10px] text-green-600 font-bold flex items-center gap-1.5 opacity-80">
                                    <FaGraduationCap className="shrink-0 text-green-400" />
                                    <span>د/ {item.groups?.courses?.instructors?.name || item.groups?.courses?.instructor || 'غير محدد'}</span>
                                  </p>
                                  <p className="text-[9px] md:text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                                    <FaUsers className="shrink-0 text-gray-300" />
                                    <span>مجموعة: <span className="text-gray-600">{item.groups?.name}</span></span>
                                  </p>
                                </div>

                                <div className="flex justify-between items-center bg-gray-50/50 p-1.5 rounded-lg border border-gray-100 transition-colors group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-700">
                                  <span className="text-[10px] font-black uppercase tracking-tighter" dir="ltr">
                                    {formatTime12(item.start_time)} - {formatTime12(item.end_time)}
                                  </span>
                                  <div className="flex gap-1">
                                      <button
                                          onClick={() => handleEditClick(item)}
                                          className="h-7 w-7 bg-white text-blue-400 hover:text-blue-700 rounded-md flex items-center justify-center transition-all shadow-sm border border-blue-50 group-hover:border-transparent cursor-pointer"
                                          title="تعديل"
                                      >
                                          <FaEdit size={12}/>
                                      </button>
                                      <button 
                                          onClick={async () => {
                                              if(confirm("هل أنت متأكد من حذف هذا الموعد؟")) {
                                                  if (!centerId) return alert('⚠️ لم يتم تحديد المركز!');
                                                  
                                                  // 🕵️ سجل التدقيق (Audit Log)
                                                  await supabaseBrowser.from('audit_logs').insert({
                                                      table_name: 'schedule',
                                                      record_id: item.id,
                                                      action: 'DELETE',
                                                      user_id: user?.id,
                                                      center_id: centerId,
                                                      old_data: item,
                                                      new_data: { details: `حذف موعد من الجدول: ${item.groups?.courses?.name} - ${item.groups?.name}` }
                                                  });

                                                  const oldSchedule = [...schedule];
                                                  setSchedule(prev => prev.filter(s => s.id !== item.id));

                                                  const { error } = await supabaseBrowser
                                                      .from('schedule')
                                                      .delete()
                                                      .eq('id', item.id)
                                                      .eq('center_id', centerId);

                                                  if (error) {
                                                      setSchedule(oldSchedule);
                                                      alert(`فشل الحذف: ${error.message}`);
                                                  } else {
                                                      fetchData();
                                                  }
                                              }
                                          }}
                                          className="h-7 w-7 bg-white text-red-300 hover:text-red-700 rounded-md flex items-center justify-center transition-all shadow-sm border border-red-50 group-hover:border-transparent cursor-pointer"
                                          title="حذف"
                                      >
                                          <FaTrash size={10}/>
                                      </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[5000] flex items-end md:items-center justify-center p-4 animate-in fade-in duration-300">
          <form onSubmit={handleSaveSchedule} className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
            <div className="flex justify-between items-center border-b border-gray-50 pb-5">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                  <FaCalendarPlus className="text-blue-600 shrink-0"/> <span>{isEditMode ? 'تعديل موعد الحجز' : 'حجز قاعة جديدة'}</span>
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="h-10 w-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"><FaTimes/></button>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mr-1">الصف الدراسي</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsGradeDropOpen(!isGradeDropOpen)}
                      className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl flex items-center justify-between transition-all"
                    >
                      <span className="text-xs font-black truncate text-gray-900">{selectedGrade || '-- اختر الصف --'}</span>
                      <svg className={`w-4 h-4 text-blue-600 transition-transform ${isGradeDropOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isGradeDropOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsGradeDropOpen(false)}></div>
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="max-h-56 overflow-y-auto custom-scrollbar">
                            {grades.map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  setSelectedGrade(g);
                                  setSelectedCourseId('');
                                  setIsGradeDropOpen(false);
                                }}
                                className={`w-full p-4 text-right text-xs font-black hover:bg-blue-50 transition-colors ${selectedGrade === g ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mr-1">القاعة</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsRoomDropOpen(!isRoomDropOpen)}
                      className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl flex items-center justify-between transition-all"
                    >
                      <span className="text-xs font-black truncate text-gray-900">
                        {formData.room_id ? rooms.find(r => r.id === formData.room_id)?.name : '-- اختر القاعة --'}
                      </span>
                      <svg className={`w-4 h-4 text-blue-600 transition-transform ${isRoomDropOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isRoomDropOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsRoomDropOpen(false)}></div>
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="max-h-56 overflow-y-auto custom-scrollbar">
                            {rooms.map(r => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, room_id: r.id});
                                  setIsRoomDropOpen(false);
                                }}
                                className={`w-full p-4 text-right text-xs font-black hover:bg-blue-50 transition-colors flex flex-col items-start ${formData.room_id === r.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                              >
                                <span>{r.name}</span>
                                <span className="text-[9px] opacity-60">سعة {r.capacity}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mr-1">الكورس والمدرس</label>
                <div className="relative">
                  <button
                    type="button"
                    disabled={!selectedGrade}
                    onClick={() => setIsCourseDropOpen(!isCourseDropOpen)}
                    className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl flex items-center justify-between transition-all disabled:opacity-50"
                  >
                    <span className="text-xs font-black truncate text-gray-900">
                      {selectedCourseId ? (
                        `${filteredCourses.find(c => c.id === selectedCourseId)?.name} (د/ ${filteredCourses.find(c => c.id === selectedCourseId)?.instructors?.name || filteredCourses.find(c => c.id === selectedCourseId)?.instructor || 'غير محدد'})`
                      ) : '-- اختر الكورس --'}
                    </span>
                    <svg className={`w-4 h-4 text-blue-600 transition-transform ${isCourseDropOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isCourseDropOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsCourseDropOpen(false)}></div>
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                          {filteredCourses.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCourseId(c.id);
                                setIsCourseDropOpen(false);
                              }}
                              className={`w-full p-4 text-right text-xs font-black hover:bg-blue-50 transition-colors flex flex-col items-start ${selectedCourseId === c.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              <span>{c.name}</span>
                              <span className="text-[9px] opacity-60">د/ {c.instructors?.name || c.instructor || 'غير محدد'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mr-1">المجموعة {formData.exam_id ? '(اختياري للامتحانات)' : ''}</label>
                {formData.exam_id && (
                    <div className="mb-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 text-xs font-black">
                        <span>📝</span>
                        <span>جاري حجز موعد لـ: {selectedExamTitle}</span>
                    </div>
                )}
                <div className="relative">
                  <button
                    type="button"
                    disabled={!selectedCourseId}
                    onClick={() => setIsGroupDropOpen(!isGroupDropOpen)}
                    className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl flex items-center justify-between transition-all disabled:opacity-50"
                  >
                    <span className="text-xs font-black truncate text-gray-900">
                      {formData.group_id ? filteredGroups.find(g => g.id === formData.group_id)?.name : '-- اختر المجموعة --'}
                    </span>
                    <svg className={`w-4 h-4 text-blue-600 transition-transform ${isGroupDropOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isGroupDropOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsGroupDropOpen(false)}></div>
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                          {filteredGroups.map(g => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, group_id: g.id});
                                setIsGroupDropOpen(false);
                              }}
                              className={`w-full p-4 text-right text-xs font-black hover:bg-blue-50 transition-colors ${formData.group_id === g.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              {g.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-5 p-5 bg-blue-50/50 rounded-3xl border border-blue-100">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-blue-900 uppercase tracking-wider mr-1">اليوم</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDayDropOpen(!isDayDropOpen)}
                      className="w-full h-12 px-4 bg-white border border-blue-100 focus:border-blue-500 rounded-xl flex items-center justify-between transition-all shadow-sm"
                    >
                      <span className="text-xs font-black truncate text-gray-900">{days.find(d => d.id === formData.day_of_week)?.name}</span>
                      <svg className={`w-4 h-4 text-blue-600 transition-transform ${isDayDropOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isDayDropOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsDayDropOpen(false)}></div>
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="max-h-56 overflow-y-auto custom-scrollbar">
                            {days.map(d => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, day_of_week: d.id});
                                  setIsDayDropOpen(false);
                                }}
                                className={`w-full p-4 text-right text-xs font-black hover:bg-blue-50 transition-colors ${formData.day_of_week === d.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                              >
                                {d.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-blue-900 uppercase tracking-wider mr-1">الموعد (من - إلى)</label>
                  <div className="flex items-center gap-3 w-full bg-white p-2 rounded-2xl border border-blue-100 shadow-sm">
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between items-center px-1.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">من</span>
                        {formData.start_time && (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 animate-in fade-in zoom-in duration-300">
                            {formatTime12(formData.start_time)}
                          </span>
                        )}
                      </div>
                      <input 
                        type="time" 
                        required 
                        className="w-full h-10 px-2 bg-gray-50/50 rounded-xl text-xs font-black text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" 
                        value={formData.start_time} 
                        onChange={e => setFormData({...formData, start_time: e.target.value})} 
                      />
                    </div>
                    <div className="mt-4 text-blue-200">
                      <FaClock className="opacity-50" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between items-center px-1.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">إلى</span>
                        {formData.end_time && (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 animate-in fade-in zoom-in duration-300">
                            {formatTime12(formData.end_time)}
                          </span>
                        )}
                      </div>
                      <input 
                        type="time" 
                        required 
                        className="w-full h-10 px-2 bg-gray-50/50 rounded-xl text-xs font-black text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" 
                        value={formData.end_time} 
                        onChange={e => setFormData({...formData, end_time: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                <FaCalendarPlus size={18}/> {isEditMode ? 'حفظ التغييرات' : 'تأكيد الحجز'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); resetModal(); }} className="px-8 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function SuspenseSchedulePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-black">جاري التحميل...</div>}>
      <SchedulePage />
    </Suspense>
  );
}

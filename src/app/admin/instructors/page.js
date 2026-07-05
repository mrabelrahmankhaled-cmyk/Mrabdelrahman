'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-browser'; // تأكد من المسار حسب مشروعك
import { 
  FaChalkboardTeacher, FaPlus, FaEdit, FaTrash, FaPhone, FaSearch, 
  FaBook, FaUserTie, FaTimes, FaSpinner, FaToggleOn, FaToggleOff, 
  FaStickyNote, FaEye, FaSync, FaLock
} from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId

export default function InstructorsPage() {
  const { centerId, allowedFeatures, loading: authLoading } = useAuth(); // ← استخراج centerId من الـ context
  
  // 🛡️ Route Protection
  useEffect(() => {
    if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_instructors')) {
        window.location.href = '/admin/dashboard';
    }
  }, [allowedFeatures, authLoading]);

  // 🔒 Feature Flags
  const canAddInstructor = allowedFeatures?.includes('action_add_instructor');
  const canEditInstructor = allowedFeatures?.includes('action_edit_instructor');
  const canDeleteInstructor = allowedFeatures?.includes('action_delete_instructor');
  
  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);
  
  // --- States ---
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [showModal, setShowModal] = useState(false); // مودال الإضافة/التعديل
  const [showCoursesModal, setShowCoursesModal] = useState(false); // مودال عرض الكورسات
  const [selectedInstructorCourses, setSelectedInstructorCourses] = useState([]); // 
  const [selectedInstructorName, setSelectedInstructorName] = useState(''); // 

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    is_active: true, // الحالة (الافتراضي نشط)
    notes: ''        // الملاحظات
  });

  // --- Fetch Data ---
  const fetchInstructors = async () => {
    if (!centerId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('*, courses(id, name, grade)')
        .eq('center_id', centerId) // فلترة حسب المركز
        .order('is_active', { ascending: false }) // النشط يظهر الأول
        .order('name', { ascending: true });

      if (error) throw error;
      setInstructors(data || []);
    } catch (error) {
      console.error("Error fetching instructors:", error);
      toast.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (centerId) {
      fetchInstructors();
    }
  }, [centerId]);

  // --- Handlers ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("اسم المدرس مطلوب");
    
    if (!centerId) {
      toast.error('لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      name: formData.name,
      phone: formData.phone,
      is_active: formData.is_active,
      notes: formData.notes,
      center_id: centerId // إضافة center_id
    };

    try {
      if (isEditing) {
        const { error } = await supabase.from('instructors').update(payload).eq('id', editId).eq('center_id', centerId);
        if (error) throw error;
        toast.success("تم تحديث بيانات المدرس بنجاح");
      } else {
        const { error } = await supabase.from('instructors').insert([payload]);
        if (error) throw error;
        toast.success("تم إضافة المدرس بنجاح");
      }
      
      closeModal();
      fetchInstructors();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, coursesCount) => {
    if (coursesCount > 0) {
      return toast.error(`لا يمكن حذف المدرس! مرتبط بـ ${coursesCount} كورس حالياً. يمكنك إلغاء تنشيطه (أرشفته) بدلاً من الحذف.`);
    }

    if (!confirm("هل أنت متأكد من حذف هذا المدرس نهائياً؟")) return;
    
    if (!centerId) {
      toast.error('لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
      return;
    }

    try {
      const { error } = await supabase.from('instructors').delete().eq('id', id).eq('center_id', centerId);
      if (error) throw error;
      
      setInstructors(prev => prev.filter(i => i.id !== id));
      toast.success("تم الحذف بنجاح");
    } catch (error) {
      toast.error("فشل الحذف. تأكد من عدم وجود بيانات مرتبطة.");
    }
  };

  const openEdit = (instructor) => {
    setFormData({
      name: instructor.name,
      phone: instructor.phone || '',
      is_active: instructor.is_active,
      notes: instructor.notes || ''
    });
    setEditId(instructor.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const openCoursesModal = (name, courses) => {
    setSelectedInstructorName(name);
    setSelectedInstructorCourses(courses || []);
    setShowCoursesModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ name: '', phone: '', is_active: true, notes: '' });
    setIsEditing(false);
    setEditId(null);
  };

  // --- Filtering ---
  const filteredInstructors = instructors.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.phone && i.phone.includes(search))
  );

  // التحقق من وجود centerId قبل عرض المحتوى
  // التحقق من وجود centerId قبل عرض المحتوى
  if (authLoading || (allowedFeatures && !allowedFeatures.includes('page_instructors'))) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
            <p>جاري التحقق من الصلاحيات...</p>
          </div>
        </div>
      );
  }

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto mb-20 md:mb-0 space-y-6 md:space-y-8" dir="rtl">
      <Toaster position="top-center" />

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 p-6 md:p-10 rounded-2xl md:rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 text-center lg:text-right w-full lg:w-auto">
          <h1 className="text-2xl md:text-4xl font-black flex items-center justify-center lg:justify-start gap-3 md:gap-4">
            <FaChalkboardTeacher className="text-blue-300 shrink-0"/> <span className="truncate">إدارة المدرسين</span>
          </h1>
          <p className="text-blue-100 mt-2 text-xs md:text-sm font-bold opacity-90 max-w-md mx-auto lg:mx-0">
            سجل بيانات الأساتذة والمحاضرين لربطهم بالكورسات والحسابات المالية والتقارير الأكاديمية.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto relative z-10">
          <button 
            onClick={() => canAddInstructor && setShowModal(true)} 
            disabled={!canAddInstructor}
            className={`w-full sm:w-auto px-6 py-4 rounded-xl md:rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-sm md:text-base cursor-pointer
              ${canAddInstructor 
                ? 'bg-white text-blue-900 hover:bg-blue-50' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'}`}
            title={!canAddInstructor ? "تتطلب ترقية الباقة" : "مدرس جديد"}
          >
            {canAddInstructor ? <FaPlus className="shrink-0" /> : <FaLock className="shrink-0" />} 
            <span className="whitespace-nowrap">مدرس جديد</span>
          </button>
          
          <button 
            onClick={fetchInstructors}
            className="w-full sm:w-auto bg-blue-600/30 backdrop-blur-md border border-white/20 text-white px-6 py-4 rounded-xl md:rounded-2xl font-bold hover:bg-blue-600/50 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
          >
            <FaSync className={`${loading ? 'animate-spin' : ''} shrink-0`} /> <span>تحديث</span>
          </button>
        </div>

        <FaUserTie className="absolute -left-10 -bottom-10 text-[10rem] md:text-[15rem] text-white opacity-5 rotate-12 pointer-events-none" />
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100">
        <div className="relative flex-1 group">
          <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث باسم المدرس أو رقم الهاتف..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 md:h-14 p-3 pr-12 bg-gray-50/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl md:rounded-2xl outline-none font-bold text-gray-700 transition-all text-sm"
          />
        </div>
        <div className="flex items-center justify-center gap-3 px-6 h-12 md:h-14 bg-blue-50 text-blue-700 rounded-xl md:rounded-2xl font-black border border-blue-100 text-sm">
          <FaUserTie className="shrink-0" />
          <span className="whitespace-nowrap">العدد الكلي: {instructors.length}</span>
        </div>
      </div>

      {/* Instructors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white p-8 rounded-[2rem] border-2 border-dashed border-gray-100 h-64 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {filteredInstructors.map((instructor) => {
            const coursesList = instructor.courses || [];
            const coursesCount = coursesList.length;

            return (
              <div key={instructor.id} className={`bg-white rounded-2xl md:rounded-[2.5rem] p-5 md:p-6 shadow-xl shadow-gray-50/50 border transition-all duration-300 group relative overflow-hidden flex flex-col h-full hover:shadow-2xl hover:-translate-y-2 ${instructor.is_active ? 'border-gray-50' : 'border-red-100 bg-red-50/10 grayscale-[0.3]'}`}>
                {/* شريط الحالة الملون العلوي */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${instructor.is_active ? 'bg-blue-600' : 'bg-red-400 opacity-50'}`}></div>
                
                {/* بادج الحالة */}
                <div className="flex justify-end mb-4">
                    {instructor.is_active ? (
                        <span className="bg-green-50 text-green-700 text-[10px] px-3 py-1 rounded-full font-black border border-green-100 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></span> نشط
                        </span>
                    ) : (
                        <span className="bg-red-50 text-red-600 text-[10px] px-3 py-1 rounded-full font-black border border-red-100">
                            مؤرشف (غير نشط)
                        </span>
                    )}
                </div>

                <div className="flex flex-col items-center gap-4 mb-6 text-center">
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.75rem] flex items-center justify-center text-2xl md:text-3xl font-black border-4 border-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform ${instructor.is_active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {instructor.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-lg md:text-xl text-gray-800 leading-tight group-hover:text-blue-600 transition-colors">أ/ {instructor.name}</h3>
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400">
                      <FaPhone className="rotate-12 shrink-0 text-blue-400"/> 
                      <span dir="ltr">{instructor.phone || 'لا يوجد رقم'}</span>
                    </div>
                  </div>
                </div>

                {/* عرض الملاحظات */}
                {instructor.notes && (
                    <div className="bg-yellow-50/80 p-3 rounded-xl mb-6 text-[11px] md:text-xs text-gray-600 border border-yellow-100 flex gap-2 items-start">
                        <FaStickyNote className="text-yellow-400 mt-0.5 shrink-0"/>
                        <p className="line-clamp-2 md:line-clamp-3 font-bold">{instructor.notes}</p>
                    </div>
                )}

                <div className="mt-auto space-y-4">
                  <div className="bg-gray-50/80 p-4 rounded-xl md:rounded-2xl border border-gray-100 flex flex-col items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">الكورسات المرتبطة</span>
                    <button 
                        onClick={() => openCoursesModal(instructor.name, coursesList)}
                        disabled={coursesCount === 0}
                        className="w-full bg-white h-11 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-black text-blue-600 shadow-sm border border-gray-100 hover:bg-blue-600 hover:text-white transition-all active:scale-95 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-blue-600 disabled:cursor-default"
                    >
                      <FaBook size={12}/> {coursesCount} كورس
                      {coursesCount > 0 && <FaEye className="opacity-40" size={14}/>}
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => canEditInstructor && openEdit(instructor)} 
                      disabled={!canEditInstructor}
                      className={`flex-1 h-11 border-2 border-gray-50 rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-xs
                        ${canEditInstructor 
                          ? 'bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50' 
                          : 'bg-gray-50 text-gray-300 opacity-50 cursor-not-allowed'}`}
                      title={!canEditInstructor ? "تتطلب ترقية الباقة" : "تعديل"}
                    >
                      {canEditInstructor ? <FaEdit/> : <FaLock/>} تعديل
                    </button>
                    <button 
                      onClick={() => canDeleteInstructor && handleDelete(instructor.id, coursesCount)} 
                      disabled={!canDeleteInstructor}
                      className={`h-11 w-11 border-2 border-gray-50 rounded-xl transition-all flex items-center justify-center
                        ${canDeleteInstructor 
                          ? 'bg-white text-gray-300 hover:text-red-600 hover:bg-red-50' 
                          : 'bg-gray-50 text-gray-300 opacity-50 cursor-not-allowed'}`}
                      title={!canDeleteInstructor ? "تتطلب ترقية الباقة" : "حذف"}
                    >
                      {canDeleteInstructor ? <FaTrash size={14}/> : <FaLock size={12}/>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredInstructors.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4 text-gray-300 shadow-sm">
                <FaChalkboardTeacher className="text-6xl opacity-20" />
                <div className="text-center">
                  <p className="font-black text-gray-400 text-sm md:text-base mb-2">لا يوجد مدرسين مسجلين</p>
                  <button onClick={() => setShowModal(true)} className="text-blue-600 font-black text-sm hover:underline flex items-center gap-2 justify-center mx-auto">
                    <FaPlus size={10}/> إضافة أول مدرس الآن
                  </button>
                </div>
            </div>
          )}
        </div>
      )}

      {/* View Courses Modal */}
      {showCoursesModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
              <div className="bg-blue-900 text-white p-6 flex justify-between items-center border-b border-white/10">
                 <h3 className="font-black text-lg flex items-center gap-3">
                    <FaBook className="text-blue-300 shrink-0"/> <span className="truncate">كورسات: {selectedInstructorName}</span>
                 </h3>
                 <button onClick={() => setShowCoursesModal(false)} className="h-9 w-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all cursor-pointer"><FaTimes/></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 {selectedInstructorCourses.length > 0 ? (
                    <div className="space-y-3">
                       {selectedInstructorCourses.map(course => (
                          <div key={course.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-colors">
                             <span className="font-black text-gray-800 text-sm">{course.name}</span>
                             <span className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-black border border-blue-200">{course.grade}</span>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="text-center py-10 text-gray-300 font-bold italic space-y-3">
                        <FaBook size={40} className="mx-auto opacity-10" />
                        <p>لا توجد كورسات مسجلة حالياً</p>
                    </div>
                 )}
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 hidden md:block text-center">
                  <button onClick={() => setShowCoursesModal(false)} className="px-8 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-300 transition-all text-xs">إغلاق النافذة</button>
              </div>
           </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
            <div className="bg-gray-900 text-white p-6 flex justify-between items-center border-b border-white/5">
              <h2 className="text-lg md:text-xl font-black flex items-center gap-3">
                {isEditing ? <FaEdit className="text-orange-400 shrink-0"/> : <FaPlus className="text-blue-400 shrink-0"/>}
                <span>{isEditing ? 'تعديل بيانات مدرس' : 'إضافة مدرس جديد'}</span>
              </h2>
              <button onClick={closeModal} className="h-9 w-9 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all cursor-pointer"><FaTimes size={18}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              
              {/* Toggle الحالة */}
              <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                 <div className="text-xs font-black text-blue-900 uppercase">حالة المدرس في النظام</div>
                 <button 
                    type="button"
                    onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-xs shadow-sm ${formData.is_active ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}
                 >
                    {formData.is_active ? <><FaToggleOn size={18}/> نشط</> : <><FaToggleOff size={18}/> مؤرشف</>}
                 </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-gray-400 uppercase mr-1">اسم المدرس <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="أدخل الاسم الرباعي.." 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full h-12 md:h-14 p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl md:rounded-2xl outline-none font-bold transition-all text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-gray-400 uppercase mr-1">رقم الهاتف الشخصي</label>
                <input 
                  type="text" 
                  placeholder="01xxxxxxxxx" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full h-12 md:h-14 p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl md:rounded-2xl outline-none font-bold transition-all text-sm font-mono text-left"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-gray-400 uppercase mr-1">ملاحظات إدارية (للاستخدام الداخلي)</label>
                <textarea 
                  placeholder="اكتب أي معلومات إضافية عن نظام التواصل أو الحسابات.." 
                  rows="3"
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl md:rounded-2xl outline-none text-sm transition-all resize-none font-bold"
                />
              </div>

              <div className="pt-4 flex flex-col md:flex-row gap-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 h-12 md:h-14 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex justify-center items-center gap-3 active:scale-95 disabled:bg-gray-200 disabled:shadow-none"
                >
                  {isSubmitting ? <FaSpinner className="animate-spin text-lg"/> : (
                    <><FaPlus className="shrink-0" /> <span className="text-base">{isEditing ? 'حفظ التغييرات' : 'إضافة المدرس الآن'}</span></>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="h-12 md:px-8 bg-gray-100 text-gray-500 rounded-xl md:rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
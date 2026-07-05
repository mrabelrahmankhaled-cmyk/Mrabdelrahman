'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-browser'; // تأكد من المسار حسب مشروعك
import { FaBook, FaChalkboardTeacher, FaMoneyBillWave, FaEdit, FaTrash, FaLayerGroup, FaPlus, FaLock, FaImage, FaUpload, FaSync } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId

export default function CoursesPage() {
  const { centerId, user, allowedFeatures, loading: authLoading } = useAuth(); // ← استخراج centerId من الـ context
  
  // 🛡️ Route Protection
  useEffect(() => {
    if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_courses')) {
        window.location.href = '/admin/dashboard';
    }
  }, [allowedFeatures, authLoading]);

  // 🔒 Feature Flags
  const canAdd = allowedFeatures?.includes('action_add_course');
  const canEdit = allowedFeatures?.includes('action_edit_course');
  const canDelete = allowedFeatures?.includes('action_delete_course');
  
  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);
  
  // --- States ---
  const [courses, setCourses] = useState([]);
  const [instructorsList, setInstructorsList] = useState([]); // 🆕 قائمة المدرسين
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState('center'); // 🎭
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [stagesList, setStagesList] = useState([]);

    
  // 🔄 تم تعديل الفورم ليحفظ ID المدرس بدلاً من الاسم النصي
  const [formData, setFormData] = useState({
    name: '',
    instructor_id: '',
    grade: '',
    price: '',
    center_tax: '',
    monthly_price: '',
    is_sequential: false, // ⛓️ إلزام بالتسلسل
    is_online_only: false, // كورس أونلاين فقط
    thumbnail_url: '', // 🖼️
    description: '', // 📝 وصف مختصر
    digital_price: '', // سعر الحصة أونلاين
    digital_full_price: '', // سعر الكورس كامل أونلاين
    original_price: '' // السعر قبل الخصم (للعرض فقط)
  });
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // --- Fetch Stages (جلب المراحل الدراسية من الإعدادات) ---
const fetchStages = async () => {
  if (!centerId) return;
  
  try {
    const { data, error } = await supabase
      .from('educational_stages')
      .select('*') // بنجيب كل الأعمدة بما فيها sort_order
      .eq('center_id', centerId) // ← فلترة حسب المركز
      .order('sort_order', { ascending: true }); // 🔥 الترتيب حسب عمود الترتيب من الصغير للكبير

    if (error) throw error;
    setStagesList(data || []);
  } catch (error) {
    console.error("Error fetching stages:", error.message);
  }
};

  const fetchCenterType = async () => {
    if (!centerId) return;
    const { data } = await supabase.from('centers').select('center_type').eq('id', centerId).single();
    if (data?.center_type) setCenterType(data.center_type);
  };

  useEffect(() => {
    if (centerId) {
      fetchInstructors();
      fetchCourses();
      fetchStages();
      fetchCenterType(); // 🆕
    }
  }, [centerId]);

  // --- 1. Fetch Instructors (جلب قائمة المدرسين) ---
  const fetchInstructors = async () => {
    if (!centerId) return;
    
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, name')
        .eq('is_active', true) // 🆕 التعديل هنا: جلب المدرسين النشطين فقط
        .eq('center_id', centerId) // ← فلترة حسب المركز
        .order('name', { ascending: true });
        
      if (error) throw error;
      setInstructorsList(data || []);
    } catch (error) {
      console.error("Error fetching instructors:", error.message);
    }
  };

  // --- 2. Fetch Courses (جلب الكورسات مع اسم المدرس) ---
  const fetchCourses = async () => {
    if (!centerId) return;
    
    setLoading(true);
    // 🆕 بنعمل Join عشان نجيب اسم المدرس من جدوله
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructors (
          id,
          name
        )
      `)
      .eq('center_id', centerId) // ← فلترة حسب المركز
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setCourses(data || []);
    setLoading(false);
  };

  // --- Submit (Add/Edit) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.grade || !formData.instructor_id) return;
    
    if (!centerId) {
      alert('⚠️ لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
      return;
    }

    try {
      const courseData = {
        name: formData.name,
        instructor_id: formData.instructor_id,
        grade: formData.grade,
        price: parseFloat(formData.price) || 0,
        center_tax: parseFloat(formData.center_tax) || 0,
        monthly_price: parseFloat(formData.monthly_price) || 0,
        is_sequential: formData.is_sequential ?? false, // ⛓️
        is_online_only: formData.is_online_only ?? false, 
        thumbnail_url: formData.thumbnail_url || '', // 🖼️
        description: formData.description || '', // 📝
        digital_price: parseFloat(formData.digital_price) || 0,
        digital_full_price: parseFloat(formData.digital_full_price) || 0,
        original_price: parseFloat(formData.original_price) || 0,
        center_id: centerId
      };

      if (isEditing) {
        // Update
        const { error } = await supabase.from('courses').update(courseData).eq('id', editId).eq('center_id', centerId);
        if (error) throw error;

        // 🕵️ سجل التدقيق (Audit Log)
        await supabase.from('audit_logs').insert({
            table_name: 'courses',
            record_id: editId,
            action: 'UPDATE',
            user_id: user?.id,
            center_id: centerId,
            new_data: { details: `تعديل بيانات الكورس: ${formData.name}`, ...courseData }
        });

        alert('تم تعديل الكورس بنجاح ✅');
      } else {
        // Insert
        const { data: newCourse, error } = await supabase.from('courses').insert([courseData]).select().single();
        if (error) throw error;

        // 🕵️ سجل التدقيق (Audit Log)
        await supabase.from('audit_logs').insert({
            table_name: 'courses',
            record_id: newCourse?.id,
            action: 'INSERT',
            user_id: user?.id,
            center_id: centerId,
            new_data: { details: `إضافة كورس جديد: ${formData.name}`, ...courseData }
        });

        alert('تم إضافة الكورس بنجاح 🎉');
      }

      resetForm();
      fetchCourses();
    } catch (error) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  // --- Delete ---
  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكورس؟ (سيؤثر على الحصص المرتبطة به)')) return;
    
    if (!centerId) {
      alert('⚠️ لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    
    const course = courses.find(c => c.id === id);
    
    // 🕵️ سجل التدقيق (Audit Log)
    await supabase.from('audit_logs').insert({
        table_name: 'courses',
        record_id: id,
        action: 'DELETE',
        user_id: user?.id,
        center_id: centerId,
        old_data: course,
        new_data: { details: `حذف كورس: ${course?.name || 'مجهول'}` }
    });

    const { error } = await supabase.from('courses').delete().eq('id', id).eq('center_id', centerId);
    if (!error) {
      setCourses(courses.filter(c => c.id !== id));
      alert('تم حذف الكورس بنجاح');
    } else {
      alert('لا يمكن حذف الكورس لأنه مرتبط بطلاب أو حصص.');
    }
  };

  // --- Toggle Featured ---
  const handleToggleFeatured = async (id, currentVal) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_featured: !currentVal })
        .eq('id', id);
      if (error) throw error;
      setCourses(courses.map(c => c.id === id ? { ...c, is_featured: !currentVal } : c));
    } catch (err) {
      alert('خطأ أثناء التحديث: ' + err.message);
    }
  };

  // --- Edit Helper ---
  const handleEdit = (course) => {
    setFormData({
      name: course.name,
      instructor_id: course.instructor_id || '',
      grade: course.grade,
      price: course.price,
      center_tax: course.center_tax || '',
      monthly_price: course.monthly_price || '',
      is_sequential: course.is_sequential || false,
      is_online_only: course.is_online_only || false,
      thumbnail_url: course.thumbnail_url || '', // 🖼️
      description: course.description || '', // 📝
      digital_price: course.digital_price || '',
      digital_full_price: course.digital_full_price || '',
      original_price: course.original_price || ''
    });
    setEditId(course.id);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({ 
      name: '', instructor_id: '', grade: '', price: '', center_tax: '', 
      monthly_price: '', is_sequential: false, thumbnail_url: '', 
      description: '', digital_price: '', digital_full_price: '', original_price: '' 
    });
    setIsEditing(false);
    setEditId(null);
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingThumbnail(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${centerId}-course-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('center-logos') // Reusing center-logos bucket for simplicity, or we can use another one
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('center-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
      alert("تم رفع الصورة بنجاح! 🎉");
    } catch (error) {
      alert('فشل الرفع: ' + error.message);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // --- Helper for Badge Colors ---
 const getGradeColor = (grade) => {
  if (!grade) return 'bg-gray-100 text-gray-800';
  // ابحث عن كلمات دلالية لتحديد اللون
  if (grade.includes('إعدادي') || grade.toLowerCase().includes('prep')) 
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (grade.includes('ثانوي') || grade.toLowerCase().includes('sec')) 
      return 'bg-blue-100 text-blue-800 border-blue-200';
  
  return 'bg-purple-100 text-purple-800 border-purple-200'; // لون افتراضي للمراحل الأخرى
};

  // التحقق من وجود centerId قبل عرض المحتوى
  if (authLoading || (allowedFeatures && !allowedFeatures.includes('page_courses'))) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
            <p>جاري التحقق من الصلاحيات...</p>
          </div>
        </div>
      );
  }

  // Helper to determine if submit is allowed
  const canSubmit = isEditing ? canEdit : canAdd;

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-8" dir="rtl">
      
      {/* Header */}
      <div className="text-center mb-6 md:mb-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex justify-center items-center gap-2 md:gap-3">
           <FaBook className="text-blue-600 text-lg md:text-2xl"/>إدارة المواد الدراسية
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-500 mt-2">سجل الكورسات واربطها بالمدرسين المسجلين في النظام</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 sm:p-4 md:p-6 mb-6 md:mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-blue-600"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 md:mb-6">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-700 flex items-center gap-2">
                {isEditing ? <FaEdit className="text-yellow-500 text-sm md:text-base"/> : <FaPlus className="text-blue-500 text-sm md:text-base"/>}
                {isEditing ? 'تعديل بيانات الكورس' : 'إضافة كورس جديد'}
            </h2>
            {isEditing && (
                <button onClick={resetForm} className="text-xs sm:text-sm text-gray-500 hover:text-red-500 underline">
                    إلغاء التعديل
                </button>
            )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5 items-end">
            
            {/* اسم المادة */}
            <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 md:mb-2">اسم المادة</label>
                <div className="relative">
                    <FaBook className="absolute top-3 sm:top-3.5 left-3 text-gray-400 text-sm" />
                    <input 
                        type="text" placeholder="مثال: رياضيات" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full p-2.5 sm:p-3 pl-10 border border-gray-300 rounded-lg outline-none focus:border-blue-500 transition text-sm min-h-[44px]" 
                        required 
                    />
                </div>
            </div>

            {/* الصف الدراسي */}
{/* الصف الدراسي - أصبح ديناميكي 🆕 */}
<div className="col-span-1">
    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 md:mb-2">الصف الدراسي</label>
    <div className="relative">
        <FaLayerGroup className="absolute top-3 sm:top-3.5 left-3 text-gray-400 text-sm" />
        <select 
            value={formData.grade} 
            onChange={e => setFormData({...formData, grade: e.target.value})}
            className="w-full p-2.5 sm:p-3 pl-10 border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white text-sm min-h-[44px]" 
            required
        >
            <option value="">-- اختر الصف --</option>
            {stagesList.length > 0 ? (
                stagesList.map((stage, index) => (
                    <option key={index} value={stage.name}>
                        {stage.name}
                    </option>
                ))
            ) : (
                <option value="" disabled>لا توجد مراحل مسجلة</option>
            )}
        </select>
    </div>
</div>

            {/* 🆕 اختيار المدرس (Select Box) */}
            <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 md:mb-2">اختر المدرس</label>
                <div className="relative">
                    <FaChalkboardTeacher className="absolute top-3 sm:top-3.5 left-3 text-gray-400 text-sm" />
                    <select 
                        value={formData.instructor_id} 
                        onChange={e => setFormData({...formData, instructor_id: e.target.value})}
                        className="w-full p-2.5 sm:p-3 pl-10 border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white text-sm min-h-[44px]" 
                        required 
                    >
                        <option value="">-- اختر مدرس --</option>
                        {instructorsList.length > 0 ? (
                            instructorsList.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>لا يوجد مدرسين نشطين</option>
                        )}
                    </select>
                </div>
            </div>

            {/* السعر */}
            <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 md:mb-2">سعر الحصة</label>
                <div className="relative">
                    <FaMoneyBillWave className="absolute top-3 sm:top-3.5 left-3 text-gray-400 text-sm" />
                    <input 
                        type="number" placeholder="0.00" 
                        value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                        className="w-full p-2.5 sm:p-3 pl-10 border border-gray-300 rounded-lg outline-none focus:border-blue-500 transition text-sm min-h-[44px]" 
                        required min="0" 
                    />
                </div>
            </div>

            {/* نسبة السنتر */}
            <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 md:mb-2 text-blue-600">خصم السنتر (ثابت)</label>
                <div className="relative">
                    <FaMoneyBillWave className="absolute top-3 sm:top-3.5 left-3 text-blue-400 text-sm" />
                    <input 
                        type="number" placeholder="مثال: 20" 
                        value={formData.center_tax} onChange={e => setFormData({...formData, center_tax: e.target.value})}
                        className="w-full p-2.5 sm:p-3 pl-10 border border-blue-200 bg-blue-50 rounded-lg outline-none focus:border-blue-500 transition text-sm min-h-[44px]" 
                        required min="0" 
                    />
                </div>
            </div>

            {/* سعر الاشتراك الشهري 🆕 */}
            <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 md:mb-2 text-purple-600">سعر الاشتراك الشهري</label>
                <div className="relative">
                    <FaMoneyBillWave className="absolute top-3 sm:top-3.5 left-3 text-purple-400 text-sm" />
                    <input 
                        type="number" placeholder="مثال: 400" 
                        value={formData.monthly_price} onChange={e => setFormData({...formData, monthly_price: e.target.value})}
                        className="w-full p-2.5 sm:p-3 pl-10 border border-purple-200 bg-purple-50 rounded-lg outline-none focus:border-purple-500 transition text-sm min-h-[44px]" 
                         min="0" 
                    />
                </div>
            </div>

            {/* سعر الكورس أونلاين 🆕 */}
            <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 md:mb-2 text-emerald-600">سعر البيع أونلاين (كاش)</label>
                <div className="relative">
                    <FaMoneyBillWave className="absolute top-3 sm:top-3.5 left-3 text-emerald-400 text-sm" />
                    <input 
                        type="number" placeholder="مثال: 600" 
                        value={formData.digital_full_price} onChange={e => setFormData({...formData, digital_full_price: e.target.value})}
                        className="w-full p-2.5 sm:p-3 pl-10 border border-emerald-200 bg-emerald-50 rounded-lg outline-none focus:border-blue-500 transition text-sm min-h-[44px]" 
                         min="0" 
                    />
                </div>
            </div>

            {/* السعر قبل الخصم 🆕 */}
            <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 md:mb-2 text-red-600">السعر قبل الخصم (اختياري)</label>
                <div className="relative">
                    <FaMoneyBillWave className="absolute top-3 sm:top-3.5 left-3 text-red-400 text-sm" />
                    <input 
                        type="number" placeholder="مثال: 800" 
                        value={formData.original_price} onChange={e => setFormData({...formData, original_price: e.target.value})}
                        className="w-full p-2.5 sm:p-3 pl-10 border border-red-200 bg-red-50 rounded-lg outline-none focus:border-red-500 transition text-sm min-h-[44px]" 
                         min="0" 
                    />
                </div>
            </div>

            {/* وصف مختصر للكورس 🆕 (يظهر فقط في وضع المدرس) */}
            {centerType === 'instructor' && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-5 mt-2">
                  <label className="block text-xs sm:text-sm font-black text-indigo-600 mb-2 uppercase tracking-widest">وصف مختصر للكورس (يظهر للطلاب)</label>
                  <textarea 
                      placeholder="اكتب وصفاً جذاباً للكورس (مثال: شرح كامل للمنهج مع حل ٥٠٠ سؤال متوقع)" 
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full p-4 border-2 border-indigo-100 bg-indigo-50/20 rounded-2xl outline-none focus:border-indigo-500 transition text-sm min-h-[100px] resize-none font-bold" 
                      rows="3"
                  />
              </div>
            )}

            {/* 🖼️ صورة الكورس (Thumbnail) - تظهر فقط في وضع المدرس */}
            {centerType === 'instructor' && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-5 border-t border-slate-100 pt-5 mt-2">
                 <label className="block text-xs sm:text-sm font-black text-slate-700 mb-3 uppercase tracking-widest">صورة الكورس (Course Thumbnail)</label>
                 <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-full md:w-60 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden relative group">
                       {formData.thumbnail_url ? (
                          <img src={formData.thumbnail_url} className="w-full h-full object-cover" alt="" />
                       ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                             <FaImage size={32} />
                             <span className="text-[10px] font-bold mt-2">لا توجد صورة</span>
                          </div>
                       )}
                       <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                          <input type="file" hidden accept="image/*" onChange={handleThumbnailUpload} />
                          <span className="bg-white text-black px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2">
                             {uploadingThumbnail ? <FaSync className="animate-spin" /> : <FaUpload />} 
                             {uploadingThumbnail ? 'جاري الرفع...' : 'تغيير الصورة'}
                          </span>
                       </label>
                    </div>
                    <div className="flex-1 text-right">
                       <p className="text-xs text-slate-500 font-bold mb-2">هذه الصورة ستظهر للطلاب عند تصفح الكورسات في الصفحة الرئيسية.</p>
                       <p className="text-[10px] text-slate-400 font-black tracking-tighter uppercase italic">المقاس المقترح: 800×600 بكسل</p>
                    </div>
                 </div>
              </div>
            )}

            {/* ⛓️ إلزام بالتسلسل Toggle - تظهر فقط في وضع المدرس */}
            {centerType === 'instructor' && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-5">
                <div
                  onClick={() => setFormData(p => ({ ...p, is_sequential: !p.is_sequential }))}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 select-none
                    ${formData.is_sequential
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{formData.is_sequential ? '⛓️' : '🔓'}</span>
                    <div>
                      <p className={`font-black text-sm ${formData.is_sequential ? 'text-indigo-700' : 'text-gray-600'}`}>
                        إلزام الطالب بالتسلسل (Sequential Mode)
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {formData.is_sequential
                          ? 'الدرس التالي يُفتح فقط بعد إتمام السابق ✅'
                          : 'الطالب حر في اختيار أي درس'}
                      </p>
                    </div>
                  </div>
                  {/* Toggle Switch */}
                  <div className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${formData.is_sequential ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${formData.is_sequential ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              </div>
            )}

            {/* كورس أونلاين فقط Toggle */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-5">
              <div
                onClick={() => setFormData(p => ({ ...p, is_online_only: !p.is_online_only }))}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 select-none
                  ${formData.is_online_only
                    ? 'border-[#2A9D8F] bg-[#2A9D8F]/10'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌐</span>
                  <div>
                    <p className={`font-black text-sm ${formData.is_online_only ? 'text-[#264653]' : 'text-gray-600'}`}>
                      كورس أونلاين فقط
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      عند تفعيل هذا الخيار، لن يظهر هذا الكورس في قائمة التسجيل لطلاب السناتر.
                    </p>
                  </div>
                </div>
                {/* Toggle Switch */}
                <div className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${formData.is_online_only ? 'bg-[#2A9D8F]' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${formData.is_online_only ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
            </div>

            {/* زر الحفظ */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-5 mt-2">
                <button 
                  type="submit" 
                  disabled={!canSubmit}
                  className={`w-full py-2.5 sm:py-3 min-h-[44px] rounded-lg font-bold text-white shadow-md transition transform active:scale-[0.98] text-sm sm:text-base flex items-center justify-center gap-2
                    ${!canSubmit 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70' 
                      : (isEditing ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700')}`}
                  title={!canSubmit ? "تتطلب ترقية الباقة" : (isEditing ? 'حفظ التعديلات' : 'إضافة الكورس')}
                >
                    {!canSubmit && <FaLock className="text-xs" />}
                    {isEditing ? 'حفظ التعديلات' : 'إضافة الكورس'}
                </button>
            </div>
        </form>
      </div>

      {/* Courses Grid */}
      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-700 mb-3 md:mb-5 flex items-center gap-2">
        📋 الكورسات المتاحة ({courses.length})
      </h3>

      {loading ? (
        <p className="text-center text-gray-500 py-10 text-sm">جاري تحميل الكورسات...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {courses.map(course => (
                <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition duration-300 group overflow-hidden">
                    {/* Course Image - تظهر فقط في وضع المدرس */}
                    {centerType === 'instructor' && (
                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                           {course.thumbnail_url ? (
                              <img src={course.thumbnail_url} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-1000" alt="" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                 <FaImage size={40} />
                              </div>
                           )}
                           <div className="absolute top-3 right-3">
                              <span className={`text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-xl shadow-lg border-2 ${getGradeColor(course.grade)}`}>
                                 {course.grade}
                              </span>
                           </div>
                        </div>
                    )}

                    {/* Card Header */}
                    <div className="p-3 sm:p-4 md:p-5 border-b border-gray-50 flex justify-between items-start">
                        <div>
                            {centerType !== 'instructor' && (
                                <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded border ${getGradeColor(course.grade)} mb-2 inline-block`}>
                                    {course.grade}
                                </span>
                            )}
                            <h3 className="font-bold text-base sm:text-lg md:text-xl text-gray-800 group-hover:text-blue-600 transition">
                                {course.name}
                            </h3>
                            {centerType === 'instructor' && course.description && (
                                <p className="text-[10px] text-gray-500 mt-1 line-clamp-1 italic">{course.description}</p>
                            )}
                        </div>
                        <div className="text-left">
                            <span className="block text-green-600 font-bold text-base sm:text-lg">{course.price} ج.م</span>
                            <span className="text-[10px] sm:text-xs text-gray-400">للحصة</span>
                            <span className="block text-purple-600 font-bold text-xs mt-1 border-t border-purple-50">{course.monthly_price || 0} ج.م <span className="text-[8px] text-gray-400">شهر</span></span>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 sm:p-4 md:p-5">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <div className="flex items-center gap-2 text-gray-600">
                                <FaChalkboardTeacher className="text-blue-400 text-sm" />
                                <span className="text-xs sm:text-sm font-semibold">
                                    مستر/ {course.instructors?.name || course.instructor || 'غير محدد'}
                                </span>
                            </div>
                            <div className="bg-blue-50 px-2 py-1 rounded-md border border-blue-100 flex items-center gap-1">
                                <FaMoneyBillWave className="text-blue-500 text-[10px]" />
                                <span className="text-[9px] sm:text-[10px] font-bold text-blue-700">خصم: {course.center_tax || 0}ج</span>
                            </div>
                        </div>
                        {/* ⛓️ Sequential Badge - يظهر فقط في وضع المدرس */}
                        {centerType === 'instructor' && course.is_sequential && (
                          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black px-2.5 py-1.5 rounded-lg mb-3 w-fit">
                            <span>⛓️</span> إلزام بالتسلسل مفعّل
                          </div>
                        )}

                        {/* Toggle Featured */}
                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 mt-2">
                           <span className="text-[10px] font-bold text-gray-600">عرض في الرئيسية</span>
                           <button 
                             onClick={() => handleToggleFeatured(course.id, course.is_featured)}
                             className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${course.is_featured ? 'bg-[#2A9D8F]' : 'bg-gray-300'}`}
                           >
                             <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${course.is_featured ? 'translate-x-[-1.125rem]' : 'translate-x-[-2px]'}`} />
                           </button>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-dashed border-gray-100">
                            <button 
                                onClick={() => canEdit && handleEdit(course)}
                                disabled={!canEdit}
                                className={`flex-1 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1
                                  ${canEdit 
                                    ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'}`}
                                title={!canEdit ? "تتطلب ترقية الباقة" : "تعديل"}
                            >
                                {canEdit ? <FaEdit className="text-xs" /> : <FaLock className="text-[10px]" />} تعديل
                            </button>
                            <button 
                                onClick={() => canDelete && handleDelete(course.id)}
                                disabled={!canDelete}
                                className={`flex-1 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1
                                  ${canDelete 
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'}`}
                                title={!canDelete ? "تتطلب ترقية الباقة" : "حذف"}
                            >
                                {canDelete ? <FaTrash className="text-xs" /> : <FaLock className="text-[10px]" />} حذف
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            
            {courses.length === 0 && (
                <div className="col-span-full text-center py-8 md:py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-xs sm:text-sm">
                    لا توجد كورسات مضافة حتى الآن. ابدأ بإضافة كورس جديد!
                </div>
            )}
        </div>
      )}
    </div>
  );
}

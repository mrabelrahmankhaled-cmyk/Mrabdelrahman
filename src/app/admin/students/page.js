'use client';

import { useState, useEffect, useMemo } from 'react';

import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { supabaseBrowser } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

import { 
  FaSearch, FaUserPlus, FaEdit, FaTrash, FaWhatsapp, FaEye, FaIdCard, 
  FaFilter, FaArrowRight, FaUserGraduate, FaLayerGroup, FaUsers, 
  FaSave, FaPrint, FaFileExcel, FaPhoneAlt, FaCalendarAlt ,FaMobileAlt
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

import Link from 'next/link';

import JsBarcode from 'jsbarcode';

import toast from 'react-hot-toast'; // Import toast notifications

import { Toaster } from 'react-hot-toast'; // Import Toaster component

import { usePermission } from '../../../hooks/usePermission';

// Debounce hook

function useDebounce(value, delay = 400) {

  const [debounced, setDebounced] = useState(value);

  useEffect(() => {

    const handler = setTimeout(() => setDebounced(value), delay);

    return () => clearTimeout(handler);

  }, [value, delay]);

  return debounced;

}



export default function StudentsPage() {

  // const { can } = usePermission();
  const { centerId, allowedFeatures, user, role } = useAuth();

  // --- 1. المتغيرات (State) ---

  const [courses, setCourses] = useState([]);

  const [groups, setGroups] = useState([]); 

  const [stages, setStages] = useState([]); // المخزن الجديد للمراحل الدراسية

  const [centerConfig, setCenterConfig] = useState(null);
  const [centerType, setCenterType] = useState('center'); // 🎭

  const [isSubmitting, setIsSubmitting] = useState(false);

  

  // Pagination states

  const [currentPage, setCurrentPage] = useState(1);

  const [pageSize] = useState(50); // 50 students per page

  

  // متغيرات البحث والفلترة

  const [searchTerm, setSearchTerm] = useState('');

  const [filterIncomplete, setFilterIncomplete] = useState(false);

  const [filterGrade, setFilterGrade] = useState(''); 

  const [filterCourse, setFilterCourse] = useState(''); 



  // حالة الطباعة

  const [printStudent, setPrintStudent] = useState(null);



  // حالة الفورم

  const [isEditing, setIsEditing] = useState(false);

  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({

    name: '',
    phone: '',
    parent_phone: '',
    grade: '',
    enrolled_courses: [],
    course_discounts: {},
    group_ids: {}, 
    has_wallet: false,
    is_free: false,
    is_active: true,
    unique_id: '',
    free_courses: [],
    center_only_courses: [],
    monthly_courses: [],
    max_devices: 1 // 📱 القيمة الافتراضية
  });



  const debouncedSearchTerm = useDebounce(searchTerm);



  // --- 2. تحميل البيانات مع Pagination + Search + Filter ---

  const fetchStudents = async ({ queryKey }) => {

    const [_key, { page, pageSize, search, grade, course }] = queryKey;

    const params = new URLSearchParams({
      page,
      pageSize,
      search,
      grade,
      course,
      centerId: centerId,
    });

    const res = await fetch(`/api/students?${params.toString()}`);

    if (!res.ok) throw new Error('حدث خطأ في تحميل الطلاب');

    return await res.json();

  };



  const {

    data: studentsData,

    isLoading,

    isError,

    refetch,

  } = useQuery({

    queryKey: [

      'students',

      {

        page: currentPage,

        pageSize,

        search: debouncedSearchTerm,

        grade: filterGrade,

        course: filterCourse,

      },

    ],

    queryFn: fetchStudents,
    enabled: !!centerId,
    keepPreviousData: true,

  });



  const fetchData = async () => {
    try {
      // ✅ PERF FIX: Run all 5 queries in parallel instead of sequentially.
      // Also replaced select('*') on center_settings — was fetching ~40 columns
      // when only 4 are used: primary_color, center_name, logo_url, whatsapp_template.
      const [
        { data: coursesData, error: courseError },
        { data: groupsData },
        { data: stagesData },
        { data: configData },
        { data: centerData },
      ] = await Promise.all([
        supabaseBrowser
          .from('courses')
          .select('id, name, grade, price, digital_price, digital_full_price, instructors(id, name)')
          .eq('center_id', centerId)
          .neq('is_online_only', true),

        supabaseBrowser
          .from('groups')
          .select('*, courses(name, grade)')
          .eq('center_id', centerId),

        supabaseBrowser
          .from('educational_stages')
          .select('name')
          .order('sort_order', { ascending: true })
          .eq('center_id', centerId),

        // ✅ Only the 4 columns actually used by the UI + print functions:
        //   primary_color  → print styles, table headers, watermark colors
        //   center_name    → print header h1 + watermark text
        //   logo_url       → print header img
        //   whatsapp_template → handleSendReport message template
        supabaseBrowser
          .from('center_settings')
          .select('primary_color, center_name, logo_url, whatsapp_template')
          .eq('center_id', centerId)
          .maybeSingle(),

        supabaseBrowser
          .from('centers')
          .select('center_type')
          .eq('id', centerId)
          .single(),
      ]);

      if (courseError) throw courseError;

      setCourses(coursesData || []);
      setGroups(groupsData || []);
      setStages(stagesData || []);
      if (configData) setCenterConfig(configData);
      if (centerData?.center_type) setCenterType(centerData.center_type);

    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    }
  };



  useEffect(() => {
    if (centerId) {
      fetchData();
    }
  }, [centerId]); // Fetch when centerId is available



  // طباعة الكارنيه

  useEffect(() => {

    if (printStudent) {

      try {

        JsBarcode("#cardBarcode", printStudent.unique_id, {

          format: "CODE128",

          lineColor: "#000",

          width: 2,

          height: 50,

          displayValue: true

        });

        setTimeout(() => {

            window.print();

            setPrintStudent(null);

        }, 500);

      } catch (e) { console.error(e); }

    }

  }, [printStudent]);



  // --- 3. منطق الفلترة الذكي للقوائم ---

  

  const formCourses = useMemo(() => {

    if (!formData.grade) return courses; 

    return courses.filter(c => c.grade === formData.grade);

  }, [courses, formData.grade]);



  const searchCourses = useMemo(() => {

    if (!filterGrade) return courses;

    return courses.filter(c => c.grade === filterGrade);

  }, [courses, filterGrade]);





  // --- 4. منطق الفورم ---

  const handleCourseChange = (e) => {

    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);

    setFormData({ ...formData, enrolled_courses: selectedOptions });

  };



  const handleDiscountChange = (courseId, value) => {

    setFormData(prev => ({

      ...prev,

      course_discounts: { ...prev.course_discounts, [courseId]: value }

    }));

  };



  // وظيفة تحديث مجموعة الطالب بسرعة من داخل الكارت

  const quickUpdateGroup = async (studentId, courseId, groupId) => {

    const student = (studentsData?.students || []).find(s => s.id === studentId);

    const newGroups = { ...(student.group_ids || {}), [courseId]: groupId };

    

    const { error } = await supabaseBrowser

      .from('students')

      .update({ group_ids: newGroups })

      .eq('id', studentId);



    if (error) toast.error(error.message);

    else refetch(); // استخدم refetch بدل fetchData عشان التحديث يظهر فوراً

  };



const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    
    // 🛡️ حماية العملية (Security First)
    const isAdmin = role === 'admin' || role === 'super_admin';
    const canAdd = isAdmin || (allowedFeatures && allowedFeatures.includes('students:add'));
    const canEdit = isAdmin || (allowedFeatures && allowedFeatures.includes('students:edit'));

    if (isEditing && !canEdit) {
        toast.error('🔒 عذراً، ليس لديك صلاحية تعديل بيانات الطلاب');
        return;
    }
    if (!isEditing && !canAdd) {
        toast.error('🔒 عذراً، ليس لديك صلاحية إضافة طلاب جدد');
        return;
    }

    if (!formData.name) return;
    if (!centerId) {
      toast.error('خطأ: لم يتم التعرف على السنتر');
      return;
    }

    try {
      setIsSubmitting(true);

      // 🚨 --- 1. فحص طول الأرقام (11 رقم بالظبط) --- 🚨
      const cleanPhone = formData.phone ? formData.phone.trim() : '';
      const cleanParentPhone = formData.parent_phone ? formData.parent_phone.trim() : '';

      // لو كاتب رقم طالب، لازم يكون 11 رقم
      if (cleanPhone && cleanPhone.length !== 11) {
          toast.error('❌ رقم هاتف الطالب يجب أن يتكون من 11 رقماً بالضبط', { position: 'top-center', duration: 4000 });
          setIsSubmitting(false);
          return;
      }

      // لو كاتب رقم ولي أمر، لازم يكون 11 رقم
      if (cleanParentPhone && cleanParentPhone.length !== 11) {
          toast.error('❌ رقم هاتف ولي الأمر يجب أن يتكون من 11 رقماً بالضبط', { position: 'top-center', duration: 4000 });
          setIsSubmitting(false);
          return;
      }
      // 🚨 --- نهاية فحص الطول --- 🚨
      

// 🚨 --- بداية التفتيش الذكي المتقدم (بالـ Pro Modal) --- 🚨
      
      // 1. فحص رقم الطالب (Pro Modal أحمر للتحذير)
      let linkOnlineStudentId = null;

      if (cleanPhone !== '') {
          let phoneQuery = supabaseBrowser
            .from('students')
            .select('id, name, center_id')
            .or(`phone.eq.${cleanPhone},parent_phone.eq.${cleanPhone}`);
            
          if (isEditing && editId) phoneQuery = phoneQuery.neq('id', editId); 
          
          const { data: phoneCheck } = await phoneQuery.limit(1).maybeSingle();

          if (phoneCheck) {
              if (phoneCheck.center_id === centerId) {
                  // طالب موجود في نفس السنتر
                  const forceAdd = await new Promise((resolve) => {
                      toast.custom((t) => (
                          <div className="bg-white p-5 rounded-3xl shadow-2xl border-2 border-red-100 max-w-sm w-full animate-fade-in" dir="rtl">
                              <div className="flex items-center gap-3 mb-3">
                                  <div className="bg-red-50 text-red-500 w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0">⚠️</div>
                                  <h3 className="text-sm font-black text-gray-800">تحذير: رقم الطالب مكرر!</h3>
                              </div>
                              <p className="text-xs text-gray-600 mb-2 font-bold leading-relaxed">
                                  هذا الرقم مسجل مسبقاً باسم: <span className="text-red-600 text-sm">{phoneCheck.name}</span>
                              </p>
                              <p className="text-xs text-gray-800 mb-4 font-bold bg-gray-50 p-2 rounded-lg">
                                  في العادة كل طالب له رقم مستقل. هل أنتِ متأكدة من تجاهل التحذير وتسجيل الطالب بنفس الرقم؟
                              </p>
                              <div className="flex flex-col gap-2">
                                  <button onClick={() => { toast.dismiss(t.id); resolve(true); }} className="w-full bg-red-50 text-red-600 border border-red-100 py-2.5 rounded-xl text-xs font-black hover:bg-red-100 transition shadow-sm">✅ نعم، متأكدة (تجاهل وتسجيل)</button>
                                  <button onClick={() => { toast.dismiss(t.id); resolve(false); }} className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl text-xs font-black hover:bg-gray-200 transition">❌ إلغاء لمراجعة الرقم</button>
                              </div>
                          </div>
                      ), { duration: Infinity, position: 'top-center' });
                  });
                  
                  if (!forceAdd) {
                      setIsSubmitting(false);
                      return; // ⛔ وقّف التسجيل
                  }
              } else if (!phoneCheck.center_id) {
                  // طالب مسجل أونلاين على المنصة بدون سنتر
                  const linkAdd = await new Promise((resolve) => {
                      toast.custom((t) => (
                          <div className="bg-white p-5 rounded-3xl shadow-2xl border-2 border-purple-100 max-w-sm w-full animate-fade-in" dir="rtl">
                              <div className="flex items-center gap-3 mb-3">
                                  <div className="bg-purple-50 text-purple-500 w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0">🌐</div>
                                  <h3 className="text-sm font-black text-gray-800">طالب أونلاين مسجل</h3>
                              </div>
                              <p className="text-xs text-gray-600 mb-2 font-bold leading-relaxed">
                                  الطالب <span className="text-purple-600 text-sm">{phoneCheck.name}</span> مسجل في المنصة كطالب أونلاين.
                              </p>
                              <p className="text-xs text-gray-800 mb-4 font-bold bg-gray-50 p-2 rounded-lg">
                                  هل تريد ضمه لطلاب السنتر وتحديث بياناته بالبيانات المدخلة الآن؟
                              </p>
                              <div className="flex flex-col gap-2">
                                  <button onClick={() => { toast.dismiss(t.id); resolve(true); }} className="w-full bg-purple-50 text-purple-600 border border-purple-100 py-2.5 rounded-xl text-xs font-black hover:bg-purple-100 transition shadow-sm">✅ نعم، ضمه للسنتر</button>
                                  <button onClick={() => { toast.dismiss(t.id); resolve(false); }} className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl text-xs font-black hover:bg-gray-200 transition">❌ لا، إلغاء</button>
                              </div>
                          </div>
                      ), { duration: Infinity, position: 'top-center' });
                  });

                  if (!linkAdd) {
                      setIsSubmitting(false);
                      return; 
                  } else {
                      linkOnlineStudentId = phoneCheck.id; // سيتم تحديثه بدلاً من إنشائه
                  }
              } else {
                  // الطالب مسجل في سنتر آخر، ممكن نمنعه أو نسمح بإنشاء حساب جديد
                  toast.error("هذا الرقم مسجل في سنتر آخر، سيتم إنشاء حساب جديد منفصل لهذا الطالب في السنتر الخاص بك.", { duration: 6000 });
              }
          }
      }

      // 2. فحص رقم ولي الأمر (Pro Modal أزرق للأخوات)
      if (cleanParentPhone !== '') {
          let parentQuery = supabaseBrowser
            .from('students')
            .select('id, name')
            .eq('center_id', centerId)
            .or(`parent_phone.eq.${cleanParentPhone},phone.eq.${cleanParentPhone}`);
            
          if (isEditing && editId) parentQuery = parentQuery.neq('id', editId);
          
          const { data: parentCheck } = await parentQuery.limit(1).maybeSingle();

          if (parentCheck) {
              const areSiblings = await new Promise((resolve) => {
                  toast.custom((t) => (
                      <div className="bg-white p-5 rounded-3xl shadow-2xl border-2 border-blue-100 max-w-sm w-full animate-fade-in" dir="rtl">
                          <div className="flex items-center gap-3 mb-3">
                              <div className="bg-blue-50 text-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0">
                                  👨‍👩‍👧‍👦
                              </div>
                              <h3 className="text-sm font-black text-gray-800">تنبيه: رقم ولي أمر مكرر!</h3>
                          </div>
                          <p className="text-xs text-gray-600 mb-2 font-bold leading-relaxed">
                              هذا الرقم مسجل مسبقاً مع الطالب: <span className="text-blue-600 text-sm">{parentCheck.name}</span>
                          </p>
                          <p className="text-xs text-gray-800 mb-4 font-bold bg-gray-50 p-2 rounded-lg">
                              هل المضاف حالياً طالب جديد (أخ/أخت) وتريدين استكمال التسجيل؟
                          </p>
                          <div className="flex flex-col gap-2">
                              <button
                                  onClick={() => { toast.dismiss(t.id); resolve(true); }}
                                  className="w-full bg-green-500 text-white py-2.5 rounded-xl text-xs font-black hover:bg-green-600 transition shadow-sm"
                              >
                                  ✅ نعم، هما أخوات (استكمال التسجيل)
                              </button>
                              <button
                                  onClick={() => { toast.dismiss(t.id); resolve(false); }}
                                  className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl text-xs font-black hover:bg-gray-200 transition"
                              >
                                  ❌ إلغاء العملية
                              </button>
                          </div>
                      </div>
                  ), { duration: Infinity, position: 'top-center' });
              });
              
              if (!areSiblings) {
                  setIsSubmitting(false);
                  return; // ⛔ وقّف التسجيل
              }
          }
      }
      // 🚨 --- نهاية التفتيش الذكي --- 🚨

      const currentEnrollmentDates = isEditing 
        ? ((studentsData?.students || []).find(s => s.id === editId)?.enrollment_dates || {}) 
        : {};

      const newEnrollmentDates = { ...currentEnrollmentDates };
      const today = new Date().toISOString().split('T')[0];

      formData.enrolled_courses.forEach(courseId => {
        if (!newEnrollmentDates[courseId]) {
          newEnrollmentDates[courseId] = today;
        }
      });

      // 1. تحضير البيانات الأساسية للحفظ في الداتابيز
      const dataToSave = {
        name: formData.name,
        phone: formData.phone,
        parent_phone: formData.parent_phone,
        grade: formData.grade,
        center_id: centerId,
        enrolled_courses: formData.enrolled_courses,
        course_discounts: formData.course_discounts,
        group_ids: formData.group_ids,
        enrollment_dates: newEnrollmentDates, 
        is_free: formData.is_free,
        wallet_balance: !formData.has_wallet ? null : (isEditing ? undefined : 0),
        has_wallet: formData.has_wallet,
        is_active: formData.is_active ?? true,
        subscription_type: formData.subscription_type, // 🆕
        free_courses: formData.free_courses, // 🆕
        center_only_courses: formData.center_only_courses, // 🆕
        monthly_courses: formData.monthly_courses || [], // 🆕 لحفظ الاشتراك الشهري للمواد
        max_devices: formData.max_devices || 1 // 📱 حفظ عدد الأجهزة
      };

      // 🔒 قفل البيزنس: هل السنتر يمتلك صلاحية المنصة؟
      const hasPortalAccess = allowedFeatures.includes('action_student_portal');

      if (!isEditing && !linkOnlineStudentId) {
        // --- أ- توليد بيانات الدخول (حالة الإضافة الجديدة تماماً) ---
        const uniqueId = "S-" + Math.floor(1000 + Math.random() * 9000);
        const centerPrefix = centerId.split('-')[0];
        const technicalEmail = hasPortalAccess ? `${uniqueId.toLowerCase()}@${centerPrefix}.center.com` : null;
        const password = formData.phone || "12345678"; 

        // 🎯 NEW: Generate PIN Code for Parent Access
        const generatePin = () => {
          return Math.floor(1000 + Math.random() * 9000).toString();
        };
        const accessCode = generatePin(); 

        // --- ب- إنشاء المستخدم وتفعيله فوراً ---
        const response = await fetch('/api/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...dataToSave,
            unique_id: uniqueId,
            access_code: accessCode,
            email: technicalEmail,
            password: password
          })
        });

        // Check if response is OK before parsing JSON
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create student');
        }

        const serverUniqueId = result.data.unique_id;
        const serverAccessCode = result.data.access_code;

        // 💡 رسالة ذكية لو الكود "نط" فوق أكواد قديمة
        if (result.wasAdjusted) {
          toast('💡 ملحوظة: تم تعديل الكود تلقائياً لتفادي تكرار أكواد قديمة موجودة في السيستم.', {
            icon: 'ℹ️',
            duration: 6000,
            position: 'top-right'
          });
        }

        // 🚨 التعديل الجوهري هنا: تخصيص الرسالة بناءً على الصلاحية 🚨
        if (hasPortalAccess) {
            // الحالة 1: السنتر عنده صلاحية المنصة (Portal Access)
            const successMessage = `✅ تم تسجيل الطالب وحسابه بنجاح!\n\n📋 بيانات الدخول:\n👤 الكود: ${serverUniqueId}\n🔑 كلمة السر: ${password}\n👨‍👩‍👧‍👦 كود ولي الأمر: ${serverAccessCode}\n\n💾 تم النسخ للحافظة!`;
            
            toast.success(successMessage, {
              duration: 10000, 
              position: 'top-center'
            });

            // نسخ البيانات للحافظة فقط في حالة وجود حساب
            navigator.clipboard.writeText(
              `👤 كود الطالب: ${serverUniqueId}\n🔑 كلمة السر: ${password}\n👨‍👩‍👧‍👦 كود ولي الأمر: ${serverAccessCode}`
            );
        } else {
            // الحالة 2: السنتر معندوش صلاحية المنصة (بيانات فقط)
            toast.success('✅ تم تسجيل بيانات الطالب بنجاح\n(تم الحفظ كبيانات فقط - الباقة لا تدعم حسابات المنصة 🔒)', {
              duration: 5000,
              position: 'top-center'
            });
        }
        
        // إعادة ضبط الفورم وتحديث البيانات
        resetForm();
        await refetch();

      } else {
        // --- د- حالة التعديل (Update) أو ضم طالب أونلاين (Link) ---
        const targetEditId = linkOnlineStudentId || editId;
        const originalStudent = studentsData?.students?.find(s => s.id === targetEditId) || { id: targetEditId };
        
        // بناءً على طلب العميل: تم إيقاف إنشاء حسابات (auth.users) لطلاب السنتر.
        // فقط نضمن أن الطالب لديه unique_id و access_code إذا كانت مفقودة.
        let generatedUniqueId = originalStudent?.unique_id;
        let generatedAccessCode = originalStudent?.access_code;

        if (!generatedUniqueId) {
            generatedUniqueId = (linkOnlineStudentId ? "ON-" : "S-") + Math.floor(1000 + Math.random() * 9000);
            dataToSave.unique_id = generatedUniqueId;
        }

        if (!generatedAccessCode || generatedAccessCode === '0') {
            generatedAccessCode = Math.floor(1000 + Math.random() * 9000).toString();
            dataToSave.access_code = generatedAccessCode;
        }

        // 🚗 تحديث قاعدة البيانات مباشرة
        const { error: updateError } = await supabaseBrowser
            .from('students')
            .update(dataToSave)
            .eq('id', targetEditId);

        if (updateError) throw updateError;

        if (linkOnlineStudentId) {
            toast.success('🎉 تم ضم طالب الأونلاين للسنتر وتحديث بياناته بنجاح!');
        } else {
            toast.success('تم تعديل البيانات بنجاح ');
        }

        await refetch();
        resetForm();
      }

    } catch (error) {
      console.error("Submit Error:", error);
      toast.error('حدث خطأ: ' + (error.message || 'يرجى مراجعة الكونسول'));
    } finally {
      setIsSubmitting(false);
    }
  };
const handleEdit = (student) => {
    // 🛡️ حماية التعديل
    const isAdmin = role === 'admin' || role === 'super_admin';
    const canEdit = isAdmin || (allowedFeatures && allowedFeatures.includes('students:edit'));
    
    if (!canEdit) {
        toast.error('🔒 عذراً، ليس لديك صلاحية تعديل بيانات الطلاب');
        return;
    }

    setFormData({
      name: student.name,
      phone: student.phone || '',
      parent_phone: student.parent_phone || '',
      grade: student.grade || '',
      enrolled_courses: student.enrolled_courses || [],
      course_discounts: student.course_discounts || {},
      group_ids: student.group_ids || {},
      enrollment_dates: student.enrollment_dates || {}, 
      has_wallet: student.has_wallet || false, 
      is_free: student.is_free || false,
      is_active: student.is_active ?? true,
      unique_id: student.unique_id,
      subscription_type: student.subscription_type || 'عادي',
      free_courses: student.free_courses || [],
      center_only_courses: student.center_only_courses || [],
      monthly_courses: student.monthly_courses || [],
      max_devices: student.max_devices || 1 // 📱 جلب عدد الأجهزة
    });

    setEditId(student.id);

    setIsEditing(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });

  };

  const handleSendReport = (student) => {
    let phone = (student.parent_phone || "").replace(/\D/g, ''); 
    if (phone.startsWith('01')) phone = '2' + phone;
    
    const baseUrl = window.location.origin;
    const reportLink = `${baseUrl}/portal/report/${student.unique_id}`; 
    const centerName = centerConfig?.center_name || "SMART CENTER";

    let template = centerConfig?.whatsapp_template || 
        `إدارة [center] 📝\nالسيد ولي أمر الطالب(ة)/ [name]\n\nيمكنكم الآن متابعة تقرير الأداء، الحضور، والمديونيات بشكل مفصل عبر الرابط التالي:\n[link]\n\nشكراً لثقتكم بنا.`;

    let finalMsg = template
        .replace(/\[center\]/g, centerName)
        .replace(/\[name\]/g, student.name)
        .replace(/\[link\]/g, reportLink);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
  };



const handleDelete = async (id) => {
  // 🛡️ حماية الحذف (Admin Only or Staff with Permission)
  const isAdmin = role === 'admin' || role === 'super_admin';
  const canDelete = isAdmin || (allowedFeatures && allowedFeatures.includes('students:delete'));
  
  if (!canDelete) {
    toast.error('🔒 عذراً، ليس لديك صلاحية حذف الطلاب');
    return;
  }

  if (!confirm("هل أنت متأكد من حذف هذا الطالب نهائياً؟")) return;

  // 🕵️ سجل التدقيق (Audit Log)
  const student = studentsData?.students?.find(s => s.id === id);
  const studentName = student?.name || 'طالب مجهول';

  if (!centerId) {
    toast.error("⚠️ فشل تسجيل العملية: لم يتم العثور على معرف المركز");
    return;
  }

  try {
    await toast.promise(
      (async () => {
        const { data, error } = await supabaseBrowser.from('audit_logs').insert({
            table_name: 'students',
            record_id: id,
            action: 'DELETE',
            user_id: user?.id,
            center_id: centerId,
            old_data: student,
            new_data: { details: `حذف ملف الطالب: ${studentName}` }
        }).select(); // نطلب استرجاع البيانات للتأكد من الحفظ
        
        if (error) throw error;
        // console.log('✅ Audit log confirmed in DB:', data);
        return data;
      })(),
      {
        loading: 'جاري تسجيل العملية أمنياً...',
        success: 'تم تأكيد تسجيل الحذف في قاعدة البيانات ✅',
        error: (err) => `❌ خطأ في التسجيل: ${err.message || 'حدث خطأ غير متوقع'}`
      }
    );
  } catch (e) {
    console.error("Audit log insert failed:", e);
  }

  const { error } = await supabaseBrowser
    .from('students')
    .delete()
    .eq('id', id);



  if (!error) {

    refetch(); // تحديث القائمة فوراً

    // toast.success("تم الحذف بنجاح"); // (اختياري) لو بتستخدم مكتبة toast

  } else {

    alert("حدث خطأ أثناء الحذف");

    console.error(error);

  }

};

const handleResetDevice = async (id, name) => {
    if (!confirm(`هل أنت متأكد من إعادة ضبط أجهزة الطالب: ${name}؟\nسيتم مسح الأجهزة الحالية والسماح له بالدخول من أجهزة جديدة.`)) return;

    try {
        const { error } = await supabaseBrowser
            .from('students')
            .update({ registered_devices: [] }) // مسح مصفوفة الأجهزة
            .eq('id', id);

        if (error) throw error;
        toast.success("✅ تم إعادة ضبط الأجهزة بنجاح");
        refetch();
    } catch (err) {
        console.error("Reset device error:", err);
        toast.error("❌ فشل إعادة ضبط الأجهزة");
    }
};

  const handleExportExcel = async () => {
    try {
      const loadingToast = toast.loading('جاري تحضير ملف الإكسل...', { position: 'top-center' });
      
      let allFilteredStudents = [];
      let totalCount = 0;
      const exportPageSize = 1000; 
      let page = 1;

      // Fetch First Page
      const firstParams = new URLSearchParams({
        page: page,
        pageSize: exportPageSize, 
        search: debouncedSearchTerm,
        grade: filterGrade,
        course: filterCourse,
        centerId: centerId,
      });

      const firstRes = await fetch(`/api/students?${firstParams.toString()}`);
      if (!firstRes.ok) throw new Error('فشل تحميل البيانات للتصدير');
      
      const firstData = await firstRes.json();
      allFilteredStudents = firstData.students || [];
      totalCount = firstData.totalCount || 0;

      // Fetch remaining pages if any
      while (allFilteredStudents.length < totalCount) {
        page++;
        toast.loading(`جاري جمع البيانات... (${allFilteredStudents.length} من ${totalCount})`, { id: loadingToast });
        
        const nextParams = new URLSearchParams({
          page: page,
          pageSize: exportPageSize,
          search: debouncedSearchTerm,
          grade: filterGrade,
          course: filterCourse,
          centerId: centerId,
        });

        const nextRes = await fetch(`/api/students?${nextParams.toString()}`);
        if (!nextRes.ok) break;
        
        const nextData = await nextRes.json();
        if (!nextData.students || nextData.students.length === 0) break;
        
        allFilteredStudents = [...allFilteredStudents, ...nextData.students];
      }

      if (!allFilteredStudents || allFilteredStudents.length === 0) {
        toast.error('لا توجد بيانات لتصديرها', { id: loadingToast });
        return;
      }

      toast.loading('جاري إنشاء ملف الإكسل وتنسيقه...', { id: loadingToast });

      const rows = allFilteredStudents.map(student => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        
        return {
          'الكود': student.unique_id,
          'اسم الطالب': student.name,
          'المستوى الدراسي': student.grade,
          'تليفون الطالب': student.phone || '-',
          'تليفون ولي الأمر': student.parent_phone || '-',
          'كود ولي الأمر': student.access_code || '-',
          'الرصيد الحالي': student.wallet_balance ?? 0,
          'الحالة': student.is_active ? 'نشط' : 'معطل',
          'مجاني': student.is_free ? 'نعم' : 'لا',
          'تاريخ التسجيل': student.created_at ? new Date(student.created_at).toLocaleDateString('ar-EG') : '-',
          'المواد والمدرسين': student.enrolled_courses ? student.enrolled_courses.map(cid => {
              const course = courses.find(c => c.id === cid);
              if (!course) return cid;
              const teacher = course.instructors?.name || course.instructor || 'مدرس المادة';
              return `${course.name} (د/ ${teacher})`;
          }).join(' | ') : '-',
          'المجموعات': student.enrolled_courses ? student.enrolled_courses.map(cid => {
              const gId = student.group_ids?.[cid];
              const group = groups.find(g => g.id === gId);
              const course = courses.find(c => c.id === cid);
              return group ? `${course?.name}: ${group.name}` : `${course?.name}: بلا مجموعة`;
          }).join(' | ') : '-',
          'الخصومات المحددة': student.enrolled_courses ? student.enrolled_courses.map(cid => {
              const disc = student.course_discounts?.[cid] || 0;
              const course = courses.find(c => c.id === cid);
              return disc > 0 ? `${course?.name}: ${disc}ج` : null;
          }).filter(Boolean).join(' | ') || 'لا يوجد' : '-',
          'البريد الإلكتروني': student.email || `${student.unique_id}@center.com`,
          'الملاحظات': student.notes || '-',
          'رابط تقرير المتابعة': `${baseUrl}/portal/report/${student.unique_id}`
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الطلاب");

      ws['!cols'] = [
        {wch: 10}, // الكود
        {wch: 30}, // الاسم
        {wch: 15}, // المستوى
        {wch: 15}, // تليفون
        {wch: 15}, // تليفون ولي الأمر
        {wch: 12}, // كود ولي الأمر
        {wch: 12}, // الرصيد
        {wch: 10}, // الحالة
        {wch: 8},  // مجاني
        {wch: 15}, // تاريخ التسجيل
        {wch: 50}, // المواد والمدرسين
        {wch: 50}, // المجموعات
        {wch: 30}, // الخصومات المحددة
        {wch: 40}, // البريد الإلكتروني
        {wch: 40}, // الملاحظات
        {wch: 55}, // رابط التقرير
      ];

      XLSX.writeFile(wb, `بيانات_الطلاب_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`تم تصدير ${allFilteredStudents.length} طالب بنجاح! 🎉`, { id: loadingToast });
      
    } catch (error) {
      console.error('Export Error:', error);
      toast.error('حدث خطأ أثناء استخراج البيانات');
    }
  };

// 🖨️ دالة الطباعة الجديدة (تخزين البيانات ثم الفتح)
const handlePrintCard = (student) => {
    // 1. تجهيز البيانات
    const printPayload = {
      student: student,
      center: centerConfig 
    };
    
    // 2. تخزين البيانات في المتصفح لحظياً
    localStorage.setItem('print_card_data', JSON.stringify(printPayload));

    // 3. فتح صفحة الطباعة (تأكد إن المسار ده هو المسار الصحيح لصفحة الطباعة في الأدمن)
    const printWindow = window.open(`/admin/students/print-card/${student.unique_id}`, '_blank');
    
    if (printWindow) {
        printWindow.focus();
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!editId) return;
    
    const newPassword = window.prompt("🔑 أدخل كلمة السر الجديدة للطالب:\n(يجب ألا تقل عن 6 أحرف)");
    if (!newPassword || newPassword.length < 6) {
        if (newPassword !== null) toast.error("كلمة السر يجب أن تكون 6 أحرف على الأقل!");
        return;
    }

    const loadingToast = toast.loading("⏳ جاري تغيير كلمة السر...");
    try {
        const response = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: editId, newPassword })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'فشل تغيير كلمة السر');
        }

        toast.success("✅ تم تغيير كلمة السر للحساب الأونلاين بنجاح!", { id: loadingToast });
    } catch (err) {
        console.error("Change password error:", err);
        toast.error("❌ " + err.message, { id: loadingToast });
    }
  };

 const resetForm = () => {

    setFormData({
      name: '', phone: '', parent_phone: '', grade: '', 
      enrolled_courses: [], course_discounts: {}, group_ids: {}, enrollment_dates: {}, 
      has_wallet: false, is_free: false, unique_id: '', is_active: true,
      subscription_type: 'عادي', free_courses: [], center_only_courses: [],
      monthly_courses: [],
      max_devices: 1
    });

    setIsEditing(false);

    setEditId(null);

  };



  // دالة طباعة القائمة المعروضة حالياً

const handlePrintList = () => {

    if (filteredStudents.length === 0) {

        toast.error("لا يوجد طلاب في القائمة الحالية للطباعة");

        return;

    }



    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';

    iframe.style.left = '-10000px';

    iframe.style.top = '0';

    iframe.style.width = '1000px';

    document.body.appendChild(iframe);



    const doc = iframe.contentWindow.document;

    const dateStr = new Date().toLocaleDateString('ar-EG');

    const timeStr = new Date().toLocaleTimeString('ar-EG');



    doc.open();

    doc.write(`

        <html dir="rtl">

            <head>

                <title>قائمة الطلاب</title>

                <style>

                    @page { size: A4; margin: 10mm; }

                    body { 

                        font-family: 'Segoe UI', Tahoma, sans-serif; 

                        padding: 20px; 

                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);

                    }

                    

                    /* براندنج احترافي */

                    .header { 

                        text-align: center; 

                        margin-bottom: 30px; 

                        border-bottom: 3px solid ${centerConfig?.primary_color || '#2563eb'}; 

                        padding-bottom: 20px; 

                        background: white;

                        border-radius: 15px;

                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);

                    }

                    .header img { 

                        height: 80px; 

                        margin-bottom: 15px; 

                        border-radius: 10px;

                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);

                    }

                    .header h1 { 

                        margin: 0; 

                        font-size: 24px; 

                        color: ${centerConfig?.primary_color || '#2563eb'}; 

                        font-weight: 900;

                        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);

                    }

                    .header p { 

                        margin: 8px 0 0; 

                        color: #64748b; 

                        font-size: 14px; 

                        font-weight: bold;

                        background: ${centerConfig?.primary_color || '#2563eb'}20;

                        padding: 8px 15px;

                        border-radius: 20px;

                        display: inline-block;

                    }

                    

                    /* معلومات التقرير */

                    .meta { 

                        display: flex; 

                        justify-content: space-between; 

                        font-size: 12px; 

                        margin-bottom: 20px; 

                        font-weight: bold;

                        background: white;

                        padding: 15px 20px;

                        border-radius: 10px;

                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);

                        border: 2px solid ${centerConfig?.primary_color || '#2563eb'}20;

                    }

                    .meta span {

                        background: ${centerConfig?.primary_color || '#2563eb'}10;

                        padding: 5px 10px;

                        border-radius: 5px;

                    }

                    

                    /* شياكة احترافية */

                    table { 

                        width: 100%; 

                        border-collapse: collapse; 

                        font-size: 12px; 

                        background: white;

                        border-radius: 10px;

                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);

                    }

                    th { 

                        background: linear-gradient(135deg, ${centerConfig?.primary_color || '#2563eb'} 0%, ${centerConfig?.primary_color || '#2563eb'}dd 100%); 

                        color: white; 

                        font-weight: 800; 

                        padding: 15px 10px; 

                        border: none;

                        text-align: center;

                        font-size: 11px;

                        text-transform: uppercase;

                        letter-spacing: 0.5px;

                    }

                    td { 

                        padding: 12px 10px; 

                        border-bottom: 1px solid #e2e8f0; 

                        color: #334155;

                        text-align: center;

                    }

                    tr:nth-child(even) { background: #f8fafc; }

                    tr:hover { background: ${centerConfig?.primary_color || '#2563eb'}05; }

                    

                    /* تحسينات إضافية */

                    .footer { 

                        text-align: center; 

                        font-size: 10px; 

                        color: #64748b; 

                        margin-top: 30px;

                        padding: 15px;

                        background: white;

                        border-radius: 10px;

                        border: 2px solid ${centerConfig?.primary_color || '#2563eb'}20;

                    }

                    .watermark {

                        position: fixed;

                        top: 50%;

                        left: 50%;

                        transform: translate(-50%, -50%) rotate(-45deg);

                        font-size: 100px;

                        color: rgba(0,0,0,0.03);

                        font-weight: 900;

                        pointer-events: none;

                        z-index: -1;

                    }

                    

                    /* 🚨 منع انقسام العناصر في الطباعة */

                    @media print {

                        /* منع انقسام العناصر الهامة */

                        .header { page-break-inside: avoid !important; }

                        .meta { page-break-inside: avoid !important; }

                        .footer { page-break-inside: avoid !important; }
                        
                        /* السماح للجدول بالانقسام بين الصفحات */
                        table { 
                            page-break-inside: auto !important; 
                        }
                        
                        thead { 
                            display: table-header-group !important; /* تكرار الرأس */
                        }
                        
                        tbody { 
                            page-break-inside: auto !important; 
                        }

                        /* منع انقسام الصفوف والخلايا */
                        tr { 
                            page-break-inside: avoid !important; 
                            page-break-after: auto !important; 
                            page-break-before: auto !important; 
                        }
                        td { 
                            page-break-inside: avoid !important; 
                        }
                    }

                </style>

            </head>

            <body>

                <div class="watermark">${centerConfig?.center_name || 'SYSTEM'}</div>

                

                <div class="header">

                    ${centerConfig?.logo_url ? `<img src="${centerConfig.logo_url}" />` : ''}

                    <h1>${centerConfig?.center_name || 'السنتر التعليمي'}</h1>

                    <p> كشف بيانات الطلاب المسجلين</p>

                </div>

                

                <div class="meta">

                    <span>📅 التاريخ: ${dateStr}</span>

                    <span>👥 عدد الطلاب: ${filteredStudents.length}</span>

                    <span>🔍 ${filterGrade ? filterGrade : 'جميع الصفوف'}</span>

                    ${filterCourse ? `<span>📚 الكورس: ${courses.find(c => c.id === filterCourse)?.name || 'غير محدد'} - (مستر/ ${courses.find(c => c.id === filterCourse)?.instructors?.name || courses.find(c => c.id === filterCourse)?.instructor || 'غير محدد'})</span>` : ''}

                </div>



                <table>

                    <thead>

                        <tr>

                            <th style="width: 5%">#</th>

                            <th style="width: 25%">اسم الطالب</th>

                            <th style="width: 15%">الكود</th>

                            <th style="width: 15%">الصف</th>

                            <th style="width: 20%">رقم الطالب</th>

                            <th style="width: 20%">ولي الأمر</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${filteredStudents.map((s, index) => `

                            <tr>

                                <td style="font-weight: bold; color: ${centerConfig?.primary_color || '#2563eb'}">${index + 1}</td>

                                <td style="text-align: right; padding-right: 15px; font-weight: bold;">${s.name}</td>

                                <td style="font-family: monospace; background: #f1f5f9; padding: 8px; border-radius: 5px;">${s.unique_id}</td>

                                <td style="background: ${centerConfig?.primary_color || '#2563eb'}10; font-weight: bold;">${s.grade || '-'}</td>

                                <td>${s.phone || '-'}</td>

                                <td style="direction: ltr; font-family: monospace;">${s.parent_phone || '-'}</td>

                            </tr>

                        `).join('')}

                    </tbody>

                </table>

                

                <div class="footer">

                    <strong>${centerConfig?.center_name || 'السنتر التعليمي'}</strong><br>

                    ${centerConfig?.address || ''}<br>

                     ${centerConfig?.center_phone || '-'}<br>

                    <em>تم استخراج التقرير آلياً من النظام في ${dateStr} - الساعة ${timeStr}</em>

                </div>

            </body>

        </html>

    `);

    doc.close();



    setTimeout(() => {

        iframe.contentWindow.focus();

        iframe.contentWindow.print();

        setTimeout(() => document.body.removeChild(iframe), 1000);

    }, 500);

};

// دالة إرسال بيانات الدخول (الداشبورد) فقط
  const handleSendCredentials = (student) => {
    let phone = (student.parent_phone || "").replace(/\D/g, ''); 
    if (phone.startsWith('01')) phone = '2' + phone;

    const credentialsMsg = `🔐 *بيانات الدخول للداشبورد - Smart Center*

مرحباً ولي أمر الطالب/ة: *${student.name}*

إليك بيانات تسجيل الدخول لمتابعة الطالب:
👤 *كود الطالب:* ${student.unique_id}
🔑 *كلمة المرور:* ${student.phone || "رقم الهاتف المسجل"}
${student.access_code ? `🔢 *كود ولي الأمر:* ${student.access_code}` : ''}

🔗 رابط الدخول: ${window.location.origin}/login

يرجى الاحتفاظ بهذه البيانات في سرية تامة.`;

    const encodedMsg = encodeURIComponent(credentialsMsg);
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
  };



  const sendWhatsapp = (student) => {

    const targetPhone = student.parent_phone || student.phone;

    if (!targetPhone) return toast.error('لا يوجد رقم هاتف مسجل');

    let phone = targetPhone.replace(/\D/g, '');

    if (phone.startsWith('01')) phone = '20' + phone.substring(1);

    

    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${student.unique_id}&code=Code128&translate-esc=true`;

    const msg = `مرحباً ${student.name},\nهذا هو كود الكارنيه الخاص بك: *${student.unique_id}*\nرابط الباركود: ${barcodeUrl}`;

    

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');

  };



  // --- 5. منطق الفلترة المتقدمة للجدول ---

  const students = studentsData?.students || [];

  const totalStudents = studentsData?.totalCount || 0;

  const filteredStudents = useMemo(() => {
  let list = students;
  // لو الفلتر شغال، اعرض بس اللي معندهمش رقم طالب أو رقم ولي أمر
  if (filterIncomplete) {
      list = list.filter(s => !s.phone || !s.parent_phone);
  }
  return list;
}, [students, filterIncomplete]);

  const loading = isLoading;



  return (

    <div className="max-w-6xl mx-auto p-3 md:p-4 lg:p-8">

      

      {/* الكارنيه المخفي */}

      {printStudent && (

        <div className="hidden print:flex fixed inset-0 z-[9999] bg-white items-center justify-center">

            <div className="border-4 border-blue-600 rounded-xl p-8 text-center و-[400px]">

                <h2 className="text-blue-600 text-2xl font-bold mb-2">Smart Center</h2>

                <p className="text-gray-500 mb-4">بطاقة تعريف الطالب</p>

                <hr className="border-dashed border-gray-300 my-4" />

                <h3 className="text-3xl font-bold my-4">{printStudent.name}</h3>

                <p className="text-lg">الصف: {printStudent.grade}</p>

                <div className="my-6 flex justify-center">

                    <svg id="cardBarcode"></svg>

                </div>

                <p className="text-xl font-mono font-bold tracking-widest">{printStudent.unique_id}</p>

            </div>

        </div>

      )}



      {/* الهيدر */}

      <div className="text-center mb-4 md:mb-6 lg:mb-8 print:hidden">

        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 flex justify-center items-center gap-2">

           إدارة بيانات الطلاب <FaUserGraduate className="text-blue-600" />

        </h1>

      </div>



      {/* --- قسم 1: الفورم (إضافة/تعديل) --- */}

      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4 md:mb-6 lg:mb-8 border border-gray-200 print:hidden">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 md:mb-6 border-b pb-3 md:pb-4">

            <h2 className="text-base md:text-xl font-bold text-gray-700">

                {isEditing ? '✏️ تعديل بيانات الطالب' : '➕ إضافة طالب جديد'}

            </h2>

            {isEditing && (
                <button onClick={resetForm} className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">
                    إلغاء التعديل
                </button>
            )}
            
            {!isEditing && role !== 'admin' && role !== 'super_admin' && !(allowedFeatures && allowedFeatures.includes('students:add')) && (
                <span className="text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded-lg border border-red-100 font-black">
                    🔒 الإضافة مقفولة من الإدارة
                </span>
            )}

        </div>
            

        <form onSubmit={handleSubmit} className="space-y-4">

            <div>

                <input 
                    type="text" placeholder="الاسم الكامل للطالب" required
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 min-h-[44px] border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 text-sm md:text-base appearance-none opacity-100 placeholder:text-gray-400"
                />

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 📱 خانة رقم الطالب */}
                <div className="flex flex-col">
                    <input 
                        type="tel" 
                        placeholder="رقم هاتف الطالب"
                        maxLength="11"
                        value={formData.phone} 
                        onChange={(e) => {
                            const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({...formData, phone: onlyNumbers});
                        }}
                        className={`w-full p-3 min-h-[44px] border-2 rounded-lg outline-none transition-all duration-300 focus:ring-2 text-left font-bold text-sm md:text-base appearance-none opacity-100 placeholder:text-gray-400
                            ${!formData.phone ? 'border-gray-300 focus:ring-blue-500 bg-white text-gray-900' : 
                               formData.phone.length === 11 ? 'border-green-500 bg-white text-green-700 focus:ring-green-200' : 
                               'border-red-400 bg-white text-red-600 focus:ring-red-200'}`}
                        dir="ltr"
                    />
                    {/* رسالة التوجيه تحت الخانة */}
                    {formData.phone && formData.phone.length !== 11 && (
                        <span className="text-red-500 text-xs mt-1 font-bold">
                            مطلوب 11 رقم (الحالي: {formData.phone.length})
                        </span>
                    )}
                </div>

                {/* 👨‍👩‍👧‍👦 خانة رقم ولي الأمر */}
                <div className="flex flex-col">
                    <input 
                        type="tel" 
                        placeholder="رقم ولي الأمر" 
                        required
                        maxLength="11"
                        value={formData.parent_phone} 
                        onChange={(e) => {
                            const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({...formData, parent_phone: onlyNumbers});
                        }}
                        className={`w-full p-3 min-h-[44px] border-2 rounded-lg outline-none transition-all duration-300 focus:ring-2 text-left font-bold text-sm md:text-base appearance-none opacity-100 placeholder:text-gray-400
                            ${!formData.parent_phone ? 'border-gray-300 focus:ring-blue-500 bg-white text-gray-900' : 
                               formData.parent_phone.length === 11 ? 'border-green-500 bg-white text-green-700 focus:ring-green-200' : 
                               'border-red-400 bg-white text-red-600 focus:ring-red-200'}`}
                        dir="ltr"
                    />
                    {/* رسالة التوجيه تحت الخانة */}
                    {formData.parent_phone && formData.parent_phone.length !== 11 && (
                        <span className="text-red-500 text-xs mt-1 font-bold">
                            مطلوب 11 رقم (الحالي: {formData.parent_phone.length})
                        </span>
                    )}
                </div>
            </div>

            

            <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">الصف الدراسي</label>
                <select 
                    value={formData.grade} 
                    onChange={e => setFormData({...formData, grade: e.target.value, enrolled_courses: []})} 
                    className="w-full p-3 min-h-[44px] border-2 border-gray-300 rounded-lg mb-4 bg-white focus:ring-2 focus:ring-blue-500 text-sm md:text-base text-gray-900 appearance-none opacity-100" 
                    required
                >
                    <option value="" className="text-gray-900">اختر الصف الدراسي</option>
                    {stages.length > 0 ? (
                        stages.map((stage, idx) => (
                            <option key={idx} value={stage.name} className="text-gray-900">{stage.name}</option>
                        ))
                    ) : (
                        <>
                            <option value="1 Prep" className="text-gray-900">الأول الإعدادي</option>
                            <option value="2 Prep" className="text-gray-900">الثاني الإعدادي</option>
                            <option value="3 Prep" className="text-gray-900">الثالث الإعدادي</option>
                            <option value="1 Sec" className="text-gray-900">الأول الثانوي</option>
                            <option value="2 Sec" className="text-gray-900">الثاني الثانوي</option>
                            <option value="3 Sec" className="text-gray-900">الثالث الثانوي</option>
                        </>
                    )}
                </select>

                <label className="block text-sm font-bold text-gray-700 mb-2">

                    الكورسات المتاحة {formData.grade ? `لـ (${formData.grade})` : ''}:

                </label>

                <select 
                    multiple 
                    value={formData.enrolled_courses}
                    onChange={handleCourseChange}
                    className="w-full p-3 min-h-[44px] border-2 border-gray-300 rounded-lg h-32 bg-white focus:ring-2 focus:ring-blue-500 text-sm md:text-base text-gray-900 opacity-100"
                    disabled={!formData.grade} 
                >

                    {formCourses.map(c => (

                        <option key={c.id} value={c.id}>

                            {c.name} - (مستر/ {c.instructors?.name || c.instructor || 'غير محدد'})

                        </option>

                    ))}

                    {formCourses.length === 0 && formData.grade && <option disabled>لا توجد كورسات لهذا الصف</option>}

                </select>

            </div>

            {formData.enrolled_courses.length > 0 && (

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">

                    <h4 className="font-bold text-blue-800 mb-3 text-sm">💰 تحديد الخصم والمجموعة لكل كورس:</h4>

                    <div className="grid grid-cols-1 gap-3">

                        {formData.enrolled_courses.map(courseId => {

                            const course = courses.find(c => c.id === courseId);

                            if (!course) return null;

                            return (
                                    <div key={courseId} className="flex flex-wrap items-center gap-4 bg-white p-3 rounded border">
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="text-xs font-black text-gray-800 block">{course.name}</label>
                                            <span className="text-[10px] text-gray-400">مستر/ {course.instructors?.name || course.instructor}</span>
                                        </div>

                                        {/* الخصم المالي */}
                                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
                                            <span className="text-[10px] font-bold text-blue-600">خصم:</span>
                                            <input 
                                                type="number" placeholder="0"
                                                value={formData.course_discounts[courseId] || ''}
                                                onChange={(e) => handleDiscountChange(courseId, e.target.value)}
                                                className="w-16 p-1 border rounded text-xs font-bold"
                                                disabled={formData.free_courses.includes(courseId) || formData.center_only_courses.includes(courseId)}
                                            />
                                        </div>

                                        {/* زر إعفاء من المادة */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const isFree = (formData.free_courses || []).includes(courseId);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    free_courses: isFree 
                                                        ? (prev.free_courses || []).filter(id => id !== courseId)
                                                        : [...(prev.free_courses || []).filter(id => id !== courseId), courseId],
                                                    center_only_courses: (prev.center_only_courses || []).filter(id => id !== courseId)
                                                }));
                                            }}
                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                                                (formData.free_courses || []).includes(courseId)
                                                    ? 'bg-red-500 text-white border-red-600'
                                                    : 'bg-white text-red-600 border-red-100 hover:bg-red-50'
                                            }`}
                                        >
                                            🎁 إعفاء مادة
                                        </button>

                                        {/* زر الاشتراك الشهري */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const isMonthly = (formData.monthly_courses || []).includes(courseId);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    monthly_courses: isMonthly
                                                        ? (prev.monthly_courses || []).filter(id => id !== courseId)
                                                        : [...(prev.monthly_courses || []).filter(id => id !== courseId), courseId]
                                                }));
                                            }}
                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                                                (formData.monthly_courses || []).includes(courseId)
                                                    ? 'bg-purple-600 text-white border-purple-700'
                                                    : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50'
                                            }`}
                                        >
                                            📅 اشتراك شهري
                                        </button>

                                        {/* زر السنتر فقط */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const isCenterOnly = (formData.center_only_courses || []).includes(courseId);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    center_only_courses: isCenterOnly
                                                        ? (prev.center_only_courses || []).filter(id => id !== courseId)
                                                        : [...(prev.center_only_courses || []).filter(id => id !== courseId), courseId],
                                                    free_courses: (prev.free_courses || []).filter(id => id !== courseId)
                                                }));
                                            }}
                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                                                (formData.center_only_courses || []).includes(courseId)
                                                    ? 'bg-blue-600 text-white border-blue-700'
                                                    : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'
                                            }`}
                                        >
                                            🏢 سنتر فقط
                                        </button>

                                        {/* المجموعة */}
                                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
                                            <span className="text-[10px] font-bold text-gray-500">المجموعة:</span>
                                            <select
                                                value={formData.group_ids[courseId] || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    group_ids: { ...prev.group_ids, [courseId]: e.target.value }
                                                }))}
                                                className="p-1 border-b bg-transparent text-[10px] font-black text-gray-700 outline-none"
                                            >
                                                <option value="">-- بلا مجموعة --</option>
                                                {groups.filter(g => g.course_id === courseId).map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                            );

                        })}

                    </div>

                </div>

            )}



            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mt-4">

                <label className="flex items-center gap-2 cursor-pointer bg-green-50 px-3 md:px-4 py-2.5 md:py-2 rounded-lg border border-green-200 hover:bg-green-100 transition min-h-[44px]">

                    <input 

                        type="checkbox" className="w-5 h-5 accent-green-600"

                        checked={formData.has_wallet}

                        onChange={e => setFormData({...formData, has_wallet: e.target.checked})}

                    />

                    <span className="font-bold text-green-800 text-sm md:text-base">✅ تفعيل المحفظة المالية</span>

                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-red-50 px-3 md:px-4 py-2.5 md:py-2 rounded-lg border border-red-200 hover:bg-red-100 transition min-h-[44px]">

                    <input 

                        type="checkbox" className="w-5 h-5 accent-red-600"

                        checked={formData.is_free}

                        onChange={e => setFormData({...formData, is_free: e.target.checked})}

                    />

                    <span className="font-bold text-red-800 text-sm md:text-base">🎓 طالب حالة (إعفاء كامل)</span>

                </label>

            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                {centerType === 'instructor' && (
                    <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 min-h-[44px] w-full md:w-auto">
                        <span className="text-sm font-black text-blue-800 flex items-center gap-2">
                            📱 أقصى عدد أجهزة:
                        </span>
                        <input 
                            type="number" 
                            min="1" max="10"
                            value={formData.max_devices ?? 1}
                            onChange={(e) => {
                                const val = e.target.value === '' ? '' : parseInt(e.target.value);
                                setFormData({ ...formData, max_devices: val });
                            }}
                            className="w-16 p-1 bg-white border-2 border-blue-200 rounded text-center font-black text-blue-700 outline-none focus:border-blue-500"
                        />
                    </div>
                )}
            </div>



            <div className="flex flex-col gap-3 mt-4">
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className={`w-full font-bold py-3 min-h-[48px] rounded-lg shadow-md transition transform text-sm md:text-base ${
                        isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed opacity-75' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.01]'
                    }`}
                >
                    {isSubmitting ? '⏳ جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : 'إضافة الطالب')}
                </button>

                {isEditing && (
                    <button 
                        type="button" 
                        onClick={handleChangePassword}
                        className="w-full font-bold py-3 min-h-[48px] rounded-lg shadow-md transition transform text-sm md:text-base border-2 border-red-500 text-red-600 hover:bg-red-50 hover:scale-[1.01]"
                    >
                        🔑 تغيير كلمة السر للحساب الأونلاين
                    </button>
                )}
            </div>
        </form>

      </div>



      {/* --- قسم 2: البحث والفلترة المتقدمة --- */}

      <div className="print:hidden">

        <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 mb-4 md:mb-6">

            <h3 className="text-gray-700 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">

                <FaFilter className="text-blue-600"/> بحث وفلترة الطلاب

            </h3>



           
          <div className="flex flex-wrap gap-2">
            {/* زر الطباعة المحمي */}
            <button 
                onClick={() => {
                    // 🔒 فحص الصلاحية
                    if (!allowedFeatures?.includes('action_export_reports')) {
                        toast.error('🔒 خاصية الطباعة تتطلب ترقية الباقة');
                        return;
                    }
                    handlePrintList();
                }}
                className={`mt-2 md:mt-0 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-md
                    ${allowedFeatures?.includes('action_export_reports') 
                        ? 'bg-gray-800 text-white hover:bg-black' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
                <FaPrint className={allowedFeatures?.includes('action_export_reports') ? "text-yellow-400" : "text-gray-400"} /> 
                <span className="hidden sm:inline">طباعة القائمة</span>
                <span className="sm:hidden">طباعة</span>
                {!allowedFeatures?.includes('action_export_reports') && '🔒'}
            </button>

            {/* 🟢 زر التصدير إكسل (جديد) */}
            <button 
                onClick={() => {
                    if (!allowedFeatures?.includes('action_export_reports')) {
                        toast.error('🔒 تصدير الإكسل يتطلب ترقية الباقة');
                        return;
                    }
                    handleExportExcel();
                }}
                className={`mt-2 md:mt-0 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-md
                    ${allowedFeatures?.includes('action_export_reports') 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
                <FaFileExcel className={allowedFeatures?.includes('action_export_reports') ? "text-white" : "text-gray-400"} /> 
                <span className="hidden sm:inline">تصدير Excel</span>
                <span className="sm:hidden">Excel</span>
                {!allowedFeatures?.includes('action_export_reports') && '🔒'}
            </button>
          </div>



            

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3">

                <div className="relative">

                    <FaSearch className="absolute right-3 top-3.5 text-gray-400" />

                    <input 
                        type="text" placeholder="اسم الطالب، الهاتف، أو الكود..."
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2.5 pr-10 min-h-[44px] border-2 border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white text-gray-900 text-sm md:text-base appearance-none opacity-100 placeholder:text-gray-400 shadow-sm"
                    />

                </div>



                {/* 🆕 فلتر الصفوف (تحديث عشان يقرأ من الداتابيز) */}

                <div className="relative">

                    <FaLayerGroup className="absolute right-3 top-3.5 text-gray-400" />

                    <select 
                        value={filterGrade} 
                        onChange={e => { setFilterGrade(e.target.value); setFilterCourse(''); }}
                        className="w-full p-2.5 pr-10 min-h-[44px] border-2 border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white appearance-none text-sm md:text-base text-gray-900 opacity-100 shadow-sm"
                    >
                        <option value="" className="text-gray-900">-- كل الصفوف --</option>
                        {/* هنا نفس اللوجيك: قراءة من الـ Stages */}

                        {stages.length > 0 ? (

                            stages.map((stage, idx) => (

                                <option key={idx} value={stage.name} className="text-gray-900">{stage.name}</option>

                            ))

                        ) : (

                            <>

                                <option value="1 Prep" className="text-gray-900">الأول الإعدادي</option>

                                <option value="2 Prep" className="text-gray-900">الثاني الإعدادي</option>

                                <option value="3 Prep" className="text-gray-900">الثالث الإعدادي</option>

                                <option value="1 Sec" className="text-gray-900">الأول الثانوي</option>

                                <option value="2 Sec" className="text-gray-900">الثاني الثانوي</option>

                                <option value="3 Sec" className="text-gray-900">الثالث الثانوي</option>

                            </>

                        )}

                    </select>

                </div>



                <select 
                    value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                    className="w-full p-2.5 min-h-[44px] border-2 border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white text-sm md:text-base text-gray-900 opacity-100 shadow-sm appearance-none"
                >
                    <option value="" className="text-gray-900">-- كل الكورسات --</option>
                    {searchCourses.map(c => (
                        <option key={c.id} value={c.id} className="text-gray-900">
                            {c.name} - (مستر/ {c.instructors?.name || c.instructor || 'غير محدد'})
                        </option>
                    ))}
                </select>
            </div>

        </div>



        <h3 className="text-base md:text-xl font-bold text-gray-700 mb-3 md:mb-4 flex items-center gap-2">

            قائمة الطلاب ({students.length} من {totalStudents} إجمالي)

        </h3>



        {/* 🆕 Pagination Controls */}

        {totalStudents > pageSize && (

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mb-4 md:mb-6 bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200">

            <button

              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}

              disabled={currentPage === 1}

              className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition text-sm md:text-base"

            >

              السابق

            </button>

            

            <span className="text-gray-700 font-bold text-sm md:text-base">

              صفحة {currentPage} من {Math.ceil(totalStudents / pageSize)}

            </span>

            

            <button

              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalStudents / pageSize), prev + 1))}

              disabled={currentPage === Math.ceil(totalStudents / pageSize)}

              className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition text-sm md:text-base"

            >

              التالي

            </button>

          </div>

        )}



        {/* الكروت */}

        <div className="space-y-4">

            {students.map(student => {

    return (

        <div key={student.id} className="bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition flex flex-col gap-3 md:gap-4">

            <div className="flex-1 w-full">

                <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                    <Link href={`/admin/students/${student.id}`} className="text-sm md:text-lg font-black text-blue-900 hover:text-blue-600 hover:underline">
                        {student.name}
                    </Link>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-black border border-gray-200">
                            ID: {student.unique_id}
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-black border border-blue-100">
                            كود ولي الأمر: {student.access_code || '---'}
                        </span>
                        {student.is_free && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-lg font-black shadow-sm">إعفاء كلي 🎓</span>}
                        {student.has_wallet && (
                            <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-lg font-black shadow-sm flex items-center gap-1">
                                محفظة: {student.wallet_balance || 0} ج.م
                            </span>
                        )}
                    </div>
                </div>



                <div className="text-xs md:text-sm text-gray-600 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm border border-blue-50">
                              <FaPhoneAlt size={12} />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold">رقم الطالب</span>
                              <span className="font-bold text-gray-800">{student.phone || '---'}</span>
                           </div>
                        </div>
                        <div className="hidden md:block w-px h-8 bg-gray-200"></div>
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50">
                              <FaWhatsapp size={14} />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold">رقم ولي الأمر</span>
                              <span className="font-bold text-gray-800">{student.parent_phone || '---'}</span>
                           </div>
                        </div>
                        <div className="hidden md:block w-px h-8 bg-gray-200"></div>
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-purple-500 shadow-sm border border-purple-50">
                              <FaLayerGroup size={12} />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold">المستوى الدراسي</span>
                              <span className="font-black text-purple-700">{student.grade}</span>
                           </div>
                        </div>
                        <div className="hidden md:block w-px h-8 bg-gray-200"></div>
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-sm border border-orange-50">
                              <FaCalendarAlt size={12} />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold">تاريخ التسجيل</span>
                              <span className="font-bold text-gray-800">{student.created_at ? new Date(student.created_at).toLocaleDateString('ar-EG') : '---'}</span>
                           </div>
                        </div>
                    </div>



                    <div className="mt-4">
                        <p className="font-black text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                           <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
                           الكورسات والمجموعات الحالية:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {student.enrolled_courses && student.enrolled_courses.length > 0 ? (
                                student.enrolled_courses.map(courseId => {
                                    const c = courses.find(course => course.id === courseId);
                                    if (!c) return null;
                                    
                                    const discount = student.course_discounts?.[courseId] || 0;
                                    const teacherName = c.instructors?.name || c.instructor || "مدرس المادة";
                                    const studentGroupId = student.group_ids?.[courseId] || '';
                                    const isMonthly = (student.monthly_courses || []).includes(courseId);
                                    const isFree = (student.free_courses || []).includes(courseId);
                                    const isCenterOnly = (student.center_only_courses || []).includes(courseId);

                                    return (
                                        <div key={courseId} className="group/course relative flex flex-col bg-white border border-gray-100 p-3 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all gap-2 overflow-hidden">
                                            <div className="flex flex-col gap-1">
                                              <span className="font-black text-gray-800 text-xs leading-tight">
                                                 {c.name}
                                                 <span className="block text-[10px] text-gray-400 mt-0.5">د/ {teacherName}</span>
                                              </span>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                 {isMonthly && <span className="text-[8px] font-black bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">شهري 📅</span>}
                                                 {isFree && <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">إعفاء 🎁</span>}
                                                 {isCenterOnly && <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">سنتر 🏢</span>}
                                                 {discount > 0 && <span className="text-[8px] font-black bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">خصم: {discount}ج</span>}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-gray-50">
                                              <FaUsers className="text-blue-400 text-[10px]" />
                                              <select 
                                                value={studentGroupId}
                                                onChange={(e) => quickUpdateGroup(student.id, courseId, e.target.value)}
                                                className="text-[10px] bg-transparent outline-none font-bold text-blue-600 w-full cursor-pointer hover:underline"
                                              >
                                                <option value="">-- بلا مجموعة --</option>
                                                {groups.filter(g => g.course_id === courseId).map(g => (
                                                  <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                              </select>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full py-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                   <span className="text-gray-400 font-bold text-xs italic">لا يوجد كورسات حالياً</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>



<div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 w-full">
                
                {/* 1. زر التعديل (محمي) */}
                <button 
                    onClick={() => handleEdit(student)} 
                    className={`flex items-center justify-center gap-1 px-3 md:px-4 py-2 min-h-[44px] rounded font-bold text-xs md:text-sm transition
                        ${(role === 'admin' || role === 'super_admin' || (allowedFeatures && allowedFeatures.includes('students:edit'))) 
                            ? 'bg-yellow-400 hover:bg-yellow-500 text-black' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'}`}
                >
                    <FaEdit /> تعديل {(role === 'staff' && !(allowedFeatures && allowedFeatures.includes('students:edit'))) && '🔒'}
                </button>

                {/* 2. زر واتساب المباشر (محمي) */}
                <button 
                    onClick={() => {
                        if (!allowedFeatures?.includes('action_whatsapp_integration')) return toast.error('🔒 خدمة واتساب غير مفعلة في باقتك');
                        sendWhatsapp(student);
                    }} 
                    className={`flex items-center justify-center gap-1 px-3 md:px-4 py-2 min-h-[44px] rounded font-bold text-xs md:text-sm transition
                        ${allowedFeatures?.includes('action_whatsapp_integration') 
                            ? 'bg-green-500 hover:bg-green-600 text-white' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                    <FaWhatsapp className="text-base md:text-lg" /> <span className="hidden sm:inline">واتساب</span> {allowedFeatures?.includes('action_whatsapp_integration') ? '' : '🔒'}
                </button>

                {/* 3. زر طباعة الكارنيه (محمي) */}
                <button 
                    onClick={() => {
                        if (!allowedFeatures?.includes('action_print_id_card')) return toast.error('🔒 طباعة الكارنيهات تتطلب باقة أعلى');
                        handlePrintCard(student);
                    }} 
                    className={`p-2 min-h-[44px] rounded-lg transition flex items-center justify-center gap-1
                        ${allowedFeatures?.includes('action_print_id_card') 
                            ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                    <FaIdCard />
                    <span className="text-[10px] font-bold hidden sm:inline">طباعة كارنيه {allowedFeatures?.includes('action_print_id_card') ? '' : '🔒'}</span>
                </button>

                {/* 4. زر إرسال التقرير لولي الأمر (محمي + كودك الأصلي) */}
                <button 
                    onClick={() => {
                        // الحماية أولاً
                        if (!allowedFeatures?.includes('action_whatsapp_integration')) return toast.error('🔒 خدمة التقارير عبر واتساب غير مفعلة');

                        // كودك الأصلي للتقارير
                        let phone = (student.parent_phone || "").replace(/\D/g, ''); 
                        if (phone.startsWith('01')) phone = '2' + phone;
                        
                        const baseUrl = window.location.origin;
                        const reportLink = `${baseUrl}/portal/report/${student.unique_id}`; 
                        const centerName = centerConfig?.center_name || "SMART CENTER";

                        let template = centerConfig?.whatsapp_template || 
                            `إدارة [center] 📝\nالسيد ولي أمر الطالب(ة)/ [name]\n\nيمكنكم الآن متابعة تقرير الأداء، الحضور، والمديونيات بشكل مفصل عبر الرابط التالي:\n[link]\n\nشكراً لثقتكم بنا.`;

                        let finalMsg = template
                            .replace(/\[center\]/g, centerName)
                            .replace(/\[name\]/g, student.name)
                            .replace(/\[link\]/g, reportLink);

                        const encodedMsg = encodeURIComponent(finalMsg);
                        window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
                    }} 
                    className={`p-2 min-h-[44px] rounded-lg transition shadow-sm flex items-center justify-center gap-1
                        ${allowedFeatures?.includes('action_whatsapp_integration') 
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    title="إرسال رابط التقرير لولي الأمر"
                >
                    <FaWhatsapp className="text-sm" />
                    <span className="text-[10px] font-bold hidden sm:inline">إرسال التقرير {allowedFeatures?.includes('action_whatsapp_integration') ? '' : '🔒'}</span>
                </button>

                {/* 5. زر إرسال بيانات الدخول (محمي) */}
                <button 
                    onClick={() => {
                        if (!allowedFeatures?.includes('action_student_portal')) return toast.error('🔒 المنصة التعليمية غير مفعلة');
                        handleSendCredentials(student);
                    }} 
                    className={`p-2 min-h-[44px] rounded-lg transition shadow-sm flex items-center justify-center gap-1 border
                        ${allowedFeatures?.includes('action_student_portal') 
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200' 
                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                    title="إرسال بيانات الدخول (اسم المستخدم وكلمة السر)"
                >
                    <FaWhatsapp className="text-sm" />
                    <span className="text-[10px] font-bold hidden sm:inline">بيانات الدخول {allowedFeatures?.includes('action_student_portal') ? '' : '🔒'}</span>
                </button>

                {/* 5.1. زر إعادة ضبط الجهاز (جديد) */}
                <button 
                    onClick={() => {
                        if (!allowedFeatures?.includes('action_student_portal')) return toast.error('🔒 المنصة التعليمية غير مفعلة');
                        handleResetDevice(student.id, student.name);
                    }} 
                    className={`p-2 min-h-[44px] rounded-lg transition shadow-sm flex items-center justify-center gap-1 border
                        ${allowedFeatures?.includes('action_student_portal') 
                            ? 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-200' 
                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                    title="إعادة ضبط جهاز الطالب (Device Reset)"
                >
                    <FaMobileAlt className="text-sm" />
                    <span className="text-[10px] font-bold hidden sm:inline">إعادة ضبط جهاز {allowedFeatures?.includes('action_student_portal') ? '' : '🔒'}</span>
                </button>

                {/* 6. زر الحذف (محمي) */}
                <button 
                  onClick={() => handleDelete(student.id)} 
                  className={`flex items-center justify-center gap-1 px-3 md:px-4 py-2 min-h-[44px] rounded font-bold text-xs md:text-sm transition
                    ${(role === 'admin' || role === 'super_admin' || (allowedFeatures && allowedFeatures.includes('students:delete'))) 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'}`}
                >
                  <FaTrash /> <span className="hidden sm:inline">حذف</span> {(role === 'staff' && !(allowedFeatures && allowedFeatures.includes('students:delete'))) && '🔒'}
                </button>
            
            </div>

        </div>

    );

})}

            

            {students.length === 0 && (

                <div className="text-center py-6 md:py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed text-sm md:text-base">

                    لا يوجد طلاب مطابقين لمعايير البحث.

                </div>

            )}

        </div>

      </div>

      

      <Toaster position="top-center" reverseOrder={false} />

    </div>

  );

}
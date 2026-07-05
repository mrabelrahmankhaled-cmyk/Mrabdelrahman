/**
 * TODO (Post-Launch Refactor):
 * - Split StorePage into hooks after 10 centers
 * - Extract analytics logic
 * - Optimize re-renders if INP > 400ms in production
 */

'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { useAuth } from '../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId
import FeatureGuard from '../../../components/FeatureGuard';
import { Toaster, toast } from 'react-hot-toast'; 
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, } from 'recharts'
import { 
  FaStore, FaPlus, FaSearch, FaEdit, FaTrash, FaShoppingCart, 
  FaBarcode, FaBook, FaFileAlt, FaHistory, FaUserCheck, FaTimes, 
  FaSave, FaMoneyBillWave, FaChartLine, FaHandshake, FaUserTie, FaEyeSlash,FaEye,
  FaCheckCircle, FaSpinner, FaExclamationTriangle, FaBoxOpen, FaList, FaLayerGroup, FaPrint, FaToggleOn, FaToggleOff, FaUserGraduate, FaChalkboardTeacher, FaTimesCircle, FaTag, FaUser, FaChartPie , FaUndo,FaFileInvoiceDollar
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

// Pagination constants
const ROWS_PER_PAGE = 20; // عدد الصفوف في الصفحة الواحدة

// Pagination Helper Component
const PaginationHelper = ({ current, total, onChange }) => {
  const totalPages = Math.ceil(total / ROWS_PER_PAGE);
  
  return (
    <div className="flex justify-between items-center mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
      <div className="text-xs font-bold text-gray-500">
        عرض {Math.min((current + 1) * ROWS_PER_PAGE, total)} من أصل {total} عملية
      </div>
      <div className="flex items-center gap-2">
        <button 
          disabled={current === 0} 
          onClick={() => onChange(prev => prev - 1)} 
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          السابق
        </button>
        <span className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">
          {current + 1}
        </span>
        <button 
          disabled={(current + 1) * ROWS_PER_PAGE >= total} 
          onClick={() => onChange(prev => prev + 1)} 
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          التالي
        </button>
      </div>
    </div>
  );
};

export default function StorePage() {
  const { centerId, user } = useAuth(); // ← استخراج centerId من الـ context
  
  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);
  // --- States ---
  const [activeTab, setActiveTab] = useState('products'); 
  const [historyView, setHistoryView] = useState('sales'); 

  const [products, setProducts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]); 
  const [salesLog, setSalesLog] = useState([]); 
  const [settlementPackages, setSettlementPackages] = useState([]); 
  const [unsettledData, setUnsettledData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [centerName, setCenterName] = useState('اسم السنتر الافتراضي');
  const [currentUserName, setCurrentUserName] = useState('Admin'); // القيمة الافتراضية
  const [showArchived, setShowArchived] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);
  // 🔥 خيارات الطباعة
  const [isPrintEnabled, setIsPrintEnabled] = useState(true);
  const [salesPage, setSalesPage] = useState(0); // رقم الصفحة الحالية (يبدأ من 0)
  const [salesCount, setSalesCount] = useState(0); // إجمالي عدد العمليات في الداتابيز
  const [salesTotal, setSalesTotal] = useState(0); // إجمالي عدد المبيعات للـ pagination
  const [packagesPage, setPackagesPage] = useState(0); // رقم صفحة الباقات الحالية
  const [packagesCount, setPackagesCount] = useState(0); // إجمالي عدد الباقات
  const [returnsPage, setReturnsPage] = useState(0); // رقم صفحة المرتجعات الحالية
  const [returnsCount, setReturnsCount] = useState(0); // إجمالي عدد المرتجعات
  const ROWS_PER_PAGE = 20; // عدد الصفوف في الصفحة الواحدة
  const [showReportModal, setShowReportModal] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [centerSettings, setCenterSettings] = useState(null);
  const [productViewMode, setProductViewMode] = useState('grid')
  const [stages, setStages] = useState([]);
  const [coursesList, setCoursesList] = useState([]); // 🆕 قائمة الكورسات للفلتر
  // 📅 متغيرات تقرير الوردية المطور
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]); // التاريخ المختار (افتراضي النهاردة)
  const [reportMode, setReportMode] = useState('daily'); // 'daily' (يومي) أو 'monthly' (شهري)
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [returnsLog, setReturnsLog] = useState([]);
  const [dailySalesStats, setDailySalesStats] = useState(null); // إحصائيات المبيعات اليومية
  const [isLoadingStats, setIsLoadingStats] = useState(false); // loading state
  // حالة للتحكم في مودال معاينة إيصال التسوية
const [showSettlementReceiptModal, setShowSettlementReceiptModal] = useState(false);
const [settlementReceiptData, setSettlementReceiptModalData] = useState(null);

// 🆕 دالة جلب إحصائيات المبيعات والمرتجعات بتاريخ معين
const fetchDailySalesStats = async (targetDate) => {
    if (!centerId) return;
    
    try {
        setIsLoadingStats(true);
        console.log("Fetching daily stats for:", targetDate, centerId);
        
        const { data, error } = await supabase
            .rpc('get_store_sales_with_refunds', { 
                target_date: targetDate,
                target_center_id: centerId
            });

        console.log("Daily stats result:", { data, error });

        if (error) throw error;
        setDailySalesStats(data?.[0] || null);
    } catch (error) {
        console.error("Error fetching daily sales stats:", error);
        console.error("Error details:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        setDailySalesStats(null);
    } finally {
        setIsLoadingStats(false);
    }
};

// 🔍 فلاتر سجل المبيعات (History)
  const [historyFilter, setHistoryFilter] = useState({
    grade: '',
    teacher: '',
    course: '',
    type: '',
    search: ''
  });
  
  // ↩️ Refund Modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundData, setRefundData] = useState({
    sale_id: null,
    product_id: null,
    quantity: 1,
    refund_amount: 0,
    reason: '',
    is_damaged: false,
    refund_method: 'cash',
    settlement_id: null, // ← جديد
    receiver_name: '' // ← جديد
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState(''); 
  const [selectedCourse, setSelectedCourse] = useState(''); 
  const [reportFilterTeacher, setReportFilterTeacher] = useState('');
  const [reportFilterGrade, setReportFilterGrade] = useState('');
  const [reportFilterType, setReportFilterType] = useState(''); // '' or 'note' or 'book' or 'code'
  // 🔍 فلاتر صفحة التسويات (المحفظة)
  const [settlementSearch, setSettlementSearch] = useState('');
  const [settlementGrade, setSettlementGrade] = useState('');
  const [settlementTeacher, setSettlementTeacher] = useState('');
  

  // Modals
  const [showSellModal, setShowSellModal] = useState(false);
  const [productToSell, setProductToSell] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSearchingStudents, setIsSearchingStudents] = useState(false); 

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleItem, setSettleItem] = useState(null); 
  const [settlementData, setSettlementData] = useState({
      receiver_name: '',
      receiver_role: 'Teacher', 
      notes: ''
  });

  // Form
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'note',
    price: '',
    teacher_share: '',
    stock: '',
    grade: '', 
    course_id: '',
    supplier_name: '', 
    receiver_name: '', 
    received_date: new Date().toISOString().split('T')[0] 
  });





  // دالة جلب البيانات من جدول center_settings
  const fetchSettings = async () => {
    if (!centerId) return;
    
    try {
        // 👇 هنا استخدمنا الاسم الصح للجدول
        const { data, error } = await supabase
            .from('center_settings') 
            .select('*')
            .eq('center_id', centerId) // ← فلترة حسب المركز
            .single(); // بنجيب صف واحد بس (لأن دي إعدادات)

        if (error) throw error;
        if (data) setCenterSettings(data);

    } catch (err) {
        console.error("Error fetching center settings:", err);
    }
  };


  // Fetch daily sales stats when reportDate changes
  useEffect(() => {
    if (reportDate && centerId) {
      fetchDailySalesStats(reportDate);
    }
  }, [reportDate, centerId]);

  // تشغيل الدالة أول ما الصفحة تفتح
  useEffect(() => {
    console.log("🚀 [USEFFECT] Main useEffect running!");
    console.log("🚀 [USEFFECT] centerId:", centerId);
    
    if (centerId) {
      console.log("✅ [USEFFECT] centerId exists, calling functions...");
      fetchSettings();
      fetchStages(); // 🆕 تحميل المراحل عند فتح الصفحة
      fetchCourses(); // 🆕 تحميل الكورسات عند فتح الصفحة
    } else {
      console.log("❌ [USEFFECT] No centerId, skipping function calls");
    }
  }, [centerId]);


  useEffect(() => {
    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // نجيب الاسم من جدول البروفايل
            const { data } = await supabase
                .from('staff_profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();
            
            if (data?.full_name) {
                setCurrentUserName(data.full_name);
            }
        }
    };
    fetchCurrentUser();
}, []);

const handleToggleArchive = async (productId, currentStatus) => {
    if (!centerId) return;
    
    const action = currentStatus ? 'استعادة' : 'أرشفة';
    if(!confirm(`هل أنت متأكد من ${action} هذا المنتج؟`)) return;

    const { error } = await supabase
        .from('store_products')
        .update({ is_archived: !currentStatus })
        .eq('id', productId)
        .eq('center_id', centerId); // ← فلترة حسب المركز

    if (error) {
        toast.error('حدث خطأ أثناء التحديث');
    } else {
        toast.success(`تم ${action} المنتج بنجاح`);
        fetchData(); // تحديث القائمة
    }
  };

  // --- 1. Fetch Data ---
const fetchData = async () => {
    if (!centerId) return;
    
    try {
        setLoading(true);
        
        // جلب المراحل الدراسية
        const { data: stagesData } = await supabase
          .from('educational_stages')
          .select('name')
          .eq('center_id', centerId) // ← فلترة حسب المركز
          .order('sort_order', { ascending: true });
        setStages(stagesData || []);

        // 1. جلب المنتجات (كودك القديم)
        const { data: prodData } = await supabase
          .from('store_products')
          .select('*, courses(name, instructor, instructors(id, name), grade)')
          .eq('center_id', centerId) // ← فلترة حسب المركز
          .order('created_at', { ascending: false });
        setProducts(prodData || []);

        // 2. جلب الكورسات (كودك القديم)
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, name, instructor, instructors(id, name), grade')
          .eq('center_id', centerId) // ← فلترة حسب المركز
          .order('grade');
        setCourses(coursesData || []);

        // 👇 3. (جديد) جلب إعدادات السنتر
        const { data: settingsData } = await supabase
          .from('center_settings')  // اسم الجدول الصحيح
          .select('center_name')    // اسم العمود الصحيح
          .eq('center_id', centerId) // ← فلترة حسب المركز
          .maybeSingle();           // maybeSingle أفضل لتجنب الأخطاء لو الجدول فاضي

        if (settingsData?.center_name) {
            setCenterName(settingsData.center_name);
        }

        setLoading(false);
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        setLoading(false);
    }
  };

  // --- Fetch Courses (جلب الكورسات من الإعدادات) ---
const fetchCourses = async () => {
  console.log("🚀 [FETCH COURSES] Function called!");
  console.log("🚀 [FETCH COURSES] centerId:", centerId);
  
  if (!centerId) {
    console.log("❌ [FETCH COURSES] No centerId, returning");
    return;
  }
  
  try {
    console.log("🔍 [FETCH COURSES] Fetching courses for centerId:", centerId);
    
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, grade, instructors(id, name), instructor') // بنجيب id واسم الكورس والصف والمدرس
      .eq('center_id', centerId) // ← فلترة حسب المركز
      .order('name', { ascending: true }); // 🔥 الترتيب حسب اسم الكورس

    console.log("📊 [FETCH COURSES] Results:", {
      data: data,
      error: error,
      count: data?.length || 0
    });

    if (error) throw error;
    setCoursesList(data || []);
  } catch (error) {
    console.error("Error fetching courses:", error.message);
  }
};

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
    setStages(data || []);
  } catch (error) {
    console.error("Error fetching stages:", error.message);
  }
};

  // دالة جلب المنتجات من المخزن
  const fetchProducts = async () => {
    if (!centerId) return;
    
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*, sold_count, damaged_count, courses(name, grade, instructor, instructors(id, name))') // بنجيب sold_count و damaged_count كمان
        .eq('center_id', centerId) // ← فلترة حسب المركز
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchSalesLog = async () => {
    if (!centerId) return;
    
    setLoading(true); // تشغيل التحميل
    try {
        // 1. جلب البيانات من السيرفر (آخر 1000 عملية مثلاً)
        // لاحظ: شلنا الفلاتر من هنا عشان نفلتر في المتصفح براحتنا
        let query = supabase
            .from('store_sales')
            .select(`
                *,
                students ( name, unique_id, phone ),
                store_products (
                    name, type, price, teacher_share, grade, teacher_name,
                    courses ( name, grade, instructor, instructors(id, name) )
                ),
                store_settlements (receiver_name, created_at)
            `)
            .eq('center_id', centerId)
            .order('created_at', { ascending: false })
            .limit(1000); 

        const { data: sales, error } = await query;

        if (error) throw error;

        // 2. تطبيق الفلاتر في المتصفح (Client-Side)
        // ده بيضمن إن الفلتر يشتغل حتى لو البيانات معقدة
        let filtered = sales || [];

        // أ) بحث الاسم
        if (historyFilter.search) {
            const s = historyFilter.search.toLowerCase().trim();
            filtered = filtered.filter(item => 
                item.store_products?.name?.toLowerCase().includes(s)
            );
        }

        // ب) فلتر النوع
        if (historyFilter.type) {
            filtered = filtered.filter(item => 
                item.store_products?.type === historyFilter.type
            );
        }

        // ج) فلتر الصف (شامل: من المنتج أو الكورس)
        if (historyFilter.grade) {
            const g = historyFilter.grade.trim();
            filtered = filtered.filter(item => {
                const pGrade = item.store_products?.grade; 
                const cGrade = item.store_products?.courses?.grade;
                return (pGrade && pGrade.includes(g)) || (cGrade && cGrade.includes(g));
            });
        }

        // د) فلتر المدرس (شامل: من المنتج أو الكورس)
        if (historyFilter.teacher) {
            const t = historyFilter.teacher.trim();
            filtered = filtered.filter(item => {
                const pTeacher = item.store_products?.teacher_name;
                const cTeacher = item.store_products?.courses?.instructor || item.store_products?.courses?.instructors?.name;
                return (pTeacher && pTeacher.includes(t)) || (cTeacher && cTeacher.includes(t));
            });
        }

        // هـ) فلتر الكورس
        if (historyFilter.course) {
            const c = historyFilter.course.trim();
            filtered = filtered.filter(item => 
                item.store_products?.courses?.name === c
            );
        }

        // 3. تحديث الواجهة بالنتائج المفلترة
        setSalesLog(filtered);
        setSalesCount(filtered.length); 
        setSalesTotal(filtered.length);

    } catch (error) {
        console.error("Error fetching sales log:", error);
        toast.error("حدث خطأ في تحميل السجل");
    } finally {
        setLoading(false); // إيقاف التحميل في كل الأحوال
    }
  };

  // 2. دالة جلب التوريد (للفلترة في المتصفح)
  const fetchSettlementPackages = async () => {
    if (!centerId) return;
    try {
        let query = supabase
            .from('store_settlements')
            .select(`
                *,
                store_products!inner (
                    id, name, price, teacher_share, type, grade, teacher_name,
                    courses (
                        id, name, grade, instructor, 
                        instructors (name)
                    )
                )
            `) // 👈 لاحظ هنا: طلبنا الـ grade و instructor والمدرسين
            .eq('center_id', centerId)
            .order('created_at', { ascending: false })
            .limit(1000);

        const { data, error } = await query;
        
        if (error) throw error;

        setSettlementPackages(data || []);
        setPackagesCount(data?.length || 0);
    } catch (error) {
        console.error("Error fetching packages:", error.message);
    }
  };

  // 3. دالة جلب المرتجعات (للفلترة في المتصفح)
// 3. دالة جلب المرتجعات (نسخة نظيفة بدون تعليقات)
  const fetchReturns = async () => {
    if (!centerId) return;
    try {
        let query = supabase
            .from('store_returns')
            .select(`
                *,
                store_products!inner (
                    name, price, teacher_share, type, grade, teacher_name,
                    courses (
                        name, 
                        grade,
                        instructor,
                        instructors (name)
                    )
                ),
                store_sales (students(name, unique_id))
            `)
            .eq('center_id', centerId)
            .order('created_at', { ascending: false })
            .limit(1000);

        const { data, error } = await query;
        
        if (error) throw error;

        setReturnsLog(data || []);
        setReturnsCount(data?.length || 0);
    } catch (err) {
        console.error("Error fetching returns:", err.message);
    }
  };
                               

const fetchUnsettledSales = async () => {
    if (!centerId) return;
    
    try {
      // 1. جلب المبيعات المعلقة (غير المسواة) مع تفاصيل المنتج والكورس
      const { data, error } = await supabase
        .from('store_sales')
        .select(`
          *,
          store_products (
            id,
            name,
            price,
            teacher_share,
            courses ( name, instructor, instructors(id, name), grade )
          )
        `)
        .eq('center_id', centerId) // ← فلترة حسب المركز
        .eq('is_settled', false); // شرط مهم: هات اللي لسه متسلمش بس

      if (error) throw error;

      // 2. إعادة تشكيل البيانات عشان تناسب الكروت والجروب
      const formattedData = (data || []).map(item => {
        // حماية ضد البيانات الناقصة
        const product = item.store_products || {};
        const course = product.courses || {};
        const qty = item.quantity || 1; // لو الكمية مش موجودة نعتبرها 1

        return {
          ...item,
          product_id: product.id,
          product_name: product.name || 'منتج غير معروف',
          // بنجيب اسم المدرس من الكورس، ولو مفيش كورس يبقى "عام/السنتر"
          instructor_name: course.instructors?.name || course.instructor || 'السنتر',
          
          // الحسابات المهمة للكروت
          sales_count: qty,
          price: product.price || 0,
          teacher_share: product.teacher_share || 0,
          
          // إجمالي المستحق في العملية دي (مهم جداً للتجميع)
          total_owed: (product.teacher_share || 0) * qty
        };
      });

      setUnsettledData(formattedData);
      
    } catch (error) {
      console.error("Error fetching unsettled sales:", error);
      toast.error('حدث خطأ أثناء تحميل المستحقات');
    }
  };

  useEffect(() => {
    if (centerId) {
      fetchData();
    }
  }, [centerId]);

 // 🔄 تحديث البيانات بذكاء (النسخة النهائية)
// 🔄 تحديث البيانات بذكاء (شامل المنتجات والتقرير)
  useEffect(() => {
    if (!centerId) return;
    
    // 1. المستحقات (المحفظة): بنعوزها دايماً
    fetchUnsettledSales(); 

    // 2. المنتجات: بنعوزها طبعاً في صفحة المتجر
    if (activeTab === 'products') {
        fetchProducts();
        // 👇 الجديد: بنجيب بيانات التقرير كمان عشان لو داس على الزرار يلاقي الأرقام جاهزة
        fetchSalesLog();
        fetchSettlementPackages();
        fetchReturns();
    } 
    // 3. باقي التابات
    else if (activeTab === 'history' || activeTab === 'settlements') {
        fetchSalesLog();
        fetchSettlementPackages();
        fetchReturns();
    }

  }, [activeTab, salesPage, packagesPage, returnsPage, centerId]);// بيتحدث لما تغير التاب أو الصفحات

  // Reset page states when historyView changes
  useEffect(() => {
    setSalesPage(0);
    setPackagesPage(0);
    setReturnsPage(0);
  }, [historyView]);

  
  // --- Search Logic ---
  useEffect(() => {
    if (!showSellModal || !centerId) return; 
    const searchStudents = async () => {
        setIsSearchingStudents(true);
        try {
            let query = supabase
                .from('students')
                .select('id, name, unique_id, enrolled_courses, phone, parent_phone')
                .eq('center_id', centerId) // ← فلترة حسب المركز
                .limit(20); 
            if (studentSearch) {
                query = query.or(`name.ilike.%${studentSearch}%,unique_id.ilike.%${studentSearch}%`);
            } 
            const { data } = await query;
            let finalData = data || [];
            if (productToSell?.course_id) {
                 finalData = finalData.filter(s => s.enrolled_courses && s.enrolled_courses.includes(productToSell.course_id));
            }
            setStudents(finalData);
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ في البحث عن الطلاب');
        } finally {
            setIsSearchingStudents(false);
        }
    };
    const delayDebounce = setTimeout(() => searchStudents(), 300);
    return () => clearTimeout(delayDebounce);
  }, [showSellModal, studentSearch, productToSell, centerId]);

  // --- Logic Helpers ---

// 📊 إحصائيات التقرير الديناميكية (النسخة المتزنة 100% - الكروت تطابق الجدول)
// 📊 إحصائيات التقرير الديناميكية (النسخة الذكية - تدعم التسويات المتأخرة والربح الحقيقي)
const reportStats = useMemo(() => {
    const targetDate = reportDate;
    const targetMonth = reportDate.slice(0, 7);

    // 1. فلترة البيانات الأساسية
    let filteredSales = salesLog.filter(s => 
        reportMode === 'daily' ? s.created_at.startsWith(targetDate) : s.created_at.startsWith(targetMonth)
    );
    let filteredSettlements = settlementPackages.filter(p => 
        reportMode === 'daily' ? p.created_at.startsWith(targetDate) : p.created_at.startsWith(targetMonth)
    );
    let filteredRefunds = returnsLog ? returnsLog.filter(r => 
        reportMode === 'daily' ? r.created_at.startsWith(targetDate) : r.created_at.startsWith(targetMonth)
    ) : [];

    // --- تطبيق الفلاتر المتقدمة ---
    if (reportFilterTeacher) {
        filteredSales = filteredSales.filter(s => s.store_products?.courses?.instructors?.name === reportFilterTeacher || s.store_products?.courses?.instructor === reportFilterTeacher);
        filteredSettlements = filteredSettlements.filter(p => p.store_products?.courses?.instructors?.name === reportFilterTeacher || p.store_products?.courses?.instructor === reportFilterTeacher || p.receiver_name === reportFilterTeacher);
        filteredRefunds = filteredRefunds.filter(r => r.store_products?.courses?.instructors?.name === reportFilterTeacher || r.store_products?.courses?.instructor === reportFilterTeacher);
    }
    if (reportFilterGrade) {
        filteredSales = filteredSales.filter(s => s.store_products?.courses?.grade === reportFilterGrade);
        filteredSettlements = filteredSettlements.filter(p => p.store_products?.courses?.grade === reportFilterGrade);
        filteredRefunds = filteredRefunds.filter(r => r.store_products?.courses?.grade === reportFilterGrade);
    }
    if (reportFilterType) {
        filteredSales = filteredSales.filter(s => s.store_products?.type === reportFilterType);
        filteredSettlements = filteredSettlements.filter(p => p.store_products?.type === reportFilterType);
        filteredRefunds = filteredRefunds.filter(r => r.store_products?.type === reportFilterType);
    }
    if (searchTerm) {
        filteredSales = filteredSales.filter(s => s.store_products?.name?.includes(searchTerm));
        filteredSettlements = filteredSettlements.filter(p => p.store_products?.name?.includes(searchTerm));
        filteredRefunds = filteredRefunds.filter(r => r.store_products?.name?.includes(searchTerm));
    }

    // ==========================================
    // 🧠 المحرك الذكي (حساب الإيراد والالتزام بشكل منفصل)
    // ==========================================
    const grouping = {};
    const getKey = (pId, tName, grade) => `${pId || 'manual'}-${tName}-${grade || 'all'}`;

    // أ) معالجة المبيعات الحالية (المسجلة اليوم)
    filteredSales.forEach(sale => {
        const tName = sale.store_products?.courses?.instructors?.name || sale.store_products?.courses?.instructor || 'غير محدد';
        const pName = sale.store_products?.name || 'منتج';
        const grade = sale.store_products?.courses?.grade || 'عام';
        const key = getKey(sale.product_id, tName, grade);
        
        if (!grouping[key]) grouping[key] = { 
            teacher: tName, 
            product: pName, 
            grade: grade,
            grossRevenue: 0,      // إجمالي الإيراد (سعر البيع) - للمدير
            teacherLiability: 0,  // حصة المدرس (الالتزام)
            paid: 0, 
            count: 0,
            receivers: new Set() 
        };
        
        grouping[key].grossRevenue += (sale.price_sold || sale.store_products?.price || 0);
        grouping[key].teacherLiability += (sale.store_products?.teacher_share || 0);
        grouping[key].count += 1;
        if (sale.store_settlements?.receiver_name) grouping[key].receivers.add(sale.store_settlements.receiver_name);
    });

    // ب) معالجة التسويات (والتعويض الذكي للمبيعات القديمة)
    filteredSettlements.forEach(item => {
        const tName = item.store_products?.courses?.instructors?.name || item.store_products?.courses?.instructor || item.instructor_name || 'غير محدد';
        const pName = item.store_products?.name || 'تسوية يدوية';
        const grade = item.store_products?.courses?.grade || 'عام';
        const key = getKey(item.product_id, tName, grade);

        if (!grouping[key]) grouping[key] = { 
            teacher: tName, 
            product: pName, 
            grade: grade,
            grossRevenue: 0, 
            teacherLiability: 0, 
            paid: 0, 
            count: 0,
            receivers: new Set() 
        };
        
        grouping[key].paid += (item.total_amount || 0);
        if (item.receiver_name) grouping[key].receivers.add(item.receiver_name);

        // 🔥 التعويض السحري: لو مفيش مبيعات مسجلة اليوم، احسب قيمتها من التسوية
        if (grouping[key].grossRevenue === 0) {
            const count = item.total_count || 0;
            grouping[key].count = count; // تحديث العدد للجدول
            
            // 1. تقدير الإيراد (للمدير) = العدد × سعر البيع
            const estimatedRevenue = count * (item.store_products?.price || 0);
            // لو فشل التقدير (منتج محذوف مثلاً)، نفترض الإيراد = المبلغ المدفوع
            grouping[key].grossRevenue += (estimatedRevenue > 0 ? estimatedRevenue : item.total_amount);

            // 2. تقدير الالتزام (للجدول) = العدد × حصة المدرس
            const estimatedLiability = count * (item.store_products?.teacher_share || 0);
            grouping[key].teacherLiability += (estimatedLiability > 0 ? estimatedLiability : item.total_amount);
        }
    });

    // تحويل الـ Grouping لـ Array للجدول
    const settlementsAnalysis = Object.values(grouping).map(item => ({
        ...item,
        receiverDisplay: Array.from(item.receivers).join('، ') || 'المدرس',
        // للجدول: بنعرض "إجمالي المبيعات" كـ (حصة المدرس) عشان دي تسوية، 
        // أو ممكن تعرض (grossRevenue) لو عايز تعرض سعر البيع كله. 
        // هنا هنعرض (grossRevenue) عشان ده الإيراد الكلي اللي حققه البند ده
        salesRevenue: item.grossRevenue 
    })).filter(i => i.paid > 0 || i.grossRevenue > 0).sort((a, b) => b.grossRevenue - a.grossRevenue);

    // ==========================================
    // 💰 الأرقام النهائية (تجميع)
    // ==========================================
    
    // 1. المصروفات والمرتجعات (كاش فعلي خرج)
    const totalPaidOut = filteredSettlements.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
    const totalRefunds = filteredRefunds.reduce((acc, r) => acc + (r.refund_amount || 0), 0);

    // 2. الكاش الفعلي (للخزنة - Accountant View)
    // ده بيجمع الفلوس اللي دخلت الدرج "النهاردة بس"
    const actualCashIn = filteredSales.reduce((acc, s) => acc + (s.price_sold || s.store_products?.price || 0), 0);
    const netCashFlow = actualCashIn - totalPaidOut - totalRefunds; 

    // 3. أداء السنتر (للمدير - Manager View)
    // ده بيجمع الأرقام "المعوضة" (يعني لو تسوية قديمة، بيحسب كأن إيرادها دخل عشان يحسب الربح)
    const totalRevenueAdjusted = settlementsAnalysis.reduce((acc, item) => acc + item.grossRevenue, 0); 
    const totalLiabilityAdjusted = settlementsAnalysis.reduce((acc, item) => acc + item.teacherLiability, 0); 
    
    // صافي الربح التشغيلي = الإيراد المعدل - حصة المدرسين (الالتزام)
    const centerOperatingProfit = totalRevenueAdjusted - totalLiabilityAdjusted; 

    // بيانات الرسم البياني
    const chartData = [
        { name: 'صافي ربح', value: Math.max(0, centerOperatingProfit), fill: '#10b981' },
        { name: 'تكلفة مدرسين', value: totalLiabilityAdjusted, fill: '#6366f1' },
        { name: 'مرتجع', value: totalRefunds, fill: '#f97316' }
    ];

    return { 
        mode: reportMode,
        date: targetDate,
        month: targetMonth,
        settlements: filteredSettlements, 
        sales: filteredSales,
        refunds: filteredRefunds,
        
        totalPaidOut, 
        totalRevenue: totalRevenueAdjusted,    // إجمالي الإيراد (شامل التعويض)
        todayTeacherLiability: totalLiabilityAdjusted, // التزام المدرسين
        totalRefunds,
        totalItemsSold: filteredSales.length,
        
        netCashFlow,           // حركة الخزنة (ممكن سالب)
        centerOperatingProfit, // الربح التشغيلي (موجب بإذن الله)

        settlementsAnalysis,
        chartData 
    };
}, [settlementPackages, salesLog, returnsLog, reportDate, reportMode, reportFilterTeacher, reportFilterGrade, reportFilterType, searchTerm]);
 // 📅 إحصائيات مفصلة لتقرير الوردية
// 📅 إحصائيات مفصلة لتقرير الوردية (نسخة مصححة)
  const todayStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]; // تاريخ اليوم

    // 1. المصروفات (التسويات اللي خرجت النهاردة)
    const settlementsToday = settlementPackages.filter(p => p.created_at.startsWith(todayStr));
    const totalPaidOut = settlementsToday.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

    // 2. الإيرادات (المبيعات اللي دخلت النهاردة)
    const salesToday = salesLog.filter(s => s.created_at.startsWith(todayStr));
    
    // 👇👇 التعديل هنا: غيرنا s.price لـ s.price_sold 👇👇
    const totalRevenue = salesToday.reduce((acc, s) => {
        // بنحاول نجيب سعر البيع المسجل، لو مش موجود نجيب السعر الأصلي للمنتج
        const salePrice = s.price_sold || s.store_products?.price || 0;
        return acc + salePrice;
    }, 0);

    const totalItemsSold = salesToday.length;

    // 3. الصافي الفعلي
    const netCash = totalRevenue - totalPaidOut;

    return { 
        date: todayStr,
        settlementsToday, 
        totalPaidOut, 
        salesToday, 
        totalRevenue, 
        totalItemsSold,
        netCash 
    };
  }, [settlementPackages, salesLog]);

  // 💼 تجميع المستحقات (محفظة المدرسين)
  // هذا الكود يجمع البيوعات المتفرقة في "كارت واحد" لكل مدرس
// 💼 تجميع المستحقات (محفظة المدرسين) - معدلة لإضافة الصف الدراسي
  const groupedSettlements = useMemo(() => {
    const groups = {};
    
    unsettledData.forEach(item => {
        // اسم المدرس
        const teacherName = item.instructor_name || item.store_products?.courses?.instructors?.name || item.store_products?.courses?.instructor || 'السنتر (عام)';
        
        if (!groups[teacherName]) {
            groups[teacherName] = { instructor: teacherName, totalOwed: 0, items: [] };
        }
        
        const productId = item.product_id || item.store_products?.id;
        const existingProduct = groups[teacherName].items.find(i => i.product_id === productId);
        
        // 👇👇 هنا التعديل: سحبنا الصف الدراسي من البيانات 👇👇
        // لو مش موجود في item مباشرة، بنجيبه من store_products -> courses -> grade
        const grade = item.grade || item.store_products?.courses?.grade || 'عام';

        const itemQty = item.sales_count || item.quantity || 1;
        const itemTeacherShare = item.teacher_share || item.store_products?.teacher_share || 0;
        const currentOwed = item.total_owed || (itemTeacherShare * itemQty);

        if (existingProduct) {
            existingProduct.sales_count += itemQty;
            existingProduct.total_owed += currentOwed;
            if (item.id) existingProduct.sales_ids.push(item.id);
        } else {
            groups[teacherName].items.push({
                product_id: productId,
                product_name: item.product_name || item.store_products?.name,
                
                // 👇 حفظنا الصف هنا عشان نعرضه
                grade: grade, 
                
                sales_count: itemQty,
                total_owed: currentOwed,
                teacher_share: itemTeacherShare,
                sales_ids: item.id ? [item.id] : []
            });
        }

        groups[teacherName].totalOwed += currentOwed;
    });

    return Object.values(groups);
  }, [unsettledData]);

  // 🧠 ذكاء المخزن: تحليل المنتجات الحالية
  const inventoryStats = useMemo(() => {
    // تصفية المنتجات النشطة فقط (مش المؤرشفة)
    const activeProducts = products.filter(p => !p.is_archived);

    // 1. القيمة السوقية للمخزون الحالي (سعر البيع × العدد المتاح)
    const totalValue = activeProducts.reduce((acc, item) => acc + (item.price * item.stock), 0);

    // 2. منتجات وشيكة النفاذ (أقل من 5 قطع)
    const lowStockCount = activeProducts.filter(p => p.stock <= 5 && p.stock > 0).length;

    // 3. منتجات نفذت بالفعل (صفر)
    const outOfStockCount = activeProducts.filter(p => p.stock === 0).length;

    return { totalValue, lowStockCount, outOfStockCount, totalItems: activeProducts.length };
  }, [products]);

  const filteredFormCourses = useMemo(() => {
    console.log("🔍 [FILTERED COURSES] Filtering courses:", {
      grade: formData.grade,
      allCourses: coursesList,
      coursesCount: coursesList.length
    });
    
    if (!formData.grade) {
      console.log("❌ [FILTERED COURSES] No grade selected, returning empty");
      return [];
    }
    
    const filtered = coursesList.filter(c => c.grade?.trim() === formData.grade?.trim());
    console.log("✅ [FILTERED COURSES] Filtered result:", {
      filteredCourses: filtered,
      count: filtered.length,
      comparing: {
        selectedGrade: formData.grade.trim(),
        courseGrades: coursesList.map(c => c.grade)
      }
    });
    
    return filtered;
  }, [coursesList, formData.grade]);

  const filteredSearchCourses = useMemo(() => {
    if (!selectedGrade) return coursesList;
    return coursesList.filter(c => c.grade === selectedGrade.trim());
  }, [coursesList, selectedGrade]);

  // 🧠 فلترة كروت التسويات بناءً على المدخلات
// 🧠 فلترة كروت التسويات بناءً على المدخلات
  const filteredSettlements = useMemo(() => {
    return groupedSettlements.filter(group => {
        // 1. فلتر المدرس (من القائمة العلوية)
        const matchesTeacher = settlementTeacher ? group.instructor === settlementTeacher : true;

        // 2. فلتر الصف (لو أي منتج جوه الكارت تبع الصف ده)
        const matchesGrade = settlementGrade 
            ? group.items.some(item => item.grade === settlementGrade) 
            : true;

        // 3. بحث النص (اسم المدرس أو اسم أي منتج جوه الكارت)
        const matchesSearch = settlementSearch
            ? group.instructor.toLowerCase().includes(settlementSearch.toLowerCase()) ||
              group.items.some(item => item.product_name.toLowerCase().includes(settlementSearch.toLowerCase()))
            : true;

        return matchesTeacher && matchesGrade && matchesSearch;
    });
  }, [groupedSettlements, settlementSearch, settlementGrade, settlementTeacher]);

  
  // ✅ التعديل: الاعتماد على groupedSettlements لأن البيانات فيها جاهزة ومنظمة
  const availableSettlementTeachers = useMemo(() => {
      // لو مفيش بيانات تسويات أصلاً
      if (!groupedSettlements || groupedSettlements.length === 0) return [];

      let filteredGroups = groupedSettlements;

      // لو تم اختيار صف، هات المدرسين اللي عندهم *أي منتج* تبع الصف ده
      if (settlementGrade) {
          filteredGroups = filteredGroups.filter(group => 
              group.items.some(item => item.grade === settlementGrade)
          );
      }

      // استخراج أسماء المدرسين
      const teachers = filteredGroups.map(group => group.instructor);
      
      return teachers.sort(); // ترتيب أبجدي
  }, [groupedSettlements, settlementGrade]);

 
  // 📊 حساب الموقف المالي الحالي (للمبيعات غير المسواة)
  const liveFinancials = useMemo(() => {
    let totalCashInDrawer = 0; // الفلوس اللي في الدرج فعلياً
    let totalDebtToTeachers = 0; // فلوس المدرسين (أمانة)
    let totalExpectedProfit = 0; // ربح السنتر المتوقع

    // بنحسب بس من الحاجات اللي لسه متسلمتش (unsettledData)
    unsettledData.forEach(item => {
        const product = item.store_products;
        if (product) {
            const price = product.price || 0;
            const tShare = product.teacher_share || 0;
            
            totalCashInDrawer += price;
            totalDebtToTeachers += tShare;
            totalExpectedProfit += (price - tShare);
        }
    });

    return { totalCashInDrawer, totalDebtToTeachers, totalExpectedProfit };
  }, [unsettledData]);

   const salesStats = useMemo(() => {
     let totalRevenue = 0;
     let totalTeacherShare = 0;
     let totalCenterProfit = 0;
     salesLog.forEach(sale => {
         const price = sale.price_sold || 0;
         const teacherShare = sale.store_products?.teacher_share || 0;
         totalRevenue += price;
         totalTeacherShare += teacherShare;
         totalCenterProfit += (price - teacherShare);
     });
     return { totalRevenue, totalTeacherShare, totalCenterProfit };
  }, [salesLog]);

  // 🧠 قوائم الفلترة الذكية للسجل (تعتمد على الصف المختار)
  const historyFilteredOptions = useMemo(() => {
    // 1. نبدأ بكل عمليات البيع الموجودة
    let relevantSales = salesLog;

    // 2. لو اخترنا صف، نصفي العمليات على الصف ده بس
    if (historyFilter.grade) {
        const g = historyFilter.grade.trim();
        relevantSales = relevantSales.filter(item => {
            const pGrade = item.store_products?.grade; 
            const cGrade = item.store_products?.courses?.grade;
            return (pGrade && pGrade.includes(g)) || (cGrade && cGrade.includes(g));
        });
    }

    // 3. استخراج المدرسين المتاحين في هذه المجموعة المصفاة
    const teachers = [...new Set(relevantSales.map(item => {
        return item.store_products?.teacher_name || 
               item.store_products?.courses?.instructor || 
               item.store_products?.courses?.instructors?.name;
    }).filter(Boolean))].sort();

    // 4. استخراج المواد المتاحة في هذه المجموعة المصفاة
    const courses = [...new Set(relevantSales.map(item => {
        return item.store_products?.courses?.name;
    }).filter(Boolean))].sort();

    return { teachers, courses };
  }, [salesLog, historyFilter.grade]);

// 📋 قوائم ذكية لفلترة التقرير (تصفية هرمية متسلسلة)
// 📋 قوائم ذكية مفلترة هرمياً (تدمج النشط مع التاريخ وتستبعد المؤرشف غير المستخدم)
  const reportLists = useMemo(() => {
    // 1. تجميع "كل المنتجات ذات الصلة":
    // بنآخد المنتجات النشطة حالياً + أي منتج (حتى لو مؤرشف) ظهر في سجلات المبيعات أو التسويات
    const activeProducts = products.filter(p => !p.is_archived);
    
    const historyProducts = [
        ...salesLog.map(s => s.store_products),
        ...settlementPackages.map(p => p.store_products)
    ].filter(Boolean);

    // دمج المجموعتين وإزالة التكرار بناءً على الـ ID لضمان عدم تكرار الخيارات
    const combinedPool = [...activeProducts, ...historyProducts];
    const uniquePool = Array.from(new Map(combinedPool.map(p => [p.id, p])).values());

    // --- بناء الهرم المصفى (Cascading Logic) ---

    // 1. قائمة المدرسين: تظهر مدرسي الصف المختار (من المنتجات المتاحة في Pool)
    let fTeachers = uniquePool;
    if (reportFilterGrade) {
        fTeachers = fTeachers.filter(p => p.courses?.grade === reportFilterGrade);
    }
    const teacherList = [...new Set(fTeachers.map(p => p.courses?.instructors?.name || p.courses?.instructor).filter(Boolean))].sort();

    // 2. قائمة الأنواع: تظهر الأنواع المتاحة لهذا "الصف" و "المدرس" المختارين
    let fTypes = fTeachers;
    if (reportFilterTeacher) {
        fTypes = fTypes.filter(p => p.courses?.instructors?.name === reportFilterTeacher || p.courses?.instructor === reportFilterTeacher);
    }
    const typeList = [...new Set(fTypes.map(p => p.type).filter(Boolean))].sort();

    // 3. قائمة المنتجات: تظهر أسماء المنتجات المطابقة لكل الفلاتر السابقة
    let fProducts = fTypes;
    if (reportFilterType) {
        fProducts = fProducts.filter(p => p.type === reportFilterType);
    }
    const productList = [...new Set(fProducts.map(p => p.name).filter(Boolean))].sort();

    return { teacherList, typeList, productList };
    
    // الاعتماديات: تتحدث القوائم عند تغيير أي فلتر أو عند تحديث داتا المبيعات/المخزن
  }, [products, salesLog, settlementPackages, reportFilterGrade, reportFilterTeacher, reportFilterType]);


  // --- Actions ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); 
    const loadingToast = toast.loading('جاري الحفظ...');
    try {
        const payload = {
            name: formData.name,
            type: formData.type,
            price: parseFloat(formData.price),
            teacher_share: parseFloat(formData.teacher_share),
            stock: parseInt(formData.stock),
            course_id: formData.course_id || null,
            supplier_name: formData.supplier_name,
            receiver_name: formData.receiver_name,
            received_date: formData.received_date,
            center_id: centerId // ← إضافة center_id
        };
        if (isEditing) {
            const { error } = await supabase
                .from('store_products')
                .update(payload)
                .eq('id', editId)
                .eq('center_id', centerId); // ← فلترة حسب المركز
            if (error) throw error;

            // 🕵️ سجل التدقيق (Audit Log)
            await supabase.from('audit_logs').insert({
                table_name: 'store_products',
                record_id: editId,
                action: 'UPDATE',
                user_id: user?.id,
                center_id: centerId,
                new_data: { details: `تعديل بيانات المنتج: ${payload.name}`, ...payload }
            });

            toast.success('تم التعديل بنجاح', { id: loadingToast });
        } else {
            const { data: newProd, error } = await supabase
                .from('store_products')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;

            // 🕵️ سجل التدقيق (Audit Log)
            await supabase.from('audit_logs').insert({
                table_name: 'store_products',
                record_id: newProd?.id,
                action: 'INSERT',
                user_id: user?.id,
                center_id: centerId,
                new_data: { details: `إضافة منتج جديد للمخزن: ${payload.name}`, ...payload }
            });

            toast.success('تمت الإضافة بنجاح', { id: loadingToast });
        }
        resetForm();
        setShowProductModal(false);
        fetchData();
    } catch (error) {
        toast.error('حدث خطأ: ' + error.message, { id: loadingToast });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    const product = products.find(p => p.id === id);
    const loadingToast = toast.loading('جاري الحذف...');

    // 🕵️ سجل التدقيق (Audit Log)
    await supabase.from('audit_logs').insert({
        table_name: 'store_products',
        record_id: id,
        action: 'DELETE',
        user_id: user?.id,
        center_id: centerId,
        old_data: product,
        new_data: { details: `حذف منتج من المخزن: ${product?.name || 'مجهول'}` }
    });

    const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', id)
        .eq('center_id', centerId); // ← فلترة حسب المركز
    if (error) {
        toast.error('فشل الحذف', { id: loadingToast });
    } else {
        toast.success('تم الحذف', { id: loadingToast });
        fetchData();
    }
  };

  const openSellModal = (product) => {
    if (product.stock <= 0) return toast.error('نفذت الكمية!');
    setProductToSell(product);
    setStudentSearch('');
    setStudents([]); 
    setShowSellModal(true);
  };

  // 🔥🔥🔥 الحل النهائي للطباعة والـ Cancel 🔥🔥🔥
  const handlePrintReceipt = (data) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none'; // مخفي تماماً
    document.body.appendChild(iframe);

    const content = `
      <html>
        <head>
          <title>إيصال استلام</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; text-align: center; width: 80mm; margin: 0 auto; padding: 10px; }
            h2 { font-size: 18px; margin: 0; font-weight: 900; }
            p { margin: 5px 0; font-size: 12px; }
            .divider { border-bottom: 2px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin: 5px 0; }
            .total { font-size: 20px; font-weight: 900; margin-top: 10px; }
            .footer { font-size: 10px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <h2>${centerName}</h2>
          <p>إيصال استلام نقدية</p>
          <div class="divider"></div>
          
          <div class="row"><span>التاريخ:</span><span>${data.date}</span></div>
          <div class="row"><span>الطالب:</span><span>${data.studentName}</span></div>
          
          <div class="divider"></div>
          
          <div class="row">
            <span>${data.productName}</span>
            <span>${data.price} ج.م</span>
          </div>

          <div class="divider"></div>
          
          <div class="total">الإجمالي: ${data.price} ج.م</div>
          
          <div class="footer">
            شكراً لتعاملكم معنا!<br/>
            Ref: ${String(data.id).slice(0,8)}
          </div>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();

    // ننتظر تحميل المحتوى داخل الـ iframe
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // 🔥 هنا السر: بنستخدم onafterprint عشان نحذف الـ iframe فقط بعد غلق النافذة (سواء طباعة أو Cancel)
        // ده بيمنع أي أخطاء أو اختفاء للصفحة
        iframe.contentWindow.onafterprint = function() {
            document.body.removeChild(iframe);
            // نرجع التركيز للصفحة الرئيسية عشان تجربة المستخدم
            window.focus();
        };
    }, 500);
  };


  const sendWhatsAppReceipt = async (student, product, saleId) => {
      const targetPhone = student.parent_phone || student.phone;
      if (targetPhone) {
          let phone = targetPhone.replace(/\D/g, '');
          if (phone.startsWith('01')) phone = '20' + phone.substring(1);
          const msg = `مرحباً ولي أمر الطالب/ة ${student.name} 🎓\nتم شراء: ${product.name}\nالسعر: ${product.price} ج.م\nتاريخ العملية: ${new Date().toLocaleDateString('ar-EG')}\n\nشكراً لثقتكم بنا.`;
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
      if (saleId) {
          await supabase
              .from('store_sales')
              .update({ whatsapp_sent_at: new Date().toISOString(), whatsapp_sent_to: 'parent' })
              .eq('id', saleId)
              .eq('center_id', centerId); // ← فلترة حسب المركز
      }
  };

  // 🔥 CONFIRM SALE
  const confirmSale = async (student) => {
    if (isSubmitting) return; 

    // ✅ التأكيد
    if (!confirm(`تأكيد بيع "${productToSell.name}" للطالب ${student.name}؟`)) return;

    const loadingToast = toast.loading('جاري تسجيل البيع...');
    try {
      setIsSubmitting(true);

      // Temporary solution: Use direct insert instead of RPC
      const { data: saleId, error } = await supabase
        .from('store_sales')
        .insert({
          center_id: centerId,
          product_id: productToSell.id,
          student_id: student.id,
          price_sold: productToSell.price,
          seller_name: currentUserName || 'Admin',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      // 🕵️ سجل التدقيق (Audit Log)
      await supabase.from('audit_logs').insert({
          table_name: 'store_sales',
          record_id: saleId.id,
          action: 'INSERT',
          user_id: user?.id,
          center_id: centerId,
          new_data: { 
              details: `بيع منتج للطالب: ${student.name}`,
              product: productToSell.name,
              price: productToSell.price
          }
      });

      // Update product stock - get current stock first
      const { data: currentProduct } = await supabase
        .from('store_products')
        .select('stock')
        .eq('id', productToSell.id)
        .single();

      const newStock = (currentProduct?.stock || 0) - 1;
      
      const { error: stockError } = await supabase
        .from('store_products')
        .update({ 
          stock: newStock
        })
        .eq('id', productToSell.id);

      if (stockError) {
        console.error('Stock update error:', stockError);
        toast.error('تم البيع ولكن حدث خطأ في تحديث المخزون');
      }

      // ✅ رسالة النجاح تظهر فوراً قبل الطباعة
      toast.success('تم البيع بنجاح! 🎉', { id: loadingToast });

      // ✅ الطباعة في الخلفية (مش هتأثر على الصفحة)
      if (isPrintEnabled) {
        handlePrintReceipt({
            studentName: student.name,
            productName: productToSell.name,
            price: productToSell.price,
            date: new Date().toLocaleString('ar-EG'),
            id: saleId
        });
      }

      // تأخير بسيط لرسالة الواتساب عشان متظهرش فوق الطباعة مباشرة لو المتصفح بطيء
      setTimeout(() => {
        const askWhatsapp = confirm('إرسال إيصال واتساب؟ 📱');
        if (askWhatsapp) {
            sendWhatsAppReceipt(student, productToSell, saleId);
        }
      }, 1000);

      setShowSellModal(false);
      // ✅ تحديث كل البيانات لضمان ظهور الإحصائيات فوراً
      await Promise.all([
          fetchProducts(),
          fetchDailySalesStats(reportDate),
          fetchSalesLog(),
          fetchUnsettledSales()
      ]);
      
    } catch (error) {
      toast.error('خطأ: ' + error.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 MANUAL SALE
  const handleManualSale = async () => {
    if (isSubmitting) return;
    if (!confirm(`بيع نسخة (بدون طالب)؟`)) return;
    
    const loadingToast = toast.loading('جاري البيع...');
    try {
        setIsSubmitting(true);
        // Temporary solution: Use direct insert instead of RPC
        const { data: manualSale, error } = await supabase
          .from('store_sales')
          .insert({
            center_id: centerId,
            product_id: productToSell.id,
            student_id: null,
            price_sold: productToSell.price,
            seller_name: currentUserName || 'بيع يدوي',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) throw error;

        // 🕵️ سجل التدقيق (Audit Log)
        await supabase.from('audit_logs').insert({
            table_name: 'store_sales',
            record_id: manualSale?.id,
            action: 'INSERT',
            user_id: user?.id,
            center_id: centerId,
            new_data: { 
                details: `بيع منتج يدوي (خارجي): ${productToSell.name}`,
                price: productToSell.price
            }
        });

        // Update product stock - get current stock first
        const { data: currentProduct } = await supabase
          .from('store_products')
          .select('stock')
          .eq('id', productToSell.id)
          .single();

        const newStock = (currentProduct?.stock || 0) - 1;
        
        const { error: stockError } = await supabase
          .from('store_products')
          .update({ 
            stock: newStock
          })
          .eq('id', productToSell.id);

        if (stockError) {
          console.error('Stock update error:', stockError);
          toast.error('تم البيع ولكن حدث خطأ في تحديث المخزون');
        }

        // ✅ رسالة النجاح فوراً
        toast.success('تم البيع (بدون طالب) ✅', { id: loadingToast });
        
        // ✅ الطباعة في الخلفية
        if (isPrintEnabled) {
          handlePrintReceipt({
              studentName: 'عميل نقدي (خارجي)',
              productName: productToSell.name,
              price: productToSell.price,
              date: new Date().toLocaleString('ar-EG'),
              id: 'Manual'
          });
        }

        setShowSellModal(false);
        // ✅ تحديث كل البيانات لضمان ظهور الإحصائيات فوراً
        await Promise.all([
            fetchProducts(),
            fetchDailySalesStats(reportDate),
            fetchSalesLog(),
            fetchUnsettledSales()
        ]);
    } catch (error) {
        toast.error('خطأ: ' + error.message, { id: loadingToast });
    } finally {
        setIsSubmitting(false);
    }
  };



  // SETTLE
// SETTLE: دالة التسوية (تفتح مودال المعاينة)
// SETTLE: دالة التسوية النهائية (بتربط التسوية بالمبيعات عشان متظهرش مرتجع)
const handleSettleSubmit = async () => {
    // 1. التحقق
    if (!settlementData.receiver_name) return toast.error('يرجى إدخال اسم المستلم');
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const loadingToast = toast.loading('جاري تسجيل التسوية...');
    
    try {
        // 2. الحفظ في الداتابيز (بنجيب الـ ID عشان نربطه)
        const { data: insertedSettlement, error } = await supabase.from('store_settlements').insert([{
            total_amount: settleItem.total_owed,
            total_count: settleItem.sales_count,
            receiver_name: settlementData.receiver_name,
            receiver_role: settlementData.receiver_role,
            notes: settlementData.notes,
            admin_name: currentUserName,
            product_id: settleItem.product_id,
            center_id: centerId // ← إضافة center_id
        }])
        .select() // 👈 رجعنا دي عشان نجيب البيانات
        .single(); // 👈 ورجعنا دي عشان نجيب الـ ID
        
        if (error) throw error;

        // 🕵️ سجل التدقيق (Audit Log)
        await supabase.from('audit_logs').insert({
            table_name: 'store_settlements',
            record_id: insertedSettlement?.id,
            action: 'INSERT',
            user_id: user?.id,
            center_id: centerId,
            new_data: { 
                details: `تسوية مالية للمدرس: ${settleItem.instructor}`,
                product: settleItem.product_name,
                total: settleItem.total_owed,
                receiver: settlementData.receiver_name
            }
        });
        
        // 3. تحديث المبيعات (الربط برقم التسوية عشان الجدول يفهم إنها مش مرتجع)
        // ⚠️ هنا السر: بنحط settlement_id اللي راجع من الخطوة اللي فاتت
        await supabase.from('store_sales')
            .update({ 
                is_settled: true, 
                settlement_id: insertedSettlement.id // ✅ ده اللي هيخليها تظهر "تم التحاسب"
            }) 
            .eq('product_id', settleItem.product_id)
            .eq('is_settled', false)
            .eq('center_id', centerId); // ← فلترة حسب المركز
        
        toast.success('تمت التسوية بنجاح', { id: loadingToast });

        // 4. تجهيز بيانات الإيصال للمودال
        setSettlementReceiptModalData({
            id: insertedSettlement.id, // الرقم الحقيقي من الداتابيز
            date: new Date().toLocaleDateString('ar-EG'),
            time: new Date().toLocaleTimeString('ar-EG'),
            
            receiver_name: settlementData.receiver_name,
            receiver_role: settlementData.receiver_role,
            instructor_name: settleItem.instructors?.name || settleItem.instructor || 'السنتر', 
            
            product_name: settleItem.product_name,
            product_type: settleItem.type || 'note',
            grade: settleItem.grade,
            
            total_amount: settleItem.total_owed,
            total_count: settleItem.sales_count,
            teacher_share: settleItem.teacher_share,
            
            notes: settlementData.notes,
            admin_name: currentUserName
        });

        setShowSettleModal(false);
        setShowSettlementReceiptModal(true);
        
        // تنظيف وتحديث
        setSettleItem(null);
        setSettlementData({ receiver_name: '', receiver_role: 'Teacher', notes: '' });
        fetchUnsettledSales();
        fetchSalesLog(); 
        fetchSettlementPackages(); 
        fetchReturns();
        fetchDailySalesStats(reportDate); // ✅ تحديث الإحصائيات بعد التسوية

    } catch (error) {
        console.error("❌ Error settling:", error);
        toast.error('خطأ: ' + (error.message || 'تأكد من تفعيل سياسات الأمان (RLS)'), { id: loadingToast });
    } finally {
        setIsSubmitting(false);
    }
};

  const resetForm = () => {
    setFormData({ 
      name: '', type: 'note', price: '', teacher_share: '', stock: '', grade: '', course_id: '',
      supplier_name: '', receiver_name: '', received_date: new Date().toISOString().split('T')[0]
    });
    setIsEditing(false);
    setEditId(null);
  };

  // 🖨️ دالة إعادة طباعة إيصال التسوية من السجل
  const handleReprintSettlement = (pack) => {
    setSettlementReceiptModalData({
      id: pack.id,
      date: new Date(pack.created_at).toLocaleDateString('ar-EG'),
      time: new Date(pack.created_at).toLocaleTimeString('ar-EG'),
      
      receiver_name: pack.receiver_name,
      receiver_role: pack.receiver_role,
      instructor_name: pack.store_products?.courses?.instructors?.name || pack.store_products?.courses?.instructor || 'السنتر',
      
      product_name: pack.store_products?.name,
      product_type: pack.store_products?.type || 'note',
      grade: pack.store_products?.courses?.grade || 'عام',
      
      total_amount: pack.total_amount,
      total_count: pack.total_count,
      // بنحسب نصيب الفرد بقسمة الإجمالي على العدد (عشان يكون دقيق حسب وقتها)
      teacher_share: pack.total_count > 0 ? (pack.total_amount / pack.total_count) : 0,
      
      notes: pack.notes,
      admin_name: pack.admin_name
    });
    setShowSettlementReceiptModal(true);
  };

  // ↩️ Refund Functions
  const handleRefundSale = (sale) => {
    // لو تم التسوية، نرجع من حساب السنتر (مش المدرس)
    const isSettled = sale.is_settled && !sale.notes?.includes('مرجع:');
    
    setRefundData({
      sale_id: sale.id,
      product_id: sale.product_id,
      quantity: 1,
      refund_amount: sale.price_sold,
      reason: '',
      is_damaged: false,
      refund_method: isSettled ? 'center_account' : 'cash', // ← تغيير
      settlement_id: sale.settlement_id,
      receiver_name: sale.store_settlements?.receiver_name
    });
    setShowRefundModal(true);
  };

  const handleRefundSubmit = async () => {
    if (!refundData.reason.trim()) return toast.error('يرجى إدخال سبب الإرجاع');
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const loadingToast = toast.loading('جاري تسجيل الإرجاع...');
    
    try {
      // 1. تسجيل الإرجاع
      let refundResult;
      try {
        refundResult = await supabase.from('store_returns').insert([{
          original_sale_id: refundData.sale_id,
          product_id: refundData.product_id,
          quantity: refundData.quantity,
          refund_amount: refundData.refund_amount,
          reason: refundData.reason,
          is_damaged: refundData.is_damaged,
          refund_method: refundData.refund_method,
          created_by: (await supabase.auth.getUser()).data.user.id,
          admin_name: currentUserName,
          center_id: centerId // ← إضافة center_id
        }]);
      } catch (insertError) {
        console.error('❌ Insert Error:', insertError);
        throw new Error('فشل تسجيل الإرجاع في الداتابيز: ' + insertError.message);
      }
      
      if (refundResult.error) throw refundResult.error;
      
      // 2. تحديث حالة البيع
      let updateResult;
      try {
        updateResult = await supabase
          .from('store_sales')
          .update({ 
            is_settled: true,
            settlement_id: null
          })
          .eq('id', refundData.sale_id)
          .eq('center_id', centerId); // ← فلترة حسب المركز
      } catch (updateError) {
        console.error('❌ Update Error:', updateError);
        throw new Error('فشل تحديث حالة البيع: ' + updateError.message);
      }
      
      if (updateResult.error) throw updateResult.error;
      
      // 3. لو الإرجاع من حساب السنتر، نعمل مصروفة
      if (refundData.refund_method === 'center_account' && refundData.settlement_id) {
        try {
          const { error: expenseError } = await supabase.from('expenses').insert([{
            title: `إرجاع منتج - ${refundData.reason}`,
            amount: refundData.refund_amount,
            category: 'مرتجعات',
            created_by: (await supabase.auth.getUser()).data.user.id,
            expense_date: new Date().toISOString().split('T')[0],
            notes: `إرجاع من حساب ${refundData.receiver_name} - ${refundData.reason}`,
            center_id: centerId // ← إضافة center_id
          }]);
          
          if (expenseError) throw expenseError;
          
          toast.success('تم الإرجاع من حساب السنتر (سجل كمصروفة)', { id: loadingToast });
        } catch (expenseError) {
          console.error('❌ Expense Error:', expenseError);
          throw new Error('فشل تسجيل المصروفة: ' + expenseError.message);
        }
      } else {
        toast.success('تم تسجيل الإرجاع بنجاح', { id: loadingToast });
      }
      
      setShowRefundModal(false);
      setRefundData({
        sale_id: null,
        product_id: null,
        quantity: 1,
        refund_amount: 0,
        reason: '',
        is_damaged: false,
        refund_method: 'cash',
        settlement_id: null,
        receiver_name: ''
      });
      
      // 4. تحديث البيانات
      try {
        await Promise.all([
          fetchSalesLog(),
          fetchProducts(), 
          fetchSettlementPackages(),
          fetchReturns(),
          fetchDailySalesStats(reportDate) // ✅ تحديث الإحصائيات بعد المرتجع
        ]);
      } catch (fetchError) {
        console.error('❌ Fetch Error:', fetchError);
        // مش نرمي Error عشان المهم إن الإرجاع اتم
        console.warn('⚠️ Failed to refresh some data, but refund was successful');
      }
    } catch (error) {
      console.error('❌ Error in handleRefundSubmit:', error);
      console.error('❌ Error details:', {
        refundData,
        error: error.message,
        stack: error.stack,
        errorString: JSON.stringify(error, null, 2)
      });
      toast.error('فشل تسجيل الإرجاع: ' + (error.message || 'خطأ غير معروف'), { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    const linkedCourse = courses.find(c => c.id === item.course_id);
    setFormData({
      name: item.name,
      type: item.type,
      price: item.price,
      teacher_share: item.teacher_share,
      stock: item.stock,
      grade: linkedCourse ? linkedCourse.grade : '', 
      course_id: item.course_id,
      supplier_name: item.supplier_name || '',
      receiver_name: item.receiver_name || '',
      received_date: item.received_date || new Date().toISOString().split('T')[0]
    });
    setEditId(item.id);
    setIsEditing(true);
    setShowProductModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    
    // ✅ 2. التعديل: المنتجات العامة تظهر في كل الصفوف
    const productGrade = p.courses?.grade?.trim() || 'عام';
    const selectedGradeTrimmed = selectedGrade?.trim();
    const matchesGrade = !selectedGradeTrimmed || 
                        productGrade === selectedGradeTrimmed || 
                        productGrade === 'عام';
    
    const matchesCourse = !selectedCourse || p.course_id === selectedCourse;

    // 🔥 3. الشرط الجديد: لو الاسم فيه كلمة "(ملغي)" أو "(Archived)" مخفيهوش
    const is_archived = p.name.includes('(ملغي)') || p.name.includes('(Archived)');

    // النتيجة: لازم يطابق الشروط ويكون مش مؤرشف
    return matchesSearch && matchesType && matchesGrade && matchesCourse && !is_archived;
});

  // 🧠 فلترة سجل المبيعات (Sales History Logic)
  const filteredHistorySales = useMemo(() => {
    return salesLog.filter(sale => {
      const product = sale.store_products || {};
      const course = product.courses || {};

      // 1. فلتر الصف
      if (historyFilter.grade && course.grade !== historyFilter.grade) return false;
      // 2. فلتر المدرس
      if (historyFilter.teacher && (course.instructors?.name !== historyFilter.teacher && course.instructor !== historyFilter.teacher)) return false;
      // 3. فلتر الكورس/المادة
      // (بنقارن بالاسم أو الـ ID حسب المتوفر، هنا هنقارن بالاسم للعرض)
      if (historyFilter.course && course.name !== historyFilter.course) return false;
      // 4. فلتر النوع
      if (historyFilter.type && product.type !== historyFilter.type) return false;
      // 5. بحث اسم المنتج
      if (historyFilter.search && !product.name.toLowerCase().includes(historyFilter.search.toLowerCase())) return false;

      return true;
    });
  }, [salesLog, historyFilter]);

  // 🧠 فلترة الباقات (Client-side filtering مثل الملف القديم)
const filteredSettlementPackages = useMemo(() => {
    return settlementPackages.filter(pack => {
      const product = pack.store_products || {};
      const course = product.courses || {};
      
      // ✅ 1. تحديد الصف الفعلي (الأولوية للمنتج ثم الكورس)
      // ده عشان لو المنتج مش مربوط بكورس، بس واخد صف، الفلتر يشوفه
      const actualGrade = product.grade || course.grade || 'عام';
      
      // ✅ 2. تحديد اسم المدرس الفعلي (الأولوية للمنتج ثم الكورس ثم التسوية)
      const actualTeacher = product.teacher_name || course.instructors?.name || course.instructor || pack.instructor_name;

      // --- تطبيق الشروط ---

      // أ) فلتر الصف (بنقارن بالصف الفعلي اللي حسبناه فوق)
      if (historyFilter.grade && actualGrade !== historyFilter.grade) return false;

      // ب) فلتر المدرس (بنقارن بالمدرس الفعلي)
      if (historyFilter.teacher && actualTeacher !== historyFilter.teacher) return false;

      // ج) فلتر المادة
      if (historyFilter.course && course.name !== historyFilter.course) return false;

      // د) فلتر النوع
      if (historyFilter.type && product.type !== historyFilter.type) return false;

      // هـ) بحث الاسم
      if (historyFilter.search && !product.name?.toLowerCase().includes(historyFilter.search.toLowerCase())) return false;
      
      return true;
    });
  }, [settlementPackages, historyFilter]);

  // 🧠 فلترة المرتجعات (Client-side filtering مثل الملف القديم)
  const filteredReturns = useMemo(() => {
    return returnsLog.filter(refund => {
      const product = refund.store_products || {};
      const course = product.courses || {};
      
      // 1. فلتر الصف
      if (historyFilter.grade && course.grade !== historyFilter.grade) return false;
      // 2. فلتر المدرس
      if (historyFilter.teacher && (course.instructors?.name !== historyFilter.teacher && course.instructor !== historyFilter.teacher)) return false;
      // 3. فلتر الكورس/المادة
      if (historyFilter.course && course.name !== historyFilter.course) return false;
      // 4. فلتر النوع
      if (historyFilter.type && product.type !== historyFilter.type) return false;
      // 5. بحث اسم المنتج
      if (historyFilter.search && !product.name?.toLowerCase().includes(historyFilter.search.toLowerCase())) return false;
      
      return true;
    });
  }, [returnsLog, historyFilter]);

  // 📋 استخراج القوائم الفريدة (عشان الـ Dropdowns تكون ذكية وتجيب اللي موجود بس)
  const historyLists = useMemo(() => {
    const products = salesLog.map(s => s.store_products).filter(Boolean);
    
    // المدرسين الموجودين في السجل
    const teachers = [...new Set(products.map(p => p.courses?.instructors?.name || p.courses?.instructor).filter(Boolean))].sort();
    // الكورسات الموجودة في السجل
    const coursesList = [...new Set(products.map(p => p.courses?.name).filter(Boolean))].sort();
    
    return { teachers, coursesList };
  }, [salesLog]);

  

  const getTypeIcon = (type) => {
    switch(type) {
      case 'book': return <FaBook className="text-blue-500" />;
      case 'code': return <FaBarcode className="text-purple-500" />;
      default: return <FaFileAlt className="text-yellow-500" />;
    }
  };
  const getTypeLabel = (type) => {
    switch(type) {
      case 'book': return 'كتاب';
      case 'code': return 'كود';
      default: return 'ملزمة';
    }
  };



  // ==========================================
  // ✂️ منطقة التقسيم (Slice Logic)
  // ==========================================

  // 1. مبيعات: احسب البداية والنهاية بناءً على رقم الصفحة
  const salesToDisplay = filteredHistorySales.slice(
    salesPage * ROWS_PER_PAGE,       // البداية (مثلاً 0)
    (salesPage + 1) * ROWS_PER_PAGE  // النهاية (مثلاً 20)
  );

  // 2. توريد: نفس الكلام
  const packagesToDisplay = filteredSettlementPackages.slice(
    packagesPage * ROWS_PER_PAGE,
    (packagesPage + 1) * ROWS_PER_PAGE
  );

  // 3. مرتجعات: نفس الكلام
  const returnsToDisplay = filteredReturns.slice(
    returnsPage * ROWS_PER_PAGE,
    (returnsPage + 1) * ROWS_PER_PAGE
  );

  // ==========================================

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-10 min-h-screen bg-slate-50/50" dir="rtl">
      <Toaster position="top-center" reverseOrder={false} /> 
      
      {/* ── HEADER & NAVIGATION ── */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                <FaStore className="text-xl md:text-2xl" />
              </div>
              المتجر ونقاط البيع
            </h1>
            <p className="text-slate-400 font-bold mt-2 mr-1 text-xs md:text-sm">إدارة المخزون، المبيعات، والتسويات المالية</p>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] md:text-xs font-black bg-slate-50 px-4 py-2 rounded-xl text-slate-400 border border-slate-100 uppercase tracking-widest">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            نظام المعالجة النشط
          </div>
        </div>

        {/* التابات (Tabs) - Mobile-friendly horizontal scroll */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto no-scrollbar gap-1">
          <button 
            onClick={() => setActiveTab('products')} 
            className={`flex-1 min-w-[140px] py-4 px-6 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'products' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <FaShoppingCart className={activeTab === 'products' ? 'animate-bounce' : ''} />
            المنتجات والبيع
          </button>
          
          <button 
            onClick={() => setActiveTab('settlements')} 
            className={`flex-1 min-w-[140px] py-4 px-6 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'settlements' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <FaHandshake className={activeTab === 'settlements' ? 'animate-pulse' : ''} />
            الخزينة والتسويات
          </button>
          
          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex-1 min-w-[140px] py-4 px-6 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'history' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <FaHistory className={activeTab === 'history' ? 'animate-spin-slow' : ''} />
            سجل العمليات
          </button>
        </div>
      </div>

        {/* 1. Products View */}
  {/* 🛍️ صفحة إدارة المنتجات (المخزن) - النسخة المدمجة الكاملة */}
        {/* 1. Products View */}
        {activeTab === 'products' && (
            <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
                
                {/* 🆕 كرت إحصائيات المبيعات اليومية - Responsive Layout */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-[2.5rem] p-6 md:p-10 text-white shadow-2xl shadow-blue-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32 group-hover:scale-110 transition-transform duration-1000"></div>
                    
                    <div className="relative z-10">
                        <h3 className="text-lg md:text-xl font-black mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                                <FaChartLine className="animate-pulse" />
                            </div>
                            إحصائيات المبيعات اليومية
                        </h3>
                        
                        {isLoadingStats ? (
                            <div className="text-center py-10">
                                <FaSpinner className="animate-spin text-4xl mx-auto mb-4 opacity-50" />
                                <p className="font-bold text-blue-100">جاري تحميل الإحصائيات...</p>
                            </div>
                        ) : dailySalesStats ? (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                                <div className="bg-white/10 hover:bg-white/15 transition-all duration-300 rounded-[1.5rem] p-4 md:p-6 backdrop-blur-md border border-white/10 hover:border-white/20 hover:translate-y-[-2px] group/card">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[10px] md:text-xs font-black text-blue-100 uppercase tracking-widest">إجمالي المبيعات</p>
                                        <FaMoneyBillWave className="text-blue-300/50 group-hover/card:text-blue-300 transition-colors" />
                                    </div>
                                    <p className="text-xl md:text-3xl font-black">{dailySalesStats.total_sales.toLocaleString()} <span className="text-xs opacity-60">ج.م</span></p>
                                </div>

                                <div className="bg-white/10 hover:bg-white/15 transition-all duration-300 rounded-[1.5rem] p-4 md:p-6 backdrop-blur-md border border-white/10 hover:border-white/20 hover:translate-y-[-2px] group/card">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[10px] md:text-xs font-black text-blue-100 uppercase tracking-widest">إجمالي المرتجعات</p>
                                        <FaUndo className="text-orange-300/50 group-hover/card:text-orange-300 transition-colors" />
                                    </div>
                                    <p className="text-xl md:text-3xl font-black">{dailySalesStats.total_refunds.toLocaleString()} <span className="text-xs opacity-60">ج.م</span></p>
                                </div>

                                <div className="bg-emerald-500/20 hover:bg-emerald-500/30 transition-all duration-300 rounded-[1.5rem] p-4 md:p-6 backdrop-blur-xl border border-emerald-400/30 hover:border-emerald-400/50 hover:translate-y-[-4px] shadow-lg shadow-emerald-900/20 group/card relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-full -translate-y-6 translate-x-6"></div>
                                     <div className="flex justify-between items-start mb-3 relative z-10">
                                        <p className="text-[10px] md:text-xs font-black text-emerald-100 uppercase tracking-widest">صافي المبيعات</p>
                                        <FaFileInvoiceDollar className="text-emerald-300/50 group-hover/card:text-emerald-300 transition-colors animate-pulse" />
                                    </div>
                                    <p className="text-xl md:text-3xl font-black text-emerald-100 relative z-10">{dailySalesStats.net_sales.toLocaleString()} <span className="text-xs opacity-60 font-black">ج.م</span></p>
                                </div>

                                <div className="bg-white/10 hover:bg-white/15 transition-all duration-300 rounded-[1.5rem] p-4 md:p-6 backdrop-blur-md border border-white/10 hover:border-white/20 hover:translate-y-[-2px] group/card">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[10px] md:text-xs font-black text-blue-100 uppercase tracking-widest">عدد العمليات</p>
                                        <FaShoppingCart className="text-blue-300/50 group-hover/card:text-blue-300 transition-colors" />
                                    </div>
                                    <p className="text-xl md:text-3xl font-black">{dailySalesStats.sales_count}</p>
                                </div>

                                <div className="bg-white/10 hover:bg-white/15 transition-all duration-300 rounded-[1.5rem] p-4 md:p-6 backdrop-blur-md border border-white/10 hover:border-white/20 hover:translate-y-[-2px] group/card">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[10px] md:text-xs font-black text-blue-100 uppercase tracking-widest">عدد المرتجعات</p>
                                        <FaHistory className="text-orange-300/50 group-hover/card:text-orange-300 transition-colors" />
                                    </div>
                                    <p className="text-xl md:text-3xl font-black">{dailySalesStats.refunds_count}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-white/5 rounded-3xl border border-white/10">
                                <FaExclamationTriangle className="text-3xl text-orange-300 mx-auto mb-3" />
                                <p className="text-white/80 font-bold">لا توجد سجلات مبيعات اليوم</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* شريط التحكم (View Switcher & Actions) */}
                <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-xl md:text-2xl transition-all duration-500 ${showArchived ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 shadow-inner shadow-blue-100'}`}>
                            {showArchived ? <FaHistory className="rotate-negative-45" /> : <FaStore className="animate-in zoom-in" />}
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                                {showArchived ? 'أرشيف المخزن' : 'إدارة المخزون والبيع'}
                            </h2>
                            <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-1 tracking-wide uppercase">
                                {showArchived ? 'المنتجات المنتهية والمؤرشفة' : 'الأصناف المتاحة للبيع الآن'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 relative z-10">
                        {!showArchived && (
                            <button 
                                onClick={() => setShowReportModal(true)} 
                                className="flex-1 md:flex-none h-12 md:h-14 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs md:text-sm hover:translate-y-[-2px] transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-95 group"
                            >
                                <FaPrint className="group-hover:rotate-12 transition-transform" /> 
                                <span>تقرير الوردية</span>
                            </button>
                        )}
                        
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
                            <button 
                                onClick={() => setProductViewMode('grid')} 
                                className={`p-3 rounded-xl transition-all duration-300 ${productViewMode === 'grid' ? 'bg-white shadow-lg shadow-slate-200 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} 
                                title="عرض شبكي"
                            >
                                <FaLayerGroup size={18} />
                            </button>
                            <button 
                                onClick={() => setProductViewMode('list')} 
                                className={`p-3 rounded-xl transition-all duration-300 ${productViewMode === 'list' ? 'bg-white shadow-lg shadow-slate-200 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} 
                                title="عرض قائمة"
                            >
                                <FaList size={18} />
                            </button>
                        </div>

                        <button 
                            onClick={() => setShowArchived(!showArchived)} 
                            className={`flex-1 md:flex-none h-12 md:h-14 flex items-center justify-center gap-3 px-6 rounded-2xl font-black text-xs md:text-sm transition-all active:scale-95 ${showArchived ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
                        >
                            {showArchived ? <FaStore /> : <FaHistory />} 
                            <span>{showArchived ? 'العودة للمخزن' : 'الأرشيف'}</span>
                        </button>
                    </div>
                </div>

                {/* كروت الإحصائيات (Stats Grid) */}
                {!showArchived && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl shadow-slate-200 relative overflow-hidden group">
                                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="relative z-10">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">قيمة المخزن (بيع)</p>
                                    <p className="text-xl md:text-3xl font-black">{inventoryStats.totalValue.toLocaleString()} <span className="text-xs opacity-40">ج.م</span></p>
                                </div>
                            </div>
                            
                            <div className={`p-6 rounded-[2rem] border transition-all duration-500 shadow-sm relative overflow-hidden group ${inventoryStats.lowStockCount > 0 ? 'bg-orange-50/50 border-orange-200' : 'bg-white border-slate-100'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${inventoryStats.lowStockCount > 0 ? 'text-orange-500' : 'text-slate-400'}`}>وشيكة النفاذ</p>
                                <div className="flex items-end justify-between relative z-10">
                                    <p className={`text-xl md:text-3xl font-black ${inventoryStats.lowStockCount > 0 ? 'text-orange-700' : 'text-slate-300'}`}>
                                        {inventoryStats.lowStockCount} <span className="text-xs font-bold opacity-60">صنف</span>
                                    </p>
                                    {inventoryStats.lowStockCount > 0 && <FaExclamationTriangle className="text-orange-400 animate-bounce mb-1" />}
                                </div>
                            </div>

                            <div className={`p-6 rounded-[2rem] border transition-all duration-500 shadow-sm relative overflow-hidden group ${inventoryStats.outOfStockCount > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-100'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${inventoryStats.outOfStockCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>نفذت من المخزن</p>
                                <div className="flex items-end justify-between relative z-10">
                                    <p className={`text-xl md:text-3xl font-black ${inventoryStats.outOfStockCount > 0 ? 'text-red-700' : 'text-slate-300'}`}>
                                        {inventoryStats.outOfStockCount} <span className="text-xs font-bold opacity-60">صنف</span>
                                    </p>
                                    {inventoryStats.outOfStockCount > 0 && <FaTimesCircle className="text-red-400 animate-pulse mb-1" />}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">إجمالي الأصناف</p>
                                <p className="text-xl md:text-3xl font-black text-slate-800">{inventoryStats.totalItems} <span className="text-xs font-bold opacity-40">صنف</span></p>
                            </div>
                        </div>

                        <div className="flex justify-center md:justify-end">
                            <button 
                                onClick={() => { resetForm(); setIsEditing(false); setShowProductModal(true); }} 
                                className="w-full md:w-auto bg-blue-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition-all hover:translate-y-[-2px] active:scale-95 text-sm md:text-base group"
                            >
                                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform">
                                    <FaPlus className="text-xs" />
                                </div>
                                إضافة منتج جديد للمخزن
                            </button>
                        </div>
                    </div>
                )}

                {/* شريط البحث المتقدم (Advanced Filter Bar) */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                    <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <FaSearch size={10} /> تخصيص البحث والفلترة
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <select 
                                value={selectedGrade} 
                                onChange={e => { setSelectedGrade(e.target.value); setSelectedCourse(''); }} 
                                className="w-full h-12 md:h-14 pl-4 pr-10 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none text-xs md:text-sm font-black text-slate-700 transition-all appearance-none"
                            >
                                <option value="">-- كل الصفوف --</option>
                                {stages.map((s, idx) => (
                                    <option key={idx} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                            <FaUserGraduate className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select 
                                value={selectedCourse} 
                                onChange={e => setSelectedCourse(e.target.value)} 
                                className="w-full h-12 md:h-14 pl-4 pr-10 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none text-xs md:text-sm font-black text-slate-700 transition-all appearance-none"
                            >
                                <option value="">-- كل المواد --</option>
                                {filteredSearchCourses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.instructors?.name || c.instructor}</option>)}
                            </select>
                            <FaBook className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
                            {['all', 'note', 'book', 'code'].map(type => (
                                <button 
                                    key={type} 
                                    onClick={() => setFilterType(type)} 
                                    className={`flex-1 rounded-xl text-[10px] font-black transition-all py-3 px-2 ${filterType === type ? 'bg-white shadow-lg shadow-slate-200 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {type === 'all' ? 'الكل' : getTypeLabel(type)}
                                </button>
                            ))}
                        </div>

                        <div className="relative group">
                            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="ابحث عن اسم المنتج..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full h-12 md:h-14 pr-12 pl-4 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none text-xs md:text-sm font-black text-slate-700 transition-all placeholder:text-slate-300" 
                            />
                        </div>
                    </div>
                </div>

                {/* عرض المنتجات (Grid / List) */}
                {productViewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {filteredProducts
                            .filter(p => (showArchived ? p.is_archived === true : p.is_archived !== true))
                            .map(product => (
                            <div key={product.id} className={`bg-white rounded-[2.5rem] shadow-sm border transition-all duration-500 group relative overflow-hidden flex flex-col h-full hover:shadow-xl hover:translate-y-[-4px] ${product.stock <= 5 && !showArchived ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}`}>
                                
                                {/* Badge Type */}
                                <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
                                    <div className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-sm border border-slate-100">
                                         {getTypeIcon(product.type)} {getTypeLabel(product.type)}
                                    </div>
                                    {product.is_archived && (
                                        <div className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest shadow-lg">
                                            مؤرشف 📦
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 pt-14 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-black text-xl text-slate-800 leading-snug flex-1">{product.name}</h3>
                                        <div className="flex gap-1 bg-slate-50 p-1.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-inner">
                                            <button onClick={() => handleToggleArchive(product.id, product.is_archived)} className={`p-2 rounded-xl transition-all ${showArchived ? 'text-emerald-500 hover:bg-emerald-100' : 'text-slate-400 hover:bg-white hover:shadow-sm'}`} title={showArchived ? 'استعادة' : 'أرشفة'}>
                                                {showArchived ? <FaStore size={14}/> : <FaHistory size={14}/>}
                                            </button>
                                            <button onClick={() => handleEdit(product)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-sm rounded-xl transition-all" title="تعديل"><FaEdit size={14}/></button>
                                            <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white hover:shadow-sm rounded-xl transition-all" title="حذف نهائي"><FaTrash size={14}/></button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3 pointer-events-none flex-wrap">
                                        {product.courses ? (
                                            <>
                                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-black">
                                                    📚 {product.courses.name}
                                                </span>
                                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-xl text-[10px] font-black">
                                                    {product.courses.grade}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-[10px] font-black">
                                                عام
                                            </span>
                                        )}
                                    </div>

                                    {/* معلومات التوريد المختصرة */}
                                    <div className="flex items-center gap-2 mb-4 text-[10px] flex-wrap">
                                        {/* المدرس */}
                                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5">
                                            <FaChalkboardTeacher className="text-blue-400" size={10}/>
                                            {product.courses?.instructors?.name || product.courses?.instructor || 'السنتر'}
                                        </span>
                                        
                                        {/* المورد */}
                                        {product.supplier_name && (
                                            <span className="bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-black">
                                                المورد: {product.supplier_name}
                                            </span>
                                        )}
                                        
                                        {/* المستلم */}
                                        {product.receiver_name && (
                                            <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg font-black">
                                                المستلم: {product.receiver_name}
                                            </span>
                                        )}
                                        
                                        {/* تاريخ الاستلام */}
                                        {product.received_date && (
                                            <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg font-black">
                                                📅 {product.received_date}
                                            </span>
                                        )}
                                    </div>

                                    {/* أرقام المخزون والسعر */}
                                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-3xl mb-5 border border-slate-100 relative shadow-inner">
                                        <div className="text-center">
                                            <span className="block text-[8px] text-slate-400 font-black uppercase tracking-tighter mb-1">السعر</span>
                                            <span className="font-black text-blue-600 text-lg md:text-xl">{product.price}<span className="text-[10px] font-bold mr-0.5">ج</span></span>
                                        </div>
                                        <div className="w-px h-8 bg-slate-200/60 my-auto"></div>
                                        <div className="text-center relative">
                                            <span className="block text-[8px] text-slate-400 font-black uppercase tracking-tighter mb-1">المخزون</span>
                                            <span className={`font-black text-lg md:text-xl flex items-center justify-center gap-1 ${product.stock <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>
                                                {product.stock}
                                                {product.stock <= 5 && !product.is_archived && <FaExclamationTriangle className="text-[10px]" />}
                                            </span>
                                        </div>
                                        <div className="w-px h-8 bg-slate-200/60 my-auto"></div>
                                        <div className="text-center">
                                            <span className="block text-[8px] text-slate-400 font-black uppercase tracking-tighter mb-1">المبيعات</span>
                                            <span className="font-black text-emerald-600 text-lg md:text-xl">{product.sold_count || 0}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        {!showArchived ? (
                                            <button 
                                                onClick={() => openSellModal(product)} 
                                                disabled={product.stock <= 0} 
                                                className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-50 relative overflow-hidden group/btn ${product.stock > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200 shadow-none'}`}
                                            >
                                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 pointer-events-none"></div>
                                                <FaShoppingCart className={product.stock > 0 ? 'group-hover/btn:scale-110 transition-transform' : ''} /> 
                                                <span>{product.stock > 0 ? 'بيع للصنف الآن' : 'غير متوفر بالمخزن'}</span>
                                            </button>
                                        ) : (
                                            <div className="w-full py-4 rounded-2xl font-black bg-slate-50 text-slate-400 text-center text-xs border border-dashed border-slate-200 pointer-events-none">
                                                هذا المنتج مؤرشف ولا يمكن بيعه
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-400 font-black text-[10px] md:text-xs uppercase tracking-widest border-b border-slate-100">
                                        <th className="p-6">اسم المنتج</th>
                                        <th className="p-6">تفاصيل التوريد</th> 
                                        <th className="p-6">النوع</th>
                                        <th className="p-6">سعر البيع</th>
                                        <th className="p-6">المخزون</th>
                                        {!showArchived && <th className="p-6 text-center whitespace-nowrap">التحكم</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-xs md:text-sm font-bold text-slate-700">
                                    {filteredProducts
                                        .filter(p => (showArchived ? p.is_archived === true : p.is_archived !== true))
                                        .map(product => (
                                        <tr key={product.id} className="hover:bg-blue-50/50 transition-colors group">
                                            <td className="p-6">
                                                <div className="text-slate-800 font-black text-sm md:text-base">{product.name}</div>
                                                <div className="flex gap-2 mt-1.5">
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg whitespace-nowrap">{product.courses ? product.courses.name : 'عام'}</span>
                                                    {product.courses && <span className="text-[10px] text-blue-400 font-black">({product.courses.grade})</span>}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-[10px] md:text-xs space-y-2">
                                                    <div className="text-blue-600 font-black flex items-center gap-2 whitespace-nowrap shrink-0">
                                                        <FaChalkboardTeacher className="text-blue-300" />
                                                        {product.courses?.instructors?.name || product.courses?.instructor || 'السنتر'}
                                                    </div>
                                                    <div className="text-slate-400 flex items-center gap-2 whitespace-nowrap shrink-0">
                                                        <FaUser className="text-slate-200" />
                                                        {product.receiver_name}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="whitespace-nowrap bg-white border border-slate-100 px-3 py-1 rounded-xl shadow-xs text-[10px] font-black">{getTypeLabel(product.type)}</span>
                                            </td>
                                            <td className="p-6 text-blue-600 font-black text-sm md:text-base whitespace-nowrap">{product.price} <span className="text-[10px] opacity-60">ج.م</span></td>
                                            <td className="p-6">
                                                <span className={`px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap border ${product.stock <= 5 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                                    {product.stock}
                                                </span>
                                            </td>
                                            {!showArchived && (
                                                <td className="p-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => openSellModal(product)} disabled={product.stock <= 0} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95 disabled:opacity-20 disabled:scale-100 whitespace-nowrap">بيع سريع</button>
                                                        <button onClick={() => handleEdit(product)} className="text-slate-400 hover:text-blue-600 p-2 rounded-xl hover:bg-blue-50 transition-all" title="تعديل"><FaEdit/></button>
                                                        <button onClick={() => handleToggleArchive(product.id, false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-50 transition-all" title="أرشفة"><FaHistory/></button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ... (باقي الكود: رسالة لا يوجد منتجات، ومودال الإضافة كما هو) ... */}
                {filteredProducts.filter(p => (showArchived ? p.is_archived === true : p.is_archived !== true)).length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl">
                        <FaStore className="mx-auto text-6xl mb-4 opacity-20"/>
                        <p className="font-bold text-lg">لا توجد منتجات {showArchived ? 'في الأرشيف' : 'مطابقة للبحث'}</p>
                    </div>
                )}

                

                {showProductModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-900/20 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 scrollbar-hide">
                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 sticky top-0 z-20 flex justify-between items-center border-b border-white/5">
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-white/10">
                                        <FaBoxOpen /> إدارة منتجات المخزن
                                    </div>
                                    <h2 className="text-2xl font-black flex items-center gap-3">
                                        {isEditing ? <FaEdit className="text-blue-400" /> : <FaPlus className="text-emerald-400" />} 
                                        {isEditing ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمخزون'}
                                    </h2>
                                </div>
                                <button 
                                    onClick={() => setShowProductModal(false)} 
                                    className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center rounded-2xl transition-all duration-300 backdrop-blur-md group active:scale-90"
                                >
                                    <FaTimes className="group-hover:rotate-90 transition-transform duration-500" size={20}/>
                                </button>
                            </div>
                            <div className="p-8">
                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="lg:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">اسم المنتج بالتفصيل</label>
                                        <input 
                                            type="text" 
                                            placeholder="مثال: ملزمة الفصل الأول - فيزياء" 
                                            required 
                                            value={formData.name} 
                                            onChange={e => setFormData({...formData, name: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all duration-300" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">نوع المنتج</label>
                                        <select 
                                            value={formData.type} 
                                            onChange={e => setFormData({...formData, type: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all duration-300 appearance-none shadow-sm"
                                        >
                                            <option value="note">📄 ملزمة / شيت</option>
                                            <option value="book">📘 كتاب خارجي</option>
                                            <option value="code">🔐 كود منصة (كارت)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">الكمية المتوفرة</label>
                                        <input 
                                            type="number" 
                                            placeholder="العدد" 
                                            required 
                                            value={formData.stock} 
                                            onChange={e => setFormData({...formData, stock: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all duration-300" 
                                        />
                                    </div>
                                    
                                    <div className="md:col-span-2 lg:col-span-2 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">1. اختر الصف الدراسي</label>
                                            <select 
                                                value={formData.grade} 
                                                onChange={e => setFormData({...formData, grade: e.target.value, course_id: ''})} 
                                                className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-black text-slate-700 focus:border-orange-400 transition-colors"
                                            >
                                                <option value="">-- عام --</option>
                                                {stages.map((s, idx) => (
                                                    <option key={idx} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">2. اختر المادة / الكورس</label>
                                            <select 
                                                value={formData.course_id} 
                                                onChange={e => setFormData({...formData, course_id: e.target.value})} 
                                                className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-sm font-black text-slate-700 focus:border-orange-400 transition-colors" 
                                                disabled={!formData.grade}
                                            >
                                                <option value="">-- اختر المادة --</option>
                                                {filteredFormCourses.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} - {c.instructors?.name || c.instructor}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 lg:col-span-2 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">تاريخ الاستلام</label>
                                            <input type="date" value={formData.received_date} onChange={e => setFormData({...formData, received_date: e.target.value})} className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-xs font-black text-slate-700 focus:border-purple-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">اسم المورد</label>
                                            <input type="text" placeholder="المطبعة/المكتبة" value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-xs font-black text-slate-700 focus:border-purple-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">اسم المستلم</label>
                                            <input type="text" placeholder="من استلم؟" value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl outline-none text-xs font-black text-slate-700 focus:border-purple-400" />
                                        </div>
                                    </div>

                                    <div className="lg:col-span-4 bg-slate-100/50 p-8 rounded-[2rem] border-2 border-slate-200/50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">سعر البيع للطالب (ج.م)</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            placeholder="0.00" 
                                                            required 
                                                            value={formData.price} 
                                                            onChange={e => setFormData({...formData, price: e.target.value})} 
                                                            className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl font-black text-2xl text-blue-600 outline-none focus:border-blue-500 transition-all shadow-sm pl-16 text-center" 
                                                        />
                                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300">ج.م</div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">تكلفة المورد / نصيب المدرس</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            placeholder="0.00" 
                                                            required 
                                                            value={formData.teacher_share} 
                                                            onChange={e => setFormData({...formData, teacher_share: e.target.value})} 
                                                            className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl font-black text-2xl text-rose-600 outline-none focus:border-rose-500 transition-all shadow-sm pl-16 text-center" 
                                                        />
                                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300">ج.م</div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center text-center space-y-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">صافي ربح السنتر للقطعة</p>
                                                <div className="text-6xl font-black text-emerald-600 flex items-baseline gap-2">
                                                    {(formData.price - formData.teacher_share) || 0}
                                                    <span className="text-sm opacity-40">ج.م</span>
                                                </div>
                                                <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest mt-2">
                                                    هامش ربح ممتاز ✨
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-4 flex flex-col md:flex-row items-center gap-4 mt-8 pt-8 border-t-2 border-slate-100">
                                        <button 
                                            disabled={isSubmitting} 
                                            className="w-full md:flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-slate-200 active:scale-95"
                                        >
                                            {isSubmitting ? <FaSpinner className="animate-spin text-2xl"/> : <FaSave className="text-2xl" />} 
                                            {isEditing ? 'حفظ تعديلات المنتج' : 'إضافة المنتج للمخزن الآن'}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowProductModal(false)} 
                                            className="w-full md:w-auto bg-slate-100 text-slate-500 font-black px-10 py-5 rounded-2xl hover:bg-slate-200 transition-all duration-300"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
{/* 2. Settlements View (المحفظة المعدلة) */}
        {activeTab === 'settlements' && (
            <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
                
                {/* ── SETTLEMENTS HEADER ── */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[2.5rem] p-6 md:p-10 text-white shadow-2xl shadow-emerald-100 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32 group-hover:scale-110 transition-transform duration-1000"></div>
                    
                    <div className="relative z-10 text-center md:text-right">
                        <h2 className="text-2xl md:text-3xl font-black flex items-center justify-center md:justify-start gap-4 mb-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                                <FaHandshake className="animate-pulse" />
                            </div>
                            محفظة المستحقات المالية
                        </h2>
                        <p className="text-emerald-100 font-bold text-sm md:text-base opacity-80">تجميع تلقائي لمستحقات المدرسين بناءً على المبيعات الحالية</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 relative z-10 w-full md:w-auto">
                        <button 
                            onClick={() => setShowReportModal(true)}
                            className="w-full md:w-auto bg-white text-emerald-700 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all shadow-xl active:scale-95"
                        >
                            <FaPrint /> 
                            <span>تقرير الوردية</span>
                        </button>

                        <div className="w-full md:w-64 bg-emerald-950/30 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 text-center shadow-inner">
                            <p className="text-[10px] text-emerald-200 font-black uppercase tracking-widest mb-1">إجمالي مطلوب دفعه</p>
                            <p className="text-3xl font-black">
                                {unsettledData.reduce((acc, item) => acc + (item.total_owed || 0), 0).toLocaleString()} <span className="text-xs opacity-60">ج.م</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* 🔍 شريط البحث والفلترة المطور */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                    <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <FaSearch size={10} /> تصفية المحفظة حسب الصف والمدرس
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. فلتر الصف */}
                        <div className="relative">
                            <select 
                                value={settlementGrade} 
                                onChange={(e) => {
                                    setSettlementGrade(e.target.value);
                                    setSettlementTeacher('');
                                }} 
                                className="w-full h-12 md:h-14 pl-4 pr-10 bg-slate-50 border-2 border-transparent focus:border-emerald-200 rounded-2xl outline-none text-xs md:text-sm font-black text-slate-700 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">-- كل الصفوف --</option>
                                {stages.map((s, idx) => (
                                    <option key={idx} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                            <FaUserGraduate className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        {/* 2. فلتر المدرس */}
                        <div className="relative">
                            <select 
                                value={settlementTeacher} 
                                onChange={(e) => setSettlementTeacher(e.target.value)} 
                                className="w-full h-12 md:h-14 pl-4 pr-10 bg-slate-50 border-2 border-transparent focus:border-emerald-200 rounded-2xl outline-none text-xs md:text-sm font-black text-slate-700 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">-- {settlementGrade ? 'مدرسين الصف المختار' : 'كل المدرسين'} --</option>
                                {availableSettlementTeachers.map((t, idx) => (
                                    <option key={idx} value={t}>{t}</option>
                                ))}
                            </select>
                            <FaChalkboardTeacher className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        {/* 3. بحث بالاسم */}
                        <div className="relative group">
                            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="بحث باسم المدرس أو المنتج..." 
                                value={settlementSearch} 
                                onChange={(e) => setSettlementSearch(e.target.value)} 
                                className="w-full h-12 md:h-14 pr-12 pl-4 bg-slate-50 border-2 border-transparent focus:border-emerald-200 rounded-2xl outline-none text-xs md:text-sm font-black text-slate-700 transition-all placeholder:text-slate-300" 
                            />
                        </div>
                    </div>
                </div>

                {/* عرض كروت المدرسين المجمعة */}
                <div className="grid grid-cols-1 gap-8">
                    {filteredSettlements.length > 0 ? filteredSettlements.map((group, gIndex) => (
                        <div key={gIndex} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                            {/* رأس الكارت */}
                            <div className="bg-slate-50/50 p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex items-center gap-4 text-center md:text-right flex-col md:flex-row">
                                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-inner shadow-blue-50">
                                        {group.instructor.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl md:text-2xl text-slate-800 tracking-tight">{group.instructor}</h3>
                                        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">له مستحقات عن {group.items.length} أصناف مختلفة</p>
                                    </div>
                                </div>
                                <div className="text-center bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 min-w-[180px]">
                                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-1">إجمالي المحفظة</p>
                                    <p className="text-3xl font-black text-emerald-600">{group.totalOwed.toLocaleString()} <span className="text-xs font-bold text-emerald-400">ج.م</span></p>
                                </div>
                            </div>

                            {/* تفاصيل المنتجات */}
                            <div className="divide-y divide-slate-50">
                                {group.items.map((item, iIndex) => (
                                    <div key={iIndex} className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-slate-50/50 transition">
                                        <div className="flex-1 text-center md:text-right">
                                            <h4 className="font-black text-slate-800 flex items-center justify-center md:justify-start flex-wrap gap-2 text-lg">
                                                <FaBook className="text-blue-400 text-sm"/> 
                                                {item.product_name}
                                                <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-3 py-1 rounded-xl border border-orange-100 uppercase tracking-wider">
                                                    {item.grade}
                                                </span>
                                            </h4>
                                            <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-[10px] md:text-xs text-slate-400 font-bold">
                                                <span className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/50 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                    مبيعات: {item.sales_count}
                                                </span>
                                                <span className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/50 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                                    الربح/النسخة: {item.teacher_share} ج
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center flex-col md:flex-row gap-6 w-full md:w-auto">
                                            <span className="font-black text-2xl text-slate-700 whitespace-nowrap">{item.total_owed.toLocaleString()} ج.م</span>
                                            
                                            <button 
                                                onClick={() => { 
                                                    setSettleItem({ ...item, instructor: group.instructor }); 
                                                    setShowSettleModal(true); 
                                                }}
                                                className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:translate-y-[-2px] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 group"
                                            >
                                                <FaMoneyBillWave className="group-hover:rotate-12 transition-transform" />
                                                تسوية المستحقات ({item.sales_count})
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 shadow-sm">
                            {unsettledData.length === 0 ? (
                                <>
                                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <FaCheckCircle className="text-4xl animate-bounce"/>
                                    </div>
                                    <p className="text-slate-800 text-xl font-black mb-2">المحفظة خالية تماماً!</p>
                                    <p className="text-slate-400 font-bold">تم تسوية جميع مستحقات المدرسين بنجاح 🎉</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FaSearch className="text-4xl"/>
                                    </div>
                                    <p className="text-slate-800 text-xl font-black mb-2">لا توجد نتائج مطابقة</p>
                                    <p className="text-slate-400 font-bold">جرب البحث بكلمات مختلفة أو تغيير الفلاتر</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}


{/* 🧾 مودال معاينة وطباعة إيصال التسوية (A4) - النسخة المحدثة */}
{/* 🧾 مودال معاينة وطباعة إيصال التسوية (A4) - النسخة النهائية (إصلاح الطباعة المزدوجة) */}
{showSettlementReceiptModal && settlementReceiptData && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* رأس المودال */}
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center flex-shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2"><FaPrint/> معاينة إذن الصرف</h2>
                <button onClick={() => setShowSettlementReceiptModal(false)} className="bg-gray-700 hover:bg-red-500 text-white p-2 rounded-lg transition"><FaTimes/></button>
            </div>

            {/* محتوى الإيصال (للمعاينة والطباعة) */}
            <div id="settlement-receipt-print" className="flex-1 overflow-y-auto p-10 bg-gray-100">
                <div className="bg-white mx-auto shadow-lg p-10 max-w-[210mm] min-h-[297mm] relative text-black border border-gray-200">
                    
                    {centerSettings?.logo_url && (
                        <img src={centerSettings.logo_url} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.03] w-2/3 pointer-events-none" alt="" />
                    )}

                    {/* الهيدر */}
                    <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
                        <div>
                            <h1 className="text-4xl font-black text-gray-800 mb-2">{centerSettings?.center_name || 'Smart Center'}</h1>
                            <p className="text-gray-500 font-bold text-lg tracking-wide">إذن صرف نقدية (تسوية مستحقات)</p>
                            <p className="text-xs text-gray-400 mt-1 font-mono font-bold">REF: SET-{settlementReceiptData.id}</p>
                        </div>
                        <div className="text-left">
                            {centerSettings?.logo_url && <img src={centerSettings.logo_url} className="h-20 object-contain mb-2 ml-auto" alt="Logo" />}
                            <p className="font-bold text-lg text-gray-800">{settlementReceiptData.date}</p>
                            <p className="text-sm text-gray-500 font-mono" dir="ltr">{settlementReceiptData.time}</p>
                        </div>
                    </div>

                    {/* البيانات */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">حساب السيد (المدرس / المستفيد)</p>
                            
                            {/* 1. اسم المدرس الأساسي */}
                            <h2 className="text-2xl font-black text-gray-800 mb-1">{settlementReceiptData.instructor_name}</h2>
                            
                            {/* 2. تفاصيل من استلم الفلوس */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-[10px] text-gray-500 font-bold mb-1">تم التسليم والاستلام بواسطة:</p>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-800 text-lg">{settlementReceiptData.receiver_name}</span>
                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                                        ({settlementReceiptData.receiver_role === 'Teacher' ? 'شخصياً' : 
                                          settlementReceiptData.receiver_role === 'Assistant' ? 'مساعد' : 'مندوب'})
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center flex flex-col justify-center">
                            <p className="text-xs font-bold text-green-600 uppercase mb-2">إجمالي المبلغ المصروف</p>
                            <h2 className="text-4xl font-black text-green-700 mb-1">{settlementReceiptData.total_amount.toLocaleString()}</h2>
                            <p className="text-xs font-bold text-green-500">جنيه مصري لا غير</p>
                        </div>
                    </div>

                    {/* الجدول */}
                    <div className="mb-12">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 border-r-4 border-black pr-3">تفاصيل الأصناف</h3>
                        <table className="w-full text-center border-collapse">
                            <thead className="bg-gray-800 text-white">
                                <tr>
                                    <th className="p-3 border border-gray-800">الصنف / المنتج</th>
                                    <th className="p-3 border border-gray-800">النوع</th>
                                    <th className="p-3 border border-gray-800">الصف الدراسي</th>
                                    <th className="p-3 border border-gray-800">العدد</th>
                                    <th className="p-3 border border-gray-800">نصيب المستر (للقطعة)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white">
                                    <td className="p-4 font-bold border border-gray-300 text-gray-800">{settlementReceiptData.product_name}</td>
                                    
                                    <td className="p-4 border border-gray-300 text-gray-600 font-bold">
                                        {settlementReceiptData.product_type === 'book' ? 'كتاب 📘' : 
                                         settlementReceiptData.product_type === 'code' ? 'كود 🔐' : 'ملزمة 📄'}
                                    </td>

                                    <td className="p-4 border border-gray-300 font-bold text-gray-600">{settlementReceiptData.grade}</td>
                                    <td className="p-4 border border-gray-300 font-black text-lg">{settlementReceiptData.total_count}</td>
                                    <td className="p-4 border border-gray-300 font-bold text-gray-600">{settlementReceiptData.teacher_share} ج.م</td>
                                </tr>
                            </tbody>
                        </table>
                        {settlementReceiptData.notes && (
                            <div className="mt-4 bg-yellow-50 p-3 rounded-xl border border-yellow-200 text-sm">
                                <span class="font-bold text-yellow-700">ملاحظات:</span> {settlementReceiptData.notes}
                            </div>
                        )}
                    </div>

                    {/* الفوتر */}
                    <div className="mt-auto pt-8">
                        <div className="flex justify-between items-end mb-8">
                            <div className="text-center w-1/3">
                                <p className="font-bold text-sm mb-12 uppercase tracking-wider text-gray-500">توقيع المستلم</p>
                                <div className="border-b-2 border-black w-3/4 mx-auto"></div>
                                <p className="text-xs font-bold mt-2 text-gray-800">{settlementReceiptData.receiver_name}</p>
                            </div>
                            
                            <div className="text-center">
                                <div className="mb-2 flex justify-center">
                                     <div className="border-4 border-black p-2 font-mono font-bold">
                                        REF: {settlementReceiptData.id}
                                     </div>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">OFFICIAL RECEIPT</p>
                            </div>

                            <div className="text-center w-1/3">
                                <p className="font-bold text-sm mb-12 uppercase tracking-wider text-gray-500">اعتماد المسؤول</p>
                                <div className="border-b-2 border-black w-3/4 mx-auto"></div>
                                <p className="text-xs font-bold mt-2 text-gray-800">{settlementReceiptData.admin_name}</p>
                            </div>
                        </div>
                        
                        <div className="text-center text-[10px] text-gray-400 font-bold border-t border-dashed border-gray-300 pt-4">
                            {centerSettings?.address || ''} | {centerSettings?.phone || ''} | تم استخراج هذا المستند آلياً من النظام
                        </div>
                    </div>
                </div>
            </div>

            {/* زرار الطباعة (تم إصلاح الطباعة المزدوجة هنا) */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                <button onClick={() => setShowSettlementReceiptModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">إغلاق</button>
                <button 
                    onClick={() => {
                        const printContent = document.getElementById('settlement-receipt-print');
                        if (!printContent) {
                            toast.error("لا يوجد محتوى للطباعة");
                            return;
                        }

                        // 1. تجميع الاستايلات
                        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                            .map(style => style.outerHTML)
                            .join('');

                        // 2. إنشاء Iframe
                        const iframe = document.createElement('iframe');
                        iframe.style.position = 'fixed';
                        iframe.style.left = '-10000px'; 
                        iframe.style.top = '0';
                        iframe.style.width = '1000px'; 
                        iframe.style.height = '1000px';
                        document.body.appendChild(iframe);

                        const doc = iframe.contentWindow.document;

                        // 3. كتابة المحتوى
                        doc.open();
                        doc.write(`
                            <html dir="rtl" lang="ar">
                                <head>
                                    <title>إذن صرف #${settlementReceiptData.id}</title>
                                    ${styles}
                                    <style>
                                        /* 1. إعدادات الورقة A4 */
                                        @page {
                                            size: A4;
                                            margin: 0; 
                                        }

                                        /* 2. إجبار ظهور العناصر وإلغاء السكرول */
                                        @media print {
                                            html, body {
                                                visibility: visible !important;
                                                height: 100% !important;
                                                margin: 0 !important;
                                                padding: 0 !important;
                                                overflow: visible !important;
                                                background-color: white !important;
                                                -webkit-print-color-adjust: exact !important; 
                                                print-color-adjust: exact !important;
                                            }
                                            
                                            body * { visibility: visible !important; }
                                            
                                            #print-wrapper {
                                                width: 100% !important;
                                                min-height: 100vh !important;
                                                position: static !important;
                                                margin: 0 !important;
                                                padding: 0 !important;
                                            }

                                            ::-webkit-scrollbar { display: none; }
                                            button, .no-print, .print\\:hidden { display: none !important; }
                                            
                                            table { width: 100% !important; border-collapse: collapse !important; }
                                            
                                            #settlement-receipt-print {
                                                background-color: white !important;
                                                padding: 20px !important; 
                                            }
                                        }

                                        /* 3. تنسيق عام */
                                        body { font-family: 'Tajawal', sans-serif; padding: 0; margin: 0; }
                                    </style>
                                </head>
                                <body>
                                    <div id="print-wrapper">
                                        ${printContent.innerHTML}
                                    </div>
                                    <script>
                                        // ✅ هذا السكربت هو المسؤول الوحيد عن الطباعة
                                        window.onload = function() {
                                            setTimeout(function() {
                                                window.print();
                                                // إبلاغ الصفحة الرئيسية لإزالة الـ iframe (اختياري)
                                            }, 500);
                                        }
                                    </script>
                                </body>
                            </html>
                        `);
                        doc.close();

                        // 4. حذف الـ Iframe بعد وقت كافي (بدون طباعة ثانية)
                        setTimeout(() => {
                            if (document.body.contains(iframe)) {
                                document.body.removeChild(iframe);
                            }
                        }, 5000); // 5 ثواني مهلة للإلغاء أو الطباعة
                    }}
                    className="bg-black text-white px-8 py-3 rounded-xl font-black hover:bg-gray-800 transition flex items-center gap-2 shadow-lg"
                >
                    <FaPrint/> طباعة (A4)
                </button>
            </div>
        </div>
    </div>
)}


        {/* ── 4. REPORT MODAL ── */}
        {showReportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] w-full max-w-6xl overflow-hidden shadow-2xl shadow-slate-900/20 flex flex-col max-h-[95vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                    
                    {/* ── HEADER CONTROL ── */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 print:hidden border-b border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -translate-y-32 translate-x-32"></div>
                        
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-white/10">
                                <FaPrint /> مركز التحميل والتقارير المالية
                            </div>
                            <h2 className="text-2xl font-black">تحليل وإغلاق الوردية</h2>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
                            <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
                                <button onClick={() => setReportMode('daily')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all duration-300 ${reportMode === 'daily' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}>يومي</button>
                                <button onClick={() => setReportMode('monthly')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all duration-300 ${reportMode === 'monthly' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}>شهري</button>
                            </div>

                            <button 
                                onClick={() => setShowAdminView(!showAdminView)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black transition-all duration-300 border ${showAdminView ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
                            >
                                {showAdminView ? <FaEyeSlash className="text-lg"/> : <FaEye className="text-lg"/>} 
                                <span className="uppercase tracking-widest">{showAdminView ? 'إخفاء التحليل' : 'رؤية المدير'}</span>
                            </button>

                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-2xl">
                                <label className="text-[10px] text-slate-500 font-black uppercase">التاريخ</label>
                                <input 
                                    type="date" 
                                    value={reportDate} 
                                    onChange={(e) => setReportDate(e.target.value)} 
                                    className="bg-transparent text-white font-black text-xs outline-none focus:text-blue-400 transition-colors" 
                                />
                            </div>

                            <button 
                                onClick={() => setShowReportModal(false)} 
                                className="w-10 h-10 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center rounded-xl transition-all duration-300 active:scale-90"
                            >
                                <FaTimes size={18}/>
                            </button>
                        </div>
                    </div>

                    {/* ── ADVANCED FILTERS ── */}
                    <div className="bg-slate-50 p-6 border-b border-slate-200 print:hidden">
                        <div className="max-w-6xl mx-auto space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">الصف الدراسي</label>
                                    <div className="relative group">
                                        <FaUserGraduate className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10 size-3"/>
                                        <select 
                                            value={reportFilterGrade} 
                                            onChange={(e) => { 
                                                setReportFilterGrade(e.target.value); 
                                                setReportFilterTeacher(''); setReportFilterType(''); setSearchTerm(''); 
                                            }}
                                            className="w-full p-3.5 bg-white rounded-2xl border-2 border-slate-200 outline-none focus:border-blue-500 font-black text-xs text-slate-600 appearance-none cursor-pointer pr-10 shadow-sm"
                                        >
                                            <option value="">كل الصفوف الدراسية</option>
                                            {stages.map((s, idx) => (
                                                <option key={idx} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">المدرس / المحاضر</label>
                                    <div className="relative group">
                                        <FaChalkboardTeacher className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10 size-3"/>
                                        <select 
                                            value={reportFilterTeacher}
                                            onChange={(e) => { setReportFilterTeacher(e.target.value); setReportFilterType(''); setSearchTerm(''); }}
                                            className="w-full p-3.5 bg-white rounded-2xl border-2 border-slate-200 outline-none focus:border-blue-500 font-black text-xs text-slate-600 appearance-none cursor-pointer pr-10 shadow-sm"
                                        >
                                            <option value="">كل المدرسين</option>
                                            {reportLists.teacherList.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">نوع المنتج</label>
                                    <div className="relative group">
                                        <FaTag className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10 size-3"/>
                                        <select 
                                            value={reportFilterType}
                                            onChange={(e) => { setReportFilterType(e.target.value); setSearchTerm(''); }}
                                            className="w-full p-3.5 bg-white rounded-2xl border-2 border-slate-200 outline-none focus:border-blue-500 font-black text-xs text-slate-600 appearance-none cursor-pointer pr-10 shadow-sm"
                                        >
                                            <option value="">كل أنواع المنتجات</option>
                                            {reportLists.typeList.map((type, idx) => (
                                                <option key={idx} value={type}>{type === 'note' ? '📄 ملازم' : type === 'book' ? '📘 كتب' : '🔐 أكواد'}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">اسم المنتج</label>
                                    <div className="relative group">
                                        <FaBoxOpen className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10 size-3"/>
                                        <select 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full p-3.5 bg-white rounded-2xl border-2 border-slate-200 outline-none focus:border-blue-500 font-black text-xs text-slate-600 appearance-none cursor-pointer pr-10 shadow-sm"
                                        >
                                            <option value="">كل المنتجات في المخزن</option>
                                            {reportLists.productList.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {(reportFilterGrade || reportFilterTeacher || reportFilterType || searchTerm) && (
                                <div className="flex justify-center">
                                    <button 
                                        onClick={() => { setReportFilterGrade(''); setReportFilterTeacher(''); setReportFilterType(''); setSearchTerm(''); }} 
                                        className="flex items-center gap-2 px-6 py-1.5 bg-rose-50 text-rose-500 rounded-full text-[10px] font-black hover:bg-rose-500 hover:text-white transition-all duration-300 uppercase tracking-widest shadow-sm group"
                                    >
                                        <FaTimesCircle className="size-3 group-hover:rotate-90 transition-transform duration-500"/> 
                                        إزالة جميع الفلاتر
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

            {/* جسم التقرير القابل للطباعة */}
            <div className="flex-1 overflow-y-auto p-8 bg-white" id="printable-report">
                
                {/* 📊 منطقة ملخص المدير (Dashboard) - تظهر فقط عند التفعيل وتختفي في الطباعة */}
{/* 📊 منطقة ملخص المدير (Dashboard) - النسخة المحدثة لتعكس الربح التشغيلي */}
                {/* ── 📊 ADMIN DASHBOARD (ANALYTICS) ── */}
                {showAdminView && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-center bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner print:hidden animate-in slide-in-from-top-4 duration-500">
                        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                            
                            {/* 1. TOTAL REVENUE */}
                            <div className="bg-white p-6 rounded-3xl border-2 border-blue-100/50 shadow-sm flex flex-col items-center justify-center text-center space-y-1 group hover:border-blue-500 transition-all duration-300">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">إجمالي الإيرادات (الوارد)</p>
                                <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
                                    {reportStats.totalRevenue.toLocaleString()}
                                    <span className="text-[10px] opacity-40">ج.م</span>
                                </div>
                                <div className="w-12 h-1 bg-blue-100 rounded-full mt-2"></div>
                            </div>

                            {/* 2. TEACHER LIABILITY */}
                            <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100/50 shadow-sm flex flex-col items-center justify-center text-center space-y-1 group hover:border-indigo-500 transition-all duration-300">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">مستحقات مدرسين (التزام)</p>
                                <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
                                    {reportStats.todayTeacherLiability.toLocaleString()}
                                    <span className="text-[10px] opacity-40">ج.م</span>
                                </div>
                                <p className="text-[8px] text-indigo-400 font-black italic mt-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">عن مبيعات اليوم فقط</p>
                            </div>

                            {/* 3. OPERATING PROFIT */}
                            <div className={`p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center space-y-1 border-2 transition-all duration-300 ${reportStats.centerOperatingProfit >= 0 ? 'bg-slate-900 border-emerald-500/30' : 'bg-rose-900 border-rose-500/30'}`}>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">صافي ربح التشغيل</p>
                                <div className="text-3xl font-black text-white flex items-baseline gap-1">
                                    {reportStats.centerOperatingProfit.toLocaleString()}
                                    <span className="text-[10px] opacity-40">ج.م</span>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mt-2 ${reportStats.centerOperatingProfit >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {reportStats.centerOperatingProfit >= 0 ? 'مكسب حقيقي ✨' : 'خسارة تشغيلية ⚠️'}
                                </div>
                            </div>
                        </div>
                        
                        {/* PROFIT MARGIN CHART */}
                        <div className="lg:col-span-4 h-[160px] relative flex items-center justify-center lg:border-r-2 lg:border-slate-200/50">
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center z-20">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">هامش الربح</span>
                                <span className={`text-2xl font-black leading-none ${reportStats.centerOperatingProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {reportStats.totalRevenue > 0 
                                        ? ((reportStats.centerOperatingProfit / reportStats.totalRevenue) * 100).toFixed(1) 
                                        : 0}%
                                </span>
                            </div>

                            <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <PieChart>
                    <Pie 
                        data={[
                            { name: 'صافي ربح', value: Math.max(0, reportStats.centerOperatingProfit), fill: '#10b981' },
                            { name: 'تكلفة مدرسين', value: reportStats.todayTeacherLiability, fill: '#6366f1' }
                        ]} 
                        innerRadius={45} 
                        outerRadius={60} 
                        paddingAngle={5} 
                        dataKey="value"
                    >
                        <Cell fill="#10b981" cornerRadius={4} />
                        <Cell fill="#6366f1" cornerRadius={4} />
                    </Pie>
                    <Tooltip 
                        cursor={false} 
                        contentStyle={{ 
                            backgroundColor: '#ffffff', 
                            borderRadius: '8px', 
                            border: '1px solid #e5e7eb', 
                            fontSize: '10px', 
                            fontWeight: 'bold', 
                            color: '#1f2937' 
                        }} 
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
)}

                {/* ── 🏢 BRANDING HEADER (PRINT FRIENDLY) ── */}
                <div className="border-b-4 border-slate-900 pb-8 mb-10 flex flex-col md:flex-row justify-between items-center md:items-start gap-6">
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-right">
                        {/* CENTER LOGO */}
                        {centerSettings?.logo_url && (
                            <img src={centerSettings.logo_url} alt="Logo" className="w-24 h-24 object-contain rounded-2xl border-2 border-slate-100 p-2 bg-white shadow-sm" />
                        )}
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{reportMode === 'daily' ? 'تقرير إغلاق اليومية' : 'كشف التسويات الشهري'}</h1>
                            <p className="text-xl font-bold text-slate-500">{centerSettings?.center_name || 'Smart Center System'}</p>
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{centerSettings?.slogan || 'التميز في الإدارة التعليمية'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 text-white p-6 rounded-[2rem] text-center min-w-[200px] shadow-xl shadow-slate-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">{reportMode === 'daily' ? 'عن يوم العمل' : 'عن شهر'}</p>
                        <p className="text-2xl font-black font-mono relative z-10">{reportMode === 'daily' ? reportDate : reportDate.slice(0, 7)}</p>
                        <div className="mt-4 pt-4 border-t border-white/10 relative z-10">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">تاريخ الاستخراج</p>
                            <p className="text-[11px] font-black">{new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                {/* ── 🔢 MAIN METRICS (PRINT READY) ── */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                    
                    {/* 1. TOTAL SALES */}
                    <div className="bg-white border-2 border-slate-100 p-5 rounded-3xl text-center shadow-sm print:border-slate-900 group">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 group-hover:text-blue-500 transition-colors">إجمالي المبيعات</p>
                        <p className="text-2xl font-black text-blue-600 print:text-black">
                            {reportStats.totalRevenue.toLocaleString()} 
                            <span className="text-xs opacity-40 mr-1">ج.م</span>
                        </p>
                    </div>

                    {/* 2. OPERATING PROFIT */}
                    <div className="bg-emerald-50 border-2 border-emerald-100 p-5 rounded-3xl text-center shadow-sm print:border-slate-900 group">
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-2">صافي ربح السنتر</p>
                        <p className="text-2xl font-black text-emerald-700 print:text-black">
                            {reportStats.centerOperatingProfit.toLocaleString()}
                            <span className="text-xs opacity-40 mr-1">ج.م</span>
                        </p>
                        <p className="text-[8px] text-emerald-400 font-black mt-1 uppercase tracking-tighter italic">هامش النشاط الجاري</p>
                    </div>

                    {/* 3. SETTLEMENTS OUT */}
                    <div className="bg-white border-2 border-slate-100 p-5 rounded-3xl text-center shadow-sm print:border-slate-900 group">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 group-hover:text-rose-500 transition-colors">تسويات (صادر)</p>
                        <p className="text-2xl font-black text-rose-600 print:text-black">
                            {reportStats.totalPaidOut.toLocaleString()}
                            <span className="text-xs opacity-40 mr-1">ج.م</span>
                        </p>
                        <p className="text-[8px] text-slate-300 font-black mt-1 uppercase">سداد مستحقات</p>
                    </div>

                    {/* 4. REFUNDS */}
                    <div className="bg-orange-50 border-2 border-orange-100 p-5 rounded-3xl text-center shadow-sm print:border-slate-900 group">
                        <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest mb-2">إجمالي المرتجعات</p>
                        <p className="text-2xl font-black text-orange-600 print:text-black">
                            {(reportStats.totalRefunds || 0).toLocaleString()}
                            <span className="text-xs opacity-40 mr-1">ج.م</span>
                        </p>
                    </div>

                    {/* 5. NET CASH FLOW */}
                    <div className="bg-slate-900 text-white p-5 rounded-3xl text-center shadow-xl shadow-slate-200 col-span-2 md:col-span-1 border-2 border-slate-900 print:bg-white print:text-slate-900 print:border-slate-900">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">صافي حركة الخزينة</p>
                        <p className={`text-2xl font-black ${reportStats.netCashFlow < 0 ? 'text-rose-400' : 'text-emerald-400 print:text-slate-900'}`}>
                            {reportStats.netCashFlow.toLocaleString()}
                            <span className="text-xs opacity-40 mr-1">ج.م</span>
                        </p>
                        {reportStats.netCashFlow < 0 && <p className="text-[8px] text-rose-300 font-bold mt-1 animate-pulse">سداد التزامات سابقة</p>}
                    </div>
                </div>

                {/* ── 📚 DETAILED TRANSACTION LOGS ── */}
                {reportMode === 'daily' ? (
                    <div className="space-y-12">
                        {/* 1. DAILY SALES TABLE */}
                        <div className="bg-white">
                            <div className="flex justify-between items-end mb-6 border-r-4 border-blue-600 pr-4">
                                <div>
                                    <h3 className="font-black text-2xl text-slate-900">تفاصيل مبيعات اليوم</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">سجل كامل بجميع العمليات التي تمت في الوردية</p>
                                </div>
                                <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 text-blue-600 font-black text-xs">
                                    {reportStats.sales.length} عملية مبيعات
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto rounded-[2rem] border-2 border-slate-100">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[10px] border-b-2 border-slate-100">
                                        <tr>
                                            <th className="p-5">المنتج المباع</th>
                                            <th className="p-5">اسم الطالب</th>
                                            <th className="p-5">المستوى الدراسي</th>
                                            <th className="p-5">المدرس / المحاضر</th>
                                            <th className="p-5 text-left pl-8">قيمة المبيعة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                    {reportStats.sales.map((sale, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-5 font-black text-slate-700">{sale.store_products?.name}</td>
                                            <td className="p-5">
                                                <div className="font-black text-blue-600 text-xs">{sale.students?.name || 'زائر / خارجي'}</div>
                                                {sale.students?.unique_id && (
                                                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">{sale.students.unique_id}</div>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black border border-slate-200">{sale.store_products?.courses?.grade || 'عام / متنوع'}</span>
                                            </td>
                                            <td className="p-5 text-xs font-black text-slate-500 uppercase tracking-tighter">
                                                {sale.store_products?.courses?.instructors?.name || sale.store_products?.courses?.instructor || '—'}
                                            </td>
                                            <td className="p-5 font-black text-emerald-600 text-left pl-8 text-lg">
                                                {sale.price_sold || sale.store_products?.price}
                                                <span className="text-[10px] opacity-40 mr-1">ج.م</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 2. DAILY SETTLEMENTS TABLE */}
                    <div className="bg-white">
                        <div className="flex justify-between items-end mb-6 border-r-4 border-rose-600 pr-4">
                            <div>
                                <h3 className="font-black text-2xl text-slate-900">المصروفات والتسويات المالية</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">سجل التوريدات والمدفوعات الصادرة للموردين والمدرسين</p>
                            </div>
                            <div className="bg-rose-50 px-4 py-2 rounded-2xl border border-rose-100 text-rose-600 font-black text-xs">
                                {reportStats.settlements.length} حركة صادر
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-[2rem] border-2 border-slate-100">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[10px] border-b-2 border-slate-100">
                                    <tr>
                                        <th className="p-5">البان / المنتج القديم</th>
                                        <th className="p-5 text-center">النوع</th>
                                        <th className="p-5 text-center">الكمية</th>
                                        <th className="p-5 text-center">الصف</th>
                                        <th className="p-5 text-center">المدرس</th>
                                        <th className="p-5 text-center">المستلم</th>
                                        <th className="p-5 text-center">المسؤول</th>
                                        <th className="p-5 text-center">التوقيت</th>
                                        <th className="p-5 text-left pl-8">المبلغ المدفوع</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {reportStats.settlements.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-rose-50/10 transition-colors group">
                                            <td className="p-5 font-black text-slate-700">
                                                {item.store_products?.name || 'تسوية يدوية'}
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                    item.store_products?.type === 'note' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                    item.store_products?.type === 'book' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                    item.store_products?.type === 'code' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                    'bg-slate-50 text-slate-500 border border-slate-200'
                                                }`}>
                                                    {item.store_products?.type === 'note' ? '📄 ملزمة' : 
                                                     item.store_products?.type === 'book' ? '📘 كتاب' : 
                                                     item.store_products?.type === 'code' ? '🔐 كود' : '📦 عام'}
                                                </span>
                                            </td>
                                            <td className="p-5 text-center font-black text-slate-700">{item.total_count || 0}</td>
                                            <td className="p-5 text-center text-[10px] font-black text-slate-400">{item.store_products?.courses?.grade || '—'}</td>
                                            <td className="p-5 text-center text-xs font-black text-slate-500">{item.store_products?.courses?.instructors?.name || item.store_products?.courses?.instructor || '—'}</td>
                                            <td className="p-5 text-center text-xs font-black text-slate-500">{item.receiver_name}</td>
                                            <td className="p-5 text-center text-[10px] font-black text-slate-400 capitalize">{item.admin_name || 'System'}</td>
                                            <td className="p-5 text-center font-black text-xs text-slate-400">{new Date(item.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</td>
                                            <td className="p-5 font-black text-rose-600 text-left pl-8 text-lg">
                                                {item.total_amount}
                                                <span className="text-[10px] opacity-40 mr-1">ج.م</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {reportStats.settlements.length === 0 && (
                                        <tr>
                                            <td colSpan="9" className="p-10 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
                                                لا توجد حركات تسوية مالية مسجلة في هذا اليوم
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                

{/* جدول المرتجعات اليومي - نسخة نظيفة بدون أخطاء */}
                        <div>
                            <div className="bg-white">
                                <div className="flex justify-between items-end mb-6 border-r-4 border-orange-600 pr-4 mt-12">
                                <div>
                                    <h3 className="font-black text-2xl text-slate-900">سجل مرتجعات المنتجات</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">تفاصيل المنتجات التي تم استرجاعها وإعادة قيمتها للطلاب</p>
                                </div>
                                <div className="bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100 text-orange-600 font-black text-xs">
                                    {reportStats.refunds?.length || 0} حالة إرجاع
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-[2rem] border-2 border-slate-100">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[10px] border-b-2 border-slate-100">
                                        <tr>
                                            <th className="p-5">المنتج المُرجع</th>
                                            <th className="p-5 text-center">النوع</th>
                                            <th className="p-5 text-center">العدد</th>
                                            <th className="p-5 text-center">الصف</th>
                                            <th className="p-5 text-center">المدرس</th>
                                            <th className="p-5 text-center">اسم الطالب</th>
                                            <th className="p-5 text-center">سبب الإرجاع</th>
                                            <th className="p-5 text-center">وسيلة الرد</th>
                                            <th className="p-5 text-center">المسؤول</th>
                                            <th className="p-5 text-left pl-8">المبلغ المسترد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {reportStats.refunds?.map((refund, idx) => (
                                            <tr key={idx} className="hover:bg-orange-50/10 transition-colors group">
                                                <td className="p-5 font-black text-slate-700">{refund.store_products?.name}</td>
                                                <td className="p-5 text-center">
                                                    <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
                                                        (refund.store_products?.type?.toLowerCase() === 'note') ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                        (refund.store_products?.type?.toLowerCase() === 'book') ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                        (refund.store_products?.type?.toLowerCase() === 'code') ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                        'bg-slate-50 text-slate-500 border border-slate-200'
                                                    }`}>
                                                        {refund.store_products?.type === 'note' ? '📄 ملزمة' : 
                                                         refund.store_products?.type === 'book' ? '📘 كتاب' : 
                                                         refund.store_products?.type === 'code' ? '🔐 كود' : '📦 عام'}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center font-black text-slate-700">{refund.quantity || 1}</td>
                                                <td className="p-5 text-center text-[10px] font-black text-slate-400">{refund.store_products?.grade || refund.store_products?.courses?.grade || '—'}</td>
                                                <td className="p-5 text-center text-xs font-black text-slate-500">{refund.store_products?.courses?.instructors?.name || refund.store_products?.courses?.instructor || '—'}</td>
                                                <td className="p-5 text-center">
                                                    <div className="font-black text-blue-600 text-xs">{refund.store_sales?.students?.name || 'زائر'}</div>
                                                    {refund.store_sales?.students?.unique_id && (
                                                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{refund.store_sales.students.unique_id}</div>
                                                    )}
                                                </td>
                                                <td className="p-5 text-center text-xs text-slate-400 max-w-[150px] truncate" title={refund.reason}>{refund.reason || '—'}</td>
                                                <td className="p-5 text-center">
                                                    <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight whitespace-nowrap ${
                                                        refund.refund_method === 'center_account' ? 'bg-purple-100 text-purple-600' :
                                                        refund.refund_method === 'cash' ? 'bg-emerald-100 text-emerald-600' :
                                                        'bg-blue-100 text-blue-600'
                                                    }`}>
                                                        {refund.refund_method === 'center_account' ? 'خزينة السنتر' :
                                                         refund.refund_method === 'cash' ? 'نقدي (كاش)' : 'محفظة الطالب'}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center text-[10px] font-black text-slate-400 uppercase">{refund.admin_name || 'System'}</td>
                                                <td className="p-5 font-black text-orange-600 text-left pl-8 text-lg">
                                                    {refund.refund_amount}
                                                    <span className="text-[10px] opacity-40 mr-1">ج.م</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!reportStats.refunds || reportStats.refunds.length === 0) && (
                                            <tr>
                                                <td colSpan="10" className="p-10 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
                                                    لا توجد عمليات إرجاع مسجلة في هذا اليوم
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    </div>
                ) : (
                    <div className="mb-8">
                        <h3 className="font-bold text-lg mb-3 border-r-4 border-purple-500 pr-3 flex items-center gap-2 text-right"><FaMoneyBillWave/> تحليل المبيعات والتسويات (شهري مجمع)</h3>
                        <table className="w-full text-xs text-right border border-gray-300">
                            <thead className="bg-purple-50 text-gray-900 font-bold border-b border-purple-200">
                                <tr>
                                    <th className="p-3 border-l text-right">المدرس / المستلم</th>
                                    <th className="p-3 border-l text-right">المادة / البند</th>
                                    {/* ✅ تم إضافة عمود العدد هنا */}
                                        <th className="p-5 text-center">الكمية المباعة</th>
                                        <th className="p-5 text-center">إجمالي الإيراد المستحق</th>
                                        <th className="p-5 text-left pl-8">المبلغ المنصرف للمدرس</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {reportStats.settlementsAnalysis.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-5">
                                                <div className="font-black text-slate-800 text-sm">{row.teacher}</div>
                                                <div className="text-[9px] text-slate-400 font-black mt-1 flex items-center gap-1 uppercase tracking-tighter">
                                                    📦 استلام بواسطة: {row.receiverDisplay}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="font-black text-slate-700">{row.product}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase">{row.grade} — {row.subject}</div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-black text-xs border border-slate-200">{row.count}</span>
                                            </td>
                                            <td className="p-5 text-center font-black text-emerald-600">
                                                {row.salesRevenue?.toLocaleString() || 0}
                                                <span className="text-[9px] opacity-40 mr-1">ج.م</span>
                                            </td>
                                            <td className="p-5 text-left pl-8 font-black text-rose-600 text-lg">
                                                {row.paid?.toLocaleString() || row.total?.toLocaleString()}
                                                <span className="text-[9px] opacity-40 mr-1">ج.م</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-900 text-white">
                                    <tr className="divide-x divide-white/10 divide-reverse">
                                        <td className="p-6 font-black uppercase tracking-widest text-xs" colSpan="4">إجمالي المنصرف الكلي لجميع المدرسين</td>
                                        <td className="p-6 text-2xl font-black text-left pl-8">
                                            {(reportStats.totalPaidOut).toLocaleString()}
                                            <span className="text-xs opacity-40 mr-2 uppercase">EGP</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                )}

                {/* ── 📋 OFFICIAL SIGNATURES & VERIFICATION ── */}
                <div className="mt-20 pt-12 border-t-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-12 print:mt-16">
                    <div className="flex flex-col md:flex-row gap-16 md:gap-32">
                        <div className="text-center space-y-8">
                            <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.3em]">المحاسب المسؤول / Accountant</p>
                            <div className="w-40 border-b-2 border-slate-900 mx-auto"></div>
                        </div>
                        <div className="text-center space-y-8">
                            <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.3em]">مدير المركز / Center Manager</p>
                            <div className="w-40 border-b-2 border-slate-900 mx-auto"></div>
                        </div>
                    </div>
                    
                    {/* DIGITAL VERIFICATION QR */}
                    <div className="flex flex-col items-center gap-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <QRCodeSVG 
                            value={`SmartCenter-Report | Center: ${centerSettings?.center_name} | Date: ${reportDate} | Net: ${reportStats.netCashFlow}`} 
                            size={80} 
                            level="H"
                            includeMargin={false}
                            className="opacity-80"
                        />
                        <div className="text-center">
                            <span className="block text-[8px] font-black text-slate-400 tracking-widest uppercase">Verified Official Document</span>
                            <span className="block text-[6px] font-black text-blue-500 uppercase tracking-tighter">Powered by Smart Center System</span>
                        </div>
                    </div>
                </div>

                {/* PRINT FOOTER CONTACT */}
                <div className="hidden print:block text-center mt-12 border-t border-slate-100 pt-6">
                    <p className="text-[10px] text-slate-400 font-bold tracking-wide">
                        {centerSettings?.address} 
                        {centerSettings?.phone && <span className="mx-3 opacity-30">|</span>}
                        {centerSettings?.phone && `Phone: ${centerSettings.phone}`}
                    </p>
                </div>
            </div>

            {/* ── 🖨️ MODAL ACTIONS (FLOAT) ── */}
            <div className="p-6 bg-slate-50/50 backdrop-blur-md border-t border-slate-100 print:hidden flex justify-between items-center">
                <button 
                    onClick={() => setShowReportModal(false)}
                    className="px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                    إغلاق التقرير ×
                </button>

                <button 
                    onClick={() => {
                        const printElement = document.getElementById('printable-report');
                        if (!printElement) {
                            toast.error("لا يوجد محتوى للطباعة");
                            return;
                        }

                        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                            .map(style => style.outerHTML)
                            .join('');

                        const iframe = document.createElement('iframe');
                        iframe.style.position = 'fixed';
                        iframe.style.left = '-10000px'; 
                        iframe.style.top = '0';
    iframe.style.width = '1000px'; 
    iframe.style.height = '1000px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    // 3. كتابة المحتوى بتنسيق احترافي للورقة
    doc.open();
    doc.write(`
        <html dir="rtl" lang="ar">
            <head>
                <title>تقرير إغلاق يومية</title>
                ${styles}
                <style>
                    /* 1. إعدادات الورقة A4 */
                    @page {
                        size: A4;
                        margin: 5mm; /* هامش صغير عشان نستغل الورقة */
                    }

                    /* 2. إجبار ظهور العناصر (الحل السحري للإخفاء) */
                    @media print {
                        html, body {
                            visibility: visible !important;
                            height: auto !important;
                            overflow: visible !important;
                            background-color: white !important;
                            -webkit-print-color-adjust: exact !important; /* طباعة الألوان بدقة */
                            print-color-adjust: exact !important;
                        }
                        body * {
                            visibility: visible !important;
                        }
                        #print-wrapper {
                            width: 100% !important;
                            position: static !important; /* تغيير من absolute لـ static عشان الصفحة تاخد راحتها */
                        }
                        /* إخفاء الأزرار وأي عنصر واخد كلاس no-print */
                        button, .no-print, .print\\:hidden { display: none !important; }
                    }

                    /* 3. تنسيقات تجميلية للمحتوى داخل التقرير */
                    body {
                        font-family: 'Tajawal', sans-serif;
                        padding: 10px;
                    }

                    /* تصغير الخطوط شوية عشان التقرير يكفي صفحة واحدة */
                    #print-wrapper {
                        font-size: 12px !important; 
                        line-height: 1.4;
                    }

                    /* تحجيم العناوين */
                    h1, h2, h3 { margin-bottom: 5px !important; }
                    h1 { font-size: 22px !important; }
                    h2 { font-size: 18px !important; }
                    
                    /* ضغط الجداول عشان متفرشش */
                    table th, table td {
                        padding: 4px 8px !important; /* تقليل الحشو */
                        font-size: 11px !important;
                    }

                    /* تحجيم اللوجو والصور */
                    img {
                        max-height: 80px !important; /* أقصى ارتفاع للوجو */
                        width: auto !important;
                        object-fit: contain;
                    }

                    /* منع كسر الجداول بين الصفحات */
                    tr { break-inside: avoid; }
                    .break-inside-avoid { break-inside: avoid; }
                </style>
            </head>
            <body>
                <div id="print-wrapper">
                    ${printElement.innerHTML}
                </div>
            </body>
        </html>
    `);
    doc.close();

    // 4. الطباعة
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 5000);
    }, 1000);
}}
                    className="w-full bg-black text-white py-4 rounded-xl font-black hover:bg-gray-800 transition flex justify-center items-center gap-2 shadow-lg"
                >
                    <FaPrint/> طباعة التقرير النهائي (A4)
                </button>
            </div>
        </div>
    </div>
)}

{/* 🧾 مودال إيصال صرف النقدية (Receipt Modal) */}
{showReceiptModal && receiptData && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
        <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* أزرار التحكم (لا تظهر في الطباعة) */}
            <div className="bg-gray-900 p-4 flex justify-between items-center print:hidden">
                <h3 className="text-white font-bold flex items-center gap-2"><FaPrint/> إيصال صرف نقدية</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            // 🎯 نفس الحل: نستخدم Iframe للطباعة بدون reload
                            const printContent = document.getElementById('payment-receipt').innerHTML;
                            
                            // 1. نعمل iframe مخفي
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            document.body.appendChild(iframe);
                            
                            // 2. نكتب المحتوى في الـ iframe
                            const doc = iframe.contentWindow.document;
                            doc.open();
                            doc.write(`
                                <html>
                                    <head>
                                        <title>إيصال صرف نقدية</title>
                                        <style>
                                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
                                            @media print { body { margin: 0; padding: 10px; } }
                                        </style>
                                    </head>
                                    <body>
                                        ${printContent}
                                    </body>
                                </html>
                            `);
                            doc.close();
                            
                            // 3. نطبع من الـ iframe
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                            
                            // 4. نحذف الـ iframe بعد الطباعة
                            setTimeout(() => {
                                document.body.removeChild(iframe);
                            }, 1000);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-lg"
                    >
                        طباعة / حفظ PDF
                    </button>
                    <button onClick={() => setShowReceiptModal(false)} className="bg-gray-700 hover:bg-red-500 text-white p-2 rounded-lg transition"><FaTimes/></button>
                </div>
            </div>

            {/* جسم الإيصال (القابل للطباعة) */}
            <div id="payment-receipt" className="p-8 bg-white text-black  relative">
                
                {/* العلامة المائية الخلفية */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <FaHandshake size={300}/>
                </div>

                {/* الهيدر */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-wide mb-1">إيصال صرف نقدية</h1>
                        <p className="text-sm font-bold text-gray-500">PAYMENT VOUCHER</p>
                    </div>
                    <div className="text-left">
                        {centerSettings?.logo_url ? (
                            <img src={centerSettings.logo_url} alt="Logo" className="h-16 object-contain mb-2 ml-auto"/>
                        ) : (
                            <h2 className="text-xl font-bold">{centerSettings?.center_name || 'Smart Center'}</h2>
                        )}
                        <p className="text-xs text-gray-500 font-bold">{new Date(receiptData.date).toLocaleDateString('ar-EG')}</p>
                        <p className="text-xs text-gray-500 font-bold font-mono">#{receiptData.serial}</p>
                    </div>
                </div>

                {/* البيانات الأساسية */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <p className="text-[10px] text-gray-400 font-bold mb-1">يصرف إلى السيد (المستلم)</p>
                        <p className="text-lg font-black text-gray-800">{receiptData.receiver_name}</p>
                        <p className="text-xs text-blue-600 font-bold mt-1">
                            {receiptData.receiver_name === receiptData.instructor ? 'صفته: المدرس (شخصياً)' : `نيابة عن: ${receiptData.instructor}`}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <p className="text-[10px] text-gray-400 font-bold mb-1">المبلغ المصروف</p>
                        <p className="text-2xl font-black text-gray-800">{Number(receiptData.amount).toLocaleString()} ج.م</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">فقط وقدره لا غير</p>
                    </div>
                </div>

                {/* جدول التفاصيل */}
                <table className="w-full text-right border border-gray-300 mb-8">
                    <thead className="bg-gray-100 text-gray-700 font-bold text-sm">
                        <tr>
                            <th className="p-3 border-l border-gray-300">البيان / الصنف</th>
                            <th className="p-3 border-l border-gray-300 text-center">العدد</th>
                            <th className="p-3 border-l border-gray-300 text-center">الصف</th>
                            <th className="p-3 text-center">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-bold text-gray-800">
                        <tr>
                            <td className="p-3 border-l border-gray-300">مستحقات بيع: {receiptData.product_name}</td>
                            <td className="p-3 border-l border-gray-300 text-center">{receiptData.count}</td>
                            <td className="p-3 border-l border-gray-300 text-center">{receiptData.grade}</td>
                            <td className="p-3 text-center font-black">{Number(receiptData.amount).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                {/* الملاحظات */}
                {receiptData.notes && (
                    <div className="mb-8 border border-dashed border-gray-300 p-3 rounded-lg bg-gray-50">
                        <p className="text-xs font-bold text-gray-500 mb-1">ملاحظات:</p>
                        <p className="text-sm font-bold text-gray-800">{receiptData.notes}</p>
                    </div>
                )}

                {/* التوقيعات والباركود */}
                <div className="flex justify-between items-end mt-12 pt-6 border-t-2 border-gray-800">
                    <div className="text-center w-1/3">
                        <p className="font-bold text-xs mb-8 uppercase tracking-wider">توقيع المستلم</p>
                        <div className="border-b border-black border-dashed w-3/4 mx-auto"></div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                        <QRCodeSVG 
                            value={`Receipt-${receiptData.serial}|${receiptData.amount}|${receiptData.receiver_name}`} 
                            size={60} 
                        />
                        <span className="text-[8px] font-mono mt-1 text-gray-400">SCAN TO VERIFY</span>
                    </div>

                    <div className="text-center w-1/3">
                        <p className="font-bold text-xs mb-8 uppercase tracking-wider">اعتماد الإدارة</p>
                        <div className="border-b border-black border-dashed w-3/4 mx-auto"></div>
                    </div>
                </div>

            </div>
        </div>
    </div>
)}
        {/* 3. History View */}
{/* 3. History View (تم إضافة الفلاتر الشاملة لكل الأقسام) */}
{activeTab === 'history' && (
            <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
                
                {/* ── FINANCIAL DASHBOARD ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Cash in Drawer */}
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-100 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                        <div className="relative z-10">
                            <h3 className="text-emerald-100 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                الكاش في الدرج
                            </h3>
                            <p className="text-4xl md:text-5xl font-black mb-2">{liveFinancials.totalCashInDrawer.toLocaleString()} <span className="text-base opacity-60">ج.م</span></p>
                            <p className="text-[10px] text-emerald-100/80 font-bold uppercase tracking-widest">إجمالي إيراد مبيعات اليوم</p>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform duration-700"></div>
                        <FaMoneyBillWave className="absolute bottom-6 right-8 text-white/10 text-7xl rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                    </div>

                    {/* Teacher Debts */}
                    <div className="bg-gradient-to-br from-rose-500 to-red-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-rose-100 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                        <div className="relative z-10">
                            <h3 className="text-rose-100 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                مستحقات مدرسين
                            </h3>
                            <p className="text-4xl md:text-5xl font-black mb-2">{liveFinancials.totalDebtToTeachers.toLocaleString()} <span className="text-base opacity-60">ج.م</span></p>
                            <p className="text-[10px] text-rose-100/80 font-bold uppercase tracking-widest">أمانات معلقة لم يتم تسليمها</p>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform duration-700"></div>
                        <FaHandshake className="absolute bottom-6 right-8 text-white/10 text-7xl -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                    </div>

                    {/* Center Profit */}
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-100 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                        <div className="relative z-10">
                            <h3 className="text-blue-100 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                صافي ربح السنتر
                            </h3>
                            <p className="text-4xl md:text-5xl font-black mb-2">{liveFinancials.totalExpectedProfit.toLocaleString()} <span className="text-base opacity-60">ج.م</span></p>
                            <p className="text-[10px] text-blue-100/80 font-bold uppercase tracking-widest">ربح العمليات الحالية</p>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform duration-700"></div>
                        <FaChartLine className="absolute bottom-6 right-8 text-white/10 text-7xl rotate-3 group-hover:rotate-0 transition-transform duration-500" />
                    </div>
                </div>

                {/* ── HISTORY SUB-NAVIGATION ── */}
                <div className="flex justify-center">
                    <div className="inline-flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 gap-1 overflow-x-auto no-scrollbar max-w-full">
                        <button 
                            onClick={() => setHistoryView('sales')} 
                            className={`px-8 py-3 rounded-xl text-xs md:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                                historyView === 'sales' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                            <FaList className={historyView === 'sales' ? 'animate-bounce' : ''} />
                            المبيعات
                        </button>
                        <button 
                            onClick={() => setHistoryView('packages')} 
                            className={`px-8 py-3 rounded-xl text-xs md:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                                historyView === 'packages' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                            <FaBoxOpen className={historyView === 'packages' ? 'animate-pulse' : ''} />
                            التوريدات
                        </button>
                        <button 
                            onClick={() => setHistoryView('returns')} 
                            className={`px-8 py-3 rounded-xl text-xs md:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                                historyView === 'returns' ? 'bg-rose-600 text-white shadow-xl shadow-rose-100' : 'text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                            <FaUndo className={historyView === 'returns' ? 'animate-spin-slow' : ''} />
                            المرتجعات
                        </button>
                    </div>
                </div>

                {/* ── SEARCH & FILTERS ── */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100">
                                <FaSearch size={14} />
                            </div>
                            تصفية التقارير والسجلات
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl">
                            {historyView === 'sales' ? 'سجلات المبيعات المباشرة' : historyView === 'packages' ? 'سجلات استلام الشحنات' : 'سجلات المرتجعات المالية'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {/* Grade Filter */}
                        <div className="relative">
                            <select 
                                value={historyFilter.grade}
                                onChange={(e) => {
                                    setHistoryFilter({
                                        ...historyFilter, 
                                        grade: e.target.value,
                                        teacher: '',
                                        course: ''
                                    });
                                    setSalesPage(0);
                                    setPackagesPage(0);
                                    setReturnsPage(0);
                                }}
                                className="w-full h-12 md:h-14 pl-4 pr-10 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none text-xs font-black text-slate-700 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">-- كل الصفوف --</option>
                                {stages.map((s, idx) => <option key={idx} value={s.name}>{s.name}</option>)}
                            </select>
                            <FaUserGraduate className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        </div>

                        {/* Teacher Filter */}
                        <div className="relative">
                            <select 
                                value={historyFilter.teacher}
                                onChange={(e) => setHistoryFilter({...historyFilter, teacher: e.target.value})}
                                className="w-full h-12 md:h-14 pl-4 pr-10 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none text-xs font-black text-slate-700 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">-- كل المدرسين --</option>
                                {historyFilteredOptions.teachers.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                            </select>
                            <FaChalkboardTeacher className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        </div>

                        {/* Course Filter */}
                        <div className="relative">
                            <select 
                                value={historyFilter.course}
                                onChange={(e) => setHistoryFilter({...historyFilter, course: e.target.value})}
                                className="w-full h-12 md:h-14 pl-4 pr-10 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none text-xs font-black text-slate-700 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">-- كل المواد --</option>
                                {historyFilteredOptions.courses.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                            </select>
                            <FaBook className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        </div>

                        {/* Type Filter */}
                        <div className="relative">
                            <select 
                                value={historyFilter.type} 
                                onChange={e => {
                                    setHistoryFilter({...historyFilter, type: e.target.value});
                                    setSalesPage(0);
                                    setPackagesPage(0);
                                    setReturnsPage(0);
                                }}
                                className="w-full h-12 md:h-14 pl-4 pr-10 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none text-xs font-black text-slate-700 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">-- كل الأنواع --</option>
                                <option value="note">📄 ملازم</option>
                                <option value="book">📘 كتب</option>
                                <option value="code">🔐 أكواد</option>
                            </select>
                            <FaTag className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        </div>

                        {/* Search Input */}
                        <div className="relative group">
                            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="بحث باسم المنتج..." 
                                value={historyFilter.search}
                                onChange={(e) => setHistoryFilter({...historyFilter, search: e.target.value})}
                                className="w-full h-12 md:h-14 pr-12 pl-4 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none text-xs font-black text-slate-700 transition-all placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* زر مسح الفلاتر */}
                    {(historyFilter.grade || historyFilter.teacher || historyFilter.course || historyFilter.type || historyFilter.search) && (
                        <div className="flex justify-center">
                            <button 
                                onClick={() => setHistoryFilter({grade: '', teacher: '', course: '', type: '', search: ''})}
                                className="text-rose-500 text-[10px] font-black uppercase tracking-widest bg-rose-50 px-6 py-2 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-2"
                            >
                                <FaTimesCircle /> مسح فلاتر البحث
                            </button>
                        </div>
                    )}
                </div>

            {/* ================= القسم الأول: مبيعات فردية ================= */}
            {/* ── SALES TABLE ── */}
            {historyView === 'sales' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-right border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">اسم المنتج</th>
                                        <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">التصنيف</th>
                                        <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الصف & المدرس</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">بيانات الطالب</th>
                                        <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الموظف</th>
                                        <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">القيمة</th>
                                        <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">التاريـــــخ</th>
                                        <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">التحصيل</th>
                                        <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {salesToDisplay.map(sale => (
                                        <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                                            {/* 1. Product Name */}
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border ${
                                                        (sale.store_products?.type?.toLowerCase() === 'note') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        (sale.store_products?.type?.toLowerCase() === 'book') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-purple-50 text-purple-600 border-purple-100'
                                                    }`}>
                                                        {sale.store_products?.type?.toLowerCase() === 'note' ? <FaFileAlt /> : sale.store_products?.type?.toLowerCase() === 'book' ? <FaBook /> : <FaBarcode />}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-700 text-sm group-hover:text-blue-600 transition-colors">{sale.store_products?.name || 'منتج محذوف'}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">#{sale.id.toString().slice(-6)}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 2. Type Badge */}
                                            <td className="p-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    (sale.store_products?.type?.toLowerCase() === 'note') ? 'bg-blue-50 text-blue-600' :
                                                    (sale.store_products?.type?.toLowerCase() === 'book') ? 'bg-amber-50 text-amber-600' :
                                                    'bg-purple-50 text-purple-600'
                                                }`}>
                                                    {sale.store_products?.type?.toLowerCase() === 'note' ? 'مذكرة' : sale.store_products?.type?.toLowerCase() === 'book' ? 'كتاب' : 'كود'}
                                                </span>
                                            </td>

                                            {/* 3. Grade & Teacher */}
                                            <td className="p-6">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                                                        {sale.store_products?.grade || sale.store_products?.courses?.grade || 'عام'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {sale.store_products?.courses?.instructors?.name || sale.store_products?.courses?.instructor || 'السنتر'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 4. Student Info */}
                                            <td className="p-6">
                                                {sale.students ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black border border-blue-100">
                                                            {sale.students.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black text-slate-700">{sale.students.name}</div>
                                                            <div className="text-[10px] font-mono text-slate-300">{sale.students.unique_id}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-bold text-slate-300 italic flex items-center gap-2">
                                                        <FaUser size={10} /> بيع يدوي / زائر
                                                    </div>
                                                )}
                                            </td>

                                            {/* 5. Seller */}
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">{sale.seller_name || 'تلقائي'}</span>
                                                </div>
                                            </td>

                                            {/* 6. Price */}
                                            <td className="p-6 text-center">
                                                <div className="text-sm font-black text-emerald-600">{sale.price_sold} <span className="text-[10px] opacity-60">ج.م</span></div>
                                            </td>

                                            {/* 7. Date */}
                                            <td className="p-6 text-center">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="text-[10px] font-black text-slate-700" dir="ltr">{new Date(sale.created_at).toLocaleDateString('en-GB')}</div>
                                                    <div className="text-[10px] font-bold text-slate-300" dir="ltr">{new Date(sale.created_at).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</div>
                                                </div>
                                            </td>

                                            {/* 8. Settlement Status */}
                                            <td className="p-6 text-center">
                                                {sale.is_settled ? (
                                                    !sale.settlement_id ? (
                                                        <div className="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full text-[10px] font-black border border-rose-100">
                                                            <FaUndo size={10} className="animate-spin-slow" /> مرتجع بالكامل
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-[10px] font-black border border-emerald-100">
                                                            <FaCheckCircle size={10} /> تم التحاسب
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-[10px] font-black border border-amber-100">
                                                        <FaSpinner size={10} className="animate-spin" /> قيد الانتظار
                                                    </div>
                                                )}
                                            </td>

                                            {/* 9. Actions */}
                                            <td className="p-6">
                                                <div className="flex justify-center">
                                                    {sale.is_settled || (sale.notes && sale.notes.includes('مرجع:')) ? (
                                                        <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-200">
                                                            <FaTimes size={12} />
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleRefundSale(sale)} 
                                                            className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm"
                                                            title="إرجاع المنتج"
                                                        >
                                                            <FaUndo size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {filteredHistorySales.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                                    <FaSearch size={32} />
                                </div>
                                <h4 className="font-black text-slate-800 text-lg">لا توجد مبيعات مطابقة</h4>
                                <p className="text-slate-400 font-bold text-sm mt-2">راجع فلاتر البحث أو جرب كلمات بحث أخرى</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            عرض {Math.min((salesPage + 1) * ROWS_PER_PAGE, salesTotal)} من {salesTotal} عملية مباعة
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={salesPage === 0}
                                onClick={() => setSalesPage(prev => prev - 1)}
                                className="h-12 px-6 bg-slate-50 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
                            >
                                السابق
                            </button>
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-xl shadow-slate-200">
                                {salesPage + 1}
                            </div>
                            <button
                                disabled={(salesPage + 1) * ROWS_PER_PAGE >= salesTotal}
                                onClick={() => setSalesPage(prev => prev + 1)}
                                className="h-12 px-6 bg-slate-50 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                </div>
            )}

            
            {/* ── PACKAGES (SUPPLY) TABLE ── */}
            {historyView === 'packages' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-right border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-emerald-50/50 border-b border-emerald-100/50">
                                        <th className="p-6 text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">المنتج المُستلم</th>
                                        <th className="p-6 text-center text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">الصف & المدرس</th>
                                        <th className="p-6 text-center text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">تاريخ الاستلام</th>
                                        <th className="p-6 text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">بيانات المستلم</th>
                                        <th className="p-6 text-center text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">الكمية</th>
                                        <th className="p-6 text-center text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">إجمالي التكلفة</th>
                                        <th className="p-6 text-center text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">المسؤول</th>
                                        <th className="p-6 text-center text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {packagesToDisplay.map(pack => (
                                        <tr key={pack.id} className="hover:bg-emerald-50/20 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg shadow-sm border border-emerald-100">
                                                        <FaBoxOpen />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-700 text-sm group-hover:text-emerald-600 transition-colors">{pack.store_products?.name || 'منتج محذوف'}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">#{pack.id.toString().slice(-6)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
                                                        {pack.store_products?.grade || pack.store_products?.courses?.grade || 'عام'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {pack.store_products?.courses?.instructors?.name || pack.store_products?.courses?.instructor || pack.store_products?.teacher_name || 'السنتر'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="text-[10px] font-black text-slate-700" dir="ltr">{new Date(pack.created_at).toLocaleDateString('en-GB')}</div>
                                                <div className="text-[10px] font-bold text-slate-300" dir="ltr">{new Date(pack.created_at).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center text-[10px] font-black border border-slate-200 uppercase">
                                                        {pack.receiver_role === 'Teacher' ? 'م' : pack.receiver_role === 'Assistant' ? 'س' : 'ن'}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-slate-700">{pack.receiver_name}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pack.receiver_role === 'Teacher' ? 'مدرس' : pack.receiver_role === 'Assistant' ? 'مساعد' : 'مندوب توريد'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-700 rounded-xl font-black text-sm border border-blue-100 shadow-sm">
                                                    {pack.total_count}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="text-sm font-black text-emerald-600">{pack.total_amount} <span className="text-[10px] opacity-60">ج.م</span></div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="text-[10px] font-black text-slate-500 uppercase flex items-center justify-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                                    {pack.admin_name}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex justify-center">
                                                    <button 
                                                        onClick={() => handleReprintSettlement(pack)}
                                                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center hover:bg-slate-900 hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm"
                                                        title="إعادة طباعة الإيصال"
                                                    >
                                                        <FaPrint size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredSettlementPackages.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-200 mb-6 border border-emerald-100">
                                    <FaBoxOpen size={32} />
                                </div>
                                <h4 className="font-black text-slate-800 text-lg">لا توجد سجلات توريد</h4>
                                <p className="text-slate-400 font-bold text-sm mt-2">لم يتم تسجيل أي عمليات توريد تطابق الفلاتر الحالية</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            عرض {Math.min((packagesPage + 1) * ROWS_PER_PAGE, packagesCount)} من {packagesCount} شحنة مستلمة
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={packagesPage === 0}
                                onClick={() => setPackagesPage(prev => prev - 1)}
                                className="h-12 px-6 bg-slate-50 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
                            >
                                السابق
                            </button>
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-xl shadow-slate-200">
                                {packagesPage + 1}
                            </div>
                            <button
                                disabled={(packagesPage + 1) * ROWS_PER_PAGE >= packagesCount}
                                onClick={() => setPackagesPage(prev => prev + 1)}
                                className="h-12 px-6 bg-slate-50 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── RETURNS (REFUNDS) TABLE ── */}
            {historyView === 'returns' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-right border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-rose-50/50 border-b border-rose-100/50">
                                        <th className="p-6 text-[10px] font-black text-rose-800/40 uppercase tracking-widest">المنتج المُرتجع</th>
                                        <th className="p-6 text-center text-[10px] font-black text-rose-800/40 uppercase tracking-widest">التصنيف</th>
                                        <th className="p-6 text-center text-[10px] font-black text-rose-800/40 uppercase tracking-widest">الصف & المدرس</th>
                                        <th className="p-6 text-[10px] font-black text-rose-800/40 uppercase tracking-widest">بيانات الطالب</th>
                                        <th className="p-6 text-center text-[10px] font-black text-rose-800/40 uppercase tracking-widest">الكمية</th>
                                        <th className="p-6 text-center text-[10px] font-black text-rose-800/40 uppercase tracking-widest">حالة المنتج</th>
                                        <th className="p-6 text-center text-[10px] font-black text-rose-800/40 uppercase tracking-widest">المبلغ</th>
                                        <th className="p-6 text-center text-[10px] font-black text-rose-800/40 uppercase tracking-widest">التاريـــــخ</th>
                                        <th className="p-6 text-[10px] font-black text-rose-800/40 uppercase tracking-widest">سبب الإرجاع</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {returnsToDisplay.map(refund => (
                                        <tr key={refund.id} className="hover:bg-rose-50/20 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-lg shadow-sm border border-rose-100">
                                                        <FaUndo />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-700 text-sm group-hover:text-rose-600 transition-colors">{refund.store_products?.name || 'منتج محذوف'}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">#{refund.id.toString().slice(-6)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    (refund.store_products?.type?.toLowerCase() === 'note') ? 'bg-blue-50 text-blue-600' :
                                                    (refund.store_products?.type?.toLowerCase() === 'book') ? 'bg-amber-50 text-amber-600' :
                                                    'bg-purple-50 text-purple-600'
                                                }`}>
                                                    {refund.store_products?.type?.toLowerCase() === 'note' ? 'مذكرة' : refund.store_products?.type?.toLowerCase() === 'book' ? 'كتاب' : 'كود'}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-black text-rose-800 bg-rose-100 px-3 py-1 rounded-lg">
                                                        {refund.store_products?.grade || refund.store_products?.courses?.grade || 'عام'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {refund.store_products?.courses?.instructors?.name || refund.store_products?.courses?.instructor || 'السنتر'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black border border-blue-100 uppercase">
                                                        {refund.store_sales?.students?.name?.charAt(0) || 'ز'}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-slate-700">{refund.store_sales?.students?.name || 'زائر / بيع خارجي'}</div>
                                                        <div className="text-[10px] font-mono text-slate-300">{refund.store_sales?.students?.unique_id || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 text-slate-600 rounded-xl font-black text-sm border border-slate-200">
                                                    {refund.quantity}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                {refund.is_damaged ? (
                                                    <div className="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full text-[10px] font-black border border-rose-100">
                                                        🗑️ تالف (هالك)
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-[10px] font-black border border-emerald-100">
                                                        📦 سليم (مخزن)
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="text-sm font-black text-rose-600">-{refund.refund_amount} <span className="text-[10px] opacity-60">ج.م</span></div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="text-[10px] font-black text-slate-700" dir="ltr">{new Date(refund.created_at).toLocaleDateString('en-GB')}</div>
                                                <div className="text-[10px] font-bold text-slate-300" dir="ltr">{new Date(refund.created_at).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-[10px] font-bold text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dotted border-slate-200 min-w-[150px]">
                                                    {refund.reason || 'لا يوجد سبب مسجل'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredReturns.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-200 mb-6 border border-rose-100">
                                    <FaUndo size={32} />
                                </div>
                                <h4 className="font-black text-slate-800 text-lg">لا توجد مرتجعات</h4>
                                <p className="text-slate-400 font-bold text-sm mt-2">لا توجد عمليات إرجاع تطابق الفلاتر الحالية</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                            عرض {Math.min((returnsPage + 1) * ROWS_PER_PAGE, returnsCount)} من {returnsCount} عملية مرتجع
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={returnsPage === 0}
                                onClick={() => setReturnsPage(prev => prev - 1)}
                                className="h-12 px-6 bg-slate-50 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
                            >
                                السابق
                            </button>
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-xl shadow-slate-200">
                                {returnsPage + 1}
                            </div>
                            <button
                                disabled={(returnsPage + 1) * ROWS_PER_PAGE >= returnsCount}
                                onClick={() => setReturnsPage(prev => prev + 1)}
                                className="h-12 px-6 bg-slate-50 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                </div>
            )}
    </div>
)}

        {/* ── 1. SELL MODAL ── */}
        {showSellModal && productToSell && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl shadow-blue-900/20 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
                        </div>
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-emerald-500/30">
                                    <FaShoppingCart /> عملية بيع جديدة
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black">{productToSell.name}</h2>
                                <p className="text-slate-400 font-bold mt-2 flex items-center gap-3 text-sm">
                                    <span className="text-emerald-400">السعر: {productToSell.price} ج.م</span>
                                    <span className="w-1.5 h-1.5 bg-slate-700 rounded-full"></span>
                                    <span>المخزون المتوفر: {productToSell.stock} قطعة</span>
                                </p>
                            </div>
                            <button 
                                disabled={isSubmitting} 
                                onClick={() => setShowSellModal(false)} 
                                className="w-10 h-10 bg-white/10 text-white/40 hover:text-white hover:bg-white/20 rounded-xl flex items-center justify-center transition-all duration-300"
                            >
                                <FaTimes size={20}/>
                            </button>
                        </div>
                    </div>

                    <div className="p-8">
                        {/* Student Search */}
                        <div className="relative mb-8">
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-blue-600 transition-colors">
                                <FaBarcode />
                            </div>
                            <input 
                                type="text" 
                                autoFocus 
                                placeholder="ابحث باسم الطالب أو امسح كود الكارنيه..." 
                                value={studentSearch} 
                                onChange={e => setStudentSearch(e.target.value)} 
                                className="w-full p-5 pr-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-black outline-none focus:border-blue-500 focus:bg-white transition-all duration-300 placeholder:text-slate-300" 
                            />
                        </div>
                        {/* Search Results */}
                        <div className="max-h-[350px] overflow-y-auto space-y-3 mb-8 pr-2 custom-scrollbar">
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 z-10">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {productToSell.course_id ? `طلاب كورس ${productToSell.courses?.name || ''} فقط:` : 'نتائج البحث عن الطلاب:'}
                                </h4>
                                {isSearchingStudents && (
                                    <div className="flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase">
                                        <FaSpinner className="animate-spin" /> جاري البحث...
                                    </div>
                                )}
                            </div>

                            {students.length > 0 ? (
                                students.map(student => (
                                    <button 
                                        key={student.id} 
                                        disabled={isSubmitting}
                                        onClick={() => confirmSale(student)}
                                        className="w-full flex justify-between items-center bg-slate-50 p-4 rounded-2xl hover:bg-blue-50/50 border border-transparent hover:border-blue-200 transition-all duration-300 group text-right"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600 font-black text-sm group-hover:scale-110 transition-transform">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-700 group-hover:text-blue-600 transition-colors">{student.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-tighter">{student.unique_id}</p>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-500 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg shadow-emerald-100 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                            {isSubmitting ? '...' : 'تأكيد البيع'}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="py-12 text-center rounded-[2rem] border-2 border-dashed border-slate-100">
                                    <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FaUserCheck size={24} />
                                    </div>
                                    <p className="text-slate-400 font-black text-sm">{studentSearch ? 'لا يوجد طالب مطابق لهذا البحث' : 'ابدأ بكتابة اسم الطالب للبحث عنه'}</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer Actions */}
                        <div className="pt-6 border-t border-slate-100">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <button 
                                    disabled={isSubmitting} 
                                    onClick={handleManualSale} 
                                    className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center gap-2 group"
                                >
                                    <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">⚡</span>
                                    بيع يدوي سريع (بدون ملف طالب)
                                </button>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <button 
                                        onClick={() => setIsPrintEnabled(!isPrintEnabled)} 
                                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                                            isPrintEnabled 
                                            ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                            : 'bg-slate-50 text-slate-400 border-slate-100'
                                        }`}
                                    >
                                        <FaPrint /> {isPrintEnabled ? 'طباعة: تلقائي' : 'طباعة: يدوي'}
                                    </button>
                                    <button 
                                        disabled={isSubmitting} 
                                        onClick={() => setShowSellModal(false)} 
                                        className="flex-1 md:flex-none px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all duration-300 shadow-xl shadow-slate-200"
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
  
        {/* ── 2. SETTLE MODAL ── */}
        {showSettleModal && settleItem && (
            <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto py-10">
                <div className="bg-white rounded-3xl md:rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl shadow-emerald-900/20 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                    <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white p-6 md:p-8 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-white/10">
                                <FaHandshake /> تسوية حسابات المدرسين
                            </div>
                            <h2 className="text-xl md:text-2xl font-black">{settleItem.product_name}</h2>
                            <div className="mt-4 md:mt-6">
                                <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-1 opacity-60">المبلغ المطلوب تسليمه:</p>
                                <div className="text-3xl md:text-5xl font-black flex items-baseline gap-2">
                                    {settleItem.total_owed}
                                    <span className="text-xs md:text-sm font-bold opacity-60 uppercase">ج.م</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/20 blur-[100px] rounded-full"></div>
                    </div>
                    <div className="p-6 md:p-8 space-y-5 md:space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">اسم المستلم الفعلي</label>
                            <div className="relative group">
                                <FaUserCheck className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                                <input 
                                    type="text" 
                                    autoFocus 
                                    placeholder="اسم المدرس أو المساعد المستلم للفلوس..." 
                                    value={settlementData.receiver_name} 
                                    onChange={e => setSettlementData({...settlementData, receiver_name: e.target.value})} 
                                    className="w-full p-4 pr-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all duration-300" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">صفة المستلم</label>
                            <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1.5">
                                {[
                                    { role: 'Teacher', label: 'المدرس الشخصي', icon: '👤' },
                                    { role: 'Assistant', label: 'المساعد الرئيسي', icon: '👨‍💼' },
                                    { role: 'Delegate', label: 'مندوب / سكرتير', icon: '📦' }
                                ].map(item => (
                                    <button 
                                        key={item.role} 
                                        onClick={() => setSettlementData({...settlementData, receiver_role: item.role})} 
                                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${
                                            settlementData.receiver_role === item.role 
                                            ? 'bg-white shadow-lg shadow-emerald-900/10 text-emerald-600 ring-2 ring-emerald-500/20' 
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                        }`}
                                    >
                                        <span className="text-sm">{item.icon}</span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">ملاحظات إضافية</label>
                            <textarea 
                                placeholder="أي تفاصيل أو ملاحظات عن عملية التسليم..." 
                                value={settlementData.notes} 
                                onChange={e => setSettlementData({...settlementData, notes: e.target.value})} 
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all duration-300 min-h-[100px] resize-none"
                            ></textarea>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button 
                                disabled={isSubmitting} 
                                onClick={handleSettleSubmit} 
                                className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all duration-300 flex justify-center items-center gap-3 active:scale-95" 
                            >
                                {isSubmitting ? <FaSpinner className="animate-spin text-xl"/> : <><FaFileInvoiceDollar /> تأكيد التسوية واستلام الإيصال</>}
                            </button>
                            <button 
                                disabled={isSubmitting} 
                                onClick={() => setShowSettleModal(false)} 
                                className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all duration-300" 
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
               </div>
            </div>
        )}
  
        {/* ── 3. REFUND MODAL ── */}
        {showRefundModal && (
            <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto py-10">
                <div className="bg-white rounded-3xl md:rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl shadow-rose-900/20 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                    <div className="bg-gradient-to-br from-rose-900 to-rose-800 text-white p-6 md:p-8 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-rose-300 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-white/10">
                                <FaUndo /> عمليات المرتجعات والتحصيل
                            </div>
                            <h2 className="text-xl md:text-2xl font-black">إرجاع منتج للمخزن</h2>
                            <p className="text-rose-200 text-xs md:text-sm font-bold mt-2">تسجيل عملية إرجاع واسترداد مبلغ البيع</p>
                        </div>
                        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-rose-500/20 blur-[100px] rounded-full"></div>
                    </div>
                    <div className="p-6 md:p-8 space-y-5 md:space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">الكمية المرتجعة</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={refundData.quantity} 
                                    onChange={e => setRefundData({...refundData, quantity: parseInt(e.target.value) || 1})} 
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all duration-300" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">المبلغ المسترد (ج.م)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    value={refundData.refund_amount} 
                                    onChange={e => setRefundData({...refundData, refund_amount: parseFloat(e.target.value) || 0})} 
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-rose-600 outline-none focus:border-rose-500 focus:bg-white transition-all duration-300" 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">سبب الإرجاع</label>
                            <textarea 
                                placeholder="مثال: الطالب انسحب من الكورس / المنتج تالف..." 
                                rows="2" 
                                value={refundData.reason} 
                                onChange={e => setRefundData({...refundData, reason: e.target.value})} 
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all duration-300 min-h-[80px] resize-none" 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">حالة المنتج المرتجع</label>
                            <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1.5">
                                <button 
                                    onClick={() => setRefundData({...refundData, is_damaged: false})} 
                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${
                                        !refundData.is_damaged 
                                        ? 'bg-white shadow-lg shadow-rose-900/10 text-emerald-600 ring-2 ring-emerald-500/10' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`} 
                                >
                                    📦 سليم (مخزن)
                                </button>
                                <button 
                                    onClick={() => setRefundData({...refundData, is_damaged: true})} 
                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${
                                        refundData.is_damaged 
                                        ? 'bg-white shadow-lg shadow-rose-900/10 text-rose-600 ring-2 ring-rose-500/10' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`} 
                                >
                                    🗑️ تالف (هالك)
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">وسيلة رد المبلغ للطالب</label>
                            <div className="bg-slate-50 p-1.5 rounded-2xl flex flex-col gap-2">
                                {refundData.settlement_id ? (
                                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] font-bold text-amber-700 flex items-center gap-2">
                                        ⚠️ تم تسوية هذا المنتج مع المدرس؛ المتاح فقط هو رد المبلغ لمحفظة الطالب.
                                    </div>
                                ) : (
                                    <div className="flex gap-1.5">
                                        <button 
                                            onClick={() => setRefundData({...refundData, refund_method: 'cash'})}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${
                                                refundData.refund_method === 'cash' 
                                                ? 'bg-white shadow-lg shadow-rose-900/10 text-rose-600 ring-2 ring-rose-500/10' 
                                                : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            💵 كاش نقدي
                                        </button>
                                        <button 
                                            onClick={() => setRefundData({...refundData, refund_method: 'wallet'})}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${
                                                refundData.refund_method === 'wallet' 
                                                ? 'bg-white shadow-lg shadow-rose-900/10 text-blue-600 ring-2 ring-blue-500/10' 
                                                : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            💳 محفظة الطالب
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button 
                                disabled={isSubmitting} 
                                onClick={handleRefundSubmit} 
                                className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all duration-300 flex justify-center items-center gap-3 active:scale-95" 
                            >
                                {isSubmitting ? <FaSpinner className="animate-spin text-xl"/> : 'تأكيد عملية الإرجاع'}
                            </button>
                            <button 
                                disabled={isSubmitting} 
                                onClick={() => setShowRefundModal(false)} 
                                className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all duration-300" 
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
  );
}


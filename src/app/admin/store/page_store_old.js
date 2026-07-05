/**
 * TODO (Post-Launch Refactor):
 * - Split StorePage into hooks after 10 centers
 * - Extract analytics logic
 * - Optimize re-renders if INP > 400ms in production
 */

'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { Toaster, toast } from 'react-hot-toast'; 
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, } from 'recharts'
import { 
  FaStore, FaPlus, FaSearch, FaEdit, FaTrash, FaShoppingCart, 
  FaBarcode, FaBook, FaFileAlt, FaHistory, FaUserCheck, FaTimes, 
  FaSave, FaMoneyBillWave, FaChartLine, FaHandshake, FaUserTie, FaEyeSlash,FaEye,
  FaCheckCircle, FaSpinner, FaExclamationTriangle, FaBoxOpen, FaList, FaLayerGroup, FaPrint, FaToggleOn, FaToggleOff, FaUserGraduate, FaChalkboardTeacher, FaTimesCircle, FaTag, FaUser, FaChartPie , FaUndo
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

export default function StorePage() {
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
  const ROWS_PER_PAGE = 20; // عدد الصفوف في الصفحة الواحدة
  const [showReportModal, setShowReportModal] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [centerSettings, setCenterSettings] = useState(null);
  const [productViewMode, setProductViewMode] = useState('grid')
  const [stages, setStages] = useState([]);
  // 📅 متغيرات تقرير الوردية المطور
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]); // التاريخ المختار (افتراضي النهاردة)
  const [reportMode, setReportMode] = useState('daily'); // 'daily' (يومي) أو 'monthly' (شهري)
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [returnsLog, setReturnsLog] = useState([]);
  // حالة للتحكم في مودال معاينة إيصال التسوية
const [showSettlementReceiptModal, setShowSettlementReceiptModal] = useState(false);
const [settlementReceiptData, setSettlementReceiptModalData] = useState(null);

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
    try {
        // 👇 هنا استخدمنا الاسم الصح للجدول
        const { data, error } = await supabase
            .from('center_settings') 
            .select('*')
            .single(); // بنجيب صف واحد بس (لأن دي إعدادات)

        if (error) throw error;
        if (data) setCenterSettings(data);

    } catch (err) {
        console.error("Error fetching center settings:", err);
    }
  };

  // 🆕 دالة جلب المرتجعات من المصدر الأصلي
const fetchReturns = async () => {
    try {
        const { data, error } = await supabase
            .from('store_returns')
            .select(`
                *,
                store_products (name, price, teacher_share, type, courses(grade, instructor, instructors(id, name), name)),
                store_sales (students(name))
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        setReturnsLog(data || []);
    } catch (err) {
        console.error("Error fetching returns:", err);
    }
};


  // تشغيل الدالة أول ما الصفحة تفتح
  useEffect(() => {
    fetchSettings();
  }, []);


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
    const action = currentStatus ? 'استعادة' : 'أرشفة';
    if(!confirm(`هل أنت متأكد من ${action} هذا المنتج؟`)) return;

    const { error } = await supabase
        .from('store_products')
        .update({ is_archived: !currentStatus })
        .eq('id', productId);

    if (error) {
        toast.error('حدث خطأ أثناء التحديث');
    } else {
        toast.success(`تم ${action} المنتج بنجاح`);
        fetchData(); // تحديث القائمة
    }
  };

  // --- 1. Fetch Data ---
const fetchData = async () => {
    setLoading(true);

    // جلب المراحل الدراسية
const { data: stagesData } = await supabase
  .from('educational_stages')
  .select('name')
  .order('sort_order', { ascending: true });
setStages(stagesData || []);

    // 1. جلب المنتجات (كودك القديم)
    const { data: prodData } = await supabase
      .from('store_products')
      .select('*, courses(name, instructor, instructors(id, name), grade)')
      .order('created_at', { ascending: false });
    setProducts(prodData || []);

    // 2. جلب الكورسات (كودك القديم)
    const { data: coursesData } = await supabase.from('courses').select('id, name, instructor, instructors(id, name), grade');
    setCourses(coursesData || []);

    // 👇 3. (جديد) جلب إعدادات السنتر
    const { data: settingsData } = await supabase
      .from('center_settings')  // اسم الجدول الصحيح
      .select('center_name')    // اسم العمود الصحيح
      .maybeSingle();           // maybeSingle أفضل لتجنب الأخطاء لو الجدول فاضي

    if (settingsData?.center_name) {
        setCenterName(settingsData.center_name);
    }

    setLoading(false);
  };

  // دالة جلب المنتجات من المخزن
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*, courses(name, grade, instructor, instructors(id, name))') // بنجيب تفاصيل الكورس والمدرس كمان
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

const fetchSalesLog = async () => {
    try {
        const from = salesPage * ROWS_PER_PAGE;
        const to = from + ROWS_PER_PAGE - 1;
        const { data: sales, count, error } = await supabase
            .from('store_sales') 
            .select(`
                *,
                students ( name, unique_id, phone ),
                store_products (
                    name,
                    type,
                    price,
                    teacher_share,
                    courses (
                        name,
                        grade,
                        instructor,
                        instructors(id, name)
                    )
                ),
                store_settlements (receiver_name, created_at)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to); 

        if (error) throw error;

        setSalesLog(sales || []);
        setSalesCount(count || 0);
    } catch (error) {
        console.error("Error fetching sales log:", error);
    }
  };

const fetchSettlementPackages = async () => {
    try {
      // 👇 التعديل الجذري: غيرنا الجدول لـ store_settlements
      // لأن ده الجدول اللي فيه "كل عملية لوحدها" ومربوط بالمنتجات
      const { data, error } = await supabase
        .from('store_settlements') 
        .select(`
          *,
          store_products (
            name,
            type,
            price,
            courses (
              name,
              grade,
              instructor,
              instructors(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // بنحفظ البيانات في نفس المتغير عشان التقرير يقرأ منها
      setSettlementPackages(data || []);
    } catch (error) {
      console.error("Error fetching settlements:", error);
    }
  };

const fetchUnsettledSales = async () => {
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
    fetchData();
  }, []);

 // 🔄 تحديث البيانات بذكاء (النسخة النهائية)
// 🔄 تحديث البيانات بذكاء (شامل المنتجات والتقرير)
  useEffect(() => {
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

  }, [activeTab, salesPage]);// بيتحدث لما تغير التاب

  // --- Search Logic ---
  useEffect(() => {
    if (!showSellModal) return; 
    const searchStudents = async () => {
        setIsSearchingStudents(true);
        try {
            let query = supabase.from('students').select('id, name, unique_id, enrolled_courses, phone, parent_phone').limit(20); 
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
  }, [showSellModal, studentSearch, productToSell]);

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
    if (!formData.grade) return [];
    return courses.filter(c => c.grade === formData.grade);
  }, [courses, formData.grade]);

  const filteredSearchCourses = useMemo(() => {
    if (!selectedGrade) return courses;
    return courses.filter(c => c.grade === selectedGrade);
  }, [courses, selectedGrade]);

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
            received_date: formData.received_date
        };
        if (isEditing) {
            const { error } = await supabase.from('store_products').update(payload).eq('id', editId);
            if (error) throw error;
            toast.success('تم التعديل بنجاح', { id: loadingToast });
        } else {
            const { error } = await supabase.from('store_products').insert([payload]);
            if (error) throw error;
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
    const loadingToast = toast.loading('جاري الحذف...');
    const { error } = await supabase.from('store_products').delete().eq('id', id);
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
          await supabase.from('store_sales').update({ whatsapp_sent_at: new Date().toISOString(), whatsapp_sent_to: 'parent' }).eq('id', saleId);
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

      const { data: saleId, error } = await supabase.rpc('sell_product_transaction', {
          p_product_id: productToSell.id,
          p_student_id: student.id,
          p_price: productToSell.price,
          p_seller_name: currentUserName || 'Admin'
      });

      if (error) throw error;

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
      fetchData(); 
      
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
        const { error } = await supabase.rpc('sell_product_transaction', {
            p_product_id: productToSell.id,
            p_student_id: null,
            p_price: productToSell.price,
            p_seller_name: currentUserName || 'بيع يدوي'
        });

        if (error) throw error;

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
        fetchData();
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
            product_id: settleItem.product_id
        }])
        .select() // 👈 رجعنا دي عشان نجيب البيانات
        .single(); // 👈 ورجعنا دي عشان نجيب الـ ID
        
        if (error) throw error;
        
        // 3. تحديث المبيعات (الربط برقم التسوية عشان الجدول يفهم إنها مش مرتجع)
        // ⚠️ هنا السر: بنحط settlement_id اللي راجع من الخطوة اللي فاتت
        await supabase.from('store_sales')
            .update({ 
                is_settled: true, 
                settlement_id: insertedSettlement.id // ✅ ده اللي هيخليها تظهر "تم التحاسب"
            }) 
            .eq('product_id', settleItem.product_id)
            .eq('is_settled', false);
        
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
          admin_name: currentUserName
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
          .eq('id', refundData.sale_id);
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
            notes: `إرجاع من حساب ${refundData.receiver_name} - ${refundData.reason}`
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
          fetchSettlementPackages()
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
    // 1. شروط البحث العادية
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    const productGrade = p.courses?.grade;
    const matchesGrade = !selectedGrade || productGrade === selectedGrade;
    const matchesCourse = !selectedCourse || p.course_id === selectedCourse;

    // 🔥 2. الشرط الجديد: لو الاسم فيه كلمة "(ملغي)" أو "(Archived)" مخفيهوش
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 min-h-screen relative">
      <Toaster position="top-center" reverseOrder={false} /> 
      
      {/* ⚠️ تم إزالة الـ Div القديم لأننا بنستخدم Iframe في الخلفية دلوقتي */}

      <div className="">
        {/* Header & Tabs */}
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                        <FaStore className="text-blue-600" /> المتجر ونقاط البيع
                    </h1>
                    <p className="text-gray-500 text-sm font-bold mt-1">إدارة المخزون، المبيعات، والتسويات المالية</p>
                </div>
            </div>

            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <button onClick={() => setActiveTab('products')} className={`flex-1 py-3 px-6 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <FaShoppingCart /> المنتجات والبيع
                </button>
                <button onClick={() => setActiveTab('settlements')} className={`flex-1 py-3 px-6 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'settlements' ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <FaHandshake /> الخزينة والتسويات (المستحق)
                </button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 px-6 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'history' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <FaHistory /> سجل العمليات والتوريد
                </button>
            </div>
        </div>

        {/* 1. Products View */}
  {/* 🛍️ صفحة إدارة المنتجات (المخزن) - النسخة المدمجة الكاملة */}
       {/* 1. Products View */}
        {activeTab === 'products' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* ... (نفس الشريط العلوي والإحصائيات وزر الإضافة كما هي بدون تغيير) ... */}
                {/* ... (نفس شريط البحث والفلترة كما هو) ... */}
                <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className={`p-3 rounded-xl ${showArchived ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>
                            {showArchived ? <FaHistory size={20}/> : <FaStore size={20}/>}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-800">
                                {showArchived ? 'أرشيف المنتجات (المنتهية)' : 'إدارة المنتجات (المخزن)'}
                            </h2>
                            <p className="text-xs text-gray-400 font-bold mt-1">
                                {showArchived ? 'عرض المنتجات المؤرشفة سابقاً' : 'عرض المنتجات النشطة والمتاحة للبيع'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
                        {!showArchived && (
                            <button onClick={() => setShowReportModal(true)} className="bg-black text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition shadow-lg flex items-center gap-2">
                                <FaPrint/> تقرير الوردية
                            </button>
                        )}
                        <div className="w-px h-8 bg-gray-200 mx-1 hidden md:block"></div>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => setProductViewMode('grid')} className={`p-2 rounded-lg transition ${productViewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="عرض كروت"><FaLayerGroup/></button>
                            <button onClick={() => setProductViewMode('list')} className={`p-2 rounded-lg transition ${productViewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="عرض قائمة"><FaList/></button>
                        </div>
                        <button onClick={() => setShowArchived(!showArchived)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${showArchived ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {showArchived ? <FaStore/> : <FaHistory/>} {showArchived ? 'العودة للمخزن' : 'الأرشيف'}
                        </button>
                    </div>
                </div>

                        
                {!showArchived && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-indigo-200 text-xs font-bold mb-1">قيمة المخزن (سعر بيع)</p>
                                    <p className="text-2xl font-black">{inventoryStats.totalValue.toLocaleString()} ج.م</p>
                                </div>
                                <FaStore className="absolute bottom-2 left-2 text-indigo-800 text-4xl opacity-50"/>
                            </div>
                            <div className={`${inventoryStats.lowStockCount > 0 ? 'bg-orange-100 border-orange-200' : 'bg-gray-50 border-gray-100'} border p-4 rounded-2xl shadow-sm flex flex-col justify-center`}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className={`text-xs font-bold ${inventoryStats.lowStockCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>وشيكة النفاذ</p>
                                    {inventoryStats.lowStockCount > 0 && <FaExclamationTriangle className="text-orange-500 animate-pulse"/>}
                                </div>
                                <p className={`text-2xl font-black ${inventoryStats.lowStockCount > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{inventoryStats.lowStockCount} <span className="text-xs font-medium">منتج</span></p>
                            </div>
                            <div className={`${inventoryStats.outOfStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'} border p-4 rounded-2xl shadow-sm flex flex-col justify-center`}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className={`text-xs font-bold ${inventoryStats.outOfStockCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>نفذت من المخزن</p>
                                    {inventoryStats.outOfStockCount > 0 && <FaTimes className="text-red-500"/>}
                                </div>
                                <p className={`text-2xl font-black ${inventoryStats.outOfStockCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>{inventoryStats.outOfStockCount} <span className="text-xs font-medium">منتج</span></p>
                            </div>
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col justify-center">
                                <p className="text-xs font-bold text-gray-400 mb-1">عدد الأصناف</p>
                                <p className="text-2xl font-black text-gray-700">{inventoryStats.totalItems} <span className="text-xs font-medium">صنف</span></p>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => { resetForm(); setIsEditing(false); setShowProductModal(true); }} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                                <FaPlus /> إضافة منتج جديد
                            </button>
                        </div>
                    </>
                )}

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-4">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FaSearch className="text-gray-400"/> فلترة البحث</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <select 
                        value={selectedGrade} 
                        onChange={e => { setSelectedGrade(e.target.value); setSelectedCourse(''); }} 
                        className="p-2 bg-gray-50 rounded-lg border border-gray-200 outline-none text-sm font-bold focus:border-blue-400"
                    >
                        <option value="">-- كل الصفوف --</option>
                        {stages.map((s, idx) => (
                            <option key={idx} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                                            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="p-2 bg-gray-50 rounded-lg border border-gray-200 outline-none text-sm font-bold focus:border-blue-400">
                            <option value="">-- كل المواد --</option>
                            {filteredSearchCourses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.instructors?.name || c.instructor}</option>)}
                        </select>
                        <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
                            {['all', 'note', 'book', 'code'].map(type => (
                                <button key={type} onClick={() => setFilterType(type)} className={`flex-1 rounded-md text-xs font-bold transition py-2 ${filterType === type ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    {type === 'all' ? 'الكل' : getTypeLabel(type)}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <FaSearch className="absolute right-3 top-3 text-gray-400" />
                            <input type="text" placeholder="بحث باسم المنتج..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 pr-10 rounded-lg border border-gray-200 outline-none focus:border-blue-500 text-sm font-bold" />
                        </div>
                    </div>
                </div>

                {/* 4️⃣ عرض المنتجات (Grid / List) */}
                {productViewMode === 'grid' ? (
                    // ✅✅✅ عرض الكروت (Grid View) المعدل ✅✅✅
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts
                            .filter(p => (showArchived ? p.is_archived === true : p.is_archived !== true))
                            .map(product => (
                            <div key={product.id} className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition group relative overflow-hidden ${product.stock <= 5 && !showArchived ? 'border-red-200 bg-red-50/10' : 'border-gray-100'}`}>
                                
                                <div className="absolute top-0 left-0 bg-gray-100 px-3 py-1 rounded-br-xl text-xs font-bold flex items-center gap-1 text-gray-600">
                                     {getTypeIcon(product.type)} {getTypeLabel(product.type)}
                                </div>
                                {product.is_archived && <div className="absolute top-8 left-0 bg-gray-800 text-white px-3 py-1 rounded-br-xl text-[10px] font-bold">محفوظ بالأرشيف 📦</div>}

                                <div className="mt-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-black text-lg text-gray-800 leading-tight">{product.name}</h3>
                                        <div className="flex gap-1 bg-gray-50 p-1 rounded-lg">
                                            <button onClick={() => handleToggleArchive(product.id, product.is_archived)} className={`p-1.5 rounded transition ${showArchived ? 'text-green-500 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}>{showArchived ? <FaStore/> : <FaHistory/>}</button>
                                            <button onClick={() => handleEdit(product)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><FaEdit/></button>
                                            <button onClick={() => handleDelete(product.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><FaTrash/></button>
                                        </div>
                                    </div>

                                    {/* تفاصيل المادة والصف */}
                                    <p className="text-xs text-gray-500 font-bold mb-3 flex items-center gap-1">
                                        {product.courses ? <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">📚 {product.courses.name}</span> : <span className="bg-gray-100 px-2 py-0.5 rounded">عام</span>}
                                        {product.courses && <span className="text-gray-400">({product.courses.grade})</span>}
                                    </p>

                                    {/* 🔥 تفاصيل التوريد الإضافية (طلب المستخدم الجديد) 🔥 */}
                                    <div className="bg-gray-50/50 p-2 rounded-lg mb-3 border border-dashed border-gray-200 text-[10px] text-gray-500 space-y-1.5">
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                                            <span className="flex items-center gap-1"><FaChalkboardTeacher className="text-blue-400"/> المدرس:</span>
                                            <span className="font-bold text-gray-700">{product.courses?.instructors?.name || product.courses?.instructor || 'السنتر'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1"><FaUser className="text-gray-400"/> المستلم:</span>
                                            <span className="font-bold text-gray-700">{product.receiver_name || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1">📅 التاريخ:</span>
                                            <span className="font-mono">{product.received_date || '-'}</span>
                                        </div>
                                        {product.supplier_name && (
                                            <div className="flex justify-between items-center">
                                                <span className="flex items-center gap-1">📦 المورد:</span>
                                                <span className="font-bold text-gray-700">{product.supplier_name}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl mb-4 border border-gray-100">
                                        <div className="text-center"><span className="block text-[10px] text-gray-400 font-bold">السعر</span><span className="font-black text-blue-600 text-lg">{product.price}ج</span></div>
                                        <div className="w-px h-6 bg-gray-200"></div>
                                        <div className="text-center"><span className="block text-[10px] text-gray-400 font-bold flex items-center justify-center gap-1">المخزون {product.stock <= 5 && !product.is_archived && <FaExclamationTriangle className="text-red-500 animate-pulse"/>}</span><span className={`font-black text-lg ${product.stock <= 5 ? 'text-red-500' : 'text-gray-700'}`}>{product.stock}</span></div>
                                        <div className="w-px h-6 bg-gray-200"></div>
                                        <div className="text-center"><span className="block text-[10px] text-gray-400 font-bold">مبيعات</span><span className="font-black text-green-600 text-lg">{product.sold_count || 0}</span></div>
                                    </div>

                                    {!showArchived ? (
                                        <button onClick={() => openSellModal(product)} disabled={product.stock <= 0} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${product.stock > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                                            <FaShoppingCart /> {product.stock > 0 ? 'بيع الآن' : 'نفذت الكمية'}
                                        </button>
                                    ) : (
                                        <div className="w-full py-3 rounded-xl font-bold bg-gray-50 text-gray-400 text-center text-xs border border-dashed border-gray-200">هذا المنتج مؤرشف ولا يمكن بيعه</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // ✅✅✅ عرض القائمة (Table View) المعدل ✅✅✅
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-gray-50 text-gray-600 font-bold text-sm">
                                    <tr>
                                        <th className="p-4">اسم المنتج</th>
                                        <th className="p-4">تفاصيل التوريد</th> 
                                        <th className="p-4">النوع</th>
                                        <th className="p-4">سعر البيع</th>
                                        <th className="p-4">المخزون</th>
                                        {!showArchived && <th className="p-4">إجراءات</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm font-bold text-gray-700">
                                    {filteredProducts
                                        .filter(p => (showArchived ? p.is_archived === true : p.is_archived !== true))
                                        .map(product => (
                                        <tr key={product.id} className="hover:bg-blue-50/50 transition">
                                            <td className="p-4">
                                                <div className="text-gray-800">{product.name}</div>
                                                <div className="text-[10px] text-gray-400 mt-1">{product.courses ? `${product.courses.name} (${product.courses.grade})` : 'عام'}</div>
                                            </td>
                                            {/* بيانات التوريد في الجدول */}
                                            <td className="p-4">
                                                <div className="text-xs space-y-1">
                                                    <div className="text-blue-600">👨‍🏫 {product.courses?.instructors?.name || product.courses?.instructor || 'السنتر'}</div>
                                                    <div className="text-gray-500">📅 {product.received_date || '-'}</div>
                                                    <div className="text-gray-400 text-[10px]">📥 {product.receiver_name}</div>
                                                </div>
                                            </td>
                                            <td className="p-4">{getTypeLabel(product.type)}</td>
                                            <td className="p-4 text-green-600 font-black">{product.price} ج.م</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded ${product.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}>{product.stock}</span></td>
                                            {!showArchived && (
                                                <td className="p-4 flex items-center gap-2">
                                                    <button onClick={() => openSellModal(product)} disabled={product.stock <= 0} className="bg-black text-white px-3 py-1.5 rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50">بيع</button>
                                                    <button onClick={() => handleEdit(product)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><FaEdit/></button>
                                                    <button onClick={() => handleToggleArchive(product.id, false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-2 rounded"><FaHistory/></button>
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
                        <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="bg-gray-50 p-6 flex justify-between items-center border-b sticky top-0 z-10">
                                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                    {isEditing ? <FaEdit className="text-blue-500" /> : <FaPlus className="text-blue-500" />} 
                                    {isEditing ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
                                </h2>
                                <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-red-500 transition bg-white p-2 rounded-full shadow-sm"><FaTimes size={20}/></button>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="lg:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 mb-1 block">اسم المنتج</label>
                                        <input type="text" placeholder="مثال: ملزمة الفصل الأول - فيزياء" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200 font-bold text-gray-700" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block">النوع</label>
                                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200 font-bold text-sm">
                                            <option value="note">📄 ملزمة / شيت</option>
                                            <option value="book">📘 كتاب خارجي</option>
                                            <option value="code">🔐 كود منصة (كارت)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block">الكمية (المخزون)</label>
                                        <input type="number" placeholder="العدد" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200 font-bold text-center" />
                                    </div>
                                    
                                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 lg:col-span-2 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-orange-800 mb-1 block">1. اختر الصف</label>
                                           <select 
                                                value={formData.grade} 
                                                onChange={e => setFormData({...formData, grade: e.target.value, course_id: ''})} 
                                                className="w-full p-2 bg-white rounded-lg border border-orange-200 outline-none text-sm font-bold"
                                            >
                                                <option value="">-- عام --</option>
                                                {stages.map((s, idx) => (
                                                    <option key={idx} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-orange-800 mb-1 block">2. اختر المادة</label>
                                            <select value={formData.course_id} onChange={e => setFormData({...formData, course_id: e.target.value})} className="w-full p-2 bg-white rounded-lg border border-orange-200 outline-none text-sm font-bold" disabled={!formData.grade}>
                                                <option value="">-- اختر المادة --</option>
                                                {filteredFormCourses.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} - {c.instructors?.name || c.instructor}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 lg:col-span-2 grid grid-cols-3 gap-3">
                                        <div><label className="text-[10px] font-bold text-purple-800 mb-1 block">تاريخ الاستلام</label><input type="date" value={formData.received_date} onChange={e => setFormData({...formData, received_date: e.target.value})} className="w-full p-2 text-xs rounded border border-purple-200 font-bold"/></div>
                                        <div><label className="text-[10px] font-bold text-purple-800 mb-1 block">اسم المورد</label><input type="text" placeholder="المطبعة/المكتبة" value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} className="w-full p-2 text-xs rounded border border-purple-200 font-bold"/></div>
                                        <div><label className="text-[10px] font-bold text-purple-800 mb-1 block">اسم المستلم</label><input type="text" placeholder="من استلم؟" value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} className="w-full p-2 text-xs rounded border border-purple-200 font-bold"/></div>
                                    </div>

                                    <div className="lg:col-span-2 grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                        <div><label className="text-[10px] font-bold text-blue-800 block mb-1">سعر البيع للطالب</label><input type="number" placeholder="مثال: 50" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-2 rounded-lg border border-blue-200 text-center font-bold text-blue-700" /></div>
                                        <div><label className="text-[10px] font-bold text-blue-800 block mb-1">نصيب المستر/التكلفة</label><input type="number" placeholder="مثال: 30" required value={formData.teacher_share} onChange={e => setFormData({...formData, teacher_share: e.target.value})} className="w-full p-2 rounded-lg border border-blue-200 text-center font-bold text-red-600" /></div>
                                        <div className="col-span-2 text-center text-xs font-bold text-gray-500 border-t border-blue-200 pt-2 mt-1">صافي ربح السنتر للقطعة: <span className="text-green-600 text-lg font-black">{(formData.price - formData.teacher_share) || 0} جنية</span></div>
                                    </div>

                                    <div className="lg:col-span-4 flex items-center mt-4 pt-4 border-t">
                                        <button disabled={isSubmitting} className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">{isSubmitting ? <FaSpinner className="animate-spin"/> : <FaSave />} {isEditing ? 'حفظ التعديلات' : 'إضافة للمخزون'}</button>
                                        <button type="button" onClick={() => setShowProductModal(false)} className="mr-4 bg-gray-100 text-gray-600 font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition">إلغاء</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
{/* 2. Settlements View (المحفظة المعدلة) */}
{/* 2. Settlements View (المحفظة مع الفلترة) */}
        {activeTab === 'settlements' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* الشريط العلوي: العنوان + زر التقرير + الإجمالي */}
                <div className="bg-green-50 p-6 rounded-2xl border border-green-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-xl font-black text-green-800 flex items-center gap-2">
                            <FaHandshake/> محفظة المستحقات
                        </h2>
                        <p className="text-sm font-bold text-green-600 mt-1">
                            تجميع تلقائي لمستحقات المدرسين (المحفظة)
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setShowReportModal(true)}
                            className="bg-green-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-800 transition shadow-lg shadow-green-200"
                        >
                            <FaPrint/> تقرير الوردية
                        </button>

                        <div className="bg-white px-6 py-3 rounded-xl shadow-sm text-center border border-green-100">
                            <p className="text-xs text-gray-400 font-bold">إجمالي مطلوب دفعه</p>
                            <p className="text-3xl font-black text-gray-800">
                                {unsettledData.reduce((acc, item) => acc + (item.total_owed || 0), 0).toLocaleString()} ج.م
                            </p>
                        </div>
                    </div>
                </div>

{/* 🔍 شريط البحث والفلترة (المعتمد على بعضه) */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. فلتر الصف (الأب) */}
                    <div className="relative">
                        <FaUserGraduate className="absolute right-3 top-3 text-gray-400 z-10"/>
                        <select 
                            value={settlementGrade} 
                            onChange={(e) => {
                                setSettlementGrade(e.target.value);
                                setSettlementTeacher('');
                            }} 
                            className="w-full p-2 pr-10 bg-gray-50 rounded-lg border border-gray-200 outline-none text-sm font-bold focus:border-green-400 appearance-none cursor-pointer"
                        >
                            <option value="">-- كل الصفوف --</option>
                            {stages.map((s, idx) => (
                                <option key={idx} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. فلتر المدرس (الابن - يعتمد على الصف) */}
                    <div className="relative">
                        <FaChalkboardTeacher className="absolute right-3 top-3 text-gray-400 z-10"/>
                        <select 
                            value={settlementTeacher} 
                            onChange={(e) => setSettlementTeacher(e.target.value)} 
                            className="w-full p-2 pr-10 bg-gray-50 rounded-lg border border-gray-200 outline-none text-sm font-bold focus:border-green-400 appearance-none cursor-pointer"
                        >
                            <option value="">-- {settlementGrade ? 'مدرسين الصف المختار' : 'كل المدرسين'} --</option>
                            
                            {/* 🔥 هنا بنعرض القائمة الديناميكية المحسوبة */}
                            {availableSettlementTeachers.map((t, idx) => (
                                <option key={idx} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. بحث بالاسم */}
                    <div className="relative">
                        <FaSearch className="absolute right-3 top-3 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="بحث باسم المدرس أو المنتج..." 
                            value={settlementSearch} 
                            onChange={(e) => setSettlementSearch(e.target.value)} 
                            className="w-full p-2 pr-10 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:border-green-400 text-sm font-bold" 
                        />
                    </div>
                </div>
                {/* عرض كروت المدرسين المجمعة (المفلترة) */}
                <div className="grid grid-cols-1 gap-6">
                    {filteredSettlements.length > 0 ? filteredSettlements.map((group, gIndex) => (
                        <div key={gIndex} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* رأس الكارت: اسم المدرس وإجمالي محفظته */}
                            <div className="bg-gray-50 p-5 border-b border-gray-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                                        {group.instructor.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-gray-800">{group.instructor}</h3>
                                        <p className="text-xs font-bold text-gray-500">له مستحقات عن {group.items.length} أصناف مختلفة</p>
                                    </div>
                                </div>
                                <div className="text-center bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-[10px] text-gray-400 font-bold">إجمالي المحفظة</p>
                                    <p className="text-2xl font-black text-green-600">{group.totalOwed.toLocaleString()} ج.م</p>
                                </div>
                            </div>

                            {/* تفاصيل المنتجات داخل محفظة هذا المدرس */}
                            <div className="divide-y divide-gray-100">
                                {group.items.map((item, iIndex) => (
                                    <div key={iIndex} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-gray-50 transition">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 flex items-center flex-wrap gap-2">
                                                <FaBook className="text-blue-400 text-xs"/> 
                                                {item.product_name}
                                                
                                                {/* بادج الصف الدراسي */}
                                                <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full border border-orange-200">
                                                    {item.grade}
                                                </span>
                                            </h4>
                                            <div className="flex gap-3 mt-1 text-xs text-gray-500 font-bold">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded">مبيعات: {item.sales_count}</span>
                                                <span className="bg-gray-100 px-2 py-0.5 rounded">ربحه في النسخة: {item.teacher_share} ج</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <span className="font-black text-lg text-gray-700">{item.total_owed} ج.م</span>
                                            
                                            {/* زر التسوية */}
                                            <button 
                                                onClick={() => { 
    // 👇 بنضيف اسم المدرس هنا عشان يوصل للمودال والإيصال
    setSettleItem({ ...item, instructor: group.instructor }); 
    setShowSettleModal(true); 
}}
                                                className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition shadow-md flex items-center gap-2"
                                            >
                                                <FaMoneyBillWave/> تسوية ({item.sales_count})
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            {unsettledData.length === 0 ? (
                                <>
                                    <FaCheckCircle className="text-4xl text-green-400 mx-auto mb-3"/>
                                    <p className="text-gray-500 font-bold">لا توجد مستحقات مالية معلقة. تم تسوية جميع الحسابات! 🎉</p>
                                </>
                            ) : (
                                <>
                                    <FaSearch className="text-4xl text-gray-300 mx-auto mb-3"/>
                                    <p className="text-gray-500 font-bold">لا توجد نتائج مطابقة للبحث</p>
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


        {/* 🛑 مودال تقرير الوردية الاحترافي المطور */}
{showReportModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* هيدر التحكم */}
            <div className="bg-gray-900 text-white p-4 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden border-b border-gray-700">
                <h2 className="text-lg font-bold flex items-center gap-2"><FaPrint/> مركز التقارير المالية المطور</h2>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-800 p-1 rounded-lg">
                        <button onClick={() => setReportMode('daily')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${reportMode === 'daily' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>يومي</button>
                        <button onClick={() => setReportMode('monthly')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${reportMode === 'monthly' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>شهري</button>
                    </div>

                    {/* زرار كشف بيانات الإدارة */}
                    <button 
                        onClick={() => setShowAdminView(!showAdminView)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${showAdminView ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                        {showAdminView ? <FaEyeSlash/> : <FaEye/>} {showAdminView ? 'إخفاء التحليل' : 'رؤية المدير'}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 font-bold">التاريخ:</label>
                    <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-blue-500" />
                    <button onClick={() => setShowReportModal(false)} className="bg-gray-800 p-2 rounded-full hover:bg-red-500 transition ml-2"><FaTimes/></button>
                </div>
            </div>

            {/* 🔍 شريط الفلترة المتقدمة (هرمي + استبعاد المؤرشف) */}
            <div className="bg-gray-50 p-4 border-b print:hidden">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 1. فلتر الصف الدراسي */}
                        <div className="relative flex items-center">
                            <FaUserGraduate className="absolute right-3 text-gray-400 size-3 z-10"/>
                            <select 
                                value={reportFilterGrade} 
                                onChange={(e) => { 
                                    setReportFilterGrade(e.target.value); 
                                    setReportFilterTeacher(''); setReportFilterType(''); setSearchTerm(''); 
                                }}
                                className="..."
                            >
                                <option value="">كل الصفوف</option>
                                {stages.map((s, idx) => (
                                    <option key={idx} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                                                    </div>

                        {/* 2. فلتر اسم المدرس */}
                        <div className="relative flex items-center">
                            <FaChalkboardTeacher className="absolute right-3 text-gray-400 size-3 z-10"/>
                            <select 
                                value={reportFilterTeacher}
                                onChange={(e) => { setReportFilterTeacher(e.target.value); setReportFilterType(''); setSearchTerm(''); }}
                                className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold outline-none appearance-none cursor-pointer text-gray-700"
                            >
                                <option value="">كل المدرسين</option>
                                {reportLists.teacherList.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* 3. فلتر النوع */}
                        <div className="relative flex items-center">
                            <FaTag className="absolute right-3 text-gray-400 size-3 z-10"/>
                            <select 
                                value={reportFilterType}
                                onChange={(e) => { setReportFilterType(e.target.value); setSearchTerm(''); }}
                                className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold outline-none appearance-none cursor-pointer text-gray-700"
                            >
                                <option value="">كل الأنواع</option>
                                {reportLists.typeList.map((type, idx) => (
                                    <option key={idx} value={type}>{type === 'note' ? '📄 ملازم' : type === 'book' ? '📘 كتب' : '🔐 أكواد'}</option>
                                ))}
                            </select>
                        </div>

                        {/* 4. فلتر اسم المنتج */}
                        <div className="relative flex items-center">
                            <FaBoxOpen className="absolute right-3 text-gray-400 size-3 z-10"/>
                            <select 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold outline-none appearance-none cursor-pointer text-gray-700"
                            >
                                <option value="">كل المنتجات</option>
                                {reportLists.productList.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    {(reportFilterGrade || reportFilterTeacher || reportFilterType || searchTerm) && (
                        <div className="flex justify-center mt-3">
                            <button onClick={() => { setReportFilterGrade(''); setReportFilterTeacher(''); setReportFilterType(''); setSearchTerm(''); }} className="flex items-center gap-1 text-[10px] font-black text-red-500 hover:underline uppercase tracking-widest">
                                <FaTimesCircle className="size-3"/> مسح كل الفلاتر
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* جسم التقرير القابل للطباعة */}
            <div className="flex-1 overflow-y-auto p-8 bg-white" id="printable-report">
                
                {/* 📊 منطقة ملخص المدير (Dashboard) - تظهر فقط عند التفعيل وتختفي في الطباعة */}
{/* 📊 منطقة ملخص المدير (Dashboard) - النسخة المحدثة لتعكس الربح التشغيلي */}
{showAdminView && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-center bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm print:hidden">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* 1. كارت الإيرادات (المبيعات) */}
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 text-center">
                <p className="text-[10px] font-black text-blue-400 uppercase mb-1">إجمالي الإيرادات (الوارد)</p>
                <p className="text-xl font-black text-blue-700">{reportStats.totalRevenue.toLocaleString()} ج.م</p>
            </div>

            {/* 2. كارت التكلفة التشغيلية (حصص مدرسين مستحقة عن مبيعات اليوم) */}
            {/* ده بيقولك: المبيعات دي مديونة للمدرسين بكام؟ (حتى لو لسه في الدرج) */}
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-center">
                <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">حصص مدرسين (التزام)</p>
                <p className="text-xl font-black text-indigo-700">{reportStats.todayTeacherLiability.toLocaleString()} ج.م</p>
                <p className="text-[8px] text-indigo-300 font-bold mt-1">تستحق عن مبيعات الفترة</p>
            </div>

            {/* 3. كارت صافي الربح (المؤشر الحقيقي للأداء) */}
            {/* ده صافي مكسب السنتر من شغل اليوم */}
            <div className={`${reportStats.centerOperatingProfit >= 0 ? 'bg-emerald-900' : 'bg-red-900'} p-4 rounded-2xl shadow-lg text-center`}>
                <p className="text-[10px] font-black text-white/50 uppercase mb-1">صافي ربح التشغيل</p>
                <p className="text-xl font-black text-white">{reportStats.centerOperatingProfit.toLocaleString()} ج.م</p>
                <p className="text-[8px] text-white/40 font-bold mt-1">مكسب السنتر الفعلي</p>
            </div>
        </div>
        
        {/* الرسم البياني (Profit Margin) - يوضح نسبة الربح من المبيعات */}
        <div className="lg:col-span-5 h-[140px] relative flex items-center justify-center border-r border-gray-100">
            
            {/* النص في المنتصف */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center z-0">
                <span className="text-[8px] font-bold text-gray-400 uppercase">هامش الربح</span>
                <span className={`text-xs font-black ${reportStats.centerOperatingProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
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

                {/* 🏢 هيدر البراندنج (مرتبط بالإعدادات) */}
                <div className="border-b-2 border-black pb-6 mb-6 flex justify-between items-start">
                    <div className="flex gap-4 items-start">
                        {/* اللوجو من الإعدادات */}
                        {centerSettings?.logo_url && (
                            <img src={centerSettings.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg border p-1" />
                        )}
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 mb-1">{reportMode === 'daily' ? 'تقرير إغلاق يومية' : 'تقرير تسويات شهري'}</h1>
                            <p className="text-gray-500 font-bold text-lg">{centerSettings?.center_name || 'Smart Center System'}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{centerSettings?.slogan || 'الإدارة الذكية للمراكز التعليمية'}</p>
                        </div>
                    </div>
                    <div className="text-left bg-gray-50 p-3 rounded-xl border border-gray-200 text-center min-w-[150px]">
                        <p className="text-sm font-bold text-gray-600">{reportMode === 'daily' ? 'عن يوم:' : 'عن شهر:'}</p>
                        <p className="text-black font-mono text-lg font-black">{reportMode === 'daily' ? reportDate : reportDate.slice(0, 7)}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                </div>

                {/* كروت الأرقام الرئيسية (للطباعة) */}
               {/* كروت الأرقام الرئيسية (للطباعة) - النسخة المحاسبية */}
                {/* تم تعديل الـ grid ليكون 5 أعمدة بدلاً من 4 لاستيعاب الكروت الجديدة */}
                <div className="grid grid-cols-5 gap-3 mb-8">
                    
                    {/* 1. إجمالي المبيعات */}
                    <div className="bg-white border-2 border-gray-100 p-3 rounded-xl text-center shadow-sm print:border-black">
                        <p className="text-[10px] text-gray-500 font-bold mb-1">إجمالي المبيعات (الوارد)</p>
                        <p className="text-xl font-black text-blue-600 print:text-black">{reportStats.totalRevenue.toLocaleString()} ج.م</p>
                    </div>

                    {/* 2. ربح السنتر (المهم للإدارة) */}
                    <div className="bg-emerald-50 border-2 border-emerald-100 p-3 rounded-xl text-center shadow-sm print:border-black">
                        <p className="text-[10px] text-emerald-600 font-bold mb-1">صافي ربح السنتر (تشغيل)</p>
                        <p className="text-xl font-black text-emerald-700 print:text-black">{reportStats.centerOperatingProfit.toLocaleString()} ج.م</p>
                        <p className="text-[8px] text-emerald-400 font-bold">نسبة السنتر من مبيعات اليوم</p>
                    </div>

                    {/* 3. إجمالي المصروفات (تسويات) */}
                    <div className="bg-white border-2 border-gray-100 p-3 rounded-xl text-center shadow-sm print:border-black">
                        <p className="text-[10px] text-gray-500 font-bold mb-1">تسويات مدرسين (خارج)</p>
                        <p className="text-xl font-black text-red-600 print:text-black">{reportStats.totalPaidOut.toLocaleString()} ج.م</p>
                        <p className="text-[8px] text-gray-400 font-bold">سداد مستحقات (قديم/جديد)</p>
                    </div>

                    {/* 4. المرتجعات */}
                    <div className="bg-orange-50 border-2 border-orange-200 p-3 rounded-xl text-center shadow-sm print:border-black">
                        <p className="text-[10px] text-orange-600 font-bold mb-1">مرتجعات</p>
                        <p className="text-xl font-black text-orange-600 print:text-black">{(reportStats.totalRefunds || 0).toLocaleString()} ج.م</p>
                    </div>

                    {/* 5. صافي حركة الخزينة (الدرج) */}
                    {/* هنا استخدمنا netCashFlow بدلاً من netCash لتفادي الخطأ */}
                    <div className="bg-gray-900 text-white p-3 rounded-xl text-center shadow-sm print:bg-gray-200 print:text-black print:border-2 print:border-black">
                        <p className="text-[10px] text-gray-400 print:text-gray-600 font-bold mb-1">
                            صافي حركة الخزينة
                        </p>
                        <p className={`text-xl font-black ${reportStats.netCashFlow < 0 ? 'text-red-400 print:text-red-600' : 'text-white print:text-black'}`}>
                            {reportStats.netCashFlow.toLocaleString()} ج.م
                        </p>
                        {/* رسالة توضيحية لو الرقم سالب */}
                        {reportStats.netCashFlow < 0 && <p className="text-[8px] text-red-300 font-bold print:hidden">تم سداد التزامات سابقة</p>}
                    </div>
                </div>

                {/* الجداول التفصيلية */}
                {reportMode === 'daily' ? (
                    <div className="space-y-8">
                        {/* جدول مبيعات اليوم */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 border-r-4 border-blue-500 pr-3 flex items-center gap-2">تفاصيل المبيعات <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{reportStats.sales.length} عملية</span></h3>
                            <table className="w-full text-sm text-right border border-gray-300">
                                <thead className="bg-blue-50 text-gray-900 font-bold border-b border-blue-200">
                                    <tr>
                                        <th className="p-2 border-l">اسم المنتج</th>
                                        <th className="p-2 border-l">الطالب</th>
                                        <th className="p-2 border-l">الصف</th>
                                        <th className="p-2 border-l">المدرس</th>
                                        <th className="p-2 text-left font-black pr-4">السعر</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {reportStats.sales.map((sale, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="p-2 border-l font-bold text-gray-800">{sale.store_products?.name}</td>
                                            <td className="p-2 border-l text-blue-600 font-bold text-xs">{sale.students?.name || 'زائر'}</td>
                                            <td className="p-2 border-l text-xs"><span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{sale.store_products?.courses?.grade || 'عام'}</span></td>
                                            <td className="p-2 border-l text-xs font-bold text-gray-600">{sale.store_products?.courses?.instructors?.name || sale.store_products?.courses?.instructor || '-'}</td>
                                            <td className="p-2 font-black text-green-700 text-left pr-4">{sale.price_sold || sale.store_products?.price} ج.م</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

{/* جدول المصروفات اليومي (التسويات) - النسخة النهائية الصحيحة */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 border-r-4 border-red-500 pr-3 text-right">تفاصيل المصروفات (التسويات اليومية)</h3>
                            <table className="w-full text-sm text-right border border-gray-300">
                                <thead className="bg-red-50 text-gray-900 font-bold border-b border-red-200">
                                    <tr>
                                        <th className="p-2 border-l">اسم المنتج</th>
                                        <th className="p-2 border-l text-center">النوع</th>
                                        <th className="p-2 border-l text-center">العدد</th>
                                        <th className="p-2 border-l text-center">الصف</th>
                                        <th className="p-2 border-l text-center">المدرس</th>
                                        <th className="p-2 border-l text-center">المستلم</th>
                                        <th className="p-2 border-l text-center">الموظف</th>
                                        <th className="p-2 border-l text-center">الوقت</th>
                                        <th className="p-2 text-left font-black pr-4">المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {reportStats.settlements.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-red-50/10">
                                            {/* 1. اسم المنتج */}
                                            <td className="p-2 border-l font-bold text-gray-800">
                                                {item.store_products?.name || 'تسوية يدوية'}
                                            </td>

                                            {/* 2. النوع (من store_products.type) */}
                                            <td className="p-2 border-l text-center text-xs">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    item.store_products?.type === 'note' ? 'bg-blue-100 text-blue-600' :
                                                    item.store_products?.type === 'book' ? 'bg-amber-100 text-amber-600' :
                                                    item.store_products?.type === 'code' ? 'bg-purple-100 text-purple-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {item.store_products?.type === 'note' ? 'مذكرة' : 
                                                     item.store_products?.type === 'book' ? 'كتاب' : 
                                                     item.store_products?.type === 'code' ? 'كود' : 'عام'}
                                                </span>
                                            </td>

                                            {/* 3. العدد */}
                                            <td className="p-2 border-l text-center font-black text-gray-700">
                                                {item.total_count || 0}
                                            </td>

                                            {/* 4. الصف */}
                                            <td className="p-2 border-l text-center text-xs">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{item.store_products?.courses?.grade || 'عام'}</span>
                                            </td>

                                            {/* 5. المدرس */}
                                            <td className="p-2 border-l text-center text-xs font-bold text-gray-600">
                                                {item.store_products?.courses?.instructors?.name || item.store_products?.courses?.instructor || '-'}
                                            </td>

                                            {/* 6. المستلم */}
                                            <td className="p-2 border-l text-center text-xs font-bold text-gray-600">
                                                {item.receiver_name}
                                            </td>

                                            {/* 7. الموظف (من store_settlements.admin_name) */}
                                            <td className="p-2 border-l text-center text-xs text-gray-500">
                                                {item.admin_name || 'غير مسجل'}
                                            </td>

                                            {/* 8. الوقت */}
                                            <td className="p-2 border-l text-center font-mono text-[10px]">
                                                {new Date(item.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
                                            </td>

                                            {/* 9. المبلغ */}
                                            <td className="p-2 font-black text-red-600 text-left pr-4">
                                                {item.total_amount} ج.م
                                            </td>
                                        </tr>
                                    ))}
                                    {reportStats.settlements.length === 0 && (
                                        <tr>
                                            <td colSpan="9" className="text-center py-4 text-gray-400">لا توجد تسويات مسجلة اليوم</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

{/* جدول المرتجعات اليومي - نسخة نظيفة بدون أخطاء */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 border-r-4 border-orange-500 pr-3 text-right flex items-center gap-2">
                                تفاصيل المرتجعات اليومية 
                                <span className="text-xs font-normal text-gray-500 bg-orange-100 px-2 py-1 rounded-full">{reportStats.refunds?.length || 0} عملية</span>
                            </h3>
                            <table className="w-full text-sm text-right border border-gray-300">
                                <thead className="bg-orange-50 text-gray-900 font-bold border-b border-orange-200">
                                    <tr>
                                        <th className="p-2 border-l">اسم المنتج</th>
                                        <th className="p-2 border-l text-center">النوع</th>
                                        <th className="p-2 border-l text-center">العدد</th>
                                        <th className="p-2 border-l text-center">الصف</th>
                                        <th className="p-2 border-l text-center">المدرس</th>
                                        <th className="p-2 border-l text-center">الطالب</th>
                                        <th className="p-2 border-l text-center">السبب</th>
                                        <th className="p-2 border-l text-center">طريقة الإرجاع</th>
                                        <th className="p-2 border-l text-center">الموظف</th>
                                        <th className="p-2 text-left font-black pr-4">المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {reportStats.refunds?.map((refund, idx) => (
                                        <tr key={idx} className="hover:bg-orange-50/10">
                                            {/* 1. اسم المنتج */}
                                            <td className="p-2 border-l font-bold text-gray-800">
                                                {refund.store_products?.name}
                                            </td>

                                            {/* 2. النوع */}
                                            <td className="p-2 border-l text-center text-xs">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    (refund.store_products?.type?.toLowerCase() === 'note') ? 'bg-blue-100 text-blue-600' :
                                                    (refund.store_products?.type?.toLowerCase() === 'book') ? 'bg-amber-100 text-amber-600' :
                                                    (refund.store_products?.type?.toLowerCase() === 'code') ? 'bg-purple-100 text-purple-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {(() => {
                                                        const type = refund.store_products?.type?.toLowerCase();
                                                        if (type === 'note') return 'مذكرة';
                                                        if (type === 'book') return 'كتاب';
                                                        if (type === 'code') return 'كود';
                                                        return refund.store_products?.type || 'عام';
                                                    })()}
                                                </span>
                                            </td>

                                            {/* 3. العدد */}
                                            <td className="p-2 border-l text-center font-black text-gray-700">
                                                {refund.quantity || 1}
                                            </td>

                                            {/* 4. الصف */}
                                            <td className="p-2 border-l text-center text-xs">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{refund.store_products?.courses?.grade || 'عام'}</span>
                                            </td>

                                            {/* 5. المدرس */}
                                            <td className="p-2 border-l text-center text-xs font-bold text-gray-600">
                                                {refund.store_products?.courses?.instructors?.name || refund.store_products?.courses?.instructor || '-'}
                                            </td>

                                            {/* 6. الطالب */}
                                            <td className="p-2 border-l text-blue-600 font-bold text-xs">
                                                {refund.store_sales?.students?.name || 'زائر'}
                                            </td>

                                            {/* 7. السبب */}
                                            <td className="p-2 border-l text-xs text-gray-600">
                                                {refund.reason}
                                            </td>

                                            {/* 8. طريقة الإرجاع */}
                                            <td className="p-2 border-l text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    refund.refund_method === 'center_account' ? 'bg-purple-100 text-purple-600' :
                                                    refund.refund_method === 'cash' ? 'bg-green-100 text-green-600' :
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {refund.refund_method === 'center_account' ? 'السنتر' :
                                                     refund.refund_method === 'cash' ? 'كاش' : 'رصيد'}
                                                </span>
                                            </td>

                                            {/* 9. الموظف */}
                                            <td className="p-2 border-l text-center text-xs text-gray-500">
                                                {refund.admin_name || 'غير مسجل'}
                                            </td>

                                            {/* 10. المبلغ */}
                                            <td className="p-2 font-black text-orange-600 text-left pr-4">
                                                {refund.refund_amount} ج.م
                                            </td>
                                        </tr>
                                    ))}
                                    {(!reportStats.refunds || reportStats.refunds.length === 0) && (
                                        <tr>
                                            <td colSpan="10" className="text-center py-4 text-gray-400">لا توجد مرتجعات اليوم</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                                    <th className="p-3 border-l text-center">العدد</th>
                                    <th className="p-3 border-l text-center">إجمالي المبيعات (بعد خصم نسبة السنتر)</th>
                                    <th className="p-3 text-center">المبلغ المنصرف</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {reportStats.settlementsAnalysis.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-purple-50/20">
                                       <td className="p-3 border-l">
                                            <div className="font-bold text-gray-800 text-sm">{row.teacher}</div>
                                            
                                            {/* عرض قائمة المستلمين المجمعة (عشان لو كذا حد استلم لنفس المدرس يظهروا كلهم) */}
                                            <div className="text-[10px] text-gray-500 font-medium mt-1 flex items-center gap-1">
                                                <FaUser className="text-[8px]"/> استلام: {row.receiverDisplay}
                                            </div>
                                        </td>
                                        <td className="p-3 border-l text-gray-600">
                                            <div className="font-bold">{row.product}</div>
                                            <div className="text-[9px]">{row.grade} - {row.subject}</div>
                                        </td>
                                        {/* ✅ عرض العدد هنا */}
                                        <td className="p-3 border-l text-center font-black text-gray-700 bg-gray-50">
                                            {row.count}
                                        </td>
                                        <td className="p-3 border-l text-center font-bold text-green-600">
                                            {row.salesRevenue?.toLocaleString() || 0} ج.م
                                        </td>
                                        <td className="p-3 text-center font-bold text-red-600">
                                            {row.paid?.toLocaleString() || row.total?.toLocaleString()} ج.م
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100 font-black">
                                <tr>
                                    {/* ✅ تعديل الـ colSpan عشان يغطي العمود الجديد (العدد) */}
                                    <td className="p-3 border-l text-left pl-4" colSpan="4">إجمالي المنصرف الكلي للمدرسين</td>
                                    <td className="p-3 text-red-600 text-center">{(reportStats.totalPaidOut).toLocaleString()} ج.م</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* 📋 التذييل: الباركود والتوقيعات */}
                <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between items-center print:mt-12">
                    <div className="flex gap-20">
                        <div className="text-center">
                            <p className="font-bold text-xs mb-10 tracking-widest uppercase">المحاسب المسؤول</p>
                            <div className="border-t border-black w-32 mx-auto"></div>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-xs mb-10 tracking-widest uppercase">مدير المركز</p>
                            <div className="border-t border-black w-32 mx-auto"></div>
                        </div>
                    </div>
                    
                    {/* باركود التحقق الرقمي (للطباعة) */}
                    <div className="hidden print:flex flex-col items-center gap-1">
                        <QRCodeSVG 
                            value={`SmartCenter-Report | Center: ${centerSettings?.center_name} | Date: ${reportDate} | Net: ${reportStats.netCash}`} 
                            size={70} 
                            level="H"
                        />
                        <span className="text-[7px] font-black text-gray-300 tracking-tighter">VERIFIED OFFICIAL REPORT</span>
                    </div>
                </div>

                {/* معلومات الاتصال السفلية للبراندنج */}
                <div className="hidden print:block text-center mt-6 border-t pt-2 border-dashed">
                    <p className="text-[9px] text-gray-400 font-bold">
                        {centerSettings?.address} {centerSettings?.phone && ` | هاتف: ${centerSettings.phone}`}
                    </p>
                </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-200 print:hidden">
                <button 
onClick={() => {
    const printElement = document.getElementById('printable-report');
    if (!printElement) {
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
    <div className="space-y-6 animate-in slide-in-from-top duration-300">
        
        {/* 1️⃣ لوحة الموقف المالي الحي */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* كارت الكاش في الدرج */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-6 rounded-3xl shadow-lg shadow-emerald-100 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                <div className="relative z-10">
                    <h3 className="text-emerald-100 font-bold text-sm mb-2">💵 الكاش في الدرج</h3>
                    <p className="text-4xl font-black">{liveFinancials.totalCashInDrawer.toLocaleString()}<span className="text-lg font-medium mr-1">ج.م</span></p>
                    <p className="text-[10px] text-emerald-100 mt-2 font-medium opacity-80">إيراد المبيعات الحالية</p>
                </div>
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm shadow-inner">
                    <FaMoneyBillWave size={32} className="text-white"/>
                </div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition"></div>
            </div>

            {/* كارت مديونية المدرسين */}
            <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white p-6 rounded-3xl shadow-lg shadow-rose-100 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                <div className="relative z-10">
                    <h3 className="text-rose-100 font-bold text-sm mb-2">🛑 مستحقات مدرسين</h3>
                    <p className="text-4xl font-black">{liveFinancials.totalDebtToTeachers.toLocaleString()}<span className="text-lg font-medium mr-1">ج.م</span></p>
                    <p className="text-[10px] text-rose-100 mt-2 font-medium opacity-80">أمانات يجب تسليمها</p>
                </div>
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm shadow-inner">
                    <FaHandshake size={32} className="text-white"/>
                </div>
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition"></div>
            </div>

            {/* كارت ربح السنتر */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-3xl shadow-lg shadow-blue-100 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                <div className="relative z-10">
                    <h3 className="text-blue-100 font-bold text-sm mb-2">📈 صافي ربح السنتر</h3>
                    <p className="text-4xl font-black">{liveFinancials.totalExpectedProfit.toLocaleString()}<span className="text-lg font-medium mr-1">ج.م</span></p>
                    <p className="text-[10px] text-blue-100 mt-2 font-medium opacity-80">أرباح تحت التحصيل</p>
                </div>
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm shadow-inner">
                    <FaChartLine size={32} className="text-white"/>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition"></div>
            </div>
        </div>

        {/* أزرار التنقل بين السجلات */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit mx-auto">
            <button onClick={() => setHistoryView('sales')} className={`px-6 py-2 rounded-lg text-xs font-bold transition ${historyView === 'sales' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>
                <FaList className="inline ml-2"/> مبيعات فردية
            </button>
            <button onClick={() => setHistoryView('packages')} className={`px-6 py-2 rounded-lg text-xs font-bold transition ${historyView === 'packages' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>
                <FaBoxOpen className="inline ml-2"/> سجل التوريد (باقات)
            </button>
            <button onClick={() => setHistoryView('returns')} className={`px-6 py-2 rounded-lg text-xs font-bold transition ${historyView === 'returns' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>
                <FaUndo className="inline ml-2"/> سجل المرتجعات
            </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
            
            {/* 🔍 شريط الفلاتر الموحد (يظهر لكل الأقسام) */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                <div className="flex items-center gap-2 mb-3 text-gray-500 font-bold text-xs">
                    <FaSearch /> تصفية السجلات
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {/* 1. الصف الدراسي */}
                    <select 
                        value={historyFilter.grade} 
                        onChange={e => setHistoryFilter({...historyFilter, grade: e.target.value})}
                        className="p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                    >
                        <option value="">كل الصفوف</option>
                        <option value="1 Prep">1 إعدادي</option><option value="2 Prep">2 إعدادي</option><option value="3 Prep">3 إعدادي</option>
                        <option value="1 Sec">1 ثانوي</option><option value="2 Sec">2 ثانوي</option><option value="3 Sec">3 ثانوي</option>
                    </select>

                    {/* 2. المدرس */}
                    <select 
                        value={historyFilter.teacher} 
                        onChange={e => setHistoryFilter({...historyFilter, teacher: e.target.value})}
                        className="p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                    >
                        <option value="">كل المدرسين</option>
                        {historyLists.teachers.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                    </select>

                    {/* 3. الكورس / المادة */}
                    <select 
                        value={historyFilter.course} 
                        onChange={e => setHistoryFilter({...historyFilter, course: e.target.value})}
                        className="p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                    >
                        <option value="">كل المواد</option>
                        {historyLists.coursesList.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                    </select>

                    {/* 4. نوع المنتج */}
                    <select 
                        value={historyFilter.type} 
                        onChange={e => setHistoryFilter({...historyFilter, type: e.target.value})}
                        className="p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                    >
                        <option value="">كل الأنواع</option>
                        <option value="note">📄 ملازم</option>
                        <option value="book">📘 كتب</option>
                        <option value="code">🔐 أكواد</option>
                    </select>

                    {/* 5. اسم المنتج (بحث) */}
                    <input 
                        type="text" 
                        placeholder="بحث باسم المنتج..." 
                        value={historyFilter.search} 
                        onChange={e => setHistoryFilter({...historyFilter, search: e.target.value})}
                        className="p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                    />
                </div>
                
                {/* زر مسح الفلاتر */}
                {(historyFilter.grade || historyFilter.teacher || historyFilter.course || historyFilter.type || historyFilter.search) && (
                    <div className="mt-3 text-center">
                        <button 
                            onClick={() => setHistoryFilter({grade: '', teacher: '', course: '', type: '', search: ''})}
                            className="text-red-500 text-[10px] font-bold hover:underline"
                        >
                            <FaTimesCircle className="inline"/> مسح الفلاتر
                        </button>
                    </div>
                )}
            </div>

            {/* ================= القسم الأول: مبيعات فردية ================= */}
            {historyView === 'sales' && (
                <>
<div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-gray-50 text-gray-600 font-bold text-sm border-b">
                                <tr>
                                    <th className="p-3 border-l whitespace-nowrap">المنتج</th>
                                    <th className="p-3 border-l text-center whitespace-nowrap">النوع</th>
                                    <th className="p-3 border-l text-center whitespace-nowrap">العدد</th>
                                    <th className="p-3 border-l text-center whitespace-nowrap">المدرس</th>
                                    <th className="p-3 border-l whitespace-nowrap">الطالب</th>
                                    <th className="p-3 border-l text-center whitespace-nowrap">الموظف</th>
                                    <th className="p-3 border-l text-center whitespace-nowrap">السعر</th>
                                    <th className="p-3 border-l text-center whitespace-nowrap">التاريخ</th>
                                    <th className="p-3 border-l text-center whitespace-nowrap">الحالة المالية</th>
                                    <th className="p-3 whitespace-nowrap">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {filteredHistorySales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-blue-50/30 transition-colors">
                                        
                                        {/* 1. المنتج */}
                                        <td className="p-3 border-l font-bold text-gray-800">
                                            {sale.store_products?.name || 'منتج محذوف'}
                                        </td>

                                        {/* 2. النوع */}
                                        <td className="p-3 border-l text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                (sale.store_products?.type?.toLowerCase() === 'note') ? 'bg-blue-100 text-blue-600' :
                                                (sale.store_products?.type?.toLowerCase() === 'book') ? 'bg-amber-100 text-amber-600' :
                                                (sale.store_products?.type?.toLowerCase() === 'code') ? 'bg-purple-100 text-purple-600' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {(() => {
                                                    const type = sale.store_products?.type?.toLowerCase();
                                                    if (type === 'note') return 'مذكرة';
                                                    if (type === 'book') return 'كتاب';
                                                    if (type === 'code') return 'كود';
                                                    return sale.store_products?.type || 'عام';
                                                })()}
                                            </span>
                                        </td>

                                        {/* 3. العدد */}
                                        <td className="p-3 border-l text-center font-black text-gray-700">
                                            1
                                        </td>

                                        {/* 4. المدرس */}
                                        <td className="p-3 border-l text-center text-xs font-bold text-gray-600">
                                            {sale.store_products?.courses?.instructors?.name || sale.store_products?.courses?.instructor || '-'}
                                        </td>

                                        {/* 5. الطالب */}
                                        <td className="p-3 border-l">
                                            {sale.students ? (
                                                <div>
                                                    <div className="font-bold text-blue-600">{sale.students.name}</div>
                                                    <div className="text-[10px] text-gray-400">{sale.students.unique_id}</div>
                                                </div>
                                            ) : <span className="text-gray-400 italic text-xs">بيع زائر/يدوي</span>}
                                        </td>

                                        {/* 6. الموظف */}
                                        <td className="p-3 border-l text-center text-xs text-gray-500">
                                            {sale.seller_name || 'غير مسجل'}
                                        </td>

                                        {/* 7. السعر */}
                                        <td className="p-3 border-l text-center font-black text-green-600">
                                            {sale.price_sold} ج.م
                                        </td>

                                        {/* 8. التاريخ */}
                                        <td className="p-3 border-l text-center font-mono text-xs text-gray-500">
                                            <div dir="ltr">{new Date(sale.created_at).toLocaleDateString('en-GB')}</div>
                                            <div dir="ltr" className="text-[10px] text-gray-400">{new Date(sale.created_at).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</div>
                                        </td>

                                        {/* 9. الحالة المالية */}
                                        <td className="p-3 border-l text-center">
                                            {sale.is_settled ? (
                                                !sale.settlement_id ? (
                                                    <span className="inline-flex items-center gap-1 text-orange-600 text-[10px] font-bold bg-orange-50 px-2 py-1 rounded">
                                                        <FaTimesCircle/> مرتجع
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-green-600 text-[10px] font-bold bg-green-50 px-2 py-1 rounded">
                                                        <FaCheckCircle/> تم التحاسب
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-orange-500 text-[10px] font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                                    معلق (غير مسدد للمستر)
                                                </span>
                                            )}
                                        </td>

                                        {/* 10. الإجراءات */}
                                        <td className="p-3 text-center">
                                            {sale.is_settled || (sale.notes && sale.notes.includes('مرجع:')) ? (
                                                <span className="text-gray-300 text-xs">
                                                    -
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={() => handleRefundSale(sale)} 
                                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 text-xs font-bold transition-colors flex items-center gap-1 mx-auto"
                                                    title="إرجاع المنتج"
                                                >
                                                    <FaTimes /> إرجاع
                                                </button>
                                            )}
                                        </td>

                                    </tr>
                                ))}
                                {filteredHistorySales.length === 0 && (
                                    <tr>
                                        <td colSpan="10" className="text-center py-8 text-gray-400 bg-gray-50/50">
                                            لا توجد مبيعات مطابقة للفلاتر
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="text-xs font-bold text-gray-500">
                            عرض {filteredHistorySales.length} من أصل {salesCount} عملية (في الصفحة الحالية)
                        </div>
                        <div className="flex items-center gap-2">
                            <button disabled={salesPage === 0} onClick={() => setSalesPage(prev => prev - 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition">السابق</button>
                            <span className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">{salesPage + 1}</span>
                            <button disabled={(salesPage + 1) * ROWS_PER_PAGE >= salesCount} onClick={() => setSalesPage(prev => prev + 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition">التالي</button>
                        </div>
                    </div>
                </>
            )}

            {/* ================= القسم الثاني: سجل التوريد (باقات) ================= */}
{/* ================= القسم الثاني: سجل التوريد (باقات) ================= */}
            {historyView === 'packages' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-green-50 text-green-800 font-bold text-sm">
                            <tr>
                                <th className="p-3 rounded-tr-lg">اسم المنتج</th>
                                <th className="p-3">الصف الدراسي</th>
                                <th className="p-3">اسم المدرس</th>
                                <th className="p-3">تاريخ التسليم</th>
                                <th className="p-3">المستلم</th>
                                <th className="p-3">الصفة</th>
                                <th className="p-3">العدد</th>
                                <th className="p-3">المبلغ الإجمالي</th>
                                <th className="p-3">سلم بواسطة</th>
                                <th className="p-3">ملاحظات</th>
                                {/* 👇 1. عمود الطباعة الجديد */}
                                <th className="p-3 rounded-tl-lg text-center">طباعة</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {settlementPackages.filter(pack => {
                                const product = pack.store_products || {};
                                const course = product.courses || {};
                                if (historyFilter.grade && course.grade !== historyFilter.grade) return false;
                                if (historyFilter.teacher && (course.instructors?.name !== historyFilter.teacher && course.instructor !== historyFilter.teacher)) return false;
                                if (historyFilter.course && course.name !== historyFilter.course) return false;
                                if (historyFilter.type && product.type !== historyFilter.type) return false;
                                if (historyFilter.search && !product.name?.toLowerCase().includes(historyFilter.search.toLowerCase())) return false;
                                return true;
                            }).map(pack => (
                                <tr key={pack.id} className="border-b hover:bg-green-50/50 transition">
                                    <td className="p-3 font-bold text-gray-800">
                                        {pack.store_products?.name || <span className="text-red-400">منتج محذوف</span>}
                                    </td>
                                    <td className="p-3">
                                        <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-100">
                                            {pack.store_products?.courses?.grade || 'عام'}
                                        </span>
                                    </td>
                                    <td className="p-3 font-bold text-blue-600 text-xs">
                                        {pack.store_products?.courses?.instructors?.name || pack.store_products?.courses?.instructor || 'السنتر'}
                                    </td>
                                    <td className="p-3 font-mono text-gray-600">
                                        {new Date(pack.created_at).toLocaleString('ar-EG')}
                                    </td>
                                    <td className="p-3 font-bold text-gray-800">
                                        {pack.receiver_name}
                                    </td>
                                    <td className="p-3">
                                        <span className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-bold text-gray-500">
                                            {pack.receiver_role === 'Teacher' ? 'مدرس' : pack.receiver_role === 'Assistant' ? 'مساعد' : 'مندوب'}
                                        </span>
                                    </td>
                                    <td className="p-3 font-bold text-blue-600 text-lg">
                                        {pack.total_count}
                                    </td>
                                    <td className="p-3 font-black text-green-600 text-lg">
                                        {pack.total_amount} ج.م
                                    </td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {pack.admin_name}
                                    </td>
                                    <td className="p-3 text-xs text-gray-400 italic">
                                        {pack.notes || '-'}
                                    </td>
                                    
                                    {/* 👇 2. زر الطباعة */}
                                    <td className="p-3 text-center">
                                        <button 
                                            onClick={() => handleReprintSettlement(pack)}
                                            className="text-gray-500 hover:text-black hover:bg-gray-200 p-2 rounded-lg transition"
                                            title="إعادة طباعة الإيصال"
                                        >
                                            <FaPrint size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {settlementPackages.filter(pack => {
                                const product = pack.store_products || {};
                                const course = product.courses || {};
                                if (historyFilter.grade && course.grade !== historyFilter.grade) return false;
                                if (historyFilter.teacher && (course.instructors?.name !== historyFilter.teacher && course.instructor !== historyFilter.teacher)) return false;
                                if (historyFilter.course && course.name !== historyFilter.course) return false;
                                if (historyFilter.type && product.type !== historyFilter.type) return false;
                                if (historyFilter.search && !product.name?.toLowerCase().includes(historyFilter.search.toLowerCase())) return false;
                                return true;
                            }).length === 0 && (
                                <tr>
                                    <td colSpan="11" className="text-center py-8 text-gray-400">لا توجد عمليات توريد مطابقة للفلاتر</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ================= القسم الثالث: سجل المرتجعات ================= */}
            {historyView === 'returns' && (
<div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-red-50 text-red-800 font-bold text-sm border-b border-red-100">
                            <tr>
                                <th className="p-3 border-l whitespace-nowrap">المنتج</th>
                                <th className="p-3 border-l text-center whitespace-nowrap">النوع</th>
                                <th className="p-3 border-l text-center whitespace-nowrap">العدد</th>
                                <th className="p-3 border-l text-center whitespace-nowrap">المدرس</th>
                                <th className="p-3 border-l whitespace-nowrap">الطالب</th>
                                <th className="p-3 border-l text-center whitespace-nowrap">الموظف</th>
                                <th className="p-3 border-l text-center whitespace-nowrap">الحالة (المصير)</th>
                                <th className="p-3 border-l text-center whitespace-nowrap">المبلغ المرتجع</th>
                                <th className="p-3 border-l whitespace-nowrap">السبب</th>
                                <th className="p-3 whitespace-nowrap">التاريخ</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-red-50">
                            {returnsLog.filter(refund => {
                                const product = refund.store_products || {};
                                const course = product.courses || {};
                                if (historyFilter.grade && course.grade !== historyFilter.grade) return false;
                                if (historyFilter.teacher && (course.instructors?.name !== historyFilter.teacher && course.instructor !== historyFilter.teacher)) return false;
                                if (historyFilter.course && course.name !== historyFilter.course) return false;
                                if (historyFilter.type && product.type !== historyFilter.type) return false;
                                if (historyFilter.search && !product.name?.toLowerCase().includes(historyFilter.search.toLowerCase())) return false;
                                return true;
                            }).map(refund => (
                                <tr key={refund.id} className="hover:bg-red-50/40 transition-colors">
                                    
                                    {/* 1. المنتج */}
                                    <td className="p-3 border-l font-bold text-gray-800">
                                        {refund.store_products?.name || 'منتج محذوف'}
                                    </td>

                                    {/* 2. النوع */}
                                    <td className="p-3 border-l text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            (refund.store_products?.type?.toLowerCase() === 'note') ? 'bg-blue-100 text-blue-600' :
                                            (refund.store_products?.type?.toLowerCase() === 'book') ? 'bg-amber-100 text-amber-600' :
                                            (refund.store_products?.type?.toLowerCase() === 'code') ? 'bg-purple-100 text-purple-600' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {(() => {
                                                const type = refund.store_products?.type?.toLowerCase();
                                                if (type === 'note') return 'مذكرة';
                                                if (type === 'book') return 'كتاب';
                                                if (type === 'code') return 'كود';
                                                return refund.store_products?.type || 'عام';
                                            })()}
                                        </span>
                                    </td>

                                    {/* 3. العدد */}
                                    <td className="p-3 border-l text-center font-black text-gray-700">
                                        {refund.quantity}
                                    </td>

                                    {/* 4. المدرس */}
                                    <td className="p-3 border-l text-center text-xs font-bold text-gray-600">
                                        {refund.store_products?.courses?.instructors?.name || refund.store_products?.courses?.instructor || '-'}
                                    </td>

                                    {/* 5. الطالب */}
                                    <td className="p-3 border-l text-blue-600 text-xs font-bold">
                                        {refund.store_sales?.students?.name || 'زائر'}
                                    </td>

                                    {/* 6. الموظف */}
                                    <td className="p-3 border-l text-center text-xs text-gray-500">
                                        {refund.admin_name || 'غير مسجل'}
                                    </td>
                                    
                                    {/* 7. الحالة */}
                                    <td className="p-3 border-l text-center">
                                        {refund.is_damaged ? (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold border border-red-200 inline-flex items-center gap-1">
                                                🗑️ تالف
                                            </span>
                                        ) : (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-200 inline-flex items-center gap-1">
                                                📦 سليم
                                            </span>
                                        )}
                                    </td>

                                    {/* 8. المبلغ */}
                                    <td className="p-3 border-l text-center font-black text-red-600">
                                        {refund.refund_amount} ج.م
                                    </td>

                                    {/* 9. السبب */}
                                    <td className="p-3 border-l text-xs text-gray-500 italic max-w-[150px] truncate" title={refund.reason}>
                                        {refund.reason}
                                    </td>

                                    {/* 10. التاريخ */}
                                    <td className="p-3 text-center font-mono text-[10px] text-gray-500">
                                        <div>{new Date(refund.created_at).toLocaleDateString('ar-EG')}</div>
                                        <div>{new Date(refund.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</div>
                                    </td>
                                </tr>
                            ))}
                            {returnsLog.filter(refund => {
                                const product = refund.store_products || {};
                                const course = product.courses || {};
                                if (historyFilter.grade && course.grade !== historyFilter.grade) return false;
                                if (historyFilter.teacher && (course.instructors?.name !== historyFilter.teacher && course.instructor !== historyFilter.teacher)) return false;
                                if (historyFilter.course && course.name !== historyFilter.course) return false;
                                if (historyFilter.type && product.type !== historyFilter.type) return false;
                                if (historyFilter.search && !product.name?.toLowerCase().includes(historyFilter.search.toLowerCase())) return false;
                                return true;
                            }).length === 0 && (
                                <tr>
                                    <td colSpan="10" className="text-center py-8 text-gray-400 bg-gray-50/20">
                                        لا توجد عمليات إرجاع مطابقة للفلاتر
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
)}

        {/* 1. SELL MODAL */}
        {showSellModal && productToSell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
                      <div>
                          <h2 className="text-2xl font-black flex items-center gap-2"><FaShoppingCart className="text-green-400" /> بيع: {productToSell.name}</h2>
                          <p className="text-gray-400 text-sm font-bold mt-1">السعر: {productToSell.price} ج.م | المخزون: {productToSell.stock}</p>
                      </div>
                      <button disabled={isSubmitting} onClick={() => setShowSellModal(false)} className="text-gray-400 hover:text-white"><FaTimes size={24}/></button>
                  </div>
                  <div className="p-6">
                      <div className="relative mb-6">
                          <FaBarcode className="absolute right-4 top-4 text-gray-400 text-xl" />
                          <input type="text" autoFocus placeholder="ابحث باسم الطالب أو امسح الكود..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="w-full p-4 pr-12 bg-gray-50 border-2 border-blue-100 rounded-2xl text-lg font-bold outline-none focus:border-blue-500 focus:bg-white transition" />
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 mb-6 pr-2">
                           <p className="text-xs font-bold text-gray-400 mb-2 flex justify-between">
                               <span>{productToSell.course_id ? `طلاب كورس ${productToSell.courses?.name || ''} فقط:` : 'نتائج البحث (عام):'}</span>
                               {isSearchingStudents && <span className="text-blue-500 animate-pulse">جاري البحث...</span>}
                           </p>
                           {students.length > 0 ? (
                              students.map(student => (
                                  <div key={student.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 transition group cursor-pointer" onClick={() => confirmSale(student)}>
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">{student.name.charAt(0)}</div>
                                          <div><h4 className="font-bold text-gray-800">{student.name}</h4><p className="text-xs text-gray-500 font-mono">{student.unique_id}</p></div>
                                      </div>
                                      <button disabled={isSubmitting} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md group-hover:bg-green-600">
                                          {isSubmitting ? '...' : 'بيع'}
                                      </button>
                                  </div>
                              ))
                           ) : (<p className="text-center text-gray-400 py-4">{studentSearch ? 'لا يوجد طالب مطابق' : 'ابدأ الكتابة للبحث'}</p>)}
                      </div>
                      
                      {/* PRINT TOGGLE & FOOTER ACTIONS */}
                      <div className="border-t pt-4">
                          <div className="flex justify-end mb-4">
                              <button onClick={() => setIsPrintEnabled(!isPrintEnabled)} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition border ${isPrintEnabled ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                  <FaPrint /> {isPrintEnabled ? 'طباعة تلقائية: مفعل' : 'طباعة تلقائية: معطل'}
                              </button>
                          </div>
                          <div className="flex justify-between items-center">
                              <button disabled={isSubmitting} onClick={handleManualSale} className="text-gray-500 font-bold text-sm hover:text-gray-800 underline">بيع سريع (بدون اسم)</button>
                              <button disabled={isSubmitting} onClick={() => setShowSellModal(false)} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300">إلغاء</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        )}
  
        {/* 2. SETTLE MODAL */}
        {showSettleModal && settleItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="bg-green-800 text-white p-6">
                      <h2 className="text-2xl font-black flex items-center gap-2"><FaHandshake/> تسوية حساب: {settleItem.product_name}</h2>
                      <p className="text-green-200 text-sm font-bold mt-2">إجمالي المبلغ المطلوب تسليمه:</p>
                      <p className="text-4xl font-black mt-1">{settleItem.total_owed} ج.م</p>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-400 mb-1 block">اسم المستلم (مين أخد الفلوس؟)</label>
                          <div className="relative">
                              <FaUserCheck className="absolute right-4 top-3.5 text-gray-400"/>
                              <input type="text" autoFocus placeholder="مثال: مستر أحمد / أستاذة منى" value={settlementData.receiver_name} onChange={e => setSettlementData({...settlementData, receiver_name: e.target.value})} className="w-full p-3 pr-10 bg-gray-50 border-2 border-green-100 rounded-xl font-bold outline-none focus:border-green-500" />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400 mb-1 block">صفة المستلم</label>
                          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                              {['Teacher', 'Assistant', 'Delegate'].map(role => (
                                  <button key={role} onClick={() => setSettlementData({...settlementData, receiver_role: role})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${settlementData.receiver_role === role ? 'bg-white shadow text-green-600' : 'text-gray-400'}`}>
                                      {role === 'Teacher' ? 'المدرس' : role === 'Assistant' ? 'مساعد' : 'مندوب'}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400 mb-1 block">ملاحظات (اختياري)</label>
                          <textarea placeholder="أي تفاصيل إضافية..." rows="2" value={settlementData.notes} onChange={e => setSettlementData({...settlementData, notes: e.target.value})} className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-green-200 text-sm"></textarea>
                      </div>
  
                      <div className="pt-4 flex gap-3">
                          <button disabled={isSubmitting} onClick={handleSettleSubmit} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black hover:bg-green-700 shadow-lg shadow-green-200 flex justify-center items-center gap-2">
                              {isSubmitting ? <FaSpinner className="animate-spin"/> : 'تأكيد التسليم وتصفير الحساب'}
                          </button>
                          <button disabled={isSubmitting} onClick={() => setShowSettleModal(false)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200">
                              إلغاء
                          </button>
                      </div>
                  </div>
               </div>
            </div>
        )}
  
        {/* ↩️ Refund Modal */}
        {showRefundModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="bg-orange-600 text-white p-6">
                      <h2 className="text-2xl font-black flex items-center gap-2"><FaTimesCircle/> إرجاع منتج</h2>
                      <p className="text-orange-200 text-sm font-bold mt-2">تسجيل مرتجع للمنتج</p>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-400 mb-1 block">الكمية المرتجعة</label>
                          <input 
                              type="number" 
                              min="1" 
                              value={refundData.quantity} 
                              onChange={e => setRefundData({...refundData, quantity: parseInt(e.target.value) || 1})} 
                              className="w-full p-3 bg-gray-50 border-2 border-orange-100 rounded-xl font-bold outline-none focus:border-orange-500" 
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400 mb-1 block">المبلغ المرتجع (ج.م)</label>
                          <input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              value={refundData.refund_amount} 
                              onChange={e => setRefundData({...refundData, refund_amount: parseFloat(e.target.value) || 0})} 
                              className="w-full p-3 bg-gray-50 border-2 border-orange-100 rounded-xl font-bold outline-none focus:border-orange-500" 
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400 mb-1 block">سبب الإرجاع</label>
                          <textarea 
                              placeholder="مثال: منتج معيب، لم يعد بحاجة إليه..." 
                              rows="3" 
                              value={refundData.reason} 
                              onChange={e => setRefundData({...refundData, reason: e.target.value})} 
                              className="w-full p-3 bg-gray-50 border-2 border-orange-100 rounded-xl font-bold outline-none focus:border-orange-500 text-sm" 
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400 mb-1 block">حالة المنتج</label>
                          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                              <button 
                                  onClick={() => setRefundData({...refundData, is_damaged: false})} 
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${!refundData.is_damaged ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`} 
                              >
                                  سليم (يرجع للمخزن)
                              </button>
                              <button 
                                  onClick={() => setRefundData({...refundData, is_damaged: true})} 
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${refundData.is_damaged ? 'bg-white shadow text-red-600' : 'text-gray-400'}`} 
                              >
                                  تالف (لا يرجع للمخزن)
                              </button>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400 mb-1 block">طريقة الإرجاع</label>
                          <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mb-2">
                            <p className="text-xs font-bold text-orange-700 mb-2">
                              {refundData.settlement_id ? '⚠️ تم التسوية بالفعل' : '💰 لم يتم التسوية بعد'}
                            </p>
                            {refundData.settlement_id ? (
                              <p className="text-xs text-orange-600">
                                سيتم الإرجاع من حساب السنتر (المدرس خد الفلوس بالفعل)
                                <br />
                                <span className="font-bold">سيتم تسجيل كمصروفة على السنتر</span>
                              </p>
                            ) : (
                              <p className="text-xs text-gray-600">
                                سيتم الإرجاع كاش من الدرج
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                            {refundData.settlement_id ? (
                              <button 
                                onClick={() => setRefundData({...refundData, refund_method: 'center_account'})}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${refundData.refund_method === 'center_account' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}
                              >
                                🏢 من حساب السنتر
                              </button>
                            ) : (
                              <>
                                <button 
                                  onClick={() => setRefundData({...refundData, refund_method: 'cash'})}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${refundData.refund_method === 'cash' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}
                                >
                                  💵 كاش
                                </button>
                                <button 
                                  onClick={() => setRefundData({...refundData, refund_method: 'wallet'})}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${refundData.refund_method === 'wallet' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}
                                >
                                  💳 رصيد
                                </button>
                              </>
                            )}
                          </div>
                      </div>
  
                      <div className="pt-4 flex gap-3">
                          <button 
                              disabled={isSubmitting} 
                              onClick={handleRefundSubmit} 
                              className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-black hover:bg-orange-700 shadow-lg shadow-orange-200 flex justify-center items-center gap-2" 
                          >
                              {isSubmitting ? <FaSpinner className="animate-spin"/> : 'تأكيد الإرجاع'}
                          </button>
                          <button 
                              disabled={isSubmitting} 
                              onClick={() => setShowRefundModal(false)} 
                              className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200" 
                          >
                              إلغاء
                          </button>
                      </div>
                  </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}

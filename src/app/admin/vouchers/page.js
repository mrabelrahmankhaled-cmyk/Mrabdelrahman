'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { 
  FaTicketAlt, FaPlus, FaTrash, FaFileExcel, 
  FaCopy, FaCheck, FaSyncAlt, FaSearch, 
  FaFilter, FaArrowLeft, FaEye, FaPrint, FaBolt,
  FaChevronDown, FaChevronUp, FaFolder, FaBookOpen, FaCaretDown, FaFileAlt
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function VouchersPage() {
  const { centerId, role, allowedFeatures } = useAuth();
  
  // 📊 States
  const [courses, setCourses] = useState([]);
  const [stages, setStages] = useState([]); 
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [centerSettings, setCenterSettings] = useState(null);
  
  // 🔍 Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, available, used
  const [selectedGrade, setSelectedGrade] = useState(''); 
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  // 🔍 New List Filters (Decoupled from generator)
  const [listGrade, setListGrade] = useState('');
  const [listCourseId, setListCourseId] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all'); // all, course, chapter, lesson
  const [availableChapters, setAvailableChapters] = useState([]); // For the generator
  const [availableLessons, setAvailableLessons] = useState([]); 
  const [selectedTargetId, setSelectedTargetId] = useState('full'); // 'full', 'ch_UUID', or 'ls_UUID'
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  
  const [count, setCount] = useState(10);
  
  // UI States
  const [copiedCode, setCopiedCode] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // 📄 Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    if (centerId) {
      fetchInitialData();
    }
  }, [centerId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { getCenterSettings } = await import('../../../lib/settings');
      const [stagesRes, coursesRes, vouchersRes, settings] = await Promise.all([
        supabaseBrowser.from('educational_stages').select('*').eq('center_id', centerId).order('sort_order', { ascending: true }),
        supabaseBrowser.from('courses').select('id, name, grade, instructors(name)').eq('center_id', centerId),
        supabaseBrowser.from('recharge_codes').select('*, courses(name, grade), lesson_chapters(title), lessons(title), students(name)').eq('center_id', centerId).order('created_at', { ascending: false }),
        getCenterSettings(centerId)
      ]);

      setStages(stagesRes.data || []);
      setCourses(coursesRes.data || []);
      setVouchers(vouchersRes.data || []);
      setCenterSettings(settings);
    } catch (error) {
      console.error('Fetch Initial Data Error:', error);
      toast.error('خطأ في تحميل البيانات. تأكد من تشغيل ملف التحديث SQL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      Promise.all([
        supabaseBrowser.from('lesson_chapters').select('id, title').eq('course_id', selectedCourseId).order('order_index'),
        supabaseBrowser.from('lessons').select('id, title, chapter_id').eq('course_id', selectedCourseId).order('order_index')
      ]).then(([chRes, lsRes]) => {
        setAvailableChapters(chRes.data || []);
        setAvailableLessons(lsRes.data || []);
      });
    } else {
      setAvailableChapters([]);
      setAvailableLessons([]);
    }
  }, [selectedCourseId]);

  const fetchVouchers = async () => {
    const { data, error } = await supabaseBrowser
      .from('recharge_codes')
      .select('*, courses(name, grade), lesson_chapters(title), lessons(title), students(name)')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Fetch Vouchers Error:', error);
      toast.error('خطأ في تحديث القائمة');
    } else {
      setVouchers(data || []);
    }
  };

  // 🧪 Logic
  const stats = useMemo(() => {
    const total = vouchers.length;
    const used = vouchers.filter(v => v.is_used).length;
    const available = total - used;
    return { total, used, available };
  }, [vouchers]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const matchesSearch = v.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           v.students?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           v.lesson_chapters?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           v.lessons?.title?.toLowerCase().includes(searchTerm.toLowerCase());
                           
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'used' ? v.is_used : !v.is_used);
      
      const matchesGrade = !listGrade || v.courses?.grade === listGrade;
      const matchesCourse = !listCourseId || v.course_id === listCourseId;

      const matchesTargetType = targetTypeFilter === 'all' || v.target_type === targetTypeFilter;
      
      return matchesSearch && matchesStatus && matchesGrade && matchesCourse && matchesTargetType;
    });
  }, [vouchers, searchTerm, statusFilter, listGrade, listCourseId, targetTypeFilter]);

  const paginatedVouchers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVouchers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVouchers, currentPage]);

  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, listGrade, listCourseId, targetTypeFilter]);

  const generateVouchers = async () => {
    if (!selectedCourseId || count < 1) return toast.error('يرجى اختيار مادة وتحديد العدد');
    if (count > 500) return toast.error('لا يمكن توليد أكثر من 500 كود في المرة الواحدة');
    
    setIsGenerating(true);
    const newVouchers = [];
    const prefix = 'CLS';
    
    for (let i = 0; i < count; i++) {
      // 🔐 توليد كود أكثر أماناً وطولاً
      const code = `${prefix}-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      let lesson_id = null;
      let chapter_id = null;
      let target_type = 'course';

      if (selectedTargetId.startsWith('ch_')) {
        chapter_id = selectedTargetId.replace('ch_', '');
        target_type = 'chapter';
      } else if (selectedTargetId.startsWith('ls_')) {
        lesson_id = selectedTargetId.replace('ls_', '');
        target_type = 'lesson';
      }

      newVouchers.push({
        center_id: centerId,
        code,
        course_id: selectedCourseId,
        lesson_id,
        chapter_id,
        target_type,
        type: 'course_unlock',
        is_used: false
      });
    }

    const { error } = await supabaseBrowser.from('recharge_codes').insert(newVouchers);
    
    if (!error) {
      toast.success(`تم توليد ${count} كود بنجاح ⚡`);
      await fetchVouchers();
      setShowGenerator(false);
    } else {
      console.error('Generate Vouchers Error:', error);
      toast.error(`فشل التوليد: ${error.message}. هل قمت بتشغيل ملف الـ SQL؟`);
    }
    setIsGenerating(false);
  };

  const deleteBatch = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} كود؟ (سيتم حذف الأكواد غير المستخدمة فقط)`)) return;
    
    const { error } = await supabaseBrowser
      .from('recharge_codes')
      .delete()
      .in('id', selectedIds)
      .eq('is_used', false);
      
    if (!error) {
      toast.success('تم الحذف بنجاح');
      setSelectedIds([]);
      fetchVouchers();
    } else {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('تم النسخ للحافظة');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const exportToExcel = () => {
    const data = filteredVouchers.map(v => ({
      'الكود': v.code,
      'المادة': v.courses?.name || '---',
      'الصف': v.courses?.grade || '---',
      'الحالة': v.is_used ? '❌ مستخدم' : '✅ متاح',
      'تاريخ التوليد': new Date(v.created_at).toLocaleString('ar-EG'),
      'استخدم بواسطة': v.students?.name || '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أكواد الشحن");
    XLSX.writeFile(wb, `أكواد_شحن_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = (voucher) => {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>طباعة كود الشحن</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; border: 4px solid #2563eb; padding: 40px; border-radius: 30px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.1); width: 400px; position: relative; overflow: hidden; }
            .card::before { content: ""; position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: #2563eb; opacity: 0.1; clip-path: circle(50% at 100% 0); }
            .branding { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 25px; }
            .branding img { width: 60px; height: 60px; object-fit: contain; }
            .branding .center-name { font-weight: 900; font-size: 14px; color: #64748b; text-transform: uppercase; }
            .logo { color: #2563eb; font-weight: 900; font-size: 18px; line-height: 1; }
            .course { font-size: 20px; color: #1e293b; margin-bottom: 10px; font-weight: 900; }
            .code-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
            .code { font-size: 32px; font-weight: 900; color: #2563eb; background: #eff6ff; padding: 15px; border-radius: 15px; border: 2px dashed #bfdbfe; font-family: monospace; letter-spacing: 2px; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <div class="branding">
              ${centerSettings?.logo_url ? `<img src="${centerSettings.logo_url}" alt="logo" />` : ''}
              <div class="center-name">
                ${centerSettings?.is_instructor_mode ? `د/ ${centerSettings.name}` : centerSettings?.name || ''}
              </div>
            </div>
            <div class="course">${voucher.courses?.name}</div>
            <div class="code-label">كود تفعيل الحصة / الكورس</div>
            <div class="code">${voucher.code}</div>
            <div class="footer">⚡ نظام الـ Voucher المدعوم من CLASORA</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintBatch = () => {
    if (selectedIds.length === 0) return toast.error('يرجى تحديد الأكواد المطلوب طباعتها أولاً');
    
    const vouchersToPrint = vouchers.filter(v => selectedIds.includes(v.id));
    const printWindow = window.open('', '_blank');
    
    const html = `
      <html>
        <head>
          <title>طباعة مجموعة أكواد</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; background: white; margin: 0; padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .card { border: 2px solid #f1f5f9; padding: 15px; border-radius: 15px; text-align: center; position: relative; break-inside: avoid; background: #fff; }
            .branding { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; opacity: 0.8; }
            .branding img { width: 25px; height: 25px; object-fit: contain; }
            .branding .center-name { font-weight: 900; font-size: 10px; color: #64748b; }
            .course { font-size: 13px; font-weight: 900; color: #1e293b; margin-bottom: 2px; }
            .grade { font-size: 9px; color: #94a3b8; margin-bottom: 8px; font-weight: bold; }
            .code { font-size: 18px; font-weight: 900; background: #eff6ff; padding: 8px; border-radius: 10px; border: 1px dashed #bfdbfe; font-family: monospace; color: #2563eb; }
            .legal { font-size: 8px; color: #cbd5e1; margin-top: 8px; }
            @media print {
              @page { size: A4; margin: 1cm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="grid">
            ${vouchersToPrint.map(v => `
              <div class="card">
                <div class="branding">
                  ${centerSettings?.logo_url ? `<img src="${centerSettings.logo_url}" alt="logo" />` : ''}
                  <div class="center-name">
                    ${centerSettings?.is_instructor_mode ? `د/ ${centerSettings.name}` : centerSettings?.name || ''}
                  </div>
                </div>
                <div class="course">${v.courses?.name}</div>
                <div class="grade">${v.courses?.grade || ''}</div>
                <div class="code">${v.code}</div>
                <div class="legal">⚡ CLASORA VOUCHER SYSTEM</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-cairo" dir="rtl">
      <Toaster position="top-center" />
      
      {/* 🚀 Header Section */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <Link href="/admin/dashboard" className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 group">
            <FaArrowLeft className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
              نظام الأكواد الذكي <span className="bg-amber-100 text-amber-600 text-[10px] px-2 py-1 rounded-lg">VOUCHER PRO</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">إدارة وتوليد أكواد بيع المحتوى والملازم بأمان عالٍ</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none px-6 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <FaFileExcel className="text-green-600 text-lg" /> تصدير إكسيل
          </button>
          <button 
            onClick={() => setShowGenerator(!showGenerator)}
            className="flex-1 md:flex-none px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-200 transition-all shadow-lg active:scale-95"
          >
            {showGenerator ? <><FaPlus size={14} className="rotate-45" /> إغلاق</> : <><FaPlus size={14} /> توليد أكواد جديدة</>}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* 📊 Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'إجمالي الأكواد', value: stats.total, color: 'blue', icon: <FaTicketAlt /> },
            { label: 'أكواد متاحة للبيع', value: stats.available, color: 'emerald', icon: <FaCheck /> },
            { label: 'أكواد تم تفعيلها', value: stats.used, color: 'amber', icon: <FaBolt /> },
          ].map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={stat.label} 
              className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6"
            >
              <div className={`w-16 h-16 rounded-3xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center text-2xl shadow-inner`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-slate-900">{stat.value.toLocaleString()}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 🪄 Generator Panel */}
        <AnimatePresence>
          {showGenerator && (
            <motion.div 
              initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
              animate={{ 
                height: 'auto', 
                opacity: 1,
                transitionEnd: { overflow: 'visible' } 
              }}
              exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
              className="mb-10"
            >
              <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative z-50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <span className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><FaPlus size={14} /></span>
                  تجهيز دفعة أكواد جديدة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end relative z-10">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">الصف الدراسي</label>
                    <select 
                      value={selectedGrade}
                      onChange={(e) => { setSelectedGrade(e.target.value); setSelectedCourseId(''); }}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-bold outline-none focus:ring-2 ring-blue-500/50 transition-all text-white backdrop-blur-md"
                    >
                      <option value="" className="text-slate-900">-- كل الصفوف --</option>
                      {stages.map(s => <option key={s.id} value={s.name} className="text-slate-900">{s.name}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">المادة (المدرس)</label>
                    <select 
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-bold outline-none focus:ring-2 ring-blue-500/50 transition-all text-white backdrop-blur-md"
                    >
                      <option value="" className="text-slate-900">-- اختر مادة --</option>
                      {courses.filter(c => !selectedGrade || c.grade === selectedGrade).map(c => (
                        <option key={c.id} value={c.id} className="text-slate-900">{c.name} - {c.instructors?.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-1 relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">المحتوى المستهدف (Target)</label>
                    
                    {/* 💎 PREMIUM CUSTOM DROPDOWN 💎 */}
                    <div className="relative group/target">
                      <button 
                        onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                        disabled={!selectedCourseId}
                        className={`w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 flex items-center justify-between text-sm font-bold transition-all backdrop-blur-md hover:bg-white/10 ${!selectedCourseId ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                         <div className="flex items-center gap-3">
                            {selectedTargetId === 'full' ? (
                              <><span className="text-xl">🎁</span> <span className="text-blue-400">الكورس بالكامل</span></>
                            ) : selectedTargetId.startsWith('ch_') ? (
                              <><FaFolder className="text-indigo-400" /> <span>باب: {availableChapters.find(c => c.id === selectedTargetId.replace('ch_', ''))?.title}</span></>
                            ) : (
                              <><FaFileAlt className="text-emerald-400" /> <span>حصة: {availableLessons.find(l => l.id === selectedTargetId.replace('ls_', ''))?.title}</span></>
                            )}
                         </div>
                         <FaCaretDown className={`transition-transform duration-300 ${showTargetDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showTargetDropdown && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 right-0 mt-3 bg-[#1e293b] border border-white/10 rounded-3xl shadow-3xl z-[100] overflow-hidden max-h-[400px] flex flex-col"
                          >
                             <div className="p-2 overflow-y-auto custom-scrollbar">
                                {/* Option: Full Course */}
                                <button 
                                  onClick={() => { setSelectedTargetId('full'); setShowTargetDropdown(false); }}
                                  className={`w-full text-right p-4 rounded-2xl transition-all flex items-center gap-3 mb-1 ${selectedTargetId === 'full' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-300'}`}
                                >
                                   <span className="text-lg">🎁</span>
                                   <div className="flex flex-col items-start text-right">
                                      <span className="font-black text-sm">تفعيل الكورس بالكامل</span>
                                      <span className="text-[10px] opacity-60">يفتح جميع الأبواب والحصص الحالية والمستقبلية</span>
                                   </div>
                                </button>

                                <div className="h-px bg-white/5 my-2 mx-4"></div>

                                {/* Hierarchical Chapters & Lessons */}
                                {availableChapters.map(chapter => {
                                   const chapterLessons = availableLessons.filter(l => l.chapter_id === chapter.id);
                                   return (
                                     <div key={chapter.id} className="mb-2">
                                        {/* Chapter Select Button */}
                                        <button 
                                          onClick={() => { setSelectedTargetId(`ch_${chapter.id}`); setShowTargetDropdown(false); }}
                                          className={`w-full text-right p-4 rounded-2xl transition-all flex items-center justify-between group/ch ${selectedTargetId === `ch_${chapter.id}` ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-300'}`}
                                        >
                                           <div className="flex items-center gap-3">
                                              <FaFolder className={selectedTargetId === `ch_${chapter.id}` ? 'text-white' : 'text-indigo-400'} />
                                              <div className="flex flex-col items-start">
                                                  <span className="font-black text-sm">{chapter.title}</span>
                                                  <span className="text-[9px] opacity-60">📂 تفعيل الباب بالكامل ({chapterLessons.length} حصة)</span>
                                              </div>
                                           </div>
                                           <div className={`px-2 py-1 rounded-lg text-[8px] font-black border ${selectedTargetId === `ch_${chapter.id}` ? 'bg-white/20 border-white/20' : 'bg-indigo-500/10 border-indigo-500/10 text-indigo-400 group-hover/ch:bg-indigo-500/20'}`}>
                                              تفعيل الباب
                                           </div>
                                        </button>

                                        {/* Lessons under this chapter */}
                                        <div className="mr-6 border-r-2 border-white/5 pr-2 mt-1 space-y-1">
                                           {chapterLessons.map(lesson => (
                                              <button 
                                                key={lesson.id}
                                                onClick={() => { setSelectedTargetId(`ls_${lesson.id}`); setShowTargetDropdown(false); }}
                                                className={`w-full text-right p-3 rounded-xl transition-all flex items-center gap-3 text-xs ${selectedTargetId === `ls_${lesson.id}` ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                                              >
                                                 <FaFileAlt className={selectedTargetId === `ls_${lesson.id}` ? 'text-white' : 'text-emerald-500/50'} size={10} />
                                                 <span className="font-bold">{lesson.title}</span>
                                              </button>
                                           ))}
                                        </div>
                                     </div>
                                   );
                                })}

                                {/* Lessons with NO chapter */}
                                {availableLessons.filter(l => !l.chapter_id).length > 0 && (
                                   <>
                                     <div className="h-px bg-white/5 my-2 mx-4"></div>
                                     <div className="px-4 py-2">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">حصص غير مصنفة</span>
                                     </div>
                                     <div className="space-y-1">
                                        {availableLessons.filter(l => !l.chapter_id).map(lesson => (
                                           <button 
                                             key={lesson.id}
                                             onClick={() => { setSelectedTargetId(`ls_${lesson.id}`); setShowTargetDropdown(false); }}
                                             className={`w-full text-right p-3 rounded-xl transition-all flex items-center gap-3 text-xs ${selectedTargetId === `ls_${lesson.id}` ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                                           >
                                              <FaFileAlt className={selectedTargetId === `ls_${lesson.id}` ? 'text-white' : 'text-emerald-500/50'} size={10} />
                                              <span className="font-bold">{lesson.title}</span>
                                           </button>
                                        ))}
                                     </div>
                                   </>
                                )}
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">الكمية المطلوبة</label>
                    <input 
                      type="number" min="1" max="500"
                      value={count} onChange={(e) => setCount(parseInt(e.target.value))}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none focus:ring-2 ring-blue-500/50 transition-all text-white text-center backdrop-blur-md"
                    />
                  </div>
                  <button 
                    onClick={generateVouchers}
                    disabled={isGenerating || !selectedCourseId}
                    className="h-14 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-3 disabled:opacity-30 shadow-xl shadow-blue-900/50 group"
                  >
                    {isGenerating ? <FaSyncAlt className="animate-spin" /> : <FaBolt className="text-blue-600 group-hover:scale-125 transition-transform" />}
                    توليد وحفظ الدفعة
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🔍 Filter & Search Bar */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute top-1/2 -translate-y-1/2 right-5 text-slate-300" />
            <input 
              type="text" 
              placeholder="ابحث بالكود أو اسم الطالب..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pr-12 pl-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-blue-100 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <select 
              value={listGrade}
              onChange={(e) => { setListGrade(e.target.value); setListCourseId(''); }}
              className="h-14 px-5 bg-slate-50 border-none rounded-2xl text-xs font-black outline-none focus:ring-2 ring-blue-100 min-w-[140px]"
            >
              <option value="">كل الصفوف</option>
              {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>

            <select 
              value={listCourseId}
              onChange={(e) => setListCourseId(e.target.value)}
              className="h-14 px-5 bg-slate-50 border-none rounded-2xl text-xs font-black outline-none focus:ring-2 ring-blue-100 min-w-[140px]"
            >
              <option value="">كل المواد</option>
              {courses.filter(c => !listGrade || c.grade === listGrade).map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.instructors?.name || 'مجهول'}</option>
              ))}
            </select>

            <select 
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              className="h-14 px-5 bg-slate-50 border-none rounded-2xl text-xs font-black outline-none focus:ring-2 ring-blue-100"
            >
              <option value="all">نوع المحتوى (الكل)</option>
              <option value="course">🎁 كورس كامل</option>
              <option value="chapter">📁 باب كامل</option>
              <option value="lesson">📝 حصة فردية</option>
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-14 px-5 bg-slate-50 border-none rounded-2xl text-xs font-black outline-none focus:ring-2 ring-blue-100"
            >
              <option value="all">حالة الكود (الكل)</option>
              <option value="available">متاح فقط ✅</option>
              <option value="used">مستخدم فقط ❌</option>
            </select>
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <motion.button 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handlePrintBatch}
                className="h-14 px-6 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-50"
              >
                <FaPrint /> طباعة المحدد ({selectedIds.length})
              </motion.button>
              <motion.button 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={deleteBatch}
                className="h-14 px-6 bg-red-50 text-red-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-50"
              >
                <FaTrash /> حذف المحدد ({selectedIds.length})
              </motion.button>
            </div>
          )}
        </div>

        {/* 📑 Data Table */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full shadow-lg"></div>
            </div>
          )}
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-6 w-10">
                    <input 
                      type="checkbox" 
                      onChange={(e) => setSelectedIds(e.target.checked ? filteredVouchers.filter(v => !v.is_used).map(v => v.id) : [])}
                      checked={selectedIds.length > 0 && selectedIds.length === filteredVouchers.filter(v => !v.is_used).length}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500" 
                    />
                  </th>
                  <th className="px-6 py-6 font-black">الكود السري</th>
                  <th className="px-6 py-6">المادة / المدرس</th>
                  <th className="px-6 py-6 text-center">الحالة</th>
                  <th className="px-6 py-6">تفاصيل الاستخدام</th>
                  <th className="px-6 py-6">تاريخ الصدور</th>
                  <th className="px-6 py-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedVouchers.map((v) => (
                  <tr key={v.id} className={`hover:bg-slate-50/80 transition-all group ${v.is_used ? 'opacity-80' : ''}`}>
                    <td className="px-8 py-5">
                      {!v.is_used && (
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(v.id)}
                          onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, v.id] : selectedIds.filter(id => id !== v.id))}
                          className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-100" 
                        />
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="relative group/code">
                          <code className={`px-4 py-2 rounded-xl font-mono text-sm font-black transition-all ${v.is_used ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'}`}>
                            {v.code}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(v.code)}
                            className="absolute -top-3 -left-3 bg-white w-7 h-7 rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all opacity-0 group-hover/code:opacity-100 scale-75 group-hover/code:scale-100"
                          >
                            {copiedCode === v.code ? <FaCheck className="text-green-500" size={10} /> : <FaCopy size={10} />}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-slate-800">{v.courses?.name || 'مادة محذوفة'}</p>
                      {v.lesson_chapters?.title ? (
                         <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded-lg border border-indigo-500/10 flex items-center gap-1 w-fit mt-1">
                            <FaPlus size={8} /> باب: {v.lesson_chapters.title}
                         </span>
                      ) : v.lessons?.title ? (
                         <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1 w-fit mt-1">
                            <FaBolt size={8} /> {v.lessons.title}
                         </span>
                      ) : (
                         <span className="text-[10px] font-bold text-slate-400">الصف: {v.courses?.grade}</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] font-black px-3 py-1 rounded-full border ${v.is_used ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {v.is_used ? <><FaBolt size={8}/> مستخدم</> : <><FaCheck size={8}/> متاح للبيع</>}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {v.is_used ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700">{v.students?.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold">بتاريخ: {new Date(v.updated_at || v.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      ) : <span className="text-[10px] text-slate-300 font-bold italic">-- لم يُفعّل بعد --</span>}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-600">{new Date(v.created_at).toLocaleDateString('ar-EG')}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{new Date(v.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center items-center gap-2">
                         {!v.is_used && (
                           <button 
                            onClick={async () => {
                              if(!confirm('حذف الكود نهائياً؟')) return;
                              const { error } = await supabaseBrowser.from('recharge_codes').delete().eq('id', v.id);
                              if(!error) { toast.success('تم الحذف'); fetchVouchers(); }
                            }}
                            className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                           >
                              <FaTrash size={12} />
                           </button>
                         )}
                         <button 
                            onClick={() => handlePrint(v)}
                            className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all" 
                            title="معاينة الطباعة"
                         >
                            <FaPrint size={12} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredVouchers.length === 0 && !loading && (
              <div className="p-24 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                  <FaTicketAlt size={40} className="text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-400">لا توجد أكواد تطابق البحث</h3>
                <p className="text-sm text-slate-300 mt-2 font-bold">جرب تغيير فلاتر البحث أو توليد أكواد جديدة</p>
              </div>
            )}
          </div>

          {/* 📄 Pagination Footer */}
          {totalPages > 1 && (
            <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                عرض {paginatedVouchers.length} من أصل {filteredVouchers.length} كود
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <FaArrowLeft className="rotate-180" />
                </button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                        currentPage === i + 1 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                          : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <FaArrowLeft />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}

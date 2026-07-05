'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { 
  FaVideo, FaFilePdf, FaPlus, FaTrash, FaEdit, 
  FaLayerGroup, FaPlayCircle, FaSave, FaTimes, FaLink,
  FaArrowLeft, FaCheckCircle, FaGlobe, FaLock, FaSortAmountDown,
  FaEye, FaSearch, FaChevronDown, FaYoutube, FaVimeoV, FaCloud, 
  FaFilter, FaClock, FaQrcode, FaQuestionCircle, FaChartLine, FaMagic,
  FaCalendarAlt, FaChevronRight, FaFolderPlus, FaListUl, FaPlay, FaGraduationCap, FaBolt, FaCheck,FaMoneyBillWave
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

// --- Helper Components ---
const Badge = ({ children, color = 'blue' }) => (
  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-${color}-500/10 text-${color}-500 border border-${color}-500/20`}>
    {children}
  </span>
);

export default function LessonsPage() {
  const { centerId, allowedFeatures, loading: authLoading } = useAuth();
  
  // 📊 Core Data States
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [stages, setStages] = useState([]);
  const [exams, setExams] = useState([]); // 🆕 Exams list
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 🔍 Filter & Selection States
  const [selectedGrade, setSelectedGrade] = useState(''); 
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 🪄 UI States
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [isChapterFormOpen, setIsChapterFormOpen] = useState(false);
  const [showQRModal, setShowQRModal] = useState(null); // lesson object

  // 📝 Lesson Form State
  const [lessonData, setLessonData] = useState({
    id: null,
    title: '',
    description: '',
    chapter_id: '',
    video_url: '',
    video_provider: 'youtube',
    pdf_url: '',
    is_free: false,
    order_index: 0,
    price: 0, // 🆕 Price
    exam_id: '', // 🆕 Associated Exam
    scheduled_at: '',
    checkpoints: []
  });

  // 📝 Chapter Form State
  const [chapterData, setChapterData] = useState({ id: null, title: '', order_index: 0, price: 0, exam_id: '' });

  // 🚀 Initial Fetch
  useEffect(() => {
    if (centerId) {
      fetchInitialData();
    }
  }, [centerId]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchChapters(selectedCourseId);
      fetchLessons(selectedCourseId);
    } else {
      setChapters([]);
      setLessons([]);
    }
  }, [selectedCourseId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [stagesRes, coursesRes, examsRes] = await Promise.all([
        supabaseBrowser.from('educational_stages').select('*').eq('center_id', centerId).order('sort_order'),
        supabaseBrowser.from('courses').select('id, name, grade, instructors(name), digital_price, digital_full_price, original_price').eq('center_id', centerId).order('name'),
        supabaseBrowser.from('exams').select('id, title').eq('center_id', centerId).order('created_at', { ascending: false })
      ]);
      setStages(stagesRes.data || []);
      setCourses(coursesRes.data || []);
      setExams(examsRes.data || []);
    } catch (err) { toast.error('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  };

  const fetchChapters = async (courseId) => {
    const { data } = await supabaseBrowser.from('lesson_chapters').select('*').eq('course_id', courseId).order('order_index');
    setChapters(data || []);
  };

  const fetchLessons = async (courseId) => {
    setLoading(true);
    const { data } = await supabaseBrowser.from('lessons').select('*, lesson_chapters(title)').eq('course_id', courseId).order('order_index');
    setLessons(data || []);
    setLoading(false);
  };

  // 🔧 Handlers
  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return toast.error('اختر مادة أولاً');
    setIsSaving(true);
    
    // 🧹 Clean and Prepare Payload
    const validatedCP = lessonData.checkpoints?.map(cp => ({
      ...cp,
      time: parseInt(cp.time) || 0
    })) || [];

    // Remove any fields that aren't in the database table (like joined data)
    const { lesson_chapters, ...directData } = lessonData;

    const payload = { 
      ...directData, 
      course_id: selectedCourseId, 
      center_id: centerId,
      chapter_id: lessonData.chapter_id === '' ? null : lessonData.chapter_id,
      scheduled_at: lessonData.scheduled_at === '' ? null : lessonData.scheduled_at,
      checkpoints: validatedCP
    };

    try {
      let error;
      if (lessonData.id) {
        const { error: updateError } = await supabaseBrowser.from('lessons').update(payload).eq('id', lessonData.id);
        error = updateError;
      } else {
        const { id, ...newObj } = payload;
        const { error: insertError } = await supabaseBrowser.from('lessons').insert([newObj]);
        error = insertError;
      }
      if (!error) {
        toast.success(lessonData.id ? 'تم تحديث الدرس بنجاح ✨' : 'تم نشر الدرس الجديد بنجاح 🔥');
        setIsLessonFormOpen(false);
        fetchLessons(selectedCourseId);
      } else throw error;
    } catch (err) { 
      toast.error('فشل حفظ الدرس. تأكد من إكمال جميع البيانات'); 
      console.error('Save Error:', err); 
    } finally { setIsSaving(false); }
  };

  const updateCourseDigitalPricing = async () => {
    if (!selectedCourseId) return;
    const course = courses.find(c => c.id === selectedCourseId);
    setIsSaving(true);
    try {
      const { error } = await supabaseBrowser
        .from('courses')
        .update({
          digital_price: parseFloat(course.digital_price) || 0,
          digital_full_price: parseFloat(course.digital_full_price) || 0,
          original_price: parseFloat(course.original_price) || 0
        })
        .eq('id', selectedCourseId);
      
      if (error) throw error;
      toast.success('تم تحديث أسعار المحتوى الرقمي للمادة');
    } catch (err) {
      toast.error('خطأ في حفظ الأسعار');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChapter = async (e) => {
    e.preventDefault();
    const payload = { 
      ...chapterData, 
      course_id: selectedCourseId, 
      center_id: centerId,
      exam_id: chapterData.exam_id === '' ? null : chapterData.exam_id
    };

    try {
      let error;
      if (chapterData.id) {
        const { error: updateError } = await supabaseBrowser.from('lesson_chapters').update(payload).eq('id', chapterData.id);
        error = updateError;
      } else {
        const { id, ...newObj } = payload;
        const { error: insertError } = await supabaseBrowser.from('lesson_chapters').insert([newObj]);
        error = insertError;
      }

      if (error) throw error;

      toast.success('تم حفظ الباب/الفصل بنجاح');
      setIsChapterFormOpen(false);
      fetchChapters(selectedCourseId);
    } catch (err) { 
      toast.error('خطأ في حفظ الفصل: تأكد من تحديث قاعدة البيانات');
      console.error('Chapter Save Error Details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      }); 
    }
  };

  const handleDeleteChapter = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الباب؟ (الحصص الموجودة داخله لن تُحذف ولكن ستصبح تابعة لقسم عام)')) return;
    try {
      const { error } = await supabaseBrowser.from('lesson_chapters').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف الباب بنجاح');
      setSelectedChapterId('all');
      fetchChapters(selectedCourseId);
    } catch (err) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleAddCheckpoint = () => {
    setLessonData({
      ...lessonData,
      checkpoints: [...(lessonData.checkpoints || []), { time: 0, question: '', options: ['', ''], answer: 0 }]
    });
  };

  // 📋 Memotized Filters
  const filteredCourses = useMemo(() => courses.filter(c => !selectedGrade || c.grade === selectedGrade), [courses, selectedGrade]);
  const displayLessons = useMemo(() => {
    return lessons.filter(l => {
      const matchesSearch = l.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesChapter = selectedChapterId === 'all' || l.chapter_id === selectedChapterId;
      return matchesSearch && matchesChapter;
    });
  }, [lessons, searchTerm, selectedChapterId]);

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#0f172a] font-cairo text-slate-200 pb-20 overflow-x-hidden" dir="rtl">
      <Toaster position="top-center" />

      {/* 🌌 Cosmic Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        
        {/* 🏔️ Header: Pro Master Studio */}
        <header className="py-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="flex items-center gap-8">
            <Link href="/admin/dashboard" className="w-16 h-16 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-500/30 transition-all group shadow-2xl">
              <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-4 py-1.5 bg-blue-600 text-white text-[11px] font-black rounded-lg uppercase tracking-widest shadow-xl shadow-blue-900/40">Studio Engine 3.2</span>
                <span className="flex items-center gap-2 text-[10px] font-black pointer-events-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                  <span className="text-slate-500 tracking-widest uppercase">Live Production</span>
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">إستوديو <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">إدارة المحتوى</span></h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
             <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => {
                setChapterData({ id: null, title: '', order_index: chapters.length, price: 0, exam_id: '' });
                setIsChapterFormOpen(true);
              }}
              disabled={!selectedCourseId}
              className="h-16 px-8 bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-2xl font-black text-sm flex items-center gap-3 transition-all disabled:opacity-20 shadow-xl"
             >
                <FaFolderPlus className="text-indigo-400 text-lg" /> إضافة باب
             </motion.button>
             <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setIsLessonFormOpen(true); setLessonData({ id:null, title:'', description:'', chapter_id:'', video_url:'', video_provider:'youtube', pdf_url:'', is_free:false, order_index: lessons.length, scheduled_at:'', checkpoints:[] }); }}
              disabled={!selectedCourseId}
              className="h-16 px-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm flex items-center gap-4 shadow-2xl shadow-blue-900/50 transition-all disabled:opacity-20"
             >
                <FaPlus className="text-lg" /> إضافة محتوى جديد
             </motion.button>
          </div>
        </header>

        {/* 💼 NEW: Business Overview (Pricing Strategy) */}
        {selectedCourseId && (
          <div className="flex flex-col gap-6 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* 1. Editable Full Course Price */}
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group shadow-2xl">
                   <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_15px_blue]"></div>
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400"><FaGraduationCap /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">سعر الكورس كاملاً (ديجيتال)</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <input 
                         type="number"
                         value={courses.find(c => c.id === selectedCourseId)?.digital_full_price || 0}
                         onChange={(e) => {
                            const val = e.target.value;
                            setCourses(courses.map(c => c.id === selectedCourseId ? {...c, digital_full_price: val} : c));
                         }}
                         className="bg-transparent text-3xl font-black text-white w-24 outline-none focus:text-blue-400 border-b-2 border-transparent focus:border-blue-500 transition-all"
                      />
                      <span className="text-[10px] font-black text-slate-500 uppercase">EGP</span>
                   </div>
                </div>

                {/* 1.5. Editable Original Price */}
                <div className="bg-white/5 border border-red-500/20 p-6 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group shadow-2xl">
                   <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_15px_red]"></div>
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400"><FaMoneyBillWave /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">السعر قبل الخصم (للطلاب)</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <input 
                         type="number"
                         value={courses.find(c => c.id === selectedCourseId)?.original_price || 0}
                         onChange={(e) => {
                            const val = e.target.value;
                            setCourses(courses.map(c => c.id === selectedCourseId ? {...c, original_price: val} : c));
                         }}
                         className="bg-transparent text-3xl font-black text-white w-24 outline-none focus:text-red-400 border-b-2 border-transparent focus:border-red-500 transition-all"
                      />
                      <span className="text-[10px] font-black text-slate-500 uppercase">EGP</span>
                   </div>
                </div>

               {/* 2. Editable Default Lesson Price */}
               <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 shadow-[0_0_15px_indigo]"></div>
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><FaVideo /></div>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">سعر الحصة الموحد (ديجيتال)</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <input 
                        type="number"
                        value={courses.find(c => c.id === selectedCourseId)?.digital_price || 0}
                        onChange={(e) => {
                           const val = e.target.value;
                           setCourses(courses.map(c => c.id === selectedCourseId ? {...c, digital_price: val} : c));
                        }}
                        className="bg-transparent text-3xl font-black text-white w-24 outline-none focus:text-indigo-400 border-b-2 border-transparent focus:border-indigo-500 transition-all"
                     />
                     <span className="text-[10px] font-black text-slate-500 uppercase">EGP</span>
                  </div>
               </div>

               {/* 3. Static Stats */}
               <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_15px_emerald]"></div>
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><FaLayerGroup /></div>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">متوسط سعر الأبواب</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-2xl font-black text-white">{chapters.length > 0 ? (chapters.reduce((acc, c) => acc + (c.price || 0), 0) / chapters.length).toFixed(2) : 0}</span>
                     <span className="text-[10px] font-black text-slate-500 uppercase">EGP</span>
                  </div>
               </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 shadow-[0_0_15px_amber]"></div>
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400"><FaMagic /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">إجمالي المنهج (مجمع)</span>
                   </div>
                   <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">
                        {(
                          chapters.reduce((acc, c) => acc + (parseFloat(c.price) || 0), 0) + 
                          lessons.filter(l => !l.chapter_id).reduce((acc, l) => {
                            const unified = parseFloat(courses.find(c => c.id === selectedCourseId)?.digital_price) || 0;
                            return acc + (parseFloat(l.price) > 0 ? parseFloat(l.price) : unified);
                          }, 0)
                        ).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-black text-slate-500 uppercase">EGP</span>
                   </div>
                </div>
            </div>

            {/* 💾 Save Toolbar */}
            <div className="flex justify-end">
               <button 
                  onClick={updateCourseDigitalPricing}
                  disabled={isSaving}
                  className="h-14 px-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-3"
               >
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FaSave />} 
                  تبني وحفظ الأسعار الجديدة
               </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* 🕹️ Left Controls: Selector & Dynamic Stats */}
          <aside className="lg:col-span-3 space-y-8">
            <div className="bg-white/5 border border-white/10 backdrop-blur-3xl p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                <FaMagic className="text-blue-400" /> مصفاة المنهج
              </h4>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 mr-2 uppercase">المستوى الدراسي</label>
                  <div className="relative">
                    <select 
                      value={selectedGrade}
                      onChange={(e) => { setSelectedGrade(e.target.value); setSelectedCourseId(''); }}
                      className="w-full h-14 bg-slate-900/80 border border-white/5 rounded-2xl px-5 text-sm font-bold outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">كل الصفوف</option>
                      {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <FaChevronDown className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 mr-2 uppercase">المادة المستهدفة</label>
                  <div className="relative">
                    <select 
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full h-14 bg-slate-900/80 border border-white/5 rounded-2xl px-5 text-sm font-bold outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">اختر المادة والمدرس</option>
                      {filteredCourses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - د/ {c.instructors?.name || 'مجهول'}</option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />
                  </div>
                </div>
              </div>
            </div>

            {selectedCourseId && (
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gradient-to-br from-indigo-700 to-blue-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10 text-white">
                    <h3 className="text-4xl font-black mb-1">{lessons.length}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">إجمالي دروس المنهج</p>
                    <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center">
                      <FaCalendarAlt className="text-white/20 text-2xl" />
                      <span className="text-[10px] font-black opacity-80 uppercase tracking-tighter">Updated Today</span>
                    </div>
                  </div>
                  <FaChartLine className="absolute -bottom-6 -left-6 text-9xl text-white/5 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            )}
          </aside>

          {/* 🎬 Center/Right: Lessons List & Chapters Tabs */}
          <main className="lg:col-span-9 space-y-8">
            {!selectedCourseId ? (
              <div className="h-[500px] bg-white/5 border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-center p-12 transition-all">
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <FaMagic size={80} className="text-blue-500/20 mb-10" />
                </motion.div>
                <h3 className="text-2xl font-black text-slate-500">مرحباً بك في إستوديو الإدارة الجديد</h3>
                <p className="text-xs text-slate-600 mt-4 font-bold max-w-sm leading-loose uppercase tracking-widest">قم باختيار المادة من لوحة التحكم الجانبية لتبدأ في بناء وهيكلة المنهج التفاعلي الخاص بك</p>
              </div>
            ) : (
              <>
                {/* 📂 Horizontal Chapters Filter */}
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-4 group">
                  <button 
                    onClick={() => setSelectedChapterId('all')}
                    className={`px-8 py-4 rounded-[1.5rem] font-black text-xs transition-all whitespace-nowrap shadow-xl border ${selectedChapterId === 'all' ? 'bg-blue-600 text-white border-blue-500 shadow-blue-900/30' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'}`}
                  >
                    كل دروس المادة
                  </button>
                  {chapters.map(ch => (
                    <button 
                      key={ch.id}
                      onClick={() => setSelectedChapterId(ch.id)}
                      className={`px-8 py-4 rounded-[1.5rem] font-black text-xs transition-all whitespace-nowrap shadow-xl border flex items-center gap-3 ${selectedChapterId === ch.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/30' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'}`}
                    >
                      {ch.title}
                      {selectedChapterId === ch.id && (
                        <div className="flex items-center gap-2">
                          <FaEdit 
                            className="text-[10px] hover:text-white transition-colors" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setChapterData(ch);
                              setIsChapterFormOpen(true);
                            }}
                          />
                          <FaTrash 
                            className="text-[10px] hover:text-red-400 transition-colors" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChapter(ch.id);
                            }}
                          />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* 🔎 Search Bar Integrated */}
                <div className="relative group">
                  <FaSearch className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث عن درس محدد بالعنوان أو التوقيت..."
                    className="w-full h-16 bg-white/5 border border-white/5 rounded-[2rem] pr-16 pl-8 text-sm font-bold outline-none focus:border-blue-500/30 transition-all backdrop-blur-sm"
                  />
                </div>

                {/* 📺 Content Grid */}
                <div className="grid grid-cols-1 gap-6">
                  {loading ? (
                    [1,2,3].map(n => <div key={n} className="h-32 bg-white/5 rounded-[3rem] animate-pulse"></div>)
                  ) : displayLessons.length === 0 ? (
                    <div className="bg-white/5 p-24 text-center rounded-[4rem] border border-white/5">
                      <FaListUl size={50} className="mx-auto text-white/10 mb-6" />
                      <p className="text-slate-600 font-black uppercase tracking-[0.2em]">Curriculum is empty for this category</p>
                    </div>
                  ) : (
                    <AnimatePresence mode='popLayout'>
                      {displayLessons.map((lesson, idx) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          key={lesson.id}
                          className="group relative bg-[#1e293b]/40 border border-white/5 hover:border-blue-500/30 backdrop-blur-3xl p-8 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between transition-all shadow-2xl overflow-hidden"
                        >
                          {/* Hover Glow */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/0 to-blue-600/0 group-hover:via-blue-600/[0.03] transition-all pointer-events-none"></div>

                          <div className="flex items-center gap-8 flex-1 w-full relative z-10">
                            <div className="relative">
                              <div className="w-20 h-20 bg-slate-950 rounded-[2.2rem] border border-white/10 flex items-center justify-center text-3xl font-black text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xl relative overflow-hidden">
                                {lesson.order_index || idx + 1}
                              </div>
                              {lesson.video_url && (
                                <div className="absolute -top-1 -right-1 w-8 h-8 bg-red-600 rounded-full border-4 border-[#0f172a] shadow-lg flex items-center justify-center animate-pulse">
                                  <FaPlay size={10} className="mr-0.5" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{lesson.title}</h3>
                                {lesson.is_free && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[8px] font-black rounded uppercase border border-emerald-500/20">Free</span>}
                              </div>
                              <div className="flex flex-wrap items-center gap-5">
                                <span className="flex items-center gap-2 text-[10px] font-black text-slate-500 bg-white/5 px-4 py-1.5 rounded-xl border border-white/5 transition-colors group-hover:border-white/10 uppercase tracking-tighter">
                                  <FaBox size={10} className="text-indigo-400" /> {lesson.lesson_chapters?.title || 'General Chapter'}
                                </span>
                                {lesson.checkpoints?.length > 0 && (
                                  <span className="flex items-center gap-2 text-[11px] font-black text-emerald-400 bg-emerald-400/5 px-4 py-1.5 rounded-xl border border-emerald-400/20 shadow-neon">
                                    <FaMagic size={10} /> {lesson.checkpoints.length} INTERACTIVE POINTS
                                  </span>
                                )}
                                {lesson.pdf_url && (
                                  <span className="flex items-center gap-2 text-[11px] font-black text-blue-400 bg-blue-400/5 px-4 py-1.5 rounded-xl border border-blue-400/20">
                                    <FaFilePdf size={10} /> PDF بخارطة المنهج
                                  </span>
                                )}
                                {lesson.exam_id && (
                                  <span className="flex items-center gap-2 text-[11px] font-black text-indigo-400 bg-indigo-400/5 px-4 py-1.5 rounded-xl border border-indigo-400/20">
                                    <FaGraduationCap size={10} /> مرتبط باختبار
                                  </span>
                                )}
                                {lesson.price > 0 && (
                                  <span className="flex items-center gap-2 text-[11px] font-black text-amber-500 bg-amber-500/5 px-4 py-1.5 rounded-xl border border-amber-500/20">
                                    <FaBolt size={10} /> {lesson.price} EGP
                                  </span>
                                )}
                                {lesson.scheduled_at && (
                                  <span className="flex items-center gap-2 text-[11px] font-black text-amber-400 bg-amber-400/5 px-4 py-1.5 rounded-xl border border-amber-400/20">
                                    <FaClock size={10} /> {new Date(lesson.scheduled_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-8 md:mt-0 relative z-10 w-full md:w-auto justify-end">
                            <motion.button 
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => setShowQRModal(lesson)}
                              className="w-14 h-14 flex items-center justify-center bg-white/5 text-slate-400 rounded-2xl hover:text-blue-400 hover:bg-blue-400/10 transition-all border border-white/5 shadow-xl"
                              title="توليد QR للدراسة"
                            >
                              <FaQrcode size={20} />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => { setLessonData(lesson); setIsLessonFormOpen(true); }}
                              className="w-14 h-14 flex items-center justify-center bg-white/5 text-slate-400 rounded-2xl hover:text-blue-400 hover:bg-blue-400/10 transition-all border border-white/5 shadow-xl"
                            >
                              <FaEdit size={20} />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={async () => {
                                if(confirm('هل أنت متأكد من حذف هذا الدرس الذكي؟')) {
                                  await supabaseBrowser.from('lessons').delete().eq('id', lesson.id);
                                  fetchLessons(selectedCourseId);
                                  toast.success('تم حذف الدرس من المنهج');
                                }
                              }}
                              className="w-14 h-14 flex items-center justify-center bg-white/5 text-slate-400 rounded-2xl hover:text-red-500 hover:bg-red-500/10 transition-all border border-white/5 shadow-xl"
                            >
                              <FaTrash size={20} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )
                }
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* 📝 Mega Lesson Form Panel (Slide-out Studio) */}
      <AnimatePresence>
        {isLessonFormOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsLessonFormOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            ></motion.div>
            <motion.div 
              initial={{ x: '100%', skewX: -2 }} animate={{ x: 0, skewX: 0 }} exit={{ x: '100%', skewX: 2 }}
              transition={{ type: 'spring', damping: 25, stiffness: 100 }}
              className="relative w-full max-w-3xl bg-[#0b1222] h-full shadow-[0_0_100px_rgba(37,99,235,0.1)] border-r border-white/5 overflow-y-auto no-scrollbar p-12 pt-24"
            >
              <button onClick={() => setIsLessonFormOpen(false)} className="absolute top-10 left-10 w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all hover:bg-white/10"><FaTimes size={20} /></button>
              
              <div className="mb-14 relative">
                <Badge color="blue">Production Workshop</Badge>
                <h2 className="text-4xl font-black text-white mt-6 tracking-tight">{lessonData.id ? 'تحسين جودة المحتوى' : 'صناعة محتوى تعليمي تفاعلي'}</h2>
                <p className="text-slate-500 font-bold mt-3 text-sm leading-relaxed max-w-lg">اضبط معايير الفيديو، أضف النقاط التفاعلية، ونظم المادة العلمية لضمان أعلى جودة تعلم للطالب</p>
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/5 blur-[80px]"></div>
              </div>

              <form onSubmit={handleSaveLesson} className="space-y-10 pb-32">
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] border-b border-white/5 pb-4">البيانات الأساسية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">مسمى الدرس الإحترافي</label>
                      <input type="text" value={lessonData.title || ''} onChange={e => setLessonData({...lessonData, title: e.target.value})} required className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-black focus:border-blue-500 transition-all outline-none focus:bg-white/10" placeholder="عنون الدرس ببراعة..." />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">تصنيف الباب</label>
                      <div className="relative group">
                        <select value={lessonData.chapter_id || ''} onChange={e => setLessonData({...lessonData, chapter_id: e.target.value})} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-black focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer">
                          <option value="">بدون فصل (عام)</option>
                          {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
                        </select>
                        <FaChevronDown className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6 pt-6 border-t border-white/5">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 bg-red-600/20 text-red-500 rounded-xl flex items-center justify-center shadow-lg"><FaVideo size={16} /></div>
                     <label className="text-sm font-black text-white tracking-wide uppercase">قنوات البث والتشغيل</label>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="relative group">
                        <select value={lessonData.video_provider || 'youtube'} onChange={e => setLessonData({...lessonData, video_provider: e.target.value})} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-[11px] font-black outline-none focus:border-blue-500 appearance-none">
                          <option value="youtube">YouTube Engine</option>
                          <option value="vimeo">Vimeo Pro</option>
                          <option value="bunny">Bunny.net (Premium Security)</option>
                        </select>
                        <FaChevronDown className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                      </div>
                      <input type="url" value={lessonData.video_url || ''} onChange={e => setLessonData({...lessonData, video_url: e.target.value})} className="md:col-span-2 h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-xs font-black outline-none focus:border-blue-500 focus:bg-white/10" placeholder="https://..." />
                   </div>
                </section>

                <section className="space-y-6 pt-6 border-t border-white/5">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center shadow-lg"><FaFilePdf size={16} /></div>
                     <label className="text-sm font-black text-white tracking-wide uppercase">الملازم والكتب (PDF)</label>
                   </div>
                   <input 
                      type="url" 
                      value={lessonData.pdf_url || ''} 
                      onChange={e => setLessonData({...lessonData, pdf_url: e.target.value})} 
                      className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-xs font-black outline-none focus:border-blue-500 focus:bg-white/10" 
                      placeholder="ضع رابط ملف الـ PDF هنا (Google Drive, Bunny, etc)..." 
                   />
                </section>

                <section className="space-y-6 pt-6 border-t border-white/5">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 bg-indigo-600/20 text-indigo-500 rounded-xl flex items-center justify-center shadow-lg"><FaGraduationCap size={16} /></div>
                     <label className="text-sm font-black text-white tracking-wide uppercase">تخصيص اختبار للحصة</label>
                   </div>
                   <div className="relative group">
                      <select 
                        value={lessonData.exam_id || ''} 
                        onChange={e => setLessonData({...lessonData, exam_id: e.target.value})} 
                        className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-black focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="">لا يوجد اختبار مرتبطة</option>
                        {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                      </select>
                      <FaChevronDown className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" />
                   </div>
                </section>

                <section className="space-y-6 pt-6 border-t border-white/5">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 bg-amber-600/20 text-amber-500 rounded-xl flex items-center justify-center shadow-lg"><FaBolt size={16} /></div>
                     <div>
                        <label className="text-sm font-black text-white tracking-wide uppercase">تسعير الحصة (Business Logic)</label>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Leave at 0 if the lesson is free or included in full course only</p>
                     </div>
                   </div>
                   <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={lessonData.price || 0} 
                        onChange={e => setLessonData({...lessonData, price: parseFloat(e.target.value)})} 
                        className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-lg font-black focus:border-amber-500 transition-all outline-none" 
                        placeholder="0.00" 
                      />
                      <span className="absolute left-6 text-xs font-black text-slate-500">EGP</span>
                   </div>
                </section>

                {/* 🔴 EDPUZZLE STYLE CHECKPOINTS UI */}
                <section className="space-y-6 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-emerald-600/20 text-emerald-500 rounded-xl flex items-center justify-center shadow-lg"><FaMagic size={16} /></div>
                       <div>
                         <label className="text-sm font-black text-white uppercase tracking-wide">النقاط التفاعلية (Checkpoints)</label>
                         <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Interactive Video Pauses & MCQ Questions</p>
                       </div>
                     </div>
                     <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={handleAddCheckpoint} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-900/30 uppercase tracking-widest flex items-center gap-2">Add Point +</motion.button>
                  </div>
                  
                  <div className="space-y-4">
                    {lessonData.checkpoints?.map((cp, i) => (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className="p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 flex flex-col gap-6 group/cp relative transition-all hover:bg-white/[0.04] hover:border-emerald-500/20 group">
                        <div className="flex flex-col md:flex-row items-start gap-6">
                          <div className="flex items-center gap-3">
                             <div className="w-20">
                                <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block text-center">دقيقة</label>
                                <input 
                                  type="number" 
                                  value={Math.floor(cp.time / 60) || 0} 
                                  onChange={(e) => {
                                     const newCheckpoints = [...lessonData.checkpoints];
                                     const currentSecs = cp.time % 60;
                                     const newMins = parseInt(e.target.value) || 0;
                                     newCheckpoints[i].time = (newMins * 60) + currentSecs;
                                     setLessonData({...lessonData, checkpoints: newCheckpoints});
                                  }} 
                                  className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl text-center text-xs font-black text-emerald-400 focus:border-emerald-500 outline-none" 
                                  placeholder="0" 
                                />
                             </div>
                             <span className="text-slate-500 mt-6 font-bold">:</span>
                             <div className="w-20">
                                <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block text-center">ثانية</label>
                                <input 
                                  type="number" 
                                  max="59"
                                  value={cp.time % 60 || 0} 
                                  onChange={(e) => {
                                     const newCheckpoints = [...lessonData.checkpoints];
                                     const currentMins = Math.floor(cp.time / 60);
                                     let newSecs = parseInt(e.target.value) || 0;
                                     if (newSecs > 59) newSecs = 59;
                                     newCheckpoints[i].time = (currentMins * 60) + newSecs;
                                     setLessonData({...lessonData, checkpoints: newCheckpoints});
                                  }} 
                                  className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl text-center text-xs font-black text-emerald-400 focus:border-emerald-500 outline-none" 
                                  placeholder="0" 
                                />
                             </div>
                          </div>
                          <div className="flex-1 w-full">
                             <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block">Question Content</label>
                             <input type="text" value={cp.question} onChange={(e) => {
                                const newCheckpoints = [...lessonData.checkpoints];
                                newCheckpoints[i].question = e.target.value;
                                setLessonData({...lessonData, checkpoints: newCheckpoints});
                             }} className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-5 text-xs font-black outline-none focus:border-emerald-500" placeholder="ما هي نتيجة المعادلة السابقة؟" />
                          </div>
                          <button type="button" onClick={() => {
                             const newCheckpoints = lessonData.checkpoints.filter((_, idx) => idx !== i);
                             setLessonData({...lessonData, checkpoints: newCheckpoints});
                          }} className="mt-6 md:mt-8 p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><FaTrash size={14} /></button>
                        </div>
                        
                        {/* 🔘 MCQ Options Editor */}
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">الاختيارات (MCQ)</label>
                              <button 
                                type="button" 
                                onClick={() => {
                                  const newCheckpoints = [...lessonData.checkpoints];
                                  newCheckpoints[i].options = [...(newCheckpoints[i].options || []), ''];
                                  setLessonData({...lessonData, checkpoints: newCheckpoints});
                                }}
                                className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                              >
                                + إضافة اختيار
                              </button>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(cp.options || []).map((opt, optIdx) => (
                                <div key={optIdx} className="relative group/opt">
                                   <input 
                                      type="text" 
                                      value={opt} 
                                      onChange={(e) => {
                                        const newCheckpoints = [...lessonData.checkpoints];
                                        newCheckpoints[i].options[optIdx] = e.target.value;
                                        setLessonData({...lessonData, checkpoints: newCheckpoints});
                                      }}
                                      className={`w-full h-12 bg-slate-950 border rounded-xl px-10 text-xs font-bold outline-none transition-all ${cp.answer === optIdx ? 'border-emerald-500/50 text-emerald-400' : 'border-white/5 focus:border-blue-500/30'}`}
                                      placeholder={`اختيار ${optIdx + 1}`}
                                   />
                                   <button 
                                      type="button"
                                      onClick={() => {
                                        const newCheckpoints = [...lessonData.checkpoints];
                                        newCheckpoints[i].answer = optIdx;
                                        setLessonData({...lessonData, checkpoints: newCheckpoints});
                                      }}
                                      className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${cp.answer === optIdx ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20 text-transparent'}`}
                                   >
                                      <FaCheck size={8} />
                                   </button>
                                   <button 
                                      type="button"
                                      onClick={() => {
                                        const newCheckpoints = [...lessonData.checkpoints];
                                        newCheckpoints[i].options = newCheckpoints[i].options.filter((_, idx) => idx !== optIdx);
                                        setLessonData({...lessonData, checkpoints: newCheckpoints});
                                      }}
                                      className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover/opt:opacity-100 transition-all"
                                   >
                                      <FaTimes size={10} />
                                   </button>
                                </div>
                              ))}
                           </div>
                        </div>
                      </motion.div>
                    ))}
                    {(!lessonData.checkpoints || lessonData.checkpoints.length === 0) && (
                      <div className="py-14 text-center border-2 border-dashed border-white/5 rounded-[3rem] group hover:border-emerald-500/20 transition-all cursor-pointer" onClick={handleAddCheckpoint}>
                        <FaQuestionCircle size={30} className="mx-auto text-white/5 mb-4 group-hover:text-emerald-500/20 transition-all" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Ignition Sequence: Add Interactive Point</p>
                      </div>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-white/5">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">جدولة الإطلاق الذكي</label>
                      <div className="relative">
                        <FaClock className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input type="datetime-local" value={lessonData.scheduled_at || ''} onChange={e => setLessonData({...lessonData, scheduled_at: e.target.value})} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pr-14 pl-6 text-xs font-black outline-none focus:border-blue-500 text-slate-300" />
                      </div>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">بروتوكول الوصول</label>
                      <div 
                        onClick={() => setLessonData({...lessonData, is_free: !lessonData.is_free})}
                        className={`h-16 flex items-center justify-between px-8 rounded-2xl border cursor-pointer transition-all ${lessonData.is_free ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-white/10'}`}
                      >
                        <div className="flex items-center gap-4">
                          {lessonData.is_free ? <FaGlobe className="text-emerald-400" /> : <FaLock className="text-slate-600" />}
                          <span className="text-[11px] font-black uppercase tracking-widest">{lessonData.is_free ? 'Public Access' : 'Private Curriculum'}</span>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${lessonData.is_free ? 'bg-emerald-500 shadow-neon' : 'bg-slate-700'}`}></div>
                      </div>
                   </div>
                </div>

                <div className="pt-10">
                  <motion.button 
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(37,99,235,0.2)' }} whileTap={{ scale: 0.98 }}
                    type="submit" disabled={isSaving}
                    className="w-full h-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-[2rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-4 group disabled:opacity-50"
                  >
                    {isSaving ? (
                      <span className="animate-spin border-4 border-white/30 border-t-white w-8 h-8 rounded-full"></span>
                    ) : (
                      <>
                        <FaSave className="text-2xl group-hover:rotate-12 transition-transform" /> {lessonData.id ? 'حفظ التغييرات ونشر التحديث' : 'اعتماد المحتوى وإطلاق الدرس'}
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📁 Chapter Modal (Units) */}
      <AnimatePresence>
        {isChapterFormOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChapterFormOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-2xl"></motion.div>
             <motion.div initial={{ scale: 0.8, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 40 }} className="relative bg-[#111827] w-full max-w-xl p-12 rounded-[4rem] border border-white/10 shadow-[0_0_80px_rgba(79,70,229,0.15)] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
                <div className="flex justify-between items-start mb-10">
                   <div>
                     <Badge color="indigo">Curriculum Engine</Badge>
                     <h3 className="text-3xl font-black mt-5 text-white">إضافة إطار هيكلي</h3>
                     <p className="text-slate-500 font-bold mt-2 text-sm leading-relaxed">حدد اسم الباب أو الوحدة لترتيب المحتوى التعليمي</p>
                   </div>
                   <button onClick={() => setIsChapterFormOpen(false)} className="text-slate-500 hover:text-white"><FaTimes size={20} /></button>
                </div>
                <form onSubmit={handleSaveChapter} className="space-y-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">مسمى الباب الدراسي</label>
                      <input type="text" autoFocus value={chapterData.title} onChange={e => setChapterData({...chapterData, title: e.target.value})} required className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white/10 transition-all" placeholder="مثال: الباب الأول - الكيمياء التحليلية" />
                   </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">تسلسل الظهور</label>
                       <input type="number" value={chapterData.order_index} onChange={e => setChapterData({...chapterData, order_index: parseInt(e.target.value)})} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-black outline-none focus:border-indigo-500" placeholder="10" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">سعر الباب بالكامل</label>
                          <input type="number" value={chapterData.price || 0} onChange={e => setChapterData({...chapterData, price: parseFloat(e.target.value)})} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-black outline-none focus:border-amber-500" placeholder="0.00" />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">اختبار شامل للباب</label>
                          <div className="relative">
                            <select value={chapterData.exam_id || ''} onChange={e => setChapterData({...chapterData, exam_id: e.target.value})} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-[11px] font-black outline-none focus:border-indigo-500 appearance-none">
                              <option value="">لا يوجد اختبار</option>
                              {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                            </select>
                            <FaChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-[10px]" />
                          </div>
                       </div>
                    </div>
                   <div className="flex gap-4 pt-4">
                     <button type="submit" className="flex-1 h-16 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-900/40 hover:bg-indigo-500 transition-all active:scale-95">حفظ وتفعيل الباب</button>
                     <button type="button" onClick={() => setIsChapterFormOpen(false)} className="px-10 h-16 bg-white/5 text-slate-400 rounded-2xl font-black border border-white/5 hover:bg-white/10 transition-all">إلغاء</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📱 QR Display Modal */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQRModal(null)} className="absolute inset-0 bg-black/98 backdrop-blur-3xl"></motion.div>
            <motion.div initial={{ scale: 0.3, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.3, opacity: 0 }} className="relative bg-white p-12 rounded-[5rem] text-center max-w-sm w-full shadow-[0_0_100px_rgba(255,255,255,0.1)]">
               <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
               <div className="mb-10">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><FaQrcode size={28} /></div>
                 <h4 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">QR Code الدرس الذكي</h4>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">{showQRModal.title}</p>
               </div>
               
               <div className="bg-slate-50 p-10 rounded-[3.5rem] border-2 border-slate-100 flex items-center justify-center mb-10 relative group">
                  <QRCodeSVG 
                    value={`https://smart-center.app/lessons/${showQRModal.id}`} 
                    size={220}
                    level="H"
                    includeMargin={false}
                  />
                  <div className="absolute w-14 h-14 bg-white rounded-2xl shadow-2xl border-4 border-slate-50 flex items-center justify-center text-blue-600 font-black text-xl group-hover:scale-110 transition-transform">S</div>
               </div>

               <p className="text-xs font-bold text-slate-400 mb-10 leading-loose">
                 اطبع هذا الرمز وضعه في الملزمة المطبوعة <br /> <span className="text-slate-900">لفتح الدرس آلياً عند المسح بالموبايل</span>
               </p>

               <div className="grid grid-cols-1 gap-4">
                 <button 
                  onClick={() => window.print()} 
                  className="w-full h-16 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                 >
                   <FaMagic /> طباعة كرت الدرس
                 </button>
                 <button onClick={() => setShowQRModal(null)} className="text-xs font-black text-slate-400 uppercase tracking-widest py-2 hover:text-slate-900 transition-colors">إغلاق النافذة</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        .font-cairo { font-family: 'Cairo', sans-serif; }
        
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; }
        .shadow-neon { shadow: 0 0 15px rgba(16,185,129,0.3); }
        
        @media print {
          .no-print { display: none; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

const FaBox = () => <FaLayerGroup />;

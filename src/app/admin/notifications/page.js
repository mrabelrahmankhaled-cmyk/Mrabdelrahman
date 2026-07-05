'use client';

import { useState, useEffect, useMemo, useRef } from 'react'; 
import { supabaseBrowser } from '../../../lib/supabase';
import { 
    FaPaperPlane, FaUsers, FaUser, FaHistory, 
    FaFileAlt, FaShieldAlt, FaClock, FaFilter, FaEnvelopeOpenText, FaCheckDouble, 
    FaSync, FaPlus, FaTrash, FaArrowLeft, FaSearch, FaChevronDown, FaTag, 
    FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaCalendarAlt, FaLayerGroup
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast'; 
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function AdminNotificationsPage() {
    const { centerId, role, allowedFeatures, loading: authLoading } = useAuth();
    
    // 📊 Core Data States
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [courses, setCourses] = useState([]); 
    const [history, setHistory] = useState([]); 
    const [stages, setStages] = useState([]);

    // 🔍 Selection & Filter States
    const [targetType, setTargetType] = useState('all'); // all, group, student
    const [selectedGrade, setSelectedGrade] = useState(''); 
    const [selectedInstructorName, setSelectedInstructorName] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState(''); 
    const [selectedTargetId, setSelectedTargetId] = useState(''); 
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // 📝 Message States
    const [notification, setNotification] = useState({ title: '', message: '', type: 'info' });
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [customTemplates, setCustomTemplates] = useState([]);
    
    // ⚙️ UI States
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [activeTab, setActiveTab] = useState('composer'); // composer, history
    const messageInputRef = useRef(null);
    const searchWrapperRef = useRef(null);

    // 🏁 Initial Load
    useEffect(() => {
        if (centerId) {
            fetchInitialData();
            fetchHistory();
            loadCustomTemplates();
        }
    }, [centerId]);

    // 🛡️ Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [stagesRes, coursesRes, groupsRes, studentsRes] = await Promise.all([
                supabaseBrowser.from('educational_stages').select('*').eq('center_id', centerId).order('sort_order', { ascending: true }),
                supabaseBrowser.from('courses').select('id, name, grade, instructors(name)').eq('center_id', centerId),
                supabaseBrowser.from('groups').select('id, name, course_id').eq('center_id', centerId),
                supabaseBrowser.from('students').select(`id, name, grade, group_ids, enrolled_courses`).or(`center_id.eq.${centerId},center_id.is.null`)
            ]);

            setStages(stagesRes.data || []);
            setCourses(coursesRes.data || []);
            setGroups(groupsRes.data || []);
            
            // Normalize student groups
            const normalizedStudents = (studentsRes.data || []).map(s => ({
                ...s,
                group_ids_array: Array.isArray(s.group_ids) ? s.group_ids : Object.values(s.group_ids || {})
            }));
            setStudents(normalizedStudents);
        } catch (error) {
            toast.error('خطأ في تحميل البيانات الأساسية');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        if (!centerId) return;
        try {
            const { data } = await supabaseBrowser
                .from('notifications')
                .select(`*, students(name, grade)`)
                .eq('center_id', centerId)
                .order('created_at', { ascending: false })
                .limit(50);
            setHistory(data || []);
        } catch (e) { console.error(e); }
    };

    const loadCustomTemplates = () => {
        const saved = localStorage.getItem('custom_notification_templates');
        if (saved) setCustomTemplates(JSON.parse(saved));
    };

    const saveTemplate = () => {
        if (!notification.title.trim() || !notification.message.trim()) {
            return toast.error('يرجى كتابة عنوان ورسالة لحفظ القالب');
        }
        const newTemplate = { id: Date.now(), ...notification };
        const updated = [...customTemplates, newTemplate];
        setCustomTemplates(updated);
        localStorage.setItem('custom_notification_templates', JSON.stringify(updated));
        toast.success('تم حفظ القالب بنجاح');
    };

    const deleteTemplate = (id) => {
        const updated = customTemplates.filter(t => t.id !== id);
        setCustomTemplates(updated);
        localStorage.setItem('custom_notification_templates', JSON.stringify(updated));
        toast.success('تم حذف القالب');
    };

    // 🧪 Filtering Logic
    // ✅ Unique instructors from filtered courses by grade
    const filteredInstructors = useMemo(() => {
        const coursesForGrade = courses.filter(c => !selectedGrade || c.grade === selectedGrade);
        const names = [...new Set(
            coursesForGrade
                .map(c => c.instructors?.name)
                .filter(Boolean)
        )];
        return names;
    }, [courses, selectedGrade]);

    const filteredCourses = useMemo(() => {
        return courses.filter(c =>
            (!selectedGrade || c.grade === selectedGrade) &&
            (!selectedInstructorName || c.instructors?.name === selectedInstructorName)
        );
    }, [courses, selectedGrade, selectedInstructorName]);

    const filteredGroups = useMemo(() => {
        const validCourseIds = filteredCourses.map(c => c.id);
        return groups.filter(g => validCourseIds.length === 0 || validCourseIds.includes(g.course_id));
    }, [groups, filteredCourses]);

    const searchableStudents = useMemo(() => {
        let list = students;
        if (selectedGrade) list = list.filter(s => s.grade === selectedGrade);
        
        // If course or group is selected, filter by those memberships
        if (selectedCourseId || selectedTargetId) {
            const validGroupIds = groups.filter(g => 
                (!selectedCourseId || g.course_id === selectedCourseId) &&
                (targetType !== 'group' || !selectedTargetId || g.id === selectedTargetId)
            ).map(g => g.id);
            
            list = list.filter(s => s.group_ids_array?.some(gid => validGroupIds.includes(gid)));
        }

        if (searchTerm) {
            list = list.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return list;
    }, [students, selectedGrade, selectedCourseId, selectedTargetId, targetType, searchTerm, groups]);

    const stats = useMemo(() => {
        return {
            totalSent: history.filter(h => h.status === 'sent').length,
            scheduled: history.filter(h => h.status === 'scheduled').length,
            inbox: history.filter(h => h.type === 'parent_message').length
        };
    }, [history]);

    // 🛠️ Handlers
    const insertTag = (tag) => {
        const textarea = messageInputRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newMessage = notification.message.substring(0, start) + tag + notification.message.substring(end);
            setNotification({ ...notification, message: newMessage });
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + tag.length, start + tag.length);
            }, 0);
        } else {
            setNotification({ ...notification, message: notification.message + ' ' + tag });
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        // Removed restriction requiring a specific group. If no group is selected, it will send to all filtered courses.
        if (targetType === 'grade' && !selectedGrade) {
             return toast.error('يرجى تحديد الصف الدراسي');
        }
        if (targetType === 'student' && !selectedTargetId) {
             return toast.error('يرجى اختيار الطالب المستهدف');
        }
        if (!notification.title || !notification.message) {
            return toast.error('يرجى كتابة عنوان ورسالة التنبيه');
        }

        setIsSending(true);
        try {
            let targetList = [];
            if (targetType === 'all') {
                targetList = students;
            } else if (targetType === 'grade') {
                targetList = students.filter(s => s.grade === selectedGrade);
            } else if (targetType === 'group') {
                if (selectedTargetId) {
                    targetList = students.filter(s => s.group_ids_array?.includes(selectedTargetId));
                } else {
                    const validCourseIds = filteredCourses.map(c => c.id);
                    targetList = students.filter(s => 
                        s.enrolled_courses?.some(cid => validCourseIds.includes(cid)) || 
                        (s.group_ids_array && s.group_ids_array.some(gid => filteredGroups.some(g => g.id === gid)))
                    );
                }
            } else if (targetType === 'student') {
                const s = students.find(x => x.id === selectedTargetId);
                if (s) targetList = [s];
            }

            if (targetList.length === 0) throw new Error('لا يوجد طلاب مستهدفين في هذا النطاق');

            // ✅ حل الكورس والمدرس: بالـ ID أولاً، ثم بالاسم، ثم fallback عام
            const currentCourse =
                courses.find(c => c.id === selectedCourseId) ||
                (selectedInstructorName ? courses.find(c => c.instructors?.name === selectedInstructorName) : null) ||
                null;

            const resolvedInstructor = currentCourse?.instructors?.name || selectedInstructorName || 'المدرس';
            const resolvedCourseName = currentCourse?.name || 'الكورس';
            const today = new Date().toLocaleDateString('ar-EG');
            const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

            const payload = targetList.map(st => ({
                center_id: centerId,
                student_id: st.id,
                title: notification.title
                    .replace(/\[student\]/g, st.name)
                    .replace(/\[grade\]/g, st.grade || '')
                    .replace(/\[course\]/g, resolvedCourseName)
                    .replace(/\[instructor\]/g, resolvedInstructor)
                    .replace(/\[date\]/g, today)
                    .replace(/\[time\]/g, now),
                message: notification.message
                    .replace(/\[student\]/g, st.name)
                    .replace(/\[grade\]/g, st.grade || '')
                    .replace(/\[course\]/g, resolvedCourseName)
                    .replace(/\[instructor\]/g, resolvedInstructor)
                    .replace(/\[date\]/g, today)
                    .replace(/\[time\]/g, now),
                type: notification.type,
                status: isScheduled ? 'scheduled' : 'sent',
                scheduled_at: isScheduled ? new Date(scheduledTime).toISOString() : null,
            }));

            // Supabase handles bulk insert
            const { error } = await supabaseBrowser.from('notifications').insert(payload);
            if (error) throw error;

            toast.success(isScheduled ? '⏳ تمت جدولة التنبيهات بنجاح' : `🚀 تم إرسال ${payload.length} تنبيه بنجاح`);
            setNotification({ title: '', message: '', type: 'info' });
            setIsScheduled(false);
            setTargetType('all');
            setSelectedTargetId('');
            setSearchTerm('');
            fetchHistory();
            setActiveTab('history');
        } catch (error) {
            toast.error(error.message || 'حدث خطأ أثناء الإرسال');
        } finally {
            setIsSending(false);
        }
    };

    if (authLoading) return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-black animate-pulse">جاري التحميل...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-cairo" dir="rtl">
            <Toaster position="top-center" />
            
            <div className="max-w-7xl mx-auto">
                {/* 🏔️ Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <Link 
                            href="/admin/dashboard" 
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm border border-slate-100"
                        >
                            <FaArrowLeft />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-blue-600/10 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border border-blue-100">Broadcast Engine</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900">البث المباشر <span className="text-blue-600">والإشعارات</span></h1>
                        </div>
                    </div>
                    
                    <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                        <button 
                            onClick={() => setActiveTab('composer')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'composer' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            <FaPaperPlane className="inline-block ml-2" /> إرسال جديد
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            <FaHistory className="inline-block ml-2" /> سجل البث
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* 🚀 Composer Side */}
                    <div className={`${activeTab === 'composer' ? 'lg:col-span-8' : 'hidden lg:block lg:col-span-4'} space-y-8`}>
                        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-100">
                            <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                <span className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><FaPaperPlane size={14} /></span>
                                تجهيز البث المتقدم
                            </h2>

                            <form onSubmit={handleSend} className="space-y-8">
                                {/* 🎯 Target Selection */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mr-1">1. تحديد نطاق الإرسال</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { id: 'all', label: 'الكل', icon: <FaUsers /> },
                                            { id: 'grade', label: 'صف دراسي', icon: <FaTag /> },
                                            { id: 'group', label: 'كورس/مجموعة', icon: <FaLayerGroup /> },
                                            { id: 'student', label: 'طالب', icon: <FaUser /> },
                                        ].map(type => (
                                            <button 
                                                key={type.id}
                                                type="button"
                                                onClick={() => { setTargetType(type.id); setSelectedTargetId(''); setSelectedInstructorName(''); setSearchTerm(''); }}
                                                className={`h-24 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${targetType === type.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 -translate-y-1' : 'bg-white border-slate-50 text-slate-400 hover:border-blue-100 hover:bg-blue-50/50'}`}
                                            >
                                                <span className="text-xl">{type.icon}</span>
                                                <span className="text-xs font-black">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 🔍 Dynamic Filters */}
                                <AnimatePresence mode="wait">
                                    {targetType !== 'all' && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-200/50"
                                        >
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block mr-1">تصفية حسب الصف</label>
                                                <select 
                                                    value={selectedGrade}
                                                    onChange={(e) => { setSelectedGrade(e.target.value); setSelectedInstructorName(''); setSelectedCourseId(''); setSelectedTargetId(''); }}
                                                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-xs font-black outline-none focus:ring-2 ring-blue-500/10 transition-all appearance-none"
                                                >
                                                    <option value="">-- كل الصفوف --</option>
                                                    {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                </select>
                                            </div>

                                            {/* 👨‍🏫 Instructor filter — shown for 'group' type when instructors exist */}
                                            {targetType === 'group' && filteredInstructors.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase block mr-1">اختر المدرس</label>
                                                    <select
                                                        value={selectedInstructorName}
                                                        onChange={(e) => { setSelectedInstructorName(e.target.value); setSelectedTargetId(''); }}
                                                        className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-xs font-black outline-none focus:ring-2 ring-blue-500/10 transition-all appearance-none"
                                                    >
                                                        <option value="">-- كل المدرسين --</option>
                                                        {filteredInstructors.map(name => (
                                                            <option key={name} value={name}>{name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {targetType === 'group' && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase block mr-1">اختر المجموعة</label>
                                                    <select 
                                                        value={selectedTargetId}
                                                        onChange={(e) => setSelectedTargetId(e.target.value)}
                                                        className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-xs font-black outline-none focus:ring-2 ring-blue-500/10 transition-all appearance-none"
                                                    >
                                                        <option value="">-- كل المجموعات (والطلاب بدون مجموعة) --</option>
                                                        {filteredGroups.map(g => (
                                                            <option key={g.id} value={g.id}>{g.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {targetType === 'student' && (
                                                <div className="space-y-2 md:col-span-2 relative" ref={searchWrapperRef}>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase block mr-1">البحث عن طالب</label>
                                                    <div className="relative">
                                                        <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                        <input 
                                                            type="text"
                                                            placeholder="اكتب اسم الطالب للبحث..."
                                                            value={searchTerm}
                                                            onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                                                            onFocus={() => setIsDropdownOpen(true)}
                                                            className="w-full h-12 bg-white border border-slate-200 rounded-xl pr-10 pl-4 text-xs font-black outline-none focus:ring-2 ring-blue-500/10 transition-all"
                                                        />
                                                    </div>
                                                    
                                                    {isDropdownOpen && searchTerm.length > 0 && (
                                                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                                                            {searchableStudents.length > 0 ? searchableStudents.map(s => (
                                                                <button 
                                                                    key={s.id}
                                                                    type="button"
                                                                    onClick={() => { setSelectedTargetId(s.id); setSearchTerm(s.name); setIsDropdownOpen(false); }}
                                                                    className="w-full p-4 text-right text-xs font-black text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-b border-slate-50 last:border-0 transition-all"
                                                                >
                                                                    {s.name} <span className="text-[10px] opacity-40 ml-2">({s.grade})</span>
                                                                </button>
                                                            )) : (
                                                                <div className="p-6 text-center text-[10px] text-slate-400 font-bold">لا توجد نتائج مطابقة</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* 📣 Message Details */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mr-1">عنوان التنبيه</label>
                                            <input 
                                                type="text" required
                                                value={notification.title}
                                                onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                                                placeholder="مثلاً: تنبيه هام بخصوص الامتحان"
                                                className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black outline-none focus:ring-2 ring-blue-500/10 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {[
                                                { tag: '[student]', label: 'اسم الطالب' },
                                                { tag: '[course]', label: 'المادة' },
                                                { tag: '[instructor]', label: 'المدرس' },
                                                { tag: '[grade]', label: 'الصف' },
                                                { tag: '[date]', label: 'التاريخ' },
                                                { tag: '[time]', label: 'الوقت' },
                                            ].map(t => (
                                                <button 
                                                    key={t.tag}
                                                    type="button"
                                                    onClick={() => insertTag(t.tag)}
                                                    className="bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5"
                                                >
                                                    <FaTag size={8} /> {t.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mr-1 mb-2">محتوى الرسالة</label>
                                            <textarea 
                                                ref={messageInputRef}
                                                required
                                                value={notification.message}
                                                onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                                                placeholder="اكتب هنا نص الرسالة التي ستصل للطلاب على التطبيق..."
                                                className="w-full h-40 bg-slate-50 border-none rounded-3xl p-6 text-sm font-bold outline-none focus:ring-2 ring-blue-500/10 transition-all resize-none shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* 🎨 Message Type */}
                                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">الحالة:</span>
                                        {[
                                            { id: 'info', icon: <FaInfoCircle />, color: 'blue' },
                                            { id: 'warning', icon: <FaExclamationTriangle />, color: 'amber' },
                                            { id: 'success', icon: <FaCheckCircle />, color: 'emerald' },
                                        ].map(t => (
                                            <button 
                                                key={t.id}
                                                type="button"
                                                onClick={() => setNotification({ ...notification, type: t.id })}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${notification.type === t.id ? `bg-${t.color}-600 text-white shadow-lg` : `bg-white text-slate-300 hover:text-${t.color}-500 hover:bg-${t.color}-50`}`}
                                            >
                                                {t.icon}
                                            </button>
                                        ))}
                                    </div>

                                    {/* ⏰ Scheduling */}
                                    <div className={`p-6 rounded-3xl border-2 transition-all ${isScheduled ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <label className="flex items-center gap-3 cursor-pointer group mb-1">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isScheduled ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                {isScheduled ? <FaCheckCircle size={12} /> : <div className="w-2 h-2 bg-white rounded-full"></div>}
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={isScheduled} 
                                                onChange={(e) => setIsScheduled(e.target.checked)} 
                                            />
                                            <span className={`text-xs font-black transition-all ${isScheduled ? 'text-amber-800' : 'text-slate-400'}`}>جدولة البث لوقت لاحق</span>
                                        </label>
                                        
                                        <AnimatePresence>
                                            {isScheduled && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="pt-4"
                                                >
                                                    <div className="relative">
                                                        <FaCalendarAlt className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500" />
                                                        <input 
                                                            type="datetime-local" 
                                                            required
                                                            value={scheduledTime}
                                                            onChange={(e) => setScheduledTime(e.target.value)}
                                                            className="w-full h-12 bg-white border border-amber-200 rounded-xl pr-10 pl-4 text-xs font-black outline-none focus:ring-2 ring-amber-500/20 text-amber-900" 
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* 🚀 Submit Button */}
                                <motion.button 
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    disabled={isSending}
                                    className="w-full h-16 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-slate-200 flex items-center justify-center gap-4 hover:bg-black transition-all disabled:opacity-50"
                                >
                                    {isSending ? (
                                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <FaPaperPlane className="text-xl" />
                                            <span>{isScheduled ? 'تم تأكيد الجدولة' : 'بث التنبيه الآن'}</span>
                                        </>
                                    )}
                                </motion.button>
                            </form>
                        </div>
                    </div>

                    {/* 📊 History & Templates Side */}
                    <div className={`${activeTab === 'history' ? 'lg:col-span-12' : 'lg:col-span-4'} space-y-8`}>
                        {/* 📊 Quick Stats (Only in history tab or desktop) */}
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                            {[
                                { label: 'تنبيهات ناجحة', value: stats.totalSent, color: 'blue', icon: <FaCheckDouble /> },
                                { label: 'تنبيهات مجدولة', value: stats.scheduled, color: 'amber', icon: <FaClock /> },
                            ].map((s, i) => (
                                <div key={s.label} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center text-xl`}>{s.icon}</div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                                        <h3 className="text-2xl font-black text-slate-900">{s.value}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 📋 Templates Section */}
                        {activeTab === 'composer' && (
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
                                    <FaFileAlt className="text-blue-600" /> القوالب المحفوظة
                                </h3>
                                <div className="space-y-3">
                                    {customTemplates.length === 0 ? (
                                        <div className="p-10 border-2 border-dashed border-slate-50 rounded-[2rem] text-center">
                                            <FaInfoCircle className="mx-auto text-slate-200 mb-4" size={30} />
                                            <p className="text-[10px] font-black text-slate-300">لا توجد قوالب محفوظة حالياً</p>
                                        </div>
                                    ) : (
                                        customTemplates.map(t => (
                                            <div key={t.id} className="group flex items-center gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => setNotification({ title: t.title, message: t.message, type: t.type })}
                                                    className="flex-1 bg-slate-50 p-4 rounded-2xl text-right hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                                                >
                                                    <p className="text-[10px] font-black text-slate-900 truncate">{t.title}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 line-clamp-1 mt-0.5">{t.message}</p>
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => deleteTemplate(t.id)}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                    <button 
                                        type="button"
                                        onClick={saveTemplate}
                                        className="w-full h-12 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        <FaPlus /> حفظ الرسالة الحالية كقالب
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 🕒 Broadcast Log */}
                        <div className={`${activeTab === 'history' ? 'block' : 'hidden lg:block'} bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm`}>
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                    <FaHistory className="text-blue-600" /> سجل آخر النشاطات
                                </h3>
                                <button onClick={fetchHistory} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all">
                                    <FaSync size={12} />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                                {history.length === 0 ? (
                                    <div className="p-20 text-center opacity-30">
                                        <FaEnvelopeOpenText size={40} className="mx-auto mb-4" />
                                        <p className="text-xs font-black">سجل البث فارغ حالياً</p>
                                    </div>
                                ) : history.map((item, idx) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        key={item.id} 
                                        className="p-5 rounded-3xl border border-slate-100 hover:border-blue-100 transition-all bg-slate-50/30 group relative overflow-hidden"
                                    >
                                        <div className={`absolute left-0 top-0 w-1 h-full bg-${item.type === 'error' ? 'red' : item.type === 'warning' ? 'amber' : 'blue'}-500 opacity-20 group-hover:opacity-100 transition-all`}></div>
                                        
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="text-xs font-black text-slate-900 mb-1">{item.title}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-slate-400 flex items-center gap-1">
                                                        <FaUser size={8} /> {item.students?.name || 'غير معروف'}
                                                    </span>
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${item.status === 'sent' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 animate-pulse'}`}>
                                                        {item.status === 'sent' ? 'تم الإرسال' : 'مجدول'}
                                                    </span>
                                                    {item.status === 'sent' && (
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${item.seen_by?.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            {item.seen_by?.length > 0 ? <><FaCheckDouble size={8}/> مقروء</> : 'لم يُقرأ'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-300 mt-1 uppercase tracking-tighter">
                                                {new Date(item.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-bold">{item.message}</p>
                                        
                                        {item.status === 'scheduled' && (
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[9px] font-black text-amber-600">
                                                <FaClock size={9} /> موعد الجدولة: {new Date(item.scheduled_at).toLocaleString('ar-EG')}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
                .font-cairo { font-family: 'Cairo', sans-serif; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
}
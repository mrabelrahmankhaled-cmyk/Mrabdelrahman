'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase-browser';
import { useAuth } from '../../../context/AuthContext';
import {
    FaBook, FaPlayCircle, FaLock, FaGraduationCap,
    FaSearch, FaChevronLeft, FaStar, FaFire, FaBolt, FaAward, FaGhost, FaMagic, FaArrowLeft, FaThLarge, FaFolderOpen, FaBoxOpen
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ============================================================
// StudentCoursesClient — Client Component
// ============================================================
// Receives: centerCourses, centerSettings, centerType (pre-fetched
// and cached server-side). Only fetches student-specific data
// (enrollments, lesson/chapter access, exam counts) client-side.
// That's 3 parallel queries instead of the old 7+ sequential ones.
// ============================================================
export default function StudentCoursesClient({ centerCourses = [], centerSettings = null, centerType = 'center' }) {
    const router = useRouter();
    const { user } = useAuth();

    // State for student-specific data only
    const [fullEnrollments, setFullEnrollments] = useState([]);
    const [partialEnrollments, setPartialEnrollments] = useState([]);
    const [courseExamsCount, setCourseExamsCount] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        fetchStudentData();
    }, [user?.id]);

    const fetchStudentData = async () => {
        setLoading(true);
        try {
            // ✅ 3 parallel queries — only student-specific data (cannot be cached server-side)
            // center-level data (courses, settings) is already passed as props from the Server Component
            const [enrollmentsRes, lessonAccessRes, chapterAccessRes, examsRes, submissionsRes] = await Promise.all([
                // 1. Which courses has this student fully enrolled in?
                supabase
                    .from('student_online_enrollments')
                    .select('course_id')
                    .eq('student_id', user.id),

                // 2. Which courses have at least one lesson unlocked?
                supabase
                    .from('student_lesson_access')
                    .select('course_id')
                    .eq('student_id', user.id),

                // 3. Which courses have at least one chapter unlocked?
                supabase
                    .from('student_chapter_access')
                    .select('course_id')
                    .eq('student_id', user.id),

                // 4. Active electronic exams (center-wide — but we need to correlate with submissions)
                supabase
                    .from('exams')
                    .select('id, course_id')
                    .eq('is_published', true)
                    .eq('is_electronic', true),

                // 5. Which exams has this student already completed?
                supabase
                    .from('student_exam_submissions')
                    .select('exam_id')
                    .eq('student_id', user.id)
                    .in('status', ['completed', 'timed_out']),
            ]);

            // Full enrollments
            setFullEnrollments(enrollmentsRes.data?.map(e => e.course_id) || []);

            // Partial access
            const partialIds = [
                ...new Set([
                    ...(lessonAccessRes.data?.map(l => l.course_id) || []),
                    ...(chapterAccessRes.data?.map(c => c.course_id) || []),
                ]),
            ];
            setPartialEnrollments(partialIds);

            // Exam counts
            const submittedIds = new Set(submissionsRes.data?.map(s => s.exam_id) || []);
            const counts = {};
            examsRes.data?.forEach(exam => {
                if (!submittedIds.has(exam.id)) {
                    counts[exam.course_id] = (counts[exam.course_id] || 0) + 1;
                }
            });
            setCourseExamsCount(counts);

        } catch (err) {
            console.error('Student data fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const primaryColor = centerSettings?.primary_color || '#2563eb';

    // Filter & categorize courses — done in-memory using server-provided data
    const filteredCourses = centerCourses.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.instructors?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const myCourses = filteredCourses.filter(c => fullEnrollments.includes(c.id) || partialEnrollments.includes(c.id));
    const availableCourses = filteredCourses.filter(c => !fullEnrollments.includes(c.id) && !partialEnrollments.includes(c.id));

    if (loading) return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center space-y-8" dir="rtl">
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-[#2A9D8F]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-[#2A9D8F] rounded-full animate-spin"></div>
                <FaGraduationCap className="absolute inset-0 m-auto text-[#2A9D8F] text-3xl animate-pulse" />
            </div>
            <p className="text-[#264653] font-bold tracking-widest text-sm animate-pulse">جاري تحميل البيانات...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-12 selection:bg-[#2A9D8F]/30" dir="rtl">
            {/* Background Decoration */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] bg-[#2A9D8F]/5 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[25rem] h-[25rem] bg-[#264653]/5 blur-[150px] rounded-full"></div>
            </div>

            {/* 1. The Hero Banner (Always visible) */}
            <header className="max-w-7xl mx-auto mb-8 mt-6 relative bg-[#264653] rounded-3xl pt-8 px-8 md:pt-12 md:px-12 shadow-lg overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 z-10 w-full pb-8 md:pb-12">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm bg-white/10 text-white border-white/20">
                            منصة تعليمية
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full animate-ping bg-[#2A9D8F]"></div>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#F8F9FA] leading-tight mb-4">
                        كورسات الكيمياء{' '}
                        <span className="text-[#2A9D8F] block mt-2 text-3xl md:text-4xl">
                            د/ عبدالرحمن خالد
                        </span>
                    </h1>
                    
                    <p className="text-gray-300 font-bold text-sm md:text-base max-w-xl">
                        تصفح الكورسات المتاحة، شاهد حصصك، وحمل مذكراتك في مكان واحد.
                    </p>

                    <div className="mt-8 flex flex-col md:flex-row gap-4 max-w-xl">
                        <Link href="/portal/dashboard" className="flex items-center justify-center gap-3 bg-[#2A9D8F] hover:bg-teal-600 text-[#F8F9FA] px-6 py-4 rounded-xl transition-all font-black text-sm shadow-md whitespace-nowrap">
                            <FaThLarge /> العودة للمنصة
                        </Link>
                        
                        {(fullEnrollments.length > 0 || partialEnrollments.length > 0) && (
                            <div className="relative group flex-1">
                                <div className="absolute inset-0 bg-white/5 blur-xl group-focus-within:bg-white/10 transition-all opacity-0 group-focus-within:opacity-100"></div>
                                <FaSearch className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 group-focus-within:text-[#2A9D8F] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="ابحث عن مادة..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-14 bg-white border border-gray-100 rounded-xl pr-12 pl-4 text-sm font-black text-[#264653] outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent transition-all placeholder:text-gray-400 shadow-sm"
                                />
                            </div>
                        )}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="hidden md:block z-10 self-end -mb-2">
                    <img src="/hero-image.png" alt="د/ عبدالرحمن خالد" className="w-48 lg:w-64 object-contain drop-shadow-2xl" />
                </motion.div>
            </header>

            <div className="container max-w-7xl mx-auto px-4 mt-8">
                
                {/* 2. My Courses Section */}
                {myCourses.length > 0 && (
                    <div className="mb-16">
                        <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#2A9D8F]/10 text-[#2A9D8F] p-3 rounded-xl">
                                    <FaPlayCircle size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-[#264653]">متابعة التعلم</h2>
                                <div className="text-[11px] font-black text-[#13665a] uppercase bg-[#2A9D8F]/20 px-3 py-1 rounded-lg mr-4">
                                    {myCourses.length} ACTIVE
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                            <AnimatePresence mode="popLayout">
                                {myCourses.map((course, i) => {
                                    const isFull = fullEnrollments.includes(course.id);
                                    return (
                                        <CourseCard
                                            key={course.id}
                                            course={course}
                                            isEnrolled={true}
                                            accessType={isFull ? 'full' : 'partial'}
                                            index={i}
                                            examsCount={courseExamsCount[course.id] || 0}
                                            router={router}
                                        />
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* 3. Available Courses Section */}
                {availableCourses.length > 0 && (
                    <div className="mb-16">
                        <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#264653]/10 text-[#264653] p-3 rounded-xl">
                                    <FaBoxOpen size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-[#264653]">كورسات متاحة لك</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                            {availableCourses.map((course, i) => (
                                <CourseCard key={course.id} course={course} isEnrolled={false} index={i} router={router} />
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. Total Empty State (ONLY if BOTH are empty) */}
                {myCourses.length === 0 && availableCourses.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-md p-12 text-center flex flex-col items-center justify-center border border-gray-100 mt-12">
                        <div className="bg-[#2A9D8F]/10 p-5 rounded-full mb-6">
                            <FaFolderOpen size={48} className="text-[#2A9D8F]" />
                        </div>
                        <h3 className="text-[#264653] font-bold text-xl mb-2">بداية الرحلة</h3>
                        <p className="text-slate-500 font-medium mb-6">لم تشترك في أي مواد دراسية بعد، ولا توجد كورسات متاحة حالياً.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

// ── Course Card (unchanged UI) ─────────────────────────────────
function CourseCard({ course, isEnrolled, index, accessType, examsCount, router }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, type: 'spring', damping: 20 }}
            className="group relative bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-all duration-700 h-full flex flex-col"
        >
            <div
                onClick={() => { if (isEnrolled) router.push(`/student/courses/${course.id}`); }}
                className={`flex flex-col h-full ${isEnrolled ? 'cursor-pointer' : ''}`}
            >
                <div className="relative h-56 overflow-hidden bg-[#264653]">
                    {course.thumbnail_url ? (
                        <>
                            <img src={course.thumbnail_url} alt={course.name} className="w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-[#264653] flex items-center justify-center">
                            <FaBook className="text-white/20 text-6xl rotate-12" />
                        </div>
                    )}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-[#2A9D8F]/90 backdrop-blur-md rounded-lg border border-[#2A9D8F]/50 text-[10px] font-black text-white shadow-md">
                        {course.grade}
                    </div>
                    {examsCount > 0 && (
                        <div className="absolute top-4 left-4 px-3 py-1 bg-amber-500/90 backdrop-blur-md rounded-lg text-[10px] font-black text-white shadow-md">
                            {examsCount} امتحان
                        </div>
                    )}
                </div>

                <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <hgroup>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">المادة</p>
                            <h3 className="text-lg font-black text-[#264653] leading-tight group-hover:text-[#2A9D8F] transition-colors">{course.name}</h3>
                        </hgroup>
                        <div className="flex flex-col items-end">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">سعر الكورس</p>
                            <div className="flex items-center gap-2">
                                {course.original_price > course.digital_full_price && (
                                    <span className="text-sm font-bold text-gray-400 line-through decoration-red-500/50">{course.original_price}</span>
                                )}
                                <span className="text-xl font-black text-[#264653]">{course.digital_full_price || 0} <span className="text-[10px]">ج</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between text-gray-500">
                            <div className="flex items-center gap-2">
                                <FaAward className="text-[#2A9D8F]" size={14} />
                                <span className="text-xs font-bold">د/ {course.instructors?.name || 'عبدالرحمن خالد'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FaMagic size={12} className="text-[#2A9D8F]" />
                                <span className="text-xs font-bold">بدأ {new Date(course.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}</span>
                            </div>
                        </div>
                        {course.description && (
                            <p className="text-xs font-bold text-gray-500 line-clamp-2 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                                {course.description}
                            </p>
                        )}
                    </div>

                    <div className="mt-auto space-y-3">
                        {isEnrolled ? (
                            <div className="w-full h-12 bg-white border border-[#2A9D8F] text-[#2A9D8F] rounded-xl font-black text-sm flex items-center justify-center hover:bg-[#2A9D8F] hover:text-white transition-all shadow-sm">
                                متابعة الشرح
                            </div>
                        ) : (
                            <Link href={`/student/courses/${course.id}`} className="w-full h-12 bg-[#2A9D8F] text-white rounded-xl font-black text-sm flex items-center justify-center shadow-md hover:bg-teal-600 transition-all active:scale-95">
                                تفاصيل الكورس / اشتراك
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

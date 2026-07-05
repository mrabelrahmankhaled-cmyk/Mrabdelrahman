'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowRight, FaVideo, FaGraduationCap, FaChevronDown, FaChevronUp, FaClock, FaCheckCircle, FaFilePdf, FaClipboardList, FaFileAlt } from 'react-icons/fa';

export default function PublicCoursePage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openChapter, setOpenChapter] = useState(null);

  useEffect(() => {
    async function fetchCourseData() {
      if (!id) return;
      try {
        // Fetch course details
        const { data: courseData, error: courseError } = await supabaseBrowser
          .from('courses')
          .select('*, instructors(name)')
          .eq('id', id)
          .single();
          
        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch curriculum (chapters, lessons, and exams)
        const [chaptersRes, lessonsRes, examsRes] = await Promise.all([
          supabaseBrowser.from('lesson_chapters').select('*').eq('course_id', id).order('order_index'),
          supabaseBrowser.from('lessons').select('*').eq('course_id', id).order('order_index'),
          supabaseBrowser.from('exams').select('*').eq('course_id', id).eq('is_published', true)
        ]);

        if (chaptersRes.data) setChapters(chaptersRes.data);
        if (lessonsRes.data) setLessons(lessonsRes.data);
        if (examsRes.data) setExams(examsRes.data);

        // Open first chapter by default if exists
        if (chaptersRes.data && chaptersRes.data.length > 0) {
          setOpenChapter(chaptersRes.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCourseData();
  }, [id]);

  const handleSubscribe = () => {
    if (authLoading) return;
    if (!user) {
      // Not logged in -> Go to login
      router.push(`/login`);
    } else {
      // Logged in -> Go to student view / checkout
      router.push(`/student/courses/${id}`);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]" dir="rtl">
        <div className="w-16 h-16 border-4 border-[#2A9D8F] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] text-[#264653]" dir="rtl">
        <FaGraduationCap size={80} className="text-gray-300 mb-6" />
        <h1 className="text-3xl font-bold mb-4">الكورس غير موجود</h1>
        <p className="text-gray-500 mb-8">عذراً، لم نتمكن من العثور على هذا الكورس. ربما تم حذفه أو تغييره.</p>
        <Link href="/" className="px-8 py-3 bg-[#2A9D8F] text-white rounded-xl font-bold hover:bg-teal-600 transition-colors">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  // Calculate total lessons and duration dummy (since we might not have exact duration in DB)
  const totalLessons = lessons.length;
  const isFree = !course.digital_full_price && !course.price;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#264653]" dir="rtl">
      
      {/* ── 1. Hero Header (Top) ── */}
      <header className="bg-[#264653] pt-24 pb-32 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#2A9D8F]/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors text-sm font-bold">
            <FaArrowRight size={14} /> العودة للرئيسية
          </Link>

          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-4 py-1 rounded-full bg-[#2A9D8F] text-white text-xs font-bold tracking-wide">
                {course.grade}
              </span>
              <span className="px-4 py-1 rounded-full bg-white/10 text-white/90 text-xs font-bold border border-white/10">
                مستر/ {course.instructors?.name || 'مجهول'}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#F8F9FA] leading-tight mb-6">
              {course.name}
            </h1>
            
            <p className="text-lg text-white/80 leading-relaxed font-medium line-clamp-3">
              {course.description || 'انضم إلينا في هذا الكورس الشامل لتأسيسك وتدريبك بأحدث الأنظمة التعليمية التفاعلية.'}
            </p>

            <div className="flex flex-wrap items-center gap-6 mt-8 text-white/90 text-sm font-bold">
              <span className="flex items-center gap-2"><FaVideo className="text-[#2A9D8F]" size={16}/> {totalLessons} محاضرة</span>
              <span className="flex items-center gap-2"><FaClock className="text-[#2A9D8F]" size={16}/> تعلم بالسرعة التي تناسبك</span>
              <span className="flex items-center gap-2"><FaCheckCircle className="text-[#2A9D8F]" size={16}/> وصول للمحتوى التفاعلي</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. Main Content (Two Columns) ── */}
      <main className="max-w-6xl mx-auto px-6 pb-24 -mt-20 relative z-20">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Right Column (Main Content - 55%) */}
          <div className="w-full lg:w-[55%] space-y-8">
            
            {/* About Course */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-[#264653] mb-6 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-[#2A9D8F] rounded-full inline-block"></span> عن الكورس
              </h2>
              <div className="text-gray-600 leading-loose text-base font-medium whitespace-pre-wrap">
                {course.description || 'لا يوجد وصف تفصيلي متاح لهذا الكورس في الوقت الحالي.'}
              </div>
            </div>

            {/* Curriculum (Accordion) */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-[#264653] mb-6 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-[#2A9D8F] rounded-full inline-block"></span> محتوى الكورس
              </h2>
              
              {/* Course-level Exams */}
              {exams.filter(e => !e.chapter_id && !e.lesson_id).map((exam, idx) => (
                <div key={exam.id} className="flex items-center justify-between p-5 mb-4 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                      <FaClipboardList size={18} />
                    </div>
                    <div>
                      <span className="text-base font-bold text-amber-900 block">{exam.title}</span>
                      <span className="text-xs text-amber-700 font-semibold">تقييم شامل على الكورس</span>
                    </div>
                  </div>
                </div>
              ))}

              {chapters.length === 0 && lessons.length === 0 && exams.length === 0 ? (
                <p className="text-gray-500 text-center py-6">جاري إعداد محتوى الكورس...</p>
              ) : (
                <div className="space-y-4">
                  {chapters.map((chapter) => {
                    const chapterLessons = lessons.filter(l => l.chapter_id === chapter.id);
                    const chapterExams = exams.filter(e => e.chapter_id === chapter.id);
                    const isOpen = openChapter === chapter.id;

                    return (
                      <div key={chapter.id} className="border border-gray-100 rounded-xl overflow-hidden transition-all">
                        <button 
                          onClick={() => setOpenChapter(isOpen ? null : chapter.id)}
                          className={`w-full flex items-center justify-between p-5 text-right transition-colors ${isOpen ? 'bg-[#F8F9FA]' : 'bg-white hover:bg-gray-50'}`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-lg text-[#264653]">{chapter.title}</span>
                            <span className="text-xs text-gray-400 font-semibold">{chapterLessons.length} دروس {chapterExams.length > 0 && `• ${chapterExams.length} تقييم`}</span>
                          </div>
                          {isOpen ? <FaChevronUp className="text-[#2A9D8F]" /> : <FaChevronDown className="text-gray-400" />}
                        </button>

                        {/* Accordion Content */}
                        {isOpen && (
                          <div className="bg-white border-t border-gray-100">
                            {chapterLessons.length === 0 && chapterExams.length === 0 ? (
                              <p className="text-sm text-gray-400 p-5 text-center">لا توجد دروس مضافة في هذا الباب بعد.</p>
                            ) : (
                              <div className="flex flex-col">
                                {chapterLessons.map((lesson, idx) => {
                                  const lessonExams = exams.filter(e => e.lesson_id === lesson.id || lesson.exam_id === e.id);
                                  return (
                                  <div key={lesson.id} className="flex flex-col p-4 px-6 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-[#2A9D8F]/10 text-[#2A9D8F] flex items-center justify-center">
                                          <FaVideo size={12} />
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700">{idx + 1}. {lesson.title}</span>
                                      </div>
                                      {lesson.is_free && (
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">مجاني</span>
                                      )}
                                    </div>
                                    
                                    {/* Attachments & Lesson Exams */}
                                    {(lesson.pdf_url || lessonExams.length > 0) && (
                                      <div className="flex flex-wrap items-center gap-3 mt-3 mr-12">
                                        {lesson.pdf_url && (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-md border border-red-100">
                                            <FaFilePdf size={12} /> يحتوي على ملزمة
                                          </span>
                                        )}
                                        {lessonExams.map(ex => (
                                          <span key={ex.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-md border border-indigo-100">
                                            <FaClipboardList size={12} /> {ex.title}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )})}

                                {/* Chapter Exams */}
                                {chapterExams.map(ex => (
                                  <div key={ex.id} className="flex items-center gap-4 p-4 px-6 bg-indigo-50/50 border-b border-gray-50 last:border-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                      <FaClipboardList size={12} />
                                    </div>
                                    <span className="text-sm font-bold text-indigo-800">{ex.title} (تقييم الباب)</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* General Lessons (No Chapter) */}
                  {lessons.filter(l => !l.chapter_id).map((lesson, idx) => {
                    const lessonExams = exams.filter(e => e.lesson_id === lesson.id || lesson.exam_id === e.id);
                    return (
                    <div key={lesson.id} className="flex flex-col p-5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-[#2A9D8F]/10 text-[#2A9D8F] flex items-center justify-center">
                            <FaVideo size={12} />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{lesson.title}</span>
                        </div>
                        {lesson.is_free && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">مجاني</span>
                        )}
                      </div>
                      
                      {/* Attachments & Lesson Exams */}
                      {(lesson.pdf_url || lessonExams.length > 0) && (
                        <div className="flex flex-wrap items-center gap-3 mt-3 mr-12">
                          {lesson.pdf_url && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-md border border-red-100">
                              <FaFilePdf size={12} /> مذكرات مرفوعة
                            </span>
                          )}
                          {lessonExams.map(ex => (
                            <span key={ex.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-md border border-indigo-100">
                              <FaClipboardList size={12} /> {ex.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>

          </div>

          {/* Left Column (Sticky Purchase Card - 45%) */}
          <div className="w-full lg:w-[45%] lg:-mt-16 lg:sticky lg:top-8 z-30">
            <div className="bg-white rounded-[2rem] shadow-xl shadow-[#264653]/5 border border-gray-100 p-6 flex flex-col items-center text-center relative overflow-hidden">
              
              {/* Course Image */}
              <div className="w-full aspect-video rounded-xl overflow-hidden mb-6 bg-gray-50 relative border border-gray-100">
                <Image 
                  src={course.thumbnail_url || '/hero-image.png'} 
                  alt={course.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>

              {/* Price */}
              <div className="mb-6 w-full text-right border-b border-gray-100 pb-6">
                <span className="text-sm font-bold text-gray-500 block mb-1">استثمر في مستقبلك</span>
                <div className="flex items-baseline gap-2">
                  {isFree ? (
                    <span className="text-4xl font-extrabold text-[#2A9D8F]">مجاني بالكامل</span>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-[#264653]">
                        {course.digital_full_price || course.price || 0}
                      </span>
                      <span className="text-xl font-bold text-gray-500">ج.م</span>
                    </>
                  )}
                </div>
              </div>

              {/* Subscribe Button */}
              <button 
                onClick={handleSubscribe}
                className="w-full py-4 rounded-xl text-lg font-bold bg-[#2A9D8F] text-white hover:bg-teal-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isFree ? 'ابدأ التعلم مجاناً !' : 'اشترك الآن !'} <FaArrowRight className="rotate-180" size={16} />
              </button>

              <p className="text-xs text-gray-400 font-semibold mt-4">
                🔒 ضمان الوصول الفوري بعد الدفع
              </p>
            </div>
          </div>
          
        </div>
      </main>
      
    </div>
  );
}

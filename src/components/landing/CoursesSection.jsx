'use client';

import Image from 'next/image';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Course Card
// ─────────────────────────────────────────────────────────────
function CourseCard({ title, subtitle, price, date, lessons, image, id }) {
  return (
    <div className="group flex flex-col h-full bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden w-full max-w-[380px] mx-auto">
      
      {/* ── 1. Image (Edge-to-Edge) ── */}
      <div className="relative w-full h-[260px] flex-shrink-0">
        <Image
          src={image}
          alt={title}
          fill
          unoptimized
          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* ── 2. Content Body ── */}
      <div className="p-5 flex flex-col flex-grow">
        
        {/* Title & Price Row */}
        <div className="flex justify-between items-start gap-4 mb-3">
          <h3 className="text-[#264653] font-bold text-lg leading-tight line-clamp-2">
            {title}
          </h3>
          <span className="text-[#2A9D8F] font-extrabold text-lg whitespace-nowrap flex-shrink-0">
            {price ? `${price} ج.م` : 'مجاني'}
          </span>
        </div>

        {/* Meta Row */}
        <div className="flex justify-between items-center text-sm text-gray-500 font-medium">
          <span>{subtitle}</span>
          <span>{lessons || 0} درس</span>
        </div>

        {/* ── Dual CTA Buttons ── */}
        <div className="mt-auto pt-5 flex flex-col gap-3">
          <Link
            href={`/courses/${id}`}
            className="w-full text-center py-2.5 rounded-xl border-2 border-[#2A9D8F] text-[#2A9D8F] font-bold hover:bg-teal-50 transition-colors"
          >
            الدخول للكورس
          </Link>
          <Link
            href={`/courses/${id}`}
            className="w-full text-center py-2.5 rounded-xl bg-[#2A9D8F] text-white font-bold hover:bg-teal-600 shadow-sm transition-colors"
          >
            الاشتراك في الكورس !
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CoursesSection
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { supabaseBrowser } from '../../lib/supabase';

export default function CoursesSection() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeaturedCourses() {
      const { data, error } = await supabaseBrowser
        .from('courses')
        .select(`
          id,
          name,
          grade,
          digital_price,
          digital_full_price,
          thumbnail_url,
          created_at,
          lessons!left(id)
        `)
        .eq('is_featured', true);
      
      if (!error && data) {
        // Transform the data to match the CourseCard props
        const formatted = data.map(c => ({
          id: c.id,
          title: c.name,
          subtitle: c.grade,
          price: c.digital_full_price || null,
          date: new Date(c.created_at).toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' }),
          lessons: c.lessons ? c.lessons.length : 0,
          image: c.thumbnail_url || '/hero-image.png'
        }));
        setCourses(formatted);
      }
      setLoading(false);
    }
    fetchFeaturedCourses();
  }, []);

  if (loading) return null;
  if (courses.length === 0) return null;

  return (
    <section
      id="courses"
      dir="rtl"
      className="bg-[#264653] py-20 px-6 md:px-16 lg:px-20 overflow-hidden"
    >
      {/* ── Section header ── */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            {/* Eyebrow */}
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F8F9FA]/10 border border-[#F8F9FA]/15 text-sm font-semibold text-[#F8F9FA]/80 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] inline-block" />
              تعلّم وتفوّق
            </span>

            <h2 className="text-[#F8F9FA] text-3xl sm:text-4xl font-bold leading-tight">
              كورساتنا{' '}
              <span className="text-[#2A9D8F]">المتاحة</span>
            </h2>
          </div>

          {/* View All */}
          <Link
            href="/portal"
            id="courses-view-all-btn"
            className="
              px-6 py-2.5 rounded-full text-sm font-bold
              border-2 border-[#F8F9FA] text-[#F8F9FA]
              hover:bg-[#F8F9FA] hover:text-[#264653]
              active:scale-95
              transition-all duration-200
            "
          >
            مشاهدة الكل
          </Link>
        </div>
      </div>

      {/* ── Flex Container ── */}
      <div className="max-w-7xl mx-auto mt-10">
        <div className="flex flex-wrap justify-center gap-8">
          {courses.map((course) => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * ============================================================
 * src/app/student/courses/page.js  —  SERVER COMPONENT
 * ============================================================
 *
 * ARCHITECTURE PATTERN: Two-Layer Data Fetching
 * ─────────────────────────────────────────────
 *
 * LAYER 1 — Server (this file, runs on the edge/Node.js):
 *   • Fetches SHARED center-level data: courses list + center settings
 *   • Uses Next.js `unstable_cache` → cached for 5 minutes per centerId
 *   • Result: 10,000 students viewing the same center's courses page
 *     fire only 1 Supabase query per 5 min, not 10,000.
 *
 * LAYER 2 — Client (CoursesClient.jsx):
 *   • Fetches PRIVATE per-student data: enrollments, access, exam counts
 *   • Runs 5 queries in parallel (Promise.all)
 *   • Cannot be cached — unique per student, per request
 *
 * Before this fix:   7 sequential client-side queries per student visit
 * After this fix:    0 server queries (cached) + 5 parallel client queries
 *
 * WHY unstable_cache (not React cache()):
 *   • React cache() lives for a single render tree (one request)
 *   • unstable_cache persists across ALL requests until TTL expires
 *   • Perfect for data that's the same for all students of a center
 *
 * WHY NOT make the entire page a Server Component?
 *   • Student enrollments/access data is user-specific → must be fetched
 *     client-side where we have the auth session
 *   • The interactive search bar requires client-side state
 * ============================================================
 */

import { unstable_cache } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import CoursesClient from './CoursesClient';

// ──────────────────────────────────────────────────────────────
// Cached data fetcher — runs at most ONCE per centerId per 5 min
// across ALL concurrent student requests.
// ──────────────────────────────────────────────────────────────
const getCenterCoursesData = unstable_cache(
  async (centerId, studentGrade) => {
    // We need a Supabase service call here — this runs server-side only.
    // Import is inside the cached fn to avoid client bundle leakage.
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      // CRITICAL: Use Service Role Key to bypass RLS since this is a server-side cached query without an active user session
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    let coursesQuery = supabase
      .from('courses')
      .select(`
        id, name, grade, description, thumbnail_url,
        digital_full_price, digital_price, original_price,
        created_at,
        instructors ( name )
      `);
      // Removed center_id filtering entirely as per instructions to allow online students to see all platform courses

    // We no longer strictly filter by grade in the SQL query.
    // We fetch all courses for this center and do robust Arabic matching in JS.

    const [{ data: courses }, { data: settings }, { data: center }] = await Promise.all([
      coursesQuery,
      centerId ? supabase
        .from('center_settings')
        .select('primary_color, secondary_color, center_name, instructor_name, instructor_title')
        .eq('center_id', centerId)
        .maybeSingle() : Promise.resolve({ data: null }),
      centerId ? supabase
        .from('centers')
        .select('center_type')
        .eq('id', centerId)
        .maybeSingle() : Promise.resolve({ data: null }),
    ]);

    return {
      courses: courses || [],
      settings: settings || null,
      centerType: center?.center_type || 'center',
    };
  },
  // Cache key — varies by centerId
  // Result: one cache entry per center
  ['center-courses-all'],
  {
    revalidate: 300,    // 5 minutes — courses don't change every second
    tags: ['courses'],  // can be invalidated with revalidateTag('courses') after an admin edits a course
  }
);

// ──────────────────────────────────────────────────────────────
// Server Component — the actual page.js export
// ──────────────────────────────────────────────────────────────
export default async function StudentCoursesPage() {
  // 1. Get the authenticated student from the session cookie (server-side, no DB)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Middleware handles the redirect, but guard here as a fallback
    return null;
  }

  // 2. Fetch the student's centerId and grade (ONE lightweight query, not cached
  //    because it's personal data that changes if the student is updated)
  const { data: studentProfile } = await supabase
    .from('students')
    .select('center_id, grade')
    .eq('id', user.id)
    .maybeSingle();

  const centerId   = studentProfile?.center_id || null;
  const studentGrade = studentProfile?.grade || null;

  // 3. Fetch center-level data — CACHED for 5 minutes per centerId
  //    This is the key optimization: 10,000 students → 1 query per 5 min
  const { courses, settings, centerType } = await getCenterCoursesData(centerId);

  // 4. Robust Arabic String Matching for Grades
  const normalizeArabic = (text) => text ? text.replace(/[أإآ]/g, 'ا').trim() : '';
  const normalizedStudentGrade = normalizeArabic(studentGrade);
  
  const matchedCourses = courses.filter(c => 
    normalizeArabic(c.grade) === normalizedStudentGrade
  );

  // Debugging (seen in server logs)
  console.log("==========================================");
  console.log("🎓 Student Grade (Raw):", studentGrade);
  console.log("🎓 Student Grade (Normalized):", normalizedStudentGrade);
  console.log("📚 Total Courses Fetched:", courses.length);
  console.log("✅ Matched Courses:", matchedCourses.length);
  console.log("==========================================");

  // 5. Render: pass cached and filtered props to the Client Component
  //    The Client Component then fetches only student-specific data
  return (
    <CoursesClient
      centerCourses={matchedCourses}
      centerSettings={settings}
      centerType={centerType}
    />
  );
}

// Tell Next.js what metadata this page has
export const metadata = {
  title: 'بوابة المناهج الرقمية | الدكتور عبدالرحمن خالد',
  description: 'استعرض كل المواد الدراسية المتاحة وادخل على محتواك التعليمي',
};

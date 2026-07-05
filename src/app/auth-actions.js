'use server'
import { createClient } from '../lib/supabase/server' 
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'

// 🔐 1. لوجن الإدارة (Admin & Staff)
// 🔐 1. لوجن الإدارة (Admin & Staff) معدل لسحب السنتر
export async function loginAdminAction(formData) {
  const supabase = await createClient();
  const email = formData.get('email');
  const password = formData.get('password');

  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email, password,
  });

  if (authError || !user) return { error: 'بيانات الدخول غير صحيحة' };

  // 👈 التعديل هنا: سحبنا الـ center_id مع الـ role
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role, center_id') 
    .eq('id', user.id)
    .maybeSingle();

  let finalRole = profile?.role;
  if (email === 'abdo@smart.com') finalRole = 'admin';

  if (!finalRole) {
    await supabase.auth.signOut();
    return { error: 'ليس لديك صلاحيات دخول أو لم يتم تفعيل حسابك' };
  }

  // ✅ تحديث الميتا داتا شاملة السنتر عشان السيستم كله يشوفها
  await supabase.auth.updateUser({
    data: { 
      role: finalRole,
      center_id: profile?.center_id // ضفناها هنا
    }
  });

  // ✅ بنرجع الـ centerId للفرونت إند عشان الـ Context يلقطه فوراً
  return { 
    success: true, 
    role: finalRole, 
    centerId: profile?.center_id 
  };
}
// 🎓 2. لوجن الطالب (Student)
export async function loginStudentAction(formData) {
  const supabase = await createClient()
  
  const studentCode = formData.get('studentCode')
  const password = formData.get('password')
  
  const technicalEmail = `${studentCode.trim().toLowerCase()}@center.com`

  const { data: { user }, error } = await supabase.auth.signInWithPassword({
    email: technicalEmail,
    password,
  })

  if (error || !user) {
    return { error: 'كود الطالب أو كلمة المرور غير صحيحة' }
  }

  // التأكد من جدول الطلاب
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!student) {
    await supabase.auth.signOut()
    return { error: 'هذا الحساب ليس مسجلاً كطالب' }
  }

  // 🔥 تحديث رتبة الطالب في الميتا داتا
  await supabase.auth.updateUser({
    data: { role: 'student' }
  })

  return { success: true, role: 'student' }
}

// 🚪 3. تسجيل الخروج
export async function signOutAction() {
  const cookieStore = await cookies()

  // ✅ Production + Local safe with fallback
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://qngdkkhnvkvgskfxnerh.supabase.co'

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MzMwNzMsImV4cCI6MjA4NDMwOTA3M30.bXa6sGhoXx-xDbOQYOhqEiNZoxYV54HC2VhQXna7xL4'

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* صامت */ }
        },
      },
    }
  )

  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/admin-login')
}
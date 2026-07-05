// @ts-ignore - Deno runtime import
import { createClient } from 'https://esm.sh/@supabase/supabase-client'

Deno.serve(async (req) => {
  // المفتاح ده بنحطه في الـ Secrets بتاعة Supabase مش في الكود
  const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const now = new Date();
  const targetTime = new Date(now.getTime() + 30 * 60000).toTimeString().slice(0, 5);
  const currentDay = (now.getDay() === 6 ? 0 : now.getDay() + 1);

  const { data: upcomingClasses } = await supabase
    .from('schedule')
    .select('*, groups(id, courses(name)), rooms(name)')
    .eq('day_of_week', currentDay)
    .eq('start_time', targetTime)

  if (!upcomingClasses || upcomingClasses.length === 0) return new Response("No classes")

  // منطق إرسال الإشعارات (سنستخدم Fetch مباشرة لتجنب مشاكل Firebase Admin في الرفع)
  return new Response("Processing classes...")
})
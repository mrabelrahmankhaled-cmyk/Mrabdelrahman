import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record, table } = payload // 'table' بيعرفنا الإشعار جاي من notifications ولا من schedule

    // 1. إنشاء عميل Supabase بصلاحية Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let studentIds: string[] = []
    let notificationTitle = ""
    let notificationMessage = ""

    // --- المنطق المدمج للتعامل مع الجداول المختلفة ---

    if (table === 'schedule') {
      // أ- لو الإشعار جاي من إضافة موعد جديد (جدول schedule)
      // 1. جلب كل الطلاب اللي في المجموعة دي
      const { data: students } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('group_id', record.group_id)
      
      studentIds = students?.map(s => s.id) || []
      notificationTitle = "موعد حصة جديد 🗓️"
      notificationMessage = `تم إضافة موعد جديد لمجموعتك في الجدول. راجع جدول حصصك الآن.`
    } else {
      // ب- لو الإشعار جاي من الإرسال اليدوي (جدول notifications)
      studentIds = [record.student_id]
      notificationTitle = record.title
      notificationMessage = record.message
    }

    if (studentIds.length === 0) return new Response("No students to notify", { status: 200 })

    // 2. جلب الـ Tokens الخاصة بكل الطلاب المستهدفين
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from('student_device_tokens')
      .select('device_token')
      .in('student_id', studentIds)

    if (tokenError || !tokens?.length) return new Response("No tokens found", { status: 200 })

    // 3. إرسال الإشعار لكل جهاز مسجل عبر Firebase FCM
    const sendPromises = tokens.map(async (t) => {
      const fcmResponse = await fetch(`https://fcm.googleapis.com/fcm/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`, // يفضل استخدامه من الـ Secrets للأمان
        },
        body: JSON.stringify({
          to: t.device_token,
          notification: {
            title: notificationTitle,
            body: notificationMessage,
            sound: "default"
          },
          data: {
            notif_id: record.id || '',
            type: record.type || 'system_update',
            click_action: "FLUTTER_NOTIFICATION_CLICK" // لتوافق الموبايل لو احتجت مستقبلاً
          }
        })
      })
      return fcmResponse.json()
    })

    const results = await Promise.all(sendPromises)
    return new Response(JSON.stringify(results), { status: 200 })

  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
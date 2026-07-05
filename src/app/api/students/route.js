import { NextResponse } from 'next/server';
import { supabaseBrowser } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Admin client for user creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qngdkkhnvkvgskfxnerh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 50);
    const search = searchParams.get('search') || '';
    const grade = searchParams.get('grade');
    const course = searchParams.get('course');
    const centerId = searchParams.get('centerId');

    // التحقق من وجود centerId
    if (!centerId) {
      return NextResponse.json(
        { error: 'Center ID is required' },
        { status: 400 }
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseBrowser
      .from('students')
      .select('*', { count: 'exact' })
      .or(`center_id.eq.${centerId},center_id.is.null`) // ← دعم طلاب الأونلاين (بدون سنتر)
      .eq('is_active', true) // ← فلترة الطلاب النشطين فقط
      .is('deleted_at', null); // ← تجاهل المحذوفين

    // 🔍 Search
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,parent_phone.ilike.%${search}%,unique_id.ilike.%${search}%`
      );
    }

    // 🎓 Grade filter
    if (grade) {
  query = query.ilike('grade', `%${grade}%`);
}


    // 📚 Course filter
    if (course) {
      query = query.contains('enrolled_courses', [course]);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      students: data || [],
      totalCount: count || 0,
    });

  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const studentData = await req.json();
    
    console.log('Received student data in API:', studentData);
    
    if (!studentData.center_id) {
      return NextResponse.json(
        { error: 'Center ID is required' },
        { status: 400 }
      );
    }

    // 🛡️ Enforcement: Check Student Limit (max_students)
    const { data: centerData } = await supabaseAdmin
      .from('centers')
      .select('package_id, packages(max_students)')
      .eq('id', studentData.center_id)
      .single();

    if (centerData?.packages?.max_students) {
      const { count } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', studentData.center_id);

      if (count >= centerData.packages.max_students) {
        return NextResponse.json(
          { error: `عذراً، لقد وصل المركز للحد الأقصى من الطلاب المسموح به في الباقة الحالية (${centerData.packages.max_students} طالب).` },
          { status: 403 }
        );
      }
    }

    // 🎯 NEW: Generate Sequential Unique ID with Collision Protection
    let uniqueId = studentData.unique_id;
    let wasAdjusted = false;
    let finalNextCode = null;
    
    // Fetch center settings to get next code
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('center_settings')
      .select('next_student_code, student_code_prefix')
      .eq('center_id', studentData.center_id)
      .maybeSingle();

    if (!settingsError && settings?.next_student_code) {
        const prefix = settings.student_code_prefix || '';
        let codeToTry = settings.next_student_code;
        let isUnique = false;

        // Loop until we find a unique ID
        while (!isUnique) {
            const candidateId = `${prefix}${codeToTry}`;
            const { data: existing } = await supabaseAdmin
                .from('students')
                .select('unique_id')
                .eq('center_id', studentData.center_id)
                .eq('unique_id', candidateId)
                .maybeSingle();

            if (!existing) {
                uniqueId = candidateId;
                isUnique = true;
                finalNextCode = codeToTry + 1;
            } else {
                codeToTry++;
                wasAdjusted = true;
            }
        }
        
        // Update next_student_code in DB to the next available one
        await supabaseAdmin
            .from('center_settings')
            .update({ next_student_code: finalNextCode })
            .eq('center_id', studentData.center_id);
    } else {
        // Fallback if sequence is not set
        uniqueId = uniqueId || ("S-" + Math.floor(1000 + Math.random() * 9000));
    }

    // Insert student data
    // 🛑 تم تعطيل إنشاء حساب الأونلاين (Supabase Auth) بناءً على طلب العميل
    // سنقوم فقط بتوليد ID فريد للطالب في جدول الطلاب
    const studentId = crypto.randomUUID();

    // Disable triggers temporarily
    await supabaseAdmin.rpc('exec', { sql: 'ALTER TABLE students DISABLE TRIGGER ALL;' });

    // Insert student data
    const finalData = {
      name: studentData.name,
      phone: studentData.phone,
      parent_phone: studentData.parent_phone,
      grade: studentData.grade,
      center_id: studentData.center_id,
      enrolled_courses: studentData.enrolled_courses || [],
      course_discounts: studentData.course_discounts || {},
      group_ids: studentData.group_ids || {},
      enrollment_dates: studentData.enrollment_dates || {},
      is_free: studentData.is_free || false,
      wallet_balance: studentData.has_wallet ? 0 : null,
      has_wallet: studentData.has_wallet || false,
      id: studentId,
      unique_id: uniqueId,
      access_code: studentData.access_code,
      subscription_type: studentData.subscription_type || 'عادي',
      monthly_courses: studentData.monthly_courses || [],
      free_courses: studentData.free_courses || [],
      center_only_courses: studentData.center_only_courses || [],
      is_active: studentData.is_active ?? true,
      max_devices: studentData.max_devices || 1
    };

    const { data, error } = await supabaseAdmin
      .from('students')
      .insert([finalData])
      .select();

    // Re-enable triggers
    await supabaseAdmin.rpc('exec', { sql: 'ALTER TABLE students ENABLE TRIGGER ALL;' });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data[0],
      wasAdjusted: wasAdjusted
    });

  } catch (error) {
    console.error('Student creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create student' },
      { status: 500 }
    );
  }
}

// ✅✅✅✅ دالة التعديل (PUT) لتفعيل حسابات Quick Add ✅✅✅✅
export async function PUT(request) {
  try {
    const body = await request.json();
    const { 
      id, 
      email, 
      password, 
      create_auth_user, 
      ...dataToUpdate // باقي البيانات لتحديث الجدول
    } = body;

    // 1. إذا كان التفعيل مطلوباً (Quick Add Activation)، ننشئ المستخدم في Supabase Auth
    if (create_auth_user && email && password) {
      // نتأكد الأول إن المستخدم مش موجود عشان ميديناش Error
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUsers.users.some(u => u.email === email);

      if (!userExists) {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            id: id,
            email: email,
            password: password,
            email_confirm: true, // تفعيل الحساب فوراً
            user_metadata: { role: 'student', student_id: id }
          });

          if (authError) {
            console.error("Auth Error:", authError);
            // لو الخطأ مش "مستخدم موجود بالفعل"، رجع خطأ
            if (!authError.message.includes("already registered")) {
                return NextResponse.json({ error: authError.message }, { status: 400 });
            }
          }
      }
    }

    // 2. تنظيف البيانات قبل تحديث الجدول (عشان منبعتش حقول زيادة)
    const cleanData = { ...dataToUpdate };
    // (الإيميل والباسورد تم فصلهم فوق بالفعل في الـ destructuring فمش محتاجين نحذفهم تاني)
    
    // 3. تحديث بيانات الطالب في الجدول
    const { error: dbError } = await supabaseAdmin
      .from('students')
      .update(cleanData)
      .eq('id', id);

    if (dbError) {
      console.error("DB Error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
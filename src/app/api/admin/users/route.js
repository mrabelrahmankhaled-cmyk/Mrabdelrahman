import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. دالة إضافة موظف جديد
export async function POST(request) {
  try {
    // ✅ Build-safe: Create client inside handler with fallback
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qngdkkhnvkvgskfxnerh.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0';

    if (!supabaseUrl || !supabaseKey) {
      // Silent fallback for local dev
      console.error('❌ Missing environment variables:', {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      });
      return NextResponse.json(
        { error: 'Service unavailable - missing env vars' },
        { status: 503 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await request.json();
    console.log('🔍 Request body:', body);
    const { email, password, fullName, role, centerId } = body;

    // التحقق من وجود centerId
    if (!centerId) {
      console.error('❌ Missing centerId');
      return NextResponse.json(
        { error: 'Center ID is required' },
        { status: 400 }
      );
    }

    // التحقق من وجود email
    if (!email) {
      console.error('❌ Missing email');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // التحقق من وجود password
    if (!password) {
      console.error('❌ Missing password');
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // التحقق من وجود fullName
    if (!fullName) {
      console.error('❌ Missing fullName');
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // ── التحقق من حد الموظفين في باقة السنتر ──
    // 1. جلب باقة السنتر
    const { data: centerData } = await supabaseAdmin
      .from('centers')
      .select('package_id')
      .eq('id', centerId)
      .single();

    if (centerData?.package_id) {
      // 2. جلب الحد الأقصى من الباقة
      const { data: pkgData } = await supabaseAdmin
        .from('packages')
        .select('max_staff, name')
        .eq('id', centerData.package_id)
        .single();

      if (pkgData?.max_staff !== null && pkgData?.max_staff !== undefined) {
        // 3. حساب عدد الموظفين الحاليين
        const { count } = await supabaseAdmin
          .from('staff_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('center_id', centerId);

        if (count >= pkgData.max_staff) {
          return NextResponse.json(
            { error: `وصلت للحد الأقصى من الموظفين (${pkgData.max_staff}) في باقة "${pkgData.name}". يرجى الترقية لباقة أعلى.` },
            { status: 403 }
          );
        }
      }
    }

    // ✅ التعديل هنا: ضفنا user_metadata
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: role || 'staff',
        full_name: fullName 
      }
    });

    if (authError) throw authError;

    // ب. إضافة بياناته في جدول staff_profiles
    const { error: profileError } = await supabaseAdmin
      .from('staff_profiles')
      .insert([{
        id: user.user.id,
        full_name: fullName,
        email: email, // 👈 يفضل تخزن الايميل هنا برضه للسهولة
        role: role || 'staff',
        center_id: centerId // ← إضافة center_id
      }]);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(user.user.id);
      throw profileError;
    }

    return NextResponse.json({ success: true, user });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 2. دالة حذف موظف
export async function DELETE(request) {
  try {
    // ✅ Build-safe: Create client inside handler with fallback
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Silent fallback for local dev
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) throw new Error("رقم المستخدم مطلوب");

    // حذف من Auth (وهيتحذف تلقائياً من Profiles بسبب الـ CASCADE اللي عملناه في SQL)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

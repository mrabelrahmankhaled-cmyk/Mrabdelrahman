import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Use existing supabase client

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const centerId = searchParams.get('center_id');

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
    }

    // جلب البيانات بالتوازي مع الفلترة حسب المركز
    const [staffResult, permissionsResult, staffPermissionsResult] = await Promise.all([
      supabase.from('staff_profiles').select('id, full_name, role').eq('center_id', centerId),
      supabase.from('permissions').select('key, name, description'), 
      supabase.from('staff_permissions').select('staff_id, permission_key').eq('center_id', centerId)
    ]);

    if (staffResult.error) throw new Error(`Staff Error: ${staffResult.error.message}`);
    if (permissionsResult.error) throw new Error(`Permissions Error: ${permissionsResult.error.message}`);
    if (staffPermissionsResult.error) throw new Error(`Staff Perms Error: ${staffPermissionsResult.error.message}`);

    return NextResponse.json({
      staff: staffResult.data || [],
      permissions: permissionsResult.data || [],
      staffPermissions: staffPermissionsResult.data || []
    });

  } catch (error) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { staff_id, permissions, center_id } = body;

    if (!staff_id || !Array.isArray(permissions) || !center_id) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    // 1. حذف كل الصلاحيات القديمة للموظف في هذا المركز تحديداً
    const { error: delError } = await supabase
      .from('staff_permissions')
      .delete()
      .eq('staff_id', staff_id)
      .eq('center_id', center_id);

    if (delError) throw new Error(delError.message);

    // 2. إضافة الصلاحيات الجديدة
    if (permissions.length > 0) {
      const rows = permissions.map(key => ({
        staff_id,
        permission_key: key,
        center_id, // التأكيد على المركز
        allowed: true
      }));

      const { error: insError } = await supabase
        .from('staff_permissions')
        .insert(rows);

      if (insError) throw new Error(insError.message);
    }

    return NextResponse.json({ success: true, message: 'تم تحديث الصلاحيات بنجاح' });

  } catch (e) {
    console.error('Update Permissions Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

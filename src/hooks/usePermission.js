'use client';
import { useQuery } from '@tanstack/react-query';
import { supabaseBrowser } from '../lib/supabase';
import { useAuth } from '../context/AuthContext'; 

export function usePermission() {
  const { centerId } = useAuth(); 
  
  const { data, isLoading } = useQuery({
    queryKey: ['my-permissions', centerId], 
    queryFn: async () => {
      if (!centerId) return null; 
      
      // 1. هات اليوزر الحالي
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return null;

      // 2. هات دوره (Admin ولا Staff) مع فلترة حسب المركز
      const { data: profile } = await supabaseBrowser
        .from('staff_profiles')
        .select('role')
        .eq('id', user.id)
        .eq('center_id', centerId) 
        .single();

      // 3. هات الصلاحيات الخاصة بيه مع فلترة حسب المركز
      const { data: permissions } = await supabaseBrowser
        .from('staff_permissions')
        .select('permission_key')
        .eq('staff_id', user.id)
        .eq('center_id', centerId); 

      return {
        role: profile?.role || 'staff',
        permissions: permissions?.map((p) => p.permission_key) || [],
      };
    },
    staleTime: 1000 * 60 * 10, // احفظ النتيجة 10 دقايق عشان السرعة
  });

  // الدالة السحرية للتحقق
  const can = (permissionKey) => {
    if (isLoading || !data) return false;

    // 🔥 لو أدمن، مسموح له بكل حاجة (Super Power)
    if (data.role === 'admin') return true;

    // لو موظف عادي، نتشيك على الصلاحية
    return data.permissions.includes(permissionKey);
  };

  return { 
    can, 
    isLoading, 
    role: data?.role 
  };
}
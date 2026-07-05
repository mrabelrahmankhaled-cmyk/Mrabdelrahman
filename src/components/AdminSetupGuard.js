'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase-browser';

export default function AdminSetupGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { centerId, loading } = useAuth();
  const checked = useRef(false);

  useEffect(() => {
    // لو على صفحة الـ welcome أصلاً أو لسه بيتحمل — نوقف
    if (loading || !centerId || pathname.startsWith('/admin/welcome') || checked.current) return;
    checked.current = true;

    const checkSetup = async () => {
      const { data } = await supabase
        .from('center_settings')
        .select('center_name')
        .eq('center_id', centerId)
        .maybeSingle();

      // لو مفيش اسم سنتر → أول مرة يدخل
      if (!data?.center_name) {
        router.replace('/admin/welcome');
      }
    };

    checkSetup();
  }, [centerId, loading, pathname]);

  return children;
}

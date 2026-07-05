import { createClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import SessionsPageClient from './SessionsPageClient';

// Server Component - بيجيب الدور بأمان
export default async function SessionsPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/admin-login');
  }

  // جلب الدور من user_metadata (الأسرع والأكثر أماناً)
  const userRole = user.user_metadata?.role || 'staff';
  
  console.log("🔐 Server Component - User Role:", userRole);

  // حماية إضافية: لو مش أدمن، نرجعه لصفحته
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    redirect('/admin/staff_dashboard');
  }

  // بنبعت الدور للـ Client Component
  return <SessionsPageClient userRole={userRole} />;
}

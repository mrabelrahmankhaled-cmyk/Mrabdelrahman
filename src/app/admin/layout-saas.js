import { createClient } from '../../lib/supabase/server'; 
import { redirect } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import BrandHeader from '../../components/BrandHeader';

export default async function AdminLayout({ children }) {
  // 1️⃣ الاتصال بالسيرفر لجلب بيانات المستخدم الحقيقية
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  // لو مفيش مستخدم مسجل، نطرده فوراً (حماية إضافية فوق الميدل وير)
  if (error || !user) {
    redirect('/admin-login');
  }

  // 2️⃣ جلب بيانات الموظف من staff_profiles (مع center_id)
  let userProfile = null;
  let userRole = null;
  let userName = 'مستخدم';
  let centerId = null;
  let centerName = 'مركز تعليمي'; // ← اسم افتراضي
  let primaryColor = '#2563eb'; // ← لون افتراضي
  let logoUrl = null; // ← logo

  try {
    // جلب بيانات الموظف مع معلومات المركز
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select(`
        role, 
        email, 
        full_name,
        center_id,
        centers!inner (
          name,
          primary_color,
          logo_url,
          center_phone,
          center_address
        )
      `)
      .eq('id', user.id)
      .single();
    
    if (profile) {
      userProfile = profile;
      userRole = profile.role;
      userName = profile.full_name || user.email;
      centerId = profile.center_id;
      
      // بيانات المركز
      if (profile.centers) {
        centerName = profile.centers.name;
        primaryColor = profile.centers.primary_color || '#2563eb';
        logoUrl = profile.centers.logo_url;
      }
    }
  } catch (profileError) {
    console.error('Error fetching user profile:', profileError);
    userRole = 'guest';
  }

  // لو مفيش center_id، يروح يإنشاء مركز
  if (!centerId) {
    redirect('/create-center');
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]" dir="rtl">
      
      {/* بنبعت الرتبة الحقيقية للسايدبار */}
      <Sidebar userRole={userRole} />
      
      <main className="flex-1 overflow-x-hidden">
        {/* Unified Header - Brand + User Info */}
        <div 
          className="px-6 py-4 shadow-lg"
          style={{
            background: `linear-gradient(to left, ${primaryColor}, ${primaryColor}dd)`
          }}
        >
          <div className="flex items-center justify-between">
            {/* Brand Section */}
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt={centerName} className="h-12 w-12 rounded-lg object-contain bg-white p-2" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">{centerName}</h1>
                <p className="text-white/80 text-xs">نظام إدارة المراكز التعليمية</p>
              </div>
            </div>

            {/* User Info Section */}
            <div className="flex items-center gap-4">
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">
                  مرحباً، {userName}
                </h2>
                <p className="text-white/80 text-sm">{user.email}</p>
                <p className="text-white/60 text-xs">
                  {userRole === 'admin' ? 'مدير المركز' : 
                   userRole === 'super_admin' ? 'مدير النظام الرئيسي' :
                   userRole === 'staff' ? 'موظف' : 
                   'زائر'}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                {userRole === 'admin' || userRole === 'super_admin' ? (
                  <svg className="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd"/>
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

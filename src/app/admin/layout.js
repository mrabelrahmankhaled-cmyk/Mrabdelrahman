import { createClient } from '../../lib/supabase/server'; 
import { redirect } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import BrandHeader from '../../components/BrandHeader';
import AdminGuard from '../../components/AdminGuard';
import AuthHydrator from '../../components/AuthHydrator';
import AdminSetupGuard from '../../components/AdminSetupGuard';

export default async function AdminLayout({ children }) {
  // 1️⃣ نفس كود الاتصال بالسيرفر بتاعك (بدون تغيير)
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/admin-login');
  }

  // 2️⃣ جلب البيانات + Identity Mode
  let userProfile = null;
  let userRole = null;
  let userName = 'مستخدم';
  let primaryColor = '#2563eb';
  let centerName = 'مركز تعليمي';
  let logoUrl = null;
  let centerType = 'center';
  let instructorTitle = null;
  let instructorSubject = null;

  try {
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role, email, full_name, center_id')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      userProfile = profile;
      userRole = profile.role;
      userName = profile.full_name || user.email;
    }

    // نجيب center_settings + center_type بضربة واحدة
    const [{ data: settings }, { data: centerData }] = await Promise.all([
      supabase
        .from('center_settings')
        .select('primary_color, center_name, logo_url, instructor_name, instructor_photo_url, instructor_title, instructor_subject')
        .eq('center_id', profile?.center_id)
        .maybeSingle(),
      supabase
        .from('centers')
        .select('center_type')
        .eq('id', profile?.center_id)
        .maybeSingle(),
    ]);
    
    if (settings) {
      if (settings.primary_color) primaryColor = settings.primary_color;
      centerType = centerData?.center_type || 'center';

      if (centerType === 'instructor') {
        // 👨‍🏫 Instructor Mode — بيانات المدرس هي الـ Brand
        centerName = settings.instructor_name || settings.center_name || 'مركز تعليمي';
        logoUrl = settings.instructor_photo_url || settings.logo_url || null;
        instructorTitle = settings.instructor_title || null;
        instructorSubject = settings.instructor_subject || null;
      } else {
        // 🏫 Center Mode — الإعدادات العادية
        if (settings.center_name) centerName = settings.center_name;
        if (settings.logo_url) logoUrl = settings.logo_url;
      }
    }
  } catch (profileError) {
    console.error('Error fetching user profile:', profileError);
    userRole = 'guest';
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]" dir="rtl">

      
      <Sidebar 
        userRole={userRole} 
        primaryColor={primaryColor} 
        centerName={centerName}
        logoUrl={logoUrl}
        centerType={centerType}
        instructorTitle={instructorTitle}
        instructorSubject={instructorSubject}
      />
      
      <main className="flex-1 overflow-x-hidden">
        {/* Premium Animated Header */}
        <div 
          className="sticky top-0 z-50 px-4 md:px-8 py-3 md:py-4 shadow-xl border-b border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-top duration-700 font-cairo"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}ee, ${primaryColor}cc)`
          }}
        >
          <div className="flex items-center justify-between gap-4">
            
            {/* Left: Brand & Center Info */}
            <div className="flex items-center gap-3 md:gap-5 pr-14 md:pr-0">
              <div className="relative group">
                <div className="absolute -inset-1 bg-white/20 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={centerName}
                    className={`relative object-cover shadow-2xl transition-transform hover:scale-105 bg-white/90
                      ${ centerType === 'instructor'
                        ? 'h-11 w-11 md:h-14 md:w-14 rounded-full border-2 border-white/40 p-0'
                        : 'h-11 w-11 md:h-14 md:w-14 rounded-xl p-1.5'
                      }`}
                  />
                ) : (
                  <div className="relative h-11 w-11 md:h-14 md:w-14 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 shadow-2xl group-hover:rotate-6 transition-transform">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/></svg>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg md:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                  {centerType === 'instructor' ? `أ/ ${centerName}` : centerName}
                </h1>
                <div className="hidden md:flex items-center gap-2">
                  {centerType === 'instructor' && (instructorTitle || instructorSubject) ? (
                    <span className="text-[10px] text-white/70 font-bold">
                      {instructorTitle}{instructorTitle && instructorSubject ? ' · ' : ''}{instructorSubject}
                    </span>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Active System</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: User Profile Section */}
            <div className="flex items-center gap-3 md:gap-4 group">
              <div className="text-left flex flex-col items-end justify-center">
                <h2 className="text-sm md:text-xl font-black text-white leading-tight">
                  <span className="text-white/70 font-bold text-xs md:text-sm block">أهلاً بك،</span>
                  {userName}
                </h2>
                <div className="hidden md:block">
                  <p className="text-white/60 text-xs font-bold mt-0.5">
                    {userRole === 'admin' ? 'مدير النظام' : 
                     userRole === 'super_admin' ? 'مدير عام المنصة' :
                     userRole === 'staff' ? 'عضو فريق العمل' : 'زائر'}
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md scale-110 group-hover:bg-white/40 transition-all"></div>
                <div className="relative bg-white/15 backdrop-blur-xl rounded-2xl p-2 md:p-3 border border-white/20 shadow-inner group-hover:-translate-y-1 transition-all">
                  {userRole === 'admin' || userRole === 'super_admin' ? (
                    <svg className="w-5 h-5 md:w-7 md:h-7 text-yellow-300 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/></svg>
                  ) : (
                    <svg className="w-5 h-5 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd"/></svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 md:p-8">
          <AuthHydrator 
            user={user} 
            role={userRole} 
            centerId={userProfile?.center_id} 
          />
          <AdminSetupGuard>
            <AdminGuard userRole={userRole}>
              {children}
            </AdminGuard>
          </AdminSetupGuard>
        </div>
      </main>
    </div>
  );
}
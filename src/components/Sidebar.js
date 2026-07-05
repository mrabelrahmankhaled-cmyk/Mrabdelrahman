'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { signOutAction } from '../app/auth-actions';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  FaChartBar, FaUsers, FaBell, FaChalkboardTeacher, 
  FaSignOutAlt, FaCog, FaUserShield, FaMoneyBillWave, 
  FaWallet, FaLayerGroup, FaObjectGroup, FaBullhorn, 
  FaCalendarAlt, FaChevronRight, FaChevronLeft, FaBars, FaStore, FaUserSecret,
  FaHeadset, FaFileInvoiceDollar, FaHome, FaTimes, FaMoneyCheckAlt, FaCrown,
  FaQuestionCircle, FaUserPlus
} from 'react-icons/fa';

export default function Sidebar({ userRole = 'staff', primaryColor = '#2563eb', centerName = 'مركز تعليمي', logoUrl = null, centerType = 'center', instructorTitle = null, instructorSubject = null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const { allowedFeatures, loading, centerId } = useAuth(); 
  const [inquiryCount, setInquiryCount] = useState(0);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // 🔔 Real-time Inquiries Notification System
  useEffect(() => {
    console.log('Sidebar Effect - centerId:', centerId);
    if (!centerId) return;

    const fetchCount = async () => {
      console.log('Sidebar Debug - Fetching count for center:', centerId);
      const { count, error } = await supabase
        .from('lesson_discussions')
        .select('*', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .is('parent_id', null)
        .eq('is_resolved', false);
      
      if (error) {
        const safe = {};
        ['message', 'code', 'details', 'hint'].forEach(k => { if (error && error[k]) safe[k] = error[k]; });
        if (Object.keys(safe).length > 0) {
          console.error('Sidebar Debug - Fetch error:', safe);
        } else {
          try {
            console.error('Sidebar Debug - Fetch error:', JSON.parse(JSON.stringify(error)));
          } catch (e) {
            console.error('Sidebar Debug - Fetch error (unserializable):', error);
          }
        }
      }
      console.log('Sidebar Debug - Count found:', count);
      setInquiryCount(count || 0);
    };

    fetchCount();

    // 🔄 Fallback polling every 60 seconds
    const interval = setInterval(fetchCount, 60000);

    const channel = supabase
      .channel('discussions-count')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'lesson_discussions',
        filter: `center_id=eq.${centerId}`
      }, (payload) => {
        console.log('Sidebar Debug - Real-time update received:', payload);
        fetchCount();
      })
      .subscribe((status) => {
        console.log('Sidebar Debug - Real-time subscription status:', status);
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [centerId]);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);

  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية (الموظفين)', href: '/admin/staff_dashboard', icon: <FaHome />, feature: 'dashboard:staff' }, 
    { id: 'sessions', label: 'إدارة الحصص', href: '/admin/sessions', icon: <FaChalkboardTeacher />, feature: 'academic:sessions' }, 
    { id: 'pending-students', label: 'طلبات الانضمام', href: '/admin/pending-students', icon: <FaUserPlus />, feature: 'students:view' },
    { id: 'students', label: 'الطلاب', href: '/admin/students', icon: <FaUsers />, feature: 'students:view' }, 
    { id: 'instructors', label: 'المدرسين', href: '/admin/instructors', icon: <FaChalkboardTeacher />, feature: 'page_instructors' }, 
    { id: 'courses', label: 'المواد الدراسية', href: '/admin/courses', icon: <FaLayerGroup />, feature: 'academic:sessions' }, 
    { id: 'groups', label: 'إدارة المجموعات', href: '/admin/groups', icon: <FaObjectGroup />, feature: 'academic:sessions' }, 
    { id: 'schedule', label: 'الجدول الدراسي', href: '/admin/schedule', icon: <FaCalendarAlt />, feature: 'academic:schedule' }, 
    { id: 'exams', label: 'الاختبارات والنتائج', href: '/admin/exams', icon: <FaFileInvoiceDollar />, feature: 'academic:exams' },
    { id: 'support', label: 'تذاكر الدعم', href: '/admin/support', icon: <FaHeadset />, feature: 'page_support' }, 
    { id: 'notifications', label: 'مركز البث', href: '/admin/notifications', icon: <FaBullhorn />, feature: 'page_notifications' },
    { id: 'store', label: 'المتجر والملازم', href: '/admin/store', icon: <FaStore />, feature: 'store:sales' },
    { id: 'finance_debts', label: 'المديونيات', href: '/admin/finance/debts', icon: <FaMoneyBillWave />, feature: 'students:finance' },
    { id: 'finance_wallets', label: 'شحن المحافظ', href: '/admin/finance/wallets', icon: <FaWallet />, feature: 'wallet:view' },
    { id: 'subscriptions', label: 'الاشتراكات الشهرية', href: '/admin/subscriptions', icon: <FaMoneyCheckAlt />, feature: 'page_subscriptions' }, 
    { id: 'lessons', label: 'المحتوى الرقمي', href: '/admin/lessons', icon: <FaChalkboardTeacher />, feature: 'lessons:view' }, 
    { id: 'discussions', label: 'استفسارات الدروس', href: '/admin/discussions', icon: <FaQuestionCircle />, feature: 'page_courses' },
    { id: 'vouchers', label: 'أكواد الشحن', href: '/admin/vouchers', icon: <FaMoneyBillWave />, feature: 'vouchers:view' }, 
  ];

  const adminItems = [
    { id: 'dash', label: 'الرئيسية (الإدارة)', href: '/admin/dashboard', icon: <FaChartBar />, feature: 'dashboard:admin' }, 
    { id: 'staff', label: 'الموظفين', href: '/admin/staff', icon: <FaUserShield />, feature: 'staff:view' }, 
    { id: 'attendance', label: 'سجل الحضور والانصراف', href: '/admin/staff/attendance', icon: <FaCalendarAlt />, feature: 'page_staff_attendance' },
    { id: 'settings', label: 'الإعدادات', href: '/admin/settings', icon: <FaCog />, feature: 'settings:general' }, 
    { id: 'permissions', label: 'أذونات الموظفين', href: '/admin/staff/permissions', icon: <FaUserShield />, feature: 'page_staff_permissions' },
    { id: 'finance_expenses', label: 'المصروفات', href: '/admin/expenses', icon: <FaFileInvoiceDollar />, feature: 'expenses:view' },
    { id: 'subs_mgmt', label: 'تحصيل الاشتراكات', href: '/admin/subscriptions', icon: <FaMoneyCheckAlt />, feature: 'page_subscriptions' },
    { id: 'audit', label: 'سجل الرقابة', href: '/admin/audit', icon: <FaUserSecret />, feature: 'logs:view' },
    { id: 'super_admin', label: 'لوحة القيادة العليا', href: '/super-admin', icon: <FaCrown />, feature: 'super_admin:access' },
  ];

  const visibleMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (!item.feature) return true; 

      // 🛡️ خريطة الربط الشاملة بين (الصلاحية الوظيفية) و (ميزة الباقة الأساسية)
      const packageMapping = {
        // إدارة الحصص والطلاب
        'dashboard:staff':   'page_staff_dashboard', // 🛡️ لوحة الموظفين
        'academic:sessions': 'page_sessions',
        'page_instructors':  'page_instructors', // 🛡️ مديول المدرسين المخصص
        'students:view':     'page_students',
        'academic:schedule': 'page_schedule',
        'academic:exams':    'page_exams',
        'students:finance':  'page_students',

        // خدمات إضافية
        'page_support':       'page_support',
        'page_notifications': 'page_notifications',
        'store:sales':        'page_store',
        'wallet:view':        'page_finance_wallets',
        'page_subscriptions': 'page_subscriptions',
        'lessons:view':       'page_lessons',
        'page_lessons':       'page_lessons',
        'vouchers:view':      'page_vouchers',

        // إدارة النظام والرقابة
        'staff:view':              'page_staff',
        'settings:general':        'page_settings',
        'page_staff_permissions':  'page_staff_permissions',
        'expenses:view':           'page_finance_expenses',
        'logs:view':               'page_audit',
        'super_admin:access':     'page_super_admin'
      };

      const requiredModule = packageMapping[item.feature];
      
      // 🛑 لو فيه ميزة باقة مرتبطة، والسنتر مش معاه الميزة دي -> اخفي العنصر فوراً (حتى للـ Super Admin)
      if (requiredModule && !allowedFeatures?.includes(requiredModule)) {
          return false;
      }

      // 🛡️ التحقق من الموديول البرمجي (Flexibility Logic)
      if (item.module && !allowedFeatures?.includes(`module_${item.module}`)) {
          return false;
      }

      // الـ Super Admin يرى كل شيء طالما المديول متاح في الباقة
      if (userRole === 'super_admin') return true;

      // لو السنتر معاه الميزة، أو العنصر مش مرتبط بميزة باقة محددة، نتحقق من صلاحية اليوزر نفسه
      return allowedFeatures?.includes(item.feature);
    });
  }, [allowedFeatures, userRole]);

  const visibleAdminItems = useMemo(() => {
    return adminItems.filter(item => {
      if (!item.feature) return true; 

      const packageMapping = {
        'dashboard:admin':         'page_admin_dashboard', // 🛡️ لوحة الإدارة
        'staff:view':              'page_staff',
        'settings:general':        'page_settings',
        'page_staff_permissions':  'page_staff_permissions',
        'page_staff_attendance':   'page_staff_attendance',
        'expenses:view':           'page_finance_expenses',
        'page_subscriptions':      'page_subscriptions',
        'logs:view':               'page_audit',
        'super_admin:access':     'page_super_admin'
      };

      const requiredModule = packageMapping[item.feature];
      
      // 🛑 التحقق من الباقة أولاً
      if (requiredModule && !allowedFeatures?.includes(requiredModule)) return false;

      // الـ Super Admin يرى كل شيء متاح في الباقة
      if (userRole === 'super_admin') return true;

      return allowedFeatures?.includes(item.feature);
    });
  }, [allowedFeatures, userRole]);

  if (loading || allowedFeatures === null) {
    return (
      <div className="flex-shrink-0">
        <aside className="w-64 h-screen bg-white border-l border-gray-100 p-4 hidden md:flex flex-col gap-4">
           <div className="h-10 bg-gray-100 rounded-xl animate-pulse mb-6 w-full"></div>
           <div className="space-y-3">
              {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse w-full"></div>
              ))}
           </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0">
      {/* 📱 Mobile Toggle Button - موضع أيمن مدمج */}
      <div className="md:hidden fixed top-4 right-2 z-[100]">
        <button 
          onClick={toggleMobileSidebar}
          className="w-12 h-12 flex items-center justify-center text-white/90 active:scale-90 transition-all"
        >
          {isMobileOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
        </button>
      </div>

      {/* 🌫️ Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside 
        className={`bg-white h-screen border-l flex flex-col z-[65] shadow-2xl md:shadow-sm transition-all duration-300 ease-in-out
        fixed inset-y-0 right-0 md:sticky md:top-0 md:translate-x-0
        ${isMobileOpen ? 'translate-x-0 w-72 p-6' : 'translate-x-full md:translate-x-0 p-4'}
        ${isOpen ? 'md:w-72' : 'md:w-24'} 
        `}
        style={{ borderInlineStartColor: `${primaryColor}22` }}
      >
        {/* Header Branding & Toggle */}
        <div className={`flex items-center mb-10 transition-all ${(isOpen || isMobileOpen) ? 'justify-between px-2' : 'justify-center flex-col gap-6'}`}>
          <div className="flex items-center gap-4 overflow-hidden group/brand">
            {/* Clean Professional Logo Section */}
            <div 
              style={!logoUrl ? { backgroundColor: primaryColor } : {}}
              className={`flex items-center justify-center text-white flex-shrink-0 shadow-sm overflow-hidden ${
                centerType === 'instructor'
                  ? `w-11 h-11 rounded-full border-2 ${logoUrl ? 'p-0 border-white/50' : 'p-2 border-white/20'}`
                  : `w-11 h-11 rounded-xl ${logoUrl ? 'p-0' : 'p-2'}`
              }`}
            >
               {logoUrl ? (
                 <img src={logoUrl} alt={centerName} className="w-full h-full object-cover" loading="lazy" />
               ) : (
                 <FaChalkboardTeacher size={24} />
               )}
            </div>

            {/* Clear Text Section - No Overlap & Smooth Animation */}
            <div className={`flex flex-col justify-center transition-all duration-700 delay-100 ${(!isOpen && !isMobileOpen) ? 'md:w-0 md:opacity-0 md:hidden' : 'w-auto opacity-100 animate-in fade-in slide-in-from-right-5'}`}>
              <h1 className="font-black text-xl text-gray-900 leading-snug truncate max-w-[160px]">
                {centerType === 'instructor' ? `د/ ${centerName}` : centerName}
              </h1>
              <p 
                style={{ color: primaryColor }}
                className="text-[10px] font-black tracking-[0.2em] uppercase mt-1.5 opacity-90 truncate max-w-[160px]"
              >
                {centerType === 'instructor' && (instructorTitle || instructorSubject) 
                  ? `${instructorTitle || ''}${instructorTitle && instructorSubject ? ' · ' : ''}${instructorSubject || ''}`
                  : 'Smart Center'}
              </p>
            </div>
          </div>

          <button 
            onClick={toggleSidebar}
            className="hidden md:flex w-8 h-8 items-center justify-center bg-gray-50 text-gray-400 rounded-full transition-all hover:bg-gray-100 hover:text-gray-600"
          >
            {isOpen ? <FaChevronRight size={14} /> : <FaBars size={16} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar overflow-x-hidden">
          {/* Main Items */}
          {visibleMenuItems.map(item => {
             const isActive = pathname.startsWith(item.href);
             return (
                <Link 
                  key={item.id}
                  href={item.href} 
                  title={(!isOpen && !isMobileOpen) ? item.label : ''} 
                  style={isActive ? { 
                    backgroundColor: primaryColor, 
                    boxShadow: `0 10px 15px -3px ${primaryColor}44` 
                  } : {}}
                  className={`flex items-center gap-3 px-3 py-4 md:py-3.5 rounded-xl transition-all duration-200 group relative
                    ${isActive 
                      ? 'text-white' 
                      : 'text-gray-500'}
                    ${(!isOpen && !isMobileOpen) ? 'md:justify-center' : ''} 
                  `}
                  onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = `${primaryColor}11`)}
                  onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span 
                    className={`text-xl transition-colors relative`}
                    style={isActive ? { color: 'white' } : {}}
                  >
                    {item.id === 'discussions' && (inquiryCount > 0) && (
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-xl shadow-red-500/40 border-2 border-white z-20">
                        {inquiryCount}
                      </div>
                    )}
                    {item.icon}
                  </span>
                  <span className={`font-black text-sm whitespace-nowrap transition-all duration-300 origin-right
                    ${(!isOpen && !isMobileOpen) ? 'md:w-0 md:opacity-0 md:overflow-hidden md:absolute' : 'w-auto opacity-100 static'}
                  `}>
                    {item.id === 'dashboard' && centerType === 'instructor' ? 'حصص اليوم' : item.label}
                  </span>
                  {!isActive && (
                    <div 
                      className="absolute right-0 w-1 h-0 group-hover:h-6 transition-all rounded-l-full"
                      style={{ backgroundColor: primaryColor }}
                    ></div>
                  )}
                </Link>
             );
          })}

          {/* Admin Section - Branded & Animated */}
          {userRole === 'admin' && visibleAdminItems.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100/50">
               {(isOpen || isMobileOpen) && (
                 <p className="text-[10px] font-black text-gray-400 uppercase px-3 mb-4 tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-700">
                   إدارة النظام
                 </p>
               )}
               <div className="space-y-2">
                 {visibleAdminItems.map((item, index) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link 
                        key={item.id}
                        href={item.href} 
                        title={(!isOpen && !isMobileOpen) ? item.label : ''} 
                        className={`flex items-center gap-3 px-3 py-4 md:py-3.5 rounded-xl transition-all duration-200 group relative animate-in fade-in slide-in-from-right-4
                          ${isActive ? 'text-white' : 'text-gray-500'}
                          ${(!isOpen && !isMobileOpen) ? 'md:justify-center' : ''} 
                        `}
                        style={{ 
                          ...(isActive ? { 
                            backgroundColor: primaryColor, 
                            boxShadow: `0 10px 15px -3px ${primaryColor}44` 
                          } : {}), 
                          animationDelay: `${(index + 1) * 70}ms` 
                        }}
                        onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = `${primaryColor}11`)}
                        onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span 
                          className={`text-xl transition-transform duration-300 group-hover:scale-110`}
                          style={isActive ? { color: 'white' } : {}}
                        >
                          {item.icon}
                        </span>
                        <span className={`font-black text-sm whitespace-nowrap transition-all duration-300 origin-right
                          ${(!isOpen && !isMobileOpen) ? 'md:w-0 md:opacity-0 md:overflow-hidden md:absolute' : 'w-auto opacity-100 static'}
                        `}>
                          {item.label}
                        </span>
                        
                        {/* Branded Hover Indicator */}
                        {!isActive && (
                          <div 
                            className="absolute right-0 w-1 h-0 group-hover:h-6 transition-all duration-300 rounded-l-full"
                            style={{ backgroundColor: primaryColor }}
                          ></div>
                        )}
                      </Link>
                    );
                 })}
               </div>
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="mt-auto pt-4 border-t border-gray-50">
          <button 
            onClick={() => signOutAction()} 
            title="تسجيل الخروج"
            className={`w-full flex items-center gap-3 px-3 py-4 text-red-500 font-black text-sm hover:bg-red-50 rounded-xl transition-all group overflow-hidden ${(!isOpen && !isMobileOpen) ? 'md:justify-center' : ''}`}
          >
            <FaSignOutAlt className={`text-lg transition-transform ${(isOpen || isMobileOpen) ? 'group-hover:-translate-x-1' : ''}`} />
            <span className={`${(!isOpen && !isMobileOpen) ? 'md:hidden' : 'block'} whitespace-nowrap`}>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
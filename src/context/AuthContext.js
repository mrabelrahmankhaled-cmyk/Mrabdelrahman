'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { getCachedAuthData, setCachedAuthData, clearCachedAuthData } from '../lib/auth-cache';

const AuthContext = createContext({
  user: null,
  session: null,
  centerId: null,
  role: null,
  allowedFeatures: null, 
  loading: true,
  isDeviceAuthorized: true, // 📱 الحالة الجديدة
  signOut: async () => {},
  activateCenter: (id) => {}, 
});

export const AuthProvider = ({ children, initialUser = null, initialRole = null, initialCenterId = null }) => {
  const router = useRouter();
  const pathname = usePathname();

  // 1. القيم الابتدائية (State)
  const [user, setUser] = useState(initialUser || null);
  const [session, setSession] = useState(null);
  const [centerId, setCenterId] = useState(initialCenterId || null);
  const [role, setRole] = useState(initialRole || null);
  const [allowedFeatures, setAllowedFeatures] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [isDeviceAuthorized, setIsDeviceAuthorized] = useState(true); // الحالة الافتراضية
  const isMounted = React.useRef(true); 
  const isSyncing = React.useRef(false);
  const lastRequestId = React.useRef(0); // 🔥 لتتبع آخر طلب تحقق ومنع تداخل البيانات القديمة
  // 🛡️ دالة التحقق من صلاحية السنتر (Gatekeeper)
  const verifyCenterAccess = async (cid, forceUser = null, forceRole = null) => {
    if (!cid) return;
    
    const requestId = ++lastRequestId.current; // تحديد رقم الطلب الحالي
    
    // استخدام البيانات الممرة أو الموجودة في الـ state
    const activeUser = forceUser || user;
    const activeRole = forceRole || role;

    try {
        const { data: centerData, error } = await supabase
            .from('centers')
            .select('is_active, subscription_end_date, package_id')
            .eq('id', cid)
            .single();

        if (error) throw error;

        if (centerData) {
            const isExpired = centerData.subscription_end_date && new Date(centerData.subscription_end_date) < new Date();
            
            // 🛑 لو السنتر منتهي أو غير نشط
            if (!centerData.is_active || isExpired) {
                console.warn("⛔ Center Access Denied: Expired or Inactive");
                localStorage.removeItem("active_center_id");
                setCenterId(null);
                setAllowedFeatures([]); 
                if (pathname !== '/expired') router.push('/expired');
                return false;
            }
            
            // ✅ تحديث الميزات (السيناريو الناجح)
            // Load package features by package_id to avoid relying on PostgREST relationship cache
            let packageFeatures = [];
            if (centerData.package_id) {
                const { data: pfData, error: pfError } = await supabase
                    .from('package_features')
                    .select('feature_id')
                    .eq('package_id', centerData.package_id);
                if (pfError) {
                    console.error('❌ Package features fetch error:', pfError);
                } else {
                    packageFeatures = pfData?.map(pf => pf.feature_id) || [];
                }
            }
            if (packageFeatures.length > 0) {
                let finalFeatures = [...packageFeatures];

                // 🔒 لو أدمن: ندمج صلاحيات السيستم
                if (activeRole === 'admin' || activeRole === 'super_admin') {
                    const { data: allPerms } = await supabase.from('permissions').select('key');
                    const systemPerms = allPerms?.map(p => p.key) || [];
                    const filteredSystemPerms = systemPerms.filter(k => !k.toLowerCase().startsWith('page_'));
                    finalFeatures = [...new Set([...packageFeatures, ...filteredSystemPerms])];
                } 
                // 🔒 لو موظف: لازم نجيب أذوناته المخصصة
                else if (activeRole === 'staff' && activeUser) {
                    const { data: staffPerms } = await supabase
                        .from('staff_permissions')
                        .select('permission_key')
                        .eq('staff_id', activeUser.id)
                        .eq('center_id', cid);
                    
                    const specificPerms = staffPerms?.map(p => p.permission_key) || [];
                    finalFeatures = [...new Set([...packageFeatures, ...specificPerms])];
                    console.log(`🛡️ verifyCenterAccess: Merged ${specificPerms.length} staff permissions`);
                }

            if (requestId !== lastRequestId.current) return; // 🛑 لو فيه طلب جديد بدأ، كنسل القديم

            setAllowedFeatures(finalFeatures);
          } else {
            if (requestId !== lastRequestId.current) return;
            setAllowedFeatures(prev => prev || []); 
          }
        }
        return true; 
    } catch (err) {
        // 🛡️ تجاهل أخطاء الإلغاء (AbortError) لأنها طبيعية عند التنقل السريع أو إعادة التحميل
        if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) {
            console.log("📡 Auth Verification: Request was aborted (Normal behavior)");
            return true;
        }

        console.error("❌ Auth Verification Error:", err);
        if (err && typeof err === 'object') {
            console.error("Error Code:", err.code);
            console.error("Error Message:", err.message);
        }
        return true; 
    }
  };

  // دالة تفعيل السنتر يدوياً
  const activateCenter = (id, forceUser = null, forceRole = null) => {
    console.log("🎯 activateCenter called for:", id);
    setCenterId(id);
    localStorage.setItem("active_center_id", id);
    // setAllowedFeatures(null); 🛑 شلنا دي عشان متمسحش الداتا وهي بتحمل
    verifyCenterAccess(id, forceUser, forceRole);
  };

  // دالة جلب البروفايل
  const fetchProfile = async (userId) => {
     try {
       const { data: staffData } = await supabase.from('staff_profiles').select('*').eq('id', userId).maybeSingle();
       if (staffData) {
           setCenterId(staffData.center_id);
           setRole(staffData.role);
           if (staffData.center_id) {
               await verifyCenterAccess(staffData.center_id);
           }
       }
     } catch (e) { console.error("Profile Fetch Error:", e) }
  };

  // ==========================================
  // 🚨 منطق المزامنة الموحد (The Master Sync) 🚨
  // ==========================================
  const syncAuthState = async (event, currentSession) => {
    if (!isMounted.current || isSyncing.current) return;

    isSyncing.current = true;

    const sessionUser = currentSession?.user || user;

    // ✅ CACHE HIT: Skip all DB queries for recently authenticated users.
    // Cache is invalidated on signOut() and expires after 5 minutes.
    if (sessionUser?.id && event !== 'SIGNED_OUT') {
      const cached = getCachedAuthData(sessionUser.id);
      if (cached) {
        if (isMounted.current) {
          setSession(currentSession || null);
          setUser(sessionUser);
          if (cached.centerId) setCenterId(cached.centerId);
          if (cached.role) setRole(cached.role);
          setAllowedFeatures(cached.features);
          setLoading(false);
        }
        isSyncing.current = false;
        return; // ← zero DB queries for this auth event
      }
    }

    let targetCid = null;
    let targetRole = null;
    let targetFeatures = [];
    let targetUser = sessionUser;

    try {
        // 1. التحقق من السنتر في الـ URL
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const urlCid = params.get('centerId') || params.get('cid');
            if (urlCid) targetCid = urlCid;
        }

        // 2. التحقق من الـ LocalStorage لو مفيش في الـ URL
        if (!targetCid) {
            const savedCid = localStorage.getItem("active_center_id");
            if (savedCid && savedCid !== 'null' && savedCid !== 'undefined') targetCid = savedCid;
        }

        // 3. التحقق من اليوزر والبروفايل (موظفين أو طلاب)
        const userForProfile = targetUser;
        if (userForProfile) {
            // جرب نبحث في الموظفين أولاً
            const { data: staffProfile } = await supabase
                .from('staff_profiles')
                .select('center_id, role')
                .eq('id', userForProfile.id)
                .maybeSingle();
            
                if (staffProfile) {
                    targetCid = staffProfile.center_id || targetCid;
                    targetRole = staffProfile.role;
                } else {
                    const { data: studentProfile } = await supabase
                        .from('students')
                        .select('center_id, registered_devices, max_devices')
                        .eq('id', userForProfile.id)
                        .maybeSingle();
                    
                    if (studentProfile) {
                        targetCid = studentProfile.center_id || targetCid;
                        targetRole = 'student';

                        // 🔒 منطق قفل الأجهزة المرن (Flexible Device Lock)
                        const getDeviceFingerprint = () => {
                            let id = localStorage.getItem('cls_device_id');
                            if (!id) {
                                id = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
                                localStorage.setItem('cls_device_id', id);
                            }
                            return id;
                        };

                        const currentDeviceId = getDeviceFingerprint();
                        const registeredDevices = studentProfile.registered_devices || [];
                        const maxDevices = studentProfile.max_devices || 1;
                        
                        // 🛠️ Development Bypass: Allow all devices on localhost
                        const isLocalhost = typeof window !== 'undefined' && 
                            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

                        if (registeredDevices.includes(currentDeviceId) || isLocalhost) {
                            // الجهاز مسجل فعلاً أو بيئة تطوير
                            setIsDeviceAuthorized(true);
                        } else if (registeredDevices.length < maxDevices) {
                            // جهاز جديد وهناك مكان شاغر: سجله
                            const updatedDevices = [...registeredDevices, currentDeviceId];
                            await supabase
                                .from('students')
                                .update({ registered_devices: updatedDevices })
                                .eq('id', userForProfile.id);
                            setIsDeviceAuthorized(true);
                            console.log("📱 New device registered within limit");
                        } else {
                            // جهاز زائد عن الحد: لا تطرده، ولكن امنع المحتوى
                            setIsDeviceAuthorized(false);
                            console.warn("🛑 Device limit reached for content access. (Only enforced on production)");
                        }
                    }
                }

            if (targetCid) localStorage.setItem("active_center_id", targetCid);
        }

        // 4. جلب الميزات (Package Features + Staff Permissions)
        if (targetCid && targetCid !== 'null' && targetCid !== 'undefined') {
            console.log(`📦 Fetching Center Data for CID: ${targetCid}`);
            const { data: centerData, error: centerError } = await supabase
                .from('centers')
                .select('is_active, subscription_end_date, package_id')
                .eq('id', targetCid)
                .single();

            if (centerError) console.error("❌ Center Data Fetch Error:", centerError);

            if (centerData) {
                const isExpired = centerData.subscription_end_date && new Date(centerData.subscription_end_date) < new Date();

                // ✅ super_admin bypasses expiry & gets ALL permissions regardless of package
                const isSuperAdmin = targetRole === 'super_admin';

                    if (isSuperAdmin || (centerData.is_active && !isExpired)) {
                    // fetch package_features via package_id to avoid relationship cache issues
                    let pkgFeatures = [];
                    if (centerData.package_id) {
                        const { data: pfData, error: pfError } = await supabase
                            .from('package_features')
                            .select('feature_id')
                            .eq('package_id', centerData.package_id);
                        if (pfError) console.error('❌ Center Package Features Error:', pfError);
                        pkgFeatures = pfData?.map(pf => pf.feature_id) || [];
                    }
                    targetFeatures = pkgFeatures || [];

                    if (targetUser && targetRole) {
                        if (isSuperAdmin) {
                            // 👑 super_admin = كل صلاحيات النظام بدون استثناء (بما فيها page_*)
                            const { data: allPerms } = await supabase.from('permissions').select('key');
                            const allKeys = allPerms?.map(p => p.key) || [];
                            targetFeatures = [...new Set([...targetFeatures, ...allKeys])];
                            // تأكد إن page_super_admin موجودة حتى لو مش في جدول permissions بعد
                            if (!targetFeatures.includes('page_super_admin')) {
                                targetFeatures.push('page_super_admin');
                            }
                            console.log(`👑 super_admin: granted ${targetFeatures.length} permissions`);

                        } else if (targetRole === 'admin') {
                            // 🔒 admin عادي: كل الصلاحيات من permissions ماعدا صفحات page_*
                            // (صفحات page_* بتيجي فقط من باقة السنتر)
                            const { data: allPerms } = await supabase.from('permissions').select('key');
                            const systemPerms = allPerms?.map(p => p.key) || [];
                            const filteredSystemPerms = systemPerms.filter(key => !key.toLowerCase().startsWith('page_'));
                            targetFeatures = [...new Set([...targetFeatures, ...filteredSystemPerms])];

                        } else {
                            // 👤 موظف عادي (staff): فقط الصلاحيات المحددة له
                            const { data: staffPerms } = await supabase
                                .from('staff_permissions')
                                .select('permission_key')
                                .eq('staff_id', targetUser.id)
                                .eq('center_id', targetCid);

                            const specificPerms = staffPerms?.map(p => p.permission_key) || [];
                            console.log(`🔐 Fetched ${specificPerms.length} specific permissions for staff ${targetUser.id}`);
                            targetFeatures = [...new Set([...targetFeatures, ...specificPerms])];
                            console.log(`📡 Combined Features:`, targetFeatures);
                        }
                    }
                } else {
                    targetFeatures = [];
                    if (pathname !== '/expired') router.push('/expired');
                }
            }
        }
    } catch (err) {
        if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) {
            console.log("📡 Auth Sync: Request aborted (Normal)");
        } else {
            console.error("❌ Sync Error:", err);
        }
    }

    if (isMounted.current) {
        setSession(currentSession || null);
        if (targetUser) setUser(targetUser);
        if (targetCid) setCenterId(targetCid);
        if (targetRole) setRole(targetRole);
        setAllowedFeatures(targetFeatures);
        setLoading(false);
        isSyncing.current = false;

        // ✅ Store in cache so the next page navigation skips all DB queries
        if (targetUser?.id && targetCid) {
          setCachedAuthData(targetUser.id, {
            centerId: targetCid,
            role: targetRole,
            features: targetFeatures,
          });
        }
    } else {
        isSyncing.current = false;
    }
  };

  useEffect(() => {
    isMounted.current = true;

    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        await syncAuthState('INITIAL_SESSION', session);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event !== 'INITIAL_SESSION') syncAuthState(event, session);
    });

    return () => {
        isMounted.current = false;
        subscription.unsubscribe();
    };
  }, []);

  // Gatekeeper عند تغيير الصفحة (فقط للتأكد في الخلفية)
  useEffect(() => {
      if (centerId && pathname && !pathname.includes('/expired') && !pathname.includes('/login')) {
          // verifyCenterAccess(centerId); 🛑 قمنا بتعطيلها هنا لأن syncAuthState تتولى المهمة
      }
  }, [pathname]);

  const signOut = async () => {
    const currentRole = role;
    const currentUserId = user?.id;

    await supabase.auth.signOut();

    // ✅ Invalidate the cache immediately on sign-out
    if (currentUserId) clearCachedAuthData(currentUserId);

    setUser(null);
    setCenterId(null);
    setRole(null);
    setAllowedFeatures(null);
    localStorage.removeItem("active_center_id");

    if (currentRole === 'student') {
      router.push('/login');
    } else {
      router.push('/admin-login');
    }
  };

  const value = {
    user, session, centerId, role, allowedFeatures, loading, isDeviceAuthorized,
    signOut, activateCenter, setUser, setSession, setCenterId, setRole, setAllowedFeatures, setLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
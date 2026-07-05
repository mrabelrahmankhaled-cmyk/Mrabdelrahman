'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, User, Shield, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

export default function StaffPermissionsPage() {
  const { centerId, allowedFeatures } = useAuth();

  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);

  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [localPermissions, setLocalPermissions] = useState([]); // الصلاحيات المختارة حالياً
  const [message, setMessage] = useState(null); // لعرض رسائل النجاح أو الفشل

  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff-permissions', centerId],
    queryFn: async () => {
      if (!centerId) return null;

      const res = await fetch(`/api/staff-permissions?center_id=${centerId}`);
      if (!res.ok) throw new Error('فشل في جلب البيانات');
      return res.json();
    },
    enabled: !!centerId,
  });

  const groupedPermissions = useMemo(() => {
    if (!data?.permissions) return {};

    const groupTitles = {
      page: '🚪 الوصول للصفحات والمصادر',
      students: '👥 شؤون الطلاب',
      academic: '📖 الأكاديمية والحصص',
      store: '📦 المخزن والمتجر',
      finance: '💰 الحسابات والمالية',
      wallet: '💳 المحفظة الإلكترونية',
      expenses: '💸 المصروفات',
      staff: '🛡️ الموارد البشرية',
      settings: '⚙️ إعدادات النظام',
      logs: '📜 سجلات المراقبة',
      notifications: '📢 التنبيهات والبث',
      subscriptions: '🎫 الاشتراكات'
    };

    return data.permissions
      .filter(perm => {
        // 🛡️ فلترة الصلاحيات بناءً على باقة السنتر
        const isPage = perm.key.startsWith('page_');
        if (isPage) return allowedFeatures?.includes(perm.key);

        const packageMapping = {
          'students:view': 'page_students',
          'students:finance': 'page_students',
          'academic:sessions': 'page_sessions',
          'academic:schedule': 'page_schedule',
          'academic:exams': 'page_exams',
          'store:sales': 'page_store',
          'finance:reports': 'page_finance_reports',
          'wallet:view': 'page_finance_wallets',
          'expenses:view': 'page_finance_expenses',
          'staff:view': 'page_staff_permissions',
          'logs:view': 'page_audit',
          'page_notifications': 'page_notifications',
          'page_subscriptions': 'page_subscriptions'
        };

        const requiredModule = packageMapping[perm.key];
        if (requiredModule) return allowedFeatures?.includes(requiredModule);

        // لو صلاحية مش في لستة الربط، بنجرب نفحص بالبريفكس (عشان الـ Actions)
        const prefix = perm.key.split(':')[0];
        const prefixMapping = {
          'students': 'page_students',
          'academic': 'page_sessions', // ديفولت لو مش محدد مديول محدد
          'store': 'page_store',
          'finance': 'page_finance_reports',
          'wallet': 'page_finance_wallets',
          'expenses': 'page_finance_expenses',
          'staff': 'page_staff_permissions',
          'logs': 'page_audit'
        };
        const fallbackModule = prefixMapping[prefix];
        if (fallbackModule) return allowedFeatures?.includes(fallbackModule);

        return true;
      })
      .reduce((groups, perm) => {
        // 🕵️ تمييز الصفحات عن العمليات
        const isPage = perm.key.startsWith('page_');
        const groupKey = isPage ? 'page' : perm.key.split(':')[0]; 
        const title = groupTitles[groupKey] || groupKey.toUpperCase(); 

        if (!groups[title]) {
          groups[title] = [];
        }
        groups[title].push(perm);
        return groups;
      }, {});
  }, [data?.permissions, allowedFeatures]);

  useEffect(() => {
    if (selectedStaffId && data?.staffPermissions) {
      // ✅ نفلتر الصلاحيات اللي تخص السنتر ده والموظف ده بس
      const userPerms = data.staffPermissions
        .filter((p) => p.staff_id === selectedStaffId)
        .map((p) => p.permission_key);
      setLocalPermissions(userPerms);
      setMessage(null);
    } else if (selectedStaffId) {
      setLocalPermissions([]);
    }
  }, [selectedStaffId, data?.staffPermissions]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!centerId) {
        throw new Error('لم يتم تحديد المركز!');
      }

      const res = await fetch('/api/staff-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaffId,
          permissions: localPermissions,
          center_id: centerId
        }),
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff-permissions']); // تحديث البيانات في الخلفية
      setMessage({ type: 'success', text: 'تم تحديث الصلاحيات بنجاح!' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: () => {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ.' });
    },
  });

  // التحكم في الصلاحية
  const togglePermission = (key) => {
    setLocalPermissions((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key) // إزالة
        : [...prev, key] // إضافة
    );
  };

  // 🆕 اختيار الكل داخل مجموعة
  const toggleGroup = (perms) => {
    const keys = perms.map(p => p.key);
    const allSelected = keys.every(k => localPermissions.includes(k));
    
    if (allSelected) {
      setLocalPermissions(prev => prev.filter(k => !keys.includes(k)));
    } else {
      setLocalPermissions(prev => [...new Set([...prev, ...keys])]);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const filteredStaff = useMemo(() => {
    return data?.staff?.filter(s => s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data?.staff, searchTerm]);

  if (!centerId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-transparent">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-blue-100/50 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse">
            <Shield className="h-8 w-8 text-blue-400" />
          </div>
          <p className="text-gray-400 font-black text-sm md:text-lg">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
      <p className="text-gray-400 font-black text-sm">جاري مزامنة بيانات الموظفين...</p>
    </div>
  );

  if (isError) return (
    <div className="p-10 text-center mx-auto max-w-md">
       <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100">
         <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
         <p className="text-red-700 font-black">حدث خطأ في عرض الصلاحيات</p>
         <button onClick={() => window.location.reload()} className="mt-4 text-xs font-bold text-red-500 underline">إعادة المحاولة</button>
       </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 p-2 md:p-0 pb-24 md:pb-10" dir="rtl">
      
      {/* Header Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Branding */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-gray-800 flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Shield className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              أذونات الوصول
            </h1>
            <p className="text-gray-400 text-[10px] md:text-xs font-bold mt-2 leading-relaxed">حدد بدقة الصفحات والعمليات التي يمكن لكل موظف الاطلاع عليها أو تنفيذها</p>
          </div>
          
          {selectedStaffId && (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full md:w-auto flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 transition-all disabled:opacity-50 active:scale-95 text-sm md:text-base mb-2 md:mb-0"
            >
              {saveMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
              <span>تحديث الصلاحيات</span>
            </button>
          )}
        </div>

        {/* Feedback Message */}
        {message && (
          <div className={`mx-2 p-4 rounded-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
          }`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
              <span className="text-xs md:text-sm font-black">{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)}><X className="h-4 w-4 opacity-40 hover:opacity-100" /></button>
          </div>
        )}

        {/* Dynamic Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 px-2 md:px-0">
          
          {/* Sidebar: Staff List */}
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 p-6 h-fit md:sticky md:top-6">
            <h2 className="text-sm md:text-base font-black text-gray-800 mb-6 flex justify-between items-center">
              <span>فريق العمل</span>
              <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-1 rounded-lg border border-gray-100">{data?.staff?.length || 0}</span>
            </h2>
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="بحث عن موظف..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              
              <div className="flex flex-col gap-2 overflow-x-auto md:overflow-x-visible md:max-h-[60vh] custom-scrollbar pr-1">
                {filteredStaff?.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => setSelectedStaffId(employee.id)}
                    className={`w-full text-right p-4 rounded-2xl flex items-center gap-3 transition-all border-2 min-w-[200px] shrink-0 ${
                      selectedStaffId === employee.id
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 transform scale-[1.02]'
                        : 'bg-transparent border-gray-50 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedStaffId === employee.id ? 'bg-blue-500 text-white' : 'bg-gray-50'}`}>
                      <User className={`h-5 w-5 ${selectedStaffId === employee.id ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-black text-xs md:text-sm whitespace-nowrap overflow-hidden text-ellipsis">{employee.full_name}</div>
                      <div className={`text-[8px] md:text-[9px] font-black uppercase tracking-tighter ${selectedStaffId === employee.id ? 'text-blue-100' : 'text-gray-400'}`}>
                        {employee.role === 'admin' ? '🛡️ مدير عام' : '👤 موظف سنتر'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content: Permissions Area */}
          <div className="md:col-span-2 lg:col-span-3">
            {!selectedStaffId ? (
              <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-sm border-2 border-dashed border-gray-100 p-12 md:p-24 text-center h-full flex flex-col items-center justify-center transition-all">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <User className="h-10 w-10 text-gray-200" />
                </div>
                <h3 className="text-gray-400 font-black text-lg">لم يتم اختيار موظف</h3>
                <p className="text-gray-300 text-xs font-bold mt-2 max-w-xs mx-auto">اختر أحد أفراد فريق العمل من القائمة الجانبية لتخصيص الأذونات المناسبة لدوره</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Admin Note */}
                {data?.staff?.find(s => s.id === selectedStaffId)?.role === 'admin' && (
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 text-amber-700 animate-in fade-in zoom-in duration-300">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-xs font-black">ملاحظة: هذا الحساب "مدير عام" ولديه كامل الصلاحيات في كل الصفحات تلقائياً.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                    <div key={groupName} className={`bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border transition-all overflow-hidden flex flex-col ${
                      Object.values(perms).some(p => localPermissions.includes(p.key)) 
                      ? 'border-blue-200 ring-4 ring-blue-50/50' 
                      : 'border-gray-100 hover:border-gray-200'
                    }`}>
                      <div className={`px-6 py-4 border-b flex justify-between items-center ${
                        Object.values(perms).some(p => localPermissions.includes(p.key))
                        ? 'bg-blue-50/50 border-blue-100'
                        : 'bg-slate-50/50 border-gray-50'
                      }`}>
                        <h3 className="font-black text-gray-800 text-[10px] md:text-xs uppercase tracking-wider">{groupName}</h3>
                        <button 
                          onClick={() => toggleGroup(perms)}
                          className={`text-[9px] font-black px-3 py-1.5 rounded-xl transition-all ${
                            perms.every(k => localPermissions.includes(k.key))
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                            : 'bg-white text-blue-500 border border-blue-100 hover:bg-blue-50'
                          }`}
                        >
                          {perms.every(k => localPermissions.includes(k.key)) ? 'تعطيل الكل' : 'تفعيل الكل'}
                        </button>
                      </div>
                      <div className="p-4 md:p-5 space-y-3 flex-1">
                      {perms.map((perm) => (
                        <div 
                          key={perm.key} 
                          className={`flex items-center justify-between gap-4 p-3.5 rounded-2xl transition-all border ${
                            localPermissions.includes(perm.key)
                            ? 'bg-blue-50/30 border-blue-100 shadow-sm'
                            : 'bg-transparent border-transparent hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1 overflow-hidden">
                            <span className={`block text-xs md:text-sm font-black transition-colors ${localPermissions.includes(perm.key) ? 'text-blue-900' : 'text-gray-800'}`}>
                              {perm.name}
                            </span>
                            <p className="text-[9px] md:text-[10px] text-gray-400 font-bold mt-0.5 leading-tight">
                              {perm.description || perm.key}
                            </p>
                          </div>
                          
                          {/* Toggle Switch */}
                          <button
                            onClick={() => togglePermission(perm.key)}
                            className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none ${
                                localPermissions.includes(perm.key) ? 'bg-blue-600 shadow-lg shadow-blue-100' : 'bg-gray-200'
                            }`}
                          >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                                    localPermissions.includes(perm.key) ? '-translate-x-7' : '-translate-x-1'
                                }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Mobile Sticky Save Button Container */}
      {selectedStaffId && (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:hidden z-40">
           <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/50 p-2">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
              >
                {saveMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5 text-blue-400" />}
                تحديث أذونات الموظف
              </button>
           </div>
        </div>
      )}

    </div>
  );
}
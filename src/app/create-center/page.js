'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase-browser'; 
import { useAuth } from '../../context/AuthContext'; 
import { toast } from 'react-hot-toast';
import { FaBuilding, FaUser, FaLock, FaCheck, FaCrown, FaEnvelope, FaIdCard, FaArrowLeft, FaRocket, FaShieldAlt } from 'react-icons/fa';

export default function CreateCenterPage() {
  const router = useRouter();
  const { activateCenter } = useAuth(); 
  const [loading, setLoading] = useState(false);
  
  const [centerData, setCenterData] = useState({
    name: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    packageId: '',
    centerType: 'center',  // 🎭 'center' | 'instructor'
  });

  const [packages, setPackages] = useState([]);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (data) {
        setPackages(data);
        if (data.length > 0) {
          setCenterData(prev => ({ ...prev, packageId: data[0].id }));
        }
      }
    };
    fetchPackages();
  }, []);

  const handleCreateCenter = async (e) => {
    e.preventDefault();
    if (!centerData.packageId) {
      toast.error('يرجى اختيار باقة للمتابعة');
      return;
    }
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: centerData.adminEmail,
        password: centerData.adminPassword,
        options: {
          data: {
            full_name: centerData.adminName,
            role: 'admin',
          }
        }
      });

      if (authError) throw new Error(`فشل إنشاء الحساب: ${authError.message}`);
      
      if (!authData.session) {
        toast.success('تم إنشاء الحساب! يرجى تفعيل البريد الإلكتروني للمتابعة.');
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const selectedPkg = packages.find(p => p.id === centerData.packageId);
      const endDate = new Date();
      if (selectedPkg && selectedPkg.duration_days) {
          endDate.setDate(endDate.getDate() + selectedPkg.duration_days);
      } else {
          endDate.setDate(endDate.getDate() + 14); 
      }

      const { data: center, error: centerError } = await supabase
        .from('centers')
        .insert([{
          name: centerData.name,
          owner_id: userId,
          package_id: centerData.packageId,
          subscription_end_date: endDate.toISOString(),
          is_active: true,
          center_type: centerData.centerType,  // 🎭
        }])
        .select()
        .single();

      if (centerError) throw new Error(`فشل إنشاء المركز: ${centerError.message}`);

      const { error: profileError } = await supabase
        .from('staff_profiles')
        .upsert({
          id: userId,
          center_id: center.id,
          email: centerData.adminEmail,
          full_name: centerData.adminName,
          role: 'admin'
        });

      if (profileError) throw new Error(`فشل تحديث الملف: ${profileError.message}`);

      activateCenter(center.id); 
      toast.success('🎉 تم إنشاء المركز وتفعيله بنجاح!');
      setTimeout(() => router.push('/admin/dashboard'), 1000);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 md:p-10 relative overflow-hidden font-sans" dir="rtl">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[160px] animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-5xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="bg-white/95 backdrop-blur-3xl rounded-[3rem] shadow-[0_0_100px_rgba(37,99,235,0.1)] overflow-hidden border border-white/40">
          
          <div className="flex flex-col lg:flex-row min-h-[700px]">
            {/* Left Sidebar / Info Section */}
            <div className="lg:w-80 xl:w-96 bg-slate-900 p-10 xl:p-14 text-white flex flex-col justify-between relative">
               <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                 <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.4),_transparent_70%)]"></div>
               </div>
               
               <div className="relative z-10">
                 <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/20 mb-10 animate-bounce">
                   <FaBuilding size={36} />
                 </div>
                 <h1 className="text-4xl font-black mb-6 leading-tight tracking-tight">ابدأ رحلة<br/><span className="bg-clip-text text-transparent bg-gradient-to-l from-blue-400 to-indigo-300">النجاح الذكي</span></h1>
                 <p className="text-slate-400 font-bold text-sm leading-relaxed mb-10 border-r-4 border-blue-500 pr-5">نحن هنا لنحول إدارة مركزك إلى تجربة سلسة، احترافية، وناجحة بكل المقاييس.</p>
                 
                 <div className="space-y-6">
                   <div className="flex items-center gap-4 group">
                     <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                       <FaCheck size={14} />
                     </div>
                     <div>
                       <p className="font-black text-sm">منصة موحدة</p>
                       <p className="text-[10px] text-slate-500 font-bold">كل ما تحتاجه في مكان واحد</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-4 group">
                     <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                       <FaRocket size={14} />
                     </div>
                     <div>
                       <p className="font-black text-sm">سرعة في التنفيذ</p>
                       <p className="text-[10px] text-slate-500 font-bold">نظام فائق السرعة والأداء</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-4 group">
                     <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                       <FaShieldAlt size={14} />
                     </div>
                     <div>
                       <p className="font-black text-sm">أمان فائق</p>
                       <p className="text-[10px] text-slate-500 font-bold">بياناتك دائماً في أمان تام</p>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="mt-14 relative z-10 pt-10 border-t border-white/5">
                 <button 
                  onClick={() => router.push('/login')}
                  className="group text-slate-500 hover:text-white flex items-center gap-3 text-xs font-black transition-all"
                 >
                   <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                     <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                   </div>
                   العودة لتسجيل الدخول
                 </button>
               </div>
            </div>

            {/* Right Form Section */}
            <div className="flex-1 p-10 xl:p-14 bg-white">
              <form onSubmit={handleCreateCenter} className="space-y-12">
                
                {/* Step 1: Center Tech */}
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-4">
                    <span className="w-12 h-1 bg-blue-600 rounded-full"></span> الأساسيات
                  </h3>
                  <div className="space-y-6">
                    <div className="relative group">
                      <FaBuilding className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        className="w-full p-5 pr-14 bg-slate-50 border-2 border-slate-100 focus:border-blue-200 focus:bg-white rounded-3xl outline-none font-black text-slate-700 placeholder:text-slate-300 transition-all shadow-sm"
                        placeholder="ما هو اسم المركز التعليمي؟"
                        value={centerData.name}
                        onChange={(e) => setCenterData({...centerData, name: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 mr-2 flex items-center gap-2">
                        <FaCrown className="text-amber-400" /> اختر باقة المركز
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {packages.map(pkg => (
                          <div 
                            key={pkg.id}
                            onClick={() => setCenterData({...centerData, packageId: pkg.id})}
                            className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden group/pkg ${
                              centerData.packageId === pkg.id 
                              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10' 
                              : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {centerData.packageId === pkg.id && (
                              <div className="absolute top-3 left-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white scale-in">
                                <FaCheck size={8} />
                              </div>
                            )}
                            <p className={`font-black text-sm mb-1 ${centerData.packageId === pkg.id ? 'text-blue-700' : 'text-slate-700'}`}>{pkg.name}</p>
                            <p className="text-xs font-black text-slate-400">{pkg.price} ج.م / {pkg.duration_days} يوم</p>
                            <div className={`absolute bottom-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full translate-x-8 translate-y-8 group-hover/pkg:scale-150 transition-transform duration-700`}></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 🎭 نوع الحساب */}
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 mr-2 flex items-center gap-2">
                        <span>🎭</span> نوع الحساب
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { type: 'center',     emoji: '🏫', title: 'سنتر تعليمي',  sub: 'مركز بمدرسين متعددين' },
                          { type: 'instructor', emoji: '👨‍🏫', title: 'مدرس مستقل', sub: 'أنت المدرس وصاحب المنصة' },
                        ].map(({ type, emoji, title, sub }) => (
                          <div
                            key={type}
                            onClick={() => setCenterData(p => ({ ...p, centerType: type }))}
                            className={`p-4 rounded-3xl border-2 cursor-pointer transition-all ${
                              centerData.centerType === type
                                ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                                : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}
                          >
                            <p className="text-2xl mb-2">{emoji}</p>
                            <p className={`font-black text-sm ${
                              centerData.centerType === type ? 'text-blue-700' : 'text-slate-700'
                            }`}>{title}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Admin Info */}
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-4">
                    <span className="w-12 h-1 bg-blue-600 rounded-full"></span> حساب الإدارة
                  </h3>
                  <div className="space-y-4">
                    <div className="relative group">
                      <FaIdCard className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        className="w-full p-5 pr-14 bg-slate-50 border-2 border-slate-100 focus:border-blue-200 focus:bg-white rounded-3xl outline-none font-black text-slate-700 placeholder:text-slate-300 transition-all shadow-sm"
                        placeholder="الاسم الكامل للمدير المسؤول"
                        value={centerData.adminName}
                        onChange={(e) => setCenterData({...centerData, adminName: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <FaEnvelope className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="email"
                          className="w-full p-5 pr-14 bg-slate-50 border-2 border-slate-100 focus:border-blue-200 focus:bg-white rounded-3xl outline-none font-black text-slate-700 placeholder:text-slate-300 transition-all shadow-sm text-left"
                          dir="ltr"
                          placeholder="البريد الإلكتروني"
                          value={centerData.adminEmail}
                          onChange={(e) => setCenterData({...centerData, adminEmail: e.target.value})}
                          required
                        />
                      </div>
                      <div className="relative group">
                        <FaLock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="password"
                          className="w-full p-5 pr-14 bg-slate-50 border-2 border-slate-100 focus:border-blue-200 focus:bg-white rounded-3xl outline-none font-black text-slate-700 placeholder:text-slate-300 transition-all shadow-sm text-left"
                          dir="ltr"
                          placeholder="كلمة المرور"
                          value={centerData.adminPassword}
                          onChange={(e) => setCenterData({...centerData, adminPassword: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-6 rounded-3xl font-black text-white text-xl transition-all relative overflow-hidden group shadow-[0_20px_40px_rgba(37,99,235,0.2)] active:translate-y-1 ${
                      loading ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-4">
                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                        جاري تهيئة النظام...
                      </span>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                        <span className="flex items-center justify-center gap-3">
                          بداية الرحلة الآن 🚀
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-slate-400 font-bold mt-6 px-10 leading-relaxed uppercase tracking-tighter">بضغطك على الزر أعلاه، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بـ <span className="text-blue-500">سمارت سنتر</span>.</p>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="text-center mt-12 animate-in fade-in delay-1000 duration-1000">
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Powered By</p>
           <h4 className="text-slate-400 font-black text-lg">SMART <span className="text-blue-600">CENTER</span> <span className="text-slate-600">2026</span></h4>
        </div>
      </div>
    </div>
  );
}
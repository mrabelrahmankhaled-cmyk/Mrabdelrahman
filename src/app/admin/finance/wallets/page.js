'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabaseBrowser } from '../../../../lib/supabase';
import { 
  FaWallet, FaPlusCircle, FaSearch, FaHistory, 
  FaUserGraduate, FaArrowUp, FaCoins, FaUserCheck, FaWhatsapp, FaPhone, FaEdit, FaSave, FaTimes, FaSync, FaEye
} from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { toast } from 'sonner';
import AccessDenied from '../../../../components/AccessDenied';

export default function WalletsPage() {
  const { user, centerId, allowedFeatures, loading: authLoading } = useAuth(); // 🛡️ Get permissions
  

  
  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [editMode, setEditMode] = useState(false); 
  const [newBalanceValue, setNewBalanceValue] = useState(''); 
  const [correctionNote, setCorrectionNote] = useState(''); // 🟢 1. حالة جديدة للملاحظات
  const [saving, setSaving] = useState(false);
  async function fetchWalletStudents() {
    if (!centerId) return;
    setLoading(true);
    try {
       const { data, error } = await supabaseBrowser
        .from('students')
        .select('*')
        .eq('has_wallet', true)
        .eq('center_id', centerId)
        .order('name');
       
       if (error) throw error;
       setStudents(data || []);
    } catch (err) {
      toast.error("خطأ في جلب بيانات الطلاب");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (centerId) {
      console.log("👤 WalletsPage Loaded:", { centerId, userId: user?.id });
      fetchWalletStudents();
    }
  }, [centerId, user]);
  // 1. وظيفة شحن الرصيد
  const handleRecharge = async () => {
    
    if (!centerId) {
      console.error("❌ Center ID missing");
      toast.error('⚠️ لم يتم تحديد المركز');
      return;
    }
    
    if (!selectedStudent) {
        console.error("❌ No student selected");
        toast.error('⚠️ يرجى اختيار طالب أولاً');
        return;
    }

    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
        console.error("❌ Invalid amount:", rechargeAmount);
        toast.error('⚠️ يرجى إدخال مبلغ صحيح');
        return;
    }

    setSaving(true);
    try {
      const amountToCharge = parseFloat(rechargeAmount);
      const oldBalance = parseFloat(selectedStudent.wallet_balance) || 0;
      const newBalance = oldBalance + amountToCharge;
      
      const { error: updateError } = await supabaseBrowser
        .from('students')
        .update({ wallet_balance: newBalance })
        .eq('id', selectedStudent.id)
        .eq('center_id', centerId);

      if (updateError) throw updateError;

      // 👮 الحصول على الهوية
      let staffId = user?.id;
      if (!staffId) {
          const { data: authData } = await supabaseBrowser.auth.getUser();
          staffId = authData.user?.id;
      }

      if (!staffId) {
          toast.error('⚠️ خطأ أمني: لم نتمكن من تحديد هويتك. يرجى إعادة تحميل الصفحة.');
          setSaving(false);
          return;
      }

      const { error: insertError } = await supabaseBrowser.from('wallet_transactions').insert([{
        student_id: selectedStudent.id,
        amount: amountToCharge,
        type: 'recharge',
        description: `شحن رصيد يدوي من لوحة التحكم`,
        created_by: staffId,
        balance_after: newBalance,
        center_id: centerId 
      }]);

      if (insertError) throw insertError;

      // 🕵️ سجل التدقيق (Audit Log)
      await supabaseBrowser.from('audit_logs').insert({
          table_name: 'wallets',
          record_id: selectedStudent.id,
          action: 'TRANSFER',
          user_id: staffId,
          center_id: centerId,
          new_data: { 
              details: `شحن محفظة الطالب: ${selectedStudent.name}`,
              amount: amountToCharge,
              balance_after: newBalance
          }
      });

      toast.success(`تم الشحن بنجاح! الرصيد الحالي: ${newBalance} ج ✅`);
      resetForms();
      await fetchWalletStudents();
    } catch (err) {
      toast.error('حدث خطأ أثناء الشحن: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setSaving(false);
    }
  };

  // 2. وظيفة تعديل الرصيد
  const handleBalanceCorrection = async () => {
    if (!centerId) {
      toast.error('⚠️ لم يتم تحديد المركز! يرجى إعادة تحميل الصفحة.');
      return;
    }
    
    if (!selectedStudent) {
        toast.error('⚠️ يرجى اختيار طالب أولاً');
        return;
    }
    if (newBalanceValue === '' || newBalanceValue === null) {
        toast.error('⚠️ يرجى إدخال القيمة الجديدة للرصيد');
        return;
    }
    
    const oldBalance = parseFloat(selectedStudent.wallet_balance) || 0;
    const finalBalance = parseFloat(newBalanceValue);
    const difference = finalBalance - oldBalance;

    const confirmCorrect = window.confirm(
      `⚠️ تنبيه إداري:\nأنت على وشك تغيير رصيد ${selectedStudent.name}\nمن (${oldBalance} ج) إلى (${finalBalance} ج).\n\nهل أنت متأكد؟`
    );
    
    if (!confirmCorrect) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabaseBrowser
        .from('students')
        .update({ wallet_balance: finalBalance })
        .eq('id', selectedStudent.id)
        .eq('center_id', centerId); // ← فلترة حسب المركز

      if (updateError) throw updateError;

      // 🟢 2. دمج الملاحظة مع وصف العملية
      const finalDescription = `تعديل إداري للرصيد (من ${oldBalance} إلى ${finalBalance})` + 
                               (correctionNote ? ` - ملاحظة: ${correctionNote}` : '');

      // 👮 الحصول على الهوية
      let staffId = user?.id;
      if (!staffId) {
          const { data: authData } = await supabaseBrowser.auth.getUser();
          staffId = authData.user?.id;
      }

      const { error: insertError } = await supabaseBrowser.from('wallet_transactions').insert([{
        student_id: selectedStudent.id,
        amount: difference,
        type: 'correction',
        description: finalDescription, 
        notes: correctionNote,
        created_by: staffId,
        balance_after: finalBalance,
        center_id: centerId 
      }]);

      if (insertError) throw insertError;

      // 🕵️ سجل التدقيق (Audit Log)
      await supabaseBrowser.from('audit_logs').insert({
          table_name: 'wallets',
          record_id: selectedStudent.id,
          action: 'UPDATE',
          user_id: staffId,
          center_id: centerId,
          old_data: { balance: oldBalance },
          new_data: { 
              details: `تعديل رصيد يدوي: ${selectedStudent.name}`,
              balance: finalBalance,
              note: correctionNote
          }
      });

      if (selectedStudent.parent_phone) {
        let phone = selectedStudent.parent_phone.replace(/\D/g, '');
        if (phone.startsWith('01')) phone = '2' + phone;
        
        const msg = `تنبيه مالي من الإدارة\n` +
                    `👤 الطالب: ${selectedStudent.name}\n` +
                    `⚠️ تم مراجعة وتعديل رصيد المحفظة يدوياً\n` +
                    `💰 الرصيد الجديد المعتمد: ${finalBalance.toFixed(2)} ج.م`;

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      toast.success(`تم تصحيح الرصيد بنجاح ✅\nالرصيد الجديد: ${finalBalance} ج`);
      resetForms();
      await fetchWalletStudents();
    } catch (err) {
      toast.error('حدث خطأ أثناء التعديل: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForms = () => {
    setSelectedStudent(null);
    setRechargeAmount('');
    setNewBalanceValue('');
    setCorrectionNote(''); // تصفير الملاحظة
    setEditMode(false);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.unique_id.includes(searchTerm)
    );
  }, [students, searchTerm]);

  // 🛡️ الحماية ومنع العرض قبل التحقق من الصلاحيات
  if (authLoading || (allowedFeatures && !allowedFeatures.includes('page_finance_wallets'))) {
    if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_finance_wallets')) {
         return <AccessDenied />;
    }
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">جاري التحقق من الصلاحيات...</div>;
  }

  // التحقق من وجود centerId قبل عرض المحتوى
  if (!centerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p>جاري التحقق من صلاحيات الدخول...</p>
        </div>
      </div>
    );
  }

  // --- واجهة المستخدم الأساسية ---
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto mb-20 md:mb-0" dir="rtl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
        <div className="text-center lg:text-right w-full lg:w-auto">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center justify-center lg:justify-start gap-3">
            <FaWallet className="text-blue-600 shrink-0" /> إدارة أرصدة المشتركين
          </h1>
          <p className="text-gray-500 mt-1 text-xs md:text-sm font-bold">إدارة عمليات الشحن وتصحيح أرصدة المحافظ المالية</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <Link 
            href="/admin/finance/wallets/history" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-800 text-white px-6 py-3.5 md:py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 text-sm"
          >
            <FaHistory className="text-yellow-400 shrink-0" />
            <span>سجل العمليات</span>
          </Link>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none bg-white border-2 border-blue-600 text-blue-600 px-4 py-3 rounded-2xl shadow-sm flex items-center gap-3">
              <FaUserCheck className="text-xl shrink-0" />
              <div className="text-right">
                <p className="text-[9px] font-bold opacity-80 uppercase">محافظ نشطة</p>
                <p className="text-base md:text-lg font-black leading-none">{students.length}</p>
              </div>
            </div>
            <div className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3">
              <FaCoins className="text-xl opacity-70 shrink-0" />
              <div className="text-right">
                <p className="text-[9px] opacity-80 uppercase">إجمالي المبالغ</p>
                <p className="text-base md:text-lg font-black leading-none">
                  {students.reduce((acc, s) => acc + (s.wallet_balance || 0), 0).toLocaleString()} <span className="text-[10px]">ج</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        
        {/* قائمة الطلاب */}
        <div className="lg:col-span-3 space-y-6">
          <div className="relative group">
            <FaSearch className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="ابحث عن مشترك بالاسم أو الكود..."
              className="w-full h-14 md:h-12 p-4 pr-12 rounded-2xl border-2 border-gray-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 shadow-sm transition-all bg-white text-gray-900 text-sm appearance-none opacity-100 placeholder:text-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="max-h-[65vh] overflow-auto custom-scrollbar">
              <table className="w-full text-right min-w-[700px]">
                <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                  <tr className="border-b">
                    <th className="p-4 md:p-5 text-xs font-black text-gray-400 uppercase whitespace-nowrap">اسم الطالب وبياناته</th>
                    <th className="p-4 md:p-5 text-xs font-black text-gray-400 uppercase whitespace-nowrap">رقم التواصل</th>
                    <th className="p-4 md:p-5 text-xs font-black text-gray-400 uppercase text-center whitespace-nowrap">الرصيد الحالي</th>
                    <th className="p-4 md:p-5 text-xs font-black text-gray-400 uppercase text-left whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan="4" className="p-12 text-center text-gray-400 font-bold italic">جاري جلب البيانات...</td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan="4" className="p-12 text-center text-gray-400 font-bold">لا يوجد طلاب مشتركين في نظام المحفظة حالياً</td></tr>
                  ) : filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-4 md:p-5 text-right">
                        <div className="flex flex-col items-start gap-0.5 md:gap-1">
                          <div className="font-black text-gray-800 group-hover:text-blue-600 transition-colors text-sm md:text-base">
                            {student.name}
                          </div>
                          <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-gray-400 font-bold">
                            <span>الصف:</span>
                            <span>{student.grade || 'غير محدد'}</span>
                          </div>
                          <div className="text-[9px] md:text-[10px] text-gray-400 font-mono" dir="ltr">
                            {student.unique_id}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 md:p-5">
                        <div className="flex flex-col gap-1 text-gray-600">
                          <div className="flex items-center gap-2">
                            <FaPhone className="text-[10px] text-gray-300 shrink-0" />
                            <span className="text-xs font-bold">{student.parent_phone || 'بدون رقم'}</span>
                            {student.parent_phone && (
                              <a href={`https://wa.me/2${student.parent_phone.replace(/\D/g, '')}`} target="_blank" className="text-green-500 hover:scale-110 transition-transform">
                                <FaWhatsapp size={16} />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 md:p-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-4 py-1.5 rounded-xl font-black text-xs md:text-sm whitespace-nowrap ${student.wallet_balance > 0 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {student.wallet_balance?.toFixed(2) || '0.00'} <span className="text-[10px]">ج</span>
                          </span>
                        </div>
                      </td>

                      <td className="p-4 md:p-5">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setSelectedStudent(student); setEditMode(false); }}
                            className="bg-blue-600 text-white px-3 py-2.5 md:py-2 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 text-[10px] md:text-[11px] font-black shadow-sm active:scale-95 whitespace-nowrap"
                            title="شحن رصيد"
                          >
                            <FaPlusCircle className="shrink-0" /> شحن
                          </button>
                           <button 
                            onClick={() => { setSelectedStudent(student); setEditMode(true); setNewBalanceValue(student.wallet_balance ?? 0); }}
                            className="bg-gray-100 text-gray-600 px-3 py-2.5 md:py-2 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 text-[10px] md:text-[11px] font-black shadow-sm active:scale-95 whitespace-nowrap"
                            title="تعديل الرصيد لتصحيح خطأ"
                          >
                            <FaEdit className="shrink-0" /> تصحيح
                          </button>
                          <Link 
                            href={`/admin/finance/wallets/history?studentId=${student.id}`}
                            className="bg-slate-800 text-white px-3 py-2.5 md:py-2 rounded-xl hover:bg-black transition-all flex items-center gap-2 text-[10px] md:text-[11px] font-black shadow-sm active:scale-95 whitespace-nowrap"
                            title="عرض سجل حركات هذا الطالب"
                          >
                            <FaEye className="shrink-0" /> السجل
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* كارت التحكم الجانبي (شحن / تصحيح) */}
        <div className="lg:col-span-1">
          {selectedStudent ? (
            <div className={`bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border shadow-2xl lg:sticky lg:top-8 animate-in zoom-in duration-300 ${editMode ? 'border-orange-200 shadow-orange-50' : 'border-blue-50 shadow-blue-100'}`}>
              <div className="flex justify-between items-center mb-6 md:mb-8">
                 <h2 className="text-lg md:text-xl font-black text-gray-800">{editMode ? 'تصحيح الرصيد' : 'تفاصيل الشحن'}</h2>
                 <button onClick={resetForms} className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center font-bold text-xl md:text-lg">&times;</button>
              </div>

              <div className={`text-center mb-6 md:mb-8 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border ${editMode ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-50'}`}>
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 text-xl md:text-2xl shadow-xl rotate-3 ${editMode ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
                  <FaUserGraduate />
                </div>
                <h3 className="font-black text-gray-800 text-sm md:text-base leading-tight truncate">{selectedStudent.name}</h3>
                <div className={`mt-3 inline-flex items-center gap-2 px-4 py-1.5 md:py-1 rounded-full text-[10px] font-bold ${editMode ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>
                   الرصيد الفعلي: {selectedStudent.wallet_balance} ج
                </div>
              </div>

              <div className="space-y-6">
                {editMode ? (
                  /* واجهة التعديل/التصحيح */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-orange-600 mb-3 mr-1 uppercase">تغيير الرصيد الكلي إلى</label>
                      <input 
                        type="number"
                        className="w-full h-16 md:h-auto p-4 md:p-5 rounded-2xl bg-white border-2 border-orange-200 outline-none font-black text-xl md:text-2xl text-center text-gray-900 mb-4 transition-all focus:border-orange-500 appearance-none opacity-100"
                        value={newBalanceValue === null || newBalanceValue === undefined ? '' : newBalanceValue}
                        onChange={(e) => setNewBalanceValue(e.target.value)}
                      />
                      
                      {/* 🟢 خانة الملاحظات */}
                      <label className="block text-[10px] font-black text-gray-400 mb-3 mr-1 uppercase">ملاحظات إدارية (سبب التعديل)</label>
                      <textarea 
                        className="w-full p-4 rounded-2xl bg-white border-2 border-orange-100 outline-none font-bold text-xs md:text-sm text-gray-900 resize-none h-24 focus:border-orange-300 transition-all custom-scrollbar appearance-none opacity-100 placeholder:text-gray-400"
                        placeholder="اكتب هنا سبب تعديل الرصيد..."
                        value={correctionNote}
                        onChange={(e) => setCorrectionNote(e.target.value)}
                      />
                    </div>

                    <button 
                      onClick={handleBalanceCorrection}
                      disabled={saving}
                      className="w-full h-14 md:h-auto bg-orange-600 text-white py-4 md:py-5 rounded-2xl md:rounded-[1.5rem] font-black shadow-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {saving ? <FaSync className="animate-spin" /> : <><FaSave /> حفظ القيمة الجديدة</>}
                    </button>
                    <button onClick={() => setEditMode(false)} className="w-full text-xs font-bold text-gray-400 hover:text-gray-600 py-2">إلغاء والعودة للشحن</button>
                  </div>
                ) : (
                  /* واجهة الشحن العادية */
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-3 mr-1 uppercase">إضافة مبلغ للمحفظة</label>
                      <div className="relative">
                        <FaArrowUp className="absolute top-1/2 -translate-y-1/2 left-6 text-green-500 scale-125" />
                        <input 
                          type="number"
                          placeholder="0.00"
                          className="w-full h-16 md:h-auto p-4 md:p-5 px-12 rounded-2xl bg-white border-2 border-gray-200 focus:border-green-500 outline-none font-black text-xl md:text-2xl transition-all text-center text-gray-900 appearance-none opacity-100 placeholder:text-gray-400 shadow-inner"
                          value={rechargeAmount ?? ''}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                      {[50, 100, 200].map(amt => (
                        <button key={amt} onClick={() => setRechargeAmount(amt)} className="h-11 md:h-10 bg-white border-2 border-gray-100 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95">+{amt}</button>
                      ))}
                    </div>
                    <button 
                      onClick={handleRecharge}
                      disabled={saving}
                      className="w-full h-14 md:h-auto bg-gray-900 text-white py-4 md:py-5 rounded-2xl md:rounded-[1.5rem] font-black shadow-xl hover:bg-black transition-all active:scale-95 disabled:bg-gray-200 disabled:shadow-none flex items-center justify-center gap-3"
                    >
                      {saving ? <FaSync className="animate-spin" /> : 'تأكيد الشحن الآن'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 md:p-12 rounded-2xl md:rounded-[2.5rem] border-2 border-dashed border-gray-100 text-center flex flex-col items-center gap-4 text-gray-300 lg:sticky lg:top-8">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center">
                 <FaHistory className="text-3xl md:text-4xl opacity-30" />
              </div>
              <p className="font-black text-gray-400 text-xs md:text-sm">حدد طالباً لإدارة محفظته</p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        /* اخفاء اسهم الزيادة والنقصان الافتراضية في المتصفح */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}

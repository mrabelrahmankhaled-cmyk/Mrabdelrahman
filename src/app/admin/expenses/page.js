'use client';
import Link from 'next/link'; // For redirect link
import { useState, useMemo } from 'react';
import { useExpenses } from '../../../hooks/useExpenses'; 
import * as XLSX from 'xlsx'; // 👈 استدعاء مكتبة الإكسل
import { 
  FaMoneyBillWave, FaChartLine, FaCalendarAlt, FaPlus, FaTrash, 
  FaFileInvoiceDollar, FaBroom, FaBolt, FaHome, FaUsersCog, FaFileExcel 
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId

export default function ExpensesPage() {
  const { centerId, allowedFeatures, loading: authLoading } = useAuth(); // 🛡️ Get permissions

  if (authLoading || (allowedFeatures && !allowedFeatures.includes('page_finance_expenses'))) {
    if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_finance_expenses')) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-red-500">
                <Link href="/admin/dashboard" className="text-2xl font-bold bg-white p-4 rounded shadow">⛔ غير مصرح لك بدخول هذه الصفحة</Link>
            </div>
        );
    }
    return <div className="min-h-screen flex items-center justify-center">جاري التحقق...</div>;
  }

  // التحقق من وجود centerId قبل تشغيل أي دوال
  if (!centerId) {
    return (
      <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p className="text-gray-500 font-bold">جاري التحقق من صلاحيات الدخول...</p>
        </div>
      </div>
    );
  }
  
  const { 
    expenses, loading, selectedMonth, setSelectedMonth, 
    addExpense, deleteExpense, totalExpenses, categoryTotals, balanceInfo 
  } = useExpenses(new Date().toISOString().slice(0, 7));

  const [newExpense, setNewExpense] = useState({
    title: '', amount: '', category: 'bills', expense_date: new Date().toISOString().slice(0, 10)
  });

  const categories = useMemo(() => ({
    rent: { label: 'إيجار ومرافق', icon: <FaHome/>, color: 'bg-purple-100 text-purple-600' },
    salaries: { label: 'رواتب وعمالة', icon: <FaUsersCog/>, color: 'bg-blue-100 text-blue-600' },
    bills: { label: 'فواتير (كهرباء/نت)', icon: <FaBolt/>, color: 'bg-yellow-100 text-yellow-600' },
    maintenance: { label: 'صيانة وتجهيزات', icon: <FaBroom/>, color: 'bg-orange-100 text-orange-600' },
    marketing: { label: 'دعاية وإعلان', icon: <FaChartLine/>, color: 'bg-pink-100 text-pink-600' },
    other: { label: 'نثريات أخرى', icon: <FaMoneyBillWave/>, color: 'bg-gray-100 text-gray-600' },
  }), []);

  // 🟢 دالة التصدير للإكسل (جديد)
  const handleExportExcel = () => {
    if (expenses.length === 0) return alert('لا توجد بيانات للتصدير');
    
    // تجهيز البيانات بشكل منظم
    const rows = expenses.map(ex => ({
        'التاريخ': new Date(ex.expense_date).toLocaleDateString('ar-EG'),
        'البند (سبب الصرف)': ex.title,
        'القيمة (ج.م)': parseFloat(ex.amount),
        'التصنيف': categories[ex.category]?.label || 'أخرى'
    }));

    // إنشاء الملف
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المصروفات");
    XLSX.writeFile(wb, `تقرير_مصروفات_${selectedMonth}.xlsx`);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!newExpense.title || parseFloat(newExpense.amount) <= 0) return alert('بيانات غير صحيحة');
    try {
        await addExpense(newExpense, categories[newExpense.category].label);
        setNewExpense({ ...newExpense, title: '', amount: '' });
    } catch (err) { alert('فشل الحفظ'); }
  };

  const onDelete = async (expense) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try { await deleteExpense(expense); } catch (err) { alert('فشل الحذف'); }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 mb-20 md:mb-0" dir="rtl">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
        <div className="text-center md:text-right w-full md:w-auto">
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center justify-center md:justify-start gap-2">
                <FaFileInvoiceDollar className="text-red-600 shrink-0"/> إدارة المصروفات
            </h1>
            <p className="text-gray-400 font-bold text-xs md:text-sm mt-1">تتبع التدفقات المالية للمؤسسة</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* زر التصدير (جديد) */}
            <button 
                onClick={handleExportExcel}
                className="bg-green-700 hover:bg-green-800 text-white px-4 h-11 md:h-10 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95 w-full sm:w-auto"
            >
                <FaFileExcel className="shrink-0"/> <span className="text-sm">تصدير Excel</span>
            </button>

            <div className="bg-white px-3 h-11 md:h-10 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 w-full sm:w-auto">
                <FaCalendarAlt className="text-gray-400 shrink-0"/>
                <span className="text-xs font-bold text-gray-500 pl-2 border-l shrink-0">الشهر:</span>
                <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)} 
                    className="font-bold text-sm text-gray-700 bg-transparent outline-none flex-1"
                />
            </div>
        </div>
      </div>

{/* 🔥🔥 نظام إدارة التدفقات المالية (الخزنة + الحصص + المتجر) 🔥🔥 */}
<div className="flex flex-col gap-4 mb-6 md:mb-8">
  
  {/* 1. الكارت الرئيسي: صافي الرصيد الحالي */}
  <div className={`p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl border-2 flex flex-col md:flex-row items-center justify-between transition-all relative overflow-hidden ${balanceInfo.balance >= 0 ? 'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-500' : 'bg-gradient-to-br from-red-600 to-rose-700 border-red-500'} text-white`}>
      <div className="relative z-10 text-center md:text-right w-full md:w-auto">
          <p className="font-bold text-[10px] opacity-80 mb-2 uppercase tracking-[0.2em]">السيولة المتوفرة في الخزنة الآن</p>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter dir-ltr">
              {balanceInfo.balance?.toLocaleString()} <span className="text-lg md:text-2xl opacity-60 font-medium">EGP</span>
          </h2>
          <div className="flex justify-center md:justify-start gap-4 mt-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md">
                {balanceInfo.balance >= 0 ? '📈 وضع مالي مستقر' : '⚠️ تنبيه: عجز مالي'}
              </span>
          </div>
      </div>
      
      <div className="mt-6 md:mt-0 relative z-10 w-full md:w-auto">
          <div className="bg-black/10 p-4 md:p-5 rounded-xl md:rounded-2xl backdrop-blur-xl border border-white/10 space-y-3 min-w-full md:min-w-[260px]">
              <div className="flex justify-between items-center text-xs md:text-sm font-mono">
                  <span className="opacity-70">إجمالي الإيرادات:</span>
                  <span className="font-bold text-emerald-300">+{balanceInfo.income?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs md:text-sm font-mono border-t border-white/10 pt-2">
                  <span className="opacity-70">إجمالي المصروفات:</span>
                  <span className="font-bold text-red-300">-{balanceInfo.expenses?.toLocaleString()}</span>
              </div>
          </div>
      </div>
      {/* أيقونة خلفية ضخمة */}
      <FaMoneyBillWave className="absolute -left-10 -bottom-10 text-[150px] md:text-[200px] opacity-10 rotate-12" />
  </div>

  {/* 2. كروت مصادر الدخل (حصص vs متجر) */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* كارت نصيب الحصص */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center gap-4 md:gap-5 group hover:border-blue-400 transition-all">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner shrink-0">
              <FaUsersCog />
          </div>
          <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">صافي إيراد الحصص</p>
              <h3 className="text-xl md:text-2xl font-black text-gray-800 dir-ltr text-right">
                  {balanceInfo.sessions_net?.toLocaleString()} <span className="text-xs text-gray-400 font-medium">EGP</span>
              </h3>
          </div>
      </div>

      {/* كارت نصيب المتجر */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-purple-100 flex items-center gap-4 md:gap-5 group hover:border-purple-400 transition-all">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-50 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-inner shrink-0">
              <FaFileInvoiceDollar />
          </div>
          <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">إيراد مبيعات المتجر</p>
              <h3 className="text-xl md:text-2xl font-black text-gray-800 dir-ltr text-right">
                  {balanceInfo.store_net?.toLocaleString()} <span className="text-xs text-gray-400 font-medium">EGP</span>
              </h3>
          </div>
      </div>
  </div>
</div>

      {/* Stats & Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Total Month Expenses */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between group hover:border-red-300 transition shrink-0">
            <div>
                <p className="text-red-500 font-bold text-[10px] md:text-xs mb-1 uppercase tracking-wider">مصروفات {selectedMonth}</p>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900">{totalExpenses.toLocaleString()} <span className="text-xs md:text-sm text-gray-400">ج.م</span></h2>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 rounded-full flex items-center justify-center text-lg md:text-xl text-red-500 group-hover:rotate-12 transition shrink-0">💸</div>
        </div>
        
        {/* Categories Scroller */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200 sm:col-span-2 lg:col-span-2">
            <h3 className="font-bold text-gray-700 mb-4 text-[10px] md:text-xs uppercase tracking-wider">تحليل بنود الصرف:</h3>
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 no-scrollbar">
                {Object.entries(categories).map(([key, cat]) => {
                    const val = categoryTotals[key] || 0;
                    if (val === 0) return null;
                    return (
                        <div key={key} className={`flex-shrink-0 px-3 md:px-4 py-2.5 md:py-3 rounded-xl border ${cat.color} bg-opacity-5 border-opacity-20 flex flex-col items-center min-w-[100px] md:min-w-[110px] hover:bg-opacity-10 transition`}>
                            <div className="text-lg md:text-xl mb-1.5 md:mb-2 opacity-80">{cat.icon}</div>
                            <span className="text-[9px] md:text-[10px] font-bold opacity-70 mb-0.5 md:mb-1">{cat.label}</span>
                            <strong className="text-base md:text-lg">{val.toLocaleString()}</strong>
                        </div>
                    )
                })}
                {totalExpenses === 0 && <p className="text-gray-400 text-[10px] md:text-xs italic py-2">لم يتم تسجيل مصروفات هذا الشهر.</p>}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 lg:sticky lg:top-4">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b text-sm md:text-base">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><FaPlus size={12}/></div>
                    تسجيل مصروف جديد
                </h3>
                <form onSubmit={onSubmit} className="space-y-4 md:space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">بيان المصروف</label>
                        <input type="text" className="w-full h-11 md:h-auto p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm focus:border-blue-500 outline-none transition" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} required placeholder="مثال: فاتورة كهرباء..."/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">المبلغ (ج.م)</label>
                            <input type="number" className="w-full h-11 md:h-auto p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-red-600 focus:border-red-500 outline-none transition" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} required placeholder="0.00"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">التاريخ</label>
                            <input type="date" className="w-full h-11 md:h-auto p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-600 focus:border-blue-500 outline-none transition" value={newExpense.expense_date} onChange={e => setNewExpense({...newExpense, expense_date: e.target.value})}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">نوع المصروف</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                            {Object.entries(categories).map(([key, val]) => (
                                <button key={key} type="button" onClick={() => setNewExpense({...newExpense, category: key})} className={`p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border transition-all h-11 ${newExpense.category === key ? 'bg-gray-800 text-white border-gray-800 shadow-md scale-[1.02]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    <span className="shrink-0">{val.icon}</span> 
                                    <span className="truncate">{val.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition active:scale-95 h-12 md:h-auto mt-2">
                        <FaPlus/> إضافة للخزنة
                    </button>
                </form>
            </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 text-sm">سجل عمليات {selectedMonth}</h3>
                    <span className="text-[10px] bg-white px-2 py-1 rounded border font-mono text-gray-600">{expenses.length} عملية</span>
                </div>
                
                {loading ? (
                    <div className="p-20 text-center text-gray-400 flex flex-col items-center animate-pulse">
                        <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div><div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="p-20 text-center text-gray-400 flex flex-col items-center">
                        <FaMoneyBillWave size={48} className="mb-4 opacity-20"/>
                        <p className="text-sm font-bold">لا توجد مصروفات مسجلة.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 overflow-x-auto">
                        <div className="min-w-full">
                            {expenses.map(expense => {
                                const cat = categories[expense.category] || categories.other;
                                return (
                                    <div key={expense.id} className="p-3 md:p-4 flex items-center justify-between hover:bg-gray-50 transition group min-w-full">
                                        <div className="flex items-center gap-3 md:gap-4 flex-1">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg md:text-xl shadow-sm ${cat.color.replace('text', 'bg').split(' ')[0]} bg-opacity-20 ${cat.color.split(' ')[1]} shrink-0`}>
                                                {cat.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-gray-800 text-xs md:text-sm mb-0.5 md:mb-1 truncate">{expense.title}</h4>
                                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                                                    <span className="shrink-0 font-mono">{new Date(expense.expense_date).toLocaleDateString('ar-EG')}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span className="shrink-0 font-mono" dir="ltr">
                                                        {new Date(expense.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span className="text-blue-600 font-black">{expense.staff_name || 'مدير'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span className="truncate">{cat.label}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 md:gap-6 shrink-0 mr-4">
                                            <span className="font-black text-red-600 text-base md:text-lg dir-ltr whitespace-nowrap">
                                                -{parseFloat(expense.amount).toLocaleString()}
                                            </span>
                                            <button 
                                                onClick={() => onDelete(expense)} 
                                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-600 hover:bg-red-50 transition opacity-100 md:opacity-0 group-hover:opacity-100"
                                            >
                                                <FaTrash size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
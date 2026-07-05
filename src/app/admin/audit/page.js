'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  FaHistory, FaSearch, FaUserSecret, FaEye, FaTimes, 
  FaFileDownload, FaFire, FaTrash, FaEdit, FaPlusCircle, 
  FaSkull, FaExclamationTriangle, FaCheckCircle, FaBolt, FaUserShield, FaMagic
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId

export default function AuditLogsPage() {
  const { centerId } = useAuth(); // ← استخراج centerId من الـ context
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTable, setFilterTable] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🔥 State للنافذة المنبثقة
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showExplainModal, setShowExplainModal] = useState(false); // 🆕 مضاف لفتح نافذة التفسير

  // 🧠 محرك التحليل الذكي (AI Analysis Engine) - مضاف عوامل التفسير
  const getAISummary = (logs) => {
    if (logs.length === 0) return { score: 0, text: "النظام مستقر تماماً ولا توجد أنشطة مسجلة حالياً.", mood: 'safe', confidence: 100, factors: [] };

    let score = 0;
    let factors = []; // 🆕 لتخزين أسباب النتيجة (الشفافية)
    const criticalLogs = logs.filter(l => l.riskLevel === 'CRITICAL');
    const suspiciousLogs = logs.filter(l => l.riskLevel === 'SUSPICIOUS');
    
    // 1. حساب الـ Score بناءً على كثافة الأخطار
    if (criticalLogs.length > 0) {
      const p = criticalLogs.length * 15;
      score += p;
      factors.push({ label: 'عمليات شديدة الخطورة', weight: p, icon: '💀' });
    }
    if (suspiciousLogs.length > 0) {
      const p = suspiciousLogs.length * 5;
      score += p;
      factors.push({ label: 'أنشطة مشبوهة مرصودة', weight: p, icon: '⚠️' });
    }
    
    // 2. تحليل توقيت العمليات (Night Owl Detection)
    const nightLogs = logs.filter(l => {
      const hour = new Date(l.created_at).getHours();
      return hour >= 1 && hour <= 5; // من 1 لـ 5 الفجر
    });
    if (nightLogs.length > 0) {
      score += 20;
      factors.push({ label: 'نشاط خارج ساعات العمل الرسمية', weight: 20, icon: '🌙' });
    }

    // 3. تحليل كثافة الحذف
    const deleteOps = logs.filter(l => l.action === 'DELETE').length;
    if (deleteOps > 5) {
      score += 25;
      factors.push({ label: 'كثافة حذف غير روتينية', weight: 25, icon: '🗑️' });
    }

    const finalScore = Math.min(score, 100);
    const confidence = logs.length < 10 ? 65 : 94; // 🆕 حساب درجة الثقة

    // 4. توليد النص التحليلي (Narrative)
    let narrative = "";
    if (finalScore > 70) {
      narrative = `🚨 تنبيه أمني عالي: تم رصد نمط سلوكي خطر (Risk Score: ${finalScore}). هناك تركيز عالي على ${criticalLogs[0]?.riskReason} وعمليات حذف متكررة. ننصح بمراجعة صلاحيات الموظفين فوراً.`;
    } else if (finalScore > 30) {
      narrative = `⚠️ ملاحظة أمنية: السلوك العام مستقر، لكن تم رصد بعض الأنشطة المشبوهة في جداول ${suspiciousLogs[0]?.table_name || 'النظام'}. يفضل المتابعة الدورية.`;
    } else {
      narrative = "✅ حالة النظام: ممتازة. جميع الأنشطة المرصودة تقع ضمن النطاق الروتيني الآمن للمركز.";
    }

    return { score: finalScore, text: narrative, mood: finalScore > 70 ? 'danger' : finalScore > 30 ? 'warning' : 'success', confidence, factors };
  };

  // 🎯 وظيفة تحليل الأنماط المتكررة (بيفلتر الجدول على أكتر شخص مشبوه)
  const analyzePatterns = () => {
    if (highRiskUsers.length > 0) {
        setSearchTerm(highRiskUsers[0]); 
        toast.success(`تم حصر الأنماط المشبوهة للمستخدم: ${highRiskUsers[0]}`);
    } else {
        setSearchTerm('CRITICAL'); 
        toast("جاري عرض كافة العمليات عالية الخطورة", { icon: 'ℹ️' }); // ✅ تم تصحيح الخطأ هنا
    }
  };

  // 🚨 وظيفة اتخاذ إجراء وقائي (بتقفل الـ Filter وتعرض الخلاصة للمدير)
  const takePrecautionaryAction = () => {
    console.log('takePrecautionaryAction called, aiSummary.score:', aiSummary.score);
    
    if (aiSummary.score > 50) {
        const confirmAction = window.confirm(`⚠️ النظام رصد درجة مخاطر (${aiSummary.score}). هل تريد تصدير ملف الأدلة الجنائية (Security Audit Log) فوراً لمراجعته مع الموظف؟`);
        if (confirmAction) {
            handleExport();
            toast.success("تم تجهيز ملف الأدلة بنجاح 📂");
        }
    } else {
        // Always show something for testing
        const confirmAction = window.confirm(`درجة المخاطر الحالية: (${aiSummary.score}). هل تريد تصدير تقرير الأمان على أي حال؟`);
        if (confirmAction) {
            handleExport();
            toast.success("تم تصدير التقرير الأمني ✅");
        } else {
            toast("✅ النظام آمن حالياً، لا توجد حاجة لإجراءات استثنائية.", { icon: '🛡️' });
        }
    }
  };

  // 🟢 قاموس لترجمة أسماء الحقول
  const fieldLabels = {
    name: 'الاسم', full_name: 'الاسم الكامل', price: 'السعر', 
    stock: 'المخزون', phone: 'رقم الهاتف', role: 'الدور/الوظيفة', 
    notes: 'ملاحظات', grade: 'الصف الدراسي', is_settled: 'حالة التسوية', 
    title: 'العنوان', content: 'المحتوى', salary: 'المرتب', 
    wallet_balance: 'رصيد المحفظة', pay_amount: 'المبلغ المدفوع'
  };

  // 🧠 1. تحليل المخاطر + السبب (The Detective)
  const analyzeRisk = (log) => {
    // A. الحذف دايماً خطر
    if (log.action === 'DELETE') {
        return { level: 'CRITICAL', reason: 'عملية حذف نهائي للبيانات' };
    }

    // ✅ استثناء: تسوية المستحقات (Store Settlements) تعتبر عملية روتينية وآمنة
    if (log.table_name === 'store_settlements' && log.action === 'INSERT') {
        return { level: 'NORMAL', reason: '✅ تسوية مستحقات مالية (مبيعات)' };
    }

    // B. جداول الأموال والإعدادات
    if (['wallets', 'store_settlements', 'payments'].includes(log.table_name)) {
        return { level: 'CRITICAL', reason: 'تعديل في السجلات المالية' };
    }
    if (log.table_name === 'center_settings') {
        return { level: 'CRITICAL', reason: 'تغيير إعدادات النظام الحساسة' };
    }

    // داخل analyzeRisk (الجزء C)
    if (log.action === 'UPDATE' && log.old_data && log.new_data) {
      const changedKeys = Object.keys(log.new_data).filter(k => 
        JSON.stringify(log.old_data[k]) !== JSON.stringify(log.new_data[k])
      );

      // 🔥 إضافة ذكية: التحقق لو كانت العملية هي "تسوية مالية للمدرس"
      if (changedKeys.includes('is_settled') && log.new_data.is_settled === true) {
          return { level: 'NORMAL', reason: '✅ تسوية مالية رسمية للمدرس' };
      }
      
      // حقول مشبوهة
      const suspiciousFields = ['name', 'phone', 'password', 'username'];
      const hitSuspicious = changedKeys.find(k => suspiciousFields.includes(k));
      if (hitSuspicious) {
          return { level: 'SUSPICIOUS', reason: `تعديل بيانات جوهرية: ${fieldLabels[hitSuspicious] || hitSuspicious}` };
      }
    }

    // D. جداول هامة
    if (['staff_profiles', 'rooms'].includes(log.table_name) && log.action === 'UPDATE') {
        return { level: 'SUSPICIOUS', reason: 'تعديل في ملفات الموظفين/القاعات' };
    }

    return { level: 'NORMAL', reason: 'نشاط روتيني آمن' };
  };

  const getRiskStyle = (risk) => {
    switch (risk) {
      case 'CRITICAL': return { 
        bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', 
        icon: <FaSkull className="animate-pulse"/>, label: 'خطر جداً' 
      };
      case 'SUSPICIOUS': return { 
        bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', 
        icon: <FaExclamationTriangle/>, label: 'مشبوه' 
      };
      default: return { 
        bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', 
        icon: <FaCheckCircle/>, label: 'عادي' 
      };
    }
  };

  const fetchLogs = async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('audit_logs')
        .select(`*, staff_profiles (full_name, role)`)
        .eq('center_id', centerId)
        .order('created_at', { ascending: false })
        .limit(500);

      // فلترة حسب نوع الجدول إذا تم اختياره
      if (filterTable !== 'all') {
        query = query.eq('table_name', filterTable);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Fetch Error:", error);
        toast.error("فشل تحميل السجلات");
      } else {
        // حقن التحليل داخل البيانات
        const enrichedData = data.map(log => {
          const riskAnalysis = analyzeRisk(log);
          return {
            ...log,
            riskLevel: riskAnalysis.level,
            riskReason: riskAnalysis.reason
          };
        });
        setLogs(enrichedData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!centerId) return;
    
    fetchLogs();

    const channel = supabase
      .channel('audit-logs-tracker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        async (payload) => {
          if (!centerId) return;
          console.log('🔔 Realtime change detected:', payload.eventType);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { data: newLog } = await supabase
              .from('audit_logs')
              .select('*, staff_profiles(full_name, role)')
              .eq('id', payload.new.id)
              .eq('center_id', centerId)
              .single();

            if (newLog) {
              const riskAnalysis = analyzeRisk(newLog);
              const enrichedLog = {
                ...newLog,
                riskLevel: riskAnalysis.level,
                riskReason: riskAnalysis.reason
              };
              
              setLogs(prev => {
                const others = prev.filter(l => l.id !== enrichedLog.id);
                return [enrichedLog, ...others].slice(0, 500);
              });
              
              if (payload.eventType === 'INSERT' && enrichedLog.staff_profiles?.role !== 'admin') {
                toast('نشاط جديد مكتشف! 🚨', {
                  icon: '🕵️‍♂️',
                  style: { borderRadius: '10px', background: '#333', color: '#fff' },
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setLogs(prev => prev.filter(l => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centerId, filterTable]); // إعادة الجلب عند تغيير الفلتر

  // فلترة العرض
  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.staff_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record_id?.toString().includes(searchTerm) ||
      log.riskLevel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.new_data?.details?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  // 🔥 تحسين هندسي: استخدام useMemo لمنع تكرار الحسابات الثقيلة في كل ريندر
  const aiSummary = useMemo(() => getAISummary(filteredLogs), [filteredLogs]);

  // إحصائيات
  const stats = useMemo(() => {
    return {
      total: filteredLogs.length,
      critical: filteredLogs.filter(l => l.riskLevel === 'CRITICAL').length,
      suspicious: filteredLogs.filter(l => l.riskLevel === 'SUSPICIOUS').length,
      normal: filteredLogs.filter(l => l.riskLevel === 'NORMAL').length,
    };
  }, [filteredLogs]);

  // 🕵️ 2. اكتشاف الأنماط الهجومية (Timeline Attack Detection)
  const highRiskUsers = useMemo(() => {
      const userRiskCount = {};
      logs.forEach(log => {
          if (log.riskLevel === 'CRITICAL' && log.staff_profiles?.full_name) {
              const user = log.staff_profiles.full_name;
              userRiskCount[user] = (userRiskCount[user] || 0) + 1;
          }
      });
      // رجعلي بس اللي عملوا أكتر من 3 مصايب في الـ 150 سجل دول
      return Object.keys(userRiskCount).filter(user => userRiskCount[user] >= 3);
  }, [logs]);

  // 🚩 3. اكتشاف الصلاحيات المشبوهة (Silent Red Flag)
  const unauthorizedCriticalActivity = useMemo(() => {
      return logs.some(log => 
          log.riskLevel === 'CRITICAL' && 
          log.staff_profiles?.role !== 'admin' && 
          log.staff_profiles?.role !== 'owner' // عدلها حسب أسماء الأدوار عندك
      );
  }, [logs]);

  const getChanges = (oldData, newData) => {
    if (!oldData || !newData) return [];
    const changes = [];
    Object.keys(newData).forEach(key => {
      if (['updated_at', 'created_at', 'id'].includes(key)) return;
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push({
          field: key, label: fieldLabels[key] || key,
          oldVal: oldData[key], newVal: newData[key]
        });
      }
    });
    return changes;
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) return toast.error('لا توجد بيانات');
    const headers = ['التاريخ', 'المستوى', 'سبب التصنيف', 'المستخدم', 'العملية', 'الجدول', 'ID'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString('ar-EG'),
      log.riskLevel,
      log.riskReason, // 🔥 ضفنا السبب في الإكسيل
      log.staff_profiles?.full_name || 'System',
      log.action,
      log.table_name,
      log.record_id
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Security_Audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen space-y-6 ">
      
      {/* 🚩 The Silent Red Flag Banner */}
      {unauthorizedCriticalActivity && (
          <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                  <FaUserShield className="text-2xl" />
                  <div>
                      <h3 className="font-black text-sm md:text-base">تحذير أمني: تم رصد نشاط عالي الخطورة من حسابات بصلاحيات محدودة</h3>
                      <p className="text-xs opacity-90">يرجى مراجعة السجلات المميزة باللون الأحمر فوراً.</p>
                  </div>
              </div>
              <button onClick={() => setSearchTerm('CRITICAL')} className="bg-white text-red-600 px-4 py-1 rounded-lg text-xs font-bold hover:bg-red-50">
                  عرض السجلات
              </button>
          </div>
      )}

      {/* Header Control Room */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-black flex items-center gap-2 text-gray-800">
          <FaUserSecret className="text-red-600" /> غرفة الرقابة الأمنية
        </h1>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="relative flex-grow md:w-64">
                <FaSearch className="absolute right-3 top-3 text-gray-400" />
                <input 
                    type="text" placeholder="بحث ذكي..." 
                    className="w-full p-2 pr-10 border rounded-xl font-bold text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-red-100"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 transition shadow-sm text-sm">
                <FaFileDownload /> تقرير أمني
            </button>
            <select className="p-2 border rounded-xl font-bold text-sm bg-gray-50 outline-none" value={filterTable} onChange={(e) => setFilterTable(e.target.value)}>
              <option value="all">-- كل الأنظمة --</option>
              <optgroup label="الأكثر خطورة">
                <option value="wallets">المحافظ المالية</option>
                <option value="store_settlements">التسويات</option>
                <option value="center_settings">الإعدادات</option>
              </optgroup>
              <optgroup label="التشغيل">
                <option value="students">الطلاب</option>
                <option value="store_products">المنتجات</option>
                <option value="store_sales">المبيعات</option>
              </optgroup>
            </select>
        </div>
      </div>

      {/* 🚀 AI Security Command Center (The WOW Card) */}
      <div className={`mb-8 p-1 rounded-[2.5rem] bg-gradient-to-r transition-all duration-1000 ${
        aiSummary.mood === 'danger' ? 'from-red-600 to-red-900 shadow-red-200' :
        aiSummary.mood === 'warning' ? 'from-orange-500 to-orange-700 shadow-orange-200' :
        'from-gray-900 to-blue-900 shadow-blue-200'
      } shadow-2xl relative overflow-hidden group`}>
        
        <div className="bg-white/5 backdrop-blur-md rounded-[2.3rem] p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="flex-1 text-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-white/20 p-2 rounded-xl">
                <FaBolt className={aiSummary.mood === 'danger' ? 'text-yellow-400 animate-bounce' : 'text-blue-400'} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 text-blue-200">AI Security Intelligence</span>
            </div>
            
            <h2 className="text-xl md:text-2xl font-black leading-tight mb-2 drop-shadow-md">
              {aiSummary.text}
            </h2>

            {/* 🆕 قسم الشفافية والثقة */}
            <div className="flex items-center gap-4 mb-4">
               <button onClick={() => setShowExplainModal(true)} className="text-[10px] font-black text-blue-300 underline underline-offset-4 hover:text-white transition-all">
                  لماذا تم احتساب النتيجة؟ (Explain Score)
               </button>
               <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">درجة الثقة: {aiSummary.confidence}%</span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={analyzePatterns} 
                className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2"
              >
                 <FaMagic /> تحليل الأنماط المتكررة
              </button>
              <button 
                onClick={takePrecautionaryAction} 
                className="bg-white text-gray-900 px-4 py-2 rounded-xl text-[10px] font-black transition-all hover:scale-105"
              >
                 اتخاذ إجراء وقائي
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center min-w-[160px] border-r border-white/10 pr-0 md:pr-8">
            <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
               <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray={251} 
                    strokeDashoffset={251 - (251 * aiSummary.score / 100)} 
                    className={`transition-all duration-1000 ${
                      aiSummary.mood === 'danger' ? 'text-red-500' : 'text-blue-400'
                    }`}
                  />
               </svg>
               <span className={`absolute text-3xl font-black ${aiSummary.mood === 'danger' ? 'text-red-400' : 'text-white'}`}>
                  {aiSummary.score}
               </span>
            </div>
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Global Risk Score</p>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
           <FaUserSecret size={300} className="absolute -top-10 -right-10 rotate-12" />
        </div>
      </div>

      {/* Security Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div><p className="text-xs font-bold text-gray-400">سجل الأحداث</p><h3 className="text-2xl font-black text-gray-800">{stats.total}</h3></div>
              <div className="bg-gray-100 p-3 rounded-full text-gray-600"><FaHistory/></div>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl shadow-sm border border-green-100 flex items-center justify-between">
              <div><p className="text-xs font-bold text-green-600">عمليات آمنة</p><h3 className="text-2xl font-black text-green-700">{stats.normal}</h3></div>
              <div className="bg-white p-3 rounded-full text-green-600"><FaCheckCircle/></div>
          </div>
          <div className="bg-orange-50 p-4 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between">
              <div><p className="text-xs font-bold text-orange-600">نشاط مشبوه</p><h3 className="text-2xl font-black text-orange-700">{stats.suspicious}</h3></div>
              <div className="bg-white p-3 rounded-full text-orange-600"><FaExclamationTriangle/></div>
          </div>
          <div className="bg-red-50 p-4 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between relative overflow-hidden group">
              <div className="relative z-10">
                  <p className="text-xs font-bold text-red-600">تهديدات حرجة</p>
                  <h3 className="text-2xl font-black text-red-700 flex items-center gap-1">{stats.critical} {stats.critical > 0 && <FaFire className="animate-pulse"/>}</h3>
              </div>
              <div className="bg-white p-3 rounded-full text-red-600 relative z-10"><FaSkull/></div>
              {stats.critical > 0 && <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>}
          </div>
      </div>

      {/* The Security Log Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-500 font-bold">جاري الفحص الأمني...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm border-collapse">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="p-4 border-b">التوقيت</th>
                  <th className="p-4 border-b">مستوى الخطر</th>
                  <th className="p-4 border-b">النشاط</th>
                  <th className="p-4 border-b">النظام</th>
                  <th className="p-4 border-b">المعرف (ID)</th>
                  <th className="p-4 text-right border-b">المسؤول</th>
                  <th className="p-4 text-center border-b">فحص</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                    const style = getRiskStyle(log.riskLevel);
                    const isHighRiskUser = log.staff_profiles?.full_name && highRiskUsers.includes(log.staff_profiles.full_name);
                    
                    return (
                    <tr key={log.id} className={`border-b transition group ${log.riskLevel === 'CRITICAL' ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'}`}>
                        <td className="p-4 font-mono text-gray-600 font-bold" dir="ltr">
                           {new Date(log.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                           <span className="block text-[10px] text-gray-400">{new Date(log.created_at).toLocaleDateString('ar-EG')}</span>
                        </td>
                        <td className="p-4">
                           <div className="group/tooltip relative w-fit">
                               <span title={log.riskReason} className={`cursor-help flex items-center gap-1 w-fit px-3 py-1.5 rounded-lg text-xs font-black border ${style.text} ${style.bg} ${style.border}`}>
                                   {style.icon} {style.label}
                               </span>
                               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition pointer-events-none z-10">
                                   {log.riskReason}
                               </div>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col">
                               <span className={`text-[10px] w-fit px-1.5 py-0.5 rounded-md font-bold mb-1 ${
                                   log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                   log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                                   'bg-blue-100 text-blue-700'
                               }`}>
                                   {log.action === 'INSERT' ? '➕ إضافة' : 
                                    log.action === 'UPDATE' ? '📝 تعديل' : 
                                    log.action === 'DELETE' ? '🗑️ حذف' : log.action}
                               </span>
                               <span className="text-gray-800 font-bold text-xs line-clamp-2">
                                   {log.new_data?.details || (log.action === 'DELETE' ? 'حذف سجل' : 'تحديث بيانات')}
                               </span>
                           </div>
                        </td>
                        <td className="p-4 font-bold text-gray-700">{log.table_name}</td>
                        <td className="p-4 font-mono text-xs text-gray-500 bg-white border border-gray-200 rounded px-2 py-1 w-fit select-all">
                            {String(log.record_id || '').split('-')[0]}...
                        </td>
                        <td className="p-4 text-right">
                            <div className="font-bold text-gray-800 flex items-center gap-2 justify-end">
                                {log.staff_profiles?.full_name ? (
                                    <span className="flex items-center gap-1.5">
                                        {log.staff_profiles.full_name}
                                        <span className="text-gray-400 text-[12px]">👤</span>
                                    </span>
                                ) : (
                                    <span className="text-blue-600 font-black flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                                        {log.user_id ? `مستخدم #${log.user_id.split('-')[0]}` : 'النظام الآلي (Admin)'}
                                        <span className="text-[12px]">{log.user_id ? '🔑' : '🤖'}</span>
                                    </span>
                                )}

                                {isHighRiskUser && (
                                    <div className="group relative">
                                        <span className="text-red-600 animate-pulse cursor-help bg-red-50 p-1 rounded-full border border-red-200 block">
                                            <FaBolt size={10} />
                                        </span>
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-black text-white text-[10px] p-2 rounded-lg z-50 shadow-xl">
                                            ⚠️ تنبيه: تم رصد أكثر من 3 حركات عالية الخطورة لهذا المستخدم مؤخراً.
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="text-[10px] text-gray-400 font-black mt-1 flex items-center gap-1 justify-end uppercase tracking-tighter">
                                {log.staff_profiles?.role ? (
                                    <span className={`px-1.5 py-0.5 rounded ${log.staff_profiles.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-gray-100 text-gray-500'}`}>
                                        {log.staff_profiles.role}
                                    </span>
                                ) : (
                                    <span className="italic text-gray-300">System Process</span>
                                )}
                            </div>
                        </td>
                        <td className="p-4 text-center">
                        {(log.action === 'UPDATE' || log.action === 'DELETE') && log.old_data ? (
                            <button onClick={() => { setSelectedLog(log); setShowModal(true); }} className="text-blue-600 hover:scale-110 bg-blue-50 p-2 rounded-lg transition shadow-sm">
                                <FaEye />
                            </button>
                        ) : <span className="text-gray-300">•</span>}
                        </td>
                    </tr>
                )})}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan="7" className="p-12 text-center text-gray-400">سجل أمني نظيف ✅</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🆕 MODAL: EXPLAIN AI SCORE (شرح النتيجة) */}
      {showExplainModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
              <h3 className="font-black flex items-center gap-2"><FaMagic className="text-blue-400"/> تحليل محرك الأمان</h3>
              <button onClick={() => setShowExplainModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><FaTimes/></button>
            </div>
            <div className="p-8 space-y-4 text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">العوامل المؤثرة في النتيجة:</p>
              {aiSummary.factors.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-sm font-black text-gray-700">{f.label}</span>
                  </div>
                  <span className="text-sm font-black text-red-600">+{f.weight}</span>
                </div>
              ))}
              <div className="pt-6 border-t mt-4 text-center">
                <p className="text-[10px] text-gray-400 font-bold mb-6 italic">هذا التحليل يتم لحظياً بناءً على العمليات المسجلة في آخر 24 ساعة فقط.</p>
                <button onClick={() => setShowExplainModal(false)} className="w-full bg-black text-white p-4 rounded-2xl font-black shadow-lg">فهمت ذلك</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED MODAL (التعديلات) */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-200">
            <div className={`text-white p-5 flex justify-between items-center ${selectedLog.riskLevel === 'CRITICAL' ? 'bg-red-900' : 'bg-gray-900'}`}>
              <div>
                  <h3 className="font-bold text-lg flex items-center gap-2"><FaHistory className="text-yellow-400"/> تحليل الحدث</h3>
                  <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-black/30 px-2 py-0.5 rounded font-mono border border-white/20">Level: {selectedLog.riskLevel}</span>
                      <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded font-bold">السبب: {selectedLog.riskReason}</span>
                  </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white transition bg-white/10 p-2 rounded-full"><FaTimes size={16}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto bg-gray-50">
              <div className="space-y-3">
                {getChanges(selectedLog.old_data, selectedLog.new_data).map((change, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2 text-right">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-wider">{change.label}</span>
                        <div className="flex items-center justify-between font-mono text-sm font-bold dir-ltr mt-1">
                            <span className="text-red-500 line-through opacity-70">{String(change.oldVal ?? 'Empty')}</span>
                            <span className="text-gray-300">➜</span>
                            <span className="text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">{String(change.newVal ?? 'Empty')}</span>
                        </div>
                    </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t bg-white text-center">
              <button onClick={() => setShowModal(false)} className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition w-full shadow-lg">إغلاق</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

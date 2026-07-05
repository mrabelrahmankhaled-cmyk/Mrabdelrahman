// 🧠 محرك التحليل الأمني المستقل (The Security Brain)
export const getAISummary = (logs) => {
  if (!logs || logs.length === 0) {
    return { 
      score: 0, 
      text: "النظام مستقر تماماً ولا توجد أنشطة مسجلة حالياً.", 
      mood: 'safe', 
      confidence: 100, 
      factors: [] 
    };
  }

  let score = 0;
  let factors = [];
  const criticalLogs = logs.filter(l => l.riskLevel === 'CRITICAL');
  const suspiciousLogs = logs.filter(l => l.riskLevel === 'SUSPICIOUS');
  
  // 1. حساب الـ Score بناءً على كثافة الأخطار
  if (criticalLogs.length > 0) {
    const p = Math.min(criticalLogs.length * 15, 45);
    score += p;
    factors.push({ label: 'عمليات شديدة الخطورة', weight: p, icon: '💀' });
  }
  
  if (suspiciousLogs.length > 0) {
    const p = Math.min(suspiciousLogs.length * 5, 20);
    score += p;
    factors.push({ label: 'أنشطة مشبوهة مرصودة', weight: p, icon: '⚠️' });
  }
  
  // 2. تحليل توقيت العمليات (Temporal Awareness)
  const nightLogs = logs.filter(l => {
    const hour = new Date(l.created_at).getHours();
    return hour >= 1 && hour <= 5; // وقت الفجر
  });
  if (nightLogs.length > 0) {
    score += 20;
    factors.push({ label: 'نشاط خارج ساعات العمل الرسمية', weight: 20, icon: '🌙' });
  }

  // 3. تحليل كثافة الحذف (Mass Deletion)
  const deleteOps = logs.filter(l => l.action === 'DELETE').length;
  if (deleteOps > 5) {
    score += 25;
    factors.push({ label: 'كثافة حذف غير روتينية', weight: 25, icon: '🗑️' });
  }

  const finalScore = Math.min(score, 100);
  const confidence = logs.length < 10 ? 65 : 94;

  let narrative = "";
  if (finalScore > 70) {
    narrative = `🚨 تنبيه أمني عالي: تم رصد نمط سلوكي خطر (Risk Score: ${finalScore}). هناك تركيز عالي على ${criticalLogs[0]?.riskReason || 'سجلات النظام'} وعمليات حذف متكررة.`;
  } else if (finalScore > 30) {
    narrative = `⚠️ ملاحظة أمنية: السلوك العام مستقر، لكن تم رصد بعض الأنشطة المشبوهة في جداول النظام. يفضل المتابعة الدورية.`;
  } else {
    narrative = "✅ حالة النظام: ممتازة. جميع الأنشطة المرصودة تقع ضمن النطاق الروتيني الآمن للمركز.";
  }

  return { 
    score: finalScore, 
    text: narrative, 
    mood: finalScore > 70 ? 'danger' : finalScore > 30 ? 'warning' : 'success', 
    confidence, 
    factors 
  };
};
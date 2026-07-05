// 🧠 محرك التحليل الأمني المستقل
export function analyzeSecurityMetrics(logs) {
  if (!logs || logs.length === 0) {
    return { score: 0, text: "النظام مستقر", mood: 'safe', confidence: 100, factors: [] };
  }

  let score = 0;
  let factors = [];
  
  // 1. تحليل العمليات الحرجة (Critical Density)
  const criticalCount = logs.filter(l => l.riskLevel === 'CRITICAL').length;
  if (criticalCount > 0) {
    const points = Math.min(criticalCount * 15, 45);
    score += points;
    factors.push({ label: 'عمليات شديدة الخطورة', weight: points, icon: '💀' });
  }

  // 2. تحليل الأنماط الزمنية (Temporal Awareness)
  const nightLogs = logs.filter(l => {
    const hour = new Date(l.created_at).getHours();
    return hour >= 1 && hour <= 5;
  });
  if (nightLogs.length > 0) {
    score += 25;
    factors.push({ label: 'نشاط خارج ساعات العمل', weight: 25, icon: '🌙' });
  }

  // 3. تحليل كثافة الحذف (Mass Deletion)
  const deleteOps = logs.filter(l => l.action === 'DELETE').length;
  if (deleteOps > 5) {
    score += 30;
    factors.push({ label: 'حذف بيانات متكرر', weight: 30, icon: '🗑️' });
  }

  const finalScore = Math.min(score, 100);
  
  return {
    score: finalScore,
    mood: finalScore > 70 ? 'danger' : finalScore > 30 ? 'warning' : 'success',
    confidence: logs.length < 20 ? 70 : 95,
    factors: factors,
    recommendation: finalScore > 70 ? "LOCK_USER_SESSION" : "CONTINUE_MONITORING"
  };
}
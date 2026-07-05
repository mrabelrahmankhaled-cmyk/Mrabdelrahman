'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase-browser';
import { 
  FaTrophy, FaWhatsapp, FaCheckCircle, FaSpinner, FaChevronLeft, FaSearch, FaFileInvoiceDollar, FaUserCheck, FaLayerGroup
} from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';

export default function PublicGradingPage() {
  const { token } = useParams();
  const [exam, setExam] = useState(null);
  const [centerConfig, setCenterConfig] = useState(null);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchExamData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch Exam using token and join required info
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, courses(name), groups(name), instructors(name)')
        .eq('grading_token', token)
        .single();
      
      if (examError) {
        console.error('Supabase Exam Error:', examError);
        throw new Error(`خطأ في الوصول للبيانات: ${examError.message}`);
      }
      if (!examData) throw new Error('رابط غير صالح أو انتهت صلاحيته');
      setExam(examData);

      // 1b. Fetch Center Settings
      const { data: configData } = await supabase
        .from('center_settings')
        .select('*')
        .eq('center_id', examData.center_id)
        .maybeSingle();
      
      if (configData) setCenterConfig(configData);

      // 2. Fetch Results
      const { data: resultsData } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', examData.id);
      
      // 3. Fetch Students (Filtered by group if applicable)
      let studentsQuery = supabase.from('students').select('id, name, unique_id, group_ids, phone, parent_phone').eq('center_id', examData.center_id);
      const { data: allStudents } = await studentsQuery;

      let filtered = allStudents || [];
      if (examData.group_id) {
        filtered = allStudents.filter(s => {
          const gIds = s.group_ids || {};
          return Object.values(gIds).includes(examData.group_id);
        });
      }

      const initialResults = filtered.map(s => {
        const existing = (resultsData || []).find(r => r.student_id === s.id);
        return {
          student_id: s.id,
          student_name: s.name,
          student_code: s.unique_id || s.id.slice(0, 6),
          student_phone: s.phone || '',
          parent_phone: s.parent_phone || '',
          score: existing?.score || 0,
          status: existing?.status || 'present',
          comment: existing?.teacher_comment || ''
        };
      });

      setStudents(filtered);
      setResults(initialResults);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchExamData();
  }, [fetchExamData]);

  const filteredResults = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return results.filter(r => 
      r.student_name.toLowerCase().includes(term) || 
      r.student_code.toLowerCase().includes(term) ||
      r.student_phone.includes(term) ||
      r.parent_phone.includes(term)
    );
  }, [results, searchTerm]);

  const updateStudentResult = (studentId, fields) => {
    setResults(prev => prev.map(r => r.student_id === studentId ? { ...r, ...fields } : r));
  };

  const handleScoreChange = (studentId, value) => {
    const score = Math.min(exam.max_score, Math.max(0, parseFloat(value) || 0));
    updateStudentResult(studentId, { score });
  };

  const handleStatusChange = (studentId, status) => {
    const fields = { status };
    if (status === 'absent') fields.score = 0;
    updateStudentResult(studentId, fields);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = results.map(r => ({
        exam_id: exam.id,
        student_id: r.student_id,
        score: parseFloat(r.score),
        status: r.status,
        teacher_comment: r.comment
      }));

      const { error } = await supabase.from('exam_results').upsert(payload, { onConflict: 'exam_id, student_id' });
      if (error) throw error;
      toast.success('تم حفظ الدرجات بنجاح ✅');
    } catch (err) {
      console.error(err);
      toast.error('فشل حفظ الدرجات');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
       <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
          <p className="font-black text-gray-500">جاري تحميل استمارة الرصد...</p>
       </div>
    </div>
  );

  if (!exam) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
       <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-md border-4 border-red-50">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">⚠️</div>
          <h1 className="text-2xl font-black text-gray-800 mb-4 uppercase tracking-tighter">رابط غير صالح</h1>
          <p className="text-gray-500 font-bold mb-8">عذراً، هذا الرابط غير موجود أو تم إلغاؤه من قبل الإدارة.</p>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFF] p-4 md:p-8 lg:p-12" dir="rtl">
      <Toaster position="top-center" />
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Center Branding & Welcome */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
           <div className="flex items-center gap-4">
              {centerConfig?.logo_url ? (
                <img src={centerConfig.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-2xl bg-white p-2 shadow-sm border border-gray-100" />
              ) : (
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-gray-100 font-black text-2xl">
                   {centerConfig?.center_name?.charAt(0) || 'S'}
                </div>
              )}
              <div>
                 <h1 className="text-xl font-black text-gray-800">{centerConfig?.center_name || 'السنتر التعليمي'}</h1>
                 <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">منصة رصد الدرجات الإلكترونية</p>
              </div>
           </div>

           <div className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center gap-4 animate-bounce-slow">
              <span className="text-lg md:text-xl font-black">أهلاً بك يا مستر/ {exam.instructors?.name || 'المحترم'} 👋</span>
           </div>
        </div>

        {/* Header Content */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full pointer-events-none" />
          
          <div className="flex items-center gap-6 relative z-10 text-right">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner">
               <FaFileInvoiceDollar size={30} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">استمارة رصد درجات</h2>
              <p className="text-indigo-600 font-bold mt-1 text-base">{exam.title}</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 relative z-10">
            <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl text-xs font-black border border-indigo-100 flex items-center gap-2">
                <FaUserCheck size={14}/> {exam.courses?.name || 'مادة عامة'}
            </div>
            <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-2xl text-xs font-black border border-purple-100 flex items-center gap-2">
                <FaLayerGroup size={14}/> {exam.groups?.name || 'كل المجموعات'}
            </div>
            <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-2xl text-xs font-black border border-orange-100">
                الدرجة النهائية: {exam.max_score}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
          <div className="relative w-full max-w-md">
            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              type="text"
              placeholder="ابحث عن طالب بالاسم أو الكود..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-14 pr-12 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl font-bold text-sm outline-none transition-all placeholder:text-gray-300"
            />
          </div>
          <div className="hidden md:block px-6 font-black text-indigo-600 text-sm">
            عدد الطلاب: {results.length}
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100/20 border border-gray-100 overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white uppercase text-[10px] font-black tracking-widest text-center">
                <th className="p-6">الطالب</th>
                <th className="p-6">حالة الحضور</th>
                <th className="p-6">الدرجة المكتسبة</th>
                <th className="p-6">ملاحظات إضافية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {filteredResults.length === 0 ? (
                 <tr><td colSpan="4" className="p-20 text-center font-bold text-gray-400">
                    {searchTerm ? 'لا توجد نتائج لعملية البحث' : 'لا يوجد طلاب مسجلين في هذه المجموعة'}
                 </td></tr>
               ) : (
                 filteredResults.map((r) => (
                  <tr key={r.student_id} className="hover:bg-indigo-50/20 transition-colors group">
                     <td className="p-6">
                        <div className="flex flex-col text-right">
                           <span className="font-black text-gray-800 text-base">{r.student_name}</span>
                           <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ID: {r.student_code}</span>
                        </div>
                     </td>
                     <td className="p-6">
                        <div className="flex gap-2 justify-center">
                           {[
                             {id: 'present', label: 'حضر', bg: '#dcfce7', color: '#166534'},
                             {id: 'absent', label: 'غاب', bg: '#fee2e2', color: '#991b1b'},
                             {id: 'excused', label: 'اعتذار', bg: '#fef9c3', color: '#854d0e'}
                           ].map(s => (
                              <button 
                                key={s.id}
                                onClick={() => handleStatusChange(r.student_id, s.id)}
                                className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all transform active:scale-90 ${r.status === s.id ? 'scale-105 shadow-lg shadow-indigo-100 border-2 border-white' : 'opacity-30 grayscale'}`}
                                style={{ backgroundColor: s.bg, color: s.color }}
                              >
                                 {s.label}
                               </button>
                           ))}
                        </div>
                     </td>
                     <td className="p-6">
                        <div className="relative w-32 mx-auto">
                           <input 
                              type="number" 
                              value={r.score}
                              disabled={r.status !== 'present'}
                              onChange={(e) => handleScoreChange(r.student_id, e.target.value)}
                              className={`w-full h-12 px-4 bg-gray-50 border-2 rounded-2xl outline-none font-black text-base text-center transition-all ${r.score === exam.max_score ? 'border-green-400 text-green-700 bg-green-50' : 'border-transparent focus:border-indigo-600'}`}
                           />
                           {r.score === exam.max_score && r.score > 0 && (
                             <FaTrophy className="absolute -top-3 -right-3 text-yellow-500 text-2xl animate-bounce drop-shadow-sm" />
                           )}
                        </div>
                     </td>
                     <td className="p-6">
                        <input 
                           type="text" 
                           placeholder="مثال: مستوى رائع..."
                           value={r.comment}
                           onChange={(e) => updateStudentResult(r.student_id, { comment: e.target.value })}
                           className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-sm transition-all text-right"
                        />
                     </td>
                  </tr>
                ))
               )}
            </tbody>
          </table>
        </div>

        {/* Footer Save Button */}
        <div className="flex justify-center pt-8 pb-20">
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="w-full md:w-auto bg-indigo-600 text-white px-20 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4 disabled:bg-gray-200"
           >
              {isSaving ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle size={24} /> حفظ وإرسال النتائج للإدارة</>}
           </button>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';
import { useAuth } from '../../../../context/AuthContext';
import { FaTicketAlt, FaLock, FaCheckCircle, FaExclamationTriangle, FaArrowRight, FaVideo, FaLayerGroup, FaGraduationCap } from 'react-icons/fa';

export default function CourseActivationPage() {
  const { id: courseId } = useParams();
  const { user, centerId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'course'; // course, chapter, lesson
  const targetId = searchParams.get('target');

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState(null);
  const [targetProduct, setTargetProduct] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [centerSettings, setCenterSettings] = useState(null);
  const [fawryCode, setFawryCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('voucher'); // voucher, online

  const handlePaymobPayment = async (method) => {
     setLoading(true);
     setErrorMsg('');
     try {
        const res = await fetch('/api/payments/paymob/initiate', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
              amount: getPrice(),
              courseId,
              targetType: type,
              targetId,
              centerId,
              studentId: user.id,
              paymentMethod: method
           })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (method === 'card') {
           // Redirect to Paymob Iframe
           const iframeId = centerSettings?.paymob_iframe_id || '843336'; // Default Fallback
           window.location.href = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${data.paymentToken}`;
        } else {
           // Fawry: Paymob returns the reference number in a separate call or specific flow
           // For simplicity, let's assume the initiate API handles the Fawry registration and returns a code
           // Actually, for Fawry, we need to call the pay API or look at the response from initiate (if modified)
           // Let's adjust the initiate API to return the reference for Fawry if possible.
           setFawryCode(data.fawryCode || 'جاري استخراج الكود...');
           setStatus('awaiting_payment');
           
           // Re-fetch to get actual code if it was pending
           if (data.paymentToken) {
              const payRes = await fetch('https://accept.paymob.com/api/acceptance/payments/pay', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                    source: { identifier: "fawry", integration_type: "fawry" },
                    payment_token: data.paymentToken
                 })
              });
              const payData = await payRes.json();
              setFawryCode(payData.data.bill_reference);
           }
        }
     } catch (err) {
        setErrorMsg(err.message);
        setStatus('error');
     } finally {
        setLoading(false);
     }
  };

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId, centerId, type, targetId]);

  const fetchData = async () => {
    // Fetch Course
    const { data: crs } = await supabase.from('courses').select('*, instructors(name)').eq('id', courseId).single();
    setCourse(crs);

    // Fetch Target Product
    if (type === 'lesson' && targetId) {
      const { data } = await supabase.from('lessons').select('*').eq('id', targetId).single();
      setTargetProduct(data);
    } else if (type === 'chapter' && targetId) {
      const { data } = await supabase.from('lesson_chapters').select('*').eq('id', targetId).single();
      setTargetProduct(data);
    }

    // Fetch Settings
    supabase.from('center_settings').select('*').eq('center_id', centerId).maybeSingle().then(({ data }) => setCenterSettings(data));
  };

  const getPrice = () => {
    if (type === 'lesson') return targetProduct?.price || course?.digital_price || 0;
    if (type === 'chapter') return targetProduct?.price || 0;
    return course?.digital_full_price || 0;
  };

  const getTitle = () => {
    if (type === 'lesson') return targetProduct?.title || 'حصة تعليمية';
    if (type === 'chapter') return targetProduct?.title || 'باب تعليمي';
    return course?.name || 'الكورس الكامل';
  };

  const getIcon = () => {
    if (type === 'lesson') return <FaVideo size={48} />;
    if (type === 'chapter') return <FaLayerGroup size={48} />;
    return <FaGraduationCap size={48} />;
  };

  const handleActivate = async () => {
    if (!code) return;
    setLoading(true);
    setStatus('loading');

    try {
      // 1. التحقق من الكود
      const { data: voucher, error: vError } = await supabase
        .from('recharge_codes')
        .select('*')
        .eq('code', code.trim())
        .eq('course_id', courseId)
        .maybeSingle();
      
      if (vError || !voucher) {
        throw new Error('الكود غير صحيح أو غير مخصص لهذا الكورس');
      }

      if (voucher.is_used) {
        throw new Error('هذا الكود تم استخدامه مسبقاً');
      }

      // 2. التحقق من وجود الطالب في جدول الطلاب للتأكد من الـ Foreign Key
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id, unique_id')
        .eq('id', user.id)
        .single();

      console.log('🔍 Activating for student:', { authId: user.id, dbId: studentRecord?.id, dbUniqueId: studentRecord?.unique_id });

      if (studentError || !studentRecord) {
        console.error('❌ Student record not found in DB:', studentError);
        throw new Error('لم يتم العثور على بياناتك كطالب في الداتابيز، يرجى مراجعة الإدارة.');
      }

      // 3. تفعيل (المادة أو الباب أو الحصة) بناءً على نوع الكود
      if (voucher.target_type === 'chapter') {
        // تفعيل باب كامل
        const { error: chapterError } = await supabase
          .from('student_chapter_access')
          .upsert([{
            student_id: studentRecord.id,
            chapter_id: voucher.chapter_id,
            course_id: courseId,
            center_id: centerId
          }]);

        if (chapterError) throw chapterError;
      } else if (voucher.target_type === 'lesson') {
        // تفعيل حصة منفردة
        const { error: lessonError } = await supabase
          .from('student_lesson_access')
          .upsert([{
            student_id: studentRecord.id,
            lesson_id: voucher.lesson_id,
            course_id: courseId,
            center_id: centerId
          }]);

        if (lessonError) throw lessonError;
      } else {
        // تفعيل المادة بالكامل
        const { error: activateError } = await supabase
          .from('student_online_enrollments')
          .insert([{
            student_id: studentRecord.id,
            course_id: courseId,
            center_id: centerId,
            payment_method: 'voucher'
          }]);

        if (activateError) {
          if (activateError.code === '23505') throw new Error('أنت مشترك بالفعل في هذا الكورس');
          throw activateError;
        }
      }

      // 4. تحديث الكود كـ "مستخدم"
      await supabase
        .from('recharge_codes')
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString(),
          used_by: user.id 
        })
        .eq('id', voucher.id);

      setStatus('success');
      setTimeout(() => {
        router.push(`/student/courses/${courseId}`);
      }, 2000);

    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" dir="rtl">
      
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden text-center p-10 animate-in fade-in zoom-in duration-500">
         
         <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            {status === 'success' ? <FaCheckCircle size={48} className="text-green-500 animate-bounce" /> : getIcon()}
         </div>

         <h1 className="text-2xl font-black text-slate-800 mb-2">تفعيل المحتوى الرقمي</h1>
         <p className="text-slate-500 font-bold mb-8">أنت على وشك تفعيل: <br/><span className="text-blue-600">{getTitle()}</span></p>

         {status === 'success' ? (
           <div className="bg-green-50 text-green-700 p-6 rounded-2xl font-black">
              تم التفعيل بنجاح! جاري تحويلك للمحتوى...
           </div>
         ) : (
           <div className="space-y-6">
              
              {/* 💳 Payment Method Selection */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                 <button 
                  onClick={() => setPaymentMethod('voucher')}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'voucher' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                 >
                    <FaTicketAlt className={paymentMethod === 'voucher' ? 'text-blue-600' : 'text-slate-400'} size={20} />
                    <span className={`text-[10px] font-black ${paymentMethod === 'voucher' ? 'text-blue-600' : 'text-slate-500'}`}>كود تفعيل</span>
                 </button>
                 <button 
                  onClick={() => setPaymentMethod('online')}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'online' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                 >
                    <div className="flex gap-1">
                       <FaTicketAlt className={paymentMethod === 'online' ? 'text-emerald-600' : 'text-slate-400'} size={20} />
                    </div>
                    <span className={`text-[10px] font-black ${paymentMethod === 'online' ? 'text-emerald-600' : 'text-slate-500'}`}>دفع إلكتروني (فوري)</span>
                 </button>
              </div>

              {paymentMethod === 'voucher' ? (
                 <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">أدخل كود الشحن</label>
                    <input 
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="CLS-XXXX-XXXX"
                      className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-center font-black text-xl tracking-widest outline-none focus:border-blue-500 transition-all uppercase mb-6"
                    />
                    <button 
                      onClick={handleActivate}
                      disabled={loading || !code}
                      className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                    >
                      {loading ? 'جاري التحقق...' : 'تفعيل الكود الآن'}
                    </button>
                 </div>
              ) : (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
                     <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">القيمة المطلوب دفعها</p>
                        <div className="text-4xl font-black text-slate-900 text-center">{getPrice()} <span className="text-sm">ج.م</span></div>
                     </div>
                    
                    {/* Payment Options: Card or Fawry */}
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                         onClick={() => handlePaymobPayment('card')}
                         disabled={loading}
                         className="h-16 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition flex flex-col items-center justify-center gap-1"
                       >
                          <span className="text-xs">بطاقة بنكية</span>
                          <span className="text-[8px] opacity-70">Visa / Master / Meeza</span>
                       </button>
                       <button 
                         onClick={() => handlePaymobPayment('fawry')}
                         disabled={loading}
                         className="h-16 bg-orange-500 text-white rounded-2xl font-black shadow-lg hover:bg-orange-600 transition flex flex-col items-center justify-center gap-1"
                       >
                          <span className="text-xs">فوري (أمان)</span>
                          <span className="text-[8px] opacity-70">رقم دفع فوري</span>
                       </button>
                    </div>

                    {status === 'awaiting_payment' && fawryCode && (
                       <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl text-center animate-bounce">
                          <p className="text-[10px] font-black text-amber-600 uppercase mb-2">رقم دفع فوري (صالح لـ 24 ساعة)</p>
                          <div className="text-3xl font-black text-slate-900 tabular-nums">{fawryCode}</div>
                          <p className="text-[10px] font-bold text-slate-500 mt-2">توجه لأقرب فرع فوري وادفع باستخدام هذا الرقم</p>
                       </div>
                    )}
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-2 justify-center text-red-500 font-bold text-sm bg-red-50 p-3 rounded-xl mt-4">
                   <FaExclamationTriangle shrink={0} /> {errorMsg}
                </div>
              )}

              <button 
                onClick={() => router.back()}
                className="text-slate-400 font-bold text-sm flex items-center justify-center gap-2 w-full mt-6"
              >
                <FaArrowRight size={12} /> العودة للكورس
              </button>
           </div>
         )}

      </div>

    </div>
  );
}

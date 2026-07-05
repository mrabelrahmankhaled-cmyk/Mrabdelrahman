'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { 
  FaQuestionCircle, FaClock, FaCheckCircle, FaReply, 
  FaTrash, FaSearch, FaFilter, FaArrowLeft, FaEye, FaTimes, FaUser
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function DiscussionsInbox() {
  const { centerId, user } = useAuth();
  
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, resolved
  
  const [selectedThread, setSelectedThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (centerId) {
      fetchDiscussions();
    }
  }, [centerId]);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      // Fetch only main questions (parent_id is null)
      const { data, error } = await supabaseBrowser
        .from('lesson_discussions')
        .select(`
          *,
          students(name, phone),
          lessons(title)
        `)
        .eq('center_id', centerId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscussions(data || []);
    } catch (err) {
      toast.error('خطأ في تحميل الاستفسارات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadReplies = async (parentId) => {
    const { data } = await supabaseBrowser
      .from('lesson_discussions')
      .select(`
        *,
        students(name),
        staff_profiles(full_name)
      `)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });
    setReplies(data || []);
  };

  const handleOpenThread = (disco) => {
    setSelectedThread(disco);
    fetchThreadReplies(disco.id);
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !selectedThread || !user) return;
    setIsSending(true);
    try {
      const { error } = await supabaseBrowser.from('lesson_discussions').insert([{
        center_id: centerId,
        lesson_id: selectedThread.lesson_id,
        student_id: selectedThread.student_id,
        staff_id: user.id, // Assuming user.id in context is the staff profile id
        parent_id: selectedThread.id,
        sender_type: 'staff',
        message: newReply,
        is_resolved: true // Replying usually resolves the initial intent
      }]);

      if (error) throw error;

      // Update parent status to resolved if it wasn't
      if (!selectedThread.is_resolved) {
        await supabaseBrowser
          .from('lesson_discussions')
          .update({ is_resolved: true })
          .eq('id', selectedThread.id);
        
        setDiscussions(prev => prev.map(d => d.id === selectedThread.id ? {...d, is_resolved: true} : d));
      }

      setNewReply('');
      fetchThreadReplies(selectedThread.id);
      toast.success('تم إرسال الرد بنجاح');
    } catch (err) {
      toast.error('فشل إرسال الرد');
    } finally {
      setIsSending(false);
    }
  };

  const filteredDiscussions = useMemo(() => {
    return discussions.filter(d => {
      const matchesSearch = 
        d.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.students?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.lessons?.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'resolved' && d.is_resolved) || 
        (filterStatus === 'pending' && !d.is_resolved);

      return matchesSearch && matchesStatus;
    });
  }, [discussions, searchTerm, filterStatus]);

  if (loading && !discussions.length) return (
     <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
     </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] font-cairo text-slate-200 pb-20 overflow-x-hidden" dir="rtl">
      <Toaster position="top-center" />

      {/* 🌌 Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        
        {/* 🏔️ Header */}
        <header className="py-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-400 transition-all">
              <FaArrowLeft size={18} />
            </Link>
            <div>
               <h1 className="text-4xl font-black text-white mb-2">صندوق <span className="text-blue-400">الاستفسارات</span></h1>
               <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">تواصل مباشر مع طلابك - مديول الدعم الذكي</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="bg-emerald-500/10 text-emerald-500 px-6 py-3 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="font-black text-xs">نظام الاستجابة الفورية مفعّل</span>
             </div>
          </div>
        </header>

        {/* 🔍 Filters Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
           <div className="lg:col-span-2 relative">
              <FaSearch className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="بحث في الأسئلة، الطلاب، أو المواد..."
                className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl pr-14 pl-6 font-bold text-sm outline-none focus:border-blue-500/30 transition-all"
              />
           </div>
           <div>
              <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
                 {['all', 'pending', 'resolved'].map(status => (
                   <button
                     key={status}
                     onClick={() => setFilterStatus(status)}
                     className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                        ${filterStatus === status ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}
                     `}
                   >
                     {status === 'all' ? 'الكل' : status === 'pending' ? 'قيد الانتظار' : 'تم الرد'}
                   </button>
                 ))}
              </div>
           </div>
           <button onClick={fetchDiscussions} className="h-16 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-center gap-3 font-black text-xs transition-all active:scale-95">
              <FaClock className="text-blue-400" /> تحديث القائمة
           </button>
        </div>

        {/* 📋 Inquiries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredDiscussions.map((disco) => (
             <motion.div 
               layoutId={disco.id}
               key={disco.id}
               onClick={() => handleOpenThread(disco)}
               className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.04] transition-all cursor-pointer group relative overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-all"></div>
                
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 font-black text-xs border border-blue-500/10">
                        {disco.students?.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                         <h3 className="font-black text-white text-sm truncate max-w-[120px]">{disco.students?.name}</h3>
                         <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{new Date(disco.created_at).toLocaleDateString('ar-EG')}</p>
                      </div>
                   </div>
                   {disco.is_resolved ? (
                     <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-lg border border-emerald-500/20"><FaCheckCircle size={14} /></div>
                   ) : (
                     <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg border border-amber-500/20 animate-pulse"><FaQuestionCircle size={14} /></div>
                   )}
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-tighter bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10 w-fit">
                      <FaClock size={10} /> {Math.floor(disco.video_timestamp / 60)}:{(Math.floor(disco.video_timestamp) % 60).toString().padStart(2, '0')} من {disco.lessons?.title}
                   </div>
                   <p className="text-slate-300 text-sm leading-relaxed font-bold line-clamp-3">{disco.message}</p>
                </div>

                <div className="mt-8 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                      <FaReply className="text-blue-500/50" /> اضغط للرد والمساعدة
                   </div>
                   <FaEye className="text-slate-700 group-hover:text-blue-500 transition-all" />
                </div>
             </motion.div>
           ))}

           {filteredDiscussions.length === 0 && (
             <div className="col-span-full py-32 text-center space-y-6 opacity-20">
                <FaSearch size={80} className="mx-auto" />
                <h3 className="text-2xl font-black italic">لا يوجد استفسارات مطابقة</h3>
             </div>
           )}
        </div>
      </div>

      {/* 🧵 Thread Side Modal */}
      <AnimatePresence>
         {selectedThread && (
           <>
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setSelectedThread(null)}
               className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100]"
             />
             <motion.div 
               initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
               className="fixed inset-y-0 left-0 w-full md:w-[35rem] bg-[#0d152a] z-[110] shadow-3xl border-r border-white/10 flex flex-col"
             >
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                   <div>
                      <h2 className="font-black text-white text-xl">متابعة الاستفسار 💎</h2>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Resolution Engine Alpha v1</p>
                   </div>
                   <button onClick={() => setSelectedThread(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all">
                      <FaTimes />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
                   {/* Main Question */}
                   <div className="bg-blue-600/5 border border-blue-600/10 p-8 rounded-[2.5rem] relative">
                      <div className="absolute -top-3 right-8 bg-blue-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">سؤال الطالب</div>
                      <div className="flex items-center gap-4 mb-6 pt-2">
                         <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">{selectedThread.students?.name?.charAt(0)}</div>
                         <div>
                            <h4 className="font-black text-white">{selectedThread.students?.name}</h4>
                            <p className="text-[10px] font-black text-blue-400">{selectedThread.lessons?.title} @ {Math.floor(selectedThread.video_timestamp / 60)}:{(Math.floor(selectedThread.video_timestamp) % 60).toString().padStart(2, '0')}</p>
                         </div>
                      </div>
                      <p className="text-slate-200 text-lg leading-relaxed font-bold">{selectedThread.message}</p>
                   </div>

                   {/* Replies Thread */}
                   <div className="space-y-6">
                      {replies.map(reply => (
                        <div key={reply.id} className={`flex ${reply.sender_type === 'staff' ? 'justify-start' : 'justify-end'}`}>
                           <div className={`max-w-[85%] p-6 rounded-[1.8rem] border ${reply.sender_type === 'staff' 
                              ? 'bg-white/[0.03] border-white/5 rounded-tr-none' 
                              : 'bg-blue-600/10 border-blue-600/20 rounded-tl-none text-right'}`}>
                              <p className="text-[9px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
                                 {reply.sender_type === 'staff' ? <FaUser size={8} className="text-blue-500" /> : <FaTimes size={8} />}
                                 {reply.sender_type === 'staff' ? reply.staff_profiles?.full_name : reply.students?.name}
                              </p>
                              <p className="text-slate-300 text-sm font-bold leading-relaxed">{reply.message}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-black/40">
                   <div className="relative">
                      <textarea 
                        value={newReply}
                        onChange={e => setNewReply(e.target.value)}
                        placeholder="اكتب ردك ومساعدتك للطالب هنا..."
                        className="w-full h-32 bg-slate-900/50 border border-white/10 rounded-[2rem] p-6 text-sm font-bold text-white placeholder:text-slate-700 outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                      />
                      <button 
                        disabled={isSending || !newReply.trim()}
                        onClick={handleSendReply}
                        className="absolute bottom-4 left-4 h-12 px-10 bg-blue-600 text-white rounded-xl font-black text-xs shadow-2xl shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95"
                      >
                         {isSending ? 'جاري الإرسال...' : 'إرسال الرد الفوري'} <FaReply />
                      </button>
                   </div>
                   <p className="text-[9px] text-slate-600 font-black uppercase text-center mt-4 tracking-widest">التواصل المباشر يبني ثقة الطالب في المنصة</p>
                </div>
             </motion.div>
           </>
         )}
      </AnimatePresence>

    </div>
  );
}

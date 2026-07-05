'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { 
    FaBell, FaCheckDouble, FaExclamationTriangle, FaInfoCircle, 
    FaInbox, FaArrowLeft 
} from 'react-icons/fa';
import Link from 'next/link';

export default function StudentInbox() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentId, setStudentId] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    
    // مرجع لحفظ دالة إلغاء الاشتراك لمنع الـ Memory Leak
    const unsubscribeRef = useRef(null);
    // مرجع لتتبع العمليات الجارية لمنع التكرار
    const processingIds = useRef(new Set());

useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setStudentId(user.id);
                const data = await fetchNotifications(user.id);
                
                // 🔥 تحديث جماعي إجبارى فقط لغير المقروء حقيقياً
                const unreadNotifs = data?.filter(n => {
                    const isReadInArray = n.seen_by?.includes(user.id);
                    const isReadInViews = n.notification_views?.length > 0;
                    return !(isReadInArray || isReadInViews);
                });
                
                if (unreadNotifs && unreadNotifs.length > 0) {
                    console.log("تصفير العداد إجبارياً...");
                    
                    try {
                        // تحديث كل إشعار على حدة لضمان التنفيذ
                        await Promise.all(unreadNotifs.map(async (n) => {
                            if (processingIds.current.has(n.id)) return;
                            processingIds.current.add(n.id);

                            const { error: rpcError } = await supabase.rpc('mark_notification_as_seen', {
                                p_notif_id: n.id,
                                p_student_id: user.id
                            });

                            if (rpcError) {
                                console.warn("DEBUG [Inbox]: RPC failed, trying fallback for", n.id, rpcError);
                                const { error: insErr } = await supabase.from('notification_views').upsert({
                                    notification_id: n.id,
                                    student_id: user.id,
                                    center_id: n.center_id || '00000000-0000-0000-0000-000000000001'
                                }, { onConflict: 'notification_id,student_id' });
                                if (insErr) console.error("DEBUG [Inbox]: Fallback failed:", insErr);
                            }
                        }));

                        // تحديث الـ State محلياً فوراً وبدقة
                        setNotifications(prev => prev.map(n => {
                            const isUnread = !n.seen_by?.includes(user.id);
                            if (isUnread) {
                                return {
                                    ...n,
                                    seen_by: [...(n.seen_by || []), user.id]
                                };
                            }
                            return n;
                        }));
                    } catch (err) {
                        console.error("خطأ في تحديث حالة القراءة:", err);
                    }
                }

                unsubscribeRef.current = subscribeToNewNotifications(user.id);
            }
        };
        init();
        return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
    }, []);

    const fetchNotifications = async (userId) => {
        const { data } = await supabase
            .from('notifications')
            .select('*, notification_views(*)')
            .eq('student_id', userId)
            .order('created_at', { ascending: false });
        
        setNotifications(data || []);
        setLoading(false);
        return data; // إرجاع البيانات لاستخدامها في دالة init
    };

    const subscribeToNewNotifications = (userId) => {
        const channel = supabase
            .channel(`inbox-${userId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications',
                filter: `student_id=eq.${userId}` 
            }, (payload) => {
                const newNotif = {
                    ...payload.new,
                    seen_by: payload.new.seen_by || []
                };
                setNotifications(prev => [newNotif, ...prev]);
                if (typeof window !== 'undefined') {
                    new Audio('/notification-sound.mp3').play().catch(() => {});
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const handleMarkAsSeen = async (notifId) => {
        if (!studentId || processingIds.current.has(notifId)) return;
        
        // التأكد إننا مكررناش العملية لو هي أصلاً مقروءة
        const notif = notifications.find(n => n.id === notifId);
        if (notif?.seen_by?.includes(studentId) || notif?.notification_views?.length > 0) return;

        processingIds.current.add(notifId);

        // استدعاء الدالة الأساسية
        const { error: rpcError } = await supabase.rpc('mark_notification_as_seen', {
            p_notif_id: notifId,
            p_student_id: studentId
        });

        if (rpcError) {
            console.warn("DEBUG [Inbox]: Manual mark failed, trying fallback...", rpcError);
            const { error: insErr } = await supabase.from('notification_views').upsert({
                notification_id: notifId,
                student_id: studentId,
                center_id: notif?.center_id || '00000000-0000-0000-0000-000000000001'
            }, { onConflict: 'notification_id,student_id' });
            if (insErr) console.error("DEBUG [Inbox]: Fallback failed:", insErr);
        }

        // تحديث الحالة محلياً في الـ UI لضمان استجابة فورية
        setNotifications(prev => prev.map(n => 
            n.id === notifId ? { ...n, seen_by: [...(n.seen_by || []), studentId] } : n
        ));
    };

    // 🧠 المكون الفرعي للإشعار مع خاصية الـ Auto-Seen عند الظهور
    const NotificationItem = ({ notif }) => {
        const itemRef = useRef(null);
        const isSeen = notif.seen_by?.includes(studentId) || (notif.notification_views && notif.notification_views.length > 0);

        useEffect(() => {
            if (isSeen) return;

            // استخدام الـ IntersectionObserver لتسجيل القراءة بمجرد الرؤية
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => handleMarkAsSeen(notif.id), 1000); // سجل بعد ثانية رؤية
                        observer.unobserve(entry.target);
                    }
                },
                { threshold: 0.5 } // يجب أن يظهر نصف الإشعار على الأقل
            );

            if (itemRef.current) observer.observe(itemRef.current);
            return () => observer.disconnect();
        }, [isSeen, notif.id]);

        return (
            <div 
                ref={itemRef}
                className={`bg-white p-5 rounded-[2rem] border-2 transition-all relative group ${isSeen ? 'border-transparent opacity-70' : 'border-blue-100 shadow-lg ring-4 ring-blue-50/50 scale-[1.02]'}`}
            >
                {!isSeen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-4 border-white animate-bounce"></span>}
                
                <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {notif.type === 'warning' ? <FaExclamationTriangle size={18} /> : <FaInfoCircle size={18} />}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-black text-gray-800 text-sm leading-tight">{notif.title}</h3>
                            <span className="text-[9px] text-gray-300 font-mono">
                                {new Date(notif.created_at).toLocaleDateString('ar-EG')}
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-bold leading-relaxed">{notif.message}</p>
                        
                        <div className="mt-4 flex justify-between items-center border-t pt-3">
                            <span className="text-[8px] text-gray-300 font-black uppercase tracking-widest">
                                {notif.type === 'warning' ? 'تنبيه إداري' : 'معلومات عامة'}
                            </span>
                            {isSeen && <FaCheckDouble className="text-blue-500" size={12} />}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const filteredNotifs = useMemo(() => {
        return notifications.filter(n => {
            const isRead = n.seen_by?.includes(studentId) || (n.notification_views && n.notification_views.length > 0);
            if (activeFilter === 'unread') return !isRead;
            if (activeFilter === 'important') return n.type === 'warning';
            return true;
        });
    }, [notifications, activeFilter, studentId]);

    if (loading) return <div className="p-10 text-center font-black animate-pulse text-blue-600">جاري تحميل صندوق الوارد...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
            <div className="bg-white border-b sticky top-0 z-10 px-4 py-4 shadow-sm">
                <div className="max-w-2xl mx-auto flex justify-between items-center">
                    {/* ✅ تصحيح المسار إلى students لمنع خطأ 404 */}
                    <Link href="/portal/dashboard" className="text-gray-400 hover:text-blue-600 transition-colors">
                        <FaArrowLeft />
                    </Link>
                    <h1 className="text-lg font-black text-gray-800 flex items-center gap-2">
                        <FaInbox className="text-blue-600" /> صندوق الوارد
                        {notifications.filter(n => !(n.seen_by?.includes(studentId) || (n.notification_views && n.notification_views.length > 0))).length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                                {notifications.filter(n => !(n.seen_by?.includes(studentId) || (n.notification_views && n.notification_views.length > 0))).length}
                            </span>
                        )}
                    </h1>
                    <div className="w-5"></div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[
                        { id: 'all', label: 'الكل', icon: <FaInbox /> },
                        { id: 'unread', label: 'غير مقروء', icon: <FaBell /> },
                        { id: 'important', label: 'هام جداً', icon: <FaExclamationTriangle /> }
                    ].map(f => (
                        <button 
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all shrink-0 ${activeFilter === f.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
                        >
                            {f.icon} {f.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {filteredNotifs.length === 0 ? (
                        <div className="text-center py-20 opacity-40">
                            <FaInbox size={50} className="mx-auto mb-4" />
                            <p className="font-black text-sm">لا توجد رسائل حالياً</p>
                        </div>
                    ) : (
                        filteredNotifs.map((notif) => <NotificationItem key={notif.id} notif={notif} />)
                    )}
                </div>
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

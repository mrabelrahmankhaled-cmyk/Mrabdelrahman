'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import {
    FaPaperPlane, FaSearch, FaCheckDouble,
    FaSpinner, FaInbox, FaArrowLeft,
    FaTrash, FaPhone, FaBook, FaInfoCircle, FaBolt, FaLayerGroup, FaBell
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function SupportChatPage() {
    const { centerId, user } = useAuth();

    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showInfoSidebar, setShowInfoSidebar] = useState(true);
    const [showMobileChat, setShowMobileChat] = useState(false);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const currentChannelRef = useRef(null);
    const lastTypingSignalRef = useRef(0);

    const [isParentTyping, setIsParentTyping] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const quickReplies = [
        'أهلاً بك، كيف يمكنني مساعدتك؟',
        'تم حل المشكلة، هل لديك استفسار آخر؟',
        'جاري التحقق من الأمر، برجاء الانتظار قليلاً.',
        'سيتم التواصل معك هاتفياً لمزيد من التفاصيل.',
        'تم تحديث البيانات بنجاح.',
    ];

    useEffect(() => {
        if (centerId) {
            fetchInitialData();
            setupRealtimeSubscriptions();
        }
    }, [centerId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try { await fetchTickets(); }
        catch { toast.error('خطأ في تحميل المحادثات'); }
        finally { setLoading(false); }
    };

    const fetchTickets = async () => {
        if (!centerId) return;
        const { data } = await supabaseBrowser
            .from('support_tickets')
            .select('*, students (id, name, grade, phone, group_ids)')
            .eq('center_id', centerId)
            .order('last_message_at', { ascending: false });
        setTickets(data || []);
    };

    const setupRealtimeSubscriptions = () => {
        const ch = supabaseBrowser
            .channel('public:support_tickets_admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `center_id=eq.${centerId}` }, fetchTickets)
            .subscribe();
        return () => supabaseBrowser.removeChannel(ch);
    };

    useEffect(() => {
        if (!selectedTicket) return;
        const run = async () => {
            const { data } = await supabaseBrowser
                .from('chat_messages')
                .select('*')
                .eq('ticket_id', selectedTicket.id)
                .order('created_at', { ascending: true });
            setMessages(data || []);
            scrollToBottom();
            markTicketAsRead(selectedTicket.id);

            if (currentChannelRef.current) supabaseBrowser.removeChannel(currentChannelRef.current);
            const ch = supabaseBrowser.channel(`ticket_room:${selectedTicket.id}`);
            currentChannelRef.current = ch;
            ch
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `ticket_id=eq.${selectedTicket.id}` }, (payload) => {
                    const m = payload.new;
                    setMessages(prev => prev.some(x => x.id === m.id || (m.client_side_id && x.client_side_id === m.client_side_id)) ? prev : [...prev, m]);
                    scrollToBottom();
                    if (m.sender_type !== 'staff') { new Audio('/notification.mp3').play().catch(() => {}); markTicketAsRead(selectedTicket.id); }
                })
                .on('broadcast', { event: 'typing' }, (payload) => {
                    if (payload.payload.typing) {
                        setIsParentTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsParentTyping(false), 3000);
                    }
                })
                .subscribe();
        };
        run();
        return () => { if (currentChannelRef.current) { supabaseBrowser.removeChannel(currentChannelRef.current); currentChannelRef.current = null; } };
    }, [selectedTicket?.id]);

    const markTicketAsRead = async (id) => {
        await supabaseBrowser.from('chat_messages').update({ is_read: true }).eq('ticket_id', id).eq('sender_type', 'student').eq('is_read', false);
    };

    const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    const sendTypingSignal = () => {
        if (!selectedTicket || !currentChannelRef.current) return;
        const now = Date.now();
        if (now - lastTypingSignalRef.current < 2000) return;
        lastTypingSignalRef.current = now;
        currentChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { typing: true } });
    };

    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !user || !selectedTicket || isSending) return;
        const msgText = newMessage;
        setNewMessage('');
        setIsSending(true);
        const tempId = crypto.randomUUID();
        setMessages(prev => [...prev, { id: tempId, client_side_id: tempId, ticket_id: selectedTicket.id, sender_id: user.id, sender_type: 'staff', message_text: msgText, is_read: false, center_id: centerId, created_at: new Date().toISOString() }]);
        scrollToBottom();
        try {
            const { error } = await supabaseBrowser.from('chat_messages').insert({ ticket_id: selectedTicket.id, sender_id: user.id, sender_type: 'staff', message_text: msgText, is_read: false, center_id: centerId, client_side_id: tempId });
            if (error) throw error;
        } catch { toast.error('فشل إرسال الرسالة'); setMessages(prev => prev.filter(m => m.client_side_id !== tempId)); }
        finally { setIsSending(false); }
    };

    const closeTicket = async () => {
        if (!selectedTicket || !window.confirm('هل أنت متأكد من إغلاق وحذف هذه المحادثة؟')) return;
        try {
            await supabaseBrowser.from('chat_messages').delete().eq('ticket_id', selectedTicket.id);
            const { error } = await supabaseBrowser.from('support_tickets').delete().eq('id', selectedTicket.id);
            if (error) throw error;
            setTickets(prev => prev.filter(t => t.id !== selectedTicket.id));
            setSelectedTicket(null);
            setShowMobileChat(false);
            toast.success('تم إغلاق المحادثة بنجاح');
        } catch { toast.error('خطأ أثناء الإغلاق'); }
    };

    const filteredTickets = useMemo(() => tickets.filter(t => {
        const matchSearch = t.students?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchTab = activeTab === 'all' || (activeTab === 'unread' && t.unread_count > 0) || (activeTab === 'open' && t.status === 'open');
        return matchSearch && matchTab;
    }), [tickets, searchTerm, activeTab]);

    const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

    if (!centerId) return (
        <div className="h-48 flex items-center justify-center" style={{ fontFamily: 'Cairo, sans-serif' }}>
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 text-sm font-bold">جاري التحميل...</p>
            </div>
        </div>
    );

    return (
        <>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
                .sp-font { font-family: 'Cairo', sans-serif; }
                .sp-no-scroll::-webkit-scrollbar { display: none; }
                .sp-no-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                .sp-scroll::-webkit-scrollbar { width: 4px; }
                .sp-scroll::-webkit-scrollbar-track { background: transparent; }
                .sp-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .sp-scroll-dark::-webkit-scrollbar { width: 3px; }
                .sp-scroll-dark::-webkit-scrollbar-track { background: transparent; }
                .sp-scroll-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
            `}</style>

            <Toaster position="top-center" />

            <div
                className="sp-font flex overflow-hidden"
                dir="rtl"
                style={{ height: 'calc(100vh - 72px)', margin: '-1rem -2rem -2rem', marginTop: '-1rem' }}
            >
                {/* ══════════════════════════════════════════
                    TICKET LIST SIDEBAR (dark theme)
                ══════════════════════════════════════════ */}
                <div
                    className={`flex-shrink-0 flex flex-col w-full md:w-[320px] lg:w-[360px] transition-all duration-300 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}
                    style={{ background: 'linear-gradient(170deg, #0f172a 0%, #1e293b 100%)' }}
                >
                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 flex-shrink-0">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
                                    <FaInbox size={15} className="text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-white font-black text-[15px] leading-none">الدعم الفني</h2>
                                    <p className="text-white/30 text-[9px] font-bold mt-0.5 uppercase tracking-widest">Support Center</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                                {tickets.length} تذكرة
                            </span>
                        </div>

                        {/* Search */}
                        <div className="relative mb-3">
                            <FaSearch className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 text-[11px]" />
                            <input
                                type="text"
                                placeholder="ابحث عن طالب..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-[38px] rounded-xl pr-9 pl-4 text-xs font-bold outline-none text-white"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            {[{ id: 'all', label: 'الكل' }, { id: 'unread', label: 'غير مقروء' }, { id: 'open', label: 'نشط' }].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className="flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all"
                                    style={{
                                        background: activeTab === tab.id ? '#2563eb' : 'transparent',
                                        color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.35)',
                                        boxShadow: activeTab === tab.id ? '0 4px 12px rgba(37,99,235,0.4)' : 'none'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ticket List */}
                    <div className="flex-1 overflow-y-auto sp-scroll-dark">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <FaSpinner className="animate-spin text-white/20 text-xl" />
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
                                <FaInbox size={28} />
                                <p className="text-xs font-black">لا توجد محادثات</p>
                            </div>
                        ) : filteredTickets.map((ticket, i) => {
                            const isSelected = selectedTicket?.id === ticket.id;
                            const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                            return (
                                <motion.div
                                    key={ticket.id}
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.025 }}
                                    onClick={() => { setSelectedTicket(ticket); setShowMobileChat(true); }}
                                    className="relative cursor-pointer px-5 py-3.5 flex items-center gap-3 transition-all duration-150"
                                    style={{
                                        background: isSelected ? 'rgba(37,99,235,0.18)' : 'transparent',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                                    }}
                                >
                                    {isSelected && <div className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full bg-blue-500"></div>}

                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black"
                                             style={{ background: isSelected ? '#2563eb' : color + '22', color: isSelected ? 'white' : color }}>
                                            {ticket.students?.name?.[0] || '?'}
                                        </div>
                                        {ticket.status === 'open' && (
                                            <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2" style={{ borderColor: '#1e293b' }}></div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className={`text-sm font-black truncate ${isSelected ? 'text-white' : 'text-white/75'}`}>
                                                {ticket.students?.name}
                                            </span>
                                            <span className="text-[9px] text-white/25 font-bold flex-shrink-0 mr-1">
                                                {new Date(ticket.last_message_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-[11px] text-white/35 font-bold truncate">{ticket.subject || 'محادثة دعم...'}</p>
                                            {ticket.unread_count > 0 && (
                                                <span className="flex-shrink-0 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: '#ef4444' }}>
                                                    {ticket.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        {ticket.students?.grade && (
                                            <span className="text-[9px] font-black mt-0.5 inline-block px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>
                                                {ticket.students.grade}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    CHAT AREA
                ══════════════════════════════════════════ */}
                <div
                    className={`flex-1 flex flex-col min-w-0 ${showMobileChat ? 'flex' : 'hidden md:flex'}`}
                    style={{ background: '#f0f4f8' }}
                >
                    {selectedTicket ? (
                        <>
                            {/* Chat Header */}
                            <div className="bg-white border-b border-slate-200/70 px-4 md:px-5 h-16 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        onClick={() => setShowMobileChat(false)}
                                        className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: '#f1f5f9', color: '#64748b' }}
                                    >
                                        <FaArrowLeft size={13} />
                                    </button>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                                         style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}>
                                        {selectedTicket.students?.name?.[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-slate-800 text-sm leading-none mb-1 truncate">{selectedTicket.students?.name}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <span className="text-[10px] font-bold text-slate-400">متاح للمراسلة</span>
                                            {selectedTicket.students?.grade && (
                                                <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md border border-blue-100">{selectedTicket.students.grade}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => setShowInfoSidebar(!showInfoSidebar)}
                                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                        style={{
                                            background: showInfoSidebar ? '#2563eb' : '#f1f5f9',
                                            color: showInfoSidebar ? 'white' : '#94a3b8',
                                            boxShadow: showInfoSidebar ? '0 4px 12px rgba(37,99,235,0.3)' : 'none'
                                        }}
                                    >
                                        <FaInfoCircle size={13} />
                                    </button>
                                    <button
                                        onClick={closeTicket}
                                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all active:scale-95"
                                        style={{ background: '#fff1f2', color: '#f43f5e', border: '1px solid #fecdd3' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f43f5e'; e.currentTarget.style.color = 'white'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#f43f5e'; }}
                                    >
                                        <FaTrash size={10} /> إنهاء
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex overflow-hidden min-h-0">

                                {/* Info Panel — LEFT in RTL */}
                                <AnimatePresence>
                                    {showInfoSidebar && (
                                        <motion.div
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: 260, opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{ duration: 0.18, ease: 'easeOut' }}
                                            className="hidden lg:flex flex-col bg-white border-r border-slate-200/50 flex-shrink-0 overflow-hidden"
                                        >
                                            <div className="p-5 text-center" style={{ background: 'linear-gradient(135deg, #f8faff 0%, #eff2ff 100%)' }}>
                                                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 text-white text-2xl font-black flex items-center justify-center shadow-lg"
                                                     style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}>
                                                    {selectedTicket.students?.name?.[0]}
                                                </div>
                                                <h4 className="font-black text-slate-800 text-sm mb-1">{selectedTicket.students?.name}</h4>
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg inline-block">
                                                    {selectedTicket.students?.grade || 'طالب'}
                                                </span>
                                            </div>

                                            <div className="p-4 space-y-3 overflow-y-auto flex-1 sp-scroll">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">التواصل</p>
                                                    <div className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ background: '#f8fafc', borderColor: '#f1f5f9' }}>
                                                        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-500 flex-shrink-0">
                                                            <FaPhone size={11} />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-700 truncate">{selectedTicket.students?.phone || 'غير مسجل'}</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">المجموعات</p>
                                                    <div className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ background: '#f8fafc', borderColor: '#f1f5f9' }}>
                                                        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-amber-500 flex-shrink-0">
                                                            <FaBook size={11} />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-700">{selectedTicket.students?.group_ids?.length || 0} مجموعات</span>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl p-4 text-white relative overflow-hidden"
                                                     style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' }}>
                                                    <div className="absolute -bottom-3 -left-3 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1.5">💡 نصيحة</p>
                                                    <p className="text-[11px] font-bold leading-relaxed opacity-90">الرد في أقل من 5 دقائق يزيد من ثقة ولي الأمر بنسبة 80%</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Messages + Input */}
                                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                                    {/* Messages */}
                                    <div
                                        className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-2.5 sp-scroll"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='1.5' fill='%232563eb' fill-opacity='0.025'/%3E%3C/svg%3E")` }}
                                    >
                                        <AnimatePresence mode="popLayout">
                                            {messages.map((msg, idx) => {
                                                const isStaff = msg.sender_type === 'staff';
                                                return (
                                                    <motion.div
                                                        key={msg.id || idx}
                                                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        transition={{ duration: 0.18 }}
                                                        className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}
                                                    >
                                                        <div className={`flex flex-col gap-1 max-w-[75%] md:max-w-[62%] ${isStaff ? 'items-start' : 'items-end'}`}>
                                                            <div
                                                                className="px-4 py-2.5 text-sm font-bold leading-relaxed"
                                                                style={isStaff ? {
                                                                    background: 'white',
                                                                    color: '#1e293b',
                                                                    borderRadius: '18px 4px 18px 18px',
                                                                    border: '1px solid #e2e8f0',
                                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                                                } : {
                                                                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                                                                    color: 'white',
                                                                    borderRadius: '4px 18px 18px 18px',
                                                                    boxShadow: '0 4px 16px rgba(37,99,235,0.25)'
                                                                }}
                                                            >
                                                                {msg.message_text}
                                                            </div>
                                                            <div className={`flex items-center gap-1.5 px-1 ${isStaff ? '' : 'flex-row-reverse'}`}>
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {isStaff && <FaCheckDouble className={`text-[10px] ${msg.is_read ? 'text-blue-500' : 'text-slate-300'}`} />}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>

                                        <AnimatePresence>
                                            {isParentTyping && (
                                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex justify-end">
                                                    <div className="bg-white px-4 py-2.5 flex items-center gap-1.5 border border-slate-100 shadow-sm" style={{ borderRadius: '4px 18px 18px 18px' }}>
                                                        {[0, 0.15, 0.3].map((d, i) => (
                                                            <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }}></div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <div className="bg-white border-t border-slate-100 px-4 pt-2.5 pb-3 flex-shrink-0">
                                        {/* Quick Replies */}
                                        <div className="flex gap-1.5 overflow-x-auto pb-2.5 sp-no-scroll">
                                            {quickReplies.map((reply, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setNewMessage(reply)}
                                                    className="whitespace-nowrap text-[10px] font-black px-2.5 py-1.5 rounded-lg border flex-shrink-0 transition-all"
                                                    style={{
                                                        background: newMessage === reply ? '#eff6ff' : '#f8fafc',
                                                        borderColor: newMessage === reply ? '#bfdbfe' : '#f1f5f9',
                                                        color: newMessage === reply ? '#2563eb' : '#94a3b8'
                                                    }}
                                                >
                                                    {reply}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Message Input */}
                                        <form onSubmit={sendMessage} className="flex gap-2.5 items-center">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={e => { setNewMessage(e.target.value); sendTypingSignal(); }}
                                                placeholder="اكتب ردك هنا..."
                                                className="flex-1 h-11 rounded-2xl px-4 text-sm font-bold outline-none transition-all"
                                                style={{ background: '#f1f5f9', border: '2px solid transparent' }}
                                                onFocus={e => { e.target.style.borderColor = '#bfdbfe'; e.target.style.background = 'white'; }}
                                                onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = '#f1f5f9'; }}
                                            />
                                            <motion.button
                                                whileHover={{ scale: 1.06 }}
                                                whileTap={{ scale: 0.92 }}
                                                type="submit"
                                                disabled={!newMessage.trim() || isSending}
                                                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                                                style={{ background: newMessage.trim() ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : '#e2e8f0', boxShadow: newMessage.trim() ? '0 4px 14px rgba(37,99,235,0.35)' : 'none' }}
                                            >
                                                {isSending ? <FaSpinner className="animate-spin" size={14} style={{ color: 'white' }} /> : <FaPaperPlane size={13} style={{ color: newMessage.trim() ? 'white' : '#94a3b8' }} />}
                                            </motion.button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Empty State */
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                            <div className="relative mb-7">
                                <div className="w-28 h-28 rounded-[2.5rem] flex items-center justify-center border border-blue-100 shadow-xl shadow-blue-100/40"
                                     style={{ background: 'linear-gradient(135deg, #eff6ff, #eef2ff)' }}>
                                    <FaInbox size={50} style={{ color: '#bfdbfe' }} />
                                </div>
                                <div className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/60">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">مركز الدعم الفني</h3>
                            <p className="text-slate-400 font-bold text-sm leading-relaxed max-w-[260px] mb-5">
                                اختر محادثة من القائمة لبدء التواصل مع أولياء الأمور
                            </p>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 bg-white">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">البث المباشر مفعّل</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

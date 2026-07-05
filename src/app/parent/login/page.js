'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
    FaPaperPlane, FaUsers, FaUser, FaHistory, 
    FaFileAlt, FaShieldAlt, FaClock, FaFilter, FaEnvelopeOpenText, FaCheckDouble,
    FaChartLine, FaWallet, FaExclamationCircle, FaCheckCircle, FaBell, FaBellSlash,
    FaArrowLeft, FaMapMarkerAlt, FaBookOpen, FaMoneyBillWave , FaUserGraduate,
    FaUserFriends, FaHome, FaSignOutAlt, FaSearch
} from 'react-icons/fa';
import { setupPushNotifications } from '../../../lib/notifications';
import Link from 'next/link';

export default function ParentDashboard() {
    const [studentCode, setStudentCode] = useState('');
    const [accessCode, setAccessCode] = useState(''); // 🎯 PIN code state
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [exams, setExams] = useState([]);
    const [payments, setPayments] = useState([]);
    const [studentSchedule, setStudentSchedule] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [centerInfo, setCenterInfo] = useState({ name: 'السنتر', logo: null, color: '#2563eb'});
    const [fetchingActivities, setFetchingActivities] = useState(false);
    const [showAllActivities, setShowAllActivities] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // all, attendance, exams, payments
    
    // --- متغيرات الشات الجديد ---
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [activeTicket, setActiveTicket] = useState(null); // التذكرة المفتوحة حالياً
    const [chatMessages, setChatMessages] = useState([]); // رسائل الشات الحقيقي
    const [parentMsgBody, setParentMsgBody] = useState(''); // نص الرسالة
    const [sendingMsg, setSendingMsg] = useState(false);
    const [isStaffTyping, setIsStaffTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const currentChannelRef = useRef(null); 
    const lastTypingSignalRef = useRef(0); // 🔥 لمنع إغراق السيرفر بالإشارات
    // ---------------------------

    // ✅ 1. قراءة الحالة من المتصفح
    const [isPushEnabled, setIsPushEnabled] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('offline'); 
    const [liveSessionInfo, setLiveSessionInfo] = useState(null); 
    // 🆕 Initialize activities from localStorage immediately
    const [activities, setActivities] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('activities_temp');
            return stored ? JSON.parse(stored) : [];
        }
        return [];
    });
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        console.log("🔄 Component mounted, activities state initialized");
        // 🆕 Load activities from localStorage first
        if (isAuthorized && studentData) {
            const storedActivities = localStorage.getItem(`activities_${studentData.id}`);
            if (storedActivities) {
                try {
                    const parsedActivities = JSON.parse(storedActivities);
                    console.log("🔄 Loaded activities from localStorage:", parsedActivities.length);
                    setActivities(parsedActivities);
                } catch (e) {
                    console.error("❌ Failed to parse stored activities:", e);
                }
            }
            
            // Then fetch fresh data
            fetchActivities(studentData.id); // Use UUID, not unique_id
        }
    }, [isAuthorized, studentData]);

    // 🆕 Monitor activities state changes
    useEffect(() => {
        console.log("🔄 Activities state changed:", activities.length, "items");
        if (activities.length > 0) {
            localStorage.setItem('activities_temp', JSON.stringify(activities));
        }
    }, [activities]);

    const lastFetchTime = useRef(0);
    const unsubscribeRef = useRef(null);
    const chatEndRef = useRef(null);
    const showMessageModalRef = useRef(showMessageModal); 
    const activeTicketRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };


    useEffect(() => {
        activeTicketRef.current = activeTicket?.id;
    }, [activeTicket?.id]);

    useEffect(() => {
        showMessageModalRef.current = showMessageModal;
    }, [showMessageModal]);

    // 🔥 الجمع بين كل أنواع النشاطات في واجهة واحدة وموحدة
    const unifiedActivities = useMemo(() => {
        if (!isAuthorized || !studentData) return [];
        
        const unified = [
            ...activities.map(a => ({ ...a, unifiedType: 'general' })),
            ...attendance
                .filter(s => s.attendees?.includes(studentData.unique_id))
                .map(s => ({
                    id: `att-${s.created_at}`,
                    type: 'attendance',
                    unifiedType: 'attendance',
                    title: 'تسجيل حضور حصة ✅',
                    description: `تم حضور حصة: ${s.topic} - ${s.courses?.name}`,
                    created_at: s.created_at,
                    note: `المدرس: ${s.courses?.instructors?.name || s.courses?.instructor}`
                })),
            ...exams.map(e => ({
                id: `exam-${e.id}`,
                type: 'exam',
                unifiedType: 'exam',
                title: `نتيجة اختبار: ${e.exams?.title}`,
                description: `تم الحصول على ${e.score} من ${e.exams?.max_score} في مادة ${e.exams?.courses?.name}`,
                created_at: e.created_at,
                note: `نسبة النجاح: ${Math.round((e.score / e.exams?.max_score) * 100)}%`
            })),
            ...payments.map(p => ({
                id: `pay-${p.id}`,
                type: 'payment',
                unifiedType: 'payment',
                title: p.amount > 0 ? 'إيداع/شحن رصيد 💰' : 'خصم من المحفظة 💸',
                description: p.description,
                created_at: p.created_at,
                amount: p.amount,
                note: `الرصيد بعد: ${p.balance_after || 0} ج`
            }))
        ];
        
        return unified.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [activities, attendance, exams, payments, isAuthorized, studentData]);

    const filteredActivities = useMemo(() => {
        return unifiedActivities.filter(a => {
            if (activeTab === 'all') return true;
            if (activeTab === 'attendance') return a.type === 'attendance';
            if (activeTab === 'exam') return a.type === 'exam';
            if (activeTab === 'payment') return a.type === 'payment';
            return false;
        });
    }, [unifiedActivities, activeTab]);

useEffect(() => {
    const fetchCenterSettings = async () => {
        try {
            // التحقق من مركز الطالب أولاً، ثم الـ localStorage كبديل
            const centerId = studentData?.center_id || localStorage.getItem('active_center_id');
            if (!centerId) return;
            
            const { data } = await supabase
                .from('center_settings')
                .select('center_name, logo_url, primary_color')
                .eq('center_id', centerId)
                .limit(1)
                .maybeSingle();

            if (data) {
                setCenterInfo({
                    name: data.center_name,
                    logo: data.logo_url,
                    color: data.primary_color || '#2563eb'
                });
            }
        } catch (err) {
            console.error("Settings fetch error:", err);
        }
    };
    fetchCenterSettings();
}, [studentData?.center_id]);

    useEffect(() => {
        if (showMessageModal) {
            scrollToBottom();
            // ✅ تعليم الرسائل كمقروءة عند فتح الشات
            if (activeTicket && studentData) {
                supabase
                    .from('chat_messages')
                    .update({ is_read: true })
                    .eq('ticket_id', activeTicket.id)
                    .eq('sender_type', 'staff')
                    .eq('is_read', false)
                    .then(() => setUnreadCount(0));
            }
        }
    }, [chatMessages, showMessageModal, activeTicket?.id]);

    // 🔥 1. دالة جلب جلسة الشات الحالية (النظام الجديد)
   // 🔥 استبدل دالة fetchChatSession القديمة (السطر 80 تقريباً) بدي
    const fetchChatSession = async (studentId) => {
        try {
            // التحقق من وجود center_id في localStorage
            const centerId = localStorage.getItem('active_center_id');
            if (!centerId) return;
            
            // 1. ندور على تذكرة مفتوحة
            const { data: tickets } = await supabase
                .from('support_tickets')
                .select('id, status')
                .eq('student_id', studentId)
                .eq('center_id', centerId) // ← فلترة حسب المركز
                .neq('status', 'closed')
                .limit(1);

            let currentTicketId = null;

            if (tickets && tickets.length > 0) {
                setActiveTicket(tickets[0]);
                currentTicketId = tickets[0].id;
            } else {
                setActiveTicket(null);
            }

            // 2. لو فيه تذكرة، نجهز الداتا
            if (currentTicketId) {
                // أ) نجيب الرسايل عشان الشات
                const { data: msgs } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('ticket_id', currentTicketId)
                    .eq('center_id', centerId) // ← فلترة حسب المركز
                    .order('created_at', { ascending: true });
                setChatMessages(msgs || []);

                // ب) 👇👇 ده الجزء اللي ناقص في ملفك 👇👇
                // بنسأل الداتابيز: "عد لي رسايل الإدارة اللي لسه متقرتش"
                const { count } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true }) 
                    .eq('ticket_id', currentTicketId)
                    .eq('sender_type', 'staff') // تأكدنا من الصور إنها staff ✅
                    .eq('is_read', false);      // تأكدنا من الصور إنها FALSE ✅
                
                // تحديث العداد فوراً بالرقم اللي راجع من الداتابيز
                setUnreadCount(count || 0); 

            } else {
                setChatMessages([]);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error("Chat fetch error:", error);
        }
    };

// 🔥 تعديل دالة الإرسال لتحديث الشاشة فوراً (Optimistic UI)
const handleSendMessage = async (e) => {
    e.preventDefault();
    // 🛡️ Guards: التحقق من وجود بيانات الطالب ونص الرسالة
    if (!studentData || !parentMsgBody.trim()) return;

    const textToSend = parentMsgBody;
    setParentMsgBody(''); // تفريغ الحقل فوراً
    setSendingMsg(true);

    try {
        let ticketId = activeTicket?.id;

        // ✅ 1. لو مفيش تذكرة مفتوحة، ننشئ واحدة جديدة فوراً (الكود كامل هنا)
        if (!ticketId) {
            const { data: newTicket, error: ticketError } = await supabase
                .from('support_tickets')
                .insert([{
                    student_id: studentData.id,
                    center_id: studentData.center_id, // 👈 مهم جداً عشان الإدارة تشوفها
                    status: 'open',
                    subject: 'استفسار من ولي الأمر'
                }])
                .select()
                .single();
            
            if (ticketError) throw ticketError;
            
            setActiveTicket(newTicket);
            ticketId = newTicket.id;
        }

        // ✅ 2. إنشاء ID فريد (UUID) في المتصفح للمطابقة ومنع التكرار
        const tempId = crypto.randomUUID(); 

        // ✅ 3. إضافة الرسالة للشاشة فوراً (Optimistic UI)
        const optimisticMsg = {
            id: tempId, // للعرض في React
            client_side_id: tempId, // 👈 المفتاح السحري للمطابقة
            ticket_id: ticketId,
            sender_id: studentData.id,
            center_id: studentData.center_id,
            sender_type: 'student', // أو 'parent' حسب تصميم الداتابيز عندك
            message_text: textToSend,
            created_at: new Date().toISOString(),
            is_read: false
        };

        setChatMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom();

        // ✅ 4. الإرسال للداتابيز مع الـ client_side_id
        const { error: msgError } = await supabase
            .from('chat_messages')
            .insert([{
                ticket_id: ticketId,
                sender_id: studentData.id,
                center_id: studentData.center_id, // 👈 عشان الأدمن يلقطها في الـ Realtime
                sender_type: 'student',
                message_text: textToSend,
                is_read: false,
                client_side_id: tempId // 👈 بنبعته للداتابيز عشان لما يرجع في الـ Realtime نعرفه
            }]);

        if (msgError) throw msgError;

    } catch (error) {
        console.error(error);
        alert("فشل الإرسال: " + error.message);
        // هنا ممكن تحذف الرسالة الوهمية لو حصل خطأ (اختياري)
    } finally {
        setSendingMsg(false);
    }
};

// ⌨️ إشارة ولي الأمر يكتب الآن (مع حماية من الضغط المكثف)
const sendTypingSignal = () => {
    if (!studentData || !currentChannelRef.current) return;
    
    const now = Date.now();
    if (now - lastTypingSignalRef.current < 2000) return; // إرسال كل ثانيتين بحد أقصى
    
    lastTypingSignalRef.current = now;
    console.log("⌨️ [Typing] إرسال إشارة 'ولي الأمر يكتب'...");
    
    currentChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { typing: true }
    });
};

    const fetchActivities = async (studentUuid) => {
        // Prevent infinite loops
        if (fetchingActivities) {
            console.log("🔄 fetchActivities: Already fetching, skipping...");
            return;
        }
        
        setFetchingActivities(true);
        
        try {
            console.log("🔄 Fetching activities for student UUID:", studentUuid);
            console.log("🔍 Debug: studentUuid type:", typeof studentUuid);
            console.log("🔍 Debug: studentUuid value:", studentUuid);
            
            // 🆕 Fetch only by student_id (UUID field)
            const query = supabase
                .from('student_activities') 
                .select('*')
                .eq('student_id', studentUuid)
                .order('created_at', { ascending: false })
                .limit(15);
            
            console.log("🔍 Debug: Query URL:", query.url);
            console.log("🔍 Debug: Full query object:", query);
            
            const { data, error } = await query;

            console.log("🔍 Debug: Raw response:", { data, error });

            if (!error) {
                console.log("✅ Activities loaded:", data?.length || 0, "items");
                console.log("📊 Sample activity:", data?.[0]);
                
                // 🆕 Check if data is different from current state
                const currentData = JSON.stringify(activities);
                const newData = JSON.stringify(data || []);
                
                if (currentData !== newData) {
                    console.log("🔄 New activities detected, updating state");
                    setActivities(data || []);
                    
                    // 🆕 Store in localStorage for persistence
                    localStorage.setItem('activities_temp', JSON.stringify(data || []));
                    localStorage.setItem(`activities_${studentUuid}`, JSON.stringify(data || []));
                    console.log("🔄 Activities stored in localStorage");
                } else {
                    console.log("🔄 No new activities, keeping current state");
                }
            } else {
                console.error("❌ Activities error:", error);
                console.error("❌ Error details:", {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
            }
        } catch (e) { 
            console.error("❌ Activities fetch failed:", e); 
        } finally {
            setFetchingActivities(false);
        }
    };

// ✅ لازم تستقبل sId و uId كـ parameters
const checkPushStatus = async (sId, uniqueId) => {
    if (!sId) return false;
    try {
        const { data } = await supabase
            .from('parent_device_tokens')
            .select('id')
            .eq('student_id', sId)
            .maybeSingle();
        
        const hasToken = !!data;
        setIsPushEnabled(hasToken);
        if (uniqueId) {
            localStorage.setItem(`push_enabled_${uniqueId}`, hasToken ? 'true' : 'false');
        }
        return hasToken;
    } catch (e) {
        return false;
    }
};

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        
        const codeToSearch = studentCode.toUpperCase().trim();
        const pinCode = accessCode.trim();
        
        // 🐛 DEBUG: Log what we're searching for
        console.log('🔍 Searching for:', {
            unique_id: codeToSearch,
            access_code: pinCode,
            pinLength: pinCode.length
        });

        // 🎯 PIN Code validation
        if (pinCode.length !== 4) {
            alert("⚠️ الرمز السري يجب أن يكون 4 أرقام");
            setLoading(false);
            return;
        }

        // 🎯 PIN Code is now mandatory - always check both
        const { data: student, error } = await supabase
            .from('students')
            .select('*, center_id') // ← إضافة center_id للاسترجاع
            .eq('unique_id', codeToSearch)
            .eq('access_code', pinCode)
            .single();

        // 🐛 DEBUG: Log the result
        console.log('📊 Query result:', { student, error });

        if (student) {

            // 🛑 1. (The Guard) فحص صلاحية السنتر قبل السماح بالدخول 🛑
            const { data: centerFeatures } = await supabase
                .from('centers')
                .select(`
                    package_id,
                    packages (
                        package_features ( feature_id )
                    )
                `)
                .eq('id', student.center_id)
                .single();

            const allowedFeatures = centerFeatures?.packages?.package_features?.map(pf => pf.feature_id) || [];
            
            // لو الميزة مش موجودة في باقة السنتر -> وقف العملية فوراً
            if (!allowedFeatures.includes('action_student_portal')) {
                setLoading(false);
                alert("⛔ عذراً، خدمة بوابة ولي الأمر متوقفة مؤقتاً لهذا المركز. يرجى مراجعة الإدارة لتجديد الاشتراك.");
                return;
            }
            // 🛑 انتهى الفحص 🛑

            // 🎯 Store
            //  parent data for PIN mode
            localStorage.setItem('parent_student_data', JSON.stringify({
                studentId: student.id,
                studentName: student.name,
                studentCode: student.unique_id,
                centerId: student.center_id
            }));
            
            localStorage.setItem('parent_student_code', student.unique_id);
            localStorage.setItem('active_center_id', student.center_id); // ← تخزين center_id
            setStudentData(student);
            await checkPushStatus(student.id, student.unique_id);
            await fetchParentData(student.id, student.group_ids);
            await checkLiveStatus(student.unique_id, student.group_ids);
            await fetchChatSession(student.id); // ✅ جلب الشات بالنظام الجديد
            
            try {
                const { data: tokenExists } = await supabase
                    .from('parent_device_tokens')
                    .select('id')
                    .eq('student_id', student.id)
                    .maybeSingle();
                
                const hasToken = await checkPushStatus(student.id);
    setIsPushEnabled(hasToken);
    localStorage.setItem(`push_enabled_${student.unique_id}`, hasToken ? 'true' : 'false');
            } catch (e) {}
            
            setIsAuthorized(true);
        } else {
            if (e) {
                alert("⚠️ كود الطالب أو الرمز السري غير صحيح.");
            }
        }
        setLoading(false);
    };

// ✅ تحديث: إصلاح مشكلة اختفاء البيانات عند الريفريش
    useEffect(() => {
        const savedCode = localStorage.getItem('parent_student_code');
        if (savedCode) {
            setStudentCode(savedCode);
            
            const autoLogin = async () => {
                setLoading(true);
                try {
                    const { data: student } = await supabase
                        .from('students')
                        .select('*')
                        .eq('unique_id', savedCode)
                        .single();

                    if (student) {
                        // 🛑 (The Guard) فحص الصلاحية في الدخول التلقائي أيضاً 🛑
                        const { data: centerFeatures } = await supabase
                            .from('centers')
                            .select(`package_id, packages ( package_features ( feature_id ) )`)
                            .eq('id', student.center_id)
                            .single();

                        const allowedFeatures = centerFeatures?.packages?.package_features?.map(pf => pf.feature_id) || [];

                        if (!allowedFeatures.includes('action_student_portal')) {
                            // طرد المستخدم وحذف بياناته
                            handleLogout();
                            alert("⛔ تم إنهاء الجلسة لأن خدمة البوابة متوقفة لهذا المركز حالياً.");
                            setLoading(false);
                            return;
                        }
                        // 🛑 انتهى الفحص 🛑
                        
                        setStudentData(student);
                        
                        // 1. ✅ جلب حالة التنبيهات
                        await checkPushStatus(student.id, student.unique_id);
                        
                        // 2. ✅ (السطر اللي كان ناقص) جلب الجداول والأنشطة والدرجات
                        await fetchParentData(student.id, student.group_ids);

                        // 3. ✅ جلب الحالة اللحظية
                        await checkLiveStatus(student.unique_id, student.group_ids);

                        // 4. ✅ جلب جلسة الشات (بيحدد التذكرة النشطة)
                        await fetchChatSession(student.id);

                        // 5. ✅ التأكد من التوكن مرة أخيرة
                        try {
                             await checkPushStatus(student.id, student.unique_id);
                        } catch (e) {}

                        // 🔥 وأخيراً نفتح البوابة (بعد ما كل الداتا وصلت)
                        setIsAuthorized(true);
                    }
                } catch (e) {
                    console.error("Auto-login error:", e);
                } finally {
                    setLoading(false);
                }
            };
            autoLogin();
        }
        return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
    }, []);

useEffect(() => {
    if (isAuthorized && studentData) {
        checkLiveStatus(studentData.unique_id, studentData.group_ids); // استدعاء فوري
        
        const interval = setInterval(() => {
            checkLiveStatus(studentData.unique_id, studentData.group_ids);
        }, 60000);
        
        // 🆕 Initial fetch for activities
        fetchActivities(studentData.id); // Use UUID, not unique_id
        
        // 🆕 Also fetch parent data to ensure all state is loaded
        fetchParentData(studentData.id, studentData.group_ids, true);
        
        return () => clearInterval(interval);
    }
}, [isAuthorized, studentData]);

useEffect(() => {
    if (isAuthorized && studentData && activeTicket?.id) {
        console.log("🔄 [Realtime] إنشاء اشتراك جديد للتذكرة:", activeTicket.id);
        const cleanup = subscribeToRealtimeEvents(studentData.id);
        return () => { if (cleanup) cleanup(); };
    }
}, [isAuthorized, studentData, activeTicket?.id]);


    useEffect(() => {
        let pollInterval = null;

        if (showMessageModal) {
            scrollToBottom();
            setUnreadCount(0); // تصفير العداد في الواجهة

            // 1. تحديث حالة الرسائل في الداتابيز لـ "مقروءة"
            const markAsRead = async () => {
                if (!activeTicket?.id) return;
                await supabase
                    .from('chat_messages')
                    .update({ is_read: true })
                    .eq('ticket_id', activeTicket?.id)
                    .eq('sender_type', 'staff')
                    .eq('is_read', false);
            };
            markAsRead();

            // 2. 🔥 الحل النهائي: Polling كل 5 ثواني للطوارئ (عشان لو الـ Realtime وقع)
            pollInterval = setInterval(async () => {
                if (!activeTicket?.id) return;
                console.log("🔄 [Polling] تحديث الرسايل...");
                const { data } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('ticket_id', activeTicket.id)
                    .order('created_at', { ascending: true });
                
                if (data) {
                    setChatMessages(prev => {
                        // لو فيه رسايل جديدة مش عندنا، حدث الشاشة
                        if (data.length > prev.length) {
                            console.log("✨ [Polling] رسائل جديدة تم اكتشافها!");
                            return data;
                        }
                        return prev;
                    });
                }
            }, 5000);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [showMessageModal, activeTicket?.id]);

const checkLiveStatus = async (studentUniqueId, groupIds) => {
    // 🛡️ Guard Clause
    if (!studentUniqueId || !groupIds) return;

    // استخراج الجروبات الخاصة بالطالب فقط
    const gIds = Object.values(groupIds).filter(val => val && val !== '');
    if (gIds.length === 0) return;

    try {
        // ✅ Performance Fix: البحث في جروبات الطالب فقط
        const { data: mySessions } = await supabase
            .from('sessions')
            .select('topic, attendees, actual_start_time, group_id, is_completed, courses(name, instructor, instructors(id, name))')
            .in('group_id', gIds) // 👈 الفلترة هنا وفرت load كبير
            .eq('is_completed', false)
            .order('created_at', { ascending: false });

        if (mySessions && mySessions.length > 0) {
            // ... باقي المنطق كما هو ...
            const currentSession = mySessions.find(s => s.attendees?.includes(studentUniqueId));
            if (currentSession) {
                setLiveSessionInfo(currentSession);
                const isLectureStarted = !!currentSession.actual_start_time;
                setCurrentStatus(isLectureStarted ? 'in-session' : 'waiting');
                return;
            }
            
            // الطالب لسه موصلش
            setLiveSessionInfo(mySessions[0]);
            setCurrentStatus('student-not-arrived');
            return;
        }

        // البحث عن آخر حصة منتهية (لنفس الجروبات فقط)
        const { data: lastFinished } = await supabase
            .from('sessions')
            .select('topic, attendees, actual_start_time, is_completed, courses(name, instructor, instructors(id, name))')
            .in('group_id', gIds) // 👈 فلترة
            .eq('is_completed', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastFinished) {
            setLiveSessionInfo(lastFinished);
            setCurrentStatus('session-ended');
        } else {
            setCurrentStatus('offline');
            setLiveSessionInfo(null);
        }
    } catch (err) {
        console.error("Live status check failed", err);
    }
};

    const fetchParentData = async (studentUuid, groupIds, forceRefresh = false) => {
        const now = Date.now();
        console.log("🔄 Fetching parent data...", { studentUuid, forceRefresh });
        const gIds = [...new Set(Object.values(groupIds || {}).filter(Boolean))];

        const attPromise = supabase.from('sessions')
            .select('created_at, attendees, actual_start_time, topic, courses(name, instructor, instructors(id, name))')
            .in('group_id', gIds.length > 0 ? gIds : ['none'])
            .order('created_at', { ascending: false })
            .limit(20);

        const exmPromise = supabase
            .from('exam_results')
            .select('*, exams(title, max_score, exam_date, courses(name, instructor, instructors(name)))')
            .eq('student_id', studentUuid)
            .order('created_at', { ascending: false });

        const payPromise = supabase
            .from('wallet_transactions')
            .select('*')
            .eq('student_id', studentUuid)
            .order('created_at', { ascending: false })
            .limit(20);

        const schedulePromise = supabase
            .from('schedule')
            .select(`*, groups (name, courses (name, instructor, instructors(id, name))), rooms (name), exams (*)`)
            .in('group_id', gIds.length > 0 ? gIds : ['none']);

        const [att, exm, pay, sch] = await Promise.allSettled([attPromise, exmPromise, payPromise, schedulePromise]);

        if (att.status === 'fulfilled' && !att.value.error) setAttendance(att.value.data || []);
        if (exm.status === 'fulfilled' && !exm.value.error) setExams(exm.value.data || []);
        if (pay.status === 'fulfilled' && !pay.value.error) setPayments(pay.value.data || []);
        if (sch.status === 'fulfilled' && !sch.value.error) setStudentSchedule(sch.value.data || []);

        await fetchActivities(studentUuid); 
        lastFetchTime.current = now;
    };

    // 🔥🔥🔥 الحل النهائي المتطور: اشتراك قوي مع مراعاة حالة الـ Ref 🔥🔥🔥
    const subscribeToRealtimeEvents = (currentUserId) => {
        if (!currentUserId || !activeTicketRef.current) {
            console.log("⚠️ [Realtime] تم تأجيل الاشتراك لعدم وجود تذكرة نشطة حالياً");
            return;
        }

        console.log("🚀 [Realtime] بدء محاولة الاشتراك للطالب:", currentUserId);
        
        // فحص حالة الدخول
        supabase.auth.getUser().then(({data}) => {
            // console.log("👤 [Realtime] مستخدم Supabase الحالي:", data.user ? data.user.id : "غير مسجل (Anon)");
        });

        const channelName = `ticket:${activeTicketRef.current}`; 
        const portalChannel = supabase.channel(channelName);
        currentChannelRef.current = portalChannel;

        portalChannel
            .on('postgres_changes', { 
                event: '*', // Listen to INSERT and UPDATE
                schema: 'public', 
                table: 'chat_messages' 
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newMsg = payload.new;
                    if (newMsg.ticket_id === activeTicketRef.current) {
                        setChatMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id || m.client_side_id === newMsg.client_side_id)) return prev;
                            return [...prev, newMsg];
                        });
                        if (newMsg.sender_type !== 'student') {
                            if (!showMessageModalRef.current) setUnreadCount(prev => prev + 1);
                            try { new Audio('/notification.mp3').play().catch(() => {}); } catch(e) {}
                        }
                        setTimeout(scrollToBottom, 50);
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const updatedMsg = payload.new;
                    if (updatedMsg.ticket_id === activeTicketRef.current) {
                        setChatMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
                    }
                }
            })
            .on('broadcast', { event: 'admin_reply' }, (payload) => {
                const newMsg = payload.payload;
                if (newMsg.ticket_id === activeTicketRef.current) {
                    setChatMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id || m.client_side_id === newMsg.client_side_id)) return prev;
                        return [...prev, newMsg];
                    });
                    if (!showMessageModalRef.current) setUnreadCount(prev => prev + 1);
                    try { new Audio('/notification.mp3').play().catch(() => {}); } catch(e) {}
                    setTimeout(scrollToBottom, 50);
                }
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.typing) {
                    setIsStaffTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsStaffTyping(false), 3000);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_activities', filter: `student_id=eq.${currentUserId}` }, (p) => {
                setActivities(prev => [p.new, ...prev]);
            })
            .subscribe((status) => {
                console.log(`🔌 [Realtime] حالة القناة (${channelName}):`, status);
                if (status === 'SUBSCRIBED') setIsConnected(true);
            });

        return () => { 
            if (currentChannelRef.current) {
                supabase.removeChannel(currentChannelRef.current);
                currentChannelRef.current = null;
            }
        };
    };

const handleToggleNotifications = async () => {
    if (!studentData) return;
    if (!('Notification' in window)) { alert("⚠️ هذا المتصفح لا يدعم التنبيهات."); return; }

    try {
        setLoading(true);
        const success = await setupPushNotifications(studentData.id, studentData.center_id); 
        
        if (success) {
            // ✅ التعديل هنا: نحدث الـ State فوراً عشان الزرار ينور أخضر
            setIsPushEnabled(true);
            
            // تحديث الـ localStorage عشان لو قفل وفتح
            localStorage.setItem(`push_enabled_${studentData.unique_id}`, 'true');
            
            alert("✅ تم تفعيل التنبيهات بنجاح!");
        }
    } catch (error) { 
        console.error("Push Error:", error);
    } finally { 
        setLoading(false); 
    }
};

    const handleLogout = () => {
        localStorage.removeItem('parent_student_code');
        setIsAuthorized(false);
        setStudentData(null);
    };

    if (!isAuthorized) {
        return (
            <div className="min-h-screen relative overflow-hidden" dir="rtl">
                {/* Premium Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-900">
                    {/* Animated Elements */}
                    <div className="absolute top-20 left-20 w-32 h-32 border-2 border-yellow-400/20 rounded-full animate-pulse"></div>
                    <div className="absolute top-40 right-32 w-24 h-24 border-2 border-yellow-400/15 rotate-45 animate-spin-slow"></div>
                    <div className="absolute bottom-32 left-40 w-40 h-40 border-2 border-yellow-400/10 rounded-lg animate-bounce-slow"></div>
                    <div className="absolute top-60 left-1/2 w-28 h-28 border-2 border-yellow-400/25 rotate-12 animate-pulse"></div>
                    <div className="absolute bottom-20 right-20 w-36 h-36 border-2 border-yellow-400/20 rounded-full animate-spin-slow"></div>
                    
                    {/* Parent/Family Symbols */}
                    <div className="absolute top-32 left-1/3 text-yellow-400/10 text-6xl font-bold animate-pulse">👨‍👩‍👧‍👦</div>
                    <div className="absolute top-1/2 right-1/3 text-yellow-400/10 text-6xl font-bold animate-pulse">🏠</div>
                    <div className="absolute bottom-40 left-1/2 text-yellow-400/10 text-6xl font-bold animate-pulse">📚</div>
                    <div className="absolute top-1/4 right-1/4 text-yellow-400/10 text-5xl font-bold animate-pulse">🎯</div>
                    <div className="absolute bottom-1/4 left-1/4 text-yellow-400/10 text-5xl font-bold animate-pulse">⭐</div>
                </div>
                
                {/* Main Content */}
                <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-6">
                    <div className="max-w-md w-full transition-all duration-500 hover:scale-[1.01]">
                        {/* Glass Card */}
                        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent"></div>
                            
                            <div className="text-center mb-10 md:mb-12">
                                {/* Animated Logo */}
                                <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-8">
                                    <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 animate-pulse"></div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-500 rounded-[2rem] md:rounded-[3.5rem] flex items-center justify-center shadow-2xl shadow-yellow-400/40 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500">
                                        <FaUserFriends className="text-white text-4xl md:text-5xl drop-shadow-lg" />
                                    </div>
                                </div>
                                
                                <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent mb-3 tracking-tighter" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                                    بوابة ولي الأمر
                                </h1>
                                <div className="flex flex-col gap-1 items-center">
                                    <p className="text-yellow-100/90 font-bold text-base md:text-lg">منصة متطورة لمتابعة أبنائك</p>
                                    <div className="h-0.5 w-12 bg-yellow-400/30 rounded-full"></div>
                                    <p className="text-purple-100/60 text-[10px] md:text-xs font-medium mt-2 tracking-wide uppercase">تابع التقدم التعليمي لحظة بلحظة</p>
                                </div>
                            </div>
                            
                            <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
                                <div className="space-y-3">
                                    <label className="block text-xs md:text-sm font-black text-yellow-400/90 mr-1 flex items-center gap-2 uppercase tracking-widest">
                                        <span>🎓</span> كود الطالب (ID)
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-yellow-400/5 rounded-2xl blur-lg transition-all group-focus-within:bg-yellow-400/10"></div>
                                        <input 
                                            type="text" 
                                            placeholder="ST-101 مثلاً" 
                                            className="relative w-full p-4 md:p-6 bg-white/5 backdrop-blur-md border-2 border-white/10 focus:border-yellow-400/50 rounded-2xl md:rounded-3xl outline-none font-black text-center transition-all shadow-xl text-lg md:text-xl text-white placeholder-white/20"
                                            value={studentCode}
                                            onChange={(e) => setStudentCode(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <label className="block text-xs md:text-sm font-black text-yellow-400/90 mr-1 flex items-center gap-2 uppercase tracking-widest">
                                        <span>🔑</span> الرمز السري (PIN)
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-yellow-400/5 rounded-2xl blur-lg transition-all group-focus-within:bg-yellow-400/10"></div>
                                        <input 
                                            type="text" 
                                            placeholder="••••" 
                                            className="relative w-full p-4 md:p-6 bg-white/5 backdrop-blur-md border-2 border-white/10 focus:border-yellow-400/50 rounded-2xl md:rounded-3xl outline-none font-black text-center transition-all shadow-xl text-lg md:text-xl text-white placeholder-white/20 tracking-[0.5em]"
                                            value={accessCode}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                setAccessCode(value);
                                            }}
                                            required
                                            maxLength={4}
                                            pattern="[0-9]{4}"
                                        />
                                    </div>
                                </div>
                                
                                <button disabled={loading} className="relative w-full group overflow-hidden bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-purple-950 p-4 md:p-6 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl shadow-[0_20px_40px_-10px_rgba(245,158,11,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(245,158,11,0.6)] transition-all hover:-translate-y-1 active:scale-[98%] disabled:opacity-50">
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]"></div>
                                    <div className="relative flex items-center justify-center gap-3">
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-purple-900 border-t-transparent rounded-full animate-spin"></div>
                                                <span>جاري التحقق...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xl">🚀</span>
                                                دخول المنصة التعليمية
                                            </>
                                        )}
                                    </div>
                                </button>
                            </form>
                            
                            {/* Footer */}
                            <div className="mt-10 text-center space-y-4">
                                <p className="text-yellow-200/40 text-[10px] md:text-xs font-bold tracking-widest uppercase">
                                    منصة موثوقة للآباء والأمهات
                                </p>
                                <div className="h-px w-8 bg-white/20 mx-auto"></div>
                                <p className="text-purple-200/30 text-[9px] md:text-[10px] font-medium tracking-tighter">
                                    © {new Date().getFullYear()} Smart Center - Parent Portal
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Custom Styles */}
                <style jsx>{`
                    @keyframes spin-slow {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes bounce-slow {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-15px); }
                    }
                    @keyframes pulse-slow {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                    }
                    .animate-spin-slow {
                        animation: spin-slow 20s linear infinite;
                    }
                    .animate-bounce-slow {
                        animation: bounce-slow 4s ease-in-out infinite;
                    }
                    .animate-pulse-slow {
                        animation: pulse-slow 3s ease-in-out infinite;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20" dir="rtl">
            {/* Navbar */}
            <div className="bg-white border-b sticky top-0 z-30 px-4 md:px-6 py-3 shadow-sm">
    <div className="max-w-6xl mx-auto flex flex-col gap-3">
        
        {/* الصف العلوي: اللوجو واسم السنتر + زرار الخروج */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                {/* لوجو السنتر */}
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-xl flex items-center justify-center p-1 border border-gray-100 shadow-sm">
                    {centerInfo.logo ? (
                        <img src={centerInfo.logo} className="w-full h-full object-contain" alt="Logo" />
                    ) : (
                        <div className="w-full h-full rounded-lg flex items-center justify-center text-white font-black text-lg" style={{ backgroundColor: centerInfo.color }}>
                            {centerInfo.name?.charAt(0)}
                        </div>
                    )}
                </div>
                {/* اسم السنتر */}
                <div>
                    <h1 className="font-black text-gray-800 text-sm md:text-base leading-none mb-1">
                        {centerInfo.name}
                    </h1>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">بوابة المتابعة الذكية</p>
                </div>
            </div>

            {/* زرار تسجيل الخروج */}
            <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100">
                <FaArrowLeft size={14} />
            </button>
        </div>

        {/* خط فاصل خفيف للموبايل */}
        <div className="h-[1px] bg-gray-50 w-full md:hidden"></div>

        {/* الصف السفلي: الترحيب بولي الأمر + زرار التنبيهات */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: centerInfo.color }}></div>
                <div>
                    <h2 className="font-bold text-gray-700 text-[11px] leading-tight">مرحباً، ولي أمر {studentData?.name}</h2>
                    <span className="text-[9px] text-gray-400 font-medium">كود الطالب: {studentData?.unique_id}</span>
                </div>
            </div>

            <button 
                onClick={handleToggleNotifications}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[9px] transition-all border ${
                    isPushEnabled 
                    ? 'bg-green-50 border-green-100 text-green-600' 
                    : 'text-white shadow-md'
                }`}
                style={!isPushEnabled ? { backgroundColor: centerInfo.color, border: 'none' } : {}}
            >
                {isPushEnabled ? <FaBell /> : <FaBellSlash />}
                {isPushEnabled ? "مفعلة" : "تفعيل التنبيهات"}
            </button>
        </div>

    </div>
</div>

            <div id="overview" className="max-w-6xl mx-auto p-4 md:p-8 space-y-10">
                
                {/* 🏆 قسم الأوسمة والذكاء الاصطناعي (Insight Badges) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* وسام الالتزام */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100/30 p-6 rounded-[2.5rem] border border-green-100 flex flex-col items-center text-center group hover:shadow-xl hover:shadow-green-900/5 transition-all">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-2xl shadow-sm mb-4 group-hover:rotate-12 transition-transform">
                            🏆
                        </div>
                        <h4 className="font-black text-green-800 text-sm mb-1">الالتزام بالحضور</h4>
                        {(() => {
                            const attendedCount = attendance.filter(a => a.attendees?.includes(studentData?.unique_id)).length;
                            const totalPossible = attendance.length;
                            const percent = totalPossible > 0 ? Math.round((attendedCount / totalPossible) * 100) : 0;
                            return (
                                <>
                                    <p className="text-[10px] text-green-600 font-bold mb-3 uppercase tracking-widest">نسبة الانضباط {percent}%</p>
                                    <div className="bg-white/60 px-4 py-2 rounded-2xl text-[10px] font-black text-green-800 border border-green-100">
                                        {attendedCount >= 5 ? 'طالب مثالي متواجد دوماً' : 'حضور منتظم في الحصص'}
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* وسام الأداء */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 p-6 rounded-[2.5rem] border border-blue-100 flex flex-col items-center text-center group hover:shadow-xl hover:shadow-blue-900/5 transition-all">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-2xl shadow-sm mb-4 group-hover:-rotate-12 transition-transform">
                            🔥
                        </div>
                        <h4 className="font-black text-blue-800 text-sm mb-1">المستوى الأكاديمي</h4>
                        <p className="text-[10px] text-blue-600 font-bold mb-3 uppercase tracking-widest">المعدل التراكمي {exams.length > 0 ? Math.round(exams.reduce((acc, curr) => acc + (curr.score / curr.exams.max_score * 100), 0) / exams.length) : 0}%</p>
                        <div className="bg-white/60 px-4 py-2 rounded-2xl text-[10px] font-black text-blue-800 border border-blue-100">
                             {exams.length > 0 && (exams.reduce((acc, curr) => acc + (curr.score / curr.exams.max_score * 100), 0) / exams.length) >= 90 ? 'أداء استثنائي متفوق' : 'أداء جيد ومستقر'}
                        </div>
                    </div>

                    {/* وسام المالية */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 p-6 rounded-[2.5rem] border border-amber-100 flex flex-col items-center text-center group hover:shadow-xl hover:shadow-amber-900/5 transition-all">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                            💎
                        </div>
                        <h4 className="font-black text-amber-800 text-sm mb-1">الوضع المالي</h4>
                        <p className="text-[10px] text-amber-600 font-bold mb-3 uppercase tracking-widest">تحديث لحظي للمحفظة</p>
                        <div className="bg-white/60 px-4 py-2 rounded-2xl text-[10px] font-black text-amber-800 border border-amber-100">
                             سجل مالي نظيف ومرتب
                        </div>
                    </div>
                </div>

                {/* 🟢 كارت الحالة اللحظية */}
                <div className={`p-6 rounded-[2.5rem] border-2 transition-all shadow-sm ${
                    currentStatus === 'in-session' ? 'bg-green-50 border-green-200' : 
                    currentStatus === 'waiting' ? 'bg-blue-50 border-blue-200' : 
                    currentStatus === 'student-not-arrived' ? 'bg-orange-50 border-orange-200 animate-pulse' :
                    currentStatus === 'session-ended' ? 'bg-slate-50 border-slate-200' :
                    'bg-white border-gray-100'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                                currentStatus === 'in-session' ? 'bg-green-500 text-white' : 
                                currentStatus === 'waiting' ? 'bg-blue-500 text-white' : 
                                currentStatus === 'student-not-arrived' ? 'bg-orange-500 text-white' :
                                currentStatus === 'session-ended' ? 'bg-slate-400 text-white' :
                                'bg-gray-100 text-gray-400'
                            }`}>
                                {currentStatus === 'in-session' ? <FaBookOpen /> : 
                                 currentStatus === 'waiting' ? <FaCheckCircle /> : 
                                 currentStatus === 'student-not-arrived' ? <FaClock /> : 
                                 currentStatus === 'session-ended' ? <FaHistory /> : <FaHistory />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">الحالة اللحظية</p>
                                <h3 className={`text-sm font-black ${
                                    currentStatus === 'in-session' ? 'text-green-700' : 
                                    currentStatus === 'waiting' ? 'text-blue-700' : 
                                    currentStatus === 'student-not-arrived' ? 'text-orange-700' :
                                    currentStatus === 'session-ended' ? 'text-slate-600' : 'text-gray-500'
                                }`}>
                                    {currentStatus === 'in-session' ? 'الطالب داخل القاعة (بدأ الشرح الفعلي) ✍️' : 
                                     currentStatus === 'waiting' ? 'الطالب في السنتر (بانتظار المدرس) ✅' : 
                                     currentStatus === 'student-not-arrived' ? 'يتم دخول الطلاب وتسجيل الحضور - الطالب لم يصل بعد ⚠️' :
                                     currentStatus === 'session-ended' ? 'انتهت الحصة وغادر الطالب القاعة 🔒' :
                                     'لا يوجد حصص جارية حالياً'}
                                </h3>
                                
                                {liveSessionInfo && (
                                    <div className="mt-2 flex flex-col gap-1 border-r-2 border-current pr-2">
                                        <span className={`text-[11px] font-black ${
                                            currentStatus === 'in-session' ? 'text-green-600' : 
                                            currentStatus === 'session-ended' ? 'text-slate-500' : 'text-blue-600'
                                        }`}>
                                            📖 مادة: {liveSessionInfo.courses?.name} ({liveSessionInfo.topic})
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-bold">
                                            👨‍🏫 المدرس: {liveSessionInfo.courses?.instructors?.name || liveSessionInfo.courses?.instructor}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {currentStatus !== 'offline' && <FaMapMarkerAlt className={
                            currentStatus === 'in-session' ? 'text-green-500' : 
                            currentStatus === 'waiting' ? 'text-blue-500' : 
                            currentStatus === 'session-ended' ? 'text-slate-400' : 'text-orange-500'
                        } />}
                    </div>
                </div>

                {/* 📊 زرار التقرير الكامل */}
                <Link 
                    href={`/portal/report/${studentData?.unique_id}`} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-[2.5rem] font-black shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95 group mb-6"
                >
                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                        <FaChartLine />
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] opacity-80 leading-none mb-1 font-bold">اضغط هنا للاطلاع على تقرير الحضور والمصاريف بالتفصيل</p>
                        <h3 className="text-lg leading-none font-black text-white">عرض ملف الطالب الشامل</h3>
                    </div>
                </Link>

                {/* الكروت المالية */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] text-white shadow-xl shadow-blue-900/10 relative overflow-hidden group">
                        <FaWallet className="absolute -left-4 -bottom-4 text-white/10 text-8xl rotate-12 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                            <p className="text-[10px] md:text-xs font-black opacity-80 uppercase tracking-widest mb-1">رصيد المحفظة المتاح</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl md:text-4xl font-black">{studentData?.wallet_balance}</p>
                                <span className="text-xs md:text-sm opacity-60 font-bold">ج.م</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-indigo-900/5 border border-gray-100 relative overflow-hidden flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
                            <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">إجمالي المديونية</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl md:text-4xl font-black text-red-600">{studentData?.total_debt}</p>
                            <span className="text-xs md:text-sm text-gray-400 font-bold">ج.م</span>
                        </div>
                    </div>
                </div>

                {/* 📅 جدول الحصص */}
                <div id="schedule-section" className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-10 shadow-xl shadow-indigo-900/5 border border-gray-100 overflow-hidden">
                    <div className="flex justify-between items-center mb-8 px-2">
                        <h3 className="font-black text-gray-800 text-base md:text-lg flex items-center gap-3 border-r-4 border-blue-600 pr-4"> 
                            جدول الحصص الأسبوعي
                        </h3>
                        <span className="hidden md:block text-xs bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-black">المواعيد الدراسية المخصصة للطالب</span>
                    </div>

                    {studentSchedule.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                             <FaClock size={40} className="mx-auto mb-3 text-gray-200" />
                             <p className="text-sm font-bold text-gray-400">لا توجد مواعيد مسجلة لهذه المجموعات</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((dayName, index) => {
                                const daySessions = studentSchedule.filter(s => Number(s.day_of_week) === index);
                                if (daySessions.length === 0) return null;
                                return (
                                    <div key={index} className="flex gap-5 items-start bg-gray-50/30 p-5 rounded-[2rem] border border-gray-50">
                                        <div className="w-16 md:w-20 shrink-0 bg-white rounded-2xl py-3 text-center shadow-sm border border-gray-100">
                                            <span className="text-[10px] font-black text-gray-400 block uppercase mb-1">يوم</span>
                                            <span className="text-sm md:text-base font-black text-blue-600">{dayName}</span>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            {daySessions.map((session, sIdx) => (
                                                <div key={sIdx} className={`p-5 rounded-2xl border flex justify-between items-center group transition-all shadow-sm ${session.exam_id ? 'bg-rose-50/50 border-rose-100 hover:border-rose-300' : 'bg-white border-gray-100 hover:border-blue-300'}`}>
                                                    <div>
                                                        {session.exam_id && (
                                                            <div className="bg-rose-100 text-rose-600 text-[8px] font-black px-2 py-0.5 rounded-full mb-1 border border-rose-200 inline-block">إختبار ورقي 📝</div>
                                                        )}
                                                        <h4 className={`text-sm font-black mb-2 leading-tight ${session.exam_id ? 'text-rose-900' : 'text-gray-800'}`}>
                                                            {session.exam_id ? `📝 ${session.exams?.title || 'إختبار'}` : session.groups?.courses?.name}
                                                        </h4>
                                                        <div className="text-[10px] md:text-xs text-gray-400 font-bold flex items-center gap-1.5 leading-none">
                                                            <div className={`w-5 h-5 ${session.exam_id ? 'bg-rose-100' : 'bg-blue-50'} rounded-full flex items-center justify-center`}>
                                                                <FaUserGraduate className={`${session.exam_id ? 'text-rose-500' : 'text-blue-500'} text-[10px]`} />
                                                            </div>
                                                            <span>م/ {session.groups?.courses?.instructors?.name || session.groups?.courses?.instructor}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <div className={`flex items-center gap-2 ${session.exam_id ? 'bg-rose-600' : 'bg-blue-600'} text-white px-3 py-1.5 rounded-xl shadow-lg ${session.exam_id ? 'shadow-rose-200' : 'shadow-blue-200'} mb-2`}>
                                                            <FaClock className="text-[10px]" />
                                                            <span className="text-[12px] font-black tracking-tighter" dir="ltr">
                                                                {(() => {
                                                                    let [h, m] = session.start_time.split(':');
                                                                    let hours = parseInt(h);
                                                                    const ampm = hours >= 12 ? 'م' : 'ص';
                                                                    hours = hours % 12 || 12;
                                                                    return `${hours}:${m} ${ampm}`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-bold">
                                                            <FaMapMarkerAlt className={session.exam_id ? 'text-rose-300' : 'text-blue-300'} />
                                                            <span>{session.rooms?.name || 'القاعة الرئيسية'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* سجل الحضور */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="font-black text-gray-800 text-sm flex items-center gap-2 border-r-4 border-indigo-600 pr-3"> سجل الحضور الأخير</h3>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                        {attendance.map((session, idx) => {
                            const isAttended = session.attendees?.includes(studentData?.unique_id);
                            return (
                                <div key={idx} className={`min-w-[120px] p-4 rounded-[2rem] border-2 flex flex-col items-center transition-all ${isAttended ? 'bg-white border-green-100' : 'bg-white border-red-50 opacity-60'}`}>
                                    <span className="text-[9px] font-black text-gray-400 mb-3 text-center leading-tight">
                                        {session.courses?.name}<br/>
                                        {new Date(session.created_at).toLocaleDateString('ar-EG', {day: 'numeric', month: 'short'})}
                                    </span>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${isAttended ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {isAttended ? <FaCheckCircle size={16} /> : <FaExclamationCircle size={16} />}
                                    </div>
                                    <span className={`text-[9px] font-black ${isAttended ? 'text-green-600' : 'text-red-600'}`}>{isAttended ? 'حضر' : 'غاب'}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* تقرير الدرجات */}
                <div id="exams-section" className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                    <h3 className="font-black text-gray-800 text-sm mb-6 flex items-center gap-2 px-2 border-r-4 border-indigo-600 pr-3"> تقرير مستوى الطالب</h3>
                    {exams.length === 0 ? (
                        <div className="text-center py-10 opacity-30 flex flex-col items-center">
                            <FaHistory size={40} className="mb-2" />
                            <p className="text-xs font-bold">لم تصدر نتائج بعد</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {exams.map((exam, idx) => (
                                <div key={idx} className="flex justify-between items-center p-5 bg-gray-50 rounded-[2rem] border border-transparent hover:border-indigo-100 transition-all">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600 font-black text-xs border border-indigo-50 shrink-0">
                                            %{exam.exams ? Math.round((exam.score / exam.exams.max_score) * 100) : 0}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-gray-800 text-xs mb-0.5 truncate">{exam.exams?.title || "امتحان غير محدد"}</h4>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                                                <p className="text-[8px] text-indigo-500 font-black uppercase tracking-widest truncate">{exam.exams?.courses?.name || 'مادة عامة'}</p>
                                                <p className="text-[8px] text-gray-400 font-bold truncate">👨‍🏫 م/ {exam.exams?.courses?.instructors?.name || exam.exams?.courses?.instructor || 'غير محدد'}</p>
                                                <p className="text-[8px] text-gray-400 font-bold">📅 {exam.exams?.exam_date || 'بلا تاريخ'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm shrink-0">
                                        <span className="text-indigo-600 font-black text-sm">{exam.score}</span>
                                        <span className="text-gray-300 text-[10px] font-bold"> / {exam.exams?.max_score || 0}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 🔥 سجل النشاطات */}
{/* 🔥 سجل النشاطات (معدل مع خاصية التوسيع) */}
                <div id="activities" className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
                        <h3 className="font-black text-gray-800 text-sm flex items-center gap-2 border-r-4 border-blue-600 pr-3">
                            سجل نشاط الطالب اليومي
                        </h3>
                        
                        {/* 💊 فلاتر النشاطات الذكية (Scalability Tabs) */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            {[
                                { id: 'all', label: 'الكل' },
                                { id: 'attendance', label: 'حضور' },
                                { id: 'exam', label: 'درجات' },
                                { id: 'payment', label: 'ماليات' }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`whitespace-nowrap px-5 py-2 rounded-2xl text-[10px] font-black transition-all border ${
                                        activeTab === tab.id 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-900/10' 
                                        : 'bg-white text-gray-400 border-gray-100 hover:border-blue-100'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 🔥 عرض النشاطات الموحدة */}
                    <div className="space-y-6 relative before:absolute before:right-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50 before:z-0">
                        {filteredActivities.length === 0 ? (
                            <div className="text-center py-10 opacity-30">
                                <p className="text-[10px] font-bold">لا توجد نشاطات من هذا النوع حالياً</p>
                            </div>
                        ) : (
                            <>
                                {filteredActivities
                                    .slice(0, showAllActivities ? filteredActivities.length : 5)
                                    .map((act, idx) => {
                                    const isAdminReply = act.type === 'admin_reply';
                                    return (
                                        <div key={idx} className={`relative z-10 flex gap-4 ${isAdminReply ? 'animate-in fade-in slide-in-from-right duration-500' : ''}`}>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border-4 border-white transition-all ${
                                                isAdminReply ? 'bg-blue-600 text-white shadow-blue-200 scale-110' : 
                                                act.type === 'attendance' ? 'bg-green-100 text-green-600' :
                                                act.type === 'exam' ? 'bg-indigo-100 text-indigo-600' :
                                                act.type === 'payment' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                                {isAdminReply ? <FaBell className="animate-swing" /> : 
                                                 act.type === 'attendance' ? <FaCheckCircle size={16} /> : 
                                                 act.type === 'exam' ? <FaFileAlt size={16} /> :
                                                 act.type === 'payment' ? <FaWallet size={16} /> :
                                                 <FaHistory size={16} />}
                                            </div>

                                            <div className={`flex-1 p-4 rounded-3xl border transition-all shadow-sm group ${
                                                isAdminReply 
                                                ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100/50' 
                                                : 'bg-gray-50/50 border-transparent hover:border-blue-100 hover:bg-white'
                                            }`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={`font-black text-[11px] ${isAdminReply ? 'text-blue-800' : 'text-gray-800'}`}>
                                                        {isAdminReply ? '📩 رد رسمي من الإدارة' : act.title}
                                                    </h4>
                                                    <span className="text-[8px] text-gray-300 font-bold">
                                                        {new Date(act.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                                <p className={`text-[10px] font-bold leading-relaxed ${isAdminReply ? 'text-blue-700' : 'text-gray-500'}`}>
                                                    {act.message || act.description}
                                                </p>
                                                {act.note && (
                                                    <div className="mt-3 p-3 bg-white rounded-2xl border border-blue-50 text-[9px] font-bold text-blue-600 italic">
                                                        " {act.note} "
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    {/* ✅ زرار التحكم في عرض المزيد */}
                    {filteredActivities.length > 5 && (
                        <button 
                            onClick={() => setShowAllActivities(!showAllActivities)}
                            className="w-full mt-6 py-3 text-[11px] font-black text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-2xl transition-colors border border-blue-100 border-dashed flex items-center justify-center gap-2 group"
                        >
                            {showAllActivities ? (
                                <>
                                    <span className="group-hover:-translate-y-1 transition-transform">⬆️</span> عرض أقل
                                </>
                            ) : (
                                <>
                                    <span className="group-hover:translate-y-1 transition-transform">⬇️</span> عرض سجل النشاطات كاملاً ({filteredActivities.length - 5} عناصر أخرى)
                                </>
                            )}
                        </button>
                    )}
                </div>

{/* 📬 الفقاعة العائمة */}
<button 
    onClick={() => setShowMessageModal(true)}
    className="fixed bottom-6 right-6 w-16 h-16 text-white rounded-full shadow-2xl z-[4000] floating-chat-btn hidden md:flex items-center justify-center transition-all hover:scale-110 active:scale-95"
    style={{ backgroundColor: centerInfo.color }} // 👈 لون الزرار
>
    <FaPaperPlane className="text-xl" />
    
    {/* 🔴 العداد الذكي */}
    {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
        </span>
    )}
</button>
            </div>

            {/* 🛠️ مودال الشات (نظام الفقاعات) */}
            {showMessageModal && (
               <div className="fixed inset-0 bg-white md:bg-black/40 md:backdrop-blur-sm z-[5000] flex items-end md:items-center justify-center p-0 md:p-4">
               <div className="bg-white w-full max-w-md h-full md:h-[85vh] md:rounded-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        {/* الهيدر */}
                        {/* الهيدر المطور بلوجو السنتر */}
<div 
                className="p-4 pt-14 md:pt-4 text-white flex justify-between items-center shadow-lg relative overflow-hidden md:rounded-t-[2.5rem]" 
                style={{ backgroundColor: centerInfo.color }} // 👈 هنا التعديل السحري
            >
    {/* لمسة جمالية: لوجو باهت في الخلفية */}
    {centerInfo.logo && (
        <img src={centerInfo.logo} className="absolute -left-4 -top-4 w-24 h-24 opacity-10 rotate-12" alt="" />
    )}

    <div className="flex items-center gap-3 relative z-10">
        {/* عرض لوجو السنتر أو أيقونة افتراضية */}
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-1 shadow-inner">
            {centerInfo.logo ? (
                <img src={centerInfo.logo} className="w-full h-full object-contain rounded-lg" alt="لوجو السنتر" />
            ) : (
                <FaShieldAlt className="text-blue-600 text-xl" />
            )}
        </div>
        
        <div>
            <h3 className="font-black text-sm leading-tight">شات دعم {centerInfo.name}</h3>
            <p className="text-[9px] opacity-80 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                الإدارة متصلة الآن
            </p>
        </div>
    </div>

    <button 
        onClick={() => setShowMessageModal(false)} 
        className="bg-white/10 w-9 h-9 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
    >
        &times;
    </button>
</div>

                       {/* منطقة الرسائل الفاخرة */}
<div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar bg-[#f0f2f5] custom-chat-bg" dir="rtl" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', opacity: 1}}>
    {chatMessages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
            <FaPaperPlane size={40} className="mb-4 text-blue-600 animate-bounce" />
            <h4 className="font-black text-sm mb-2">ابدأ محادثة مع الإدارة</h4>
            <p className="text-[10px] font-bold">نحن هنا لمساعدتك بخصوص الطالب {studentData?.name}</p>
        </div>
    ) : (
        (() => {
            // تجميع الرسائل بالتاريخ
            const groups = chatMessages.reduce((acc, msg) => {
                const date = new Date(msg.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
                if (!acc[date]) acc[date] = [];
                acc[date].push(msg);
                return acc;
            }, {});

            return Object.entries(groups).map(([date, msgs], gIdx) => (
                <div key={gIdx} className="space-y-4">
                    <div className="flex justify-center my-6">
                        <span className="bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-[9px] font-black text-gray-500 shadow-sm border border-gray-100 uppercase tracking-widest">
                            {date === new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) ? 'اليوم' : date}
                        </span>
                    </div>
                    {msgs.map((msg, index) => {
                        const isMe = msg.sender_type === 'student' || msg.sender_type === 'parent'; 
                        return (
                            <div key={index} className={`flex ${isMe ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`relative max-w-[85%] p-3.5 px-5 rounded-[1.8rem] shadow-sm text-sm font-bold leading-relaxed bubble-tail ${
                                    isMe 
                                    ? 'bg-blue-600 text-white rounded-tr-none shadow-lg' // أنا (أزرق) على اليمين
                                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100' // الإدارة (أبيض) على اليسار
                                }`}
                                >
                                    {msg.message_text}
                                    
                                    <div className={`text-[8px] mt-1.5 flex items-center gap-1.5 opacity-75 ${isMe ? 'justify-start text-blue-100/90' : 'justify-end text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
                                        {isMe && (
                                            <FaCheckDouble className={`text-[10px] ${msg.is_read ? 'text-cyan-300 font-black' : 'text-blue-200/50'}`} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ));
        })()
    )}
    <div ref={chatEndRef} />
    
    {/* Typing Indicator */}
    {isStaffTyping && (
        <div className="absolute bottom-24 right-8 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full border border-blue-50 flex items-center gap-2 animate-bounce shadow-lg z-50">
            <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            </div>
            <span className="text-[11px] font-black text-blue-600">الإدارة تكتب الآن...</span>
        </div>
    )}
</div>

                        {/* منطقة الإرسال */}
                        <form onSubmit={handleSendMessage} className="p-4 pb-14 md:pb-4 bg-white border-t flex gap-2 items-center">
                            <input 
                                type="text"
                                required 
                                className="flex-1 bg-gray-50 p-4 rounded-2xl outline-none font-bold text-xs border border-transparent focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                                value={parentMsgBody}
                                placeholder="اكتب رسالتك للإدارة هنا..."
                                onChange={e => {
                                    setParentMsgBody(e.target.value);
                                    sendTypingSignal();
                                }}
                            />
                            <button 
                                disabled={sendingMsg || !parentMsgBody.trim()}
                                className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 active:scale-90 transition-all disabled:opacity-30"
                            >
                                <FaPaperPlane className={sendingMsg ? 'animate-ping' : ''} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 📱 Bottom Navigation Bar for Mobile */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-4 py-3 pb-6 flex justify-around items-center z-40 md:hidden shadow-[0_-10px_25px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center gap-1 text-blue-600 transition-all active:scale-95">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shadow-inner">
                        <FaHome className="text-xl" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5">الرئيسية</span>
                </button>

                <button onClick={() => document.getElementById('exams-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="flex flex-col items-center gap-1 text-gray-400 transition-all active:scale-95">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                        <FaFileAlt className="text-lg" />
                    </div>
                    <span className="text-[9px] font-bold mt-0.5">الدرجات</span>
                </button>

                <button onClick={() => document.getElementById('schedule-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="flex flex-col items-center gap-1 text-gray-400 transition-all active:scale-95">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                        <FaClock className="text-lg" />
                    </div>
                    <span className="text-[9px] font-bold mt-0.5">الجدول</span>
                </button>

                <button onClick={() => setShowMessageModal(true)} className="flex flex-col items-center gap-1 text-gray-400 transition-all active:scale-95 relative">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                        <FaPaperPlane className="text-lg" />
                    </div>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white animate-bounce">
                            {unreadCount > 9 ? '!' : unreadCount}
                        </span>
                    )}
                    <span className="text-[9px] font-bold mt-0.5">الدعم</span>
                </button>
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .bubble-tail::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    width: 15px;
                    height: 15px;
                }
                
                .flex.justify-start .bubble-tail::before {
                    right: -7px;
                    background: inherit;
                    clip-path: polygon(0 0, 0% 100%, 100% 0);
                    border-radius: 0 5px 0 0;
                }
                
                .flex.justify-end .bubble-tail::before {
                    left: -7px;
                    background: inherit;
                    clip-path: polygon(100% 0, 100% 100%, 0 0);
                    border-radius: 5px 0 0 0;
                }

                @keyframes swing {
                    0% { transform: rotate(0deg); }
                    20% { transform: rotate(15deg); }
                    40% { transform: rotate(-10deg); }
                    60% { transform: rotate(5deg); }
                    80% { transform: rotate(-5deg); }
                    100% { transform: rotate(0deg); }
                }
                .animate-swing { animation: swing 2s infinite ease-in-out; }

                @keyframes pulse-blue {
                    0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
                    70% { box-shadow: 0 0 0 20px rgba(37, 99, 235, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
                }

                .floating-chat-btn {
                    animation: pulse-blue 2s infinite;
                }
                
                .custom-chat-bg {
                    background-blend-mode: overlay;
                    background-attachment: fixed;
                }
            `}</style>
        </div>
    );
}

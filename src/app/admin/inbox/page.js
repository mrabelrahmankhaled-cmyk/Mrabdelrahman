'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { FaInbox, FaCheckCircle, FaUserClock, FaExclamationCircle, FaArrowLeft, FaSync } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';

export default function StaffInboxPage() {
    const { centerId } = useAuth();

    useEffect(() => {
        if (!centerId) {
            console.log('❌ No centerId found - waiting for authentication...');
            return;
        }
        console.log('✅ centerId available:', centerId);
    }, [centerId]);

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (centerId) {
            fetchMyTasks();
        }
    }, [centerId]);

    const fetchMyTasks = async () => {
        if (!centerId) return;

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('center_id', centerId)
            .or(`assigned_to.eq.${user.id},status.eq.open`)
            .order('created_at', { ascending: false });

        setTasks(data || []);
        setLoading(false);
    };

    const resolveTask = async (id) => {
        if (!centerId) {
            alert('⚠️ لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
            return;
        }

        const { error } = await supabase
            .from('notifications')
            .update({ status: 'resolved' })
            .eq('id', id)
            .eq('center_id', centerId);

        if (!error) {
            alert("تم إغلاق المهمة بنجاح ✅");
            fetchMyTasks();
        }
    };

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
        <div className="p-4 md:p-8 max-w-7xl mx-auto mb-20 md:mb-0" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 md:mb-12">
                <div className="text-center md:text-right w-full md:w-auto">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center justify-center md:justify-start gap-3">
                        <FaInbox className="text-blue-600 shrink-0" /> <span className="truncate">صندوق مهام الموظفين</span>
                    </h1>
                    <p className="text-gray-500 mt-1 text-xs md:text-sm font-bold">متابعة الطلبات والمهام المحولة إليك من النظام</p>
                </div>
                
                <button 
                    onClick={fetchMyTasks}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-white border-2 border-gray-100 text-gray-600 px-6 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                    <FaSync className={`${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm">تحديث الصندوق</span>
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-gray-100 h-64 animate-pulse"></div>
                    ))}
                </div>
            ) : tasks.length === 0 ? (
                <div className="py-20 md:py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4 text-gray-300 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                        <FaInbox className="text-5xl opacity-20" />
                    </div>
                    <p className="font-black text-gray-400 text-sm md:text-base">الصندوق فارغ حالياً.. لا توجد مهام معلقة.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-xl shadow-gray-50/50 border border-gray-100 relative group hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
                            <div className={`absolute top-4 left-4 text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider ${task.status === 'resolved' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-orange-50 text-orange-600 border border-orange-100 animate-pulse'}`}>
                                {task.status === 'resolved' ? 'مكتملة' : 'قيد المتابعة'}
                            </div>
                            
                            <div className="mt-4 md:mt-2">
                                <h3 className="text-lg md:text-xl font-black text-gray-800 mb-3 group-hover:text-blue-600 transition-colors leading-tight">{task.title}</h3>
                                <p className="text-xs md:text-sm text-gray-500 mb-6 font-bold leading-relaxed">{task.message}</p>
                            </div>
                            
                            <div className="mt-auto">
                                <div className="flex items-center gap-2.5 mb-6 text-[11px] text-blue-600 font-bold bg-blue-50/50 w-full px-4 py-2.5 rounded-xl border border-blue-100/50">
                                    <FaUserClock className="shrink-0" /> 
                                    <span>المهمة مُحولة إليك للمتابعة والحل</span>
                                </div>

                                {task.status !== 'resolved' ? (
                                    <button 
                                        onClick={() => resolveTask(task.id)}
                                        className="w-full h-12 md:h-14 bg-green-600 text-white rounded-xl md:rounded-2xl font-black text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-100 active:scale-95 cursor-pointer"
                                    >
                                        <FaCheckCircle className="text-lg" /> تم التواصل والحل
                                    </button>
                                ) : (
                                    <div className="w-full h-12 md:h-14 bg-gray-50 text-gray-400 rounded-xl md:rounded-2xl font-black text-sm flex items-center justify-center gap-3 border-2 border-dashed border-gray-200">
                                        <FaCheckCircle className="text-lg opacity-40" /> تمت المهمة بنجاح
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-4 text-[9px] font-bold text-gray-300 text-left" dir="ltr">
                                {new Date(task.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
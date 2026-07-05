'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { FaSearch, FaCheckCircle, FaTrashAlt, FaKey, FaTimes, FaSpinner, FaUserPlus } from 'react-icons/fa';

export default function PendingStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Password Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    fetchPendingStudents();
  }, []);

  const fetchPendingStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching pending students:', err);
      showToast('حدث خطأ أثناء جلب البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleActivate = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من تفعيل حساب الطالب: ${name}؟`)) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;
      
      showToast('تم تفعيل الحساب بنجاح');
      // Remove from list
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error activating student:', err);
      showToast('حدث خطأ أثناء التفعيل', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف طلب الطالب: ${name} نهائياً؟`)) return;

    try {
      // Call our secure backend API to delete from auth.users
      const res = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('تم حذف الطلب نهائياً');
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting student:', err);
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const openResetModal = (id) => {
    setSelectedStudentId(id);
    setNewPassword('');
    setIsResetModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('يجب أن تكون كلمة السر 6 أحرف على الأقل', 'error');
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('تم إعادة تعيين كلمة السر بنجاح');
      setIsResetModalOpen(false);
    } catch (err) {
      console.error('Error resetting password:', err);
      showToast('حدث خطأ أثناء تغيير كلمة السر', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    (s.name && s.name.includes(searchTerm)) || 
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.unique_id && s.unique_id.includes(searchTerm))
  );

  return (
    <div dir="rtl" className="p-6 md:p-10 min-h-screen bg-gray-50">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl font-bold text-white transition-all
          ${toastMsg.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}
        `}>
          {toastMsg.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#264653] flex items-center gap-3">
            <FaUserPlus className="text-[#2A9D8F]" />
            طلبات الانضمام الجديدة
          </h1>
          <p className="text-gray-500 mt-2 font-medium">إدارة الطلاب الذين سجلوا في المنصة وبانتظار التفعيل.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <input 
            type="text"
            placeholder="بحث بالاسم، رقم الموبايل أو الكود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F] outline-none transition-all shadow-sm"
          />
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-[#F8F9FA] border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-[#264653]">اسم الطالب</th>
                <th className="px-6 py-4 text-sm font-bold text-[#264653]">كود الطالب</th>
                <th className="px-6 py-4 text-sm font-bold text-[#264653]">الموبايل</th>
                <th className="px-6 py-4 text-sm font-bold text-[#264653]">الصف الدراسي</th>
                <th className="px-6 py-4 text-sm font-bold text-[#264653]">تاريخ التسجيل</th>
                <th className="px-6 py-4 text-sm font-bold text-[#264653] text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                    <FaSpinner className="animate-spin text-3xl mx-auto mb-2 text-[#2A9D8F]" />
                    جاري تحميل البيانات...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500 font-medium">
                    لا يوجد طلبات انضمام حالية.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#264653]">{student.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md font-mono text-xs font-bold border border-gray-200">
                        {student.unique_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-700" dir="ltr">{student.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {student.grade}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(student.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleActivate(student.id, student.name)}
                          title="تفعيل الحساب"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                        >
                          <FaCheckCircle />
                        </button>
                        <button 
                          onClick={() => openResetModal(student.id)}
                          title="إعادة تعيين كلمة السر"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                        >
                          <FaKey />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id, student.name)}
                          title="حذف الطلب"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsResetModalOpen(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <FaTimes size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-lg">
                <FaKey />
              </div>
              <h2 className="text-xl font-bold text-[#264653]">إعادة تعيين كلمة السر</h2>
            </div>
            
            <form onSubmit={handleResetPassword}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">كلمة السر الجديدة</label>
                <input 
                  type="text" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة سر قوية (6 أحرف على الأقل)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-left"
                  dir="ltr"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/30 disabled:opacity-60 flex justify-center items-center gap-2"
                >
                  {isResetting ? <FaSpinner className="animate-spin" /> : 'حفظ التغييرات'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

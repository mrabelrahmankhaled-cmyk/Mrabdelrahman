'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { FaPlus, FaUsers, FaBookOpen, FaTrash, FaUserTie, FaGraduationCap, FaEdit, FaSave, FaTimes, FaLock } from 'react-icons/fa';

export default function GroupManager() {
  const { user, centerId, allowedFeatures, loading: authLoading } = useAuth();

  // 🛡️ Route Protection
  useEffect(() => {
    if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_groups')) {
      window.location.href = '/admin/dashboard';
    }
  }, [allowedFeatures, authLoading]);

  // 🔒 Feature Flags
  const canAddGroup = allowedFeatures?.includes('action_add_group');
  const canEditGroup = allowedFeatures?.includes('action_edit_group');
  const canDeleteGroup = allowedFeatures?.includes('action_delete_group');

  const [groups, setGroups] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [grades, setGrades] = useState([]);

  const [selectedGrade, setSelectedGrade] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', course_id: '' });
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (user && centerId) {
        fetchData();
      } else {
        setDataLoading(false);
      }
    }
  }, [user, centerId, authLoading]);

  useEffect(() => {
    if (selectedGrade) {
      const filtered = allCourses.filter(c => String(c.grade) === String(selectedGrade));
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses([]);
    }
    setSelectedCourseId('');
  }, [selectedGrade, allCourses]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id, name, grade, instructor, instructor_id,
          instructors ( id, name )
        `)
        .eq('center_id', centerId);

      if (coursesError) throw coursesError;
      setAllCourses(coursesData || []);

      const uniqueGrades = [...new Set(coursesData?.map(c => c.grade))]
        .filter(grade => grade != null && grade !== '')
        .sort();
      setGrades(uniqueGrades);

      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          id, name, course_id,
          courses (
            name, grade, instructor, instructor_id,
            instructors ( id, name )
          )
        `)
        .eq('center_id', centerId)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

    } catch (err) {
      console.error("خطأ أثناء جلب البيانات:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName || !selectedCourseId) return alert('يرجى اختيار الصف والكورس واسم المجموعة');
    if (!centerId) return alert('خطأ: لم يتم التعرف على السنتر!');

    setLoading(true);
    try {
      const groupData = {
        name: newGroupName,
        course_id: selectedCourseId,
        center_id: centerId
      };
      const { error } = await supabase
        .from('groups')
        .insert([groupData]);

      if (error) throw error;
      setNewGroupName('');
      fetchData();
      alert('✅ تم إنشاء المجموعة بنجاح!');
    } catch (error) {
      alert('خطأ في إنشاء المجموعة: ' + (error.message || "خطأ غير معروف"));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (group) => {
    setEditingId(group.id);
    setEditForm({ name: group.name, course_id: group.course_id });
  };

  const handleUpdateGroup = async (id) => {
    setLoading(true);
    const { error } = await supabase
      .from('groups')
      .update({ name: editForm.name, course_id: editForm.course_id })
      .eq('id', id)
      .eq('center_id', centerId);

    if (error) {
      alert('خطأ في التحديث: ' + error.message);
    } else {
      setEditingId(null);
      setIsCourseDropdownOpen(false);
      fetchData();
    }
    setLoading(false);
  };

  const deleteGroup = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
      .eq('center_id', centerId);

    if (error) alert(error.message);
    else fetchData();
  };

  if (authLoading || (user && dataLoading) || (allowedFeatures && !allowedFeatures.includes('page_groups'))) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <span className="font-bold text-gray-600">جاري تحميل البيانات...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto mb-20 md:mb-0" dir="rtl">
      {/* Header Section */}
      <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-10 flex items-center gap-3 text-gray-800">
        <FaUsers className="text-blue-600 shrink-0" /> <span className="truncate text-xl md:text-3xl">إدارة المجموعات الدراسية</span>
      </h2>

      {/* Creation Form */}
      <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 mb-10">
        <form onSubmit={handleCreateGroup} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-end">

          <div className="space-y-2">
            <label className="block text-[11px] md:text-xs font-black text-gray-400 uppercase mr-1 flex items-center gap-2">
              <FaGraduationCap className="text-blue-500" /> الصف الدراسي
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full h-12 md:h-14 p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all font-bold text-sm text-gray-900"
            >
              <option value="">-- اختر الصف --</option>
              {grades.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] md:text-xs font-black text-gray-400 uppercase mr-1 flex items-center gap-2">
              <FaBookOpen className="text-blue-500" /> الكورس (المدرس)
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={!selectedGrade}
              className="w-full h-12 md:h-14 p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all disabled:opacity-40 font-bold text-sm text-gray-900"
            >
              <option value="">-- اختر الكورس --</option>
              {filteredCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} (د/ {course.instructors?.name || course.instructor || 'غير محدد'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] md:text-xs font-black text-gray-400 uppercase mr-1">اسم المجموعة</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="مثلاً: مجموعة A"
              className="w-full h-12 md:h-14 p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all font-bold text-sm text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !canAddGroup}
            className={`w-full h-12 md:h-14 rounded-xl md:rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg disabled:shadow-none text-sm md:text-base cursor-pointer
              ${loading || !canAddGroup
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-100'
              }`}
            title={!canAddGroup ? "تتطلب ترقية الباقة" : "إنشاء المجموعة"}
          >
            {canAddGroup ? <FaPlus className="shrink-0" /> : <FaLock size={12} className="shrink-0" />}
            {loading ? 'جاري الحفظ...' : 'إنشاء المجموعة'}
          </button>
        </form>
      </div>

      {/* Groups Listing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {groups.map((group) => (
          <div key={group.id} className="bg-white p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-50/50 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 group">
            {editingId === group.id ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase">وضع التعديل</span>
                  <button onClick={() => { setEditingId(null); setIsCourseDropdownOpen(false); }} className="h-8 w-8 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"><FaTimes /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-1.5 mr-1 uppercase">اسم المجموعة</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full h-11 p-3 border-2 border-orange-100 rounded-xl outline-none focus:border-orange-500 font-bold text-sm transition-all text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-1.5 mr-1 uppercase">الكورس المرتبط</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                        className="w-full h-11 px-4 rounded-xl border-2 border-orange-100 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-50 font-bold text-xs bg-white flex items-center justify-between transition-all"
                      >
                        <span className="truncate text-gray-900">
                          {allCourses.find(c => c.id === editForm.course_id)?.name || 'اختر الكورس'}
                          {editForm.course_id && ` (${allCourses.find(c => c.id === editForm.course_id)?.grade})`}
                        </span>
                        <svg className={`w-4 h-4 text-orange-600 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isCourseDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsCourseDropdownOpen(false)}></div>
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-orange-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {allCourses.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setEditForm({ ...editForm, course_id: c.id });
                                    setIsCourseDropdownOpen(false);
                                  }}
                                  className={`w-full p-3 text-right text-xs font-bold hover:bg-orange-50 transition-colors flex flex-col gap-0.5 ${editForm.course_id === c.id ? 'bg-orange-50 text-orange-600' : 'text-gray-700'}`}
                                >
                                  <span>{c.name}</span>
                                  <span className="text-[9px] opacity-60">الصف: {c.grade} | المدرس: {c.instructors?.name || c.instructor || 'غير محدد'}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateGroup(group.id)}
                    disabled={loading}
                    className="w-full h-11 bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 active:scale-95 transition-all shadow-lg shadow-orange-100 disabled:bg-gray-200"
                  >
                    <FaSave /> {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-blue-50 text-blue-600 text-[10px] md:text-xs px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 border border-blue-100/50">
                    <FaGraduationCap className="shrink-0" /> {group.courses?.grade}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => canEditGroup && startEdit(group)}
                      disabled={!canEditGroup}
                      className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all ${canEditGroup
                        ? 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'
                        : 'text-gray-300 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      title={!canEditGroup ? "تتطلب ترقية الباقة" : "تعديل"}
                    >
                      {canEditGroup ? <FaEdit size={16} /> : <FaLock size={10} />}
                    </button>
                    <button
                      onClick={() => canDeleteGroup && deleteGroup(group.id)}
                      disabled={!canDeleteGroup}
                      className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all ${canDeleteGroup
                        ? 'text-gray-300 hover:text-red-600 hover:bg-red-50'
                        : 'text-gray-300 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      title={!canDeleteGroup ? "تتطلب ترقية الباقة" : "حذف"}
                    >
                      {canDeleteGroup ? <FaTrash size={16} /> : <FaLock size={10} />}
                    </button>
                  </div>
                </div>

                <h3 className="text-lg md:text-xl font-black text-gray-800 mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[1.2em] md:min-h-[2.4em]">{group.name}</h3>

                <div className="mt-auto space-y-3 bg-gray-50/80 p-4 rounded-[1.25rem] border border-gray-100/50">
                  <div className="flex items-start gap-2.5 text-[11px] md:text-xs font-bold text-gray-600">
                    <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                      <FaBookOpen size={10} />
                    </div>
                    <span className="flex-1 leading-relaxed">الكورس: {group.courses?.name}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[11px] md:text-xs font-bold text-gray-600">
                    <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shrink-0 mt-0.5">
                      <FaUserTie size={10} />
                    </div>
                    <span className="flex-1 leading-relaxed">المدرس: د/ {group.courses?.instructors?.name || group.courses?.instructor || 'غير محدد'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && !dataLoading && (
          <div className="col-span-full py-16 md:py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4 text-gray-300 shadow-sm">
            <FaUsers className="text-5xl md:text-6xl opacity-20" />
            <p className="font-black text-gray-400 text-sm md:text-base">لم يتم إنشاء أي مجموعات بعد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
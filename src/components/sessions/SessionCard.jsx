'use client';
import { FaTrash, FaLock } from 'react-icons/fa';

/**
 * SessionCard component
 * Individual session list item with stats and actions
 */
export const SessionCard = ({
  session,
  stats,
  course,
  group,
  userRole,
  onOpenSession,
  onDeleteSession,
  allowedFeatures // 🔒 New Prop
}) => {
  const isCompleted = session.is_completed === true;

  // 🔒 Feature Checks
  // 🔒 Feature Checks
  const canDelete = allowedFeatures?.includes('action_delete_session');
  const canManage = allowedFeatures?.includes('action_manage_sessions');

  // هل المستخدم ممنوع من الحذف؟ (لو هو موظف + السيشن مقفولة)
  const isDeleteDisabled = userRole === 'staff' && isCompleted;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 flex flex-col md:flex-row justify-between items-center gap-4 transition hover:shadow-md ${isCompleted ? 'opacity-90 grayscale-[0.5] border-gray-300' : 'border-l-4 border-l-blue-500'}`}>
      <div className="flex-1 w-full text-right">
        <h3 className={`font-bold text-lg mb-1 ${isCompleted ? 'text-gray-600' : 'text-blue-600'}`}>
          {course?.name || 'غير معروف'} <span className="text-blue-600 font-black">({group?.name || 'بدون مجموعة'})</span>
          <span className="text-gray-800 font-medium text-base">: {session.topic}</span>

          {/* إضافة توقيت الحصة والبدء الفعلي */}
          <span className="mr-2 text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 font-bold">
            ⏰ {session.scheduled_start_time ? (
              (() => {
                const [h, m] = session.scheduled_start_time.split(':');
                let hours = parseInt(h);
                const ampm = hours >= 12 ? 'م' : 'ص';
                hours = hours % 12 || 12;
                return `${hours}:${m} ${ampm}`;
              })()
            ) : '--:--'}
          </span>

          {session.actual_start_time && (
            <span className="mr-1 text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded border border-green-100 font-bold">
              ✍️ بدأ الشرح
            </span>
          )}

          {session.session_type === 'exam' && (
            <span className="mr-2 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200 font-black animate-pulse">
              📝 امتحان
            </span>
          )}

          {isCompleted && <span className="mr-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded border border-gray-300 font-bold">منتهية 🔒</span>}
        </h3>
        <p className="text-gray-500 text-sm">👨‍🏫 {course?.instructors?.name || course?.instructor || 'غير معروف'} | 📅 {new Date(session.created_at).toLocaleDateString('ar-EG')}</p>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <div className="stat-badge bg-yellow-50 text-yellow-800 border-yellow-200">
          <span>الحضور</span>
          <strong>{stats.count}</strong>
        </div>
        <div className="stat-badge bg-green-50 text-green-800 border-green-200">
          <span>الدخل</span>
          <strong>{stats.totalIncome.toFixed(2)}</strong>
        </div>
        <div className="stat-badge bg-red-50 text-red-800 border-red-200">
          <span>السنتر</span>
          <strong>{stats.centerTotal.toFixed(2)}</strong>
        </div>
        <div className="stat-badge bg-blue-50 text-blue-800 border-blue-200">
          <span>المدرس</span>
          <strong>{stats.teacherTotal.toFixed(2)}</strong>
        </div>
      </div>

      <div className="flex gap-2 mt-2 md:mt-0">
        <button
          onClick={() => canManage && onOpenSession(session)}
          disabled={!canManage}
          className={`px-5 py-2 rounded font-bold text-sm transition flex items-center gap-2
            ${canManage
              ? 'bg-gray-700 hover:bg-black text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
          title={!canManage ? "🔒 تتطلب ترقية الباقة" : "إدارة الدفتر"}
        >
          {canManage ? 'إدارة الدفتر' : <span>إدارة الدفتر <FaLock className="inline mb-1 mx-1 text-xs" /></span>}
        </button>

        <button
          onClick={() => onDeleteSession(session.id, isCompleted)}
          disabled={isDeleteDisabled || !canDelete} // 🔒
          className={`
            flex items-center gap-2 px-3 py-2 rounded font-bold text-sm transition-all
            ${(isDeleteDisabled || !canDelete)
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
            }
          `}
          title={!canDelete ? "🔒 تتطلب ترقية الباقة" : isDeleteDisabled ? "لا يمكن حذف حصة مغلقة" : "حذف الحصة"}
        >
          <FaTrash />
          {!canDelete ? <span className="text-[10px]">🔒</span> : (isDeleteDisabled ? "مقفولة" : "حذف")}
        </button>
      </div>
    </div>
  );
};

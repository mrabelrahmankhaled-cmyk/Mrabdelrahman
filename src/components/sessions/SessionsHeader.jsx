'use client';
import { FaChalkboardTeacher, FaCalendarAlt, FaFilter, FaUndo } from 'react-icons/fa';

/**
 * SessionsHeader component
 * Contains logo, title, and filter controls
 */
export const SessionsHeader = ({
  centerConfig,
  reportMonth,
  setReportMonth,
  generateReport,
  filterGrade,
  setFilterGrade,
  filterCourse,
  setFilterCourse,
  filterDate,
  setFilterDate,
  availableGrades,
  courses
}) => {
  return (
    <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6 print:hidden">
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          {centerConfig?.logo_url ? (
            <img
              src={centerConfig.logo_url}
              alt="Logo"
              className="h-14 sm:h-20 md:h-24 w-auto object-contain transition-all"
            />
          ) : (
            <FaChalkboardTeacher className="text-blue-600 text-2xl sm:text-4xl" />
          )}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
            {centerConfig?.center_name || "الأوائل"}
          </h1>
        </div>
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border w-full sm:w-auto">
          <input
            type="month"
            value={reportMonth}
            onChange={e => setReportMonth(e.target.value)}
            className="bg-transparent border-none text-sm p-1 outline-none flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
          />
          <button
            onClick={() => generateReport('monthly')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-1.5 rounded-md font-bold text-xs sm:text-sm ml-2 transition min-h-[44px] sm:min-h-0"
          >
            عرض شهري
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 shadow-inner">
        <div className="w-full">
          <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">تصفية بالصف</label>
          <select
            value={filterGrade}
            onChange={e => setFilterGrade(e.target.value)}
            className="w-full min-h-[44px] px-3 border border-gray-300 rounded-lg bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
          >
            <option value="">كل الصفوف</option>
            {availableGrades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">تصفية بالمادة</label>
          <select
            value={filterCourse}
            onChange={e => setFilterCourse(e.target.value)}
            className="w-full min-h-[44px] px-3 border border-gray-300 rounded-lg bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
          >
            <option value="">كل المواد</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.instructors?.name || c.instructor || 'غير محدد'}</option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">تصفية بالتاريخ</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full min-h-[44px] px-3 border border-gray-300 rounded-lg bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={() => generateReport('daily')}
            className="flex-1 min-h-[44px] bg-[#00a651] hover:bg-[#008541] text-white rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <FaCalendarAlt className="text-xs" /> تقرير اليوم
          </button>

          {(filterDate || filterCourse || filterGrade) && (
            <button
              onClick={() => { setFilterDate(''); setFilterCourse(''); setFilterGrade(''); }}
              className="w-[44px] min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg flex items-center justify-center transition shadow-sm"
            >
              <FaUndo className="text-xs" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

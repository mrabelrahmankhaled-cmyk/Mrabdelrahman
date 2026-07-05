'use client';
import { useState } from 'react';
import { supabaseBrowser } from '../../../../lib/supabase';
import { FaSync, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId

export default function GradeSyncManager() {
  const { centerId } = useAuth(); // ← استخراج centerId من الـ context
  
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const syncAllTables = async () => {
    if (!centerId) {
      toast.error('⚠️ لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    
    setSyncing(true);
    setSyncStatus(null);
    
    try {
      // Step 1: Get all educational stages for this center
      const { data: stages, error: stagesError } = await supabaseBrowser
        .from('educational_stages')
        .select('name, sort_order')
        .eq('center_id', centerId) // ← فلترة حسب المركز
        .order('sort_order');

      if (stagesError) throw stagesError;

      // Step 2: Update courses table to match educational_stages for this center
      const { error: coursesError } = await supabaseBrowser.rpc('sync_courses_to_educational_stages', { p_center_id: centerId });
      if (coursesError) throw coursesError;

      // Step 3: Update students table to match educational_stages for this center
      const { error: studentsError } = await supabaseBrowser.rpc('sync_students_to_educational_stages', { p_center_id: centerId });
      if (studentsError) throw studentsError;

      // Step 4: Verify the sync for this center
      const { data: verification, error: verifyError } = await supabaseBrowser
        .from('educational_stages')
        .select(`
          name,
          courses!inner(count),
          students!inner(count)
        `)
        .eq('center_id', centerId); // ← فلترة حسب المركز

      if (verifyError) throw verifyError;

      setSyncStatus({
        type: 'success',
        message: `تم مزامنة ${stages.length} مراحل بنجاح!`,
        details: verification
      });

      toast.success('تم مزامنة كل الجداول بنجاح! ✅');

    } catch (error) {
      console.error('Sync Error:', error);
      setSyncStatus({
        type: 'error',
        message: 'فشلت المزامنة: ' + error.message
      });
      toast.error('فشلت المزامنة! ❌');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaSync className="text-yellow-600 text-xl" />
          <div>
            <h4 className="font-bold text-yellow-800">مزامنة أسماء الصفوف</h4>
            <p className="text-sm text-yellow-600">
              عند تغيير أسماء المراحل، قم بمزامنة الجداول الأخرى لضمان التوافق
            </p>
          </div>
        </div>
        
        <button
          onClick={syncAllTables}
          disabled={syncing}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {syncing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              جاري المزامنة...
            </>
          ) : (
            <>
              <FaSync />
              مزامنة الآن
            </>
          )}
        </button>
      </div>

      {syncStatus && (
        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
          syncStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {syncStatus.type === 'success' ? (
            <FaCheckCircle />
          ) : (
            <FaExclamationTriangle />
          )}
          <span className="font-bold">{syncStatus.message}</span>
        </div>
      )}
    </div>
  );
}

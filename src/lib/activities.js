import { supabase } from './supabase-browser';

export const logActivity = async (studentUniqueId, type, title, description, note = "", centerId) => {
  // التحقق من وجود centerId
  if (!centerId) {
    console.error('centerId is required for logActivity');
    return;
  }
  
  const { error } = await supabase
    .from('student_activities')
    .insert([{
      student_unique_id: studentUniqueId, // ← استخدم unique_id بدل student_id
      type: type, 
      title: title,
      description: description,
      note: note,
      center_id: centerId
    }]);
    
  if (error) console.error("Error logging activity:", error);
};

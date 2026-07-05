import { supabase } from './supabase-browser';

export const getCenterSettings = async (centerId) => {
  try {
    if (!centerId) {
      console.error('centerId is required for getCenterSettings');
      return {
        center_name: 'Smart Center',
        logo_url: null,
        primary_color: '#2563eb',
        description: '',
        center_type: 'center',
      };
    }
    
    // نجيب center_settings + center_type من centers بضربة واحدة
    const [{ data, error }, { data: centerData }] = await Promise.all([
      supabase.from('center_settings').select('*').eq('center_id', centerId).single(),
      supabase.from('centers').select('center_type').eq('id', centerId).single(),
    ]);
    
    if (error) {
      console.error('Error fetching center settings:', error);
      return {
        center_name: 'Smart Center',
        logo_url: null,
        primary_color: '#2563eb',
        description: '',
        center_type: 'center',
      };
    }

    const centerType = centerData?.center_type || 'center';
    const isInstructor = centerType === 'instructor';
    
    return {
      // ── هوية المركز ──
      center_type: centerType,
      is_instructor_mode: isInstructor,

      // ── الاسم والشعار (يتغير حسب الوضع) ──
      name: isInstructor
        ? (data?.instructor_name || data?.center_name || 'Smart Center')
        : (data?.center_name || 'Smart Center'),
      logo_url: isInstructor
        ? (data?.instructor_photo_url || data?.logo_url || null)
        : (data?.logo_url || null),
      logo: data?.logo_url
        ? data.logo_url.split('/').pop().substring(0, 2).toUpperCase()
        : 'SC',

      // ── الإعدادات الأساسية ──
      primary_color: data?.primary_color || '#2563eb',
      description: data?.address || (isInstructor ? (data?.instructor_title || '') : 'مركزك التعليمي الأول'),
      phone: data?.center_phone || '',
      address: data?.address || '',
      next_student_code: data?.next_student_code || 100000,
      student_code_prefix: data?.student_code_prefix || 'S',

      // ── بيانات المدرس (Instructor Mode) ──
      instructor_name: data?.instructor_name || null,
      instructor_photo_url: data?.instructor_photo_url || null,
      instructor_bio: data?.instructor_bio || null,
      instructor_title: data?.instructor_title || null,
      instructor_subject: data?.instructor_subject || null,

      // ── للتوافق مع الكود القديم ──
      center_name: data?.center_name || 'Smart Center',
      logo_url_original: data?.logo_url || null,
    };
  } catch (error) {
    console.error('Error in getCenterSettings:', error);
    return {
      center_name: 'Smart Center',
      logo_url: null,
      primary_color: '#2563eb',
      description: '',
      center_type: 'center',
      is_instructor_mode: false,
    };
  }
};

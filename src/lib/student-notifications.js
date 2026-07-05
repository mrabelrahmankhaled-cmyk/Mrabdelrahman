import { messaging, getToken } from "./firebase";
import { supabase } from "./supabase-browser";

/**
 * Setup Push Notifications for STUDENTS (not parents)
 * Uses student_device_tokens table
 */
export const setupStudentPushNotifications = async (studentId, centerId) => {
  try {
    // التحقق من وجود centerId
    if (!centerId) {
      console.error('centerId is required for setupStudentPushNotifications');
      return false;
    }
    
    // 1. طلب الإذن من المستخدم
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied by user');
      return false;
    }

    // 2. الـ VAPID KEY الخاص بك
    const RAW_VAPID_KEY = 'BMiqgECKlDav9WKNigHkqLKDABos9s0yM6uTjR3fYa4zLjzYVbrFTeP6sLi6T-K8OP-9W7hhmGzhowsFrNispHI';
    
    // 3. الحصول على التوكن من Firebase
    const token = await getToken(messaging, { 
      vapidKey: RAW_VAPID_KEY
    });

    if (token) {
      console.log('✅ Student FCM Token generated successfully:', token);

      // 4. تخزين التوكن في student_device_tokens table
      const response = await supabase
        .from('student_device_tokens')
        .upsert({ 
          student_id: studentId, 
          device_token: token,
          device_type: 'web',
          center_id: centerId,
          created_at: new Date().toISOString()
        }, { 
         onConflict: 'device_token'
        });

      if (response.error) {
        console.error('❌ Student Supabase Error:', response.error.message);
        throw response.error;
      }

      console.log('✅ Student Token successfully stored/updated in Supabase');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Student Push Notification Setup Error:', error);
    return false;
  }
};

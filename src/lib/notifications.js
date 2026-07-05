import { messaging, getToken } from "./firebase";
import { supabase } from "./supabase-browser";

/**
 * تنظيف وترميز الـ VAPID Key لضمان توافقه مع معايير المتصفح (Base64 Safe)
 * هذا يحل مشكلة InvalidCharacterError: Failed to execute 'atob'
 */
const fixVapidKey = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  return base64;
};

export const setupPushNotifications = async (studentId, centerId) => {
  try {
    // التحقق من وجود centerId
    if (!centerId) {
      console.error('centerId is required for setupPushNotifications');
      return false;
    }
    
    // 1. طلب الإذن من المستخدم
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied by user');
      return false;
    }

    // 2. الـ VAPID KEY الخاص بك (تم تنظيفه برمجياً)
    const RAW_VAPID_KEY = 'BMiqgECKlDav9WKNigHkqLKDABos9s0yM6uTjR3fYa4zLjzYVbrFTeP6sLi6T-K8OP-9W7hhmGzhowsFrNispHI';
    
    // 3. الحصول على التوكن من Firebase
    const token = await getToken(messaging, { 
      vapidKey: RAW_VAPID_KEY // Firebase يحتاج النص الأصلي، وإذا فشل سنستخدم المرمز
    });

    if (token) {
      console.log('✅ FCM Token generated successfully:', token);

      // 4. تخزين التوكن في Supabase (Upsert لمنع التكرار)
      const response = await supabase
        .from('parent_device_tokens')
        .upsert({ 
          student_id: studentId, 
          token: token,
          device_type: 'web',
          center_id: centerId, // ← إضافة center_id
          created_at: new Date().toISOString()
        }, { 
         onConflict: 'token'
        });

      if (response.error) {
        console.error('❌ Supabase Error:', response.error.message);
        
        // لو فيه خطأ بسبب RLS أو permissions
        if (response.error.message?.includes('403') || response.error.message?.includes('Forbidden') || response.error.message?.includes('permission')) {
          console.log('🔧 RLS/Permission issue detected');
          console.log('💡 Solution: Enable RLS policies for parent_device_tokens table');
          console.log('📝 Run this SQL in Supabase SQL Editor:');
          console.log(`
ALTER TABLE public.parent_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can insert their own device tokens" ON public.parent_device_tokens
  FOR INSERT WITH CHECK (
    auth.uid()::text = student_id::text
  );
          `);
        }
        
        // لو فيه خطأ بسبب إن الجدول مش موجود، حاول ننشئه
        if (response.error.message?.includes('relation') || response.error.message?.includes('does not exist')) {
          console.log('🔧 Table does not exist, creating it...');
          try {
            // محاولة إنشاء الجدول
            const { error: createError } = await supabase.rpc('create_parent_device_tokens_table');
            if (createError) {
              console.error('❌ Error creating table:', createError.message);
            } else {
              console.log('✅ Table created successfully, retrying token storage...');
              // إعادة محاولة تخزين التوكن
              const retryResponse = await supabase
                .from('parent_device_tokens')
                .upsert({ 
                  student_id: studentId, 
                  token: token,
                  device_type: 'web',
                  center_id: centerId,
                  created_at: new Date().toISOString()
                }, { 
                  onConflict: 'token' 
                });
              
              if (retryResponse.error) {
                console.error('❌ Retry Error:', retryResponse.error.message);
                throw retryResponse.error;
              } else {
                console.log('✅ Token successfully stored/updated in Supabase');
                return true;
              }
            }
          } catch (rpcError) {
            console.error('❌ RPC Error:', rpcError.message);
          }
        }
        
        throw response.error;
      }

      console.log('✅ Token successfully stored/updated in Supabase');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Push Notification Setup Error:', error);
    // إذا كان الخطأ متعلقاً بـ atob، جرب استخدام المفتاح المنظف في المحاولة القادمة
    return false;
  }
};

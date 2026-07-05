import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// ✅ لا تشتغل لو مفيش إعدادات Firebase — بدون تحذيرات
const isConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.appId);

let app = null;
let messaging = null;
let isMessagingSupported = false;

if (isConfigured) {
  // فقط أنشئ instance واحد (Singleton Pattern)
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  // Firebase Messaging — فقط في المتصفح
  if (typeof window !== "undefined") {
    try {
      messaging = getMessaging(app);
      isMessagingSupported = true;
    } catch (error) {
      // بعض المتصفحات لا تدعم Messaging (مثل Safari القديم)
      console.warn('Firebase Messaging not supported in this browser:', error.message);
    }
  }
} else {
  // Firebase غير مضبوط — Push Notifications معطّلة
  // لتفعيلها: أضف NEXT_PUBLIC_FIREBASE_* في ملف .env.local
}

export { app, messaging, getToken, onMessage, isMessagingSupported };

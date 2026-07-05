importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC_TPYD_k1cwm4qDoRAPIAm4tYYJsWrpkI", // المفتاح الجديد
  messagingSenderId: "308470601576",
  projectId: "smart-center-1bf42",
  appId: "1:308470601576:web:3f2c7d080815e9e51be8dd"
});

const messaging = firebase.messaging();

// التعامل مع الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('إشعار في الخلفية:', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'تنبيه جديد';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'لديك رسالة جديدة من المنصة',
    icon: '/logo.png', // تأكد من وجود الصورة في فولدر public
    badge: '/badge.png', // أيقونة صغيرة تظهر في شريط الإشعارات للأندرويد
    data: {
        url: payload.data?.url || '/student/inbox' // الرابط اللي هيفتح لما يضغط
    },
    vibrate: [200, 100, 200] // اهتزاز للموبايل
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// إضافة مستمع لحدث الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
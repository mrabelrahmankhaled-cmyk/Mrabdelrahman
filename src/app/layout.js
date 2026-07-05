import { Cairo } from "next/font/google"; // 👈 استدعاء خط كايرو
import "./globals.css";
import { Providers } from "../components/providers";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactQueryProvider from '../components/ReactQueryProvider';

// 1. تعريف خط كايرو بجميع أوزانه
const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const queryClient = new QueryClient();

export const metadata = {
  title: "الأستاذ عبدالرحمن خالد | منصتك الأولى لتعلم الكيمياء",
  description: "المنصة التعليمية الرسمية للأستاذ عبدالرحمن خالد لتعلم وفهم الكيمياء بأحدث الأساليب.",
  icons: {
    icon: '/icon.png',
  },
};

export const viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      {/* 2. حطينا cairo.className هنا عشان يجبر المشروع كله يستخدمه */}
      <body className={`${cairo.className} bg-gray-50 text-gray-900 min-h-screen antialiased overflow-x-hidden selection:bg-blue-200 selection:text-blue-900`}>
        <ReactQueryProvider>
          <Providers>
            {children}
          </Providers>
        </ReactQueryProvider>
        
        {/* نظام كشف الأخطاء للموبايل - يفتح فقط عند إضافة ?debug=true للرابط */}
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
            var script = document.createElement('script');
            script.src = "//cdn.jsdelivr.net/npm/eruda";
            document.body.appendChild(script);
            script.onload = function () { eruda.init() };
          }
        `}} />
      </body>
    </html>
  );
}
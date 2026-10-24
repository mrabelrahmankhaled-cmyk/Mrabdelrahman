import { Cairo } from "next/font/google"; // 👈 استدعاء خط كايرو
import "./globals.css";
import { Providers } from "../components/providers";
import ReactQueryProvider from '../components/ReactQueryProvider';
// 1. تعريف خط كايرو بالأوزان الأساسية لتحسين سرعة التحميل
const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mr-abdelrahman-khaled.com';

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "الدكتور عبدالرحمن خالد | منصتك الأولى لتعلم الكيمياء",
    template: "%s | د. عبدالرحمن خالد",
  },
  description: "المنصة التعليمية الرسمية للدكتور عبدالرحمن خالد لتعلم وفهم الكيمياء للثانوية العامة بأحدث الأساليب وشرح مبسط واختبارات دورية.",
  keywords: [
    "كيمياء",
    "الدكتور عبدالرحمن خالد",
    "شرح كيمياء ثانوية عامة",
    "منصة كيمياء",
    "كورسات كيمياء أونلاين",
    "امتحانات كيمياء",
    "مدرس كيمياء ثانوية عامة",
  ],
  authors: [{ name: "د. عبدالرحمن خالد" }],
  creator: "د. عبدالرحمن خالد",
  publisher: "منصة الدكتور عبدالرحمن خالد",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "الدكتور عبدالرحمن خالد | منصتك الأولى لتعلم الكيمياء",
    description: "المنصة التعليمية الرسمية للدكتور عبدالرحمن خالد لتعلم وفهم الكيمياء بأحدث الأساليب.",
    url: baseUrl,
    siteName: "منصة الدكتور عبدالرحمن خالد",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: "/hero-image.png",
        width: 1200,
        height: 630,
        alt: "منصة الدكتور عبدالرحمن خالد للكيمياء",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "الدكتور عبدالرحمن خالد | منصتك الأولى لتعلم الكيمياء",
    description: "المنصة التعليمية الرسمية للدكتور عبدالرحمن خالد لتعلم وفهم الكيمياء بأحدث الأساليب.",
    images: ["/hero-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${baseUrl}/#organization`,
      "name": "منصة الدكتور عبدالرحمن خالد",
      "url": baseUrl,
      "logo": `${baseUrl}/logo.png`,
      "description": "المنصة التعليمية الرسمية للدكتور عبدالرحمن خالد لتعلم وفهم الكيمياء بأحدث الأساليب."
    },
    {
      "@type": "Person",
      "@id": `${baseUrl}/#instructor`,
      "name": "د. عبدالرحمن خالد",
      "jobTitle": "مدرس كيمياء",
      "worksFor": { "@id": `${baseUrl}/#organization` }
    }
  ]
};

export const viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
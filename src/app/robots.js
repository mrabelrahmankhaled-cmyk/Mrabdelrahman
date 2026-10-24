export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mr-abdelrahman-khaled.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/student/', '/parent/', '/expired'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

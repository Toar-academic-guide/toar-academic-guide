import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/context/AuthContext';
import JsonLd from '@/components/seo/JsonLd';
import { organizationLd, websiteLd } from '@/lib/seo/jsonLd';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'MyWay',
  title: {
    default: 'MyWay | הדרך שלך ללימודים',
    template: '%s | MyWay',
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
    url: '/',
  },
  twitter: { card: 'summary' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full antialiased">
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}

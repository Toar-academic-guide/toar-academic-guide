import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/context/AuthContext';
import SiteFooter from '@/components/SiteFooter';
import SkipLink from '@/components/SkipLink';
import JsonLd from '@/components/seo/JsonLd';
import { organizationLd, websiteLd } from '@/lib/seo/jsonLd';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'MyWay',
  manifest: '/site.webmanifest',
  title: {
    default: 'MyWay | הדרך שלך ללימודים',
    template: '%s | MyWay',
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'MyWay — הדרך ללימודים שלכם מתחילה כאן.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'MyWay — הדרך ללימודים שלכם מתחילה כאן.',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0C1D45' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <head>
        <link
          rel="preload"
          href="/fonts/heebo-variable.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full antialiased">
        <SkipLink />
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <AuthProvider>{children}</AuthProvider>
        <SiteFooter />
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  );
}

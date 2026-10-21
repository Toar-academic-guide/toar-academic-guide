import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'MyWay',
  title: {
    default: 'MyWay | הדרך שלך ללימודים',
    template: '%s | MyWay',
  },
  description: 'השותף שלך לדרך האקדמית — שאלון אישיות, המלצות תחומי לימוד, וחישוב סיכויי קבלה',
  openGraph: {
    siteName: 'MyWay',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}

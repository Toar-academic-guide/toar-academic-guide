import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'מדריך האקדמיה לחייל המשוחרר',
  description: 'כלי לחישוב סיכויי קבלה לאוניברסיטאות בישראל',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}

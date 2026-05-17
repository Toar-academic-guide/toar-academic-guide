import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "מדריך האקדמיה לחייל המשוחרר",
  description: "כלי לחישוב סיכויי קבלה לאוניברסיטאות בישראל",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${inter.className} h-full`}>
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">
        <header className="border-b border-gray-200 bg-white py-12">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4 sm:px-6">
            <Image
              src="/logo.jpg.PNG"
              alt="לוגו"
              width={480}
              height={160}
              className="h-40 w-auto object-contain"
              priority
            />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              מדריך האקדמיה לחייל המשוחרר
            </h1>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import StudyJourney from '@/components/StudyJourney';
import JsonLd from '@/components/seo/JsonLd';
import { webApplicationLd } from '@/lib/seo/jsonLd';
import { absoluteUrl } from '@/lib/site';

const title = 'מחשבון סיכויי קבלה לתואר לפי בגרות ופסיכומטרי | MyWay';
const description =
  'בדיקת סיכויי קבלה לתואר לפי בגרות ופסיכומטרי עם מחשבון סיכויי קבלה בחינם לסטודנטים.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  // Next 16 strips a root URL to its origin when metadataBase is set.
  metadataBase: null,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
    url: absoluteUrl('/'),
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: absoluteUrl('/opengraph-image.png'),
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'MyWay — הדרך ללימודים שלכם מתחילה כאן.',
      },
    ],
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={webApplicationLd()} />
      <StudyJourney />
    </>
  );
}

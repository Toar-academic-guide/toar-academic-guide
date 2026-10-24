import type { Metadata } from 'next';
import StudyJourney from '@/components/StudyJourney';
import JsonLd from '@/components/seo/JsonLd';
import { webApplicationLd } from '@/lib/seo/jsonLd';
import { absoluteUrl, SITE_DESCRIPTION } from '@/lib/site';

export const metadata: Metadata = {
  // Next 16 strips a root URL to its origin when metadataBase is set.
  metadataBase: null,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
    url: absoluteUrl('/'),
    title: 'MyWay | הדרך שלך ללימודים',
    description: SITE_DESCRIPTION,
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

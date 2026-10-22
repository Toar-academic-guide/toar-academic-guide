import type { Metadata } from 'next';
import StudyJourney from '@/components/StudyJourney';
import JsonLd from '@/components/seo/JsonLd';
import { webApplicationLd } from '@/lib/seo/jsonLd';
import { SITE_DESCRIPTION } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
    url: '/',
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

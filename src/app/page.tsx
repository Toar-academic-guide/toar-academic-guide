import StudyJourney from '@/components/StudyJourney';
import JsonLd from '@/components/seo/JsonLd';
import { webApplicationLd } from '@/lib/seo/jsonLd';

export default function Home() {
  return (
    <>
      <JsonLd data={webApplicationLd()} />
      <StudyJourney />
    </>
  );
}

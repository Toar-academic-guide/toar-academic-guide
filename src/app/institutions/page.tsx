import InstitutionsDirectory from '@/components/InstitutionsDirectory';
import { getPublicInstitutionDirectoryData } from '@/lib/institutionDirectoryData';
import JsonLd from '@/components/seo/JsonLd';
import { institutionDirectoryLd } from '@/lib/seo/jsonLd';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'מוסדות לימוד בישראל – השוואה לפי תחום לימודים',
  description: 'מצאו מוסדות לימוד לפי תחום ותכנית לימודים, מיקום וסוג מוסד.',
  alternates: { canonical: '/institutions' },
  openGraph: {
    title: 'מוסדות לימוד בישראל – השוואה לפי תחום לימודים',
    description: 'מצאו מוסדות לימוד לפי תחום ותכנית לימודים, מיקום וסוג מוסד.',
    url: '/institutions',
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
  },
};

export default async function InstitutionsPage() {
  const data = await getPublicInstitutionDirectoryData();
  return (
    <>
      <JsonLd data={institutionDirectoryLd(data.institutions)} />
      <InstitutionsDirectory {...data} />
    </>
  );
}

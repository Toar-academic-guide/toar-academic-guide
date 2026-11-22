import InstitutionsDirectory from '@/components/InstitutionsDirectory';
import { getPublicInstitutionDirectoryData } from '@/lib/institutionDirectoryData';
import JsonLd from '@/components/seo/JsonLd';
import { institutionDirectoryLd } from '@/lib/seo/jsonLd';
import { shareCards, socialMetadata } from '@/lib/seo/shareCards';

export const dynamic = 'force-dynamic';

const title = 'מוסדות לימוד בישראל – השוואה לפי תחום לימודים';
const description = 'מצאו מוסדות לימוד לפי תחום ותכנית לימודים, מיקום וסוג מוסד.';

export const metadata = {
  title,
  description,
  alternates: { canonical: '/institutions' },
  ...socialMetadata(shareCards.institutions, title, description, '/institutions'),
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

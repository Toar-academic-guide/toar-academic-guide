import InstitutionsDirectory from '@/components/InstitutionsDirectory';
import { getInstitutionDirectoryItems } from '@/data/institutionDirectory';

export const metadata = {
  title: 'מוסדות לימוד',
  description: 'קטלוג מוסדות לימוד בישראל לפי אזור, סוג מוסד, תעודה ומימון.',
  alternates: { canonical: '/institutions' },
  openGraph: {
    title: 'מוסדות לימוד',
    description: 'קטלוג מוסדות לימוד בישראל לפי אזור, סוג מוסד, תעודה ומימון.',
    url: '/institutions',
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
  },
};

export default function InstitutionsPage() {
  return <InstitutionsDirectory institutions={getInstitutionDirectoryItems()} />;
}

import InstitutionsDirectory from '@/components/InstitutionsDirectory';
import { getInstitutionDirectoryItems } from '@/data/institutionDirectory';

export const metadata = {
  title: 'מוסדות לימוד | Way',
  description: 'קטלוג מוסדות לימוד בישראל לפי אזור, סוג מוסד, תעודה ומימון.',
};

export default function InstitutionsPage() {
  return <InstitutionsDirectory institutions={getInstitutionDirectoryItems()} />;
}


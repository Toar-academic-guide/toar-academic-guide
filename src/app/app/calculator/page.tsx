import type { Metadata } from 'next';
import StudyJourney from '@/components/StudyJourney';

const TITLE = 'מחשבון סיכויי קבלה לתואר';
const DESCRIPTION =
  'מחשבון סיכויי קבלה של MyWay: בדיקת סיכויי קבלה ראשונית לתואר לפי ממוצע הבגרות והפסיכומטרי שהזנתם, מול תנאי הקבלה שפרסמו המוסדות. ההחלטה המחייבת אצל המוסד.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `${TITLE} | MyWay`,
    description: DESCRIPTION,
    url: '/app/calculator',
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
  },
  twitter: { card: 'summary', title: `${TITLE} | MyWay`, description: DESCRIPTION },
};

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string | string[] }>;
}) {
  const { program } = await searchParams;
  return (
    <StudyJourney
      initialStep="subjects"
      initialProgramId={typeof program === 'string' ? program : undefined}
    />
  );
}

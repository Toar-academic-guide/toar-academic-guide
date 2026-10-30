import type { Metadata } from 'next';
import StudyJourney from '@/components/StudyJourney';

const TITLE = 'מחשבון סיכויי קבלה לתואר';
const DESCRIPTION =
  'מזינים בגרות ופסיכומטרי, ורואים לאן אתם מתקבלים. חינם, בלי הרשמה, מול תנאי הקבלה הרשמיים.';

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

export default function CalculatorPage() {
  return <StudyJourney initialStep="subjects" />;
}

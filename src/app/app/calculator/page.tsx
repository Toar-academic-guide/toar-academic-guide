import type { Metadata } from 'next';
import StudyJourney from '@/components/StudyJourney';
import { shareCards, socialMetadata } from '@/lib/seo/shareCards';

const TITLE = 'מחשבון סיכויי קבלה לתואר';
const DESCRIPTION =
  'מזינים בגרות ופסיכומטרי, ורואים לאן אתם מתקבלים. חינם, בלי הרשמה, מול תנאי הקבלה הרשמיים.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...socialMetadata(shareCards.admission, `${TITLE} | MyWay`, DESCRIPTION, '/app/calculator'),
};

export default function CalculatorPage() {
  return <StudyJourney initialStep="subjects" />;
}

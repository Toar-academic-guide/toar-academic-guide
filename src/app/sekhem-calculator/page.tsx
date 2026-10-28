import type { Metadata } from 'next';
import WayPageShell from '@/components/WayPageShell';
import SekhemCalculator from '@/components/sekhem/SekhemCalculator';
import { loadSekhemCalculatorOfferings } from '@/lib/sekhemCalculatorSupport';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { absolute: 'מחשבון סכם וסיכויי קבלה לפי מוסד ותוכנית | MyWay' },
  description:
    'מחשבון סכם וסיכויי קבלה בחינם: מזינים ציוני בגרות ופסיכומטרי, מחשבים סכם לפי נוסחאות המוסדות הנתמכים וממשיכים לבדיקת התוכנית שמעניינת אותך.',
  alternates: { canonical: 'https://findmyway.co.il/sekhem-calculator' },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ program?: string }>;
}) {
  const [offerings, params] = await Promise.all([loadSekhemCalculatorOfferings(), searchParams]);
  const initialProgramId = offerings.some((row) => row.programId === params.program)
    ? params.program
    : undefined;
  return (
    <WayPageShell contentClassName="pt-28">
      <main
        id="main-content"
        dir="rtl"
        className="sekhem-calculator mx-auto max-w-3xl px-4 pb-16 pt-8 text-right sm:px-6"
      >
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            מחשבון סכם וסיכויי קבלה
          </h1>
          <p className="mt-4 text-(--text-body)">
            ציוני הבגרות והפסיכומטרי שלך. סכם לפי מוסד ותוכנית.
          </p>
        </header>
        <SekhemCalculator offerings={offerings} initialProgramId={initialProgramId} />
        <section className="mt-14 space-y-7 leading-7">
          <div>
            <h2 className="text-xl font-semibold">מה הסכם אומר?</h2>
            <p className="mt-2 text-(--text-body)">
              לכל מוסד נוסחה וסולם ציונים משלו. הסכם הוא חלק מתנאי הקבלה; בקישור לתוכנית אפשר לבדוק
              את התנאים הנוספים.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">יש גם דרכים אחרות להתקבל</h2>
            <p className="mt-2 text-(--text-body)">
              בחלק מהתוכניות יש אפיק ללא פסיכומטרי, אפיק על בסיס פסיכומטרי בלבד או קבלה דרך מכינה.
            </p>
          </div>
        </section>
      </main>
    </WayPageShell>
  );
}

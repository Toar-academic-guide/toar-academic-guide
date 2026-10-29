import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import SekhemCalculator from '@/components/sekhem/SekhemCalculator';
import JsonLd from '@/components/seo/JsonLd';
import { loadSekhemCalculatorOfferings } from '@/lib/sekhemCalculatorSupport';
import { getPublicProgramPageData } from '@/lib/publicCataloguePages';
import { canonicalProgramId, canonicalProgramPath } from '@/lib/seo/programAliases';
import { sekhemCalculatorLd } from '@/lib/seo/jsonLd';
import { absoluteUrl, SITE_NAME } from '@/lib/site';

const title = 'מחשבון סכם וסיכויי קבלה לפי מוסד ותוכנית | MyWay';
const description =
  'מחשבון סכם וסיכויי קבלה בחינם: מזינים ציוני בגרות ופסיכומטרי, בוחרים תוכנית נתמכת ומקבלים הערכה, עם קישור לתנאי הקבלה של התוכנית.';
const canonical = absoluteUrl('/sekhem-calculator');

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical },
  openGraph: {
    title,
    description,
    url: canonical,
    type: 'website',
    locale: 'he_IL',
    siteName: SITE_NAME,
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ program?: string }>;
}) {
  const [offerings, params] = await Promise.all([loadSekhemCalculatorOfferings(), searchParams]);
  const institutionNames = [...new Set(offerings.map((o) => o.institutionName))].sort((a, b) =>
    a.localeCompare(b, 'he'),
  );
  const requestedId = params.program ? canonicalProgramId(params.program) : undefined;
  const initialProgramId = offerings.some((row) => row.programId === requestedId)
    ? requestedId
    : undefined;
  const unavailable = !!requestedId && !initialProgramId;
  const publicPage = unavailable ? await getPublicProgramPageData(requestedId) : null;
  const publicProgram =
    publicPage?.program.type === 'academic' && publicPage.program.isListed !== false
      ? publicPage.program
      : undefined;
  return (
    <WayPageShell contentClassName="pt-28">
      <main
        id="main-content"
        dir="rtl"
        className="sekhem-calculator mx-auto max-w-3xl px-4 pb-16 pt-8 text-right sm:px-6"
      >
        <JsonLd data={sekhemCalculatorLd()} />
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            מחשבון סכם וסיכויי קבלה
          </h1>
          <p className="mt-4 text-(--text-body)">
            ציוני הבגרות והפסיכומטרי שלך. סכם לפי מוסד ותוכנית.
          </p>
        </header>
        {unavailable ? (
          <section className="space-y-4">
            <p>אי אפשר לחשב כאן את סיכויי הקבלה לתוכנית הזו.</p>
            {publicProgram ? (
              <Link
                className="block underline underline-offset-4"
                href={canonicalProgramPath(publicProgram.id)}
              >
                לתנאי הקבלה של התוכנית
              </Link>
            ) : (
              <Link className="block underline underline-offset-4" href="/contact">
                יצירת קשר
              </Link>
            )}
            <Link className="block underline underline-offset-4" href="/sekhem-calculator">
              לחישוב תוכנית אחרת
            </Link>
          </section>
        ) : (
          <SekhemCalculator offerings={offerings} initialProgramId={initialProgramId} />
        )}
        <section className="mt-14 space-y-7 leading-7" aria-labelledby="sekhem-faq-title">
          <h2 id="sekhem-faq-title" className="sr-only">
            שאלות על מחשבון הסכם
          </h2>
          <div>
            <h2 className="text-xl font-semibold">מה זה סכם?</h2>
            <p className="mt-2 text-(--text-body)">
              סכם הוא ציון קבלה שמשלב את ממוצע הבגרות ואת הציון הפסיכומטרי. כל מוסד קובע נוסחה וסולם
              משלו, ובחלק מהמוסדות הוא נקרא בשם אחר.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">איך מחשבים כאן?</h2>
            <p className="mt-2 text-(--text-body)">
              בוחרים תוכנית, מזינים ציוני בגרות ופסיכומטרי, והמחשבון מציג הערכה לפי הנתונים שיש לנו
              לאותה תוכנית. בקישור לתוכנית אפשר לבדוק את שאר תנאי הקבלה.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">באילו מוסדות ותוכניות אפשר לבדוק כאן?</h2>
            <p className="mt-2 text-(--text-body)">
              המחשבון כולל כרגע תוכניות במוסדות הבאים. מוסד או תוכנית שלא מופיעים כאן עוד לא נתמכים
              במחשבון.
            </p>
            <ul className="mt-2 list-disc pr-5 text-(--text-body)">
              {institutionNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold">האם התוצאה מבטיחה קבלה?</h2>
            <p className="mt-2 text-(--text-body)">
              לא. התוצאה היא הערכה בלבד, וההחלטה היא של המוסד. יש תנאים נוספים, כמו רמת אנגלית,
              מתמטיקה או ראיון, ובחלק מהתוכניות יש גם אפיק ללא פסיכומטרי, אפיק על בסיס פסיכומטרי
              בלבד או קבלה דרך מכינה.
            </p>
          </div>
        </section>
      </main>
    </WayPageShell>
  );
}

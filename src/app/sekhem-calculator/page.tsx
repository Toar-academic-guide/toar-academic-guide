import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import ProfileSekhemCalculator from '@/components/sekhem/ProfileSekhemCalculator';
import SekhemCalculator from '@/components/sekhem/SekhemCalculator';
import { HAIFA_CALCULATOR_URL, HAIFA_PROGRAM_URLS } from '@/data/admissions/haifaOfficialUrls';
import JsonLd from '@/components/seo/JsonLd';
import { loadSekhemCalculatorOfferings } from '@/lib/sekhemCalculatorSupport';
import { getPublicProgramPageData } from '@/lib/publicCataloguePages';
import { canonicalProgramId, canonicalProgramPath } from '@/lib/seo/programAliases';
import { sekhemCalculatorLd } from '@/lib/seo/jsonLd';
import { absoluteUrl, SITE_NAME } from '@/lib/site';

const title = 'מחשבון סכם לפי מוסד ותוכנית | MyWay';
const description =
  'מחשבון סכם לפי ציוני הבגרות והפסיכומטרי שלכם. בחרו תוכנית לימודים ובדקו איך הציון שלכם משתווה לסף הקבלה שלה.';
const canonical = absoluteUrl('/sekhem-calculator');

const faq = [
  {
    question: 'מהו ציון סכם?',
    answer:
      'סכם הוא ציון שמשקלל את נתוני הקבלה שלכם, לרוב את ציוני הבגרות והפסיכומטרי. משווים אותו לסף שקבע החוג למסלול שבחרתם.',
  },
  {
    question: 'למה אותם ציונים נותנים סכם שונה במוסדות שונים?',
    answer:
      'כל מוסד קובע אילו בונוסים לתת למקצועות מוגברים וכמה משקל לתת לפסיכומטרי. למשל, ציון במתמטיקה ברמת חמש יחידות יכול להשפיע אחרת על הסכם בכל מוסד, גם כשהציון בתעודה זהה.',
  },
  {
    question: 'עברתם את סף הקבלה. מה עוד כדאי לבדוק?',
    answer:
      'בדקו בעמוד התוכנית אם צריך לעמוד גם בדרישות נוספות, כמו ציון במתמטיקה, רמת אנגלית או ראיון. סכם מעל הסף עונה על דרישת הציון באותו מסלול.',
  },
  {
    question: 'באילו תוכניות אפשר לבדוק את הסכם?',
    answer: 'פתחו את ״בחירת תחום לימודים״ בטופס כדי לראות את התוכניות שאפשר לבדוק.',
  },
];

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
  twitter: { card: 'summary', title, description },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ program?: string; from?: string }>;
}) {
  const [offerings, params] = await Promise.all([loadSekhemCalculatorOfferings(), searchParams]);
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
        <JsonLd
          data={[
            sekhemCalculatorLd(),
            {
              '@type': 'FAQPage',
              '@id': `${canonical}#faq`,
              mainEntity: faq.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: { '@type': 'Answer', text: answer },
              })),
            },
          ]}
        />
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">מחשבון סכם</h1>
          <p className="mt-4 text-(--text-body)">
            חשבו את הסכם שלכם ובדקו איך הוא משתווה לסף הקבלה לתוכנית שבחרתם.
          </p>
        </header>
        {unavailable ? (
          <section className="space-y-4">
            <p>לתוכנית הזו: בדיקה אישית מול המוסד.</p>
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
        ) : params.from === 'results' && initialProgramId ? (
          <ProfileSekhemCalculator offerings={offerings} initialProgramId={initialProgramId} />
        ) : (
          <SekhemCalculator offerings={offerings} initialProgramId={initialProgramId} />
        )}
        <section className="mt-10 space-y-7 leading-7" aria-labelledby="sekhem-faq-title">
          <h2 id="sekhem-faq-title" className="sr-only">
            שאלות על מחשבון הסכם
          </h2>
          {faq.map(({ question, answer }) => (
            <div key={question}>
              <h2 className="text-xl font-semibold">{question}</h2>
              <p className="mt-2 text-(--text-body)">{answer}</p>
            </div>
          ))}
        </section>
        <p className="mt-6 leading-7">
          <Link
            className="inline-flex min-h-11 items-center underline underline-offset-4"
            href="/psychometric-two-domain"
            prefetch={false}
          >
            פסיכומטרי דו־תחומי: מה משתנה ומה קורה לציונים קודמים?
          </Link>
        </p>
        <p className="mt-4 leading-7">
          כבר לומדים במוסד אחר?{' '}
          <Link className="underline underline-offset-4" href="/transfer">
            כך מתכננים מעבר בין מוסדות לימוד
          </Link>
        </p>
        {!unavailable && (
          <section className="mt-12 space-y-3 leading-7" aria-labelledby="sekhem-example-title">
            <h2 id="sekhem-example-title" className="text-xl font-semibold">
              דוגמה לחישוב סכם במדעי המחשב באוניברסיטת חיפה
            </h2>
            <p>
              נשתמש בציונים שבכפתור ״ערכים לדוגמה״ ובתעודת בגרות משנת 2020. הציון במתמטיקה הוא 92
              בחמש יחידות. אחרי שקלול כל המקצועות והבונוסים, ממוצע הבגרות לפי חיפה הוא 108.87.
            </p>
            <p>
              בפסיכומטרי משנת 2024 התקבלו 140 בכמותי, 130 במילולי ו־135 באנגלית. בדוגמה הזו, אחרי
              המרת הציונים לסולם של חיפה, הבגרות קובעת רבע מהסכם והפסיכומטרי קובע שלושה רבעים.
            </p>
            <p>
              מתקבל <strong>סכם של 718</strong> — 18 נקודות מעל הסף של 700 לשנת תשפ״ז. הציון
              במתמטיקה עומד גם בדרישת החוג לחמש יחידות. עדיין צריך לבדוק את דרישות העברית והאנגלית.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <a className="underline underline-offset-4" href={HAIFA_CALCULATOR_URL}>
                איך אוניברסיטת חיפה מחשבת סכם
              </a>
              <a className="underline underline-offset-4" href={HAIFA_PROGRAM_URLS.haifa_cs}>
                תנאי הקבלה למדעי המחשב בחיפה
              </a>
            </div>
          </section>
        )}
      </main>
    </WayPageShell>
  );
}

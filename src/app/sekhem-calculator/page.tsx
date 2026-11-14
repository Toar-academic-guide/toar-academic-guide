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
import { isMedicineAcademicPair } from '@/lib/medicineAcademicInputs';

const title = 'מחשבון סכם וממוצע בגרות לפי מוסד | MyWay';
const description =
  'חשבו סכם וממוצע בגרות לפי המוסד בתוכניות הנתמכות, מציוני המקצועות והפסיכומטרי שלכם. השוו לסף הקבלה ועיינו בקישורים למחשבונים הרשמיים.';
const canonical = absoluteUrl('/sekhem-calculator');

const averageSources = [
  {
    id: 'tau',
    name: 'אוניברסיטת תל אביב',
    url: 'https://ims.tau.ac.il/Md/calc/Bagrut.aspx',
    label: 'מחשבון הבגרות הרשמי',
  },
  {
    id: 'bgu',
    name: 'אוניברסיטת בן־גוריון בנגב',
    url: 'https://bgu4u.bgu.ac.il/html/average_calc/index.php',
    label: 'מחשבון הבגרות והסכם',
  },
  {
    id: 'haifa',
    name: 'אוניברסיטת חיפה',
    url: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
    label: 'מחשבון הבגרות והסכם',
  },
  {
    id: 'huji',
    name: 'האוניברסיטה העברית',
    url: 'https://info.huji.ac.il/reception-components/Bagrut',
    label: 'הנחיות הבגרות באתר העברית',
  },
];

const faq = [
  {
    question: 'איך שיפור בפסיכומטרי משפיע על הסכם?',
    answer:
      'הסכם מחושב לפי הנוסחה של המוסד שבחרתם. אחרי שמזינים את הציון החדש, רואים את הסכם העדכני לאותה תוכנית. שיפור בציון אינו מבטיח קבלה.',
  },
  {
    question: 'איך ארבע יחידות במתמטיקה נכנסות לחישוב?',
    answer:
      'כל מוסד מפרסם איך הוא משקלל יחידות ובונוסים. מזינים את מספר היחידות ואת הציון כפי שהם בתעודה; אנחנו מחשבים לפי הכלל של המוסד בתוכנית שנבחרה, בלי מספר בונוס כללי שמומצא כאן.',
  },
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
    answer:
      'פתחו את ״בחירת תחום לימודים״ בטופס כדי לראות את התוכניות שאפשר לבדוק. רוצים לראות לאן מתקבלים בתוכניות שבחרתם? למחשבון סיכויי הקבלה',
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
  const coveredAverageSources = averageSources.filter((source) =>
    offerings.some(
      (offering) =>
        offering.institutionId === source.id &&
        (source.id !== 'huji' || isMedicineAcademicPair(offering.programId, 'huji')),
    ),
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
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            מחשבון סכם וממוצע בגרות לפי מוסד
          </h1>
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
        <section className="mt-10 space-y-4 leading-7" aria-labelledby="bagrut-average-title">
          <h2 id="bagrut-average-title" className="text-xl font-semibold">
            ממוצע הבגרות שלכם לפי כל מוסד
          </h2>
          <p className="text-(--text-body)">
            ממוצע הבגרות מחושב לפי משקל היחידות, וכל מוסד מוסיף בונוסים לפי הכללים שלו. לכן אותן
            בגרויות יכולות לתת ממוצע שונה ממוסד למוסד. כאן מוצג הממוצע לפי המוסד של התוכנית שבחרתם,
            ורק במוסדות שהמחשבון באמת מכסה. בטבלה מופיע קישור למחשבון הרשמי או להנחיות הבגרות של כל
            מוסד כזה. אין כאן הבטחת קבלה, ואין נוסחה אחת לכולם.
          </p>
          <table
            className="w-full table-fixed text-right text-sm leading-6"
            aria-labelledby="bagrut-average-title"
          >
            <thead>
              <tr className="border-b border-(--border)">
                <th scope="col" className="w-[35%] py-3 pe-2">
                  מוסד
                </th>
                <th scope="col" className="w-[40%] py-3 pe-2">
                  קישור רשמי
                </th>
                <th scope="col" className="py-3">
                  נבדק בתאריך
                </th>
              </tr>
            </thead>
            <tbody>
              {coveredAverageSources.map((source) => (
                <tr key={source.id} className="border-b border-(--border)">
                  <th scope="row" className="py-3 pe-2 align-top font-medium">
                    {source.name}
                    {source.id === 'huji' && (
                      <span className="block font-normal">במסלול הרפואה הנתמך</span>
                    )}
                  </th>
                  <td className="py-3 pe-2 align-top">
                    <a
                      href={source.url}
                      className="inline-flex min-h-11 items-center underline underline-offset-4"
                    >
                      {source.label}
                    </a>
                  </td>
                  <td className="py-3 align-top">
                    <time dateTime="2026-11-14">
                      <bdi dir="ltr">14.11.2026</bdi>
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="mt-10 space-y-4 leading-7" aria-labelledby="sekhem-improvement-title">
          <h2 id="sekhem-improvement-title" className="text-xl font-semibold">
            איך שיפור בפסיכומטרי וארבע יחידות במתמטיקה נכנסים לסכם?
          </h2>
          <p className="text-(--text-body)">
            הסכם מחושב לפי הנוסחה של כל מוסד, מציון הבגרות המשוקלל ומהפסיכומטרי. שיפור בפסיכומטרי
            וציון בארבע יחידות מתמטיקה נכנסים לחישוב רק לפי כללי אותו מוסד, כולל הבונוס שהוא מפרסם.
            מזינים את הציונים כפי שהם בתעודה ואת הציון החדש בפסיכומטרי, ורואים איך הסכם משתנה
            בתוכנית שבחרתם. אין כאן הבטחת קבלה.
          </p>
          <Link
            href="/without-psychometric"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            מסלולי קבלה ללא פסיכומטרי
          </Link>
        </section>
        <section className="mt-10 space-y-7 leading-7" aria-labelledby="sekhem-faq-title">
          <h2 id="sekhem-faq-title" className="sr-only">
            שאלות על מחשבון הסכם
          </h2>
          {faq.map(({ question, answer }) => (
            <div key={question}>
              <h2 className="text-xl font-semibold">{question}</h2>
              <p className="mt-2 text-(--text-body)">
                {question === 'באילו תוכניות אפשר לבדוק את הסכם?' ? (
                  <>
                    {answer.slice(0, -'למחשבון סיכויי הקבלה'.length)}
                    <Link href="/calculator" className="underline underline-offset-4">
                      למחשבון סיכויי הקבלה
                    </Link>
                  </>
                ) : (
                  answer
                )}
              </p>
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
          {' · '}
          <Link
            className="underline underline-offset-4"
            href="/psychometric-dates"
            prefetch={false}
          >
            מועדי הפסיכומטרי
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

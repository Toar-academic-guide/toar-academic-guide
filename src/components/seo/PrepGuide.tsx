import Link from 'next/link';
import { PREP_ROWS } from '@/lib/prepGuide';

export const prepFundingUrl =
  'https://www.hachvana.mod.gov.il/MainEducation/TwelveYearsStudies/Pages/PreAcademic.aspx';

const prepQuestion = 'האם מכינה מחליפה בגרות או פסיכומטרי?';
const prepAnswer =
  'זה תלוי במכינה. בטבלה מופיע לכל מכינה מה התעודה שלה מחליפה והאם נדרש פסיכומטרי כדי להיכנס אליה.';

export const prepFaqLd = {
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: prepQuestion,
      acceptedAnswer: { '@type': 'Answer', text: prepAnswer },
    },
  ],
};

export default function PrepGuide({ programIds }: { programIds: string[] }) {
  const listed = new Set(programIds);
  const rows = PREP_ROWS.filter((row) => listed.has(row.id));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 text-right text-slate-900 sm:px-6">
      <div>
        <h1 className="text-3xl font-black sm:text-4xl">
          מכינה קדם־אקדמית: מה כל מכינה מחליפה, ומה צריך כדי להיכנס
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-700">
          מכינה קדם־אקדמית יכולה לפתוח דרך לתואר גם בלי תעודת בגרות מלאה. בטבלה תוכלו להשוות מה
          התעודה מחליפה, מה נדרש כדי להיכנס למכינה, לאילו תחומים היא מיועדת וכמה זמן היא נמשכת, לפי
          המידע שפרסם כל מוסד.
        </p>
      </div>
      <section
        aria-labelledby="prep-comparison"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <h2 id="prep-comparison" className="px-5 pt-5 text-xl font-bold sm:px-6">
          השוואת מכינות
        </h2>
        <div className="mt-4">
          <table
            aria-labelledby="prep-comparison"
            className="block w-full border-collapse text-right text-sm leading-6 md:table"
          >
            <thead className="hidden bg-slate-50 text-slate-700 md:table-header-group">
              <tr>
                {['מוסד', 'מה התעודה מחליפה', 'פסיכומטרי לכניסה', 'תחומים', 'משך'].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="border-y border-slate-200 px-4 py-3 font-semibold"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="block divide-y divide-slate-200 md:table-row-group md:divide-y-0">
              {rows.map((row) => (
                <tr key={row.id} className="block align-top md:table-row md:even:bg-slate-50/60">
                  <th
                    scope="row"
                    className="block px-5 pb-2 pt-5 text-lg font-semibold md:table-cell md:border-b md:border-slate-200 md:px-4 md:py-4 md:text-sm"
                  >
                    <Link
                      className="inline-flex min-h-11 min-w-11 items-center text-[#6554b8] underline underline-offset-2"
                      href={`/programs/${row.id}`}
                    >
                      {row.name}
                    </Link>
                  </th>
                  {[
                    ['מה התעודה מחליפה', row.replaces],
                    ['פסיכומטרי לכניסה', row.entry],
                    ['תחומים', row.fields],
                    ['משך', row.duration],
                  ].map(([label, value]) => (
                    <td
                      key={label}
                      className={`${value ? 'block' : 'hidden'} px-5 py-2 text-slate-700 md:table-cell md:border-b md:border-slate-200 md:px-4 md:py-4`}
                    >
                      {value && (
                        <>
                          <span className="block font-semibold md:hidden">{label}</span>
                          {value}
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="prep-funding" className="max-w-4xl">
        <h2 id="prep-funding" className="text-2xl font-bold">
          סיוע במימון המכינה
        </h2>
        <div className="mt-4 space-y-4 leading-7 text-slate-700">
          <p>
            האגף לחיילים משוחררים ומילואים במשרד הביטחון מסייע למשוחררים משירות חובה ולמסיימי שירות
            לאומי במימון שכר הלימוד ודמי הקיום במכינות שבהסדר. אם עברו עד חמש שנים מאז שהשתחררתם או
            סיימתם את השירות הלאומי, תוכלו לבדוק זכאות למימון חלקי או מלא לפי מצבכם הכלכלי והאישי.
            חיילים בודדים משוחררים זכאים למימון מלא של שכר הלימוד ולדמי קיום עד עשר שנים מהשחרור.
            לוחמות ולוחמים בעלי תעודת שחרור בכבוד זהב זכאים למימון מלא של שכר הלימוד עד חמש שנים
            מהשחרור, ודמי הקיום נקבעים לפי מצבם הכלכלי. מימון מלא ודמי קיום ניתנים גם לעולים חדשים
            עד שבע שנים בארץ, ולמשוחררים יוצאי אתיופיה, בני מיעוטים, חרדים ומקבלי תשלומי משפחה
            (תשמ״ש) עד חמש שנים מהשחרור. במסלולים לחרדים ולמקבלי תשמ״ש נדרש שחרור מצה״ל. משרתי
            מילואים פעילים יכולים לבדוק זכאות עד עשר שנים מהשחרור. היקף הסיוע נקבע לפי מצבם הכלכלי
            והאישי.
          </p>
          <p>
            לפני ההרשמה בדקו מול מזכירות המכינה אם המסלול שבחרתם מזכה בסיוע ואילו מסמכים צריך להגיש.
            בני מיעוטים, חרדים, מקבלי תשמ״ש ומשרתי מילואים פעילים צריכים לבקש מהאגף טופס 2 לפני
            השלמת ההרשמה. חיילים בודדים שהשתחררו לפני יולי 2021 מגישים בקשה באזור האישי באתר האגף.
            לבדיקת תקופת הזכאות קובע מועד השלמת ההרשמה, לרבות הגשת המסמכים ותשלום דמי הרישום. אם
            חלפו חמש שנים מהשחרור במהלך לימודים רצופים במכינה, המימון שאושר נמשך עד סיום המסלול.
            לחיילים בודדים הכלל הזה חל בתום עשר השנים.
          </p>
          <p>
            תשלום שכר הלימוד ודמי הקיום מותנה בנוכחות של לפחות <bdi dir="ltr">80%</bdi>. הסיוע ניתן
            בנוסף לפיקדון האישי. אם לא נמצאתם זכאים לסיוע בשכר הלימוד, תוכלו לבדוק אם ניתן להשתמש
            ביתרת הפיקדון האישי לתשלום במכינה.
          </p>
        </div>
      </section>
      <section aria-labelledby="prep-faq">
        <h2 id="prep-faq" className="text-2xl font-bold">
          שאלה נפוצה
        </h2>
        <dl className="mt-4 max-w-3xl space-y-2 leading-7">
          <dt className="font-semibold">{prepQuestion}</dt>
          <dd className="text-slate-700">{prepAnswer}</dd>
        </dl>
      </section>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href="/calculator"
          className="inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
        >
          איך מחשבון סיכויי הקבלה עובד
        </Link>
        <Link
          href="/psychometric-dates"
          className="inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
        >
          מועדי הפסיכומטרי וסמסטר ההתחלה
        </Link>
        <Link
          href="/sekhem-calculator"
          className="inline-flex min-h-11 items-center rounded-full border border-[#c9c2e4] px-5 py-2.5 font-semibold text-[#6554b8]"
        >
          חישוב סכם מהבגרות והפסיכומטרי
        </Link>
      </div>
    </div>
  );
}

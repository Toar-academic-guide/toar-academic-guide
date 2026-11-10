import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd } from '@/lib/seo/jsonLd';
import { absoluteUrl, SITE_NAME } from '@/lib/site';

const title = 'לאן אני מתקבל/ת? מחשבון סיכויי קבלה לתואר | MyWay';
const description =
  'מזינים בגרות ופסיכומטרי ורואים באילו תוכניות אתם עומדים בתנאי הקבלה, מה עוד חסר ואיפה יש מסלול נוסף. חינם, בלי הרשמה, מול תנאי הקבלה שהמוסדות מפרסמים.';
const canonical = absoluteUrl('/calculator');
const steps = [
  {
    title: 'מה ללמוד',
    text: 'בוחרים תחום אחד או כמה. לא בטוחים? שאלון קצר יעזור לכם לבחור.',
  },
  {
    title: 'איפה ללמוד',
    text: 'בוחרים אזור וסוג מוסד שמעניינים אתכם, באוניברסיטאות ובמכללות.',
  },
  {
    title: 'הציונים שלי',
    text: 'מזינים ממוצע בגרות או ציונים לפי מקצוע, ופסיכומטרי אם יש לכם. את השקלול לפי המוסד אנחנו עושים בשבילכם.',
  },
  {
    title: 'האפשרויות שלי',
    text: 'רואים מצב לכל תוכנית שנבדקה, מסננים לפי סוג מוסד ואזור, ועוברים לאתר המוסד בלחיצה.',
  },
];
const faq = [
  {
    question: 'צריך לדעת מה הסכם שלי?',
    answer: [
      { text: 'לא. מזינים את ציוני הבגרות והפסיכומטרי, ו־MyWay עושה את השקלול לפי המוסד בשבילכם.' },
    ],
  },
  {
    question: 'אין לי עדיין פסיכומטרי. אפשר לבדוק?',
    answer: [
      {
        text: 'כן. בתוכניות שתומכות בקבלה לפי בגרות בלבד אפשר לראות תוצאה גם בלי פסיכומטרי. בתוכניות אחרות תראו אילו נתונים חסרים לבדיקה.',
      },
    ],
  },
  {
    question: 'מה ההבדל בין המחשבון הזה למחשבון הסכם?',
    answer: [
      { text: 'כאן בודקים תוכניות שבחרתם ורואים לאן אתם מתקבלים. ' },
      { text: 'מחשבון הסכם', href: '/sekhem-calculator' },
      { text: ' מתמקד בתוכנית אחת ומראה את הסכם שלכם מול הסף שלה.' },
    ],
  },
  {
    question: 'עברתי את הסף. מה הלאה?',
    answer: [
      {
        text: 'בעמוד התוכנית תראו גם מה עוד המוסד מבקש, כמו רמת אנגלית, מתמטיקה או ראיון. בדקו את כל התנאים לפני ההרשמה.',
      },
    ],
  },
  {
    question: 'כמה זה עולה? צריך להירשם?',
    answer: [
      { text: 'הבדיקה חינם ובלי הרשמה. אם תרצו לשמור תוכניות ולעקוב אחריהן, אפשר לפתוח חשבון.' },
    ],
  },
  {
    question: 'מאיפה המידע?',
    answer: [
      {
        text: 'מתנאי הקבלה שהמוסדות מפרסמים. בתוצאות הבדיקה יש קישורים לאתרי המוסדות ולמקורות הרשמיים הזמינים.',
      },
    ],
  },
  {
    question: 'מתי מתפרסמים ציוני הפסיכומטרי ומה המועד הבא?',
    answer: [
      { text: 'תאריכי הבחינה, סיום ההרשמה ותחזית פרסום הציונים מופיעים בעמוד ' },
      { text: 'מועדי הפסיכומטרי', href: '/psychometric-dates' },
      { text: '.' },
    ],
  },
];

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

export default function CalculatorLandingPage() {
  const breadcrumb = breadcrumbLd([
    { name: 'דף הבית', path: '/' },
    { name: 'מחשבון סיכויי קבלה', path: '/calculator' },
  ]);
  return (
    <WayPageShell contentClassName="pt-24 sm:pt-28">
      <main
        id="main-content"
        dir="rtl"
        className="mx-auto max-w-5xl px-5 pb-20 pt-10 text-right text-[#172445] sm:px-8 sm:pt-14"
      >
        <JsonLd
          data={[
            {
              '@type': 'WebPage',
              '@id': `${canonical}#webpage`,
              name: title,
              url: canonical,
              inLanguage: 'he',
              breadcrumb: { '@id': breadcrumb['@id'] },
            },
            breadcrumb,
            {
              '@type': 'WebApplication',
              '@id': `${canonical}#webapp`,
              name: 'מחשבון סיכויי קבלה לתואר',
              url: canonical,
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              inLanguage: 'he',
              isAccessibleForFree: true,
              offers: { '@type': 'Offer', price: 0, priceCurrency: 'ILS' },
              featureList: steps.map(({ title }) => title),
              publisher: { '@id': absoluteUrl('/#organization') },
            },
            {
              '@type': 'FAQPage',
              '@id': `${canonical}#faq`,
              mainEntity: faq.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: answer.map(({ text }) => text).join(''),
                },
              })),
            },
          ]}
        />
        <nav aria-label="פירורי לחם" className="text-sm text-[#52607f]">
          <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
            דף הבית
          </Link>
          <span aria-hidden="true" className="mx-2">
            ›
          </span>
          <span>מחשבון סיכויי קבלה</span>
        </nav>

        <header className="mt-8 max-w-3xl sm:mt-12">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            לאן אני מתקבל/ת עם הציונים שלי?
          </h1>
          <p className="mt-6 text-lg leading-9 text-[#435072]">
            בוחרים תחום, מזינים את ציוני הבגרות ואת הפסיכומטרי, ו־MyWay משווה אותם לתנאי הקבלה
            שהמוסדות פרסמו. בתוכניות שנבדקו מקבלים תשובה ברורה: עומדים בתנאי הציון, מתחת לסף, או מה
            עוד חסר כדי לבדוק. בתוצאות יש קישורים למקורות הרשמיים, כדי שתוכלו לבדוק את התנאים המלאים
            ולהתקדם להרשמה.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/app/calculator"
              className="inline-flex min-h-12 items-center rounded-xl bg-[#4765cc] px-6 py-3 font-semibold text-white hover:bg-[#3c57b7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2945cb]"
            >
              בדקו לאן אתם מתקבלים
            </Link>
            <Link
              href="/sekhem-calculator"
              className="inline-flex min-h-11 items-center text-[#34456f] underline underline-offset-4"
            >
              רוצים לבדוק תוכנית אחת לעומק? למחשבון הסכם
            </Link>
          </div>
        </header>

        <section className="mt-20" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="text-3xl font-semibold">
            איך זה עובד
          </h2>
          <ol className="mt-7 grid gap-4 sm:grid-cols-2">
            {steps.map(({ title, text }, index) => (
              <li
                key={title}
                className="rounded-2xl border border-[#dce4f7] bg-white/85 p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8edff] font-semibold text-[#365bc8]"
                  >
                    {index + 1}
                  </span>
                  <h3 className="text-xl font-semibold">{title}</h3>
                </div>
                <p className="mt-3 leading-8 text-[#435072]">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20" aria-labelledby="more-than-one-route">
          <h2 id="more-than-one-route" className="text-3xl font-semibold">
            למה לאותו תואר יש כמה דרכים להתקבל
          </h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#435072]">
            באותה תוכנית יכולים להיות כמה מסלולי קבלה, וכל אחד בודק תנאים אחרים. למשל, אוניברסיטת
            חיפה מפרסמת כמה מסלולים למדעי המחשב:
          </p>
          <div className="mt-6 rounded-2xl border border-[#dce4f7] bg-white/85">
            <table className="w-full border-collapse text-right leading-8">
              <thead className="hidden bg-[#edf2ff] text-[#172445] sm:table-header-group">
                <tr>
                  <th scope="col" className="w-1/3 p-4">
                    מסלול
                  </th>
                  <th scope="col" className="p-4">
                    תנאים שפורסמו
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dce4f7] text-[#435072]">
                <tr className="block p-4 sm:table-row sm:p-0">
                  <th
                    scope="row"
                    className="block align-top font-semibold text-[#172445] sm:table-cell sm:p-4"
                  >
                    קבלה לפי סכם
                  </th>
                  <td className="block pt-2 sm:table-cell sm:p-4">
                    סכם 700 ומעלה; טווח המתנה 680–699, שמועבר לדיון בוועדת הקבלה החוגית. בגרות
                    במתמטיקה: 90 ומעלה ב־4 יח״ל או 75 ומעלה ב־5 יח״ל.
                  </td>
                </tr>
                <tr className="block p-4 sm:table-row sm:p-0">
                  <th
                    scope="row"
                    className="block align-top font-semibold text-[#172445] sm:table-cell sm:p-4"
                  >
                    מסלול אופק לקראת תואר, ללא פסיכומטרי, החל מתשפ״ז
                  </th>
                  <td className="block pt-2 sm:table-cell sm:p-4">
                    בגרות מלאה בממוצע משוקלל 105 ומעלה; מתמטיקה 85 ומעלה ב־4 יח״ל או 75 ומעלה ב־5
                    יח״ל; והגשת קורות חיים. הקבלה אינה מובטחת וכפופה לשיקול ועדת הקבלה של החוג. רק
                    אחרי סיום מסלול הקדם הופכים לסטודנטים מן המניין.
                  </td>
                </tr>
                <tr className="block p-4 sm:table-row sm:p-0">
                  <th
                    scope="row"
                    className="block align-top font-semibold text-[#172445] sm:table-cell sm:p-4"
                  >
                    אפיק מעבר מהאוניברסיטה הפתוחה
                  </th>
                  <td className="block pt-2 sm:table-cell sm:p-4">
                    נדרשת בגרות. למעבר לשנה א׳, סמסטר ב׳: שלושה קורסי שנה א׳ בממוצע 80 וציון 70
                    לפחות בכל קורס. למעבר לשנה ב׳: שמונה קורסי שנה א׳ בממוצע 80 וציון 70 לפחות בכל
                    קורס. רשימות הקורסים המלאות מופיעות באתר האוניברסיטה.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-5 max-w-3xl leading-8 text-[#435072]">
            בכל המסלולים נדרשת גם רמת אנגלית טרום בסיסי ומעלה, לפי אמירנט או פרק האנגלית בפסיכומטרי,
            ורמת עברית 120 ומעלה ביעלנט או חלופה שמפרסמת האוניברסיטה. המחשבון אינו בודק את מסלול
            אופק או את אפיק המעבר מהאוניברסיטה הפתוחה. בדקו את כל התנאים באתר האוניברסיטה.
          </p>
          <p className="mt-3 text-sm text-[#52607f]">
            מקור:{' '}
            <a
              href="https://admissions.haifa.ac.il/computer-information-science/program/3210/"
              className="inline-flex min-h-11 items-center align-middle underline underline-offset-4"
            >
              אוניברסיטת חיפה, מדעי המחשב
            </a>{' '}
            · נבדק <bdi dir="ltr">10.11.2026</bdi>
          </p>
        </section>

        <section className="mt-20" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-3xl font-semibold">
            שאלות נפוצות
          </h2>
          <div className="mt-6 divide-y divide-[#dce4f7] rounded-2xl border border-[#dce4f7] bg-white/85 px-5 sm:px-7">
            {faq.map(({ question, answer }) => (
              <details key={question} className="group">
                <summary className="cursor-pointer list-none py-5 text-lg font-semibold marker:hidden">
                  {question}
                  <span
                    aria-hidden="true"
                    className="float-left text-[#365bc8] group-open:rotate-45"
                  >
                    ＋
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl leading-8 text-[#435072]">
                  {answer.map(({ text, href }, index) =>
                    href ? (
                      <Link
                        key={index}
                        href={href}
                        className="inline-flex min-h-11 items-center align-middle underline underline-offset-4"
                      >
                        {text}
                      </Link>
                    ) : (
                      <span key={index}>{text}</span>
                    ),
                  )}
                </p>
              </details>
            ))}
          </div>
        </section>

        <aside className="mt-20 rounded-2xl bg-[#172445] px-6 py-10 text-right text-white sm:px-10">
          <p className="text-2xl font-semibold leading-snug">הציונים שלכם. התואר שלכם.</p>
          <Link
            href="/app/calculator"
            className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-white px-6 py-3 font-semibold text-[#172445] hover:bg-[#edf2ff]"
          >
            בדקו עכשיו לאן אתם מתקבלים
          </Link>
        </aside>
      </main>
    </WayPageShell>
  );
}

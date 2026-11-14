import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

const checkedOn = '2026-11-14';
const checkedLabel = '14.11.2026';
const title = 'רמות אמירנט ופטור באנגלית לפי מוסד | MyWay';
const description =
  'מה אומר הציון באמירנט, מאיזו רמה מתחיל הפטור, והאם רמת האנגלית יכולה לחסום קבלה. טבלה לפי מוסד, עם קישור למקור הרשמי ותאריך בדיקה.';
const canonical = absoluteUrl('/amirnet');

const nite = {
  significance: 'https://www.nite.org.il/other-tests/amirnet/scores/significance/',
  faq: 'https://www.nite.org.il/other-tests/amirnet/faq/?lang=en',
  registration:
    'https://www.nite.org.il/other-tests/amirnet/registration-procedures/online-registration/?lang=en',
};

const institutions = [
  {
    name: 'אוניברסיטת תל אביב',
    exemption: '134+',
    advancedB: '120–133',
    advancedA: '100–119',
    admission:
      'טרום בסיסי (עד 84) נדחה אוטומטית, גם אחרי קבלה על תנאי. יש חריג לעולים ממדינות שבהן לא למדו אנגלית ברמת התיכון בישראל. לרוב נדרשת רמת מתקדמים א׳ עד תחילת הלימודים; בדקו את דרישת החוג.',
    after: 'פטור מקורסי אנגלית לפי תקנון הפקולטה.',
    details: 'בסיסי: 85–99. הסיווג לפי הרמה הגבוהה מבין הציונים התקפים. אמירנט מוכר מ־1.5.2024.',
    source: 'https://go.tau.ac.il/he/ba/english',
  },
  {
    name: 'הטכניון',
    exemption: '134–150',
    advancedB: '120–133',
    advancedA: '104–119',
    admission:
      'ציון 103 ומטה מונע קבלה למסלולים שאינם רפואה, גם אם הסכם עומד בסף. לרפואה נדרש 120 לפחות.',
    after: 'פטור מלימודי אנגלית. העמוד אינו מפרט חובת קורסי תוכן לאחר מכן.',
    details: 'מתקדמים א׳ מתחילה כאן ב־104, ולא ב־100.',
    source: 'https://admissions.technion.ac.il/english-exam/',
  },
  {
    name: 'האוניברסיטה העברית',
    exemption: '134+',
    advancedB: '120–133',
    advancedA: '100–119',
    admission: 'בסיסי (85–99) הוא סף הקבלה הכללי לתואר ראשון; בחלק מהחוגים נדרשת רמה גבוהה יותר.',
    after: 'פטור מקורסי האנגלית. מי שהתקבל ללא פטור נדרש להגיע אליו עד תחילת שנה ב׳.',
    details: 'טרום בסיסי ב׳: 70–84; טרום בסיסי א׳: 50–69.',
    source: 'https://info.huji.ac.il/reception-components/English-level?cat=407&in=394',
  },
  {
    name: 'אוניברסיטת בר־אילן',
    exemption: '134+',
    advancedB: '120–133',
    advancedA: '100–119',
    admission: 'בעמוד המקושר לא פורסם סף דחייה כללי. בדקו את תנאי התוכנית.',
    after: 'פטור מלימודי אנגלית כשפה זרה.',
    details: 'בסיסי: 85–99. הכרה בקורס אנגלית ממוסד אחר נבדקת בנפרד.',
    source: 'https://efl.biu.ac.il/en/node/2230',
  },
  {
    name: 'אוניברסיטת חיפה',
    exemption: '134+',
    advancedB: '120–133',
    advancedA: '100–119',
    admission:
      'סף הקבלה הוא 85. לפי עמוד היחידה, בטווח 50–84 אפשר להתקבל על תנאי ולהגיע לבסיסי עד סוף שנה א׳; היחידה מייחסת זאת למתווה מל״ג מ־13.6.2013.',
    after: 'גם בסיווג פטור נדרשים שני קורסי תוכן באנגלית.',
    details: 'בסיסי: 85–99; טרום בסיסי ב׳: 70–84; טרום בסיסי א׳: 50–69.',
    source: 'https://admissions.haifa.ac.il/english-language-proficiency/',
    secondSource: 'https://engfor.haifa.ac.il/?p=71',
  },
  {
    name: 'מכללת אפקה',
    exemption: '134+',
    advancedB: '120–133',
    advancedA: '100–119',
    admission: 'לפני תחילת הלימודים נדרש ציון 85 לפחות כדי להיכנס לקורס בסיסי.',
    after: 'פטור מלימודי אנגלית ניתן גם לאחר השלמת מתקדמים ב׳ באפקה.',
    details: 'בסיסי: 85–99 (6 ש״ס); מתקדמים א׳ וב׳: 4 ש״ס כל אחד.',
    source:
      'https://www.afeka.ac.il/candidate/candidate-information-bsc/candidate-information-bscamiram/',
  },
  {
    name: 'האוניברסיטה הפתוחה',
    exemption: '134–150',
    advancedB: '120–133',
    advancedA: '100–119',
    admission: 'בעמוד המקושר לא פורסם סף דחייה. יש לקבל סיווג באנגלית עד צבירת 18 נקודות זכות.',
    after: 'בסיווג פטור נדרשים שני קורסי תוכן באנגלית; במתקדמים ב׳ נדרש קורס תוכן אחד.',
    details: 'בסיסי: 85–99; רמות נמוכות יותר: 70–84, 60–69, 56–59 ו־50–55.',
    source: 'https://academic.openu.ac.il/english/pages/classification.aspx',
  },
  {
    name: 'אוניברסיטת בן־גוריון',
    exemption: '134+',
    advancedB: '120–133',
    advancedA: '100–119',
    admission: 'נדרשת לפחות רמת בסיסי לפני תחילת הלימודים; לתוכניות מסוימות יש דרישות נוספות.',
    after: 'פטור מלימודי אנגלית ניתן גם לאחר השלמת קורס מתקדמים ב׳.',
    details: 'בסיסי: 85–99. קורסים שהושלמו יכולים לקבוע רמה, לפי כללי ההכרה של האוניברסיטה.',
    source: 'https://www.bgu.ac.il/welcome/contents/pre-registration/english-courses/',
  },
] as const;

const questions = [
  {
    question: 'מה אומר הציון באמירנט?',
    answer:
      'הציון ניתן בסולם 50–150, והוא שקול לציון באמיר״ם, באמי״ר ובפרק האנגלית בפסיכומטרי. את הרמה ואת מספר הקורסים קובע המוסד שאליו נרשמים, לא מאל״ו.',
  },
  {
    question: 'מאיזה ציון מקבלים פטור באנגלית?',
    answer:
      'אין סף פטור ארצי של מאל״ו. בכל שמונת המוסדות בטבלה סיווג הפטור מתחיל ב־134, לפי העמודים הרשמיים שנבדקו ב־14.11.2026. בחיפה ובפתוחה סיווג ״פטור״ עדיין מחייב קורסי תוכן באנגלית.',
  },
  {
    question: 'האם רמת האנגלית יכולה לחסום קבלה, או שהיא רק קובעת את מספר הקורסים?',
    answer:
      'בשני המובנים, לפי המוסד והתוכנית. מאל״ו מציין שבחלק מהמוסדות הציון הוא גם תנאי קבלה. בטכניון ציון 103 ומטה מונע קבלה למסלולים שאינם רפואה. בתל אביב סיווג טרום בסיסי נדחה אוטומטית, למעט החריג המפורסם לעולים. בעברית בסיסי 85–99 הוא סף הקבלה הכללי לתואר ראשון, ובחיפה סף 85 כולל מסלול קבלה מותנית בטווח 50–84 לפי עמוד היחידה.',
  },
  {
    question: 'האם 120 מעביר למתקדמים א׳?',
    answer:
      'לא. בשבעה מהמוסדות בטבלה, 120 הוא תחילת מתקדמים ב׳ ו־119 הוא סוף מתקדמים א׳. בטכניון 120 הוא גם תחילת מתקדמים ב׳, אבל מתקדמים א׳ מתחילה שם ב־104.',
  },
] as const;

function isolatedNumbers(value: string) {
  return value.split(/(\d+(?:[.–]\d+)*(?:\+)?)/g).map((part, index) =>
    /^\d/.test(part) ? (
      <bdi dir="ltr" key={index}>
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

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

export default function Page() {
  return (
    <WayPageShell className={styles.shell}>
      <main id="main-content" dir="rtl" className={styles.main}>
        <article>
          <header>
            <h1>מה אומר הציון באמירנט, והאם הוא יכול לחסום קבלה?</h1>
            <p className={styles.lead}>
              רמת האנגלית נקבעת לפי הציון באמירנט, באמיר״ם או בפרק האנגלית בפסיכומטרי, בסולם{' '}
              <bdi dir="ltr">50–150</bdi>. מאל״ו לא קובע את סף הפטור: כל מוסד מחליט בעצמו, ובחלק
              מהמוסדות הציון הוא גם תנאי קבלה. בטכניון ציון <bdi dir="ltr">103</bdi> ומטה חוסם קבלה
              למסלולים שאינם רפואה. בתל אביב סיווג טרום בסיסי נדחה אוטומטית, למעט החריג המפורסם
              לעולים. בכל שמונת המוסדות שבדקנו הפטור מתחיל ב־<bdi dir="ltr">134</bdi>, אבל הרמות
              שמתחתיו והחובות אחרי הפטור אינן זהות.
            </p>
            <p className={styles.stamp}>
              <a href={nite.significance}>הסולם ומדיניות המוסדות: מאל״ו</a>; ספי המוסדות: העמודים
              הרשמיים בטבלה. נבדקו{' '}
              <time dateTime={checkedOn}>
                <bdi dir="ltr">{checkedLabel}</bdi>
              </time>
              .
            </p>
          </header>

          <section className={styles.section} aria-labelledby="nite">
            <h2 id="nite">מה מאל״ו קובע, ומה הוא משאיר למוסד</h2>
            <p>
              אמירנט היא בחינת אנגלית ממוחשבת. הציון בסולם <bdi dir="ltr">50–150</bdi> שקול לציון
              באמיר״ם, באמי״ר ובפרק האנגלית בפסיכומטרי. כל מוסד קובע בעצמו את הרמה, את הקורסים
              הנדרשים ואת השימוש בציון לקבלה. הכרה ברמה ממוסד אחר אינה אוטומטית; אפשר לבקש ממאל״ו
              לשלוח את הציון למוסד נוסף.
            </p>
            <p>
              מאל״ו מציין שהציון תקף לפחות שבע שנים, לפי מדיניות המוסד, ושבדרך כלל מובא בחשבון הציון
              הגבוה; בדקו זאת במוסד שלכם. בין בחינות אמירנט נדרשים <bdi dir="ltr">35</bdi> ימים:
              הספירה מתחילה ביום שאחרי הבחינה, ואפשר להיבחן שוב ביום ה־<bdi dir="ltr">35</bdi>.
            </p>
            <p className={styles.sourceLinks}>
              <a href={nite.significance}>משמעות הציון במאל״ו</a>
              <a href={nite.faq}>שאלות ותשובות במאל״ו</a>
              <a href={nite.registration}>תוקף הציון והרשמה חוזרת במאל״ו</a>
            </p>
          </section>

          <section className={styles.section} aria-labelledby="levels">
            <h2 id="levels">טבלת רמות וסף קבלה לפי מוסד</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption>
                  רמות אמירנט בשמונה מוסדות, לפי המקורות הרשמיים שנבדקו ב־{checkedLabel}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">מוסד</th>
                    <th scope="col">פטור</th>
                    <th scope="col">מתקדמים ב׳</th>
                    <th scope="col">מתקדמים א׳</th>
                    <th scope="col">האם הציון יכול לחסום קבלה?</th>
                    <th scope="col">אחרי הפטור</th>
                    <th scope="col">מקור ותאריך בדיקה</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((institution) => (
                    <tr key={institution.name}>
                      <th scope="row">{institution.name}</th>
                      <td data-label="פטור">
                        <bdi dir="ltr">{institution.exemption}</bdi>
                      </td>
                      <td data-label="מתקדמים ב׳">
                        <bdi dir="ltr">{institution.advancedB}</bdi>
                      </td>
                      <td data-label="מתקדמים א׳">
                        <bdi dir="ltr">{institution.advancedA}</bdi>
                      </td>
                      <td data-label="קבלה">
                        {isolatedNumbers(institution.admission)}
                        <p className={styles.rowDetail}>{isolatedNumbers(institution.details)}</p>
                      </td>
                      <td data-label="אחרי הפטור">{isolatedNumbers(institution.after)}</td>
                      <td data-label="מקור ותאריך בדיקה">
                        <a href={institution.source}>עמוד המוסד הרשמי</a>
                        {'secondSource' in institution && (
                          <a href={institution.secondSource}>עמוד היחידה לאנגלית</a>
                        )}
                        <time dateTime={checkedOn}>
                          <bdi dir="ltr">{checkedLabel}</bdi>
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.note}>
              המספרים לקוחים מהעמודים הרשמיים. הם אינם כלל ארצי של מאל״ו, והם עשויים להשתנות לפי
              תוכנית ושנת הרשמה. בדקו תמיד את העמוד המקושר.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="scores">
            <h2 id="scores">
              תשובה לשאלה שנשאלת עכשיו: <bdi dir="ltr">119</bdi>, <bdi dir="ltr">120</bdi> ו־
              <bdi dir="ltr">134</bdi>
            </h2>
            <p>
              ב־<bdi dir="ltr">119</bdi> מסתיימת רמת מתקדמים א׳ וב־<bdi dir="ltr">120</bdi> מתחילה
              מתקדמים ב׳ בכל שבעת המוסדות שאינם הטכניון. גם בטכניון מתקדמים ב׳ מתחילה ב־
              <bdi dir="ltr">120</bdi>, אבל מתקדמים א׳ מתחילה שם ב־<bdi dir="ltr">104</bdi>. ציון{' '}
              <bdi dir="ltr">134</bdi> מתחיל את סיווג הפטור בשמונת המוסדות האלה; זה אינו סף פטור
              ארצי שקבע מאל״ו.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="questions">
            <h2 id="questions">שאלות נפוצות</h2>
            {questions.map(({ question, answer }) => (
              <div className={styles.faq} key={question}>
                <h3>{isolatedNumbers(question)}</h3>
                <p>{isolatedNumbers(answer)}</p>
              </div>
            ))}
          </section>

          <nav className={styles.related} aria-label="מדריכים קשורים">
            <h2>להמשך בדיקה</h2>
            <Link href="/psychometric-two-domain">הפסיכומטרי הדו־תחומי</Link>
            <Link href="/psychometric-dates">מועדי הפסיכומטרי</Link>
            <Link href="/without-psychometric">לימודים ללא פסיכומטרי</Link>
            <Link href="/sekhem-calculator">מחשבון סכם וסיכויי קבלה</Link>
            <Link href="/institutions/afeka">אפקה במדריך המוסדות</Link>
            <Link href="/programs/engineering">מסלולי הנדסה</Link>
          </nav>
        </article>
        <JsonLd
          data={{
            '@type': 'FAQPage',
            mainEntity: questions.map(({ question, answer }) => ({
              '@type': 'Question',
              name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
          }}
        />
      </main>
    </WayPageShell>
  );
}

import styles from './page.module.css';

export const semesterValiditySources = {
  technionDates: 'https://admissions.technion.ac.il/registeration-dates/',
  technionValidity: 'https://admissions.technion.ac.il/technion_psychometri/',
  haifa: 'https://admissions.haifa.ac.il/registration-deadlines-and-entrance-exams/',
  huji: 'https://info.huji.ac.il/registration-process/calendar',
  hujiPsychometric: 'https://info.huji.ac.il/reception-components/Psychometric',
  tauDentistry: 'https://go.tau.ac.il/he/med/ba/dental?v=important-info',
  bgu: 'https://www.bgu.ac.il/events/registrastion-2027-2028/',
  tauSpring: 'https://go.tau.ac.il/he/reg-dates',
  bguSpring: 'https://www.bgu.ac.il/welcome/contents/spring-semester/ba-spring-semester/',
  openuSpring: 'https://www.openu.ac.il/registration/spring/pages/default.aspx',
};

export default function SemesterValidity() {
  return (
    <section className={styles.semesters} aria-labelledby="semester-validity">
      <h2 id="semester-validity">איזה מועד פסיכומטרי נחשב לאיזה סמסטר</h2>
      <p>
        בחרתם מועד פסיכומטרי ורוצים לדעת איזה סמסטר הוא פותח? בטבלאות כאן תמצאו, מוסד אחרי מוסד, מתי
        נפתחת ההרשמה ומה המועד האחרון התקף שפורסם. ציוני דצמבר <bdi dir="ltr">2026</bdi> צפויים ב-
        <bdi dir="ltr">20.1.2027</bdi>, ובטכניון ההרשמה הרגילה לסמסטר ב&apos; נסגרת ב-
        <bdi dir="ltr">28.1.2027</bdi>.
      </p>
      <table className={styles.semesterTable}>
        <caption>
          סמסטר ב&apos; תשפ&quot;ז (פברואר–מרץ <bdi dir="ltr">2027</bdi>)
        </caption>
        <thead>
          <tr>
            <th scope="col">מוסד</th>
            <th scope="col">פתיחת הרשמה</th>
            <th scope="col">סיום הרשמה רגילה</th>
            <th scope="col">מועד פסיכומטרי אחרון תקף</th>
            <th scope="col">תחילת הסמסטר</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">הטכניון</th>
            <td data-label="פתיחת הרשמה">
              <bdi dir="ltr">1.11.2026</bdi>
              <small>
                בשעה <bdi dir="ltr">10:00</bdi>
              </small>
            </td>
            <td data-label="סיום הרשמה רגילה">
              <bdi dir="ltr">28.1.2027</bdi>
              <small>
                הרשמה מאוחרת מ־<bdi dir="ltr">31.1.2027</bdi>, על בסיס מקום פנוי
              </small>
            </td>
            <td data-label="מועד פסיכומטרי אחרון תקף">
              דצמבר <bdi dir="ltr">2026</bdi>
            </td>
            <td data-label="תחילת הסמסטר">
              <bdi dir="ltr">24.3.2027</bdi>
            </td>
          </tr>
          <tr>
            <th scope="row">אוניברסיטת חיפה</th>
            <td data-label="פתיחת הרשמה">
              <bdi dir="ltr">29.11.2026</bdi>
            </td>
            <td />
            <td />
            <td />
          </tr>
          <tr>
            <th scope="row">האוניברסיטה העברית</th>
            <td data-label="פתיחת הרשמה">
              <bdi dir="ltr">03.01.2027</bdi>
            </td>
            <td />
            <td />
            <td />
          </tr>
          <tr>
            <th scope="row">אוניברסיטת תל אביב</th>
            <td data-label="פתיחת הרשמה">
              <bdi dir="ltr">1.11.2026</bdi>
            </td>
            <td data-label="סיום הרשמה רגילה">התוכניות רשאיות לסגור את ההרשמה ללא הודעה מוקדמת.</td>
            <td />
            <td />
          </tr>
          <tr>
            <th scope="row">אוניברסיטת בן־גוריון</th>
            <td data-label="פתיחת הרשמה">
              <bdi dir="ltr">3.1.2027</bdi>
            </td>
            <td />
            <td />
            <td data-label="תחילת הסמסטר">
              <bdi dir="ltr">28.2.2027</bdi>
            </td>
          </tr>
          <tr>
            <th scope="row">האוניברסיטה הפתוחה</th>
            <td data-label="פתיחת הרשמה">
              <bdi dir="ltr">1.11.2026</bdi>
            </td>
            <td data-label="סיום הרשמה רגילה">
              <bdi dir="ltr">29.12.2026</bdi>
              <small>
                הרשמה מאוחרת: <bdi dir="ltr">30.12.2026–12.2.2027</bdi>
              </small>
              <small>
                הרשמה עד <bdi dir="ltr">5.3.2027</bdi> תתאפשר על בסיס מקום פנוי בקבוצת הלימוד.
              </small>
            </td>
            <td />
            <td data-label="תחילת הסמסטר">
              <bdi dir="ltr">7.3.2027</bdi>
            </td>
          </tr>
        </tbody>
      </table>
      <table className={styles.semesterTable}>
        <caption>
          סמסטר א&apos; תשפ&quot;ח (אוקטובר <bdi dir="ltr">2027</bdi>)
        </caption>
        <thead>
          <tr>
            <th scope="col">מוסד</th>
            <th scope="col">המידע שפורסם</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">הטכניון</th>
            <td data-label="המידע שפורסם">
              <p>כלל תוקף כפי שמפורסם באתר הטכניון</p>
              <ul>
                <li>אפריל תקף לסמסטר א&apos; — המועד האחרון לרפואה ולמסלולי רפואה.</li>
                <li>יולי: הדיון לסמסטר א&apos; על בסיס מקום פנוי.</li>
                <li>ספטמבר אינו תקף לסמסטר א&apos;.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <th scope="row">אוניברסיטת בן־גוריון</th>
            <td data-label="המידע שפורסם">
              פתיחת הרשמה: <bdi dir="ltr">31.1.2027</bdi>. שנת הלימודים מתחילה באוקטובר{' '}
              <bdi dir="ltr">2027</bdi>.
            </td>
          </tr>
          <tr>
            <th scope="row">בית הספר לעיצוב, אוניברסיטת חיפה</th>
            <td data-label="המידע שפורסם">
              פתיחת הרשמה לשנת תשפ&quot;ח: <bdi dir="ltr">01.11.2026</bdi>.
            </td>
          </tr>
          <tr>
            <th scope="row">האוניברסיטה העברית</th>
            <td data-label="המידע שפורסם">
              <ul>
                <li>
                  <strong>
                    אפריל <bdi dir="ltr">2027</bdi>:
                  </strong>{' '}
                  תקף לכל תחומי הלימוד, והוא המועד האחרון לרפואה (כולל צמרת ורפואה ומחקר ביו־רפואי),
                  לרפואת שיניים (למעט עתודאים במסלול בינה), לרפואה וטרינרית ולתכנית אמירים רוח.
                </li>
                <li>
                  <strong>
                    יולי <bdi dir="ltr">2027</bdi>:
                  </strong>{' '}
                  תקף רק למסיימי המכינה האוניברסיטאית של העברית (למעט רפואה), לעתודאים (למעט צמרת)
                  ולנרשמים לשנה ב׳ ומעלה בחוגים שבהם נדרשת הבחינה.
                </li>
                <li>
                  <strong>
                    ספטמבר <bdi dir="ltr">2027</bdi>:
                  </strong>{' '}
                  תקף לתחומים שיישארו פתוחים להרשמה, בהתאם לתנאי הקבלה באותו מועד.
                </li>
              </ul>
              <p>
                באוניברסיטה העברית נלקח הציון הגבוה מבין הבחינות. ציון פסיכומטרי ממועד אוקטובר{' '}
                <bdi dir="ltr">1990</bdi> ואילך תקף.
              </p>
            </td>
          </tr>
          <tr>
            <th scope="row">אוניברסיטת תל אביב — רפואת שיניים</th>
            <td data-label="המידע שפורסם">לא פורסם בעמוד הרשמי לתשפ״ח.</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

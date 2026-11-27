import Link from 'next/link';
import {
  MEDICINE_ADMISSIONS,
  type MedicineAdmissionRow,
  type MedicineCell,
} from '@/data/admissions/medicineAdmissions';
import styles from './MedicineAdmissionsGuide.module.css';

export const MEDICINE_ANSWER =
  'איך מתקבלים לרפואה? הקבלה לרפואה שש־שנתית עוברת שלושה שלבים: עמידה בסף הפסיכומטרי והסכם, מבחן מיון — מו״ר או מרק״ם בתל אביב, בטכניון ובאוניברסיטה העברית, ובבן־גוריון מבחן ממוחשב ושני ראיונות — ואז דירוג סופי. לכל אוניברסיטה סולם משלה, ולכן משווים כל מספר רק לסף שלה. כאן תמצאו את שלבי הקבלה ואת המועדים לכל אוניברסיטה.';

export const MEDICINE_FAQS = [
  {
    question: 'מה ציון הפסיכומטרי המינימלי לרפואה?',
    answer:
      'באוניברסיטה העברית ובתל אביב: 700. בבר־אילן: 680, יחד עם בגרות משוקללת 101 ואנגלית 120. בבן־גוריון הסף נקבע בכל שנה, ובטכניון סף הזימון למו״ר לפי סכם מתפרסם לקראת סוף מאי.',
  },
  {
    question: 'כמה משקל יש למו״ר או למרק״ם?',
    answer:
      'באוניברסיטה העברית צריך 200 לפחות כדי לעבור לשלב ג׳, והציון הסופי הוא 60% מו״ר/מרק״ם ו־40% בגרות ופסיכומטרי משוקלל. בטכניון, בתשפ״ז ציון מו״ר מתחת ל־190 נדחה, ובמסלול הסכם הציון המשוקלל הוא 70% מו״ר ו־30% סכם.',
  },
  {
    question: 'מה היה ציון הקבלה הסופי בתשפ״ז?',
    answer:
      'באוניברסיטה העברית ציון הקבלה הסופי היה 25.708, ובטכניון ציון מו״ר משוקלל לקבלה היה 205. הסולמות שונים, ולכן אין להשוות ביניהם.',
  },
  {
    question: 'עד מתי נרשמים לרפואה לתשפ״ח?',
    answer:
      'באוניברסיטה העברית עד 30.04.2027, ומועד אפריל 2027 הוא הפסיכומטרי האחרון שנחשב. בתל אביב מועדי תשפ״ח יעודכנו; לתשפ״ז ההרשמה הסתיימה ב־30.04.2026.',
  },
] as const;

export const medicineFaqLd = {
  '@type': 'FAQPage',
  mainEntity: MEDICINE_FAQS.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

function BidiText({ text }: { text: string }) {
  return text.split(/(\d+(?:[.,]\d+)*(?:%|–\d+)?)/g).map((part, index) =>
    /^\d/.test(part) ? (
      <bdi dir="ltr" className="whitespace-nowrap" key={index}>
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

function Cell({ cell }: { cell: MedicineCell }) {
  if (cell.kind === 'notPublished') return <>לא מפורסם בעמוד הרשמי</>;
  if (cell.kind === 'pending') return <>יעודכן</>;
  return (
    <>
      <BidiText text={cell.text} />
      {cell.cycle && <span className={styles.cycle}>({cell.cycle})</span>}
    </>
  );
}

const columns = [
  { key: 'minimumPsychometric', label: 'פסיכומטרי מינימלי' },
  { key: 'stageOne', label: 'שלב 1' },
  { key: 'screening', label: 'מבחן מיון' },
  { key: 'screeningWeight', label: 'משקל או מינימום במיון' },
  { key: 'lastFinal', label: 'ציון סופי אחרון' },
  { key: 'registrationDeadline', label: 'מועד אחרון להרשמה' },
  { key: 'lastPsychometricSitting', label: 'מועד פסיכומטרי אחרון' },
] as const;

function AdmissionTable({
  rows,
  child = false,
}: {
  rows: readonly MedicineAdmissionRow[];
  child?: boolean;
}) {
  return (
    <div className={styles.tableWrap}>
      <table
        id={child ? undefined : 'medicine-admission-table'}
        className={`${styles.table}${child ? ` ${styles.childTable}` : ''}`}
      >
        <caption className="sr-only">שלבי הקבלה לרפואה</caption>
        <thead>
          <tr>
            <th scope="col">אוניברסיטה</th>
            {columns.map(({ key, label }) => (
              <th key={key} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.programId}>
              <th scope="row">
                <Link href={`/programs/${row.programId}`}>{row.institution}</Link>
              </th>
              {columns.map(({ key, label }) => (
                <td key={key} data-label={label}>
                  <span>
                    <Cell cell={row[key]} />
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MedicineAdmissionChild({ row }: { row: MedicineAdmissionRow }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-2xl font-bold">שלבי הקבלה לרפואה — {row.institution}</h2>
      <AdmissionTable rows={[row]} child />
      <Link
        className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
        href="/programs/medicine#medicine-admission-table"
      >
        השוואת שלבי הקבלה לרפואה בכל האוניברסיטאות
      </Link>
    </section>
  );
}

export default function MedicineAdmissionsGuide() {
  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-2xl font-bold">שלבי הקבלה לרפואה לפי אוניברסיטה</h2>
        <AdmissionTable rows={MEDICINE_ADMISSIONS} />
        <ul className="mt-5 space-y-1 text-sm leading-6 text-slate-600">
          {MEDICINE_ADMISSIONS.map((row) => (
            <li key={row.programId}>
              <strong>{row.institution}:</strong> <BidiText text={row.footnote} />
            </li>
          ))}
        </ul>
        <Link
          className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
          href="/psychometric-dates"
        >
          מועדי הבחינה הפסיכומטרית
        </Link>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">מו״ר ומרק״ם: מי נבחן במה ומה השתנה ב־2026</h2>
        <p className="mt-3 leading-7 text-slate-700">
          מי שנרשמים לתל אביב או לטכניון נבחנים במו״ר; מי שנרשמים רק לאוניברסיטה העברית נבחנים
          במרק״ם. נרשמים גם לטכניון וגם לעברית משובצים באקראי לאחת מהן בלבד. החל מ־2026 אין ציון
          כולל מטעם מאל״ו: ציוני השאלון האישי־ביוגרפי, מרכז ההערכה ושאלון שאו״ל מדווחים בנפרד, וכל
          מוסד משקלל אותם לפי מדיניותו. מועדי 2027 טרם פורסמו.
        </p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">שאלות נפוצות על קבלה לרפואה</h2>
        <div className="mt-3 divide-y divide-slate-200">
          {MEDICINE_FAQS.map(({ question, answer }, index) => (
            <details key={question} open className="py-2">
              <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
                {question}
              </summary>
              <p className="pb-2 leading-7 text-slate-700">
                <BidiText text={answer} />
              </p>
              {index === 0 && (
                <Link
                  className="inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
                  href="/sekhem-calculator"
                >
                  מחשבון סכם
                </Link>
              )}
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

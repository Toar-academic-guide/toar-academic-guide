import Link from 'next/link';
import { isLawBarOutcomeStale, lawBarOutcomes, type LawBarOutcomeRow } from '@/data/lawBarOutcomes';

const hubPath = '/programs/law#bar-pass-rates';

function StaleNotice() {
  if (!isLawBarOutcomeStale()) return null;
  return (
    <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-slate-800">
      {lawBarOutcomes.staleNotice}
    </p>
  );
}

export function LawBarOutcomesTable() {
  const [captionBeforeUrl, captionAfterUrl] = lawBarOutcomes.caption.split(
    lawBarOutcomes.sourceUrl,
  );
  return (
    <section
      id="bar-pass-rates"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-xl font-bold">{lawBarOutcomes.question}</h2>
      <p className="mt-3 leading-7 text-slate-700">{lawBarOutcomes.answer}</p>
      <div className="mt-6">
        <StaleNotice />
        <div>
          <table className="w-full table-fixed border-collapse text-right text-[11px] leading-4 sm:text-sm sm:leading-6">
            <caption className="mb-3 text-right text-sm leading-6 text-slate-700">
              {captionBeforeUrl}
              <a
                href={lawBarOutcomes.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block min-h-11 max-w-full break-all py-2 align-middle text-[#6554b8] underline underline-offset-2"
              >
                <bdi dir="ltr">{lawBarOutcomes.sourceUrl}</bdi>
              </a>
              {captionAfterUrl}
            </caption>
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="w-[42%] border border-slate-200 p-1.5 font-semibold sm:p-3"
                >
                  מקום לימוד
                </th>
                <th scope="col" className="border border-slate-200 p-1.5 font-semibold sm:p-3">
                  <span className="sm:hidden">נבחנים</span>
                  <span className="hidden sm:inline">מספר נבחנים</span>
                </th>
                <th scope="col" className="border border-slate-200 p-1.5 font-semibold sm:p-3">
                  <span className="sm:hidden">עוברים</span>
                  <span className="hidden sm:inline">מספר עוברים</span>
                </th>
                <th scope="col" className="border border-slate-200 p-1.5 font-semibold sm:p-3">
                  <span className="sm:hidden">מעבר</span>
                  <span className="hidden sm:inline">שיעור מעבר</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lawBarOutcomes.rows.map((row) => (
                <tr key={row.school}>
                  <th
                    scope="row"
                    className="break-words border border-slate-200 p-1.5 font-medium sm:p-3"
                  >
                    {'programId' in row ? (
                      <Link
                        href={`/programs/${row.programId}`}
                        className="flex min-h-11 items-center text-[#6554b8] underline underline-offset-2"
                      >
                        {row.school}
                      </Link>
                    ) : (
                      row.school
                    )}
                  </th>
                  <td className="border border-slate-200 p-1.5 sm:p-3">
                    <bdi dir="ltr">{row.candidates}</bdi>
                  </td>
                  <td className="border border-slate-200 p-1.5 sm:p-3">
                    <bdi dir="ltr">{row.passed}</bdi>
                  </td>
                  <td className="border border-slate-200 p-1.5 sm:p-3">
                    <bdi dir="ltr">{row.rate}%</bdi>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 leading-7 text-slate-700">{lawBarOutcomes.total}</p>
      </div>
    </section>
  );
}

export function LawBarOutcomeLine({ row }: { row: LawBarOutcomeRow }) {
  if (!('programId' in row)) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <StaleNotice />
      <p className="leading-7 text-slate-700">
        ב{lawBarOutcomes.sitting} של בחינת ההסמכה בכתב של לשכת עורכי הדין, מי שלמדו {row.studiedAt}{' '}
        וניגשו בפעם הראשונה: <bdi dir="ltr">{row.passed}</bdi> עוברים מתוך{' '}
        <bdi dir="ltr">{row.candidates}</bdi> נבחנים, שיעור מעבר <bdi dir="ltr">{row.rate}%</bdi>.
        מקור: לשכת עורכי הדין, נבדק בתאריך <bdi dir="ltr">{lawBarOutcomes.checkedDate}</bdi>. הטבלה
        המלאה לכל המוסדות ב
        <Link
          href={hubPath}
          className="inline-flex min-h-11 items-center align-middle text-[#6554b8] underline underline-offset-2"
        >
          עמוד משפטים
        </Link>
        .
      </p>
    </section>
  );
}

import ProgramTrackedLink from '@/components/ProgramTrackedLink';
import ProgramName from '@/components/ProgramName';
import { RelatedPrograms } from '@/components/seo/CatalogueLinks';
import {
  canLinkToSekhemCalculator,
  loadSekhemCalculatorOfferings,
} from '@/lib/sekhemCalculatorSupport';
import SekhemCalculatorLink from '@/components/seo/SekhemCalculatorLink';
import { getPublicRelatedPrograms, getPublicSubjectHub } from '@/lib/publicCatalogueLinks';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import WayPageShell from '@/components/WayPageShell';
import AdmissionRequirements from '@/components/AdmissionRequirements';
import TechnionThresholdNotice from '@/components/TechnionThresholdNotice';
import RequirementTiles from '@/components/RequirementTiles';

import {
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';
import { catalogueAdmissionRequirements } from '@/lib/catalogueDisplayText';
import { ROUTES } from '@/lib/routes';
import { buildProgramMetadata } from '@/lib/seo/metadata';
import { programLd, programBreadcrumbLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import { LawBarOutcomeLine, LawBarOutcomesTable } from '@/components/seo/LawBarOutcomes';
import { lawBarOutcomes } from '@/data/lawBarOutcomes';
import { absoluteUrl } from '@/lib/site';
import type { PublicProgramPageData } from '@/lib/publicCataloguePages';

export const dynamic = 'force-dynamic';

interface ProgramPageProps {
  params: Promise<{ programId: string }>;
}

export async function generateMetadata({ params }: ProgramPageProps) {
  const { programId } = await params;
  const metadata = await buildProgramMetadata(programId);
  if (programId === 'law') {
    const title = 'לימודי משפטים: תנאי קבלה וסיכויי קבלה | MyWay';
    const description =
      'משפטים ב-12 מוסדות לימוד: תנאי קבלה, שיעורי מעבר בבחינת הלשכה במועד קיץ 2026, ובדיקת סיכויי קבלה ב-MyWay. התנאים המחייבים באתר המוסד.';
    return {
      ...metadata,
      title: { absolute: title },
      description,
      openGraph: { ...metadata.openGraph, title, description },
    };
  }
  if (programId !== 'datascience') return metadata;
  const title = 'מדעי הנתונים: השוואת מסלולים ותנאי קבלה';
  const description =
    'השוו מסלולי לימוד במדעי הנתונים, הבינו את ההבדל ממדעי המחשב ובדקו את תנאי הקבלה של התוכניות שמעניינות אתכם.';
  return {
    ...metadata,
    title,
    description,
    openGraph: { ...metadata.openGraph, title, description },
  };
}

async function withAllLawInstitutions(data: PublicProgramPageData): Promise<PublicProgramPageData> {
  const additions = await Promise.all(
    lawBarOutcomes.additionalHubProgramIds.map((id) => getPublicProgramPageData(id)),
  );
  const institutions = [...data.institutions];
  const institutionProgramPaths = { ...data.institutionProgramPaths };
  for (const [index, addition] of additions.entries()) {
    const institution = addition?.institutions[0];
    if (!institution)
      throw new Error(`Missing law programme ${lawBarOutcomes.additionalHubProgramIds[index]}`);
    if (!institutions.some((entry) => entry.id === institution.id)) institutions.push(institution);
    institutionProgramPaths[institution.id] =
      `/programs/${lawBarOutcomes.additionalHubProgramIds[index]}`;
  }
  return { ...data, institutions, institutionProgramPaths };
}

function lawOutcomeSchema() {
  return [
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: lawBarOutcomes.question,
          acceptedAnswer: { '@type': 'Answer', text: lawBarOutcomes.answer },
        },
      ],
    },
    {
      '@type': 'Dataset',
      name: lawBarOutcomes.tableTitle,
      description: lawBarOutcomes.caption,
      url: absoluteUrl('/programs/law#bar-pass-rates'),
      isBasedOn: lawBarOutcomes.sourceUrl,
      creator: { '@type': 'Organization', name: 'לשכת עורכי הדין' },
      temporalCoverage: lawBarOutcomes.examDate,
      datePublished: lawBarOutcomes.publicationDate,
    },
  ];
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { programId } = await params;
  const originalData = await getPublicProgramPageData(programId);
  const data =
    programId === 'law' && originalData?.isGeneral
      ? await withAllLawInstitutions(originalData)
      : originalData;

  if (!data) {
    const subject = await getPublicSubjectHub(programId);
    if (!subject) notFound();
    return (
      <WayPageShell>
        <main
          dir="rtl"
          data-page-kind="subject"
          className="mx-auto max-w-4xl px-4 py-10 text-right sm:px-6"
        >
          <h1 className="mb-8 text-3xl font-bold">
            <ProgramName name={subject.hub.name} />
          </h1>{' '}
          <ul className="grid gap-4 sm:grid-cols-2">
            {subject.hub.programs.map((program) => (
              <li key={program.id}>
                <Link
                  className="inline-flex min-h-11 items-center text-[var(--text-body)] underline-offset-4 hover:underline"
                  href={`/programs/${encodeURIComponent(program.id)}`}
                >
                  {subject.institutions.find(
                    (institution) => institution.id === program.institutionId,
                  )?.name ?? program.institution}{' '}
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </WayPageShell>
    );
  }

  const { program, institutions, isGeneral, institutionProgramPaths } = data;
  const institutionRequirementSources = await getPublicProgramRequirementSources(data);
  const related = await getPublicRelatedPrograms(program.id);
  const possibleCalculatorInstitutions = institutions.filter((institution) =>
    canLinkToSekhemCalculator(program, institution.id),
  );
  const calculatorOfferings = possibleCalculatorInstitutions.length
    ? await loadSekhemCalculatorOfferings()
    : [];
  const hasCalculator = possibleCalculatorInstitutions.some((institution) =>
    canLinkToSekhemCalculator(program, institution.id, calculatorOfferings),
  );

  return (
    <WayPageShell>
      <JsonLd
        data={[
          await programLd(data),
          programBreadcrumbLd(data),
          ...(programId === 'law' ? lawOutcomeSchema() : []),
        ]}
      />
      <main
        dir="rtl"
        // Lets crawl tests tell subject pages from institution programme pages.
        data-page-kind={isGeneral ? 'subject' : 'programme'}
        className="px-4 py-10 text-right text-slate-900 sm:px-6"
      >
        <section className="mx-auto flex max-w-4xl flex-col gap-8">
          <Link
            href={ROUTES.home}
            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            חזרה לדף הבית{' '}
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-cyan-700">{program.category}</p>{' '}
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              <ProgramName name={program.name} />
            </h1>{' '}
            <div className="mt-6 flex flex-wrap gap-3">
              {hasCalculator && (
                <ProgramTrackedLink
                  event="program_calculator_cta_clicked"
                  programId={program.id}
                  institutionId={institutions.length === 1 ? institutions[0].id : ''}
                  href={`${ROUTES.calculator}?program=${encodeURIComponent(program.id)}`}
                  className="way-button-primary px-5 py-2.5 text-sm font-semibold transition"
                >
                  בדקו אם אתם מתקבלים{' '}
                </ProgramTrackedLink>
              )}
              <Link
                href={ROUTES.assessment}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                מה מתאים לי?{' '}
              </Link>
            </div>
          </div>
          {isGeneral && program.id === 'datascience' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">מדעי הנתונים או מדעי המחשב — מה מתאים לכם?</h2>
              <p className="mt-3 leading-7 text-slate-700">
                רוצים לבנות תוכנות ומערכות, או להפיק תובנות מנתונים? מדעי המחשב מתמקדים בתכנות,
                באלגוריתמים ובמערכות מחשב. מדעי הנתונים משלבים תכנות עם סטטיסטיקה ולמידת מכונה כדי
                לנתח מידע ולבנות מודלים. השוו את תוכנית הלימודים ואת תנאי הקבלה של כל מסלול לפני
                שבוחרים.
              </p>
              <table className="mt-5 w-full table-fixed border-collapse text-right text-[13px] leading-5 sm:text-sm sm:leading-6">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      scope="col"
                      className="w-[28%] border border-slate-200 p-2 align-top font-semibold sm:p-3"
                    >
                      מה משווים?
                    </th>
                    <th
                      scope="col"
                      className="w-[36%] border border-slate-200 p-2 align-top font-semibold sm:p-3"
                    >
                      מדעי המחשב
                    </th>
                    <th
                      scope="col"
                      className="w-[36%] border border-slate-200 p-2 align-top font-semibold sm:p-3"
                    >
                      מדעי הנתונים
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th
                      scope="row"
                      className="border border-slate-200 p-2 align-top font-semibold sm:p-3"
                    >
                      הדגש בלימודים
                    </th>
                    <td className="border border-slate-200 p-2 align-top sm:p-3">
                      פיתוח תוכנה, אלגוריתמים ומערכות
                    </td>
                    <td className="border border-slate-200 p-2 align-top sm:p-3">
                      ניתוח נתונים, סטטיסטיקה ולמידת מכונה
                    </td>
                  </tr>
                  <tr>
                    <th
                      scope="row"
                      className="border border-slate-200 p-2 align-top font-semibold sm:p-3"
                    >
                      נושאים שכדאי לחפש בתוכנית
                    </th>
                    <td className="border border-slate-200 p-2 align-top sm:p-3">
                      מבני נתונים, מערכות הפעלה ורשתות
                    </td>
                    <td className="border border-slate-200 p-2 align-top sm:p-3">
                      הסתברות, הסקה סטטיסטית ומודלים של למידת מכונה
                    </td>
                  </tr>
                  <tr>
                    <th
                      scope="row"
                      className="border border-slate-200 p-2 align-top font-semibold sm:p-3"
                    >
                      הצעד הבא
                    </th>
                    <td className="border border-slate-200 p-2 align-top sm:p-3">
                      <Link
                        href="/programs/cs"
                        className="font-semibold text-[#6554b8] underline underline-offset-2"
                      >
                        השוו תוכניות במדעי המחשב
                      </Link>
                    </td>
                    <td className="border border-slate-200 p-2 align-top sm:p-3">
                      השוו את התוכניות במדעי הנתונים בהמשך העמוד
                    </td>
                  </tr>
                </tbody>
              </table>
              <Link
                href="/sekhem-calculator"
                className="mt-5 inline-block font-semibold text-[#6554b8] underline underline-offset-2"
              >
                בדקו את הציונים שלכם במחשבון הסכם
              </Link>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                <a
                  href="https://wgalil.ac.il/blog/computer-science-vs-data-science/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  על ההבדל בין התחומים — האקדמית גליל מערבי
                </a>
                <a
                  href="https://www.colman.ac.il/academics/ba/data-science/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  מדע הנתונים — המסלול האקדמי המכללה למינהל
                </a>
              </div>
            </section>
          )}
          {isGeneral && program.id === 'cs' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">מתלבטים בין מדעי המחשב למדעי הנתונים?</h2>
              <p className="mt-3 leading-7 text-slate-700">
                מדעי המחשב מתמקדים בפיתוח תוכנה, אלגוריתמים ומערכות. במדעי הנתונים הדגש הוא על ניתוח
                מידע, סטטיסטיקה ולמידת מכונה. השוו את תוכני הלימוד ואת תנאי הקבלה בשני התחומים.
              </p>
              <Link
                href="/programs/datascience"
                className="mt-4 inline-block font-semibold text-[#6554b8] underline underline-offset-2"
              >
                להשוואה עם מדעי הנתונים
              </Link>
            </section>
          )}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">מוסדות לימוד</h2>{' '}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {institutions.map((institution) => (
                <div
                  key={institution.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                >
                  <Link
                    className={isGeneral ? 'inline-flex min-h-11 items-center' : undefined}
                    href={institutionProgramPaths[institution.id]}
                  >
                    {institution.name}{' '}
                  </Link>
                  <ProgramTrackedLink
                    event="program_contact_cta_clicked"
                    programId={program.id}
                    institutionId={institution.id}
                    className="shrink-0 rounded-full border border-[#c9c2e4] px-3 py-2 text-sm text-[#6554b8]"
                    href={`/enquiry?program=${encodeURIComponent(program.id)}&institution=${encodeURIComponent(institution.id)}`}
                  >
                    קבלו שיחה מהמוסד{' '}
                  </ProgramTrackedLink>
                </div>
              ))}
            </div>
          </section>
          {isGeneral && program.id === 'law' && <LawBarOutcomesTable />}
          {program.isListed !== false && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">תנאי קבלה</h2>{' '}
              <SekhemCalculatorLink
                data={data}
                sources={institutionRequirementSources}
                offerings={calculatorOfferings}
              />{' '}
              <div className="mt-4 space-y-6">
                {institutions.length === 0 && (
                  <AdmissionRequirements
                    requirements={catalogueAdmissionRequirements(program.admissionRequirements)}
                  />
                )}
                {institutions.map((institution) => {
                  if (
                    program.id === 'law' &&
                    lawBarOutcomes.additionalHubProgramIds.some(
                      (id) => institutionProgramPaths[institution.id] === `/programs/${id}`,
                    )
                  ) {
                    return (
                      <div key={institution.id}>
                        <h3 className="font-semibold">{institution.name}</h3>
                        <Link
                          href={institutionProgramPaths[institution.id]}
                          className="mt-2 inline-block font-semibold text-[#6554b8] underline"
                        >
                          לפרטים המלאים
                        </Link>
                      </div>
                    );
                  }
                  const source = institutionRequirementSources[institution.id];
                  const officialLink = source.officialUrl && (
                    <ProgramTrackedLink
                      event="institution_site_clicked"
                      programId={program.id}
                      institutionId={institution.id}
                      href={source.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#6554b8] underline"
                    >
                      לאתר המוסד
                    </ProgramTrackedLink>
                  );
                  return (
                    <div key={institution.id}>
                      {institutions.length > 1 && (
                        <h3 className="font-semibold">{institution.name}</h3>
                      )}
                      {source.requirements.length === 0 && (
                        <TechnionThresholdNotice
                          programId={program.id}
                          institutionId={institution.id}
                        />
                      )}
                      {source.requirements.length > 0 ? (
                        <>
                          <RequirementTiles
                            program={source.program}
                            showCalculatorLink
                            institutionId={institution.id}
                            requirements={source.requirements}
                          />
                          {(source.fullDetailsPath ||
                            officialLink ||
                            source.officialCalculatorUrl) && (
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                              {source.fullDetailsPath && (
                                <Link
                                  href={source.fullDetailsPath}
                                  className="font-semibold text-[#6554b8] underline"
                                >
                                  לפרטים המלאים{' '}
                                </Link>
                              )}
                              {officialLink}
                              {source.officialCalculatorUrl && (
                                <ProgramTrackedLink
                                  event="institution_calculator_clicked"
                                  programId={program.id}
                                  institutionId={institution.id}
                                  href={source.officialCalculatorUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[var(--text-muted)] hover:underline"
                                >
                                  {' '}
                                  למחשבון המכללה{' '}
                                </ProgramTrackedLink>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-[#35415b]">
                          {source.fullDetailsPath ? (
                            <Link
                              href={source.fullDetailsPath}
                              className="font-semibold text-[#6554b8] underline"
                            >
                              לפרטים על המסלול{' '}
                            </Link>
                          ) : (
                            <>
                              תנאי הקבלה מפורטים באתר המוסד.{' '}
                              {officialLink || (
                                <Link
                                  href={institutionProgramPaths[institution.id]}
                                  className="font-semibold text-[#6554b8] underline"
                                >
                                  לדף המוסד{' '}
                                </Link>
                              )}
                            </>
                          )}
                        </p>
                      )}
                      {source.checked && (
                        <p
                          dir="rtl"
                          className="mt-2 text-right text-xs leading-[18px] font-normal text-[var(--text-muted)]"
                        >
                          עודכן לאחרונה: {source.checked.date}
                          {source.checked.sourceUrl &&
                            !(program.id === 'haifa_cs' && institution.id === 'haifa') && (
                              <>
                                {' · מקור: '}
                                <a
                                  href={source.checked.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-inherit no-underline hover:underline focus-visible:underline"
                                >
                                  אתר {institution.name}
                                </a>
                              </>
                            )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}{' '}
          {lawBarOutcomes.rows.map((row) =>
            'programId' in row && row.programId === program.id ? (
              <LawBarOutcomeLine key={row.programId} row={row} />
            ) : null,
          )}
          <RelatedPrograms {...related} />
        </section>
      </main>
    </WayPageShell>
  );
}

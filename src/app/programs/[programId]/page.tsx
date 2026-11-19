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
import { notFound, permanentRedirect } from 'next/navigation';
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
import { ISSUE_370_UNREVIEWED_CALCULATOR_PAIRS } from '@/data/admissions/issue370Corrections';
import { CsComparison, CsFaq, csFaqLd } from '@/components/seo/CsComparison';
import {
  csAnswer,
  csComparedProgramIds,
  csHubAdmissionSourceUrls,
  csReichmanHubRequirements,
} from '@/data/csComparison';
import { PsychologyComparison, psychologyFaqLd } from '@/components/seo/PsychologyComparison';
import { HaifaPsychologyOfek } from '@/components/seo/HaifaPsychologyOfek';
import { LawBarOutcomeLine, LawBarOutcomesTable } from '@/components/seo/LawBarOutcomes';
import { lawBarOutcomes } from '@/data/lawBarOutcomes';
import { absoluteUrl } from '@/lib/site';
import {
  NursingAnswer,
  NursingFaq,
  nursingFaqLd,
  NursingHubLink,
  NursingInstitutionsTable,
  NursingRelatedLink,
} from '@/components/seo/NursingGuide';
import { nursingInstitutionCount, nursingInstitutions } from '@/data/nursingInstitutions';
import PrepGuide, { prepFaqLd } from '@/components/seo/PrepGuide';
import { prepRow } from '@/lib/prepGuide';

const nursingRelatedSubjects = new Set(['medicine', 'physiotherapy', 'occupational_therapy']);

export const dynamic = 'force-dynamic';

interface ProgramPageProps {
  params: Promise<{ programId: string }>;
}

const atudaLinksBySubject: Record<string, string> = {
  engineering: 'עתודה אקדמית: מגמות הנדסה, תוכניות עילית ומועדי 2027–2028',
  ee: 'לומדים חשמל בעתודה? מסלול ״דיגמא״ ותוכניות ״פסגות״ ו״רעמים״',
  cs: 'מדעי המחשב בעתודה (מסלול ״אמירים״): מוסדות ומועדים',
  softwareeng: 'הנדסת תוכנה בעתודה: מוסדות ותוכנית ״פסגות״',
};

function AtudaLinkText({ text }: { text: string }) {
  const match = text.match(/^(.*?)(\S+) (2027–2028)$/);
  if (!match) return text;
  const [, before, word, year] = match;
  return (
    <>
      {before}
      <span className="whitespace-nowrap">
        {word}
        {'\u00A0'}
        <bdi dir="ltr">{year}</bdi>
      </span>
    </>
  );
}

const onoLegacyPageTitle = 'הלימודים בקריה האקדמית אונו';

export async function generateMetadata({ params }: ProgramPageProps) {
  const { programId } = await params;
  if (programId === 'ono_medicine') {
    return {
      title: onoLegacyPageTitle,
      description: 'מסלולי הלימוד בקריה האקדמית אונו מופיעים בעמוד המוסד.',
      alternates: { canonical: '/programs/ono_medicine' },
      robots: { index: false, follow: true },
    };
  }
  const metadata = await buildProgramMetadata(programId);
  if (programId === 'nursing') {
    const title = 'לימודי סיעוד: איפה לומדים ותנאי קבלה';
    const description = `איפה לומדים סיעוד? כל ${nursingInstitutionCount} המסגרות לתואר ראשון ברשימת משרד הבריאות, מסלולי הסבה ועתודה, ותנאי קבלה לפי מוסד עם קישור לאתר הרשמי.`;
    return {
      ...metadata,
      title,
      description,
      openGraph: { ...metadata.openGraph, title, description },
    };
  }
  if (programId === 'prep') {
    const title = 'מכינה קדם־אקדמית: מה היא מחליפה ומה נדרש להיכנס';
    const description =
      'השוואת מכינות קדם־אקדמיות: מה התעודה מחליפה, מה נדרש כדי להיכנס, לאילו תחומים היא מיועדת וכמה זמן היא נמשכת, עם קישורים למוסדות.';
    return {
      ...metadata,
      title,
      description,
      openGraph: { ...metadata.openGraph, title, description },
    };
  }
  if (programId === 'cs') {
    const description =
      'ספי הקבלה למדעי המחשב בטכניון, בתל אביב, בחיפה וברייכמן, כל סף בסולם של המוסד. בדקו מסלולים נתמכים במחשבון MyWay.';
    return {
      ...metadata,
      description,
      openGraph: { ...metadata.openGraph, description },
    };
  }
  if (programId === 'law') {
    const title = 'לימודי משפטים: תנאי קבלה וסיכויי קבלה';
    const description =
      'משפטים ב-12 מוסדות לימוד: תנאי קבלה, שיעורי מעבר בבחינת הלשכה במועד קיץ 2026, ובדיקת סיכויי קבלה ב-MyWay. התנאים המחייבים באתר המוסד.';
    return {
      ...metadata,
      title,
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
  if (programId === 'telhai_nursing') permanentRedirect('/programs/nursing');
  if (programId === 'ono_socialwork' || programId === 'tlvyaffo_socialwork')
    permanentRedirect('/programs/social_work');
  if (programId === 'ono_medicine') {
    return (
      <WayPageShell>
        <main dir="rtl" className="mx-auto max-w-4xl px-4 py-10 text-right sm:px-6">
          <h1 className="text-3xl font-bold">{onoLegacyPageTitle}</h1>
          <p className="mt-3 text-[var(--text-body)]">העמוד הזה כבר לא מציג מסלול לימודים.</p>
          <Link
            href="/institutions/ono"
            className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
          >
            למסלולי הלימוד באונו
          </Link>
        </main>
      </WayPageShell>
    );
  }
  const pageData = await getPublicProgramPageData(programId);
  const isNursingRelatedSubject = nursingRelatedSubjects.has(programId);

  if (!pageData) {
    const subject = await getPublicSubjectHub(programId);
    if (!subject) notFound();
    if (programId === 'prep') {
      return (
        <WayPageShell>
          <main dir="rtl" data-page-kind="subject">
            <JsonLd data={prepFaqLd} />
            <PrepGuide programIds={subject.hub.programs.map((program) => program.id)} />
          </main>
        </WayPageShell>
      );
    }
    return (
      <WayPageShell>
        <main
          dir="rtl"
          data-page-kind="subject"
          className="mx-auto max-w-4xl px-4 py-10 text-right sm:px-6"
        >
          <h1 className="mb-8 text-3xl font-bold">
            <ProgramName name={subject.hub.name} />
          </h1>
          {(atudaLinksBySubject[programId] || programId !== 'medicine') && (
            <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              {atudaLinksBySubject[programId] && (
                <Link
                  href="/atuda"
                  className="inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
                >
                  <AtudaLinkText text={atudaLinksBySubject[programId]} />
                </Link>
              )}
              {programId !== 'medicine' && (
                <Link
                  href="/calculator"
                  className="inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
                >
                  איך מחשבון סיכויי הקבלה עובד
                </Link>
              )}
            </div>
          )}
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
          {isNursingRelatedSubject && (
            <div className="mt-8">
              <NursingRelatedLink />
            </div>
          )}
        </main>
      </WayPageShell>
    );
  }

  const isNursingHub = pageData.isGeneral && programId === 'nursing';
  const data = isNursingHub
    ? { ...pageData, institutions: pageData.institutions.filter(({ id }) => id !== 'telhai') }
    : pageData;
  const { program, institutions, isGeneral, institutionProgramPaths } = data;
  const isNursingProgramme = nursingInstitutions.some((row) => row.programId === programId);
  const prep = prepRow(program.id);
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
  const hasUnreviewedHubRoute =
    isGeneral &&
    institutions.some((institution) =>
      ISSUE_370_UNREVIEWED_CALCULATOR_PAIRS.has(`${program.id}__${institution.id}`),
    );
  const isCsHub = isGeneral && program.id === 'cs';
  const isPsychologyHub = isGeneral && program.id === 'psychology';

  return (
    <WayPageShell>
      <JsonLd
        data={[
          await programLd(data),
          programBreadcrumbLd(data),
          ...(isCsHub ? [csFaqLd()] : []),
          ...(isPsychologyHub ? [psychologyFaqLd()] : []),
          ...(isNursingHub ? [nursingFaqLd()] : []),
          ...(programId === 'law' ? lawOutcomeSchema() : []),
        ]}
      />
      <main
        dir="rtl"
        // Lets crawl tests tell subject pages from institution programme pages.
        data-page-kind={isGeneral ? 'subject' : 'programme'}
        className="px-4 py-10 text-right text-slate-900 sm:px-6"
      >
        <section
          className={`mx-auto flex flex-col gap-8 ${isCsHub || isPsychologyHub || isNursingHub ? 'max-w-6xl' : 'max-w-4xl'}`}
        >
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
            {isCsHub && <p className="mt-4 max-w-3xl leading-7 text-slate-700">{csAnswer}</p>}
            {isNursingHub && <NursingAnswer />}
            <div className="mt-6 flex flex-wrap gap-3">
              {hasCalculator && !hasUnreviewedHubRoute && (
                <ProgramTrackedLink
                  event="program_calculator_cta_clicked"
                  programId={program.id}
                  institutionId={institutions.length === 1 ? institutions[0].id : ''}
                  href={`${ROUTES.calculator}?program=${encodeURIComponent(program.id)}`}
                  className="way-button-primary px-5 py-2.5 text-sm font-semibold transition"
                >
                  {isCsHub ? 'בדקו מסלולים נתמכים' : 'בדקו אם אתם מתקבלים'}{' '}
                </ProgramTrackedLink>
              )}
              {isGeneral && program.id !== 'medicine' && (
                <Link
                  href="/calculator"
                  className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[#6554b8] underline underline-offset-2"
                >
                  איך מחשבון סיכויי הקבלה עובד
                </Link>
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
            </section>
          )}
          {isCsHub && <CsComparison />}
          {isCsHub && (
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
          {isPsychologyHub && <PsychologyComparison />}
          {isNursingHub && (
            <NursingInstitutionsTable
              programmePaths={new Set(institutions.map(({ id }) => institutionProgramPaths[id]))}
            />
          )}
          {!isPsychologyHub && (
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
                      className={`shrink-0 rounded-full border border-[#c9c2e4] px-3 py-2 text-sm text-[#6554b8]${
                        program.id === 'law' &&
                        lawBarOutcomes.additionalHubProgramIds.some(
                          (id) => institutionProgramPaths[institution.id] === `/programs/${id}`,
                        )
                          ? ' inline-flex min-h-11 items-center'
                          : ''
                      }`}
                      href={`/enquiry?program=${encodeURIComponent(program.id)}&institution=${encodeURIComponent(institution.id)}`}
                    >
                      קבלו שיחה מהמוסד{' '}
                    </ProgramTrackedLink>
                  </div>
                ))}
              </div>
            </section>
          )}
          {isGeneral && program.id === 'law' && <LawBarOutcomesTable />}
          {!isPsychologyHub && program.isListed !== false && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">תנאי קבלה</h2>{' '}
              {!hasUnreviewedHubRoute && (
                <SekhemCalculatorLink
                  data={data}
                  sources={institutionRequirementSources}
                  offerings={calculatorOfferings}
                />
              )}{' '}
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
                          className="mt-2 inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline"
                        >
                          לפרטים המלאים
                        </Link>
                      </div>
                    );
                  }
                  const source = institutionRequirementSources[institution.id];
                  const isCsReichman = isCsHub && institution.id === 'reichman';
                  const displayRequirements = isCsReichman
                    ? [...csReichmanHubRequirements]
                    : source.requirements;
                  const currentSourceUrl = isCsHub
                    ? (csHubAdmissionSourceUrls[institution.id] ?? source.officialUrl)
                    : source.officialUrl;
                  const officialLinkHref =
                    currentSourceUrl &&
                    isCsHub &&
                    ['tau', 'huji', 'technion'].includes(institution.id)
                      ? `${currentSourceUrl}${currentSourceUrl.includes('?') ? '&' : '?'}utm_source=myway&utm_medium=referral`
                      : currentSourceUrl;
                  const officialLink = officialLinkHref && (
                    <ProgramTrackedLink
                      event="institution_site_clicked"
                      programId={program.id}
                      institutionId={institution.id}
                      href={officialLinkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        prep
                          ? 'inline-flex min-h-11 min-w-11 items-center font-semibold text-[#6554b8] underline'
                          : `font-semibold text-[#6554b8] underline ${isCsHub ? 'inline-flex min-h-11 items-center' : ''}`
                      }
                    >
                      לאתר המוסד
                    </ProgramTrackedLink>
                  );
                  const isTauNursing = isNursingHub && institution.id === 'tau';
                  return (
                    <div
                      key={institution.id}
                      id={isTauNursing ? 'tau' : undefined}
                      className={isTauNursing ? 'scroll-mt-24' : undefined}
                    >
                      {institutions.length > 1 && (
                        <h3 className="font-semibold">{institution.name}</h3>
                      )}
                      {!prep && displayRequirements.length === 0 && (
                        <TechnionThresholdNotice
                          programId={program.id}
                          institutionId={institution.id}
                        />
                      )}
                      {prep ? (
                        <div className="mt-3 space-y-3 text-sm leading-6 text-[#35415b]">
                          {prep.replaces && (
                            <p>
                              תעודת המכינה מחליפה את {prep.replaces}.{' '}
                              {prep.entry && `מבחן מיון לכניסה למכינה: ${prep.entry}`}
                            </p>
                          )}
                          {prep.afterCompletion && <p>{prep.afterCompletion}</p>}
                          {officialLink && <p>{officialLink}</p>}
                          <Link
                            href="/programs/prep"
                            className="inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline"
                          >
                            השוואת כל המכינות
                          </Link>
                        </div>
                      ) : displayRequirements.length > 0 ? (
                        <>
                          <RequirementTiles
                            program={source.program}
                            showCalculatorLink
                            institutionId={institution.id}
                            requirements={displayRequirements}
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
                    </div>
                  );
                })}
              </div>
              {isNursingProgramme && (
                <div className="mt-4 text-sm">
                  <NursingHubLink>כל המוסדות ללימודי סיעוד</NursingHubLink>
                </div>
              )}
            </section>
          )}{' '}
          {isGeneral && atudaLinksBySubject[program.id] && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <Link
                href="/atuda"
                className="inline-flex min-h-11 items-center font-semibold text-[#6554b8] underline underline-offset-2"
              >
                <AtudaLinkText text={atudaLinksBySubject[program.id]} />
              </Link>
            </section>
          )}
          {csComparedProgramIds.has(program.id) && !isGeneral && (
            <Link
              href="/programs/cs#cs-thresholds"
              className="inline-flex min-h-11 items-center self-start font-semibold text-[#6554b8] underline underline-offset-2"
            >
              השוו את ספי הקבלה למדעי המחשב בכל המוסדות
            </Link>
          )}{' '}
          {isCsHub && <CsFaq />}
          {program.id === 'haifa_psychology' && <HaifaPsychologyOfek />}
          {lawBarOutcomes.rows.map((row) =>
            'programId' in row && row.programId === program.id ? (
              <LawBarOutcomeLine key={row.programId} row={row} />
            ) : null,
          )}
          <RelatedPrograms
            {...related}
            programs={
              program.id === 'haifa_psychology'
                ? related.programs.filter((candidate) => candidate.id !== 'ono_psychology')
                : related.programs
            }
          />
          {isNursingHub && <NursingFaq />}
          {isNursingRelatedSubject && <NursingRelatedLink />}
        </section>
      </main>
    </WayPageShell>
  );
}

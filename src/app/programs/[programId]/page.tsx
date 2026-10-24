import { RelatedPrograms } from '@/components/seo/CatalogueLinks';
import { getPublicRelatedPrograms, getPublicSubjectHub } from '@/lib/publicCatalogueLinks';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import WayPageShell from '@/components/WayPageShell';
import AdmissionRequirements from '@/components/AdmissionRequirements';
import RequirementTiles from '@/components/RequirementTiles';

import {
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';
import { catalogueAdmissionRequirements } from '@/lib/catalogueDisplayText';
import { ROUTES } from '@/lib/routes';
import { buildProgramMetadata } from '@/lib/seo/metadata';
import { programLd, programBreadcrumbLd, programFaqPageLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';

export const dynamic = 'force-dynamic';

interface ProgramPageProps {
  params: Promise<{ programId: string }>;
}

export async function generateMetadata({ params }: ProgramPageProps) {
  const { programId } = await params;
  const metadata = await buildProgramMetadata(programId);
  if (metadata.title) return metadata;
  const data = await getPublicSubjectHub(programId);
  return data
    ? {
        title: `לימודי ${data.hub.name}`,
        alternates: { canonical: `/programs/${encodeURIComponent(data.hub.id)}` },
        ...(data.hub.programLinks === 0 ? { robots: { index: false, follow: true } } : {}),
      }
    : metadata;
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { programId } = await params;
  const data = await getPublicProgramPageData(programId);

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
          <h1 className="mb-8 text-3xl font-bold">{subject.hub.name}</h1>
          <ul className="grid gap-4 sm:grid-cols-2">
            {subject.hub.programs.map((program) => (
              <li key={program.id}>
                <Link
                  className="text-[var(--text-body)] underline-offset-4 hover:underline"
                  href={`/programs/${encodeURIComponent(program.id)}`}
                >
                  {subject.institutions.find(
                    (institution) => institution.id === program.institutionId,
                  )?.name ?? program.institution}
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
  const faq = programFaqPageLd(data, institutionRequirementSources);

  return (
    <WayPageShell>
      <JsonLd data={[await programLd(data), programBreadcrumbLd(data), ...(faq ? [faq] : [])]} />
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
            חזרה לדף הבית
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-cyan-700">{program.category}</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{program.name}</h1>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`${ROUTES.calculator}?program=${encodeURIComponent(program.id)}`}
                className="way-button-primary px-5 py-2.5 text-sm font-semibold transition"
              >
                בדיקת סיכויי קבלה
              </Link>
              <Link
                href={ROUTES.assessment}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                התאמה אישית
              </Link>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">מוסדות לימוד</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {institutions.map((institution) => (
                <div
                  key={institution.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                >
                  <Link href={institutionProgramPaths[institution.id]}>{institution.name}</Link>
                  <Link
                    className="shrink-0 rounded-full border border-[#c9c2e4] px-3 py-2 text-sm text-[#6554b8]"
                    href={`/enquiry?program=${encodeURIComponent(program.id)}&institution=${encodeURIComponent(institution.id)}`}
                  >
                    יצירת קשר
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">תנאי קבלה</h2>
            {program.isListed === false ? (
              <p className="mt-4 text-sm text-slate-600">אין כרגע מידע עדכני על המסלול.</p>
            ) : (
              <div className="mt-4 space-y-6">
                {institutions.length === 0 && (
                  <AdmissionRequirements
                    requirements={catalogueAdmissionRequirements(program.admissionRequirements)}
                  />
                )}
                {institutions.map((institution) => {
                  const source = institutionRequirementSources[institution.id];
                  const officialLink = source.officialUrl && (
                    <a
                      href={source.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#6554b8] underline"
                    >
                      לאתר המוסד
                    </a>
                  );
                  return (
                    <div key={institution.id}>
                      {institutions.length > 1 && (
                        <h3 className="font-semibold">{institution.name}</h3>
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
                                  לפרטים המלאים
                                </Link>
                              )}
                              {officialLink}
                              {source.officialCalculatorUrl && (
                                <a
                                  href={source.officialCalculatorUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[var(--text-muted)] hover:underline"
                                >
                                  למחשבון המכללה
                                </a>
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
                              לפרטים על המסלול
                            </Link>
                          ) : (
                            <>
                              תנאי הקבלה מפורטים באתר המוסד.{' '}
                              {officialLink || (
                                <Link
                                  href={institutionProgramPaths[institution.id]}
                                  className="font-semibold text-[#6554b8] underline"
                                >
                                  לדף המוסד
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
                          {source.checked.sourceUrl && (
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
            )}
          </section>
          <RelatedPrograms {...related} />
        </section>
      </main>
    </WayPageShell>
  );
}

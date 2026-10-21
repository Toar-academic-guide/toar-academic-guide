import Link from 'next/link';
import { notFound } from 'next/navigation';
import WayPageShell from '@/components/WayPageShell';

import { getPublicProgramPageData } from '@/lib/publicCataloguePages';
import { catalogueAdmissionRequirements } from '@/lib/catalogueDisplayText';
import { officialUrl } from '@/lib/studyJourney';
import { ROUTES } from '@/lib/routes';

export const dynamic = 'force-dynamic';

interface ProgramPageProps {
  params: Promise<{ programId: string }>;
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { programId } = await params;
  const data = await getPublicProgramPageData(programId);

  if (!data) {
    notFound();
  }

  const { program, institutions } = data;

  return (
    <WayPageShell>
      <main dir="rtl" className="px-4 py-10 text-slate-900 sm:px-6">
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
                href={ROUTES.calculator}
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
                  <Link href={`/institutions/${institution.id}`}>{institution.name}</Link>
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
                  <ul className="list-inside list-disc space-y-2 text-sm text-slate-600">
                    {catalogueAdmissionRequirements(program.admissionRequirements).map(
                      (requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ),
                    )}
                  </ul>
                )}
                {institutions.map((institution) => {
                  const detail = program.institutionDetails?.find(
                    (entry) => entry.institutionName === institution.name,
                  );
                  const sourceUrl = officialUrl(detail?.programUrl);
                  return (
                    <div key={institution.id}>
                      {institutions.length > 1 && (
                        <h3 className="font-semibold">{institution.name}</h3>
                      )}
                      <ul className="mt-2 list-inside list-disc space-y-2 text-sm text-slate-600">
                        {catalogueAdmissionRequirements(
                          detail?.specificAdmissionNotes,
                          program.admissionRequirements,
                        ).map((requirement) => (
                          <li key={requirement}>{requirement}</li>
                        ))}
                      </ul>
                      {sourceUrl && (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-sm font-semibold text-[#6554b8] underline"
                        >
                          תנאי הקבלה באתר המוסד
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </main>
    </WayPageShell>
  );
}

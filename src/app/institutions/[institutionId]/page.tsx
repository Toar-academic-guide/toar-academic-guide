import Link from 'next/link';
import { notFound } from 'next/navigation';
import WayPageShell from '@/components/WayPageShell';

import { getPublicInstitutionPageData } from '@/lib/publicCataloguePages';
import { institutionProgramName } from '@/lib/institutionProgramName';
import { ROUTES } from '@/lib/routes';
import { buildInstitutionMetadata } from '@/lib/seo/metadata';
import { institutionLd, institutionBreadcrumbLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

export const dynamic = 'force-dynamic';

interface InstitutionPageProps {
  params: Promise<{ institutionId: string }>;
}

const openUniversityTransferTracks = [
  {
    label: 'אוניברסיטת תל אביב',
    href: 'https://www.openu.ac.il/transfertrack/tel-aviv/Pages/default.aspx',
  },
  {
    label: 'האוניברסיטה העברית בירושלים',
    href: 'https://www.openu.ac.il/transfertrack/hebrew/Pages/default.aspx',
  },
  {
    label: 'הטכניון',
    href: 'https://www.openu.ac.il/transfertrack/technion/Pages/default.aspx',
  },
  {
    label: 'אפיק מעבר למשפטים באוניברסיטת בר-אילן',
    href: 'https://www.openu.ac.il/transfertrack/bar-ilan/pages/default.aspx',
  },
  {
    label: 'אוניברסיטת חיפה',
    href: 'https://www.openu.ac.il/transfertrack/haifa/Pages/default.aspx',
  },
  {
    label: 'אוניברסיטת בן-גוריון בנגב',
    href: 'https://www.openu.ac.il/transfertrack/ben-gurion/Pages/default.aspx',
  },
] as const;

function OpenUniversityTransferSection() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold">אפיקי מעבר מהאוניברסיטה הפתוחה</h2>{' '}
      <p className="mt-3 leading-7 text-slate-700">
        האוניברסיטה הפתוחה מפרסמת אפיקי מעבר למסלולי לימוד באוניברסיטאות אחרות. בכל אפיק מפורטים
        הקורסים, דרישות הציונים ותנאים נוספים של המסלול. התחילו בבחירת מוסד ומסלול בעמוד אפיקי המעבר
        הרשמי, ופתחו את תיאור האפיק ואת העדכונים לפני תכנון הקורסים.
      </p>{' '}
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {openUniversityTransferTracks.map((track) => (
          <li key={track.href}>
            <a
              href={track.href}
              className="block rounded-xl border border-slate-200 px-4 py-3 font-semibold text-cyan-800 transition hover:border-slate-900 hover:text-slate-900"
            >
              {track.label}
            </a>
          </li>
        ))}
      </ul>{' '}
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <a
          href="https://www.openu.ac.il/transfertrack/pages/faq.aspx"
          className="text-cyan-800 underline underline-offset-4 hover:text-slate-900"
        >
          שאלות נפוצות על אפיקי מעבר
        </a>{' '}
        <a
          href="https://www.openu.ac.il/transfertrack/pages/updates.aspx"
          className="text-cyan-800 underline underline-offset-4 hover:text-slate-900"
        >
          עדכונים על אפיקי מעבר
        </a>{' '}
      </div>{' '}
      <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
        עוד לא התחלתם לימודים אקדמיים?{' '}
        <Link
          href="/sekhem-calculator"
          className="font-semibold text-cyan-800 underline underline-offset-4 hover:text-slate-900"
        >
          למחשבון הסכם
        </Link>
      </p>{' '}
      <p className="mt-3 text-xs text-slate-500">בדיקת הקישורים: 8 בנובמבר 2026</p>
    </section>
  );
}

function ProgramCards({
  programs,
  institution,
  className = '',
}: {
  programs: CatalogueProgram[];
  institution: CatalogueInstitution;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {programs.map((program) => (
        <Link
          key={program.id}
          href={`/programs/${encodeURIComponent(program.id)}`}
          className="rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-900"
        >
          <span className="block font-semibold">
            {institutionProgramName(program, institution)}
          </span>{' '}
          {program.category !== program.name && (
            <span className="mt-1 block text-sm text-slate-500">{program.category}</span>
          )}{' '}
        </Link>
      ))}
    </div>
  );
}

export async function generateMetadata({ params }: InstitutionPageProps) {
  return buildInstitutionMetadata((await params).institutionId);
}

export default async function InstitutionPage({ params }: InstitutionPageProps) {
  const { institutionId } = await params;
  const data = await getPublicInstitutionPageData(institutionId);

  if (!data) {
    notFound();
  }

  const { institution, programs } = data;

  return (
    <WayPageShell>
      <JsonLd data={[institutionLd(data), institutionBreadcrumbLd(data)]} />
      <main dir="rtl" className="px-4 py-10 text-right text-slate-900 sm:px-6">
        <section className="mx-auto flex max-w-4xl flex-col gap-8">
          <Link
            href={ROUTES.home}
            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            חזרה לדף הבית{' '}
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-cyan-700">מוסד לימודים</p>{' '}
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{institution.name}</h1>{' '}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={ROUTES.assessment}
                className="way-button-primary px-5 py-2.5 text-sm font-semibold transition"
              >
                שאלון התאמה{' '}
              </Link>
              <Link
                href={ROUTES.calculator}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                מחשבון קבלה{' '}
              </Link>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">מסלולי לימוד</h2>{' '}
            <ProgramCards
              programs={programs.slice(0, 12)}
              institution={institution}
              className="mt-4"
            />
            {programs.length > 12 && (
              <details className="mt-4 open:mt-3 [&[open]>summary]:hidden">
                <summary className="cursor-pointer font-semibold text-cyan-700">
                  {programs.length === 13
                    ? 'הצגת מסלול נוסף'
                    : `הצגת עוד ${programs.length - 12} מסלולים`}{' '}
                </summary>{' '}
                <ProgramCards programs={programs.slice(12)} institution={institution} />
              </details>
            )}
          </section>
          {institution.id === 'open_university' && <OpenUniversityTransferSection />}
        </section>
      </main>
    </WayPageShell>
  );
}

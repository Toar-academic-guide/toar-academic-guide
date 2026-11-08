import Link from 'next/link';
import { notFound } from 'next/navigation';
import WayPageShell from '@/components/WayPageShell';

import { getPublicInstitutionPageData } from '@/lib/publicCataloguePages';
import { institutionProgramName } from '@/lib/institutionProgramName';
import {
  canLinkToSekhemCalculator,
  loadSekhemCalculatorOfferings,
} from '@/lib/sekhemCalculatorSupport';
import { ROUTES } from '@/lib/routes';
import { buildInstitutionMetadata } from '@/lib/seo/metadata';
import { institutionLd, institutionBreadcrumbLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

export const dynamic = 'force-dynamic';

interface InstitutionPageProps {
  params: Promise<{ institutionId: string }>;
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

  const { institution, programs, officialProgrammes = [], categoryPages = [] } = data;
  const calculatorOfferings = await loadSekhemCalculatorOfferings();
  const hasCalculator = programs.some((program) =>
    canLinkToSekhemCalculator(program, institution.id, calculatorOfferings),
  );

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
              {hasCalculator && (
                <Link
                  href={ROUTES.calculator}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                >
                  מחשבון קבלה{' '}
                </Link>
              )}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold">מסלולי לימוד</h2>{' '}
            <ProgramCards
              programs={programs.slice(0, 12)}
              institution={institution}
              className="mt-4"
            />
            {officialProgrammes.map((programme) => (
              <a
                key={programme.id}
                href={programme.url}
                className="mt-4 block rounded-xl border border-slate-200 px-4 py-3 font-semibold hover:border-slate-900"
              >
                {programme.name} <span className="text-sm font-normal">באתר המוסד</span>
              </a>
            ))}
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
          {categoryPages.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold">תחומי לימוד</h2>{' '}
              <ProgramCards institution={institution} programs={categoryPages} className="mt-4" />
            </section>
          )}
        </section>
      </main>
    </WayPageShell>
  );
}

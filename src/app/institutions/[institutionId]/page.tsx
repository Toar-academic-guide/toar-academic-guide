import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPublicInstitutionPageData } from '@/lib/publicCataloguePages';
import { ROUTES } from '@/lib/routes';

interface InstitutionPageProps {
  params: Promise<{ institutionId: string }>;
}

export default async function InstitutionPage({ params }: InstitutionPageProps) {
  const { institutionId } = await params;
  const data = getPublicInstitutionPageData(institutionId);

  if (!data) {
    notFound();
  }

  const { institution, programs } = data;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f4f0] px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <Link
          href={ROUTES.home}
          className="text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          חזרה לדף הבית
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-cyan-700">מוסד לימודים</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{institution.name}</h1>
          <p className="mt-3 text-base text-slate-600">
            עמוד ציבורי לשיתוף מוסד, מסלולים קשורים והמשך לבדיקה אישית באפליקציה.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={ROUTES.assessment}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              שאלון התאמה
            </Link>
            <Link
              href={ROUTES.calculator}
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              מחשבון קבלה
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">מסלולים קשורים</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {programs.slice(0, 12).map((program) => (
              <Link
                key={program.id}
                href={`/programs/${program.id}`}
                className="rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-900"
              >
                <span className="block font-semibold">{program.name}</span>
                <span className="mt-1 block text-sm text-slate-500">{program.category}</span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

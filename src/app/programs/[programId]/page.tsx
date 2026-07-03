import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPublicProgramPageData } from '@/lib/publicCataloguePages';
import { ROUTES } from '@/lib/routes';

interface ProgramPageProps {
  params: Promise<{ programId: string }>;
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { programId } = await params;
  const data = getPublicProgramPageData(programId);

  if (!data) {
    notFound();
  }

  const { program, institutions } = data;

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
          <p className="text-sm font-semibold text-cyan-700">{program.category}</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{program.name}</h1>
          <p className="mt-3 text-base text-slate-600">
            מסלול ציבורי לשיתוף, בדיקה ראשונית וחיבור למחשבון או לשאלון האישי.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={ROUTES.calculator}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
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
          <h2 className="text-xl font-bold">מוסדות קשורים</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {institutions.map((institution) => (
              <Link
                key={institution.id}
                href={`/institutions/${institution.id}`}
                className="rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-900"
              >
                {institution.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">תנאי קבלה פומביים</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-slate-600">
            {program.admissionRequirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}

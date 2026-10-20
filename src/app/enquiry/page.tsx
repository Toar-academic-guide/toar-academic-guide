import Link from 'next/link';
import { notFound } from 'next/navigation';
import EnquiryForm from '@/components/EnquiryForm';
import WayPageShell from '@/components/WayPageShell';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';

export const dynamic = 'force-dynamic';

export default async function EnquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string; institution?: string }>;
}) {
  const { program: programId, institution: institutionId = '' } = await searchParams;
  if (!programId) notFound();
  let title: string;
  if (programId === 'psychometric-preparation' && institutionId === '') {
    title = 'הכנה לפסיכומטרי';
  } else {
    const [programs, institutions] = await Promise.all([
      listCataloguePrograms(),
      listCatalogueInstitutions(),
    ]);
    const program = programs.data.find((entry) => entry.id === programId);
    const institution = institutions.data.find((entry) => entry.id === institutionId);
    if (!program || !institution || !program.linkedInstitutionIds.includes(institutionId))
      notFound();
    title = `${program.name} · ${institution.name}`;
  }
  return (
    <WayPageShell>
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-8">
        <Link
          className="mb-7 inline-block rounded-full bg-white px-4 py-2 text-[#6554b8]"
          href="/#results"
        >
          חזרה לאפשרויות שלי
        </Link>
        <EnquiryForm programId={programId} institutionId={institutionId} title={title} />
      </main>
    </WayPageShell>
  );
}

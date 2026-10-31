import Link from 'next/link';
import { notFound } from 'next/navigation';
import EnquiryForm from '@/components/EnquiryForm';
import WayPageShell from '@/components/WayPageShell';
import { getEnquiryTarget } from '@/lib/enquiryTarget';
import { ENQUIRY_PREP_INTRO } from '@/lib/enquiries';
import PrepPageContent from './PrepPageContent';
import styles from './prep-page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { robots: { index: false, follow: true } };

export default async function EnquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string; institution?: string }>;
}) {
  const { program: programId, institution: institutionId = '' } = await searchParams;
  if (!programId) notFound();
  const isPrep = programId === 'psychometric-preparation' && institutionId === '';
  let title: string;
  if (isPrep) {
    title = 'הכנה לפסיכומטרי';
  } else {
    const target = await getEnquiryTarget(programId, institutionId);
    if (!target) notFound();
    title = `${target.program.name} · ${target.institution.name}`;
  }
  return (
    <WayPageShell>
      <main className={`mx-auto max-w-2xl px-5 pb-16 pt-8${isPrep ? ` ${styles.prepPage}` : ''}`}>
        <Link
          className="mb-7 inline-block rounded-full bg-white px-4 py-2 text-[#6554b8]"
          href="/#results"
        >
          חזרה לאפשרויות שלי
        </Link>
        <EnquiryForm
          programId={programId}
          institutionId={institutionId}
          title={title}
          heading={isPrep ? ENQUIRY_PREP_INTRO.heading : undefined}
          intro={isPrep ? ENQUIRY_PREP_INTRO.body : undefined}
        />
        {isPrep ? <PrepPageContent /> : null}
      </main>
    </WayPageShell>
  );
}

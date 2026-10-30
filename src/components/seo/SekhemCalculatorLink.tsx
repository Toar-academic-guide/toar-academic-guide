import type {
  PublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';
import type { CalculatorOffering } from '@/lib/sekhemCalculator';
import Link from 'next/link';
import { hasPublishedCompositeThresholds } from '@/lib/publishedCompositeThresholds';
import { canonicalProgramId } from '@/lib/seo/programAliases';

export default function SekhemCalculatorLink({
  data,
  sources,
  offerings,
}: {
  data: PublicProgramPageData;
  offerings?: readonly CalculatorOffering[];
  sources: Awaited<ReturnType<typeof getPublicProgramRequirementSources>>;
}) {
  if (!hasPublishedCompositeThresholds(data, sources, offerings)) return null;
  const programId = canonicalProgramId(data.program.id);
  const href = offerings?.some((row) => row.programId === programId)
    ? `/sekhem-calculator?program=${encodeURIComponent(programId)}`
    : '/sekhem-calculator';
  return (
    <p className="mt-3 text-sm">
      <Link href={href} className="text-[var(--way-primary)] underline underline-offset-4">
        מחשבון סכם וסיכויי קבלה
      </Link>
    </p>
  );
}

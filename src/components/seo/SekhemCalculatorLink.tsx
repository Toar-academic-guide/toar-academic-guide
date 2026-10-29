import type {
  PublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';
import type { CalculatorOffering } from '@/lib/sekhemCalculator';
import Link from 'next/link';
import { hasPublishedCompositeThresholds } from '@/lib/publishedCompositeThresholds';

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
  return (
    <p className="mt-3 text-sm">
      <Link
        href={`/sekhem-calculator?program=${encodeURIComponent(data.program.id)}`}
        className="text-[var(--way-primary)] underline underline-offset-4"
      >
        מחשבון סכם וסיכויי קבלה
      </Link>
    </p>
  );
}

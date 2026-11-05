import AppExperience from '@/components/AppExperience';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import {
  canLinkToSekhemCalculator,
  loadSekhemCalculatorOfferings,
} from '@/lib/sekhemCalculatorSupport';

export const dynamic = 'force-dynamic';

export default async function RecommendationsPage() {
  const [offerings, catalogue] = await Promise.all([
    loadSekhemCalculatorOfferings(),
    loadPublicCatalogue(),
  ]);
  const programsById = new Map(catalogue.programs.map((program) => [program.id, program]));
  const calculatorPrograms = offerings
    .filter(({ institutionId, programId }) => {
      const program = programsById.get(programId);
      return program && canLinkToSekhemCalculator(program, institutionId);
    })
    .map(({ institutionId, programId }) => ({ institutionId, programId }));
  return <AppExperience initialStep="recommendations" calculatorPrograms={calculatorPrograms} />;
}

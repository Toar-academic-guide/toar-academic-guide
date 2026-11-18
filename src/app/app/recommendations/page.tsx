import AppExperience from '@/components/AppExperience';
import { loadResultCalculatorPrograms } from '@/lib/sekhemCalculatorSupport';

export const dynamic = 'force-dynamic';

export default async function RecommendationsPage() {
  const calculatorPrograms = await loadResultCalculatorPrograms();
  return <AppExperience initialStep="recommendations" calculatorPrograms={calculatorPrograms} />;
}

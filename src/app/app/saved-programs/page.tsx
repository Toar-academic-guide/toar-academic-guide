import { loadResultCalculatorPrograms } from '@/lib/sekhemCalculatorSupport';
import StudyJourney from '@/components/StudyJourney';

export const revalidate = 120;

export default async function SavedProgramsPage() {
  return (
    <StudyJourney calculatorPrograms={await loadResultCalculatorPrograms()} initialStep="saved" />
  );
}

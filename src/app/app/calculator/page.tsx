import StudyJourney from '@/components/StudyJourney';

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string | string[] }>;
}) {
  const { program } = await searchParams;
  return (
    <StudyJourney
      initialStep="subjects"
      initialProgramId={typeof program === 'string' ? program : undefined}
    />
  );
}

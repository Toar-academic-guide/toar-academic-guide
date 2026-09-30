import AppExperience from '@/components/AppExperience';
import { SELECTABLE_STUDY_REGION_IDS } from '@/data/studyRegions';

export default async function SavedProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ regions?: string | string[]; from?: string }>;
}) {
  const query = await searchParams;
  const requested = typeof query.regions === 'string' ? query.regions.split(',') : [];
  const regions = SELECTABLE_STUDY_REGION_IDS.filter((region) => requested.includes(region));
  return (
    <AppExperience
      key={`${query.from}:${regions.join(',')}`}
      initialStep="bucket-list"
      initialStudyRegions={regions}
      fromStudyLocation={query.from === 'study-location'}
    />
  );
}

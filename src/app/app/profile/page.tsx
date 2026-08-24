import AppExperience from '@/components/AppExperience';
import { parseAdmissionAlertIntent, ROUTES } from '@/lib/routes';

interface ProfilePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const alertIntent = new URLSearchParams();
  const institution = singleSearchParam(params?.admissionAlertInstitution);
  const program = singleSearchParam(params?.admissionAlertProgram);

  if (institution === null || program === null) {
    return <AppExperience initialStep="academic-profile" admissionAlertTarget={null} />;
  }

  if (institution) {
    alertIntent.set('admissionAlertInstitution', institution);
  }
  if (program) {
    alertIntent.set('admissionAlertProgram', program);
  }

  const admissionAlertTarget = parseAdmissionAlertIntent(
    alertIntent.size > 0 ? `${ROUTES.profile}?${alertIntent.toString()}` : null,
  );

  return (
    <AppExperience initialStep="academic-profile" admissionAlertTarget={admissionAlertTarget} />
  );
}

function singleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? null : value;
}

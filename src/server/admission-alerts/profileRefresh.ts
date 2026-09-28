import { BGU_PSYCHOLOGY_PROFILE_KEYS } from '@/lib/bguPsychologyInputs';
import { HAIFA_PROFILE_KEYS } from '@/lib/haifaAdmissionsInputs';
import type { AdmissionsProfileInputs } from '@/types';

export interface AlertRelevantAcademicProfile {
  psychometricOverall: number | null;
  psychometricQuantitative: number | null;
  psychometricVerbal: number | null;
  psychometricEnglish: number | null;
  bagrutWeightedAverage: number | null;
  bagrutProfileVersionId: string | null;
  admissionsInputs?: AdmissionsProfileInputs | null;
}

export function shouldRefreshAdmissionAlerts(
  previous: AlertRelevantAcademicProfile | undefined,
  next: AlertRelevantAcademicProfile,
): boolean {
  if (!previous) {
    return false;
  }

  return (
    previous.psychometricOverall !== next.psychometricOverall ||
    previous.psychometricQuantitative !== next.psychometricQuantitative ||
    previous.psychometricVerbal !== next.psychometricVerbal ||
    previous.psychometricEnglish !== next.psychometricEnglish ||
    previous.bagrutWeightedAverage !== next.bagrutWeightedAverage ||
    previous.bagrutProfileVersionId !== next.bagrutProfileVersionId ||
    HAIFA_PROFILE_KEYS.some(
      (key) => previous.admissionsInputs?.[key] !== next.admissionsInputs?.[key],
    ) ||
    BGU_PSYCHOLOGY_PROFILE_KEYS.some(
      (key) => previous.admissionsInputs?.[key] !== next.admissionsInputs?.[key],
    ) ||
    previous.admissionsInputs?.tauBagrutAverage !== next.admissionsInputs?.tauBagrutAverage ||
    previous.admissionsInputs?.bguBagrutAverage !== next.admissionsInputs?.bguBagrutAverage ||
    previous.admissionsInputs?.tauApplicationRequirementsConfirmed !==
      next.admissionsInputs?.tauApplicationRequirementsConfirmed ||
    previous.admissionsInputs?.bguLanguageRequirementsConfirmed !==
      next.admissionsInputs?.bguLanguageRequirementsConfirmed ||
    previous.admissionsInputs?.tauMathPlacementScore !==
      next.admissionsInputs?.tauMathPlacementScore
  );
}

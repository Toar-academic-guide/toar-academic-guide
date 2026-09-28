import { BGU_HEALTH_PROFILE_KEYS } from '@/lib/bguHealthInputs';
import { BGU_QUANTITATIVE_PROFILE_KEYS } from '@/lib/calculatorInputRequirements';
import { BGU_PSYCHOLOGY_PROFILE_KEYS } from '@/lib/bguPsychologyInputs';
import { BGU_SOCIAL_SCIENCE_PROFILE_KEYS } from '@/lib/bguSocialScienceInputs';
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
    BGU_QUANTITATIVE_PROFILE_KEYS.some(
      (key) => previous.admissionsInputs?.[key] !== next.admissionsInputs?.[key],
    ) ||
    JSON.stringify(previous.admissionsInputs?.bguEngineering) !==
      JSON.stringify(next.admissionsInputs?.bguEngineering) ||
    previous.psychometricOverall !== next.psychometricOverall ||
    previous.psychometricQuantitative !== next.psychometricQuantitative ||
    previous.psychometricVerbal !== next.psychometricVerbal ||
    previous.psychometricEnglish !== next.psychometricEnglish ||
    previous.bagrutWeightedAverage !== next.bagrutWeightedAverage ||
    previous.bagrutProfileVersionId !== next.bagrutProfileVersionId ||
    [...BGU_PSYCHOLOGY_PROFILE_KEYS, ...BGU_HEALTH_PROFILE_KEYS].some(
      (key) => previous.admissionsInputs?.[key] !== next.admissionsInputs?.[key],
    ) ||
    BGU_SOCIAL_SCIENCE_PROFILE_KEYS.some(
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

import { isHujiMedicineProgram } from './hujiMedicineInputs';
import { isBguHealthProgram } from './bguHealthInputs';
import { isBguPsychologyProgram } from './bguPsychologyInputs';
import { isHaifaProgram } from './haifaAdmissionsInputs';
import { bguSocialScienceProgram } from './bguSocialScienceInputs';

export const BGU_QUANTITATIVE_PROGRAM_IDS = [
  'biology',
  'bgu_biology',
  'economics',
  'bgu_economics',
  'business',
  'bgu_business',
  'accounting',
  'bgu_accounting',
] as const;

export function isBguQuantitativeRouteProgram(programId: string): boolean {
  return (BGU_QUANTITATIVE_PROGRAM_IDS as readonly string[]).includes(programId);
}

export function allowsNoPsychometric(programId: string): boolean {
  return (
    isBguPsychologyProgram(programId) ||
    bguSocialScienceProgram(programId) !== null ||
    [
      'occupational_therapy',
      'business',
      'tau_business',
      'biology',
      'bgu_biology',
      'economics',
      'bgu_economics',
      'bgu_business',
      'bgu_industrial',
    ].includes(programId)
  );
}

export function allowsNoGenericBagrut(programId: string): boolean {
  return (
    isBguQuantitativeRouteProgram(programId) ||
    isBguPsychologyProgram(programId) ||
    isHujiMedicineProgram(programId) ||
    isHaifaProgram(programId) ||
    isBguHealthProgram(programId) ||
    bguSocialScienceProgram(programId) !== null ||
    ['ee', 'bgu_ee', 'me', 'bgu_me', 'bgu_industrial'].includes(programId)
  );
}

export const BGU_QUANTITATIVE_PROFILE_KEYS = [
  'bguQuantitativeRoute',
  'bguCertificateRequirementsConfirmed',
  'bguPriorAcademicStudies',
  'bguReturningOrChangingTrack',
  'bguApplicationPriority',
  'bguSecondTrackRequirementsConfirmed',
  'bguPreparatoryTrack',
  'bguPreparatoryAverage',
  'bguPreparatoryCompleted',
] as const;

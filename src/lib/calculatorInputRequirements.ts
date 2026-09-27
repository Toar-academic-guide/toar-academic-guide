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
  return [
    'business',
    'tau_business',
    'biology',
    'bgu_biology',
    'economics',
    'bgu_economics',
    'bgu_business',
  ].includes(programId);
}

export function allowsNoGenericBagrut(programId: string): boolean {
  return isBguQuantitativeRouteProgram(programId);
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

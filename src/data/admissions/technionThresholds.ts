import { getMondayAdmissionEvidenceByCatalogueInstitutionId } from './mondayEvidence';

export const TECHNION_THRESHOLD_URL =
  'https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/';

export const TECHNION_EE_SPRING_NOTE =
  'באביב תשפ"ז, על בסיס מקום פנוי: סכם 94 — מספר המקומות מצומצם';

export const TECHNION_MEDICINE_INVITATION_THRESHOLD =
  getMondayAdmissionEvidenceByCatalogueInstitutionId('technion')
    .flatMap((record) => record.verifiedProgramThresholds ?? [])
    .find((threshold) => threshold.programId === 'technion_medicine')!.threshold;

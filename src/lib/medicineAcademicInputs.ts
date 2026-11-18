import { z } from 'zod';

export const medicineAcademicInputsShape = {
  medicineStage: z.literal('academic').optional(),
  medicineCertificateLanguage: z.enum(['hebrew', 'arabic']).optional(),
  medicinePsychometricDate: z.iso.date().optional(),
  medicineEnglishExempt: z.boolean().optional(),
  medicineHebrewBasis: z.enum(['hebrew_school', 'exam', 'exempt']).optional(),
  medicineHebrewScore: z.number().int().min(0).max(150).optional(),
};
export const medicineAcademicInputsSchema = z.object(medicineAcademicInputsShape);
export type MedicineAcademicInputs = z.infer<typeof medicineAcademicInputsSchema>;
export const MEDICINE_REQUIRED_INPUTS = {
  medicineCertificateLanguage: 'medicine_certificate_language',
  medicinePsychometricDate: 'medicine_psychometric_date',
  medicineEnglishExempt: 'medicine_english_exempt',
  medicineHebrewBasis: 'medicine_hebrew_basis',
  medicineHebrewScore: 'medicine_hebrew_score',
} as const;
export type MedicineRequiredInput =
  (typeof MEDICINE_REQUIRED_INPUTS)[keyof typeof MEDICINE_REQUIRED_INPUTS];

export function isMedicineAcademicPair(programId: string, institutionId: string): boolean {
  return (
    ['tau', 'huji', 'bgu'].includes(institutionId) &&
    (programId === 'medicine' || programId === `${institutionId}_medicine`)
  );
}

export function usesMedicineAcademicStage(
  extra:
    | (MedicineAcademicInputs & {
        hujiMedicineRoute?: string;
        hujiMedicineAssessmentScore?: number;
        hujiMedicineAffirmativeAction?: string;
      })
    | undefined,
): boolean {
  return (
    extra?.medicineStage === 'academic' &&
    (!extra.hujiMedicineRoute || extra.hujiMedicineRoute === 'bagrut') &&
    extra.hujiMedicineAffirmativeAction !== 'eligible'
  );
}

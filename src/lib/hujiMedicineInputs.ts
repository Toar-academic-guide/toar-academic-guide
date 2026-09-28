import { z } from 'zod';

export const hujiMedicineInputsShape = {
  hujiMedicineAffirmativeAction: z.enum(['standard', 'eligible']).optional(),
  hujiMedicineRoute: z
    .enum(['bagrut', 'huji_preparatory', 'other_preparatory', 'official_cognitive'])
    .optional(),
  hujiBagrutAverage: z.number().min(60).max(127).optional(),
  hujiMedicinePreparatoryAverage: z.number().min(60).max(113).optional(),
  hujiMedicinePreparatoryYear: z.number().int().min(1900).max(2100).optional(),
  hujiMedicinePreparatoryEligible: z.boolean().optional(),
  hujiMedicineCognitiveScore: z.number().min(16).max(30).optional(),
  hujiMedicineAssessmentScore: z.number().min(150).max(250).optional(),
  hujiMedicineAssessmentYear: z.number().int().min(1900).max(2100).optional(),
  hujiMedicinePsychometricDate: z.iso.date().optional(),
  hujiMedicineEnglishBasis: z.enum(['score', 'exempt']).optional(),
  hujiMedicineEnglishScore: z.number().int().min(50).max(150).optional(),
  hujiMedicineHebrewBasis: z.enum(['hebrew_school', 'yael', 'level_e', 'exempt']).optional(),
  hujiMedicineHebrewScore: z.number().int().min(0).max(150).optional(),
  hujiMedicineResidencyEligible: z.boolean().optional(),
  hujiMedicineQualificationConfirmed: z.boolean().optional(),
  hujiMedicinePriorStudyStatus: z
    .enum([
      'none',
      'documents_submitted',
      'committee_approved',
      'documents_and_committee_approved',
      'review_needed',
    ])
    .optional(),
  hujiMedicineRegistrationConfirmed: z.boolean().optional(),
};

export const hujiMedicineInputsSchema = z.object(hujiMedicineInputsShape);
export type HujiMedicineInputs = z.infer<typeof hujiMedicineInputsSchema>;
export const HUJI_MEDICINE_PROFILE_KEYS = Object.keys(hujiMedicineInputsShape) as Array<
  keyof HujiMedicineInputs
>;

export const HUJI_MEDICINE_REQUIRED_INPUTS = {
  hujiMedicineAffirmativeAction: 'huji_medicine_affirmative_action',
  hujiMedicineRoute: 'huji_medicine_route',
  hujiBagrutAverage: 'huji_bagrut_average',
  hujiMedicinePreparatoryAverage: 'huji_medicine_preparatory_average',
  hujiMedicinePreparatoryYear: 'huji_medicine_preparatory_year',
  hujiMedicinePreparatoryEligible: 'huji_medicine_preparatory_eligible',
  hujiMedicineCognitiveScore: 'huji_medicine_cognitive_score',
  hujiMedicineAssessmentScore: 'huji_medicine_assessment_score',
  hujiMedicineAssessmentYear: 'huji_medicine_assessment_year',
  hujiMedicinePsychometricDate: 'huji_medicine_psychometric_date',
  hujiMedicineEnglishBasis: 'huji_medicine_english_basis',
  hujiMedicineEnglishScore: 'huji_medicine_english_score',
  hujiMedicineHebrewBasis: 'huji_medicine_hebrew_basis',
  hujiMedicineHebrewScore: 'huji_medicine_hebrew_score',
  hujiMedicineResidencyEligible: 'huji_medicine_residency',
  hujiMedicineQualificationConfirmed: 'huji_medicine_qualification',
  hujiMedicinePriorStudyStatus: 'huji_medicine_prior_study',
  hujiMedicineRegistrationConfirmed: 'huji_medicine_registration',
} as const;
export type HujiMedicineRequiredInput =
  (typeof HUJI_MEDICINE_REQUIRED_INPUTS)[keyof typeof HUJI_MEDICINE_REQUIRED_INPUTS];

export function isHujiMedicineProgram(programId: string): boolean {
  return programId === 'medicine' || programId === 'huji_medicine';
}

export function pickHujiMedicineInputs(input: HujiMedicineInputs | undefined): HujiMedicineInputs {
  return Object.fromEntries(HUJI_MEDICINE_PROFILE_KEYS.map((key) => [key, input?.[key]]));
}

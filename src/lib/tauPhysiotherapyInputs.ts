import { z } from 'zod';

export const tauPhysiotherapyInputsShape = {
  tauPhysiotherapyRoute: z.enum(['bagrut', 'preparatory', 'partial_academic', 'degree']).optional(),
  tauPhysiotherapyRequirementsConfirmed: z.boolean().optional(),
  tauPhysiotherapyEnglishAlternativeConfirmed: z.boolean().optional(),
  tauPhysiotherapyAcademicMathConfirmed: z.boolean().optional(),
  tauPhysiotherapyMoocBonusConfirmed: z.boolean().optional(),
};
export const tauPhysiotherapyInputsSchema = z.object(tauPhysiotherapyInputsShape);
export type TauPhysiotherapyInputs = z.infer<typeof tauPhysiotherapyInputsSchema>;
export const TAU_PHYSIOTHERAPY_PROFILE_KEYS = Object.keys(tauPhysiotherapyInputsShape) as Array<
  keyof TauPhysiotherapyInputs
>;
export const TAU_PHYSIOTHERAPY_SELECTION_URL =
  'https://go.tau.ac.il/he/med/ba/phys?v=important-info';
export const TAU_PHYSIOTHERAPY_REGISTRATION_URL =
  'https://go.tau.ac.il/he/med/ba/phys?v=curriculum';

import { overallBagrutAverage } from '@/lib/bagrutSubjectRecord';
import { colmanBagrutInputsShape } from '@/lib/colmanBagrutInputs';
import { tauPhysiotherapyInputsShape } from '@/lib/tauPhysiotherapyInputs';
import { hujiMedicineInputsShape } from '@/lib/hujiMedicineInputs';
import { bguHealthInputsShape } from '@/lib/bguHealthInputs';
import { bguQuantitativeInputShape } from '@/lib/bguQuantitativeInputs';
import { bguPsychologyInputsShape } from '@/lib/bguPsychologyInputs';
import { haifaAdmissionsInputsShape } from '@/lib/haifaAdmissionsInputs';
import { bguSocialScienceInputsShape } from '@/lib/bguSocialScienceInputs';
import { z } from 'zod';
import { bguEngineeringSchema } from '@/lib/bguEngineeringSchema';
import {
  admissionsBagrutSubjectRecordSchema,
  bagrutSectorSchema,
} from '@/lib/bagrutSubjectRecordSchema';

export const admissionsEvaluationSchema = z.object({
  degreeId: z.string().min(1),
  psychometric: z.number().int().min(200).max(800).optional(),
  bagrut: z.number().min(0).max(120).optional(),
  bagrutAverageEstimated: z.literal(true).optional(),
  extraInputs: z
    .object({
      bguEngineering: bguEngineeringSchema.optional(),
      psychometricMath: z.number().int().min(50).max(150).optional(),
      psychometricVerbal: z.number().int().min(50).max(150).optional(),
      psychometricEnglish: z.number().int().min(50).max(150).optional(),
      bagrutSubjectRecord: admissionsBagrutSubjectRecordSchema.optional(),
      bagrutProfileSchemaVersion: z.union([z.literal(1), z.literal(2)]).optional(),
      bagrutSector: bagrutSectorSchema.optional(),
      mathUnits: z.number().int().min(3).max(5).optional(),
      mathGrade: z.number().int().min(50).max(100).optional(),
      englishUnits: z.number().int().min(3).max(5).optional(),
      englishGrade: z.number().int().min(50).max(100).optional(),
      physicsUnits: z.number().int().min(3).max(5).optional(),
      physicsGrade: z.number().int().min(50).max(100).optional(),
      csUnits: z.number().int().min(3).max(5).optional(),
      csGrade: z.number().int().min(50).max(100).optional(),
      tauBagrutAverage: z.number().min(50).max(130).optional(),
      ...colmanBagrutInputsShape,
      technionArchitectureBagrutAverage: z.number().min(0).max(119).optional(),
      technionArchitectureExamScore: z.number().min(0).max(140).optional(),
      technionArchitectureExamPassed: z.boolean().optional(),
      technionArchitectureRequirementsConfirmed: z.boolean().optional(),
      ...bguPsychologyInputsShape,
      ...hujiMedicineInputsShape,
      ...haifaAdmissionsInputsShape,
      ...bguHealthInputsShape,
      ...tauPhysiotherapyInputsShape,
      ...bguSocialScienceInputsShape,
      bguBagrutAverage: z.number().min(50).max(130).optional(),
      tauApplicationRequirementsConfirmed: z.boolean().optional(),
      tauManagementRequirementsConfirmed: z.boolean().optional(),
      tauManagementAcademicRouteConfirmed: z.boolean().optional(),
      tauManagementQualifyingMoocCount: z
        .union([z.literal(0), z.literal(1), z.literal(2)])
        .optional(),
      tauManagementNoPsychometricMoocsConfirmed: z.boolean().optional(),
      bguLanguageRequirementsConfirmed: z.boolean().optional(),
      ...bguQuantitativeInputShape,
      tauMathPlacementScore: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

/** Apply after extending the shared object schema, for both single and batch payloads. */
export function validateOverallBagrutAverage(
  input: Pick<
    z.infer<typeof admissionsEvaluationSchema>,
    'bagrut' | 'bagrutAverageEstimated' | 'extraInputs'
  >,
  ctx: z.RefinementCtx,
) {
  if (input.bagrutAverageEstimated) {
    const derived = overallBagrutAverage(input.extraInputs?.bagrutSubjectRecord);
    if (derived === undefined || input.bagrut !== derived)
      ctx.addIssue({
        code: 'custom',
        path: ['bagrut'],
        message: 'Estimated overall average must match the subject record.',
      });
  } else if (input.bagrut !== undefined && input.bagrut < 60) {
    ctx.addIssue({
      code: 'custom',
      path: ['bagrut'],
      message: 'Entered overall average must be at least 60.',
    });
  }
}

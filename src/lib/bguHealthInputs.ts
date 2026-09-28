import { z } from 'zod';

export const bguHealthInputsShape = {
  bguOccupationalTherapyRoute: z.enum(['score', 'academic']).optional(),
  bguOccupationalTherapyRequirementsConfirmed: z.boolean().optional(),
  bguOccupationalTherapyExamSession: z
    .enum(['regular', 'july_psychometric', 'spring_nativ'])
    .optional(),
  bguBachelorsDegreeCompleted: z.boolean().optional(),
  bguBachelorsDegreeAverage: z.number().min(0).max(100).optional(),
  bguPhysiotherapyRequirementsConfirmed: z.boolean().optional(),
};

export type BguHealthInputs = z.infer<z.ZodObject<typeof bguHealthInputsShape>>;
export const BGU_HEALTH_PROFILE_KEYS = Object.keys(bguHealthInputsShape) as Array<
  keyof BguHealthInputs
>;
export const bguHealthInputsSchema = z.object(bguHealthInputsShape);
export function isBguHealthProgram(
  programId: string,
): programId is 'occupational_therapy' | 'physiotherapy' {
  return programId === 'occupational_therapy' || programId === 'physiotherapy';
}

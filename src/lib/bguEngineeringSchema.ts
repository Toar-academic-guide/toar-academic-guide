import { z } from 'zod';

const units = z.union([z.literal(4), z.literal(5)]).optional();
const grade = z.number().int().min(1).max(100).optional();

/** Shared by profile persistence and calculator requests so fields survive both boundaries. */
export const bguEngineeringSchema = z.strictObject({
  detailsConfirmed: z.boolean(),
  route: z.enum(['auto', 'engineering_score', 'direct']).optional(),
  physicsCoursePassed: z.boolean().optional(),
  preparatoryInstitution: z.enum(['bgu', 'technion']).optional(),
  preparatoryCompletionYear: z.number().int().min(2018).max(2100).optional(),
  preparatoryMathUnits: units,
  preparatoryMathGrade: grade,
  preparatoryPhysicsUnits: units,
  preparatoryPhysicsGrade: grade,
  industrialPreparatoryAverage: z.number().min(0).max(100).optional(),
  diplomaRecognized: z.boolean().optional(),
  diplomaMathHours: z.number().int().min(60).optional(),
  diplomaMathGrade: grade,
  diplomaPhysicsHours: z.number().int().min(90).optional(),
  diplomaPhysicsGrade: grade,
});

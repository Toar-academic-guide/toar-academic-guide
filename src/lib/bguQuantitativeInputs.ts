import { z } from 'zod';

export const bguQuantitativeInputShape = {
  bguQuantitativeRoute: z.enum(['auto', 'quantitative', 'bagrut', 'psychometric']).optional(),
  bguCertificateRequirementsConfirmed: z.boolean().optional(),
  bguPriorAcademicStudies: z.boolean().optional(),
  bguReturningOrChangingTrack: z.boolean().optional(),
  bguApplicationPriority: z.number().int().min(1).max(6).optional(),
  bguSecondTrackRequirementsConfirmed: z.boolean().optional(),
  bguPreparatoryTrack: z.enum(['precise_sciences_engineering', 'natural_life_sciences']).optional(),
  bguPreparatoryAverage: z.number().min(0).max(100).optional(),
  bguPreparatoryCompleted: z.boolean().optional(),
};

export type BguQuantitativeInputs = z.infer<z.ZodObject<typeof bguQuantitativeInputShape>>;

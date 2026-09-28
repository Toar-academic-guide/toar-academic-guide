import { z } from 'zod';

export const bguPsychologyInputsShape = {
  bguPsychologyRoute: z.enum(['auto', 'score', 'bagrut', 'psychometric']).optional(),
  bguPsychologyRequirementsConfirmed: z.boolean().optional(),
  bguPreparatoryTrack: z.enum(['precise_sciences_engineering', 'natural_life_sciences']).optional(),
  bguPreparatoryAverage: z.number().min(0).max(100).optional(),
  bguPreparatoryCompleted: z.boolean().optional(),
};

export type BguPsychologyInputs = z.infer<z.ZodObject<typeof bguPsychologyInputsShape>>;
export const BGU_PSYCHOLOGY_PROFILE_KEYS = [
  'bguPsychologyRoute',
  'bguPsychologyRequirementsConfirmed',
  'bguPreparatoryTrack',
  'bguPreparatoryAverage',
  'bguPreparatoryCompleted',
] as const;

export function isBguPsychologyProgram(programId: string): boolean {
  return programId === 'psychology' || programId === 'bgu_psychology';
}

export const bguPsychologyInputsSchema = z.object(bguPsychologyInputsShape);

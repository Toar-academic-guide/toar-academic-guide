import { z } from 'zod';

export const HAIFA_ADMISSION_YEAR = 2026;
export const HAIFA_PROFILE_KEYS = [
  'haifaBagrutAverage',
  'haifaBagrutYear',
  'haifaPsychometricYear',
] as const;

const year = z.number().int().min(1948).max(HAIFA_ADMISSION_YEAR);
export const haifaAdmissionsInputsShape = {
  haifaBagrutAverage: z.number().min(50).max(130).optional(),
  haifaBagrutYear: year.optional(),
  haifaPsychometricYear: year.optional(),
};
export const haifaProfileInputsSchema = z.object(haifaAdmissionsInputsShape);
export const haifaScoreInputsSchema = haifaProfileInputsSchema.required();

export type HaifaAdmissionsInputs = z.infer<z.ZodObject<typeof haifaAdmissionsInputsShape>>;

export const HAIFA_PROGRAM_ALIASES = [
  ['accounting', 'haifa_accounting'],
  ['biology', 'haifa_biology'],
  ['communication', 'haifa_communication'],
  ['cs', 'haifa_cs'],
  ['economics', 'haifa_economics'],
  ['haifa_infosystems'],
  ['law', 'haifa_law'],
  ['haifa_math'],
  ['nursing', 'haifa_nursing'],
  ['occupational_therapy'],
  ['physiotherapy', 'haifa_physiotherapy'],
  ['political_science', 'haifa_politicalscience'],
  ['psychology', 'haifa_psychology'],
  ['social_work', 'haifa_socialwork'],
  ['haifa_sociology'],
  ['haifa_statistics'],
] as const;
const programIds = new Set<string>(HAIFA_PROGRAM_ALIASES.flat());

export function isHaifaProgram(programId: string): boolean {
  return programIds.has(programId);
}

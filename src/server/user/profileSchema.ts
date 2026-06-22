import { z } from 'zod';

const geographicRegionSchema = z.enum(['center', 'north', 'south', 'any']);

const trimmedNonEmptyString = z.string().trim().min(1);
const boundedInteger = (min: number, max: number) => z.number().int().min(min).max(max);

const psychometricScoresSchema = z.strictObject({
  overall: boundedInteger(200, 800).optional(),
  quantitative: boundedInteger(50, 150).optional(),
  verbal: boundedInteger(50, 150).optional(),
  english: boundedInteger(50, 150).optional(),
});

const bagrutRecordSchema = z.strictObject({
  weightedAverage: boundedInteger(60, 120).optional(),
});

const academicScoresSchema = z.strictObject({
  psychometric: psychometricScoresSchema.optional(),
  bagrut: bagrutRecordSchema.optional(),
});

const uploadedDocumentSchema = z.strictObject({
  id: trimmedNonEmptyString,
  kind: z.enum(['psychometric', 'bagrut', 'other']),
  originalFileName: trimmedNonEmptyString,
  sizeBytes: z.number().int().nonnegative().nullable(),
});

export const userProfileSchema = z.strictObject({
  firstName: trimmedNonEmptyString.optional(),
  lastName: trimmedNonEmptyString.optional(),
  geographicPreference: geographicRegionSchema,
  academicScores: academicScoresSchema.optional(),
  savedProgramIds: z.array(trimmedNonEmptyString).optional(),
  uploadedDocuments: z.array(uploadedDocumentSchema).optional(),
});

export const profileRequestBodySchema = z.strictObject({
  profile: userProfileSchema,
  mode: z.enum(['replace', 'merge_local_draft']).optional(),
});

export const savedProgramRequestBodySchema = z.strictObject({
  programId: trimmedNonEmptyString,
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type ProfileRequestBodyInput = z.infer<typeof profileRequestBodySchema>;
export type SavedProgramRequestBodyInput = z.infer<typeof savedProgramRequestBodySchema>;

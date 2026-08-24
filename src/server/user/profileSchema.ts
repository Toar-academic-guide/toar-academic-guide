import { z } from 'zod';
import { MAX_BAGRUT_SUBJECTS } from '@/lib/bagrutSubjectLimits';

const geographicRegionSchema = z.enum(['center', 'north', 'south', 'any']);

const trimmedNonEmptyString = z.string().trim().min(1);
const boundedInteger = (min: number, max: number) => z.number().int().min(min).max(max);

const psychometricScoresSchema = z.strictObject({
  overall: boundedInteger(200, 800).optional(),
  quantitative: boundedInteger(50, 150).optional(),
  verbal: boundedInteger(50, 150).optional(),
  english: boundedInteger(50, 150).optional(),
});

const bagrutSectorSchema = z.enum([
  'jewish',
  'arab',
  'druze',
  'circassian',
  'bedouin',
  'samaritan',
]);

const bagrutSubjectSchema = z.strictObject({
  subjectId: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  units: boundedInteger(1, 5),
  grade: boundedInteger(0, 100),
});

const bagrutSubjectRecordSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    sector: bagrutSectorSchema,
    subjects: z.array(bagrutSubjectSchema).min(1).max(MAX_BAGRUT_SUBJECTS),
    profileHash: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/)
      .optional(),
  })
  .superRefine((record, context) => {
    const seenSubjectIds = new Set<string>();

    for (const [index, subject] of record.subjects.entries()) {
      const normalizedSubjectId = subject.subjectId.trim().toLowerCase();
      if (seenSubjectIds.has(normalizedSubjectId)) {
        context.addIssue({
          code: 'custom',
          path: ['subjects', index, 'subjectId'],
          message: 'Bagrut subjects must be unique.',
        });
      }
      seenSubjectIds.add(normalizedSubjectId);
    }
  });

const bagrutRecordSchema = z.strictObject({
  weightedAverage: boundedInteger(60, 120).optional(),
  subjectRecord: bagrutSubjectRecordSchema.optional(),
});

const academicScoresSchema = z.strictObject({
  psychometric: psychometricScoresSchema.optional(),
  bagrut: bagrutRecordSchema.optional(),
});

const uploadedDocumentSchema = z.strictObject({
  id: trimmedNonEmptyString,
  kind: z.enum(['psychometric', 'bagrut']),
  displayName: trimmedNonEmptyString,
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

import { z } from 'zod';

import { MAX_BAGRUT_SUBJECTS } from './bagrutSubjectLimits';

export const bagrutSectorSchema = z.enum([
  'jewish',
  'arab',
  'druze',
  'circassian',
  'bedouin',
  'samaritan',
]);

const subjectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);

const legacySubjectIdSchema = z.string().min(1).max(100);

const baseBagrutSubjectShape = {
  subjectId: subjectIdSchema,
  units: z.number().int().min(1).max(5),
  grade: z.number().int().min(0).max(100),
};

const bagrutSubjectV1Schema = z.strictObject(baseBagrutSubjectShape);
const legacyBagrutSubjectV1Schema = z.strictObject({
  ...baseBagrutSubjectShape,
  subjectId: legacySubjectIdSchema,
});
const bagrutSubjectV2Schema = z.strictObject({
  ...baseBagrutSubjectShape,
  assessmentKind: z.enum(['exam', 'final_project', 'combined']),
});

const profileHashSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/)
  .optional();

const legacyProfileHashSchema = z.string().max(100).optional();

const bagrutSubjectRecordV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    sector: bagrutSectorSchema,
    subjects: z.array(bagrutSubjectV1Schema).min(1).max(MAX_BAGRUT_SUBJECTS),
    profileHash: profileHashSchema,
  })
  .superRefine((record, context) => {
    rejectDuplicateEntries(
      record.subjects.map((subject) => subject.subjectId),
      context,
    );
  });

const admissionsBagrutSubjectRecordV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  sector: bagrutSectorSchema,
  subjects: z.array(legacyBagrutSubjectV1Schema).max(MAX_BAGRUT_SUBJECTS),
  profileHash: legacyProfileHashSchema,
});

const bagrutSubjectRecordV2Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    sector: bagrutSectorSchema,
    certificateType: z.enum(['internal', 'external_1977_or_later', 'other']),
    complete: z.boolean(),
    subjects: z.array(bagrutSubjectV2Schema).min(1).max(MAX_BAGRUT_SUBJECTS),
    profileHash: profileHashSchema,
  })
  .superRefine((record, context) => {
    rejectDuplicateEntries(
      record.subjects.map((subject) => `${subject.subjectId}:${subject.assessmentKind}`),
      context,
    );
  });

export const bagrutSubjectRecordSchema = z.discriminatedUnion('schemaVersion', [
  bagrutSubjectRecordV1Schema,
  bagrutSubjectRecordV2Schema,
]);

/** Preserves the established public evaluate-endpoint contract for schema v1. */
export const admissionsBagrutSubjectRecordSchema = z.discriminatedUnion('schemaVersion', [
  admissionsBagrutSubjectRecordV1Schema,
  bagrutSubjectRecordV2Schema,
]);

function rejectDuplicateEntries(keys: string[], context: z.RefinementCtx) {
  const seen = new Set<string>();
  keys.forEach((key, index) => {
    const normalizedKey = key.trim().toLowerCase();
    if (seen.has(normalizedKey)) {
      context.addIssue({
        code: 'custom',
        path: ['subjects', index, 'subjectId'],
        message: 'Bagrut subject entries must be unique.',
      });
    }
    seen.add(normalizedKey);
  });
}

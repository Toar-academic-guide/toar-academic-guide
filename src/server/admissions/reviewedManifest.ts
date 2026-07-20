import 'server-only';

import { z } from 'zod';

const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const identifierSchema = z.string().regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/);
const safeExcerptSchema = z
  .string()
  .trim()
  .min(1)
  .max(600)
  .refine((value) => !/[<>{}]/.test(value), 'Evidence excerpts cannot contain code-like content.');
const numberOrTextSchema = z.union([z.number().finite(), z.string().trim().min(1).max(160)]);

const manifestSchema = z
  .object({
    version: z.literal(1),
    changes: z
      .array(
        z
          .object({
            target: z.object({
              institutionId: identifierSchema,
              programId: identifierSchema,
              cycle: z.string().regex(/^20\d{2}$/),
            }),
            ruleKind: z.enum(['admission_cutoff', 'minimum_gate', 'formula_coefficient']),
            before: numberOrTextSchema,
            after: numberOrTextSchema,
            effectiveFrom: z.string().date(),
            sourceProofs: z
              .array(
                z.object({
                  sourceId: identifierSchema,
                  digest: digestSchema,
                  excerpt: safeExcerptSchema,
                  url: z.url().max(2048),
                }),
              )
              .min(1),
          })
          .strict(),
      )
      .max(500),
  })
  .strict()
  .superRefine((manifest, context) => {
    const seen = new Set<string>();
    for (const [index, change] of manifest.changes.entries()) {
      const key = [
        change.target.institutionId,
        change.target.programId,
        change.target.cycle,
        change.ruleKind,
      ].join(':');
      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['changes', index],
          message: 'Overlapping changes are not allowed.',
        });
      }
      seen.add(key);
      if (JSON.stringify(change.before) === JSON.stringify(change.after)) {
        context.addIssue({
          code: 'custom',
          path: ['changes', index],
          message: 'Manifest changes must be material.',
        });
      }
    }
  });

export type ReviewedAdmissionsManifest = z.infer<typeof manifestSchema>;

export function parseReviewedAdmissionsManifest(value: unknown): ReviewedAdmissionsManifest {
  return manifestSchema.parse(value);
}

export function canonicalizeReviewedAdmissionsManifest(
  manifest: ReviewedAdmissionsManifest,
): string {
  return JSON.stringify({
    version: manifest.version,
    changes: [...manifest.changes]
      .sort((left, right) => manifestChangeKey(left).localeCompare(manifestChangeKey(right)))
      .map((change) => ({
        target: change.target,
        ruleKind: change.ruleKind,
        before: change.before,
        after: change.after,
        effectiveFrom: change.effectiveFrom,
        sourceProofs: [...change.sourceProofs].sort((left, right) =>
          left.sourceId.localeCompare(right.sourceId),
        ),
      })),
  });
}

function manifestChangeKey(change: ReviewedAdmissionsManifest['changes'][number]) {
  return `${change.target.institutionId}:${change.target.programId}:${change.target.cycle}:${change.ruleKind}`;
}

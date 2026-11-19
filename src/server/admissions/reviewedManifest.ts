import 'server-only';

import { z } from 'zod';
import { bguQuantitativeProgramme } from './bguQuantitativeRoutesPolicy';
import {
  BGU_PSYCHOLOGY_OFFICIAL_PROGRAM_ID,
  BGU_PSYCHOLOGY_SOURCE_URL,
} from '@/data/admissions/bguPsychologyVerification';

const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const identifierSchema = z.string().regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/);
const safeExcerptSchema = z
  .string()
  .trim()
  .min(1)
  .max(600)
  .refine((value) => !/[<>{}]/.test(value), 'Evidence excerpts cannot contain code-like content.');
const numberOrTextSchema = z.union([z.number().finite(), z.string().trim().min(1).max(160)]);
const releaseKindSchema = z.enum(['canonical_bootstrap', 'canonical_change', 'operational_proof']);
const proofTypeSchema = z.enum(['exact_official', 'controlled_fixture']);
const proofTargets = new Set(['tau:tau_cs', 'bgu:bgu_cs']);
const bguRoutePrograms = new Set([
  'accounting',
  'bgu_accounting',
  'psychology',
  'bgu_psychology',
  'biology',
  'bgu_biology',
  'business',
  'bgu_business',
  'economics',
  'bgu_economics',
]);

export function requiresCutoffEvidence(institutionId: string, programId: string): boolean {
  return (
    institutionId === 'technion' || (institutionId === 'bgu' && bguRoutePrograms.has(programId))
  );
}

const cutoffEvidenceSchema = z
  .object({
    value: z.number().finite(),
    metric: z.enum(['sekhem', 'quantitative_sekhem']),
    route: z.literal('main'),
    cycle: z.string().regex(/^20\d{2}$/),
    programPath: safeExcerptSchema,
    registrationStatus: safeExcerptSchema.optional(),
    prerequisites: safeExcerptSchema,
    sourceUrl: z.url().max(2048),
    sourceStatus: z.number().int().min(200).max(299),
    sourceExcerpt: safeExcerptSchema,
  })
  .strict();

export function cutoffEvidenceMatchesTarget(input: {
  institutionId: string;
  programId: string;
  cycle: string;
  value: number;
  sourceUrl: string;
  evidence: z.infer<typeof cutoffEvidenceSchema>;
}): boolean {
  const { institutionId, programId, cycle, value, sourceUrl, evidence } = input;
  const expectedMetric =
    institutionId === 'bgu' && !['psychology', 'bgu_psychology'].includes(programId)
      ? 'quantitative_sekhem'
      : 'sekhem';
  const bguProgramme = institutionId === 'bgu' ? bguQuantitativeProgramme(programId) : undefined;
  const expectedBguPath =
    bguProgramme?.officialProgramId ??
    (['psychology', 'bgu_psychology'].includes(programId)
      ? BGU_PSYCHOLOGY_OFFICIAL_PROGRAM_ID
      : undefined);
  const expectedBguUrl =
    bguProgramme?.sourceUrl ??
    (expectedBguPath === BGU_PSYCHOLOGY_OFFICIAL_PROGRAM_ID
      ? BGU_PSYCHOLOGY_SOURCE_URL
      : undefined);
  return (
    evidence.route === 'main' &&
    evidence.value === value &&
    evidence.cycle === cycle &&
    evidence.metric === expectedMetric &&
    evidence.sourceUrl === sourceUrl &&
    evidence.sourceStatus >= 200 &&
    evidence.sourceStatus < 300 &&
    !!evidence.prerequisites &&
    !!evidence.programPath &&
    evidence.sourceExcerpt.includes(String(value)) &&
    (institutionId !== 'bgu' ||
      (evidence.programPath === expectedBguPath &&
        !!expectedBguUrl &&
        bguSourceMatchesProgramme(evidence.sourceUrl, expectedBguUrl) &&
        !!evidence.registrationStatus)) &&
    (institutionId !== 'technion' ||
      (evidence.sourceUrl.includes('/sechem-for-admission/') &&
        evidence.sourceExcerpt.includes(evidence.programPath) &&
        (programId !== 'technion_civil' || evidence.programPath === 'הנדסה אזרחית')))
  );
}

function bguSourceMatchesProgramme(actual: string, expected: string): boolean {
  const actualUrl = new URL(actual);
  const expectedUrl = new URL(expected);
  if (actualUrl.origin !== expectedUrl.origin || actualUrl.pathname !== expectedUrl.pathname)
    return false;
  const archivedExtras = new Map([
    ['p_institution', '0'],
    ['p_degree_level', '1'],
  ]);
  return (
    [...expectedUrl.searchParams].every(
      ([key, value]) =>
        actualUrl.searchParams.getAll(key).length === 1 &&
        actualUrl.searchParams.get(key) === value,
    ) &&
    [...actualUrl.searchParams].every(
      ([key, value]) =>
        expectedUrl.searchParams.has(key) ||
        (archivedExtras.get(key) === value && actualUrl.searchParams.getAll(key).length === 1),
    )
  );
}

const sourceProofSchema = z
  .object({
    sourceId: identifierSchema,
    digest: digestSchema,
    excerpt: safeExcerptSchema,
    url: z.url().max(2048),
    proofType: proofTypeSchema,
    cutoffEvidence: cutoffEvidenceSchema.optional(),
  })
  .strict();

const changeSchema = z
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
    sourceProofs: z.array(sourceProofSchema).min(1),
  })
  .strict();

const manifestSchema = z
  .object({
    version: z.literal(2),
    releaseKind: releaseKindSchema,
    proofScenario: identifierSchema.optional(),
    changes: z.array(changeSchema).max(500),
  })
  .strict()
  .superRefine((manifest, context) => {
    const isOperationalProof = manifest.releaseKind === 'operational_proof';
    const configuredLiveCycle = process.env.ADMISSIONS_CYCLE ?? '2027';
    if (isOperationalProof !== Boolean(manifest.proofScenario)) {
      context.addIssue({
        code: 'custom',
        path: ['proofScenario'],
        message:
          'Operational proof releases require a proof scenario and canonical releases forbid one.',
      });
    }
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
      const material = JSON.stringify(change.before) !== JSON.stringify(change.after);
      if (manifest.releaseKind !== 'canonical_bootstrap' && !material) {
        context.addIssue({
          code: 'custom',
          path: ['changes', index],
          message: 'Canonical changes and operational proof changes must be material.',
        });
      }
      const proofTypes = new Set(change.sourceProofs.map((proof) => proof.proofType));
      if (isOperationalProof) {
        const proofTarget = `${change.target.institutionId}:${change.target.programId}`;
        if (change.target.cycle !== '2099' || !proofTargets.has(proofTarget)) {
          context.addIssue({
            code: 'custom',
            path: ['changes', index, 'target'],
            message:
              'Operational proof releases are limited to TAU/BGU proof targets in cycle 2099.',
          });
        }
        if (proofTypes.size !== 1 || !proofTypes.has('controlled_fixture')) {
          context.addIssue({
            code: 'custom',
            path: ['changes', index, 'sourceProofs'],
            message: 'Operational proof releases require controlled fixture evidence only.',
          });
        }
      } else {
        if (change.target.cycle !== configuredLiveCycle) {
          context.addIssue({
            code: 'custom',
            path: ['changes', index, 'target', 'cycle'],
            message: `Canonical releases are limited to configured cycle ${configuredLiveCycle}.`,
          });
        }
        if (proofTypes.size !== 1 || !proofTypes.has('exact_official')) {
          context.addIssue({
            code: 'custom',
            path: ['changes', index, 'sourceProofs'],
            message: 'Canonical releases require exact official evidence only.',
          });
        }
        if (
          change.ruleKind === 'admission_cutoff' &&
          requiresCutoffEvidence(change.target.institutionId, change.target.programId)
        ) {
          for (const [proofIndex, proof] of change.sourceProofs.entries()) {
            const evidence = proof.cutoffEvidence;
            if (
              !evidence ||
              typeof change.after !== 'number' ||
              !cutoffEvidenceMatchesTarget({
                institutionId: change.target.institutionId,
                programId: change.target.programId,
                cycle: change.target.cycle,
                value: change.after,
                sourceUrl: proof.url,
                evidence,
              })
            ) {
              context.addIssue({
                code: 'custom',
                path: ['changes', index, 'sourceProofs', proofIndex],
                message:
                  'Canonical cutoff needs matching main-route, metric, cycle, prerequisites, and source evidence.',
              });
            }
          }
        }
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
    version: 2,
    releaseKind: manifest.releaseKind,
    ...(manifest.proofScenario ? { proofScenario: manifest.proofScenario } : {}),
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

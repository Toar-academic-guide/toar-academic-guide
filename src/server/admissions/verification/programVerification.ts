import { createHash } from 'node:crypto';
import { z } from 'zod';

import type {
  AdmissionsEvaluationCapability,
  AdmissionsPairVerificationState,
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';

const fingerprintSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const admissionCycleSchema = z.string().regex(/^\d{4}-\d{4}$/);
const timestampSchema = z.string().datetime({ offset: true });
const requiredInputSchema = z.enum([
  'psychometric_math',
  'psychometric_verbal',
  'psychometric_english',
  'math_units',
  'math_grade',
  'english_units',
  'english_grade',
  'physics_units',
  'physics_grade',
  'cs_units',
  'cs_grade',
]);
const verificationVerdictSchema = z.enum(['accepted', 'below']);
const fixtureInputValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const fixtureInputSchema = z
  .object({
    psychometric: z.number().finite(),
    bagrut: z.number().finite(),
  })
  .catchall(fixtureInputValueSchema);

export const admissionsVerificationFixtureSchema = z
  .object({
    id: z.string().min(1),
    pairId: z.string().min(1),
    admissionCycle: admissionCycleSchema,
    verdict: verificationVerdictSchema,
    input: fixtureInputSchema,
    expected: z.object({
      score: z.number().finite(),
      verdict: verificationVerdictSchema,
    }),
    sourceFingerprint: fingerprintSchema,
    capturedAt: timestampSchema,
  })
  .strict()
  .superRefine((fixture, context) => {
    if (fixture.verdict !== fixture.expected.verdict) {
      context.addIssue({
        code: 'custom',
        path: ['expected', 'verdict'],
        message: 'Fixture verdict must match its expected verdict.',
      });
    }
  });

const verificationGateSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['minimum', 'language', 'subject', 'direct_track', 'manual']),
    field: z.string().min(1),
    minimum: z.number().finite().optional(),
    description: z.string().min(1),
  })
  .strict();

export const admissionsProgramVerificationContractSchema = z
  .object({
    pairId: z.string().min(1),
    programId: z.string().min(1),
    institutionId: z.string().min(1),
    officialProgramId: z.string().min(1),
    admissionCycle: admissionCycleSchema,
    source: z
      .object({
        targetId: z.string().min(1),
        url: z.string().url(),
      })
      .strict(),
    calculation: z
      .object({
        adapterId: z.string().min(1),
        mode: z.enum(['formula', 'official_replay']),
        formulaFamily: z.string().min(1),
        requiredInputs: z.array(requiredInputSchema),
        cutoff: z
          .object({
            acceptance: z.number().finite(),
            rejection: z.number().finite().nullable(),
          })
          .strict(),
        gates: z.array(verificationGateSchema),
      })
      .strict(),
    fixtureIds: z.array(z.string().min(1)).min(1),
    fixtureSetFingerprint: fingerprintSchema,
    sourceFingerprint: fingerprintSchema,
    proof: z
      .object({
        state: z.enum(['verified', 'unverified', 'blocked']),
        comparedScore: z.boolean(),
        comparedVerdict: z.boolean(),
        liveComparedAt: timestampSchema.nullable(),
        sourceFingerprint: fingerprintSchema.nullable(),
      })
      .strict(),
  })
  .strict()
  .superRefine((contract, context) => {
    if (contract.pairId !== `${contract.programId}__${contract.institutionId}`) {
      context.addIssue({
        code: 'custom',
        path: ['pairId'],
        message: 'Contract pairId must match programId__institutionId.',
      });
    }

    if (new Set(contract.fixtureIds).size !== contract.fixtureIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['fixtureIds'],
        message: 'Contract fixtureIds must be unique.',
      });
    }
  });

export type ProgramVerificationIssueCode =
  | 'invalid_contract'
  | 'invalid_fixture'
  | 'duplicate_pair'
  | 'duplicate_target'
  | 'fixture_contains_pii'
  | 'fixture_pair_mismatch'
  | 'fixture_cycle_mismatch'
  | 'missing_fixture'
  | 'unexpected_fixture'
  | 'missing_eligible_fixture'
  | 'missing_below_fixture'
  | 'score_not_compared'
  | 'verdict_not_compared'
  | 'live_proof_missing'
  | 'proof_blocked'
  | 'stale_cycle'
  | 'source_fingerprint_mismatch'
  | 'proof_fingerprint_mismatch'
  | 'fixture_source_fingerprint_mismatch'
  | 'fixture_fingerprint_mismatch';

export interface ProgramVerificationIssue {
  code: ProgramVerificationIssueCode;
  message: string;
  pairId?: string;
  fixtureId?: string;
  targetId?: string;
}

export interface ProgramVerificationResult {
  state: AdmissionsPairVerificationState;
  capability: AdmissionsEvaluationCapability;
  issues: ProgramVerificationIssue[];
}

export interface ProgramVerificationRegistryResult {
  contracts: AdmissionsProgramVerificationContract[];
  issues: ProgramVerificationIssue[];
}

export function fingerprintVerificationFixtures(
  fixtures: readonly AdmissionsVerificationFixture[],
): string {
  const normalized = fixtures
    .map((fixture) => stableValue(fixture))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const digest = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  return `sha256:${digest}`;
}

export function parseProgramVerificationRegistry(
  values: readonly unknown[],
): ProgramVerificationRegistryResult {
  const issues: ProgramVerificationIssue[] = [];
  const contracts: AdmissionsProgramVerificationContract[] = [];

  for (const value of values) {
    const parsed = admissionsProgramVerificationContractSchema.safeParse(value);
    if (!parsed.success) {
      issues.push({
        code: 'invalid_contract',
        message: z.prettifyError(parsed.error),
      });
      continue;
    }
    contracts.push(parsed.data);
  }

  const pairIds = new Set<string>();
  const targetIds = new Set<string>();

  for (const contract of contracts) {
    if (pairIds.has(contract.pairId)) {
      issues.push({
        code: 'duplicate_pair',
        pairId: contract.pairId,
        message: `Duplicate verification contract for "${contract.pairId}".`,
      });
    }
    pairIds.add(contract.pairId);

    if (targetIds.has(contract.source.targetId)) {
      issues.push({
        code: 'duplicate_target',
        pairId: contract.pairId,
        targetId: contract.source.targetId,
        message: `Duplicate official target "${contract.source.targetId}".`,
      });
    }
    targetIds.add(contract.source.targetId);
  }

  return issues.length > 0 ? { contracts: [], issues } : { contracts, issues: [] };
}

export function evaluateProgramVerification(args: {
  contract: unknown;
  fixtures: readonly unknown[];
  currentAdmissionCycle: string;
  currentSourceFingerprint: string | null;
}): ProgramVerificationResult {
  const contractResult = admissionsProgramVerificationContractSchema.safeParse(args.contract);
  if (!contractResult.success) {
    return blocked([
      {
        code: 'invalid_contract',
        message: z.prettifyError(contractResult.error),
      },
    ]);
  }

  const contract = contractResult.data;
  const fixtures: AdmissionsVerificationFixture[] = [];
  const issues: ProgramVerificationIssue[] = [];

  for (const value of args.fixtures) {
    const parsed = admissionsVerificationFixtureSchema.safeParse(value);
    if (!parsed.success) {
      issues.push({
        code: 'invalid_fixture',
        message: z.prettifyError(parsed.error),
      });
      continue;
    }

    fixtures.push(parsed.data);
    if (fixtureContainsPii(parsed.data)) {
      issues.push({
        code: 'fixture_contains_pii',
        pairId: parsed.data.pairId,
        fixtureId: parsed.data.id,
        message: `Fixture "${parsed.data.id}" contains PII-like applicant data.`,
      });
    }
  }

  validateFixtureBindings(contract, fixtures, issues);
  validateProofState(contract, args, issues);

  if (issues.some((issue) => BLOCKING_ISSUES.has(issue.code))) {
    return blocked(issues);
  }

  if (issues.some((issue) => STALE_ISSUES.has(issue.code))) {
    return {
      state: 'stale',
      capability: 'stale',
      issues,
    };
  }

  if (issues.length > 0) {
    return {
      state: 'authority_unavailable',
      capability: 'authority_unavailable',
      issues,
    };
  }

  return {
    state: 'exact',
    capability: 'exact',
    issues: [],
  };
}

const BLOCKING_ISSUES = new Set<ProgramVerificationIssueCode>([
  'invalid_contract',
  'invalid_fixture',
  'fixture_contains_pii',
  'fixture_pair_mismatch',
  'proof_blocked',
]);

const STALE_ISSUES = new Set<ProgramVerificationIssueCode>([
  'stale_cycle',
  'source_fingerprint_mismatch',
  'proof_fingerprint_mismatch',
  'fixture_source_fingerprint_mismatch',
  'fixture_fingerprint_mismatch',
  'fixture_cycle_mismatch',
]);

function validateFixtureBindings(
  contract: AdmissionsProgramVerificationContract,
  fixtures: AdmissionsVerificationFixture[],
  issues: ProgramVerificationIssue[],
): void {
  const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const expectedFixtureIds = new Set(contract.fixtureIds);

  for (const fixture of fixtures) {
    if (fixture.pairId !== contract.pairId) {
      issues.push({
        code: 'fixture_pair_mismatch',
        pairId: contract.pairId,
        fixtureId: fixture.id,
        message: `Fixture "${fixture.id}" belongs to "${fixture.pairId}", not "${contract.pairId}".`,
      });
    }

    if (fixture.admissionCycle !== contract.admissionCycle) {
      issues.push({
        code: 'fixture_cycle_mismatch',
        pairId: contract.pairId,
        fixtureId: fixture.id,
        message: `Fixture "${fixture.id}" does not match admission cycle "${contract.admissionCycle}".`,
      });
    }

    if (fixture.sourceFingerprint !== contract.sourceFingerprint) {
      issues.push({
        code: 'fixture_source_fingerprint_mismatch',
        pairId: contract.pairId,
        fixtureId: fixture.id,
        message: `Fixture "${fixture.id}" does not match the contract source fingerprint.`,
      });
    }

    if (!expectedFixtureIds.has(fixture.id)) {
      issues.push({
        code: 'unexpected_fixture',
        pairId: contract.pairId,
        fixtureId: fixture.id,
        message: `Fixture "${fixture.id}" is not referenced by the contract.`,
      });
    }
  }

  for (const fixtureId of contract.fixtureIds) {
    if (!fixturesById.has(fixtureId)) {
      issues.push({
        code: 'missing_fixture',
        pairId: contract.pairId,
        fixtureId,
        message: `Contract fixture "${fixtureId}" is missing.`,
      });
    }
  }

  if (!fixtures.some((fixture) => fixture.verdict === 'accepted')) {
    issues.push({
      code: 'missing_eligible_fixture',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" is missing an eligible fixture.`,
    });
  }

  if (!fixtures.some((fixture) => fixture.verdict === 'below')) {
    issues.push({
      code: 'missing_below_fixture',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" is missing a below-threshold fixture.`,
    });
  }

  if (fingerprintVerificationFixtures(fixtures) !== contract.fixtureSetFingerprint) {
    issues.push({
      code: 'fixture_fingerprint_mismatch',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" fixture fingerprint does not match its artifacts.`,
    });
  }
}

function validateProofState(
  contract: AdmissionsProgramVerificationContract,
  args: {
    currentAdmissionCycle: string;
    currentSourceFingerprint: string | null;
  },
  issues: ProgramVerificationIssue[],
): void {
  if (contract.proof.state === 'blocked') {
    issues.push({
      code: 'proof_blocked',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" live proof is blocked.`,
    });
  }

  if (!contract.proof.comparedScore) {
    issues.push({
      code: 'score_not_compared',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" has not compared the official score.`,
    });
  }

  if (!contract.proof.comparedVerdict) {
    issues.push({
      code: 'verdict_not_compared',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" has not compared the official verdict.`,
    });
  }

  if (contract.proof.state !== 'verified' || !contract.proof.liveComparedAt) {
    issues.push({
      code: 'live_proof_missing',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" does not have a completed live proof.`,
    });
  }

  if (contract.admissionCycle !== args.currentAdmissionCycle) {
    issues.push({
      code: 'stale_cycle',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" is for admission cycle "${contract.admissionCycle}".`,
    });
  }

  if (
    !args.currentSourceFingerprint ||
    args.currentSourceFingerprint !== contract.sourceFingerprint
  ) {
    issues.push({
      code: 'source_fingerprint_mismatch',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" source fingerprint is no longer current.`,
    });
  }

  if (contract.proof.sourceFingerprint !== contract.sourceFingerprint) {
    issues.push({
      code: 'proof_fingerprint_mismatch',
      pairId: contract.pairId,
      message: `Contract "${contract.pairId}" live proof fingerprint does not match its source.`,
    });
  }
}

function blocked(issues: ProgramVerificationIssue[]): ProgramVerificationResult {
  return {
    state: 'blocked',
    capability: 'blocked',
    issues,
  };
}

function fixtureContainsPii(fixture: AdmissionsVerificationFixture): boolean {
  const forbiddenKey = /(user|name|email|phone|address|birth|passport|identity|teudat|tz)/i;
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phone = /^(?:\+972|0)(?:[23489]|5\d)-?\d{7}$/;
  const israeliId = /^\d{9}$/;

  return Object.entries(fixture.input).some(
    ([key, value]) =>
      forbiddenKey.test(key) ||
      (typeof value === 'string' &&
        (email.test(value.trim()) || phone.test(value.trim()) || israeliId.test(value.trim()))),
  );
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stableValue(nested)]),
  );
}

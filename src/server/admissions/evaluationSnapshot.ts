import 'server-only';

import { createHash } from 'node:crypto';

import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsEvaluationSnapshot,
} from '@/types/admissionsEvaluation';

export const ADMISSIONS_EVALUATOR_VERSION = 'admissions-evaluator-v1';

type SnapshotResult = Pick<
  AdmissionsEvaluationResult,
  | 'linkedInstitutionId'
  | 'capability'
  | 'kind'
  | 'decision'
  | 'score'
  | 'scoreLabel'
  | 'threshold'
  | 'deltaNeeded'
  | 'requiredInputs'
  | 'evidenceItemId'
  | 'officialUrls'
  | 'degradationReason'
>;

export function createAdmissionsEvaluationSnapshot(args: {
  input: AdmissionsEvaluationInput;
  result: SnapshotResult;
}): AdmissionsEvaluationSnapshot {
  const inputDigest = createAdmissionsInputDigest(args.input);
  const ruleVersion = [
    ADMISSIONS_EVALUATOR_VERSION,
    args.result.linkedInstitutionId,
    args.result.evidenceItemId ?? args.result.capability,
  ].join(':');
  const ruleFingerprint = digest({
    evaluatorVersion: ADMISSIONS_EVALUATOR_VERSION,
    target: {
      degreeId: args.input.degreeId,
      institutionId: args.result.linkedInstitutionId,
    },
    ruleVersion,
    capability: args.result.capability,
    kind: args.result.kind,
    threshold: args.result.threshold ?? null,
    evidenceItemId: args.result.evidenceItemId ?? null,
    officialUrls: [...(args.result.officialUrls ?? [])].sort(),
    requiredInputs: [...(args.result.requiredInputs ?? [])].sort(),
    degradationReason: args.result.degradationReason ?? null,
  });

  return {
    evaluatorVersion: ADMISSIONS_EVALUATOR_VERSION,
    ruleVersion,
    ruleFingerprint,
    inputDigest,
    evaluationDigest: digest({
      inputDigest,
      ruleFingerprint,
      decision: args.result.decision,
      score: args.result.score ?? null,
      scoreLabel: args.result.scoreLabel ?? null,
      threshold: args.result.threshold ?? null,
      deltaNeeded: args.result.deltaNeeded ?? null,
    }),
  };
}

export function createAdmissionsInputDigest(input: AdmissionsEvaluationInput): string {
  return digest({
    degreeId: input.degreeId,
    psychometric: input.psychometric,
    bagrut: input.bagrut,
    extraInputs: input.extraInputs ?? {},
  });
}

function digest(value: unknown): string {
  return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}

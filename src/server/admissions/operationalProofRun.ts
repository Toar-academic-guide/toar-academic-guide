import { createHash } from 'node:crypto';

import type { ReviewedAdmissionsManifest } from './reviewedManifest';
import {
  buildAdmissionsReviewMarkdown,
  type AdmissionsReviewCandidate,
  type AdmissionsReviewRun,
} from './weeklyReviewRun';

const OPERATIONAL_PROOF_CYCLE = '2099';

const scenarios = {
  'proof-plan001-20260820': [
    { institutionId: 'tau', programId: 'tau_cs', before: 700, after: 701 },
    { institutionId: 'bgu', programId: 'bgu_cs', before: 720, after: 721 },
  ],
  'proof-plan001-failure-20260820': [
    { institutionId: 'tau', programId: 'tau_cs', before: 701, after: 702 },
    { institutionId: 'bgu', programId: 'bgu_cs', before: 721, after: 722 },
  ],
  'proof-plan001-corrective-20260820': [
    { institutionId: 'tau', programId: 'tau_cs', before: 702, after: 700 },
    { institutionId: 'bgu', programId: 'bgu_cs', before: 722, after: 720 },
  ],
} as const;

export type OperationalProofScenario = keyof typeof scenarios;
export const OPERATIONAL_PROOF_SCENARIOS = Object.keys(scenarios) as OperationalProofScenario[];

export function buildOperationalProofReviewRun(input: {
  runKey: string;
  checkedAt: Date;
  proofScenario: OperationalProofScenario;
}): AdmissionsReviewRun {
  if (input.runKey !== input.proofScenario) {
    throw new Error('Operational proof run key must equal its proof scenario for stable identity.');
  }
  const changes = scenarios[input.proofScenario];
  const candidates: AdmissionsReviewCandidate[] = changes.map((change) => {
    const sourcePayload = {
      proofScenario: input.proofScenario,
      target: change,
      cycle: OPERATIONAL_PROOF_CYCLE,
    };
    return {
      id: `${input.proofScenario}-${change.institutionId}-${change.programId}:admission_cutoff`,
      target: {
        institutionId: change.institutionId,
        programId: change.programId,
        cycle: OPERATIONAL_PROOF_CYCLE,
      },
      ruleKind: 'admission_cutoff',
      before: change.before,
      after: change.after,
      sourceProof: {
        sourceId: `${input.proofScenario}-${change.institutionId}-${change.programId}`,
        digest: digest(JSON.stringify(sourcePayload)),
        excerpt: `Controlled Plan 001 fixture for ${change.institutionId}/${change.programId}: ${change.before} to ${change.after}.`,
        url: `https://example.invalid/admissions-operational-proof/${input.proofScenario}`,
        proofType: 'controlled_fixture',
      },
      institutionName:
        change.institutionId === 'tau' ? 'Tel Aviv University' : 'Ben-Gurion University',
    };
  });
  const manifest: ReviewedAdmissionsManifest = {
    version: 2,
    releaseKind: 'operational_proof',
    proofScenario: input.proofScenario,
    changes: candidates.map((candidate) => ({
      target: candidate.target,
      ruleKind: candidate.ruleKind,
      before: candidate.before,
      after: candidate.after,
      effectiveFrom: input.checkedAt.toISOString().slice(0, 10),
      sourceProofs: [candidate.sourceProof],
    })),
  };
  const run = {
    runKey: input.runKey,
    checkedAt: input.checkedAt.toISOString(),
    releaseKind: 'operational_proof' as const,
    proofScenario: input.proofScenario,
    summary: {
      status: 'reviewable' as const,
      candidateCount: candidates.length,
      excludedCount: 0,
      freshCount: 0,
      blockedCount: 0,
      failedCount: 0,
    },
    candidates,
    excluded: [],
    reviewMetadata: {
      version: 1 as const,
      runKey: input.runKey,
      excludedCandidateIds: [],
    },
    manifest,
    markdown: '',
  } satisfies Omit<AdmissionsReviewRun, 'markdown'> & { markdown: string };

  return { ...run, markdown: buildAdmissionsReviewMarkdown(run) };
}

function digest(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

import 'server-only';

import type { AdmissionsSourceProof } from '@/server/ingestion/admissionsSourceAdapters';

import type { ReviewedAdmissionsManifest } from './reviewedManifest';

export interface AdmissionsCandidateChange {
  target: { institutionId: string; programId: string; cycle: string };
  ruleKind: 'admission_cutoff';
  before: number;
  after: number;
  sourceProofId: string;
  capability: 'decision_capable';
}

export interface ExcludedAdmissionsCandidate {
  sourceProofId: string;
  reason:
    | 'proof_not_decision_capable'
    | 'missing_program_or_cutoff'
    | 'no_reviewed_baseline'
    | 'unchanged';
}

export function classifyAdmissionsProofCandidates(args: {
  baseline: ReviewedAdmissionsManifest;
  cycle: string;
  proofs: AdmissionsSourceProof[];
}): { candidates: AdmissionsCandidateChange[]; excluded: ExcludedAdmissionsCandidate[] } {
  const candidates: AdmissionsCandidateChange[] = [];
  const excluded: ExcludedAdmissionsCandidate[] = [];

  for (const proof of args.proofs) {
    if (
      proof.capability !== 'decision_capable' ||
      proof.proofLevel !== 'exact_official' ||
      proof.status !== 'succeeded'
    ) {
      excluded.push({ sourceProofId: proof.id, reason: 'proof_not_decision_capable' });
      continue;
    }
    const programId = stringValue(proof.normalizedPayload.programId);
    const cutoff = numberValue(
      proof.normalizedPayload.acceptanceThreshold ?? proof.normalizedPayload.acceptanceCutoff,
    );
    if (!programId || cutoff === undefined) {
      excluded.push({ sourceProofId: proof.id, reason: 'missing_program_or_cutoff' });
      continue;
    }
    const baselineChange = args.baseline.changes.find(
      (change) =>
        change.target.institutionId === proof.institutionId &&
        change.target.programId === programId &&
        change.target.cycle === args.cycle &&
        change.ruleKind === 'admission_cutoff',
    );
    if (!baselineChange || typeof baselineChange.after !== 'number') {
      excluded.push({ sourceProofId: proof.id, reason: 'no_reviewed_baseline' });
      continue;
    }
    if (baselineChange.after === cutoff) {
      excluded.push({ sourceProofId: proof.id, reason: 'unchanged' });
      continue;
    }
    candidates.push({
      target: { institutionId: proof.institutionId, programId, cycle: args.cycle },
      ruleKind: 'admission_cutoff',
      before: baselineChange.after,
      after: cutoff,
      sourceProofId: proof.id,
      capability: 'decision_capable',
    });
  }
  return { candidates, excluded };
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

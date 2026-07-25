import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { classifyAdmissionsProofCandidates } from './candidateChanges';
import { FORMULA_BACKED_VERIFICATION_LEDGER } from '@/data/admissions/formulaBackedVerificationLedger';

const baseline = {
  version: 1 as const,
  changes: [
    {
      target: { institutionId: 'tau', programId: 'tau_datascience', cycle: '2027' },
      ruleKind: 'admission_cutoff' as const,
      before: 700,
      after: 700,
      effectiveFrom: '2026-01-01',
      sourceProofs: [
        {
          sourceId: 'tau-digital-sciences-live',
          digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          excerpt: 'Baseline cutoff 700.',
          url: 'https://go.tau.ac.il/graphql',
        },
      ],
    },
  ],
};

describe('admissions proof candidate classification', () => {
  const withheldTauLedger = FORMULA_BACKED_VERIFICATION_LEDGER.map((entry) =>
    entry.pairId === 'tau_datascience__tau' ? { ...entry, state: 'withheld' as const } : entry,
  );
  const exactTauLedger = FORMULA_BACKED_VERIFICATION_LEDGER.map((entry) =>
    entry.pairId === 'tau_datascience__tau' ? { ...entry, state: 'exact' as const } : entry,
  );

  it('withholds a decision-capable proof while pair verification is incomplete', () => {
    const result = classifyAdmissionsProofCandidates({
      baseline,
      cycle: '2027',
      verificationLedger: withheldTauLedger,
      proofs: [
        {
          id: 'tau-digital-sciences-live',
          institutionId: 'tau',
          institutionName: 'TAU',
          officialUrl: 'https://go.tau.ac.il/graphql',
          adapterId: 'tau',
          capability: 'decision_capable',
          proofLevel: 'exact_official',
          status: 'succeeded',
          sourceClass: 'api_static_json',
          reproducedFields: ['acceptanceThreshold'],
          normalizedPayload: { programId: 'tau_datascience', acceptanceThreshold: 695 },
          limitations: [],
          nextAction: 'review',
        },
      ],
    });
    expect(result.candidates).toEqual([]);
    expect(result.excluded).toMatchObject([{ reason: 'pair_verification_incomplete' }]);
  });

  it('proposes a cutoff change only after the pair ledger is exact', () => {
    const result = classifyAdmissionsProofCandidates({
      baseline,
      cycle: '2027',
      verificationLedger: exactTauLedger,
      proofs: [
        {
          id: 'tau-digital-sciences-live',
          institutionId: 'tau',
          institutionName: 'TAU',
          officialUrl: 'https://go.tau.ac.il/graphql',
          adapterId: 'tau',
          capability: 'decision_capable',
          proofLevel: 'exact_official',
          status: 'succeeded',
          sourceClass: 'api_static_json',
          reproducedFields: ['acceptanceThreshold'],
          normalizedPayload: { programId: 'tau_datascience', acceptanceThreshold: 695 },
          limitations: [],
          nextAction: 'review',
        },
      ],
    });

    expect(result.candidates).toMatchObject([
      { before: 700, after: 695, ruleKind: 'admission_cutoff' },
    ]);
  });

  it('excludes partial BGU score proofs from publishable candidates', () => {
    const result = classifyAdmissionsProofCandidates({
      baseline,
      cycle: '2027',
      proofs: [
        {
          id: 'bgu-score-only',
          institutionId: 'bgu',
          institutionName: 'BGU',
          officialUrl: 'https://bgu.ac.il',
          adapterId: 'bgu',
          capability: 'score_only',
          proofLevel: 'partial_official',
          status: 'partial',
          sourceClass: 'score_only_calculator',
          reproducedFields: ['sekhemScore'],
          normalizedPayload: { programId: 'bgu_cs', sekhemScore: 720 },
          limitations: [],
          nextAction: 'find cutoff',
        },
      ],
    });
    expect(result.candidates).toEqual([]);
    expect(result.excluded).toMatchObject([{ reason: 'proof_not_decision_capable' }]);
  });
});

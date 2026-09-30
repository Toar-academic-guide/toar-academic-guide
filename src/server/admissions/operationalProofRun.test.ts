import { describe, expect, it } from 'vitest';

import { buildOperationalProofReviewRun } from './operationalProofRun';

describe('operational proof review run', () => {
  it('creates deterministic TAU/BGU fixture-only manifests on the isolated 2099 cycle', () => {
    const run = buildOperationalProofReviewRun({
      runKey: 'proof-plan001-20260820',
      checkedAt: new Date('2026-08-20T12:00:00.000Z'),
      proofScenario: 'proof-plan001-20260820',
    });

    expect(run.releaseKind).toBe('operational_proof');
    expect(run.proofScenario).toBe('proof-plan001-20260820');
    expect(run.manifest).toMatchObject({
      version: 2,
      releaseKind: 'operational_proof',
      proofScenario: 'proof-plan001-20260820',
      changes: [
        {
          target: { institutionId: 'tau', programId: 'tau_cs', cycle: '2099' },
          before: 700,
          after: 701,
          sourceProofs: [{ proofType: 'controlled_fixture' }],
        },
        {
          target: { institutionId: 'bgu', programId: 'bgu_cs', cycle: '2099' },
          before: 645,
          after: 646,
          sourceProofs: [{ proofType: 'controlled_fixture' }],
        },
      ],
    });
  });

  it('uses the same run key and source payload for a same-identity rerun', () => {
    const first = buildOperationalProofReviewRun({
      runKey: 'proof-plan001-20260820',
      checkedAt: new Date('2026-08-20T12:00:00.000Z'),
      proofScenario: 'proof-plan001-20260820',
    });
    const rerun = buildOperationalProofReviewRun({
      runKey: 'proof-plan001-20260820',
      checkedAt: new Date('2026-08-20T12:00:00.000Z'),
      proofScenario: 'proof-plan001-20260820',
    });

    expect(rerun.reviewMetadata).toEqual(first.reviewMetadata);
    expect(rerun.manifest).toEqual(first.manifest);
  });

  it('chains BGU proof scenarios from the verified canonical baseline', () => {
    const failure = buildOperationalProofReviewRun({
      runKey: 'proof-plan001-failure-20260820',
      checkedAt: new Date('2026-08-20T12:00:00.000Z'),
      proofScenario: 'proof-plan001-failure-20260820',
    });
    const corrective = buildOperationalProofReviewRun({
      runKey: 'proof-plan001-corrective-20260820',
      checkedAt: new Date('2026-08-20T12:00:00.000Z'),
      proofScenario: 'proof-plan001-corrective-20260820',
    });

    expect(failure.manifest.changes[1]).toMatchObject({ before: 646, after: 647 });
    expect(corrective.manifest.changes[1]).toMatchObject({ before: 647, after: 645 });
  });
});

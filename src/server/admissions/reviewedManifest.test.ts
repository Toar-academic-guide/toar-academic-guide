import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  canonicalizeReviewedAdmissionsManifest,
  parseReviewedAdmissionsManifest,
} from './reviewedManifest';

const change = {
  target: { institutionId: 'tau', programId: 'tau_cs', cycle: '2027' },
  ruleKind: 'admission_cutoff',
  before: 706,
  after: 700,
  effectiveFrom: '2026-08-01',
  sourceProofs: [
    {
      sourceId: 'tau-computer-science',
      digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      excerpt: 'Current published admission cutoff: 700.',
      url: 'https://go.tau.ac.il/he/exact/ba/computer',
      proofType: 'exact_official' as const,
    },
  ],
};

describe('reviewed admissions manifest', () => {
  it('canonicalizes a source-backed canonical change byte-stably', () => {
    const manifest = parseReviewedAdmissionsManifest({
      version: 2,
      releaseKind: 'canonical_change',
      changes: [change],
    });
    expect(canonicalizeReviewedAdmissionsManifest(manifest)).toBe(
      JSON.stringify({
        version: 2,
        releaseKind: 'canonical_change',
        changes: [change],
      }),
    );
  });

  it('rejects source-free, overlapping, fixture-backed, or code-bearing canonical candidates', () => {
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 2,
        releaseKind: 'canonical_change',
        changes: [{ ...change, sourceProofs: [] }],
      }),
    ).toThrow();
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 2,
        releaseKind: 'canonical_change',
        changes: [change, change],
      }),
    ).toThrow();
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 2,
        releaseKind: 'canonical_change',
        changes: [
          {
            ...change,
            sourceProofs: [{ ...change.sourceProofs[0], excerpt: '<script>alert(1)</script>' }],
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 2,
        releaseKind: 'canonical_change',
        changes: [
          {
            ...change,
            sourceProofs: [{ ...change.sourceProofs[0], proofType: 'controlled_fixture' }],
          },
        ],
      }),
    ).toThrow();
  });

  it('allows unchanged exact-official bootstrap entries but requires material canonical changes', () => {
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 2,
        releaseKind: 'canonical_bootstrap',
        changes: [{ ...change, after: change.before }],
      }),
    ).not.toThrow();
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 2,
        releaseKind: 'canonical_change',
        changes: [{ ...change, after: change.before }],
      }),
    ).toThrow();
  });

  it('accepts only the isolated TAU/BGU 2099 proof lane with fixture evidence', () => {
    const proof = {
      ...change,
      target: { institutionId: 'tau', programId: 'tau_cs', cycle: '2099' },
      sourceProofs: [{ ...change.sourceProofs[0], proofType: 'controlled_fixture' as const }],
    };
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 2,
        releaseKind: 'operational_proof',
        proofScenario: 'proof-plan001-20260820',
        changes: [proof],
      }),
    ).not.toThrow();
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 2,
        releaseKind: 'operational_proof',
        proofScenario: 'proof-plan001-20260820',
        changes: [{ ...proof, target: { ...proof.target, cycle: '2027' } }],
      }),
    ).toThrow();
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 2,
        releaseKind: 'operational_proof',
        changes: [proof],
      }),
    ).toThrow();
  });
});

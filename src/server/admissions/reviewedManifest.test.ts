import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  canonicalizeReviewedAdmissionsManifest,
  parseReviewedAdmissionsManifest,
} from './reviewedManifest';
import { bguQuantitativeProgramme } from './bguQuantitativeRoutesPolicy';
import currentManifest from '@/data/admissions/reviewedManifest.json';

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
  it('keeps the committed current manifest eligible', () => {
    expect(() => parseReviewedAdmissionsManifest(currentManifest)).not.toThrow();
  });
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

  it('rejects generated BGU and Technion cutoff text without decision evidence', () => {
    for (const [institutionId, programId, before, after] of [
      ['bgu', 'accounting', 620, 660],
      ['bgu', 'bgu_psychology', 650, 680],
      ['bgu', 'psychology', 650, 680],
      ['technion', 'technion_civil', 88, 87],
    ] as const) {
      expect(() =>
        parseReviewedAdmissionsManifest({
          version: 2,
          releaseKind: 'canonical_change',
          changes: [
            {
              ...change,
              target: { institutionId, programId, cycle: '2027' },
              before,
              after,
              sourceProofs: [
                { ...change.sourceProofs[0], excerpt: `Official admission cutoff: ${after}.` },
              ],
            },
          ],
        }),
      ).toThrow('Canonical cutoff needs matching main-route');
    }
  });

  it('rejects mismatched metric, cycle, source, and failed HTTP evidence', () => {
    const source = {
      ...change.sourceProofs[0],
      url: bguQuantitativeProgramme('accounting').sourceUrl,
    };
    const evidence = {
      value: 615,
      metric: 'quantitative_sekhem',
      route: 'main',
      cycle: '2027',
      programPath: 'dep142-pat1-spe6',
      registrationStatus: 'סגורה',
      prerequisites: 'psychometric minimum 615; mathematics and language conditions',
      sourceUrl: source.url,
      sourceStatus: 200,
      sourceExcerpt: 'סכם כמותי 615',
    };
    const valid = {
      version: 2,
      releaseKind: 'canonical_change',
      changes: [
        {
          ...change,
          target: { institutionId: 'bgu', programId: 'accounting', cycle: '2027' },
          before: 620,
          after: 615,
          sourceProofs: [{ ...source, cutoffEvidence: evidence }],
        },
      ],
    };
    expect(() => parseReviewedAdmissionsManifest(valid)).not.toThrow();
    for (const invalid of [
      { metric: 'psychometric' },
      { cycle: '2026' },
      { sourceUrl: 'https://example.com/calculator/' },
      { sourceStatus: 404 },
      { prerequisites: '' },
    ]) {
      const candidate = structuredClone(valid);
      Object.assign(candidate.changes[0].sourceProofs[0].cutoffEvidence, invalid);
      expect(() => parseReviewedAdmissionsManifest(candidate)).toThrow();
    }
  });
});

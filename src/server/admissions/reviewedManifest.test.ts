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
    },
  ],
};

describe('reviewed admissions manifest', () => {
  it('canonicalizes source-backed changes byte-stably', () => {
    const manifest = parseReviewedAdmissionsManifest({ version: 1, changes: [change] });
    expect(canonicalizeReviewedAdmissionsManifest(manifest)).toMatchInlineSnapshot(`
      "{"version":1,"changes":[{"target":{"institutionId":"tau","programId":"tau_cs","cycle":"2027"},"ruleKind":"admission_cutoff","before":706,"after":700,"effectiveFrom":"2026-08-01","sourceProofs":[{"sourceId":"tau-computer-science","digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","excerpt":"Current published admission cutoff: 700.","url":"https://go.tau.ac.il/he/exact/ba/computer"}]}]}"
    `);
  });

  it('rejects source-free, overlapping, or code-bearing candidates', () => {
    expect(() =>
      parseReviewedAdmissionsManifest({ version: 1, changes: [{ ...change, sourceProofs: [] }] }),
    ).toThrow();
    expect(() =>
      parseReviewedAdmissionsManifest({ version: 1, changes: [change, change] }),
    ).toThrow();
    expect(() =>
      parseReviewedAdmissionsManifest({
        version: 1,
        changes: [
          {
            ...change,
            sourceProofs: [{ ...change.sourceProofs[0], excerpt: '<script>alert(1)</script>' }],
          },
        ],
      }),
    ).toThrow();
  });
});

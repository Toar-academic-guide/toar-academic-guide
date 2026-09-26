import { describe, expect, it } from 'vitest';

import { validateGeneratedReviewFiles } from '../../../scripts/validate-admissions-review-pr.mjs';

describe('admissions review PR validation', () => {
  const required = [
    'src/data/admissions/reviewedManifest.json',
    'docs/admissions-review-runs/2026-W40.md',
    'docs/admissions-review-runs/2026-W40.json',
  ];

  it('accepts unchanged generated artifacts already tracked on the stable review branch', () => {
    expect(() =>
      validateGeneratedReviewFiles({ branch: required, staged: [], required }),
    ).not.toThrow();
  });

  it('still rejects missing or non-allowlisted generated artifacts', () => {
    expect(() =>
      validateGeneratedReviewFiles({
        branch: required.slice(0, 2),
        staged: [],
        required,
      }),
    ).toThrow('must stage or retain');
    expect(() =>
      validateGeneratedReviewFiles({
        branch: required,
        staged: ['src/server/admissions/evaluator.ts'],
        required,
      }),
    ).toThrow('non-allowlisted');
  });
});

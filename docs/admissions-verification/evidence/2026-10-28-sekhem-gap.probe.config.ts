import base from '../../../vitest.config';

// Deliberately red diagnostic contract; run explicitly, separate from regressions.
export default {
  ...base,
  test: {
    ...base.test,
    include: ['docs/admissions-verification/evidence/2026-10-28-sekhem-gap.probe.ts'],
  },
};

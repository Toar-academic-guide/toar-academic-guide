import base from '../../../vitest.config';

// Explicitly run blocked contracts; no regression test is skipped or weakened.
export default {
  ...base,
  test: {
    ...base.test,
    include: ['docs/admissions-verification/evidence/2026-10-29-rulings-ab.probe.ts'],
  },
};

import { describe, expect, it } from 'vitest';

import { admissionCycleFor, isAdmissionCycleCurrent, isAdmissionCycleExpired } from './cycle';

describe('admission alert cycle', () => {
  it('resets on October 1 in Asia/Jerusalem', () => {
    expect(admissionCycleFor(new Date('2026-09-30T20:59:59.000Z'))).toBe('2026');
    expect(admissionCycleFor(new Date('2026-09-30T21:00:00.000Z'))).toBe('2027');
  });

  it('excludes prior-cycle subscriptions even before the maintenance job marks them expired', () => {
    const now = new Date('2026-10-01T08:00:00.000Z');

    expect(isAdmissionCycleCurrent('2027', now)).toBe(true);
    expect(isAdmissionCycleExpired('2026', now)).toBe(true);
    expect(isAdmissionCycleExpired('2027', now)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { shouldRefreshAdmissionAlerts } from './profileRefresh';

const previous = {
  psychometricOverall: 680,
  psychometricQuantitative: 130,
  psychometricVerbal: 120,
  psychometricEnglish: 115,
  bagrutWeightedAverage: 108,
  bagrutProfileVersionId: 'profile-v1',
};

describe('alert profile refresh detection', () => {
  it('pauses monitoring when an academic input or structured Bagrut version changes', () => {
    expect(shouldRefreshAdmissionAlerts(previous, { ...previous, psychometricOverall: 690 })).toBe(
      true,
    );
    expect(
      shouldRefreshAdmissionAlerts(previous, { ...previous, bagrutProfileVersionId: 'profile-v2' }),
    ).toBe(true);
  });

  it('does not pause monitoring for unrelated account metadata updates', () => {
    expect(shouldRefreshAdmissionAlerts(previous, previous)).toBe(false);
  });
});

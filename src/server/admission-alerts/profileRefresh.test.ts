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

  it('refreshes for admissions input changes, including missing versus false or zero', () => {
    for (const admissionsInputs of [
      { tauBagrutAverage: 112.5 },
      { bguBagrutAverage: 110.25 },
      { haifaBagrutAverage: 102.25 },
      { haifaBagrutYear: 2015 },
      { haifaPsychometricYear: 2026 },
      { haifaPsychometricMonth: 4 },
      { haifaAdmissionQualification: 'full_bagrut' as const },
      { haifaEnglishLevel: 'advanced_a' as const },
      { haifaHebrewQualification: 'exam' as const },
      { haifaHebrewScore: 120 },
      { haifaHebrewExamDate: '2026-04-01' },
      { haifaScienceUnits: 0 },
      { haifaOtFailedSelectionAttempts: 0 },
      { haifaOtUnjustifiedAbsence: false },
      { tauApplicationRequirementsConfirmed: false },
      { bguLanguageRequirementsConfirmed: false },
      { tauMathPlacementScore: 0 },
      { bguPsychologyRoute: 'bagrut' as const },
      { bguPsychologyRequirementsConfirmed: false },
      { bguPreparatoryTrack: 'natural_life_sciences' as const },
      { bguPreparatoryAverage: 94.25 },
      { bguPreparatoryCompleted: false },
    ]) {
      expect(shouldRefreshAdmissionAlerts(previous, { ...previous, admissionsInputs })).toBe(true);
      expect(shouldRefreshAdmissionAlerts({ ...previous, admissionsInputs }, previous)).toBe(true);
      expect(
        shouldRefreshAdmissionAlerts(
          { ...previous, admissionsInputs },
          { ...previous, admissionsInputs: { ...admissionsInputs } },
        ),
      ).toBe(false);
    }
    expect(shouldRefreshAdmissionAlerts(previous, { ...previous, admissionsInputs: {} })).toBe(
      false,
    );
  });
});

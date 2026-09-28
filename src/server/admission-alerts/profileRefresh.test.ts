import { HUJI_MEDICINE_PROFILE_KEYS } from '@/lib/hujiMedicineInputs';
import { HUJI_MEDICINE_ELIGIBLE_INPUTS } from '@/data/admissions/hujiMedicineVerification';
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
  it('refreshes a saved Medicine calculation whenever a route fact changes or clears', () => {
    const admissionsInputs = {
      ...HUJI_MEDICINE_ELIGIBLE_INPUTS,
      hujiMedicinePreparatoryAverage: 110,
      hujiMedicinePreparatoryYear: 2021,
      hujiMedicinePreparatoryEligible: true,
      hujiMedicinePreparatoryConversionConfirmed: true,
      hujiMedicineCognitiveScore: 27.921,
      hujiMedicineHebrewScore: 0,
    };
    for (const key of HUJI_MEDICINE_PROFILE_KEYS) {
      expect(
        shouldRefreshAdmissionAlerts(
          { ...previous, admissionsInputs },
          { ...previous, admissionsInputs: { ...admissionsInputs, [key]: undefined } },
        ),
      ).toBe(true);
    }
    expect(
      shouldRefreshAdmissionAlerts(
        { ...previous, admissionsInputs },
        { ...previous, admissionsInputs: { ...admissionsInputs } },
      ),
    ).toBe(false);
  });
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

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
  it('refreshes when College of Management inputs change or clear', () => {
    const saved = {
      ...previous,
      admissionsInputs: { colmanBagrutAverage: 85, colmanBagrutCertificateConfirmed: true },
    };
    expect(
      shouldRefreshAdmissionAlerts(saved, {
        ...saved,
        admissionsInputs: { ...saved.admissionsInputs, colmanBagrutAverage: 84.99 },
      }),
    ).toBe(true);
    expect(
      shouldRefreshAdmissionAlerts(saved, {
        ...saved,
        admissionsInputs: { ...saved.admissionsInputs, colmanBagrutCertificateConfirmed: false },
      }),
    ).toBe(true);
    expect(shouldRefreshAdmissionAlerts(saved, { ...saved, admissionsInputs: {} })).toBe(true);
  });
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
      { bguQuantitativeRoute: 'bagrut' as const },
      { bguCertificateRequirementsConfirmed: false },
      { bguPriorAcademicStudies: false },
      { bguReturningOrChangingTrack: false },
      { bguApplicationPriority: 1 },
      { bguSecondTrackRequirementsConfirmed: false },
      { bguPreparatoryTrack: 'natural_life_sciences' as const },
      { bguPreparatoryAverage: 0 },
      { bguPreparatoryCompleted: false },
      { tauMathPlacementScore: 0 },
      { bguEngineering: { detailsConfirmed: true, physicsCoursePassed: false } },
      { bguPsychologyRoute: 'bagrut' as const },
      { bguPsychologyRequirementsConfirmed: false },
      { bguPreparatoryTrack: 'natural_life_sciences' as const },
      { bguPreparatoryAverage: 94.25 },
      { bguPreparatoryCompleted: false },
      { bguSocialScienceRoute: 'bagrut' as const },
      { bguSocialScienceRequirementsConfirmed: false },
      { bguSocialScienceLanguageConfirmed: false },
      { bguReturningFromStudyBreak: false },
      { bguSocialWorkAcademicBackground: 'none' as const },
      { bguSocialWorkAcademicAverage: 85.25 },
      { bguSocialWorkTranscriptProvided: false },
      { bguApplicantAge: 45 },
      { bguEducationSecondDepartment: 'art' as const },
      { bguEnglishClassificationMissing: false },
      { bguHebrewRequirementsConfirmed: false },
      { bguEducationEnglishConditionAcknowledged: false },
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

  it('refreshes when an engineering qualification changes within an existing input object', () => {
    const admissionsInputs = {
      bguEngineering: { detailsConfirmed: true, physicsCoursePassed: false },
    };
    expect(
      shouldRefreshAdmissionAlerts(
        { ...previous, admissionsInputs },
        {
          ...previous,
          admissionsInputs: {
            bguEngineering: { ...admissionsInputs.bguEngineering, physicsCoursePassed: true },
          },
        },
      ),
    ).toBe(true);
  });
});

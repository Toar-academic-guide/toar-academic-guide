import { describe, expect, it } from 'vitest';
import {
  hujiMedicineCognitiveScore,
  hujiMedicineFinalScore,
  resolveHujiMedicineAdmission,
} from './hujiMedicinePolicy';
import { HUJI_MEDICINE_ELIGIBLE_INPUTS as eligible } from '@/data/admissions/hujiMedicineVerification';
import type { HujiMedicineInputs } from '@/lib/hujiMedicineInputs';

describe('HUJI Medicine current official policy', () => {
  it.each([
    ['bagrut', 120, 800, 27.921],
    ['bagrut', 100, 700, 22.265],
    ['huji2021Onwards', 110, 800, 28.334],
    ['huji2021Onwards', 90, 700, 21.465],
    ['older', 110, 800, 28.603],
    ['older', 90, 700, 22.114],
  ] as const)('reproduces the native %s observation %s / %s', (route, average, psy, expected) => {
    expect(hujiMedicineCognitiveScore(average, psy, route)).toBe(expected);
  });
  it.each([
    [27.921, 200, 26.612],
    [25.5, 175, 25.209],
    [22.265, 200, 24.35],
  ])('reproduces final score %s / %s', (cognitive, assessment, expected) => {
    expect(hujiMedicineFinalScore(cognitive, assessment)).toBe(expected);
  });
  it('does not apply ordinary cutoffs when preferential status is unknown', () => {
    const screening = resolveHujiMedicineAdmission(700, {
      ...eligible,
      hujiBagrutAverage: 100,
      hujiMedicineAffirmativeAction: undefined,
    });
    const final = resolveHujiMedicineAdmission(800, {
      ...eligible,
      hujiMedicineRoute: 'official_cognitive',
      hujiMedicineCognitiveScore: 25.5,
      hujiMedicineAssessmentScore: 175,
      hujiMedicineAffirmativeAction: undefined,
    });
    for (const result of [screening, final]) {
      expect(result.status).toBe('needs_input');
      expect(result.missing).toContain('huji_medicine_affirmative_action');
      expect(result.decision).toBeUndefined();
    }
  });
  it('returns institutional eligibility, never acceptance', () => {
    expect(resolveHujiMedicineAdmission(800, eligible)).toMatchObject({
      status: 'decided',
      stage: 'final',
      score: 26.612,
      threshold: 25.783,
      decision: 'eligible_to_apply',
      missing: [],
    });
  });
  it('requires the official average and assessment, not a generic average', () => {
    const result = resolveHujiMedicineAdmission(800, {});
    expect(result.status).toBe('needs_input');
    expect(result.missing).toEqual(
      expect.arrayContaining(['huji_bagrut_average', 'huji_medicine_assessment_score']),
    );
    expect(result.score).toBeUndefined();
  });
  it('does not turn a passing screening score into final eligibility', () => {
    const result = resolveHujiMedicineAdmission(800, {
      ...eligible,
      hujiMedicineAssessmentScore: undefined,
    });
    expect(result).toMatchObject({
      status: 'needs_input',
      stage: 'screening',
      score: 27.921,
      threshold: 25.186,
      missing: ['huji_medicine_assessment_score'],
    });
    expect(result.decision).toBeUndefined();
  });
  it('does not require Bagrut for a recognized preparatory route', () => {
    expect(
      resolveHujiMedicineAdmission(800, {
        ...eligible,
        hujiBagrutAverage: undefined,
        hujiMedicineRoute: 'huji_preparatory',
        hujiMedicinePreparatoryAverage: 110,
        hujiMedicinePreparatoryYear: 2021,
        hujiMedicinePreparatoryEligible: true,
      }),
    ).toMatchObject({ status: 'decided', decision: 'eligible_to_apply', cognitiveScore: 28.334 });
  });
  it('supports an office-issued cognitive score without guessing academic conversions', () => {
    expect(
      resolveHujiMedicineAdmission(800, {
        ...eligible,
        hujiBagrutAverage: undefined,
        hujiMedicineRoute: 'official_cognitive',
        hujiMedicineCognitiveScore: 27.921,
      }),
    ).toMatchObject({ status: 'decided', score: 26.612 });
  });
  it.each([
    [{ hujiMedicineAffirmativeAction: 'eligible' }],
    [{ hujiMedicineAssessmentYear: 2023 }],
    [{ hujiMedicineRoute: 'other_preparatory', hujiMedicinePreparatoryYear: 2023 }],
    [{ hujiMedicineRoute: 'huji_preparatory', hujiMedicinePreparatoryYear: 2027 }],
    [{ hujiMedicinePriorStudyStatus: 'review_needed' }],
    [{ hujiMedicineRegistrationConfirmed: false }],
  ] as [Partial<HujiMedicineInputs>][])('keeps unresolved facts manual: %j', (patch) => {
    expect(resolveHujiMedicineAdmission(800, { ...eligible, ...patch }).status).toBe('manual');
  });
  it.each([
    [{ hujiMedicineAssessmentScore: 174 }],
    [{ hujiMedicineEnglishScore: 119 }],
    [{ hujiMedicineHebrewBasis: 'yael', hujiMedicineHebrewScore: 104 }],
    [{ hujiMedicineResidencyEligible: false }],
    [{ hujiMedicineQualificationConfirmed: false }],
    [{ hujiMedicinePsychometricDate: '2026-05-01' }],
  ] as [Partial<HujiMedicineInputs>][])('rejects a known unmet prerequisite: %j', (patch) => {
    expect(resolveHujiMedicineAdmission(800, { ...eligible, ...patch })).toMatchObject({
      status: 'decided',
      decision: 'below',
    });
  });
  it('accepts language and deadline boundaries', () => {
    expect(
      resolveHujiMedicineAdmission(800, {
        ...eligible,
        hujiMedicinePsychometricDate: '2026-04-30',
        hujiMedicineHebrewBasis: 'yael',
        hujiMedicineHebrewScore: 105,
      }).decision,
    ).toBe('eligible_to_apply');
  });
  it('reports missing psychometric explicitly and the minimum failure before unknown facts', () => {
    expect(resolveHujiMedicineAdmission(undefined).missing).toEqual(['psychometric_overall']);
    expect(resolveHujiMedicineAdmission(699)).toMatchObject({
      status: 'decided',
      decision: 'below',
      score: 699,
      threshold: 700,
      missing: [],
    });
  });
  it('distinguishes a screening failure from the final threshold', () => {
    expect(
      resolveHujiMedicineAdmission(700, { ...eligible, hujiBagrutAverage: 100 }),
    ).toMatchObject({ stage: 'screening', score: 22.265, threshold: 25.186, decision: 'below' });
    expect(
      resolveHujiMedicineAdmission(800, {
        ...eligible,
        hujiMedicineRoute: 'official_cognitive',
        hujiMedicineCognitiveScore: 25.5,
        hujiMedicineAssessmentScore: 175,
      }),
    ).toMatchObject({ stage: 'final', score: 25.209, threshold: 25.783, decision: 'below' });
  });
});

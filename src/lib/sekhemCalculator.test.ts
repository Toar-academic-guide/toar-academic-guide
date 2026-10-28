import { describe, expect, it } from 'vitest';
import { buildSekhemInput, calculatorOfferings, resultVerdict } from './sekhemCalculator';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from './catalogueStatic';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';
import {
  calculateTauBagrutAverage,
  calculateBguBagrutAverage,
} from '@/server/admissions/bagrutPolicies';

describe('public calculator ordinary input boundary', () => {
  const profile = {
    rows: [
      { label: 'מתמטיקה', units: 5 as const, grade: 90 },
      { label: 'אנגלית', units: 2 as const, grade: 0 },
    ],
    sector: 'יהודי',
    certificate: 'other' as const,
    psychometric: '700',
    verbal: '125',
    quantitative: '130',
    english: '120',
  };
  it('preserves raw zero grades without sending invalid legacy pairs or a composite', () => {
    const input = buildSekhemInput(profile);
    expect(input.psychometric).toBe(700);
    expect(input.extraInputs).toMatchObject({
      psychometricMath: 130,
      psychometricVerbal: 125,
      psychometricEnglish: 120,
      mathUnits: 5,
      mathGrade: 90,
      bagrutSubjectRecord: {
        schemaVersion: 2,
        certificateType: 'other',
        complete: true,
        subjects: expect.arrayContaining([
          { subjectId: 'english', units: 2, grade: 0, assessmentKind: 'exam' },
        ]),
      },
    });
    expect(input.extraInputs?.englishUnits).toBeUndefined();
    expect(input.extraInputs?.englishGrade).toBeUndefined();
    expect(JSON.stringify(input)).not.toMatch(
      /sekhem|mutam|composite|weightedScore|institution_weighted_score/i,
    );
  });
  it.each([
    { rows: [{ label: 'מתמטיקה', units: 5, grade: 101 }] },
    {
      rows: [
        { label: 'מתמטיקה', units: 5, grade: 90 },
        { label: 'מתמטיקה', units: 4, grade: 80 },
      ],
    },
    { psychometric: '199' },
    { quantitative: '151' },
    { psychometric: '700.5' },
    {
      rows: Array.from({ length: 65 }, (_, index) => ({
        label: `מקצוע ${index}`,
        units: 1,
        grade: 90,
      })),
    },
    {
      rows: [
        { label: 'פיזיקה', units: 5, grade: 90 },
        { label: 'פיסיקה', units: 4, grade: 85 },
      ],
    },
  ])('rejects invalid input without silently filtering rows: %j', (change) => {
    expect(() => buildSekhemInput({ ...profile, ...change })).toThrow();
  });
  it('selects real degree pairs, omits Ariel and deduplicates institution programmes', () => {
    const programs = getStaticCataloguePrograms();
    const offerings = calculatorOfferings(programs, getStaticCatalogueInstitutions());
    expect(offerings.length).toBeGreaterThan(30);
    expect(offerings.every((row) => row.institutionId !== 'ariel')).toBe(true);
    expect(
      offerings.every((row) => programs.find((p) => p.id === row.programId)?.type === 'academic'),
    ).toBe(true);
    expect(new Set(offerings.map((row) => `${row.institutionId}:${row.programId}`)).size).toBe(
      offerings.length,
    );
  });
  it('does not offer institution-wide placeholders as supported degrees', () => {
    const offerings = calculatorOfferings(
      getStaticCataloguePrograms(),
      getStaticCatalogueInstitutions(),
    );
    const placeholders = [
      'bgu_engineering',
      'biu_engineering',
      'biu_prep',
      'haifa_engineering',
      'reichman_engineering',
      'tau_engineering',
      'huji_engineering',
      'huji_prep',
      'technion_engineering',
      'hit_engineering',
      'afeka_engineering',
    ];
    expect(offerings.filter((row) => placeholders.includes(row.programId))).toEqual([]);
  });
  it('uses the raw API verdict even when a rounded score equals the threshold', () => {
    const row = {
      kind: 'exact',
      decision: 'below',
      score: 21.12,
      threshold: 21.12,
    } as AdmissionsEvaluationResult;
    expect(resultVerdict(row)).toBe('הציונים מתחת לסף');
  });
  it('lets existing institutional policies compute from entered certificate rows without a full-matriculation checkbox', () => {
    const input = buildSekhemInput({
      ...profile,
      certificate: 'internal',
      rows: [
        { label: 'מתמטיקה', units: 5, grade: 90 },
        { label: 'אנגלית', units: 5, grade: 85 },
        { label: 'פיזיקה', units: 5, grade: 80 },
        { label: 'מדעי המחשב', units: 5, grade: 95 },
        ...['אזרחות', 'היסטוריה', 'תנ״ך', 'ספרות', 'הבעה עברית'].map((label) => ({
          label,
          units: 2,
          grade: 85,
        })),
      ],
    });
    const record = input.extraInputs!.bagrutSubjectRecord!;
    expect(calculateTauBagrutAverage(record).state).toBe('calculated');
    expect(calculateBguBagrutAverage(record).state).toBe('calculated');
  });
});

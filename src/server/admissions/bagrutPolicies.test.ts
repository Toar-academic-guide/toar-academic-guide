import { describe, expect, it } from 'vitest';

import {
  BGU_COMPUTER_SCIENCE_ROUTE_POLICY,
  TAU_ENGINEERING_EXACT_SCIENCES_POLICY,
  calculateOptimizedBagrutAverage,
  classifyPsychometricEnglishScore,
  evaluateBagrutRecordReadiness,
  evaluateDirectAdmissionsTrack,
  evaluateTauEngineeringExactSciencesBonus,
} from './bagrutPolicies';

describe('TAU engineering and exact-sciences Bagrut policy', () => {
  it('awards the published bonus only when both qualifying five-unit subjects meet the grade floor', () => {
    expect(
      evaluateTauEngineeringExactSciencesBonus({
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 55 },
          { subjectId: 'physics', units: 5, grade: 55 },
        ],
      }),
    ).toEqual({ bonus: 10, qualifies: true, unmetRequirements: [] });
  });

  it('does not award a bonus when a required subject or its grade floor is missing', () => {
    expect(
      evaluateTauEngineeringExactSciencesBonus({
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 90 },
          { subjectId: 'physics', units: 5, grade: 54 },
        ],
      }),
    ).toEqual({
      bonus: 0,
      qualifies: false,
      unmetRequirements: ['physics_5_units_grade_55'],
    });
  });

  it('records reviewed provenance rather than treating a local shortcut as an official formula', () => {
    expect(TAU_ENGINEERING_EXACT_SCIENCES_POLICY).toMatchObject({
      version: 'tau-engineering-exact-sciences-2026-06-11',
      sourceUrl: 'https://go.tau.ac.il/he/engineering/ba/electrical',
      authority: 'official-published-requirement',
    });
    expect(BGU_COMPUTER_SCIENCE_ROUTE_POLICY).toMatchObject({
      enabled: false,
      authority: 'official-published-requirement',
    });
  });
});

describe('versioned admissions input policies', () => {
  it('classifies an English score only through an explicit institution policy', () => {
    expect(
      classifyPsychometricEnglishScore(121, {
        id: 'test-institution-english',
        version: '2027-test',
        sourceUrl: 'https://example.edu/english-levels',
        bands: [
          { level: 'advanced-b', minimum: 100, maximum: 119 },
          { level: 'advanced-a', minimum: 120, maximum: 133 },
          { level: 'exempt', minimum: 134, maximum: 150 },
        ],
      }),
    ).toEqual({
      state: 'classified',
      level: 'advanced-a',
      policyVersion: '2027-test',
    });
  });

  it('requires the raw English subscore instead of guessing a classification', () => {
    expect(
      classifyPsychometricEnglishScore(undefined, {
        id: 'test-institution-english',
        version: '2027-test',
        sourceUrl: 'https://example.edu/english-levels',
        bands: [{ level: 'exempt', minimum: 134, maximum: 150 }],
      }),
    ).toEqual({
      state: 'needs_input',
      missingInputs: ['psychometric_english'],
      policyVersion: '2027-test',
    });
  });

  it('evaluates a direct track with its own required input and threshold', () => {
    const policy = {
      id: 'test-direct-track',
      version: '2027-test',
      sourceUrl: 'https://example.edu/direct-track',
      input: 'psychometric_math' as const,
      minimum: 130,
    };

    expect(evaluateDirectAdmissionsTrack({ psychometricMath: 130 }, policy)).toMatchObject({
      state: 'eligible',
      actual: 130,
    });
    expect(evaluateDirectAdmissionsTrack({ psychometricMath: 129 }, policy)).toMatchObject({
      state: 'below',
      actual: 129,
    });
    expect(evaluateDirectAdmissionsTrack({}, policy)).toEqual({
      state: 'needs_input',
      missingInputs: ['psychometric_math'],
      policyVersion: '2027-test',
    });
  });

  it('optimizes a Bagrut average only according to an explicit versioned policy', () => {
    expect(
      calculateOptimizedBagrutAverage(
        {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [
            { subjectId: 'mathematics', units: 5, grade: 90 },
            { subjectId: 'english', units: 5, grade: 80 },
            { subjectId: 'art', units: 2, grade: 60 },
          ],
        },
        {
          id: 'test-optimized-bagrut',
          version: '2027-test',
          sourceUrl: 'https://example.edu/bagrut',
          recordSchemaVersion: 1,
          requiredSubjectIds: ['mathematics', 'english'],
          optionalSubjectIds: ['art'],
          subjectBonuses: [{ subjectId: 'mathematics', minimumUnits: 5, bonus: 10 }],
          dropOptionalSubjectsWhenAverageImproves: true,
        },
      ),
    ).toEqual({
      state: 'calculated',
      average: 90,
      includedSubjectIds: ['english', 'mathematics'],
      excludedSubjectIds: ['art'],
      policyVersion: '2027-test',
    });
  });

  it('returns needs_input when required units are missing or the profile schema version drifts', () => {
    const policy = {
      id: 'test-optimized-bagrut',
      version: '2027-test',
      sourceUrl: 'https://example.edu/bagrut',
      recordSchemaVersion: 1 as const,
      requiredSubjectIds: ['mathematics', 'physics'],
      optionalSubjectIds: [],
      subjectBonuses: [],
      dropOptionalSubjectsWhenAverageImproves: false,
    };

    expect(
      calculateOptimizedBagrutAverage(
        {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [{ subjectId: 'mathematics', units: 5, grade: 90 }],
        },
        policy,
      ),
    ).toEqual({
      state: 'needs_input',
      missingInputs: ['bagrut_subject:physics'],
      policyVersion: '2027-test',
    });

    expect(
      evaluateBagrutRecordReadiness(
        {
          schemaVersion: 2,
          sector: 'jewish',
          subjects: [],
        } as never,
        policy,
      ),
    ).toEqual({
      state: 'needs_input',
      missingInputs: ['bagrut_profile_version'],
      policyVersion: '2027-test',
    });
  });
});

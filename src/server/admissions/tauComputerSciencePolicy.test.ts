import { describe, expect, it } from 'vitest';
import { evaluateTauComputerScienceGates } from './tauComputerSciencePolicy';

const input = {
  psychometric: 730,
  extraInputs: {
    psychometricEnglish: 110,
    tauApplicationRequirementsConfirmed: true,
    bagrutSubjectRecord: {
      schemaVersion: 1 as const,
      sector: 'jewish' as const,
      subjects: [{ subjectId: 'mathematics', units: 5, grade: 85 }],
    },
  },
};

describe('TAU Computer Science standard admission gates', () => {
  it.each([90, undefined])(
    'allows confirmed English qualification through a separate exam (psychometric English %s)',
    (psychometricEnglish) => {
      expect(
        evaluateTauComputerScienceGates({
          ...input,
          extraInputs: { ...input.extraInputs, psychometricEnglish },
        }),
      ).toMatchObject({ requiredInputs: [], unmetRequirements: [] });
    },
  );

  it('does not infer application and language qualification from a high English score', () => {
    expect(
      evaluateTauComputerScienceGates({
        ...input,
        extraInputs: {
          ...input.extraInputs,
          psychometricEnglish: 150,
          tauApplicationRequirementsConfirmed: undefined,
        },
      }).requiredInputs,
    ).toEqual(['tau_application_requirements']);
  });

  it('accepts qualifying mathematics without inventing a physics bonus', () => {
    expect(evaluateTauComputerScienceGates(input)).toEqual({
      requiredInputs: [],
      unmetRequirements: [],
      exactSciencesBonusEligible: false,
    });
  });

  it.each([
    [5, 80],
    [4, 88],
  ])('accepts the direct %i-unit route at grade %i', (units, grade) => {
    expect(
      evaluateTauComputerScienceGates({
        ...input,
        extraInputs: {
          ...input.extraInputs,
          bagrutSubjectRecord: {
            ...input.extraInputs.bagrutSubjectRecord,
            subjects: [{ subjectId: 'mathematics', units, grade }],
          },
        },
      }).unmetRequirements,
    ).toEqual([]);
  });

  it.each([
    [5, 70],
    [4, 75],
  ])('requires the placement score for the %i-unit grade %i route', (units, grade) => {
    const extraInputs = {
      ...input.extraInputs,
      bagrutSubjectRecord: {
        ...input.extraInputs.bagrutSubjectRecord,
        subjects: [{ subjectId: 'mathematics', units, grade }],
      },
    };
    expect(evaluateTauComputerScienceGates({ ...input, extraInputs }).requiredInputs).toEqual([
      'tau_math_placement_score',
    ]);
    expect(
      evaluateTauComputerScienceGates({
        ...input,
        extraInputs: {
          ...extraInputs,
          tauMathPlacementScore: 75,
        },
      }).unmetRequirements,
    ).toEqual([]);
    expect(
      evaluateTauComputerScienceGates({
        ...input,
        extraInputs: {
          ...extraInputs,
          tauMathPlacementScore: 74,
        },
      }).unmetRequirements,
    ).toHaveLength(1);
  });

  it('keeps explicit false and zero as known failed gates', () => {
    const result = evaluateTauComputerScienceGates({
      ...input,
      psychometric: 659,
      extraInputs: {
        ...input.extraInputs,
        tauApplicationRequirementsConfirmed: false,
        bagrutSubjectRecord: {
          ...input.extraInputs.bagrutSubjectRecord,
          subjects: [{ subjectId: 'mathematics', units: 5, grade: 70 }],
        },
        tauMathPlacementScore: 0,
      },
    });
    expect(result.requiredInputs).toEqual([]);
    expect(result.unmetRequirements).toHaveLength(3);
  });

  it('requires a mathematics record and explicit application confirmation', () => {
    expect(
      evaluateTauComputerScienceGates({
        psychometric: 730,
        extraInputs: {
          psychometricEnglish: 110,
        },
      }).requiredInputs,
    ).toEqual(['bagrut_subject_record', 'tau_application_requirements']);
  });

  it('applies the ten-point bonus only for both five-unit subjects at grade 55', () => {
    expect(
      evaluateTauComputerScienceGates({
        ...input,
        extraInputs: {
          ...input.extraInputs,
          bagrutSubjectRecord: {
            ...input.extraInputs.bagrutSubjectRecord,
            subjects: [
              { subjectId: 'mathematics', units: 5, grade: 85 },
              { subjectId: 'physics', units: 5, grade: 55 },
            ],
          },
        },
      }).exactSciencesBonusEligible,
    ).toBe(true);
  });
});

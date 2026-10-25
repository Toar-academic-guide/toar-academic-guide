import { describe, expect, it } from 'vitest';
import type {
  AdmissionsEvaluationInput,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import {
  evaluateBraudePublishedRoutes,
  isBraudePublishedRoutePair,
} from './braudePublishedRoutesEvaluation';

const institution = { id: 'braude', name: 'בראודה', region: 'north' } as CatalogueInstitution;
const source = 'https://w3.braude.ac.il/intrested/';
function profile(degreeId = 'braude_cs'): AdmissionsEvaluationInput {
  return {
    degreeId,
    psychometric: 600,
    bagrut: 120,
    extraInputs: {
      psychometricMath: 115,
      psychometricEnglish: 100,
      bagrutSubjectRecord: {
        schemaVersion: 2,
        sector: 'jewish',
        certificateType: 'internal',
        complete: true,
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 80, assessmentKind: 'exam' },
          { subjectId: 'english', units: 5, grade: 80, assessmentKind: 'exam' },
          { subjectId: 'physics', units: 5, grade: 80, assessmentKind: 'exam' },
          { subjectId: 'history', units: 2, grade: 80, assessmentKind: 'exam' },
          { subjectId: 'literature', units: 2, grade: 80, assessmentKind: 'exam' },
          { subjectId: 'civics', units: 2, grade: 80, assessmentKind: 'exam' },
        ],
      },
    },
  };
}
function subject(input: AdmissionsEvaluationInput, id: string, units: number, grade: number) {
  const row = input.extraInputs!.bagrutSubjectRecord!.subjects.find((s) => s.subjectId === id)!;
  Object.assign(row, { units, grade });
}
const evaluate = (input: AdmissionsEvaluationInput) =>
  evaluateBraudePublishedRoutes({ input, institution })!;
function status(input: AdmissionsEvaluationInput, id: AdmissionsRequiredInput) {
  return evaluate(input).additionalConditions?.find((c) => c.id === id)?.status;
}
const departments = [
  // id, psych, quant, English section, raw average, math 4u/5u, English bagrut 4u/5u, physics
  ['braude_civil_eng', 580, undefined, 85, 70, 85, 75, 70, 60, 80],
  ['braude_biotech', 550, undefined, 85, 70, 80, 70, 70, 60, undefined],
  ['braude_ee', 550, 110, 90, 70, 80, 70, undefined, undefined, 60],
  ['braude_me', 550, undefined, 85, 70, 75, 65, undefined, undefined, undefined],
  ['braude_infosystems', 550, 110, 85, 70, 80, 70, 70, 60, undefined],
  ['braude_softwareeng', 550, 110, 85, 70, 80, 70, 70, 60, undefined],
  ['braude_industrial_eng', 550, undefined, undefined, 70, 80, 70, undefined, undefined, undefined],
  ['braude_cs', 600, 115, 85, 75, 80, 70, 75, 70, undefined],
  ['braude_ee_me', 550, 110, 100, 70, 80, 70, undefined, undefined, 70],
] as const;

describe('Braude published department floors', () => {
  it('a complete passing psychometric route wins even while its bonus alternative is unchecked', () => {
    const result = evaluate(profile('braude_biotech'));
    expect(result).toMatchObject({ decision: 'accepted', scoreAssessment: 'meets_threshold' });
    expect(result.additionalConditions?.every((c) => c.status === 'confirmed')).toBe(true);
  });
  it('weights the complete no-bonus average by units and ignores the generic average', () => {
    const input = profile();
    const grades = {
      mathematics: 70,
      english: 70,
      physics: 89,
      history: 70,
      literature: 70,
      civics: 75,
    };
    input.extraInputs!.bagrutSubjectRecord!.subjects.forEach((row) => {
      row.grade = grades[row.subjectId as keyof typeof grades];
    });
    input.bagrut = 120;
    expect(evaluate(input).decision).toBe('accepted'); // 1575 / 21 = 75; unweighted mean is 74.
    subject(input, 'physics', 5, 88);
    expect(evaluate(input).decision).toBe('below');
    expect(status(input, 'bagrut_average')).toBe('unmet');
  });

  for (const [id, psych, quant, english, average, math4, math5, en4, en5, physics] of departments) {
    describe(id, () => {
      for (const [field, threshold] of [
        ['psychometric_overall', psych],
        ['psychometric_math', quant],
        ['psychometric_english', english],
      ] as const) {
        if (threshold === undefined) continue;
        it.each([0, -1])(`${field} at threshold / one below (%i)`, (delta) => {
          const input = profile(id);
          // Keep CS below the stronger-math switch, so this checks the 600 floor.
          subject(input, 'mathematics', 5, 70);
          if (field === 'psychometric_overall') input.psychometric = threshold + delta;
          if (field === 'psychometric_math')
            input.extraInputs!.psychometricMath = threshold + delta;
          if (field === 'psychometric_english')
            input.extraInputs!.psychometricEnglish = threshold + delta;
          expect(status(input, field)).toBe(delta ? 'unmet' : 'confirmed');
          expect(evaluate(input).officialUrls).toContain(source);
        });
      }
      for (const [units, threshold] of [
        [4, math4],
        [5, math5],
      ]) {
        it.each([0, -1])(`math ${units}u inclusive floor ${threshold} (%i)`, (delta) => {
          const input = profile(id);
          subject(input, 'mathematics', units, threshold + delta);
          expect(status(input, 'math_grade')).toBe(delta ? 'unmet' : 'confirmed');
        });
      }
      if (en4 !== undefined && en5 !== undefined) {
        for (const [units, threshold] of [
          [4, en4],
          [5, en5],
        ]) {
          it.each([0, -1])(`English bagrut ${units}u inclusive ${threshold} (%i)`, (delta) => {
            const input = profile(id);
            subject(input, 'english', units, threshold + delta);
            expect(status(input, 'english_grade')).toBe(delta ? 'unmet' : 'confirmed');
          });
        }
      }
      if (physics !== undefined) {
        it.each([0, -1])(`physics 5u inclusive ${physics} (%i)`, (delta) => {
          const input = profile(id);
          subject(input, 'physics', 5, physics + delta);
          expect(status(input, 'physics_grade')).toBe(delta ? 'unmet' : 'confirmed');
        });
      }
      it.each([0, -1])(`raw weighted average inclusive ${average} (%i)`, (delta) => {
        const input = profile(id);
        // Same grade in every row isolates the weighted average from subject floors.
        input.extraInputs!.bagrutSubjectRecord!.subjects.forEach((s) => {
          s.grade = average + delta;
        });
        expect(status(input, 'bagrut_average')).toBe(delta ? 'unmet' : 'confirmed');
      });
      it('rejects three-unit math and does not replace missing math with another subject', () => {
        const input = profile(id);
        subject(input, 'mathematics', 3, 100);
        expect(status(input, 'math_grade')).toBe('unmet');
        input.extraInputs!.bagrutSubjectRecord!.subjects =
          input.extraInputs!.bagrutSubjectRecord!.subjects.filter(
            (s) => s.subjectId !== 'mathematics',
          );
        expect(status(input, 'math_grade')).toBe('unconfirmed');
      });
    });
  }

  it('precedence: all floors present and passing gives green without a full-bagrut confirmation gate', () => {
    const result = evaluate(profile());
    expect(result).toMatchObject({ decision: 'accepted', scoreAssessment: 'meets_threshold' });
    expect(result.additionalConditions?.every((c) => c.status === 'confirmed')).toBe(true);
    expect(result.explanation).toContain('תנאי הסף');
    expect(result.explanation).not.toMatch(/ועדה|ריאיון|תיק עבודות|אישור זכאות/);
  });
  it('precedence: a checkable floor miss plus a missing section gives below, naming the floor and source', () => {
    const input = profile();
    input.extraInputs!.psychometricMath = undefined;
    input.extraInputs!.psychometricEnglish = 84;
    const result = evaluate(input);
    expect(result.decision).toBe('below');
    expect(result.explanation).toMatch(/אנגלית.*85/);
    expect(result.officialUrls).toContain(source);
  });
  it.each([
    ['braude_ee', 110],
    ['braude_cs', 115],
  ] as const)(
    'precedence: %s missing quant section (%i) needs_input after bagrut and general psychometric pass',
    (id, threshold) => {
      const input = profile(id);
      input.extraInputs!.psychometricMath = undefined;
      const result = evaluate(input);
      expect(result).toMatchObject({ kind: 'needs_input', decision: 'unknown' });
      expect(result.requiredInputs).toContain('psychometric_math');
      expect(result.additionalConditions).toContainEqual(
        expect.objectContaining({
          id: 'psychometric_math',
          label: expect.stringContaining(String(threshold)),
          status: 'unconfirmed',
        }),
      );
      for (const field of [
        'bagrut_average',
        'psychometric_overall',
        'math_grade',
        'psychometric_english',
      ] as const) {
        expect(result.additionalConditions).toContainEqual(
          expect.objectContaining({ id: field, status: 'confirmed' }),
        );
      }
      expect(result.scoreAssessment).not.toBe('meets_threshold');
    },
  );
  it.each(['psychometricMath', 'psychometricEnglish'] as const)(
    'no miss plus missing %s needs input',
    (field) => {
      const input = profile();
      input.extraInputs![field] = undefined;
      expect(evaluate(input)).toMatchObject({
        kind: 'needs_input',
        decision: 'unknown',
        requiredInputs: [
          field === 'psychometricMath' ? 'psychometric_math' : 'psychometric_english',
        ],
      });
    },
  );
  it.each(['braude_civil_eng', 'braude_infosystems', 'braude_softwareeng'])(
    'precedence: %s composite remains needs_input when all other floors and section scores pass',
    (id) => {
      const input = profile(id);
      subject(input, 'mathematics', 5, 100);
      expect(evaluate(input)).toMatchObject({ kind: 'needs_input', decision: 'unknown' });
      expect(evaluate(input).additionalConditions).toContainEqual(
        expect.objectContaining({
          id: 'institution_weighted_score',
          status: 'unconfirmed',
          label: expect.stringMatching(/כמותי/),
        }),
      );
      expect(evaluate(input).requiredInputs).not.toContain('institution_weighted_score');
    },
  );
  it('a civil checkable miss beats its unavailable composite', () => {
    const input = profile('braude_civil_eng');
    subject(input, 'physics', 5, 79);
    expect(evaluate(input).decision).toBe('below');
  });
  it.each([
    [4, 85],
    [5, 75],
  ])('CS 580 switch at math %iu %i', (units, grade) => {
    const input = profile();
    subject(input, 'mathematics', units, grade);
    input.psychometric = 580;
    expect(evaluate(input).decision).toBe('accepted');
    input.psychometric = 579;
    expect(evaluate(input).decision).toBe('below');
    subject(input, 'mathematics', units, grade - 1);
    input.psychometric = 599;
    expect(evaluate(input).decision).toBe('below');
    input.psychometric = 600;
    expect(evaluate(input).decision).toBe('accepted');
  });
  it('missing math leaves the CS 580 alternative possible rather than below', () => {
    const input = profile();
    input.psychometric = 580;
    input.extraInputs!.bagrutSubjectRecord = undefined;
    expect(evaluate(input).kind).toBe('needs_input');
  });
  it('does not treat the generic bonus average as a raw average', () => {
    const input = profile();
    input.extraInputs!.bagrutSubjectRecord = undefined;
    Object.assign(input.extraInputs!, {
      mathUnits: 5,
      mathGrade: 80,
      englishUnits: 5,
      englishGrade: 80,
    });
    expect(evaluate(input).requiredInputs).toContain('bagrut_subject_record');
    expect(status(input, 'bagrut_average')).toBe('unconfirmed');
  });
  it.each([1, 2])('partial schema %i record cannot establish the raw average', (version) => {
    const input = profile();
    if (version === 2) {
      const record = input.extraInputs!.bagrutSubjectRecord!;
      if (record.schemaVersion === 2) record.complete = false;
    } else
      input.extraInputs!.bagrutSubjectRecord = {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: input.extraInputs!.bagrutSubjectRecord!.subjects,
      };
    expect(evaluate(input).kind).toBe('needs_input');
  });
  it('does not double-count combined assessments or projects in a raw average', () => {
    const input = profile();
    const record = input.extraInputs!.bagrutSubjectRecord!;
    if (record.schemaVersion === 2)
      record.subjects.push({
        subjectId: 'biology',
        units: 5,
        grade: 100,
        assessmentKind: 'combined',
      });
    expect(status(input, 'bagrut_average')).toBe('unconfirmed');
  });

  const bonus = [
    ['braude_biotech', 90],
    ['braude_ee', 95],
    ['braude_me', 95],
    ['braude_infosystems', 101],
    ['braude_softwareeng', 101],
    ['braude_industrial_eng', 101],
    ['braude_ee_me', 105],
  ] as const;
  it.each(bonus)(
    '%s bonus average %i remains unresolved, even with a high generic average',
    (id, threshold) => {
      for (const avg of [threshold - 1, threshold, threshold + 1, 125]) {
        const input = profile(id);
        input.psychometric = undefined;
        input.bagrut = avg;
        const result = evaluate(input);
        expect(result).toMatchObject({ kind: 'needs_input', decision: 'unknown' });
        expect(result.additionalConditions).toContainEqual(
          expect.objectContaining({
            label: expect.stringContaining(`${threshold}`),
            status: 'unconfirmed',
          }),
        );
      }
    },
  );
  it.each(['braude_civil_eng', 'braude_cs'])('%s has no bonus-only route', (id) => {
    const input = profile(id);
    input.psychometric = 100;
    expect(evaluate(input).decision).toBe('below');
    expect(
      evaluate(input).additionalConditions?.some((c) => c.label.includes('כולל בונוסים')),
    ).toBe(false);
  });
  it('does not ask for an already complete record to resolve a source gap', () => {
    const input = profile('braude_biotech');
    input.psychometric = 549;
    expect(evaluate(input).requiredInputs).toEqual([]);
  });
  it('a failed psychometric route plus an unresolved bonus route needs input', () => {
    const input = profile('braude_biotech');
    input.psychometric = 549;
    expect(evaluate(input).kind).toBe('needs_input');
    expect(status(input, 'psychometric_overall')).toBe('unmet');
  });
  it.each([60, 59])('extra advanced exam floor at %i', (grade) => {
    const input = profile('braude_biotech');
    subject(input, 'physics', 5, grade);
    expect(status(input, 'bagrut_subject_record')).toBe(grade === 60 ? 'confirmed' : 'unmet');
  });
  it('an incomplete record with no advanced subject is missing, not below', () => {
    const input = profile('braude_biotech');
    const record = input.extraInputs!.bagrutSubjectRecord!;
    record.subjects = record.subjects.filter((s) => s.subjectId !== 'physics');
    if (record.schemaVersion === 2) record.complete = false;
    expect(status(input, 'bagrut_subject_record')).toBe('unconfirmed');
  });
  it('known English floors absent from the research stay unchecked', () => {
    for (const id of ['braude_ee', 'braude_me', 'braude_industrial_eng', 'braude_ee_me']) {
      const result = evaluate(profile(id));
      expect(result.decision).not.toBe('accepted');
      expect(result.additionalConditions).toContainEqual(
        expect.objectContaining({ id: 'english_grade', status: 'unconfirmed' }),
      );
    }
  });
  it('resolves both institution aliases and the existing CS programme without renaming it', () => {
    for (const id of ['braude', 'ort_braude', 'mon_12220708942']) {
      expect(isBraudePublishedRoutePair('mon_12220708942_cs', id)).toBe(true);
      expect(
        evaluateBraudePublishedRoutes({
          input: profile('mon_12220708942_cs'),
          institution: { ...institution, id } as CatalogueInstitution,
        })?.linkedInstitutionId,
      ).toBe('braude');
    }
  });
  it.each(['braude_engineering', 'braude_prep', 'cs', 'unrelated'])(
    'does not assign engineering departments to %s',
    (id) => {
      expect(isBraudePublishedRoutePair(id, 'braude')).toBe(false);
      expect(evaluateBraudePublishedRoutes({ input: profile(id), institution })).toBeUndefined();
    },
  );
  it('does not apply Braude floors to another institution', () => {
    expect(isBraudePublishedRoutePair('braude_cs', 'afeka')).toBe(false);
    expect(
      evaluateBraudePublishedRoutes({
        input: profile(),
        institution: { ...institution, id: 'afeka' },
      }),
    ).toBeUndefined();
  });
});

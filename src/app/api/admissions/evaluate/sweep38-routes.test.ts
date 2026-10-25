import { describe, expect, it } from 'vitest';
import { evaluateAfekaPublishedRoutes } from '@/server/admissions/afekaPublishedRoutesEvaluation';
import { evaluateReichmanPublishedRoutes } from '@/server/admissions/reichmanPublishedRoutesEvaluation';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';

const engineering = {
  mathUnits: 5,
  mathGrade: 70,
  physicsUnits: 5,
  physicsGrade: 60,
  englishUnits: 5,
  englishGrade: 59,
  psychometricMath: 115,
};
const biomedical = (psychometric: number, extraInputs: AdmissionsExtraInputs = engineering) =>
  evaluateAfekaPublishedRoutes({
    institution: { id: 'afeka', name: 'אפקה', region: 'center' },
    input: { degreeId: 'afeka_biomedical', psychometric, extraInputs },
  });

describe('biomedical engineering function (dispatch fenced)', () => {
  it('uses engineering physics requirements even above 620', () => {
    const result = biomedical(620, { ...engineering, physicsGrade: 59 });
    expect(result.decision).toBe('below');
    expect(result.officialUrls).toEqual([
      'https://www.afeka.ac.il/candidate/candidate-information-bsc/undergraduates/',
    ]);
  });
  it.each([599, 600])('checks the psychometric boundary %s', (psychometric) => {
    expect(biomedical(psychometric).decision).toBe(psychometric === 600 ? 'accepted' : 'below');
  });
  it.each([114, 115])('checks the quantitative boundary %s', (psychometricMath) => {
    expect(biomedical(600, { ...engineering, psychometricMath }).decision).toBe(
      psychometricMath === 115 ? 'accepted' : 'below',
    );
  });
  it('requires a missing quantitative score', () => {
    expect(biomedical(600, { ...engineering, psychometricMath: undefined })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['psychometric_math'],
    });
  });
  it('requires missing physics rather than accepting a science-free route', () => {
    expect(biomedical(620, { ...engineering, physicsGrade: undefined })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['physics_grade'],
    });
  });
  it('does not replace physics with computer science on the Bagrut route', () => {
    expect(
      biomedical(400, {
        ...engineering,
        mathGrade: 75,
        englishGrade: 60,
        physicsGrade: 59,
        csUnits: 5,
        csGrade: 100,
      }).decision,
    ).toBe('below');
  });
  it.each([
    [4, 85, 4, 70],
    [5, 75, 5, 60],
  ])(
    'accepts inclusive Bagrut subject boundaries %s/%s and %s/%s',
    (mathUnits, mathGrade, englishUnits, englishGrade) => {
      expect(
        biomedical(400, { ...engineering, mathUnits, mathGrade, englishUnits, englishGrade })
          .decision,
      ).toBe('accepted');
    },
  );
});

it.each([
  'reichman_cs',
  'reichman_law',
  'reichman_business',
  'reichman_economics',
  'reichman_psychology',
])('%s labels the last published thresholds as estimated', (degreeId) => {
  const result = evaluateReichmanPublishedRoutes({
    institution: { id: 'reichman', name: 'רייכמן', region: 'center' },
    input: {
      degreeId,
      bagrut: 110,
      psychometric: 740,
      extraInputs: {
        mathUnits: 5,
        mathGrade: 90,
        englishUnits: 5,
        englishGrade: 95,
        psychometricMath: 125,
      },
    },
  });
  expect(result).toMatchObject({
    kind: 'estimated',
    confidence: 'medium',
    sourceLabel: 'הערכה לפי הציונים',
  });
  expect(result).not.toHaveProperty('estimated');
  expect(result).not.toHaveProperty('estimationReason');
});

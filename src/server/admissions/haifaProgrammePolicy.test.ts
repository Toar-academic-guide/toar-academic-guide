import { describe, expect, it } from 'vitest';
import { HAIFA_PROGRAM_ALIASES } from '@/lib/haifaAdmissionsInputs';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import { evaluateHaifaProgrammePolicy } from './haifaProgrammePolicy';

const now = new Date('2026-09-28T09:00:00Z');
const applicant: AdmissionsEvaluationInput = {
  degreeId: 'haifa_cs',
  psychometric: 800,
  extraInputs: {
    haifaAdmissionQualification: 'full_bagrut',
    haifaPsychometricYear: 2026,
    haifaPsychometricMonth: 4,
    psychometricEnglish: 150,
    haifaHebrewQualification: 'hebrew_school',
    haifaScienceUnits: 8,
    haifaOtFailedSelectionAttempts: 0,
    haifaOtUnjustifiedAbsence: false,
    mathUnits: 5,
    mathGrade: 100,
  },
};
function evaluate(programId: string, score = 850, extra = {}) {
  return evaluateHaifaProgrammePolicy({
    programId,
    score,
    input: { ...applicant, extraInputs: { ...applicant.extraInputs, ...extra } },
    now,
  });
}

describe('current Haifa programme requirements', () => {
  it.each(HAIFA_PROGRAM_ALIASES.flat())('checks the primary route for %s', (programId) => {
    expect(evaluate(programId).kind).toBe(
      programId === 'haifa_infosystems' ? 'unavailable' : 'eligible',
    );
    if (programId !== 'haifa_infosystems') {
      expect(
        evaluateHaifaProgrammePolicy({
          programId,
          score: 400,
          input: { ...applicant, psychometric: 500 },
          now,
        }).kind,
      ).toBe('below');
      expect(evaluate(programId, 850, { haifaAdmissionQualification: undefined })).toMatchObject({
        kind: 'needs_input',
        requiredInputs: expect.arrayContaining(['haifa_admission_qualification']),
      });
      expect(evaluate(programId, 850, { haifaAdmissionQualification: 'none' }).kind).toBe('below');
    }
  });
  it.each([
    ['haifa_biology', 3, 89, 'below'],
    ['haifa_biology', 3, 90, 'eligible'],
    ['haifa_cs', 4, 89, 'below'],
    ['haifa_cs', 4, 90, 'eligible'],
    ['haifa_cs', 5, 74, 'below'],
    ['haifa_cs', 5, 75, 'eligible'],
    ['haifa_statistics', 5, 74, 'below'],
    ['haifa_statistics', 4, 75, 'eligible'],
    ['haifa_physiotherapy', 4, 54, 'below'],
    ['haifa_physiotherapy', 4, 55, 'eligible'],
  ] as const)('%s maths %i/%i produces %s', (id, units, grade, kind) => {
    expect(evaluate(id, 850, { mathUnits: units, mathGrade: grade }).kind).toBe(kind);
  });
  it('uses current classification independently of the original psychometric English component', () => {
    expect(evaluate('haifa_law', 850, { psychometricEnglish: 99 }).kind).toBe('below');
    expect(
      evaluate('haifa_law', 850, { psychometricEnglish: 99, haifaEnglishLevel: 'advanced_a' }).kind,
    ).toBe('eligible');
    expect(evaluate('haifa_sociology', 850, { psychometricEnglish: 50 }).kind).toBe('eligible');
  });
  it('uses 120 for current CS Hebrew and allows the documented Sociology conditional route', () => {
    const exam = { haifaHebrewQualification: 'exam', haifaHebrewExamDate: '2026-04-01' };
    expect(evaluate('haifa_cs', 850, { ...exam, haifaHebrewScore: 119 }).kind).toBe('below');
    expect(evaluate('haifa_cs', 850, { ...exam, haifaHebrewScore: 120 }).kind).toBe('eligible');
    expect(evaluate('haifa_sociology', 850, { ...exam, haifaHebrewScore: 110 })).toMatchObject({
      kind: 'eligible',
      conditional: true,
    });
    expect(evaluate('haifa_economics', 850, { ...exam, haifaHebrewScore: 110 }).kind).toBe('below');
  });
  it('requires actual Hebrew evidence and respects exam validity and exemptions', () => {
    expect(evaluate('haifa_cs', 850, { haifaHebrewQualification: undefined }).kind).toBe(
      'needs_input',
    );
    expect(
      evaluate('haifa_cs', 850, { haifaHebrewQualification: 'exam', haifaHebrewScore: 150 }).kind,
    ).toBe('needs_input');
    expect(
      evaluate('haifa_cs', 850, {
        haifaHebrewQualification: 'exam',
        haifaHebrewScore: 150,
        haifaHebrewExamDate: '2016-09-27',
      }).kind,
    ).toBe('below');
    expect(
      evaluate('haifa_cs', 850, {
        haifaHebrewQualification: 'exam',
        haifaHebrewScore: 150,
        haifaHebrewExamDate: '2016-09-28',
      }).kind,
    ).toBe('eligible');
    expect(evaluate('haifa_cs', 850, { haifaHebrewQualification: 'degree_course' }).kind).toBe(
      'eligible',
    );
  });
  it('recognizes Haifa placement without extending the Yael-only expiry rule', () => {
    const exam = {
      haifaHebrewQualification: 'university_exam',
      haifaHebrewScore: 120,
      haifaHebrewExamDate: '2016-09-27',
    };
    expect(evaluate('haifa_cs', 850, exam).kind).toBe('eligible');
    expect(evaluate('haifa_cs', 850, { ...exam, haifaHebrewScore: 119 }).kind).toBe('below');
    expect(evaluate('haifa_cs', 850, { ...exam, haifaHebrewExamDate: undefined }).kind).toBe(
      'needs_input',
    );
    expect(evaluate('haifa_cs', 850, { ...exam, haifaHebrewExamDate: '2026-09-29' }).kind).toBe(
      'below',
    );
    expect(
      evaluate('occupational_therapy', 850, { ...exam, haifaHebrewExamDate: '2026-07-01' }).kind,
    ).toBe('below');
  });
  it('does not infer Nursing science units or psychometric minimum from a high score', () => {
    expect(evaluate('haifa_nursing', 850, { haifaScienceUnits: undefined }).kind).toBe(
      'needs_input',
    );
    expect(evaluate('haifa_nursing', 850, { haifaScienceUnits: 7 }).kind).toBe('below');
    expect(
      evaluateHaifaProgrammePolicy({
        programId: 'haifa_nursing',
        score: 850,
        input: { ...applicant, psychometric: 549 },
        now,
      }).kind,
    ).toBe('below');
  });
  it('checks programme-specific exam sessions and OT selection restrictions', () => {
    expect(evaluate('occupational_therapy', 850, { haifaPsychometricMonth: undefined }).kind).toBe(
      'needs_input',
    );
    expect(evaluate('occupational_therapy', 850, { haifaPsychometricMonth: 7 }).kind).toBe('below');
    expect(evaluate('haifa_biology', 850, { haifaPsychometricMonth: 7 }).kind).toBe('eligible');
    expect(evaluate('occupational_therapy', 850, { haifaOtFailedSelectionAttempts: 2 }).kind).toBe(
      'below',
    );
    expect(evaluate('occupational_therapy', 850, { haifaOtUnjustifiedAbsence: true }).kind).toBe(
      'below',
    );
    expect(
      evaluate('occupational_therapy', 850, {
        haifaHebrewQualification: 'exam',
        haifaHebrewScore: 150,
        haifaHebrewExamDate: '2026-07-01',
      }).kind,
    ).toBe('below');
  });
  it('uses published waiting boundaries and describes alternative selection routes accurately', () => {
    expect(evaluate('haifa_sociology', 520).kind).toBe('pending');
    expect(evaluate('haifa_sociology', 519).kind).toBe('below');
    expect(evaluate('haifa_physiotherapy', 630).kind).toBe('pending');
    expect(evaluate('occupational_therapy', 595).kind).toBe('pending');
    expect(evaluate('haifa_socialwork', 580).kind).toBe('eligible');
    expect(evaluate('haifa_communication', 500)).toMatchObject({ kind: 'eligible', route: 'ofek' });
    expect(evaluate('haifa_law', 600)).toMatchObject({ kind: 'eligible', route: 'suitability' });
    expect(evaluate('haifa_law', 400)).toMatchObject({ kind: 'eligible', route: 'suitability' });
  });
});

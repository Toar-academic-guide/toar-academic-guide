import { expect, it } from 'vitest';
import { calculatorProfile, editedAcademicScores, profileInputsChanged } from './sekhemProfile';
import { buildSekhemInput } from './sekhemCalculator';
import type { AcademicScores } from '@/types';

it('round-trips zero grades and distinct assessments for the same subject', () => {
  const scores: AcademicScores = {
    psychometric: { overall: 650 },
    bagrut: {
      weightedAverage: 102,
      subjectRecord: {
        schemaVersion: 2,
        complete: true,
        certificateType: 'internal',
        sector: 'druze',
        subjects: [
          { subjectId: 'physics', units: 5, grade: 0, assessmentKind: 'exam' },
          { subjectId: 'physics', units: 5, grade: 90, assessmentKind: 'final_project' },
        ],
      },
    },
  };
  const form = calculatorProfile(scores);
  expect(profileInputsChanged(form, calculatorProfile(scores))).toBe(false);
  expect(buildSekhemInput(form).extraInputs?.bagrutSubjectRecord).toMatchObject(
    scores.bagrut!.subjectRecord!,
  );
  form.rows[1].grade = 95;
  const saved = editedAcademicScores(scores, form);
  expect(saved.bagrut?.subjectRecord?.subjects.map((s) => s.grade)).toEqual([0, 95]);
  expect(saved.bagrut?.weightedAverage).toBe(102);
  expect(profileInputsChanged(form, calculatorProfile(saved))).toBe(false);
  form.rows[0].grade = '';
  expect(() => editedAcademicScores(saved, form)).toThrow();
});

it('keeps a legacy subject record intact when only the psychometric score changes', () => {
  const scores: AcademicScores = {
    bagrut: {
      subjectRecord: {
        schemaVersion: 1,
        sector: 'arab',
        subjects: [{ subjectId: 'mathematics', units: 4, grade: 88 }],
      },
    },
  };
  const form = calculatorProfile(scores);
  expect(form.rows[0]).toMatchObject({
    label: 'מתמטיקה',
    units: 4,
    grade: 88,
    assessmentKind: 'exam',
  });
  form.psychometric = '700';
  expect(editedAcademicScores(scores, form)).toEqual({ ...scores, psychometric: { overall: 700 } });
});

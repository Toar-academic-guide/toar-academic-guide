import { describe, expect, it } from 'vitest';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import { bguIndustrialBonusSubject, resolveBguEngineeringInputs } from './bguEngineeringPolicy';

function input(): AdmissionsEvaluationInput {
  return {
    degreeId: 'bgu_ee',
    psychometric: 800,
    bagrut: 120,
    extraInputs: {
      bguBagrutAverage: 120,
      psychometricMath: 150,
      bguLanguageRequirementsConfirmed: true,
      bguEngineering: { detailsConfirmed: true },
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 95 },
          { subjectId: 'physics', units: 5, grade: 95 },
        ],
      },
    },
  };
}
const now = new Date('2026-09-27T00:00:00Z');

describe('current BGU engineering input and route rules', () => {
  it.each(['ee', 'bgu_ee', 'me', 'bgu_me', 'bgu_industrial'] as const)(
    'uses engineering input fields for %s',
    (id) => {
      const resolution = resolveBguEngineeringInputs(id, input(), now);
      expect(resolution.kind).toBe(id === 'bgu_industrial' ? 'direct' : 'score');
      if (resolution.kind === 'score') {
        expect(resolution.parameters.get('on_grade_classi_quant')).toBe('150');
        expect(resolution.parameters.get('on_learning_units_bag_math')).toBe('5');
        expect(resolution.parameters.get('on_grade_bag_phy')).toBe('95');
      }
    },
  );
  it.each([
    ['bgu_ee', 599, 'below'],
    ['bgu_ee', 600, 'score'],
    ['bgu_me', 549, 'below'],
    ['bgu_me', 550, 'score'],
  ] as const)('enforces %s total %s boundary', (id, total, kind) => {
    const value = input();
    value.psychometric = total;
    expect(resolveBguEngineeringInputs(id, value, now).kind).toBe(kind);
  });
  it('requires explicit confirmation that all applicable engineering data is present', () => {
    const value = input();
    delete value.extraInputs!.bguEngineering;
    expect(resolveBguEngineeringInputs('bgu_ee', value, now)).toEqual({
      kind: 'needs_input',
      requiredInputs: ['bgu_engineering_details'],
    });
  });
  it('does not use the generic profile average as the official BGU average', () => {
    const value = input();
    delete value.extraInputs!.bguBagrutAverage;
    expect(resolveBguEngineeringInputs('bgu_me', value, now)).toEqual({
      kind: 'needs_input',
      requiredInputs: ['bgu_bagrut_average'],
    });
  });
  it('requires quantitative scores and a mathematics record', () => {
    const value = input();
    delete value.extraInputs!.psychometricMath;
    expect(resolveBguEngineeringInputs('bgu_me', value, now)).toEqual({
      kind: 'needs_input',
      requiredInputs: ['psychometric_math'],
    });
    value.extraInputs!.psychometricMath = 150;
    delete value.extraInputs!.bagrutSubjectRecord;
    expect(resolveBguEngineeringInputs('bgu_me', value, now)).toEqual({
      kind: 'needs_input',
      requiredInputs: ['bagrut_subject_record'],
    });
  });
  it('retains the completion-of-physics condition and the Electrical July rule', () => {
    const value = input();
    value.extraInputs!.bagrutSubjectRecord!.subjects.pop();
    expect(resolveBguEngineeringInputs('bgu_ee', value, now)).toEqual({
      kind: 'needs_input',
      requiredInputs: ['bgu_engineering_physics_course'],
    });
    value.extraInputs!.bguEngineering!.physicsCoursePassed = false;
    expect(resolveBguEngineeringInputs('bgu_ee', value, now).kind).toBe('below');
    expect(resolveBguEngineeringInputs('bgu_ee', value, new Date('2026-06-01')).kind).toBe('score');
    expect(resolveBguEngineeringInputs('bgu_me', value, now)).toMatchObject({
      kind: 'score',
      physicsConditionOutstanding: true,
    });
    value.extraInputs!.bguEngineering!.physicsCoursePassed = true;
    expect(resolveBguEngineeringInputs('bgu_ee', value, now)).toMatchObject({
      kind: 'score',
      physicsConditionOutstanding: false,
    });
  });
  it('supports the Industrial direct route without inventing a psychometric score', () => {
    const value = input();
    delete value.psychometric;
    value.extraInputs!.bguBagrutAverage = 109;
    expect(resolveBguEngineeringInputs('bgu_industrial', value, now)).toEqual({
      kind: 'direct',
      average: 109,
      threshold: 109,
      basis: 'bagrut',
    });
    value.extraInputs!.bguBagrutAverage = 108.99;
    expect(resolveBguEngineeringInputs('bgu_industrial', value, now)).toEqual({
      kind: 'needs_input',
      requiredInputs: ['psychometric_overall'],
    });
  });
  it('keeps both five-unit 90 subject requirements on the Industrial direct route', () => {
    const value = input();
    delete value.psychometric;
    value.extraInputs!.bagrutSubjectRecord!.subjects[0].grade = 89;
    expect(resolveBguEngineeringInputs('bgu_industrial', value, now).kind).toBe('needs_input');
  });
  it('supports only the BGU preparatory-average substitution for the Industrial direct route', () => {
    const value = input();
    delete value.psychometric;
    value.extraInputs!.bguBagrutAverage = 100;
    value.extraInputs!.bguEngineering = {
      detailsConfirmed: true,
      preparatoryInstitution: 'bgu',
      preparatoryCompletionYear: 2026,
      industrialPreparatoryAverage: 91,
    };
    expect(resolveBguEngineeringInputs('bgu_industrial', value, now)).toEqual({
      kind: 'direct',
      average: 91,
      threshold: 91,
      basis: 'preparatory',
    });
    value.extraInputs!.bguEngineering.preparatoryInstitution = 'technion';
    expect(resolveBguEngineeringInputs('bgu_industrial', value, now).kind).toBe('needs_input');
  });
  it('sends recognized preparatory grades independently of the Bagrut grades', () => {
    const value = input();
    Object.assign(value.extraInputs!.bguEngineering!, {
      preparatoryInstitution: 'technion',
      preparatoryCompletionYear: 2026,
      preparatoryMathUnits: 5,
      preparatoryMathGrade: 100,
      preparatoryPhysicsUnits: 5,
      preparatoryPhysicsGrade: 100,
    });
    const resolution = resolveBguEngineeringInputs('bgu_ee', value, now);
    expect(resolution.kind).toBe('score');
    if (resolution.kind === 'score') {
      expect(resolution.parameters.get('on_grade_bag_math')).toBe('95');
      expect(resolution.parameters.get('on_grade_mech_math')).toBe('100');
      expect(resolution.parameters.get('on_grade_mech_phy')).toBe('100');
    }
  });
  it('supports the independently captured preparatory-only calculator route', () => {
    const value = input();
    delete value.extraInputs!.bagrutSubjectRecord;
    delete value.extraInputs!.bguBagrutAverage;
    value.extraInputs!.bguEngineering = {
      detailsConfirmed: true,
      preparatoryInstitution: 'bgu',
      preparatoryCompletionYear: 2026,
      preparatoryMathUnits: 5,
      preparatoryMathGrade: 100,
      preparatoryPhysicsUnits: 5,
      preparatoryPhysicsGrade: 100,
    };
    const resolution = resolveBguEngineeringInputs('bgu_ee', value, now);
    expect(resolution.kind).toBe('score');
    if (resolution.kind === 'score') {
      expect(resolution.parameters.get('on_grade_bag_math')).toBe('');
      expect(resolution.parameters.get('on_bag_avg')).toBe('');
    }
  });
  it.each([60, 89, 90])(
    'converts recognized diploma mathematics hours %s using the published unit equivalence',
    (hours) => {
      const value = input();
      value.extraInputs!.bguEngineering = {
        detailsConfirmed: true,
        diplomaRecognized: true,
        diplomaMathHours: hours,
        diplomaMathGrade: 100,
      };
      const resolution = resolveBguEngineeringInputs('bgu_ee', value, now);
      expect(resolution.kind).toBe('score');
      if (resolution.kind === 'score')
        expect(resolution.parameters.get('on_learning_units_eng_math')).toBe(
          hours < 90 ? '4' : '5',
        );
    },
  );
  it('does not replay incomplete or unrecognized preparatory/diploma grade pairs', () => {
    const value = input();
    value.extraInputs!.bguEngineering!.preparatoryMathUnits = 5;
    expect(resolveBguEngineeringInputs('bgu_me', value, now).kind).toBe('needs_input');
    value.extraInputs!.bguEngineering = {
      detailsConfirmed: true,
      diplomaMathHours: 90,
      diplomaMathGrade: 100,
    };
    expect(resolveBguEngineeringInputs('bgu_me', value, now).kind).toBe('needs_input');
  });
  it('chooses one highest eligible bonus and retains unmapped Hebrew subject names', () => {
    const subjectId = `subject_${Array.from('מכטרוניקה', (character) => character.codePointAt(0)!.toString(16)).join('_')}`;
    expect(
      bguIndustrialBonusSubject([
        { subjectId: 'chemistry', units: 5, grade: 85 },
        { subjectId: 'computer_science', units: 5, grade: 90 },
        { subjectId, units: 5, grade: 96 },
        { subjectId: 'biology', units: 4, grade: 100 },
      ]),
    ).toMatchObject({ code: '438', grade: 96 });
  });
  it('requires completed qualifications and whole recorded diploma hours', () => {
    const value = input();
    value.extraInputs!.bguEngineering = {
      detailsConfirmed: true,
      preparatoryInstitution: 'bgu',
      preparatoryCompletionYear: 2027,
      preparatoryMathUnits: 5,
      preparatoryMathGrade: 95,
    };
    expect(resolveBguEngineeringInputs('bgu_ee', value, now).kind).toBe('needs_input');
    value.extraInputs!.bguEngineering = {
      detailsConfirmed: true,
      diplomaRecognized: true,
      diplomaMathHours: 89.5,
      diplomaMathGrade: 95,
    };
    expect(resolveBguEngineeringInputs('bgu_ee', value, now).kind).toBe('needs_input');
  });
});

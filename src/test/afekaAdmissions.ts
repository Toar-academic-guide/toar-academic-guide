import type {
  AdmissionsEvaluationInput,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

export const AFEKA_EVALUATOR_IDS = ['afeka_ee', 'afeka_softwareeng', 'afeka_cs'] as const;
export type AfekaCase = {
  name: string;
  input: Omit<AdmissionsEvaluationInput, 'degreeId'>;
  decision: 'accepted' | 'below' | 'unknown';
  missing?: AdmissionsRequiredInput[];
};

// Low, fully supplied alternatives isolate the route under test.
const weakSubjects = {
  mathUnits: 3,
  mathGrade: 50,
  englishUnits: 3,
  englishGrade: 50,
  physicsUnits: 3,
  physicsGrade: 50,
  csUnits: 3,
  csGrade: 50,
  psychometricMath: 100,
};
const bagrut = {
  ...weakSubjects,
  mathUnits: 5,
  mathGrade: 75,
  englishUnits: 5,
  englishGrade: 60,
  physicsUnits: 5,
  physicsGrade: 60,
};
const psych = {
  ...weakSubjects,
  mathUnits: 5,
  mathGrade: 70,
  physicsUnits: 5,
  physicsGrade: 60,
  psychometricMath: 115,
};

export function afekaCases(degreeId: string): AfekaCase[] {
  const science = degreeId !== 'afeka_ee';
  const cases: AfekaCase[] = [
    {
      name: 'strong Bagrut without overall scores',
      input: { extraInputs: { ...bagrut, mathGrade: 95 } },
      decision: 'accepted',
    },
    {
      name: 'psych only despite failing Bagrut English',
      input: { psychometric: 600, extraInputs: psych },
      decision: 'accepted',
    },
    {
      name: 'weak fully decidable',
      input: { psychometric: 400, bagrut: 70, extraInputs: weakSubjects },
      decision: 'below',
    },
    {
      name: 'failed psych and undecidable Bagrut physics grade',
      input: { psychometric: 400, extraInputs: { ...bagrut, physicsGrade: undefined } },
      decision: 'unknown',
      missing: ['physics_grade'],
    },
    {
      name: 'failed Bagrut and undecidable quantitative',
      input: { psychometric: 600, extraInputs: { ...psych, psychometricMath: undefined } },
      decision: 'unknown',
      missing: ['psychometric_math'],
    },
    {
      name: 'missing physics units',
      input: { psychometric: 400, extraInputs: { ...bagrut, physicsUnits: undefined } },
      decision: 'unknown',
      missing: ['physics_units'],
    },
    {
      name: 'missing math units',
      input: { psychometric: 400, extraInputs: { ...bagrut, mathUnits: undefined } },
      decision: 'unknown',
      missing: ['math_units'],
    },
    {
      name: 'missing English grade',
      input: { psychometric: 400, extraInputs: { ...bagrut, englishGrade: undefined } },
      decision: 'unknown',
      missing: ['english_grade'],
    },
    {
      name: 'known failed maths rules out all routes despite other missing fields',
      input: { extraInputs: { mathUnits: 3, mathGrade: 50 } },
      decision: 'below',
    },
  ];
  for (const [field, unitsField, units, floor] of [
    ['mathGrade', 'mathUnits', 4, 85],
    ['mathGrade', 'mathUnits', 5, 75],
    ['englishGrade', 'englishUnits', 4, 70],
    ['englishGrade', 'englishUnits', 5, 60],
    ['physicsGrade', 'physicsUnits', 5, 60],
  ] as const) {
    for (const delta of [-1, 0, 1])
      cases.push({
        name: `Bagrut ${unitsField}=${units} ${field}=${floor + delta}`,
        input: {
          psychometric: 400,
          extraInputs: { ...bagrut, [unitsField]: units, [field]: floor + delta },
        },
        decision: delta < 0 ? 'below' : 'accepted',
      });
  }
  for (const [units, floor] of [
    [4, 80],
    [5, 70],
  ] as const) {
    for (const delta of [-1, 0, 1])
      cases.push({
        name: `psych math ${units}@${floor + delta}`,
        input: {
          psychometric: 600,
          extraInputs: { ...psych, mathUnits: units, mathGrade: floor + delta },
        },
        decision: delta < 0 ? 'below' : 'accepted',
      });
  }
  for (const delta of [-1, 0, 1]) {
    cases.push({
      name: `psych ${600 + delta}`,
      input: { psychometric: 600 + delta, extraInputs: psych },
      decision: delta < 0 ? 'below' : 'accepted',
    });
    cases.push({
      name: `quant ${115 + delta}`,
      input: { psychometric: 600, extraInputs: { ...psych, psychometricMath: 115 + delta } },
      decision: delta < 0 ? 'below' : 'accepted',
    });
    cases.push({
      name: `psych physics ${60 + delta}`,
      input: { psychometric: 600, extraInputs: { ...psych, physicsGrade: 60 + delta } },
      decision: delta < 0 ? 'below' : 'accepted',
    });
  }
  if (science) {
    for (const [units, floor] of [
      [4, 90],
      [5, 80],
    ] as const) {
      for (const delta of [-1, 0, 1])
        cases.push({
          name: `without science maths ${units}@${floor + delta}`,
          input: {
            psychometric: 400,
            extraInputs: { ...bagrut, mathUnits: units, mathGrade: floor + delta, physicsUnits: 3 },
          },
          decision: delta < 0 ? 'below' : 'accepted',
        });
    }
    for (const delta of [-1, 0, 1]) {
      cases.push({
        name: `CS Bagrut 5@${60 + delta}`,
        input: {
          psychometric: 400,
          extraInputs: { ...bagrut, physicsUnits: 3, csUnits: 5, csGrade: 60 + delta },
        },
        decision: delta < 0 ? 'below' : 'accepted',
      });
      cases.push({
        name: `no-science psych ${620 + delta}`,
        input: { psychometric: 620 + delta, extraInputs: { ...psych, physicsUnits: 3 } },
        decision: delta < 0 ? 'below' : 'accepted',
      });
    }
    cases.push(
      {
        name: '620 needs no science inputs',
        input: {
          psychometric: 620,
          extraInputs: { mathUnits: 4, mathGrade: 80, psychometricMath: 115 },
        },
        decision: 'accepted',
      },
      {
        name: 'no-science Bagrut needs no science inputs',
        input: { extraInputs: { mathUnits: 4, mathGrade: 90, englishUnits: 4, englishGrade: 70 } },
        decision: 'accepted',
      },
      {
        name: 'CS is not a science substitute in the 600 psych route',
        input: {
          psychometric: 600,
          extraInputs: { ...psych, physicsUnits: 3, csUnits: 5, csGrade: 100 },
        },
        decision: 'below',
      },
      {
        name: 'missing CS grade keeps Bagrut possible after physics fails',
        input: {
          psychometric: 400,
          extraInputs: { ...bagrut, physicsUnits: 3, csUnits: 5, csGrade: undefined },
        },
        decision: 'unknown',
        missing: ['cs_grade'],
      },
    );
  }
  cases.push(
    {
      name: 'no subject inputs cannot be replaced by high overall scores',
      input: { bagrut: 120, psychometric: 800 },
      decision: 'unknown',
      missing: [
        'psychometric_math',
        'math_units',
        'math_grade',
        ...(science ? [] : ['physics_units' as const, 'physics_grade' as const]),
      ],
    },
    {
      name: 'weak ordinary scores without subjects stay unknown',
      input: { bagrut: 70, psychometric: 400 },
      decision: 'unknown',
      missing: [
        'math_units',
        'math_grade',
        'english_units',
        'english_grade',
        ...(science ? [] : ['physics_units' as const, 'physics_grade' as const]),
      ],
    },
    {
      name: 'math record overrides a stale passing scalar',
      input: {
        psychometric: 400,
        extraInputs: {
          ...bagrut,
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [{ subjectId: 'mathematics', units: 3, grade: 50 }],
          },
        },
      },
      decision: 'below',
    },
    {
      name: 'physics record overrides stale passing scalar',
      input: {
        psychometric: 400,
        extraInputs: {
          ...bagrut,
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [{ subjectId: 'physics', units: 3, grade: 50 }],
          },
        },
      },
      decision: 'below',
    },
  );
  if (science)
    cases.push(
      {
        name: 'CS exam record overrides stale failing scalar',
        input: {
          psychometric: 400,
          extraInputs: {
            ...bagrut,
            physicsUnits: 3,
            bagrutSubjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [{ subjectId: 'computer_science', units: 5, grade: 60 }],
            },
          },
        },
        decision: 'accepted',
      },
      {
        name: 'CS record overrides stale passing scalar',
        input: {
          psychometric: 400,
          extraInputs: {
            ...bagrut,
            physicsUnits: 3,
            csUnits: 5,
            csGrade: 60,
            bagrutSubjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [{ subjectId: 'computer_science', units: 3, grade: 50 }],
            },
          },
        },
        decision: 'below',
      },
      {
        name: 'CS final project is not an exam or a scalar fallback',
        input: {
          psychometric: 400,
          extraInputs: {
            ...bagrut,
            physicsUnits: 3,
            csUnits: 5,
            csGrade: 100,
            bagrutSubjectRecord: {
              schemaVersion: 2,
              sector: 'jewish',
              certificateType: 'internal',
              complete: false,
              subjects: [
                {
                  subjectId: 'computer_science',
                  units: 5,
                  grade: 100,
                  assessmentKind: 'final_project',
                },
              ],
            },
          },
        },
        decision: 'unknown',
        missing: ['cs_units', 'cs_grade'],
      },
    );
  return cases;
}

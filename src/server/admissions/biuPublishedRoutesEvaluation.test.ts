import { describe, expect, it, vi } from 'vitest';
import { BIU_PUBLISHED_ROUTE_PROGRAM_IDS } from '@/data/admissions/biuPublishedRoutes';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { subjectIdForWizardLabel } from '@/utils/bagrutSubjectRecord';
import type { BagrutSubjectRecord } from '@/types';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import { evaluateBiuPublishedRoutes } from './biuPublishedRoutesEvaluation';

vi.mock('server-only', () => ({}));
import { evaluateAdmissionsForProgram } from './evaluator';

const institution = { id: 'biu' as const, name: 'אוניברסיטת בר־אילן', region: 'center' as const };
const boundaryInputs: Record<string, AdmissionsEvaluationInput> = {
  biu_law: { degreeId: 'biu_law', bagrut: 112, extraInputs: { englishUnits: 5, englishGrade: 90 } },
  biu_criminology: { degreeId: 'biu_criminology', bagrut: 98 },
  biu_lifesciences: {
    degreeId: 'biu_lifesciences',
    bagrut: 108,
    extraInputs: { mathUnits: 5, mathGrade: 85 },
  },
  biu_biotech: {
    degreeId: 'biu_biotech',
    bagrut: 108,
    extraInputs: {
      mathUnits: 4,
      mathGrade: 80,
      physicsUnits: 5,
      physicsGrade: 80,
      csUnits: 5,
      csGrade: 80,
    },
  },
  biu_computational_bio: {
    degreeId: 'biu_computational_bio',
    bagrut: 112,
    extraInputs: { mathUnits: 5, mathGrade: 95 },
  },
};
boundaryInputs.law = { ...boundaryInputs.biu_law, degreeId: 'law' };
boundaryInputs.criminology = { ...boundaryInputs.biu_criminology, degreeId: 'criminology' };

function evaluate(input: AdmissionsEvaluationInput) {
  return evaluateBiuPublishedRoutes({
    institution,
    input: { ...input, extraInputs: { psychometricEnglish: 85, ...input.extraInputs } },
  });
}
function record(subjects: BagrutSubjectRecord['subjects'], complete = false): BagrutSubjectRecord {
  return {
    schemaVersion: 2,
    sector: 'jewish',
    certificateType: 'internal',
    complete,
    subjects: subjects.map((row) => ({ ...row, assessmentKind: 'exam' as const })),
  };
}

describe('official BIU תשפ״ז published routes', () => {
  it.each(BIU_PUBLISHED_ROUTE_PROGRAM_IDS)(
    '%s rejects weak scores without requesting a composite',
    (degreeId) => {
      const result = evaluate({ degreeId, bagrut: 70, psychometric: 420 });
      if (degreeId === 'criminology' || degreeId === 'biu_criminology') {
        // Approved by Jorje 2026-10-25 02:10 (1): https://shoham.biu.ac.il/kabala/ remarks publish no combined-channel floor.
        expect(result).toMatchObject({ kind: 'estimated', decision: 'unknown' });
        // Approved by Jorje 2026-10-25 02:10 (1): https://shoham.biu.ac.il/kabala/ remarks cannot support a below-threshold assessment.
        expect(result.scoreAssessment).toBeUndefined();
      } else {
        expect(result).toMatchObject({
          kind: 'estimated',
          decision: 'below',
          scoreAssessment: 'below_threshold',
        });
      }
      expect(result.requiredInputs).toBeUndefined();
      // Approved by Jorje 2026-10-25 02:10 (1)–(2): https://shoham.biu.ac.il/kabala/ remarks include psych channels for criminology and the three science tracks.
      if (degreeId === 'law') expect(result.explanation).toContain('למסלול ללא פסיכומטרי בלבד');
    },
  );

  it.each(BIU_PUBLISHED_ROUTE_PROGRAM_IDS)(
    '%s matches its inclusive boundary without psychometric overall',
    (degreeId) => {
      const result = evaluate(boundaryInputs[degreeId]);
      expect(result).toMatchObject({
        kind: 'estimated',
        decision: 'pending',
        scoreAssessment: 'meets_threshold',
        score: boundaryInputs[degreeId].bagrut,
      });
      expect(result.requiredInputs).toBeUndefined();
      expect(result.additionalConditions).toContainEqual(
        expect.objectContaining({ status: 'unconfirmed' }),
      );
      expect(result.explanation).toContain('לפי חישוב בר־אילן');
    },
  );

  it.each(BIU_PUBLISHED_ROUTE_PROGRAM_IDS)(
    '%s honors the average boundary unless a published psychometric channel passes',
    (degreeId) => {
      const input = boundaryInputs[degreeId];
      // Approved by Jorje 2026-10-25 02:10 (3): https://shoham.biu.ac.il/kabala/ remarks leave a viable combined channel; general law keeps its shipped route.
      expect(evaluate({ ...input, bagrut: input.bagrut! - 0.01, psychometric: 800 }).decision).toBe(
        degreeId === 'biu_law' ? 'pending' : degreeId === 'law' ? 'below' : 'unknown',
      );
    },
  );

  it.each(BIU_PUBLISHED_ROUTE_PROGRAM_IDS)('%s requests ordinary inputs when empty', (degreeId) => {
    const result = evaluate({ degreeId, extraInputs: { psychometricEnglish: undefined } });
    expect(result).toMatchObject({ kind: 'needs_input', decision: 'unknown' });
    expect(result.requiredInputs).toContain('bagrut_average');
    expect(result.requiredInputs).not.toContain('institution_weighted_score');
    expect(result.explanation + result.nextAction).not.toMatch(/סכם|מתואם|מצרף/);
  });

  it.each(BIU_PUBLISHED_ROUTE_PROGRAM_IDS)('%s requires English classification 85', (degreeId) => {
    const input = boundaryInputs[degreeId];
    expect(
      evaluate({ ...input, extraInputs: { ...input.extraInputs, psychometricEnglish: 84 } })
        .decision,
    ).toBe('below');
    expect(
      evaluate({ ...input, extraInputs: { ...input.extraInputs, psychometricEnglish: undefined } }),
    ).toMatchObject({ kind: 'needs_input', requiredInputs: ['psychometric_english'] });
  });

  it.each([
    ['biu_law', { englishUnits: 4, englishGrade: 100 }],
    ['biu_law', { englishUnits: 5, englishGrade: 89 }],
    ['biu_computational_bio', { mathUnits: 4, mathGrade: 100 }],
    ['biu_computational_bio', { mathUnits: 5, mathGrade: 94 }],
    [
      'biu_biotech',
      { mathUnits: 4, mathGrade: 79, physicsUnits: 5, physicsGrade: 80, csUnits: 5, csGrade: 80 },
    ],
  ] as const)('%s enforces required subjects', (degreeId, extraInputs) => {
    expect(evaluate({ degreeId, bagrut: 120, extraInputs }).decision).toBe('below');
  });

  it('requests missing law and computational-biology subject data', () => {
    expect(evaluate({ degreeId: 'biu_law', bagrut: 112 })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['english_units', 'english_grade'],
    });
    expect(evaluate({ degreeId: 'biu_computational_bio', bagrut: 112 })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['math_units', 'math_grade'],
    });
  });

  it('life sciences supports both official alternatives without imposing science exams on the 5x85 route', () => {
    expect(evaluate(boundaryInputs.biu_lifesciences).decision).toBe('pending');
    expect(evaluate({ ...boundaryInputs.biu_biotech, degreeId: 'biu_lifesciences' }).decision).toBe(
      'pending',
    );
    expect(
      evaluate({
        degreeId: 'biu_lifesciences',
        bagrut: 108,
        extraInputs: { mathUnits: 5, mathGrade: 84 },
      }),
    ).toMatchObject({ kind: 'needs_input', requiredInputs: ['bagrut_subject_record'] });
  });

  it('counts two distinct qualifying exams, including the current wizard biotechnology ID', () => {
    for (const subjectId of [
      'biotechnology',
      subjectIdForWizardLabel('ביוטכנולוגיה'),
      'engineering',
      subjectIdForWizardLabel('הנדסה'),
    ]) {
      expect(
        evaluate({
          degreeId: 'biu_biotech',
          bagrut: 108,
          extraInputs: {
            bagrutSubjectRecord: record([
              { subjectId: 'mathematics', units: 5, grade: 80 },
              { subjectId, units: 5, grade: 80 },
            ]),
          },
        }).decision,
      ).toBe('pending');
    }
    expect(
      evaluate({
        degreeId: 'biu_biotech',
        bagrut: 108,
        extraInputs: {
          mathUnits: 5,
          mathGrade: 80,
          bagrutSubjectRecord: record(
            [
              { subjectId: 'biology', units: 5, grade: 80 },
              { subjectId: 'biology', units: 5, grade: 90 },
            ],
            true,
          ),
        },
      }),
    ).toMatchObject({ decision: 'below' });
  });

  it('does not treat final projects as exams or override complete records with legacy grades', () => {
    const bagrutSubjectRecord = record(
      [
        { subjectId: 'mathematics', units: 5, grade: 80 },
        { subjectId: 'biology', units: 5, grade: 80 },
      ],
      true,
    );
    if (bagrutSubjectRecord.schemaVersion !== 2) throw new Error('expected v2');
    bagrutSubjectRecord.subjects[1].assessmentKind = 'final_project';
    expect(
      evaluate({
        degreeId: 'biu_biotech',
        bagrut: 108,
        extraInputs: {
          bagrutSubjectRecord,
          physicsUnits: 5,
          physicsGrade: 100,
          csUnits: 5,
          csGrade: 100,
        },
      }).decision,
    ).toBe('below');
    expect(
      evaluate({
        degreeId: 'biu_biotech',
        bagrut: 108,
        extraInputs: {
          ...boundaryInputs.biu_biotech.extraInputs,
          bagrutSubjectRecord: { ...bagrutSubjectRecord, complete: false },
        },
      }),
    ).toMatchObject({ decision: 'pending' });
  });

  it('leaves missing science records incomplete instead of assuming a second science subject', () => {
    expect(
      evaluate({
        degreeId: 'biu_biotech',
        bagrut: 108,
        extraInputs: { mathUnits: 5, mathGrade: 80 },
      }),
    ).toMatchObject({ kind: 'needs_input', requiredInputs: ['bagrut_subject_record'] });
  });

  it.each(BIU_PUBLISHED_ROUTE_PROGRAM_IDS)(
    '%s is dispatched by the real evaluator',
    async (degreeId) => {
      const program = getStaticCataloguePrograms().find((item) => item.id === degreeId)!;
      const input = boundaryInputs[degreeId];
      const report = await evaluateAdmissionsForProgram({
        input: { ...input, extraInputs: { ...input.extraInputs, psychometricEnglish: 85 } },
        program,
        institutions: getStaticCatalogueInstitutions().filter((item) => item.id === 'biu'),
        freshnessStatesBySourceId: new Map(),
      });
      expect(report.results).toContainEqual(
        expect.objectContaining({
          linkedInstitutionId: 'biu',
          decision: 'pending',
          kind: 'estimated',
          scoreAssessment: 'meets_threshold',
        }),
      );
    },
  );
});

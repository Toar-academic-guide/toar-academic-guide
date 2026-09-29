import { describe, expect, it } from 'vitest';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import { evaluateColmanBagrutResult } from './colmanBagrutEvaluation';

const institution: CatalogueInstitution = {
  id: 'colman',
  name: 'המכללה למינהל',
  region: 'center',
  domain: 'colman.ac.il',
  universityId: 'colman',
};
function evaluate(
  extra: Partial<AdmissionsExtraInputs> = {},
  scores: Partial<AdmissionsEvaluationInput> = {},
) {
  return evaluateColmanBagrutResult({
    institution,
    input: {
      degreeId: 'colmgmt_cs',
      ...scores,
      extraInputs: {
        colmanBagrutAverage: 85,
        colmanBagrutCertificateConfirmed: true,
        mathUnits: 5,
        mathGrade: 70,
        ...extra,
      },
    },
  });
}
describe('Colman computer science Bagrut route', () => {
  it.each([
    { mathUnits: 5, mathGrade: 70 },
    { mathUnits: 4, mathGrade: 80 },
  ])(
    'meets the published inclusive boundaries with $mathUnits units and grade $mathGrade without psychometric',
    (math) => {
      const result = evaluate(math);
      expect(result).toMatchObject({
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        score: 85,
        threshold: 85,
      });
      expect(result.explanation).toContain('עדיין נדרש מעבר מבדק פנימי');
      expect(result.explanation).toContain('אין כאן אישור קבלה סופית');
    },
  );
  it.each([
    { colmanBagrutAverage: 84.99 },
    { mathUnits: 5, mathGrade: 69 },
    { mathUnits: 4, mathGrade: 79 },
    { mathUnits: 3, mathGrade: 100 },
    { colmanBagrutCertificateConfirmed: false },
  ])('reports below the direct route without rejecting other routes: %j', (extra) => {
    const result = evaluate(extra);
    expect(result.decision).toBe('below');
    expect(result.explanation).toContain('זו אינה דחייה מכל מסלולי הקבלה');
  });
  it.each([
    [{ colmanBagrutAverage: undefined }, 'colman_bagrut_average'],
    [{ colmanBagrutCertificateConfirmed: undefined }, 'colman_bagrut_certificate'],
    [{ mathUnits: undefined }, 'math_units'],
    [{ mathGrade: undefined }, 'math_grade'],
  ] as const)(
    'asks for missing input instead of substituting a generic score: %j',
    (extra, key) => {
      expect(evaluate(extra, { bagrut: 110, psychometric: 700 })).toMatchObject({
        kind: 'needs_input',
        decision: 'unknown',
        requiredInputs: [key],
      });
    },
  );
  it('uses the saved mathematics subject instead of inconsistent loose math fields', () => {
    expect(
      evaluate({
        bagrutSubjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [{ subjectId: 'mathematics', units: 4, grade: 79 }],
        },
      }),
    ).toMatchObject({ decision: 'below' });
  });
  it('keeps the internal test required even with combined-route exemption scores', () => {
    const result = evaluate({ psychometricMath: 120 }, { psychometric: 600 });
    expect(result.explanation).toContain('עדיין נדרש מעבר מבדק פנימי');
    expect(result.nextAction).toContain('מתייחס למסלול המשולב');
  });
});

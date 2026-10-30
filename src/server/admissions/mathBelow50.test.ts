import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { evaluateAdmissionsForProgram } from './evaluator';
import { evaluateTauManagementAdmission } from './tauManagementPolicy';
import { tauManagementFreshness } from '@/test/mathBelow50.fixture';

vi.mock('server-only', () => ({}));

function evaluate(degreeId: string, mathGrade: number) {
  const program = getStaticCataloguePrograms().find((row) => row.id === degreeId)!;
  return evaluateAdmissionsForProgram({
    input: {
      degreeId,
      psychometric: 640,
      bagrut: 100,
      extraInputs: { mathUnits: 4, mathGrade, psychometricMath: 139 },
    },
    program,
    institutions: getStaticCatalogueInstitutions().filter(
      (row) => row.id === program.institutionId,
    ),
    fetcher: vi.fn().mockRejectedValue(new Error('No external requests')),
    freshnessStatesBySourceId: new Map([
      [tauManagementFreshness().sourceId, tauManagementFreshness()],
    ]),
  });
}

describe('existing evaluator decisions for math below 50', () => {
  it('reports the unmet published TAU management math requirement without fabricating a score', async () => {
    expect(
      evaluateTauManagementAdmission(
        {
          psychometric: 640,
          bagrutAverage: 100,
          mathUnits: 4,
          mathGrade: 45,
          quantitativeScore: 139,
          acceptanceThreshold: 610,
          rejectionThreshold: 609,
        },
        'scores',
      ),
    ).toEqual({ decision: 'below', missingInputs: [], unmetRequirements: ['mathematics'] });

    const report = await evaluate('tau_business', 45);
    const result = report.results[0];
    expect(result).toMatchObject({ kind: 'exact', decision: 'below' });
    expect(result.explanation).toContain('מתמטיקה: 4 יח״ל בציון עובר או כמותי 140 ומעלה');
    expect(result.score).toBeUndefined();
    expect(result.threshold).toBeUndefined();
    expect(result.scoreLabel).toBeUndefined();
  });

  it('keeps the same open-admission decision when no math minimum exists', async () => {
    const low = await evaluate('open_university_cs', 45);
    const baseline = await evaluate('open_university_cs', 50);
    expect(low.results[0]).toMatchObject({ kind: 'open_admission', decision: 'accepted' });
    expect(low.results[0].decision).toBe(baseline.results[0].decision);
    expect(low.results[0].score).toBe(baseline.results[0].score);
    expect(low.results[0].threshold).toBe(baseline.results[0].threshold);
  });
});

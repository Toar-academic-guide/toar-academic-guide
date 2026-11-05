import { expect, it, vi } from 'vitest';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import {
  technionWinterSubjectRecord,
  technionWinterThresholdsHtml,
} from '@/test/technionWinterThresholds';
vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({
  getDb: () => {
    throw new Error('Item 6 must not access a database');
  },
}));

it.each([
  [4, 85, 'unknown'],
  [5, 69, 'unknown'],
  [5, 70, 'accepted'],
  [3, 100, 'below'],
] as const)(
  'Technion EE maths %s/%s retains the official conditional route: %s',
  async (units, grade, decision) => {
    const program = getStaticCataloguePrograms().find((p) => p.id === 'technion_ee')!;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async (url) =>
          new Response(
            String(url).includes('technion-calculators-sum.php')
              ? 'הסכם לדיוני הקבלה הוא:92'
              : technionWinterThresholdsHtml,
          ),
      );
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions: getStaticCatalogueInstitutions(),
      fetcher,
      input: {
        degreeId: program.id,
        bagrut: 110,
        psychometric: 750,
        extraInputs: {
          physicsUnits: 5,
          mathUnits: units,
          bagrutSubjectRecord: {
            ...technionWinterSubjectRecord,
            subjects: technionWinterSubjectRecord.subjects.map((s) =>
              s.subjectId === 'mathematics' ? { ...s, units, grade } : s,
            ),
          },
        },
      },
    });
    const result = report.results[0];
    expect(result).toMatchObject({
      decision,
      score: 92,
      threshold: decision === 'below' ? 5 : 91.5,
    });
    if (decision === 'unknown') {
      expect(result.kind).toBe('requirements_only');
      expect(result.explanation).toContain('סיווג במתמטיקה בציון 70');
      expect(result.requiredInputs).toBeUndefined();
    }
    expect(fetcher).toHaveBeenCalledTimes(2);
  },
);

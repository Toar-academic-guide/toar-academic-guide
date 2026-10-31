import { expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';
import { admissionsInputValue } from './admissionsInputValue';
import { evaluateAdmissionsForProgram } from './evaluator';
import { normalizeEvaluationInputs } from './evaluationInputs';
import { evaluateHaifaProgrammePolicy, haifaMissingRuleResult } from './haifaProgrammePolicy';
import {
  haifaQaApplicant,
  haifaQaFreshness,
  haifaQaNow,
  haifaQaProgramIds,
} from './haifaLegacyAverage.fixture';

vi.mock('server-only', () => ({}));

function outcome(result: AdmissionsEvaluationResult) {
  return {
    kind: result.kind,
    decision: result.decision,
    score: result.score,
    threshold: result.threshold,
    requiredInputs: result.requiredInputs,
  };
}

async function evaluate(
  programId: string,
  legacy?: number,
  rows: 'complete' | 'missing' | 'partial' = 'complete',
) {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('Unexpected network call'));
  const report = await evaluateAdmissionsForProgram({
    program: getStaticCataloguePrograms().find((program) => program.id === programId)!,
    institutions: getStaticCatalogueInstitutions(),
    input: {
      ...haifaQaApplicant,
      degreeId: programId,
      extraInputs: {
        ...haifaQaApplicant.extraInputs,
        ...(rows === 'missing' ? { bagrutSubjectRecord: undefined } : {}),
        ...(rows === 'partial'
          ? {
              bagrutSubjectRecord: {
                ...haifaQaApplicant.extraInputs!.bagrutSubjectRecord!,
                subjects: haifaQaApplicant.extraInputs!.bagrutSubjectRecord!.subjects.slice(0, 2),
              },
            }
          : {}),
        ...(legacy === undefined ? {} : { haifaBagrutAverage: legacy }),
      },
    },
    now: haifaQaNow,
    freshnessStatesBySourceId: haifaQaFreshness(),
    fetcher,
  });
  expect(fetcher).not.toHaveBeenCalled();
  return report.results.find((result) => result.linkedInstitutionId === 'haifa')!;
}

it.each(
  haifaQaProgramIds.flatMap((programId) => [60, 119].map((legacy) => ({ programId, legacy }))),
)(
  'ignores legacy average $legacy for $programId when real subject rows are supplied',
  async ({ programId, legacy }) => {
    const baseline = await evaluate(programId);
    if (programId === 'haifa_psychology') expect(baseline.score).toBe(775);
    if (['haifa_cs', 'haifa_infosystems'].includes(programId)) expect(baseline.score).toBe(718);
    if (['haifa_cs', 'haifa_infosystems'].includes(programId))
      expect(baseline.decision).not.toBe('below');
    expect(outcome(await evaluate(programId, legacy))).toEqual(outcome(baseline));
  },
);

it.each(
  haifaQaProgramIds.flatMap((programId) =>
    (['missing', 'partial'] as const).map((rows) => ({ programId, rows })),
  ),
)(
  'never falls back to a legacy average for $programId with $rows subject rows',
  async ({ programId, rows }) => {
    const baseline = await evaluate(programId, undefined, rows);
    expect(baseline.score).toBeUndefined();
    for (const legacy of [60, 119])
      expect(outcome(await evaluate(programId, legacy, rows))).toEqual(outcome(baseline));
  },
);

it('uses only subject rows to satisfy the Haifa average input', () => {
  expect(admissionsInputValue({ haifaBagrutAverage: 119 }, 'haifa_bagrut_average')).toBeUndefined();
  expect(
    admissionsInputValue(
      { ...haifaQaApplicant.extraInputs, haifaBagrutAverage: 60 },
      'haifa_bagrut_average',
    ),
  ).toBeGreaterThan(100);
});

it('does not manufacture a Haifa average or a Haifa proxy from an overall average', () => {
  const normalized = normalizeEvaluationInputs({ degreeId: 'haifa_cs', bagrut: 105 });
  expect(normalized.input.extraInputs.haifaBagrutAverage).toBeUndefined();
  expect(normalized.proxyInstitutions.has('haifa')).toBe(false);
});

it('ignores the legacy average when deciding whether an information-systems mapping can be used', () => {
  const institution = getStaticCatalogueInstitutions().find((row) => row.id === 'haifa')!;
  const missingRule = (legacy?: number) =>
    haifaMissingRuleResult('haifa_infosystems', institution, {
      averageIsProxy: false,
      capability: 'blocked',
      input: {
        degreeId: 'haifa_infosystems',
        extraInputs: { haifaInformationSystemsTrack: 'single_major', haifaBagrutAverage: legacy },
      },
    });
  expect(missingRule(119)).toEqual(missingRule());
});

it('does not treat a legacy average as bagrut evidence for the law suitability route', () => {
  const policy = (legacy?: number) =>
    evaluateHaifaProgrammePolicy({
      programId: 'haifa_law',
      score: 400,
      now: haifaQaNow,
      input: {
        degreeId: 'haifa_law',
        psychometric: 780,
        extraInputs: {
          haifaPsychometricYear: 2024,
          haifaHebrewQualification: 'hebrew_school',
          psychometricEnglish: 135,
          haifaBagrutAverage: legacy,
        },
      },
    });
  expect(policy(119)).toEqual(policy());
});

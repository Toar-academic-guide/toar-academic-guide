import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import psychologyFeed from '@/test/fixtures/hujiPsychology2027.json';
import { getHujiProgramConfig, hujiFormulaScore } from '@/data/admissions/hujiProgramVerification';
import { evaluateAdmissionsForProgram } from './evaluator';
import { resetSourceResponseCache } from '@/server/cache/sourceResponseCache';
import type { SourceFreshnessStateRow } from '@/db/types';

vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({
  getDb: () => {
    throw new Error('Database forbidden');
  },
}));
const institutions = getStaticCatalogueInstitutions();
const programs = ['huji_psychology', 'huji_cs']
  .map((id) => getStaticCataloguePrograms().find((row) => row.id === id)!)
  .filter(Boolean)
  .map((program) => ({ ...program, linkedInstitutionIds: ['huji'] }));
const now = new Date('2026-10-30T00:00:00Z');
const cs = getHujiProgramConfig('huji_cs');
const origin = hujiFormulaScore(1, 0, 0);
const feed = {
  hogimInfoObj: [
    ...psychologyFeed.hogimInfoObj,
    { track_number: cs.trackNumber, hog_regType: cs.formulaType },
  ],
  currentYearObj: [
    ...psychologyFeed.currentYearObj,
    { track_number: cs.trackNumber, safAccept: cs.acceptance, safReject: cs.rejection },
  ],
  formulasObj: [
    ...psychologyFeed.formulasObj,
    {
      formula_type: 1,
      formula_pet: hujiFormulaScore(1, 1, 0) - origin,
      formula_avg: hujiFormulaScore(1, 0, 1) - origin,
      formula_minus: -origin,
    },
  ],
};

function freshness() {
  return new Map(
    programs.map((program) => {
      const artifact = getProgramVerificationArtifact(`${program.id}__huji`)!;
      const sourceId = artifact.contract.source.targetId;
      return [
        sourceId,
        {
          sourceId,
          sourceClass: 'api_static_json',
          decisionProvenance: 'verified_derivation',
          status: 'fresh',
          capability: 'decision_capable',
          proofLevel: 'exact_official',
          reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
          normalizedFingerprint: artifact.contract.sourceFingerprint,
          lastCheckedAt: now,
          lastSuccessfulCheckAt: now,
          lastExactCheckAt: now,
          lastChangedAt: null,
          latestFailureReason: null,
          blockedReason: null,
          rawFingerprint: null,
          normalizedDecisionPayload: {},
          latestReviewItemId: null,
          nextAction: null,
          createdAt: now,
          updatedAt: now,
        } as SourceFreshnessStateRow,
      ];
    }),
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  resetSourceResponseCache();
});
afterEach(() => vi.useRealTimers());

describe('real evaluator shared HUJI transport', () => {
  it('fetches two programmes across two evaluation requests once, then reloads after five minutes', async () => {
    expect(programs).toHaveLength(2);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(JSON.stringify(feed)));
    const run = () =>
      Promise.all(
        programs.map((program) =>
          evaluateAdmissionsForProgram({
            program,
            institutions,
            input: { degreeId: program.id, bagrut: 105, psychometric: 640 },
            fetcher,
            now,
            freshnessStatesBySourceId: freshness(),
          }),
        ),
      );
    const parallel = await run();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await run()).toEqual(parallel);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300_001);
    expect(await run()).toEqual(parallel);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('matches independent sequential evaluator results byte for byte with the same source data', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(JSON.stringify(feed)));
    const evaluate = (program: (typeof programs)[number]) =>
      evaluateAdmissionsForProgram({
        program,
        institutions,
        input: { degreeId: program.id, bagrut: 105, psychometric: 640 },
        fetcher,
        now,
        freshnessStatesBySourceId: freshness(),
      });
    const sequential = [];
    for (const program of programs) {
      resetSourceResponseCache();
      sequential.push(await evaluate(program));
    }
    resetSourceResponseCache();
    expect(JSON.stringify(await Promise.all(programs.map(evaluate)))).toBe(
      JSON.stringify(sequential),
    );
  });
});

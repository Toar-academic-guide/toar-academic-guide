import { afterEach, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import { getHujiProgramConfig, hujiFormulaScore } from '@/data/admissions/hujiProgramVerification';
import psychology from '../../../../../docs/admissions-verification/2026-10-25-bgu-psychology-live.json';
import type { SourceFreshnessStateRow } from '@/db/types';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
const mocks = vi.hoisted(() => ({ freshness: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/db/client', () => ({
  getDb: () => {
    throw new Error('Database forbidden in profile');
  },
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/server/admissions/capabilityMatrix', async (actual) => ({
  ...(await actual<object>()),
  loadFreshnessStatesBySourceIds: mocks.freshness,
}));
import { POST } from './route';
const degreeIds = [
  'bgu_cs',
  'haifa_cs',
  'biu_cs',
  'ariel_cs',
  'huji_cs',
  'reichman_cs',
  'telhai_cs',
  'afeka_cs',
  'tlvyaffo_cs',
  'colmgmt_cs',
  'ono_cs',
  'tau_cs',
  'technion_cs',
  'mon_12220708942_cs',
  'hit_cs',
  'mon_12220708940_cs',
  'mon_12220708941_cs',
  'ruppin_cs',
  'mon_12220697668_cs',
  'mon_12220685569_cs',
  'mon_12341101519_cs',
  'mon_12341088622_cs',
  'bgu_nursing',
  'haifa_nursing',
  'nursing',
  'ariel_nursing',
  'telhai_nursing',
  'tlvyaffo_nursing',
  'ono_nursing',
  'bgu_psychology',
  'haifa_psychology',
  'biu_psychology',
  'huji_psychology',
  'ariel_psychology',
  'reichman_psychology',
  'ono_psychology',
  'tau_psychology',
];
const now = new Date('2026-10-30T00:00:00Z');
const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
afterEach(() => vi.unstubAllGlobals());
it('characterizes the 37-programme profile with serialized mocked DB and realistic source waits', async () => {
  resetAdmissionsEvaluationRateLimitForTests();
  const states = new Map<string, SourceFreshnessStateRow>();
  const hujiConfigs = new Map<string, ReturnType<typeof getHujiProgramConfig>>();
  for (const program of getStaticCataloguePrograms())
    for (const institutionId of program.linkedInstitutionIds) {
      const artifact = getProgramVerificationArtifact(`${program.id}__${institutionId}`);
      if (!artifact) continue;
      const sourceId = artifact.contract.source.targetId;
      states.set(sourceId, {
        sourceId,
        sourceClass: 'api_static_json',
        capability: 'decision_capable',
        status: 'fresh',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
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
      });
      if (institutionId === 'huji' && program.id !== 'huji_medicine' && program.id !== 'medicine') {
        try {
          const config = getHujiProgramConfig(program.id);
          hujiConfigs.set(config.trackNumber, config);
        } catch {
          /* Non-generic medical source. */
        }
      }
    }
  const hujiPayload = {
    hogimInfoObj: [...hujiConfigs.values()].map((config) => ({
      track_number: config.trackNumber,
      hog_regType: config.formulaType,
    })),
    currentYearObj: [...hujiConfigs.values()].map((config) => ({
      track_number: config.trackNumber,
      safAccept: config.acceptance,
      safReject: config.rejection,
    })),
    formulasObj: ([1, 2] as const).map((type) => {
      const origin = hujiFormulaScore(type, 0, 0);
      return {
        formula_type: type,
        formula_pet: hujiFormulaScore(type, 1, 0) - origin,
        formula_avg: hujiFormulaScore(type, 0, 1) - origin,
        formula_minus: -origin,
      };
    }),
  };
  let queryQueue = Promise.resolve();
  let queries = 0;
  mocks.freshness.mockImplementation(async (ids: string[]) => {
    if (ids.length) {
      queries++;
      queryQueue = queryQueue.then(() => sleep(100));
      await queryQueue;
    }
    return { status: 'loaded', states };
  });
  const active = new Map<string, number>();
  const peaks: Record<string, number> = {};
  const calls: Record<string, number> = {};
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const host = url.host;
    active.set(host, (active.get(host) ?? 0) + 1);
    peaks[host] = Math.max(peaks[host] ?? 0, active.get(host)!);
    calls[host] = (calls[host] ?? 0) + 1;
    try {
      await sleep(
        host.includes('huji')
          ? 450
          : host.includes('bgu')
            ? 700
            : host.includes('technion')
              ? 600
              : 0,
      );
      if (host.includes('huji')) return Response.json(hujiPayload);
      if (url.href.includes('SubmitSekem')) return new Response(psychology.scoreResponseHtml);
      if (host.includes('bgu'))
        return Response.json(
          url.searchParams.get('p_dep1') === '101'
            ? psychology.rulePayload
            : { items: [{ psycho_sekem: 520, psycho_value: 0 }] },
        );
      throw new Error('No mocked response for official source');
    } finally {
      active.set(host, active.get(host)! - 1);
    }
  });
  vi.stubGlobal('fetch', fetcher);
  const startedAt = performance.now();
  const response = await POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      body: JSON.stringify({ degreeIds, psychometric: 640, bagrut: 105 }),
    }),
  );
  const wallMs = Math.round(performance.now() - startedAt);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(Object.keys(body.data.reports).length + body.data.failedDegreeIds.length).toBe(37);
  expect(Math.max(...Object.values(peaks))).toBeLessThanOrEqual(8);
  process.stdout.write(
    'RES01_MOCK_PROFILE ' +
      JSON.stringify({
        wallMs,
        freshnessQueries: queries,
        sourceFetches: fetcher.mock.calls.length,
        sourceCallsByHost: calls,
        peakPerHost: peaks,
        reports: Object.keys(body.data.reports).length,
      }) +
      '\n',
  );
}, 20_000);

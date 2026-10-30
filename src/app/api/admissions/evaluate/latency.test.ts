import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { serializeAdmissionsReport } from '@/lib/admissionsEvaluationSerialization';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';

const mocks = vi.hoisted(() => ({
  programs: vi.fn(),
  institutions: vi.fn(),
  freshness: vi.fn(),
  evaluate: vi.fn(),
  selectSources: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/db/client', () => ({
  getDb: () => {
    throw new Error('Database forbidden in latency tests');
  },
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: mocks.programs,
  listCatalogueInstitutions: mocks.institutions,
}));
vi.mock('@/server/admissions/capabilityMatrix', async (actual) => ({
  ...(await actual<object>()),
  loadFreshnessStatesBySourceIds: mocks.freshness,
}));
vi.mock('@/server/admissions/evaluator', async (actual) => ({
  ...(await actual<object>()),
  evaluateAdmissionsForProgram: mocks.evaluate,
  exactSourceIdsForEvaluation: (...args: unknown[]) => mocks.selectSources(...args),
}));
import { POST } from './route';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
const actual = await vi.importActual<typeof import('@/server/admissions/evaluator')>(
  '@/server/admissions/evaluator',
);
const programs = getStaticCataloguePrograms().filter((p) =>
  ['huji_cs', 'huji_law', 'bgu_psychology', 'bgu_sociology', 'tau_cs', 'technion_cs'].includes(
    p.id,
  ),
);
const institutions = getStaticCatalogueInstitutions();
const request = (degreeIds = programs.map((p) => p.id)) =>
  POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      body: JSON.stringify({ degreeIds, psychometric: 640, bagrut: 105 }),
    }),
  );
const report = (id: string) =>
  ({ program: { id, name: id }, results: [] }) as unknown as AdmissionsEvaluationReport;

beforeEach(() => {
  resetAdmissionsEvaluationRateLimitForTests();
  mocks.selectSources.mockReset().mockImplementation(actual.exactSourceIdsForEvaluation);
  mocks.programs.mockResolvedValue({ data: programs });
  mocks.institutions.mockResolvedValue({ data: institutions });
  mocks.freshness.mockReset().mockResolvedValue({ status: 'loaded', states: new Map() });
  mocks.evaluate.mockReset().mockImplementation(async ({ program }) => report(program.id));
});

afterEach(() => vi.unstubAllGlobals());

describe('evaluate request latency contract', () => {
  it('starts the fifth programme before the first programme resolves and preserves result order', async () => {
    expect(programs.length).toBeGreaterThanOrEqual(5);
    const started: string[] = [];
    const release: Array<() => void> = [];
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      started.push(String(input));
      await new Promise<void>((done) => release.push(done));
      return new Response('{}');
    });
    vi.stubGlobal('fetch', fetcher);
    mocks.evaluate.mockImplementation(async ({ program, sourceContext }) => {
      await (sourceContext?.fetcher ?? fetch)(`https://official.example/${program.id}`, {
        method: 'POST',
      });
      return report(program.id);
    });
    const pending = request();
    await vi.waitFor(() => expect(started.length).toBeGreaterThanOrEqual(4));
    const countBeforeRelease = started.length;
    // Always release old batches too, so red runs leave no pending request.
    for (let i = 0; i < 4; i++) {
      release.splice(0).forEach((done) => done());
      await new Promise((done) => setTimeout(done, 10));
    }
    const body = await (await pending).json();
    expect(countBeforeRelease).toBe(programs.length);
    expect(Object.keys(body.data.reports)).toEqual(programs.map((p) => p.id));
  });

  it('loads the exact-source union once for the whole request', async () => {
    mocks.evaluate.mockImplementation((args) =>
      actual.evaluateAdmissionsForProgram({
        ...args,
        fetcher: vi.fn<typeof fetch>().mockImplementation(async () => new Response('{}')),
        now: new Date('2026-10-30T00:00:00Z'),
      }),
    );
    expect((await request()).status).toBe(200);
    expect(mocks.freshness).toHaveBeenCalledTimes(1);
    const ids = mocks.freshness.mock.calls[0][0] as string[];
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('huji-huji_cs-live');
  });

  it('matches sequential unavailable-authority reports exactly', async () => {
    mocks.freshness.mockResolvedValue({ status: 'unavailable', states: new Map() });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{}'));
    const evaluate = (args: Parameters<typeof evaluateAdmissionsForProgram>[0]) =>
      actual.evaluateAdmissionsForProgram({
        ...args,
        fetcher,
        now: new Date('2026-10-30T00:00:00Z'),
      });
    const expected: Record<string, unknown> = {};
    for (const program of programs)
      expected[program.id] = serializeAdmissionsReport(
        await evaluate({
          input: { degreeId: program.id, psychometric: 640, bagrut: 105 },
          program,
          institutions,
        }),
      );
    mocks.evaluate.mockImplementation(evaluate);
    expect((await (await request()).json()).data).toEqual({
      reports: expected,
      failedDegreeIds: [],
    });
  });

  it('keeps per-programme source-selection failures isolated in a batch', async () => {
    mocks.selectSources.mockImplementation((program) => {
      if (program.id === programs[0].id) throw new Error('Invalid source metadata');
      return [];
    });
    const response = await request();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.failedDegreeIds).toEqual([programs[0].id]);
    expect(Object.keys(body.data.reports)).toEqual(programs.slice(1).map((program) => program.id));
  });

  it('exposes only five aggregate numeric timings and no input values', async () => {
    const response = await request();
    const timing = response.headers.get('server-timing') ?? '';
    for (const name of ['catalogue', 'freshness', 'sources', 'compute', 'total'])
      expect(timing).toMatch(new RegExp(`(?:^|,\\s*)${name};dur=\\d+(?:\\.\\d+)?`));
    for (const value of ['640', '105', ...programs.map((p) => p.id)])
      expect(timing).not.toContain(value);
  });

  it('retains timing on validation errors', async () => {
    const response = await request([]);
    expect(response.status).toBe(400);
    expect(response.headers.get('server-timing')).toMatch(/total;dur=\d/);
  });
});

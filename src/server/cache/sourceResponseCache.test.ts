import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSourceResponseFetcher, resetSourceResponseCache } from './sourceResponseCache';
import { runHujiAdmissionsProof } from '@/server/ingestion/adapters/hujiAdmissions';

const huji = 'https://go.huji.ac.il/jjson/huji.json.gz';
const rules = 'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027';
const submit = 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitSekem';

describe('student evaluation source response cache', () => {
  beforeEach(() => { resetSourceResponseCache(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('shares in-flight bytes and independent Response bodies across programmes and requests for five minutes', async () => {
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>(() => new Promise((done) => { resolve = done; }));
    const firstRequest = createSourceResponseFetcher(fetcher);
    const a = firstRequest(huji);
    const b = firstRequest(huji);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    resolve(new Response('official bytes', { headers: { etag: 'source-version' } }));
    const responses = await Promise.all([a, b]);
    expect(await Promise.all(responses.map((response) => response.text()))).toEqual(['official bytes', 'official bytes']);
    expect(responses[0].headers.get('etag')).toBe('source-version');
    expect(await (await createSourceResponseFetcher(fetcher)(huji)).text()).toBe('official bytes');
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValue(new Response('new bytes'));
    await vi.advanceTimersByTimeAsync(300_001);
    expect(await (await firstRequest(huji)).text()).toBe('new bytes');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('never caches HTTP failures or network errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('down', { status: 500 })).mockRejectedValueOnce(new Error('offline')).mockImplementation(async () => new Response('ok'));
    const cached = createSourceResponseFetcher(fetcher);
    expect((await cached(huji)).status).toBe(500);
    await expect(cached(huji)).rejects.toThrow('offline');
    expect(await (await cached(huji)).text()).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('evicts a timed-out shared loader and retries', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise(() => {})).mockImplementation(async () => new Response('retry'));
    const cached = createSourceResponseFetcher(fetcher);
    const first = expect(cached(huji)).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(5001);
    await first;
    expect(await (await cached(huji)).text()).toBe('retry');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('one caller abort does not kill another caller or its shared loader', async () => {
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>(() => new Promise((done) => { resolve = done; }));
    const cached = createSourceResponseFetcher(fetcher);
    const controller = new AbortController();
    const aborted = expect(cached(huji, { signal: controller.signal })).rejects.toThrow();
    const survivor = cached(huji);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await aborted;
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(false);
    resolve(new Response('survived'));
    expect(await (await survivor).text()).toBe('survived');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('bounds cached response bodies and retries after oversized responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('x', { headers: { 'content-length': String(2 * 1024 * 1024 + 1) } })).mockImplementation(async () => new Response('ok'));
    const cached = createSourceResponseFetcher(fetcher);
    await expect(cached(huji)).rejects.toThrow(/byte limit/);
    expect(await (await cached(huji)).text()).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('never caches score submissions, unknown endpoints, or applicant query parameters', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('ok'));
    const cached = createSourceResponseFetcher(fetcher);
    for (const [url, init] of [[submit, { method: 'POST', body: 'score=synthetic' }], [rules + '&psychometric=synthetic', undefined], [huji + '?applicant=synthetic', undefined], ['https://unknown.example/rules', undefined]] as const) {
      await cached(url, init); await cached(url, init);
    }
    expect(fetcher).toHaveBeenCalledTimes(8);
    await cached(rules); await cached(rules);
    expect(fetcher).toHaveBeenCalledTimes(9);
  });

  it('isolates injected fetchers and leaves direct ingestion/proof fetching live', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{}'));
    await createSourceResponseFetcher(fetcher)(huji);
    const other = vi.fn<typeof fetch>().mockImplementation(async () => new Response('other'));
    expect(await (await createSourceResponseFetcher(other)(huji)).text()).toBe('other');
    for (let i = 0; i < 2; i++) await runHujiAdmissionsProof({ fetcher, applicant: { bagrutAverage: 105, psychometric: 640 }, program: { id: 'huji_cs', name: 'CS', externalId: '521-3010' } });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

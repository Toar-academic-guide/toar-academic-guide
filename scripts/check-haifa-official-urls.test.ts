import { describe, expect, it, vi } from 'vitest';
import {
  checkOfficialUrl,
  collectOfficialUrls,
  exitCodeFor,
} from './check-haifa-official-urls.mjs';

const url = 'https://admissions.haifa.ac.il/law/program/3000/';
const options = (request: typeof fetch) => ({ request, pause: async () => {}, timeoutMs: 100 });

describe('Haifa official URL check', () => {
  it('collects every nested URL on both rows and deduplicates repeated calculator links', () => {
    const programs = ['haifa_cs', 'haifa_law'].map((id) => ({
      id,
      institutionDetails: [
        {
          programUrl: url,
          officialCalculatorUrl: url,
          admissionFacts: [{ sourceUrl: `${url}?source=1` }],
        },
      ],
    }));
    expect(collectOfficialUrls(programs)).toEqual([url, `${url}?source=1`]);
    expect(() => collectOfficialUrls(programs.slice(1))).toThrow(/haifa_cs/);
  });

  it('requires a final HTTP 200 and fails a 404 even in network-tolerant CI', async () => {
    const request = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    const result = await checkOfficialUrl(url, options(request));
    expect(result).toMatchObject({ outcome: 'broken', status: 404 });
    expect(request).toHaveBeenCalledTimes(1);
    expect(exitCodeFor([result], true)).toBe(1);
    expect(
      (
        await checkOfficialUrl(
          url,
          options(vi.fn().mockResolvedValue(new Response('', { status: 200 }))),
        )
      ).outcome,
    ).toBe('ok');
  });

  it('retries transient responses and succeeds when the official site recovers', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValue(new Response('', { status: 200 }));
    expect((await checkOfficialUrl(url, options(request))).outcome).toBe('ok');
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('reports exhausted network failures as inconclusive, never as a successful HTTP check', async () => {
    const request = vi.fn().mockRejectedValue(new TypeError('network unavailable'));
    const result = await checkOfficialUrl(url, options(request));
    expect(result.outcome).toBe('inconclusive');
    expect(request).toHaveBeenCalledTimes(3);
    expect(exitCodeFor([result], true)).toBe(0);
    expect(exitCodeFor([result], false)).toBe(1);
  });

  it('rejects non-official hosts before making a request', async () => {
    const request = vi.fn();
    expect((await checkOfficialUrl('https://example.org/law', options(request))).outcome).toBe(
      'broken',
    );
    expect(request).not.toHaveBeenCalled();
  });
});

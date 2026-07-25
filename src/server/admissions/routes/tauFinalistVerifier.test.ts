import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createTauFinalistCircuit,
  verifyTauComputerScienceFinalists,
  type TauFinalistCache,
} from './tauFinalistVerifier';

const finalist = {
  id: 'candidate-1',
  psychometric: 690,
  bagrutAverage: 108,
  hasQualifiedMathAndPhysics: true,
};

describe('verifyTauComputerScienceFinalists', () => {
  it('requires the official TAU score replay and the official CS cutoff', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: { hatama_meduyakim: '710' } } },
        }),
      )
      .mockResolvedValueOnce(
        new Response('{"field_this_year_receipt_threshol":"706"}', { status: 200 }),
      );

    const result = await verifyTauComputerScienceFinalists({ finalists: [finalist], fetcher });

    expect(result).toEqual([
      expect.objectContaining({
        id: 'candidate-1',
        status: 'verified',
        eligible: true,
        score: 710,
        cutoff: 706,
        scoreField: 'hatama_meduyakim',
      }),
    ]);
    expect(JSON.stringify(fetcher.mock.calls[0]?.[1]?.body)).not.toContain('user');
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      variables: { scoresData: { reali10: 1, psicho: '690', bagrut: '108' } },
    });
  });

  it('fails closed rather than ranking when the official program cutoff cannot be parsed', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ data: { getLastScore: { body: { hatama_meduyakim: '710' } } } }),
      )
      .mockResolvedValueOnce(new Response('<html>unrecognized</html>', { status: 200 }));

    const result = await verifyTauComputerScienceFinalists({ finalists: [finalist], fetcher });

    expect(result).toEqual([
      expect.objectContaining({ status: 'unavailable', reason: 'official_cutoff_unavailable' }),
    ]);
  });

  it('caches verified replays with an opaque key and no raw academic profile', async () => {
    const values = new Map<string, ReturnType<TauFinalistCache['get']>>();
    const cache: TauFinalistCache = {
      get: (key) => values.get(key),
      set: (key, value) => values.set(key, value),
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ data: { getLastScore: { body: { hatama_meduyakim: 710 } } } }),
      )
      .mockResolvedValueOnce(
        new Response('{"field_this_year_receipt_threshol":"706"}', { status: 200 }),
      );

    await verifyTauComputerScienceFinalists({
      finalists: [finalist],
      fetcher,
      cache,
      cacheSecret: 'test-secret',
    });
    const cached = await verifyTauComputerScienceFinalists({
      finalists: [{ ...finalist, id: 'candidate-2' }],
      fetcher,
      cache,
      cacheSecret: 'test-secret',
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(cached).toEqual([expect.objectContaining({ id: 'candidate-2', status: 'verified' })]);
    expect([...values.keys()][0]).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify([...values.values()])).not.toContain('690');
    expect(JSON.stringify([...values.values()])).not.toContain('108');
  });

  it('opens the circuit after an upstream failure and withholds remaining finalists', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('timeout'));
    const circuit = createTauFinalistCircuit(1);

    const result = await verifyTauComputerScienceFinalists({
      finalists: [finalist, { ...finalist, id: 'candidate-2' }],
      fetcher,
      circuit,
    });

    expect(result).toEqual([
      expect.objectContaining({ id: 'candidate-1', reason: 'official_score_unavailable' }),
      expect.objectContaining({ id: 'candidate-2', reason: 'circuit_open' }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

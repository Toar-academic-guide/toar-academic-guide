import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { runTauComputerScienceRouteSimulation } from './tauRouteSimulation';
import type { TauFinalist } from './tauFinalistVerifier';

const record = {
  schemaVersion: 1 as const,
  sector: 'jewish' as const,
  subjects: [
    { subjectId: 'mathematics', units: 5, grade: 80 },
    { subjectId: 'physics', units: 5, grade: 80 },
  ],
};

describe('runTauComputerScienceRouteSimulation', () => {
  it('ranks only official TAU-verified finalists and bounds the candidate batch', async () => {
    const verifyFinalists = vi.fn(async (finalists: TauFinalist[]) =>
      finalists.map((finalist) => ({
        id: finalist.id,
        status: finalist.psychometric === 670 ? ('verified' as const) : ('unavailable' as const),
        eligible: finalist.psychometric === 670,
        score: finalist.psychometric === 670 ? 707 : undefined,
        cutoff: finalist.psychometric === 670 ? 706 : undefined,
        sourceUrl: 'https://go.tau.ac.il/he/exact/ba/computer',
      })),
    );

    const result = await runTauComputerScienceRouteSimulation({
      profile: { psychometric: 660, tauBagrutAverage: 108, subjectRecord: record },
      verifyFinalists,
    });

    expect(verifyFinalists).toHaveBeenCalledOnce();
    expect(verifyFinalists.mock.calls[0]?.[0]).toHaveLength(7);
    expect(verifyFinalists.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'psychometric_660_670',
          bagrutAverage: 108,
          psychometric: 670,
        }),
      ]),
    );
    expect(
      verifyFinalists.mock.calls[0]?.[0].every(({ id }) => id.startsWith('psychometric_')),
    ).toBe(true);
    expect(result).toMatchObject({
      status: 'complete',
      fastest: { actions: [{ kind: 'psychometric', to: 670 }] },
      lowestEffort: { verification: { score: 707, cutoff: 706 } },
    });
  });

  it('withholds ranking when every official replay is unavailable', async () => {
    const result = await runTauComputerScienceRouteSimulation({
      profile: { psychometric: 660, tauBagrutAverage: 108, subjectRecord: record },
      verifyFinalists: async (finalists) =>
        finalists.map((finalist) => ({
          id: finalist.id,
          status: 'unavailable' as const,
          reason: 'official_score_unavailable' as const,
          sourceUrl: 'https://go.tau.ac.il/he/exact/ba/computer',
        })),
    });

    expect(result).toEqual(expect.objectContaining({ status: 'authority_unavailable' }));
    expect(result.fastest).toBeUndefined();
  });

  it('does not emit academic actions until the official TAU average can be recomputed', async () => {
    const verifyFinalists = vi.fn(async (finalists: TauFinalist[]) =>
      finalists.map((finalist) => ({
        id: finalist.id,
        status: 'unavailable' as const,
        reason: 'official_score_unavailable' as const,
        sourceUrl: 'https://go.tau.ac.il/he/exact/ba/computer',
      })),
    );

    await runTauComputerScienceRouteSimulation({
      profile: {
        psychometric: 660,
        tauBagrutAverage: 111.5,
        subjectRecord: {
          ...record,
          subjects: [{ subjectId: 'mathematics', units: 4, grade: 80 }],
        },
      },
      verifyFinalists,
    });

    expect(verifyFinalists.mock.calls[0]?.[0]).toHaveLength(7);
    expect(verifyFinalists.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([expect.objectContaining({ bagrutAverage: 111.5 })]),
    );
    expect(
      verifyFinalists.mock.calls[0]?.[0].some(({ id }) => !id.startsWith('psychometric_')),
    ).toBe(false);
  });
});

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
      profile: { psychometric: 660, bagrutAverage: 108, subjectRecord: record },
      verifyFinalists,
    });

    expect(verifyFinalists).toHaveBeenCalledOnce();
    expect(verifyFinalists.mock.calls[0]?.[0].length).toBeLessThanOrEqual(8);
    expect(result).toMatchObject({
      status: 'complete',
      fastest: { actions: [{ kind: 'psychometric', to: 670 }] },
      lowestEffort: { verification: { score: 707, cutoff: 706 } },
    });
  });

  it('withholds ranking when every official replay is unavailable', async () => {
    const result = await runTauComputerScienceRouteSimulation({
      profile: { psychometric: 660, bagrutAverage: 108, subjectRecord: record },
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
});

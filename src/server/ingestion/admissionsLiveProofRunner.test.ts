import { describe, expect, it } from 'vitest';

import { runAdmissionsLiveProof } from './admissionsLiveProofRunner';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('runAdmissionsLiveProof', () => {
  it('runs exact Haifa and TAU targets by default', async () => {
    const fetcher = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('CandChancesServlet') && url.includes('calculateChances')) {
        return jsonResponse({ result: { weightedScore: 715, acceptanceCutoff: 700, rejectionCutoff: 650 } });
      }

      if (url.includes('CandChancesServlet')) {
        return jsonResponse({ ok: true });
      }

      if (url.includes('graphql')) {
        return jsonResponse({
          data: {
            getLastScore: { hatama_handasa: 715 },
            programAdmission: { acceptanceThreshold: 700, rejectionThreshold: 650 },
          },
        });
      }

      return jsonResponse({});
    };

    const report = await runAdmissionsLiveProof({ fetcher });

    expect(report.summary).toMatchObject({
      total: 2,
      exactReproduced: 2,
      failed: 0,
    });
    expect(report.results.map((result) => result.proof.id)).toEqual([
      'haifa-cs-live',
      'tau-digital-sciences-live',
    ]);
  });

  it('includes blocked and partial targets in the capability matrix lane', async () => {
    const report = await runAdmissionsLiveProof({
      includeCapabilityMatrix: true,
      targetIds: ['biu-browser-required', 'technion-score-only'],
    });

    expect(report.summary).toMatchObject({
      total: 2,
      partial: 1,
      blocked: 1,
    });
    expect(report.results.find((result) => result.proof.id === 'biu-browser-required')?.proof.status).toBe(
      'blocked'
    );
  });
});

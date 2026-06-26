import { describe, expect, it } from 'vitest';

import { normalizeHaifaPayload, runHaifaAdmissionsProof } from './haifaAdmissions';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('Haifa admissions adapter', () => {
  it('normalizes decision-capable official response fields', () => {
    expect(
      normalizeHaifaPayload({
        data: {
          weightedScore: '715.4',
          acceptanceCutoff: 700,
          rejectionCutoff: '650',
          marketingText: 'ignored',
        },
      }),
    ).toEqual({
      weightedScore: 715.4,
      acceptanceCutoff: 700,
      rejectionCutoff: 650,
    });
  });

  it('returns decision-capable proof for mocked official JSON with cutoffs', async () => {
    const fetcher = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('calculateChances')) {
        return jsonResponse({
          result: { weightedScore: 715, acceptanceCutoff: 700, rejectionCutoff: 650 },
        });
      }

      return jsonResponse({ ok: true });
    };

    const proof = await runHaifaAdmissionsProof({
      applicant: { bagrutAverage: 105, psychometric: 680 },
      fetcher,
      program: { id: 'haifa-cs', name: 'Computer Science', externalId: '52258372' },
    });

    expect(proof.status).toBe('succeeded');
    expect(proof.capability).toBe('decision_capable');
    expect(proof.normalizedPayload).toMatchObject({
      weightedScore: 715,
      acceptanceCutoff: 700,
      rejectionCutoff: 650,
    });
  });

  it('returns a failed proof when the official response is unavailable', async () => {
    const fetcher = async () => jsonResponse({ error: true }, { status: 503 });

    const proof = await runHaifaAdmissionsProof({
      applicant: { bagrutAverage: 105, psychometric: 680 },
      fetcher,
    });

    expect(proof.status).toBe('failed');
    expect(proof.errorReason).toContain('503');
  });
});

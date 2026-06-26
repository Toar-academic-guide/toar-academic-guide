import { describe, expect, it } from 'vitest';

import { normalizeTauPayload, runTauAdmissionsProof } from './tauAdmissions';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('TAU admissions adapter', () => {
  it('normalizes selected score fields and official thresholds', () => {
    expect(
      normalizeTauPayload(
        { data: { getLastScore: { hatama_handasa: 715, otherScore: 500 } } },
        { data: { programAdmission: { acceptanceThreshold: 700, rejectionThreshold: 650 } } },
        'hatama_handasa',
      ),
    ).toEqual({
      selectedScore: 715,
      selectedScoreField: 'data.getLastScore.hatama_handasa',
      acceptanceThreshold: 700,
      rejectionThreshold: 650,
    });
  });

  it('returns decision-capable proof for mocked GraphQL score and threshold responses', async () => {
    let requestCount = 0;
    const fetcher = async () => {
      requestCount += 1;
      if (requestCount === 1) {
        return jsonResponse({ data: { getLastScore: { hatama_handasa: 715 } } });
      }

      return jsonResponse({
        data: { programAdmission: { acceptanceThreshold: 700, rejectionThreshold: 650 } },
      });
    };

    const proof = await runTauAdmissionsProof({
      applicant: { bagrutAverage: 105, psychometric: 680 },
      fetcher,
      program: {
        id: 'tau-digital-sciences',
        name: 'Digital Sciences for High-Tech',
        externalId: '056011050000',
        scoreField: 'hatama_handasa',
      },
    });

    expect(proof.status).toBe('succeeded');
    expect(proof.capability).toBe('decision_capable');
    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: 715,
      acceptanceThreshold: 700,
      rejectionThreshold: 650,
    });
  });

  it('returns a failed proof when GraphQL returns an error status', async () => {
    const fetcher = async () => jsonResponse({ errors: [{ message: 'broken' }] }, { status: 500 });

    const proof = await runTauAdmissionsProof({
      applicant: { bagrutAverage: 105, psychometric: 680 },
      fetcher,
    });

    expect(proof.status).toBe('failed');
    expect(proof.errorReason).toContain('500');
  });
});

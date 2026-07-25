import { describe, expect, it, vi } from 'vitest';

import { evaluateAdmissionsSourceProof } from '../admissionsSourceAdapters';
import {
  parseTauProgramThresholds,
  parseTauScoresBody,
  runTauAdmissionsProof,
} from './tauAdmissions';

const applicant = {
  bagrutAverage: 105.5,
  psychometric: 680,
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('TAU response parsers', () => {
  it('parses GraphQL body strings into score fields', () => {
    expect(parseTauScoresBody(JSON.stringify({ hatama: 681, hatama_meduyakim: 704 }))).toEqual({
      hatama: 681,
      hatama_meduyakim: 704,
    });
  });

  it('finds official threshold fields in nested GraphQL program responses', () => {
    expect(
      parseTauProgramThresholds({
        data: {
          getPrograms: {
            results: [
              {
                title: 'Digital Sciences for High-Tech',
                receipt_threshol: [700],
                rejection_thresh: [680],
              },
            ],
          },
        },
      }),
    ).toEqual({
      acceptanceThreshold: 700,
      rejectionThreshold: 680,
    });
  });
});

describe('runTauAdmissionsProof', () => {
  it('returns decision-capable proof from mocked GraphQL score and program responses', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getLastScore: {
              body: JSON.stringify({
                hatama: 681,
                hatama_handasa: 704,
              }),
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getPrograms: {
              results: [
                {
                  receipt_threshol: [700],
                  rejection_thresh: [680],
                  field_plain_id_programs: ['056011050000'],
                },
              ],
            },
          },
        }),
      );

    const proof = await runTauAdmissionsProof({ applicant, fetcher });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
      operationName: 'getLastScore',
    });
    expect(proof).toMatchObject({
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      reproducedFields: [
        'selectedScore',
        'acceptanceThreshold',
        'rejectionThreshold',
        'officialVerdict',
      ],
      normalizedPayload: {
        selectedScoreField: 'hatama_handasa',
        selectedScore: 704,
        acceptanceThreshold: 700,
        rejectionThreshold: 680,
        matchedProgramIds: ['056011050000'],
        officialVerdict: 'accepted',
      },
    });
  });

  it('sends the official exact-sciences bonus only for an eligible applicant', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_handasa: 714 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getPrograms: {
              results: [
                {
                  receipt_threshol: [700],
                  rejection_thresh: [680],
                  field_plain_id_programs: ['056011050000'],
                },
              ],
            },
          },
        }),
      );

    const proof = await runTauAdmissionsProof({
      applicant: { ...applicant, exactSciencesBonusEligible: true },
      fetcher,
    });

    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
      variables: { scoresData: { reali10: 10 } },
    });
    expect(proof.normalizedPayload).toMatchObject({
      exactSciencesBonus: 10,
      officialVerdict: 'accepted',
    });
  });

  it('keeps the published band between rejection and acceptance as pending', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_handasa: 640 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getPrograms: {
              results: [
                {
                  receipt_threshol: [652],
                  rejection_thresh: [632],
                  field_plain_id_programs: ['056011050000'],
                },
              ],
            },
          },
        }),
      );

    const proof = await runTauAdmissionsProof({ applicant, fetcher });

    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: 640,
      acceptanceThreshold: 652,
      rejectionThreshold: 632,
      officialVerdict: 'pending',
    });
  });

  it('does not borrow thresholds from a different TAU program', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_handasa: 704 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getPrograms: {
              results: [
                {
                  receipt_threshol: [600],
                  rejection_thresh: [580],
                  field_plain_id_programs: ['different-program'],
                },
              ],
            },
          },
        }),
      );

    const proof = await runTauAdmissionsProof({ applicant, fetcher });

    expect(proof).toMatchObject({
      capability: 'score_only',
      proofLevel: 'partial_official',
      status: 'partial',
      normalizedPayload: {
        selectedScore: 704,
        matchedProgramIds: [],
      },
    });
    expect(proof.normalizedPayload.acceptanceThreshold).toBeUndefined();
  });

  it('records which TAU score field was selected for the representative program', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getLastScore: {
              body: JSON.stringify({
                hatama: 681,
                hatama_handasa: 695,
              }),
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getPrograms: {
              results: [{ receipt_threshol: [690] }],
            },
          },
        }),
      );

    const proof = await runTauAdmissionsProof({
      applicant,
      fetcher,
      program: {
        id: 'tau-engineering',
        name: 'Engineering',
        scoreField: 'hatama_handasa',
      },
    });

    expect(proof.normalizedPayload).toMatchObject({
      selectedScoreField: 'hatama_handasa',
      selectedScore: 695,
      acceptanceThreshold: 690,
    });
  });

  it('returns a failed proof when GraphQL returns errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        errors: [{ message: 'bad query' }],
      }),
    );

    const proof = await runTauAdmissionsProof({ applicant, fetcher });

    expect(proof).toMatchObject({
      status: 'failed',
      capability: 'blocked',
      errorReason: 'TAU GraphQL returned errors',
    });
  });

  it('feeds official TAU threshold changes into freshness fingerprints', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_handasa: 704 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getPrograms: {
              results: [{ receipt_threshol: [700], field_plain_id_programs: ['056011050000'] }],
            },
          },
        }),
      );

    const first = await runTauAdmissionsProof({ applicant, fetcher });
    const firstEvaluation = evaluateAdmissionsSourceProof(first);
    const secondEvaluation = evaluateAdmissionsSourceProof(
      {
        ...first,
        normalizedPayload: {
          ...first.normalizedPayload,
          acceptanceThreshold: 712,
        },
      },
      firstEvaluation.freshness?.normalizedFingerprint,
    );

    expect(secondEvaluation.freshness).toMatchObject({
      status: 'changed_needs_review',
      reviewWorthy: true,
    });
  });
});

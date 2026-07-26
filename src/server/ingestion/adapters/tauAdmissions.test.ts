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

  it('replays the current medicine preliminary threshold as eligibility for non-cognitive review', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: { hatama_refua: '745.43' } } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              nid: '8215',
              title: 'לימודי תואר "דוקטור ברפואה"',
              receipt_threshol: null,
              rejection_thresh: null,
              field_registration_comments: '<p>ציון התאמה רפואה ראשוני - 726.44</p>',
              field_plain_id_programs: ['011167010000'],
            },
          },
        }),
      );

    const proof = await runTauAdmissionsProof({
      applicant: { bagrutAverage: 115, psychometric: 760, psychometricSubscores: { english: 130, math: 130, verbal: 130 } },
      fetcher,
      program: {
        targetId: 'tau-medicine-live',
        pairId: 'medicine__tau',
        id: 'tau-medicine',
        name: 'Medicine',
        nodeId: 8215,
        externalId: '011167010000',
        scoreField: 'hatama_refua',
        decisionMode: 'eligible_to_apply',
      },
    });

    expect(proof).toMatchObject({
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      normalizedPayload: {
        selectedScore: 745.43,
        acceptanceThreshold: 726.44,
        officialVerdict: 'eligible_to_apply',
        matchedProgramIds: ['011167010000'],
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
      variables: { scoresData: { reali10: 1 } },
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

  it('loads a program-specific cutoff by official TAU node id', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: { hatama: 679 } } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              nid: '8275',
              title: 'תואר ראשון בלימודי פסיכולוגיה',
              receipt_threshol: [660],
              rejection_thresh: [659],
              field_plain_id_programs: ['107111050000', '107111030000'],
            },
          },
        }),
      );

    const proof = await runTauAdmissionsProof({
      applicant,
      fetcher,
      program: {
        targetId: 'tau-psychology-live',
        pairId: 'tau_psychology__tau',
        id: 'tau-psychology',
        name: 'Psychology',
        nodeId: 8275,
        externalId: '107111050000',
        scoreField: 'hatama',
      },
    });

    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({
      operationName: 'getProgramByIdAndLang',
      variables: { nid: 8275, langcode: 'he' },
    });
    expect(proof).toMatchObject({
      id: 'tau-psychology-live',
      status: 'succeeded',
      normalizedPayload: {
        pairId: 'tau_psychology__tau',
        selectedScore: 679,
        acceptanceThreshold: 660,
        rejectionThreshold: 659,
        officialVerdict: 'accepted',
      },
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

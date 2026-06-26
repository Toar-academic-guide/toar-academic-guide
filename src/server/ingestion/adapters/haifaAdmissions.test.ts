import { describe, expect, it, vi } from 'vitest';

import { evaluateAdmissionsSourceProof } from '../admissionsSourceAdapters';
import { parseHaifaChancesResponse, runHaifaAdmissionsProof } from './haifaAdmissions';

const applicant = {
  bagrutAverage: 105,
  psychometric: 680,
  psychometricSubscores: {
    english: 136,
    math: 136,
    verbal: 136,
  },
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('parseHaifaChancesResponse', () => {
  it('keeps official score and cutoff fields from nested label/value content', () => {
    const parsed = parseHaifaChancesResponse({
      data: [
        {
          results: [
            {
              content: [
                { label: 'הציון המשוקלל', value: '706' },
                { label: 'סף קבלה', value: '705' },
                { label: 'סף דחייה', value: '680' },
                { label: 'ציון פסיכומטרי', value: '680' },
                { label: 'טקסט מידע', value: 'נא לפנות למרכז ייעוץ' },
              ],
            },
          ],
        },
      ],
    });

    expect(parsed).toEqual({
      weightedScore: 706,
      acceptanceCutoff: 705,
      rejectionCutoff: 680,
      psychometricScore: 680,
    });
  });
});

describe('runHaifaAdmissionsProof', () => {
  it('returns a decision-capable proof from mocked official responses', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: { guid: 'guid-1' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              results: [
                {
                  content: [
                    { label: 'הציון המשוקלל', value: '706' },
                    { label: 'סף קבלה', value: '705' },
                    { label: 'סף דחייה', value: '680' },
                  ],
                },
              ],
            },
          ],
        }),
      );

    const proof = await runHaifaAdmissionsProof({ applicant, fetcher });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1][0])).toContain('operation=calculateChances');
    expect(proof).toMatchObject({
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      reproducedFields: ['weightedScore', 'acceptanceCutoff', 'rejectionCutoff'],
      normalizedPayload: {
        weightedScore: 706,
        acceptanceCutoff: 705,
        rejectionCutoff: 680,
      },
    });
  });

  it('keeps score-only Haifa responses partial until official cutoffs are parsed', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: { guid: 'guid-1' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ results: [{ content: [{ label: 'הציון המשוקלל', value: '706' }] }] }],
        }),
      );

    const proof = await runHaifaAdmissionsProof({ applicant, fetcher });

    expect(proof).toMatchObject({
      capability: 'score_only',
      proofLevel: 'partial_official',
      status: 'partial',
      reproducedFields: ['weightedScore'],
    });
  });

  it('returns a failed proof when an official endpoint returns invalid JSON', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: { guid: 'guid-1' } }))
      .mockResolvedValueOnce(
        new Response('not json', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const proof = await runHaifaAdmissionsProof({ applicant, fetcher });

    expect(proof).toMatchObject({
      status: 'failed',
      capability: 'blocked',
      errorReason: expect.stringContaining('Unexpected token'),
    });
  });

  it('feeds Haifa cutoff changes into freshness fingerprints', async () => {
    const first = await runHaifaAdmissionsProof({
      applicant,
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse({ data: { guid: 'guid-1' } }))
        .mockResolvedValueOnce(
          jsonResponse({
            data: [
              {
                results: [
                  {
                    content: [
                      { label: 'הציון המשוקלל', value: '706' },
                      { label: 'סף קבלה', value: '705' },
                    ],
                  },
                ],
              },
            ],
          }),
        ),
    });
    const second = {
      ...first,
      normalizedPayload: {
        ...first.normalizedPayload,
        acceptanceCutoff: 712,
      },
    };

    const firstEvaluation = evaluateAdmissionsSourceProof(first);
    const secondEvaluation = evaluateAdmissionsSourceProof(
      second,
      firstEvaluation.freshness?.normalizedFingerprint,
    );

    expect(secondEvaluation.freshness).toMatchObject({
      status: 'changed_needs_review',
      reviewWorthy: true,
    });
  });
});

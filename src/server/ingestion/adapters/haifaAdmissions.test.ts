import { describe, expect, it, vi } from 'vitest';
import haifaOfficial from '../../../../docs/admissions-verification/2026-09-28-haifa-official.json';
import {
  getHaifaProgramConfig,
  HAIFA_PROGRAM_VERIFICATION_METADATA,
} from '@/data/admissions/haifaProgramVerification';

import { evaluateAdmissionsSourceProof } from '../admissionsSourceAdapters';
import { parseHaifaChancesResponse, runHaifaAdmissionsProof } from './haifaAdmissions';
import { runAdmissionsLiveProof } from '../admissionsLiveProofRunner';

const applicant = {
  extraInputs: {
    haifaAdmissionQualification: 'full_bagrut' as const,
    haifaHebrewQualification: 'hebrew_school' as const,
    mathUnits: 5,
    mathGrade: 100,
  },
  bagrutAverage: 105,
  bagrutYear: '2026',
  psychometricYear: '2026',
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
  it('reconciles refreshed fixtures with independent official captures for all Haifa programmes', () => {
    for (const artifact of Object.values(HAIFA_PROGRAM_VERIFICATION_METADATA)) {
      const config = getHaifaProgramConfig(artifact.contract.programId);
      const captured = haifaOfficial.records.find(
        (record) => record.officialProgramId === config.officialProgramId,
      )!;
      for (const [index, boundary] of ['high', 'low'].entries()) {
        const official = captured[boundary as 'high' | 'low'];
        const parsed = parseHaifaChancesResponse(official.response);
        expect(parsed.weightedScore).toBe(artifact.fixtures[index].expected.score);
        expect(parsed.acceptanceCutoff).toBe(config.acceptance);
        expect(parsed.rejectionCutoff).toBe(config.rejection);
        expect(artifact.fixtures[index].input).toMatchObject({
          haifaBagrutAverage: Number(official.request.bag_avg),
          haifaBagrutYear: Number(official.request.bag_year),
          haifaPsychometricYear: Number(official.request.psy_year),
          psychometricMath: Number(official.request.psy_math),
          psychometricVerbal: Number(official.request.psy_verbal),
          psychometricEnglish: Number(official.request.psy_english),
        });
      }
    }
  });
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
  it('replays both current score and composed eligibility for every supported Haifa alias', async () => {
    const targetIds = Object.values(HAIFA_PROGRAM_VERIFICATION_METADATA)
      .filter((artifact) => artifact.contract.programId !== 'haifa_infosystems')
      .map((artifact) => artifact.contract.source.targetId);
    const report = await runAdmissionsLiveProof({
      targetIds,
      fetcher: vi.fn<typeof fetch>().mockImplementation(async (url) => {
        const params = new URL(String(url)).searchParams;
        if (params.get('operation') === 'checkConnection') return jsonResponse({ data: {} });
        const record = haifaOfficial.records.find(
          (capture) => capture.officialProgramId === params.get('program'),
        )!;
        return jsonResponse(record[params.get('bag_avg') === '120' ? 'high' : 'low'].response);
      }),
    });
    expect(report.summary).toMatchObject({
      total: 26,
      exactReproduced: 26,
      partial: 0,
      blocked: 0,
      failed: 0,
    });
  });
  it('withholds a numeric result when applicant gates are missing or the current cutoff changes', async () => {
    for (const [extraInputs, cutoff] of [
      [undefined, 700],
      [applicant.extraInputs, 705],
    ] as const) {
      const proof = await runHaifaAdmissionsProof({
        applicant: { ...applicant, extraInputs },
        fetcher: vi.fn<typeof fetch>().mockImplementation(async () =>
          jsonResponse({
            data: [
              {
                results: [
                  {
                    content: [
                      { label: 'הציון המשוקלל', value: '806' },
                      { label: 'סף קבלה', value: String(cutoff) },
                    ],
                  },
                ],
              },
            ],
          }),
        ),
      });
      expect(proof.capability).toBe('score_only');
      expect(proof.normalizedPayload.derivedVerdict).toBeUndefined();
    }
  });
  it('preserves the actual certificate year, exam year and full official average', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ data: [] }));
    await runHaifaAdmissionsProof({
      applicant: {
        ...applicant,
        bagrutAverage: 102.25,
        bagrutYear: '2015',
        psychometricYear: '2026',
      },
      fetcher,
    });
    const params = new URL(String(fetcher.mock.calls[1][0])).searchParams;
    expect(params.get('bag_year')).toBe('2015');
    expect(params.get('psy_year')).toBe('2026');
    expect(params.get('bag_avg')).toBe('102.25');
    expect(params.get('hug')).toBe('SC0021');
    expect(params.get('program')).toBe('52256544');
  });

  it.each([
    { bagrutYear: '2027' },
    { bagrutYear: '2015.5' },
    { psychometricYear: undefined },
    { bagrutAverage: 130.01 },
    { psychometricSubscores: { math: 151, verbal: 130, english: 130 } },
  ])('withholds invalid Haifa inputs before fetching: %o', async (invalid) => {
    const fetcher = vi.fn<typeof fetch>();
    const proof = await runHaifaAdmissionsProof({
      applicant: { ...applicant, ...invalid },
      fetcher,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(proof.capability).toBe('blocked');
  });

  it('does not call the official calculator with fabricated years or components', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const proof = await runHaifaAdmissionsProof({
      applicant: { ...applicant, bagrutYear: undefined },
      fetcher,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(proof.capability).toBe('blocked');
  });

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
                    { label: 'סף קבלה', value: '700' },
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
        acceptanceCutoff: 700,
        rejectionCutoff: 680,
        derivedVerdict: 'eligible_to_apply',
        decisionProvenance: 'verified_derivation',
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

  it('preserves an official waiting band between rejection and acceptance cutoffs', async () => {
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
                    { label: 'הציון המשוקלל', value: '690' },
                    { label: 'סף קבלה', value: '700' },
                    { label: 'סף דחייה', value: '680' },
                  ],
                },
              ],
            },
          ],
        }),
      );

    const proof = await runHaifaAdmissionsProof({ applicant, fetcher });

    expect(proof.normalizedPayload).toMatchObject({
      derivedVerdict: 'pending',
      decisionProvenance: 'verified_derivation',
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
                      { label: 'סף קבלה', value: '700' },
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

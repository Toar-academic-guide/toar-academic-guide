import { describe, expect, it, vi } from 'vitest';

import { runTauDigitalSciencesLiveVerification } from './tauProgramLiveVerification';

describe('TAU programme live verification', () => {
  it('compares both reviewed fixtures without returning their academic inputs', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(scoreResponse(664))
      .mockResolvedValueOnce(thresholdResponse())
      .mockResolvedValueOnce(scoreResponse(598))
      .mockResolvedValueOnce(thresholdResponse());

    const report = await runTauDigitalSciencesLiveVerification({
      fetcher,
      checkedAt: new Date('2026-07-25T20:12:07Z'),
    });

    expect(report).toEqual({
      pairId: 'tau_datascience__tau',
      checkedAt: '2026-07-25T20:12:07.000Z',
      passed: true,
      comparisons: [
        {
          fixtureId: 'tau_datascience__tau:accepted:2026-2027',
          expectedScore: 664,
          actualScore: 664,
          expectedVerdict: 'accepted',
          actualVerdict: 'accepted',
          scoreMatches: true,
          verdictMatches: true,
        },
        {
          fixtureId: 'tau_datascience__tau:below:2026-2027',
          expectedScore: 598,
          actualScore: 598,
          expectedVerdict: 'below',
          actualVerdict: 'below',
          scoreMatches: true,
          verdictMatches: true,
        },
      ],
    });
    expect(JSON.stringify(report)).not.toContain('psychometric');
    expect(JSON.stringify(report)).not.toContain('bagrut');
  });

  it('fails the report when either the score or verdict drifts', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(scoreResponse(663))
      .mockResolvedValueOnce(thresholdResponse())
      .mockResolvedValueOnce(scoreResponse(640))
      .mockResolvedValueOnce(thresholdResponse());

    const report = await runTauDigitalSciencesLiveVerification({ fetcher });

    expect(report.passed).toBe(false);
    expect(report.comparisons).toMatchObject([
      { scoreMatches: false, verdictMatches: true },
      { scoreMatches: false, verdictMatches: false, actualVerdict: 'pending' },
    ]);
  });
});

function scoreResponse(score: number): Response {
  return jsonResponse({
    data: {
      getLastScore: {
        body: JSON.stringify({ hatama_handasa: score }),
      },
    },
  });
}

function thresholdResponse(): Response {
  return jsonResponse({
    data: {
      getPrograms: {
        results: [
          {
            title: 'תואר ראשון במדעים דיגיטליים להיי-טק',
            field_plain_id_programs: ['056011050000'],
            field_this_year_receipt_threshol: 652,
            field_this_year_rejection_thresh: 632,
          },
        ],
      },
    },
  });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

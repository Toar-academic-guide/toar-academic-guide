import { describe, expect, it, vi } from 'vitest';

import {
  runTauDigitalSciencesLiveVerification,
  runTauNursingLiveVerification,
  runTauPsychologyLiveVerification,
} from './tauProgramLiveVerification';

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

  it('preserves Nursing eligibility as a manual-gate verdict', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(scoreResponse(546, 'hatama'))
      .mockResolvedValueOnce(nursingThresholdResponse())
      .mockResolvedValueOnce(scoreResponse(496, 'hatama'))
      .mockResolvedValueOnce(nursingThresholdResponse());

    const report = await runTauNursingLiveVerification({
      fetcher,
      checkedAt: new Date('2026-07-25T20:30:39Z'),
    });

    expect(report).toMatchObject({
      pairId: 'nursing__tau',
      passed: true,
      comparisons: [
        {
          expectedVerdict: 'eligible_to_apply',
          actualVerdict: 'eligible_to_apply',
          scoreMatches: true,
          verdictMatches: true,
        },
        {
          expectedVerdict: 'below',
          actualVerdict: 'below',
          scoreMatches: true,
          verdictMatches: true,
        },
      ],
    });
  });

  it('replays accepted and below Psychology fixtures through its official node', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(scoreResponse(679, 'hatama'))
      .mockResolvedValueOnce(psychologyThresholdResponse())
      .mockResolvedValueOnce(scoreResponse(654, 'hatama'))
      .mockResolvedValueOnce(psychologyThresholdResponse());

    const report = await runTauPsychologyLiveVerification({
      fetcher,
      checkedAt: new Date('2026-07-25T20:47:06.248Z'),
    });

    expect(report).toMatchObject({
      pairId: 'tau_psychology__tau',
      passed: true,
      comparisons: [
        {
          expectedScore: 679,
          actualScore: 679,
          expectedVerdict: 'accepted',
          actualVerdict: 'accepted',
        },
        {
          expectedScore: 654,
          actualScore: 654,
          expectedVerdict: 'below',
          actualVerdict: 'below',
        },
      ],
    });
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({
      variables: { nid: 8275, langcode: 'he' },
    });
  });
});

function scoreResponse(score: number, field = 'hatama_handasa'): Response {
  return jsonResponse({
    data: {
      getLastScore: {
        body: JSON.stringify({ [field]: score }),
      },
    },
  });
}

function nursingThresholdResponse(): Response {
  return jsonResponse({
    data: {
      getPrograms: {
        results: [
          {
            title: 'לימודי תואר ראשון בחוג למדעי האחיוּת (Nursing)',
            field_plain_id_programs: ['016211010000', '016211010208'],
            field_this_year_receipt_threshol: 530,
            field_this_year_rejection_thresh: 520,
          },
        ],
      },
    },
  });
}

function psychologyThresholdResponse(): Response {
  return jsonResponse({
    data: {
      getProgramByIdAndLang: {
        nid: '8275',
        title: 'תואר ראשון בלימודי פסיכולוגיה',
        field_plain_id_programs: ['107111050000', '107111030000'],
        receipt_threshol: [660],
        rejection_thresh: [659],
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

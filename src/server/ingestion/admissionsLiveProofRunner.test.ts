import { describe, expect, it, vi } from 'vitest';

import { runAdmissionsLiveProof } from './admissionsLiveProofRunner';

function tauResponse(score: number, threshold: number) {
  return new Response(
    JSON.stringify({
      data: { getLastScore: { body: JSON.stringify({ hatama_handasa: score }) } },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function tauThresholdResponse(threshold: number) {
  return new Response(
    JSON.stringify({
      data: {
        getPrograms: {
          results: [
            {
              receipt_threshol: [threshold],
              rejection_thresh: [threshold - 1],
              field_plain_id_programs: ['056011050000'],
            },
          ],
        },
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('runAdmissionsLiveProof', () => {
  it('withholds a live response until independent eligible and below captures are supplied', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tauResponse(704, 700))
      .mockResolvedValueOnce(tauThresholdResponse(700));

    const report = await runAdmissionsLiveProof({
      fetcher,
      targetIds: ['tau-digital-sciences-live'],
      controlledFixturesByTargetId: { 'tau-digital-sciences-live': [] },
    });

    expect(report.summary).toEqual({
      total: 1,
      exactReproduced: 0,
      partial: 1,
      blocked: 0,
      failed: 0,
    });
    expect(report.results[0]?.proof).toMatchObject({
      proofLevel: 'partial_official',
      status: 'partial',
    });
  });

  it('requires both independently captured fixture boundaries to match', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tauResponse(704, 700))
      .mockResolvedValueOnce(tauThresholdResponse(700))
      .mockResolvedValueOnce(tauResponse(600, 700))
      .mockResolvedValueOnce(tauThresholdResponse(700));

    const report = await runAdmissionsLiveProof({
      fetcher,
      targetIds: ['tau-digital-sciences-live'],
      controlledFixturesByTargetId: {
        'tau-digital-sciences-live': [
          {
            captureId: 'tau-digital-eligible-capture',
            applicant: { bagrutAverage: 105, psychometric: 680 },
            expected: { score: 704, verdict: 'accepted' },
          },
          {
            captureId: 'tau-digital-below-capture',
            applicant: { bagrutAverage: 80, psychometric: 500 },
            expected: { score: 600, verdict: 'below' },
          },
        ],
      },
    });

    expect(report.summary.exactReproduced).toBe(1);
    expect(report.results[0]?.proof).toMatchObject({
      proofLevel: 'exact_official',
      status: 'succeeded',
      normalizedPayload: {
        controlledFixtureCaptureIds: ['tau-digital-eligible-capture', 'tau-digital-below-capture'],
      },
    });
  });

  it('withholds a proof when its supplied captures do not cover both verdict boundaries', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tauResponse(704, 700))
      .mockResolvedValueOnce(tauThresholdResponse(700));

    const report = await runAdmissionsLiveProof({
      fetcher,
      targetIds: ['tau-digital-sciences-live'],
      controlledFixturesByTargetId: {
        'tau-digital-sciences-live': [
          {
            captureId: 'first-eligible-capture',
            applicant: { bagrutAverage: 105, psychometric: 680 },
            expected: { score: 704, verdict: 'accepted' },
          },
          {
            captureId: 'second-eligible-capture',
            applicant: { bagrutAverage: 106, psychometric: 681 },
            expected: { score: 704, verdict: 'accepted' },
          },
        ],
      },
    });

    expect(report.summary.exactReproduced).toBe(0);
    expect(report.results[0]?.proof.limitations).toContain(
      'A controlled proof requires independently captured eligible and below-threshold fixtures.',
    );
  });

  it('withholds the pair when either fixture drifts', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tauResponse(704, 700))
      .mockResolvedValueOnce(tauThresholdResponse(700))
      .mockResolvedValueOnce(tauResponse(601, 700))
      .mockResolvedValueOnce(tauThresholdResponse(700));

    const report = await runAdmissionsLiveProof({
      fetcher,
      targetIds: ['tau-digital-sciences-live'],
      controlledFixturesByTargetId: {
        'tau-digital-sciences-live': [
          {
            captureId: 'eligible',
            applicant: { bagrutAverage: 105, psychometric: 680 },
            expected: { score: 704, verdict: 'accepted' },
          },
          {
            captureId: 'below',
            applicant: { bagrutAverage: 80, psychometric: 500 },
            expected: { score: 600, verdict: 'below' },
          },
        ],
      },
    });

    expect(report.summary.exactReproduced).toBe(0);
    expect(report.results[0]?.proof).toMatchObject({
      proofLevel: 'partial_official',
      status: 'partial',
      limitations: expect.arrayContaining([expect.stringContaining('below score mismatch')]),
    });
  });

  it('times out one official source and continues with later targets', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { getLastScore: { body: JSON.stringify({ hatama: 546 }) } } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getPrograms: {
                results: [{ receipt_threshol: [530], field_plain_id_programs: ['016211010000'] }],
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    const report = await runAdmissionsLiveProof({
      fetcher,
      requestTimeoutMs: 1,
      targetIds: ['tau-digital-sciences-live', 'tau-nursing-live'],
      controlledFixturesByTargetId: {
        'tau-digital-sciences-live': [],
        'tau-nursing-live': [],
      },
    });

    expect(report.summary).toMatchObject({ total: 2, failed: 1, partial: 1 });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('times out a stalled official response body and continues with later targets', async () => {
    const stalledResponse = new Response('partial response', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.spyOn(stalledResponse, 'arrayBuffer').mockImplementation(
      () => new Promise<ArrayBuffer>(() => undefined),
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(stalledResponse)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { getLastScore: { body: JSON.stringify({ hatama: 546 }) } } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getPrograms: {
                results: [{ receipt_threshol: [530], field_plain_id_programs: ['016211010000'] }],
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    const report = await runAdmissionsLiveProof({
      fetcher,
      requestTimeoutMs: 1,
      targetIds: ['tau-digital-sciences-live', 'tau-nursing-live'],
      controlledFixturesByTargetId: {
        'tau-digital-sciences-live': [],
        'tau-nursing-live': [],
      },
    });

    expect(report.summary).toMatchObject({ total: 2, failed: 1, partial: 1 });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

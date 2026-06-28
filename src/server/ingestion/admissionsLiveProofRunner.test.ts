import { describe, expect, it, vi } from 'vitest';

import { runAdmissionsLiveProof } from './admissionsLiveProofRunner';

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function exactAdapterFetcher() {
  return vi
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
    )
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
}

describe('runAdmissionsLiveProof', () => {
  it('runs Haifa and TAU by default as exact live proof targets', async () => {
    const report = await runAdmissionsLiveProof({ fetcher: exactAdapterFetcher() });

    expect(report.summary).toMatchObject({
      total: 2,
      exactReproduced: 2,
      partial: 0,
      blocked: 0,
      failed: 0,
    });
    expect(report.results.map((result) => result.proof.id)).toEqual([
      'haifa-cs-live',
      'tau-digital-sciences-live',
    ]);
  });

  it('supports target filtering for one official source', async () => {
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

    const report = await runAdmissionsLiveProof({
      fetcher,
      targetIds: ['tau-digital-sciences-live'],
    });

    expect(report.summary.total).toBe(1);
    expect(report.results[0].proof.id).toBe('tau-digital-sciences-live');
  });

  it('keeps failed targets isolated from successful targets', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('network down'))
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

    const report = await runAdmissionsLiveProof({ fetcher });

    expect(report.summary).toMatchObject({
      total: 2,
      exactReproduced: 1,
      failed: 1,
    });
    expect(report.results.map((result) => result.proof.status)).toEqual(['failed', 'succeeded']);
  });

  it('can include the full capability matrix without attempting blocked sources live', async () => {
    const report = await runAdmissionsLiveProof({
      includeCapabilityMatrix: true,
      fetcher: exactAdapterFetcher(),
    });

    expect(report.summary).toMatchObject({
      total: 13,
      exactReproduced: 2,
      partial: 8,
      blocked: 2,
    });
    expect(report.results.map((result) => result.proof.institutionId)).toEqual([
      'haifa',
      'tau',
      'huji',
      'technion',
      'bgu',
      'biu',
      'ariel',
      'open_university',
      'reichman',
      'afeka',
      'hit',
      'shenkar',
      'mta',
    ]);
  });
});

import { describe, expect, it, vi } from 'vitest';

import { runAdmissionsLiveProof } from './admissionsLiveProofRunner';
import { HUJI_PROGRAM_VERIFICATION_ARTIFACTS } from '@/data/admissions/hujiProgramVerification';
import { BGU_PROGRAM_VERIFICATION_ARTIFACTS } from '@/data/admissions/bguProgramVerification';
import { TECHNION_PROGRAM_VERIFICATION_ARTIFACTS } from '@/data/admissions/technionProgramVerification';

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function exactAdapterFetcher() {
  const fetcher = vi.fn<typeof fetch>();
  const hujiTracks = Object.values(HUJI_PROGRAM_VERIFICATION_ARTIFACTS).reduce<
    Record<string, { acceptance: number; rejection: number; formulaType: number }>
  >((tracks, artifact) => {
    const contract = artifact.contract;
    tracks[contract.officialProgramId] ??= {
      acceptance: contract.calculation.cutoff.acceptance,
      rejection: contract.calculation.cutoff.rejection ?? 0,
      formulaType: Number(contract.calculation.formulaFamily.split('_').pop()),
    };
    return tracks;
  }, {});
  const hujiResponse = () =>
    jsonResponse({
      timestamp: '2026-07-26T00:00:00.000Z',
      hogimInfoObj: Object.entries(hujiTracks).map(([track_number, value]) => ({
        track_number,
        hog_regType: value.formulaType,
      })),
      currentYearObj: Object.entries(hujiTracks).map(([track_number, value]) => ({
        track_number,
        safAccept: String(value.acceptance),
        safReject: String(value.rejection),
      })),
      formulasObj: [
        { formula_type: 1, formula_pet: '0.01992054', formula_avg: '0.24614193', formula_minus: '16.993402399' },
        { formula_type: 2, formula_pet: '0.027468921', formula_avg: '0.145461915', formula_minus: '11.50910537' },
      ],
    });
  for (let index = 0; index < Object.keys(HUJI_PROGRAM_VERIFICATION_ARTIFACTS).length; index += 1) {
    fetcher.mockResolvedValueOnce(hujiResponse());
  }
  for (const artifact of Object.values(BGU_PROGRAM_VERIFICATION_ARTIFACTS)) {
    fetcher.mockResolvedValueOnce(
      jsonResponse({
        items: [{
          psycho_sekem: artifact.contract.calculation.cutoff.acceptance,
          psycho_value: artifact.contract.calculation.cutoff.acceptance,
          comments: `סכם כמותי ${artifact.contract.calculation.cutoff.acceptance}`,
        }],
      }),
    );
    fetcher.mockResolvedValueOnce(
      new Response('<script>parent.main.document.mainForm.on_final_sekem.value = 875;</script>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    );
  }
  for (const artifact of Object.values(TECHNION_PROGRAM_VERIFICATION_ARTIFACTS)) {
    fetcher.mockResolvedValueOnce(
      new Response('הסכם לדיוני הקבלה הוא:98.9', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    );
  }

  return fetcher
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
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 546 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getPrograms: {
            results: [{ receipt_threshol: [530], field_plain_id_programs: ['016211010000'] }],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: { hatama: 679 } } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [660],
            rejection_thresh: [659],
            field_plain_id_programs: ['107111050000', '107111030000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [580],
            rejection_thresh: [569],
            field_plain_id_programs: ['111011010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [580],
            rejection_thresh: [569],
            field_plain_id_programs: ['111011010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: { hatama: 679 } } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [660],
            rejection_thresh: [659],
            field_plain_id_programs: ['107111050000', '107111030000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_handasa: 664 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [652],
            rejection_thresh: [632],
            field_plain_id_programs: ['056011050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [647],
            rejection_thresh: [646],
            field_plain_id_programs: ['141111010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [647],
            rejection_thresh: [646],
            field_plain_id_programs: ['141111010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_nihul: 677 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [610],
            rejection_thresh: [609],
            field_plain_id_programs: ['121111050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_nihul: 677 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [610],
            rejection_thresh: [609],
            field_plain_id_programs: ['121111050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_nihul: 677 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [610],
            rejection_thresh: [609],
            field_plain_id_programs: ['122111050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_nihul: 677 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [610],
            rejection_thresh: [609],
            field_plain_id_programs: ['122111050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [631],
            rejection_thresh: [563],
            field_plain_id_programs: ['088111010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [576],
            rejection_thresh: [570],
            field_plain_id_programs: ['045511050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [530],
            rejection_thresh: [529],
            field_plain_id_programs: ['108511050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [535],
            rejection_thresh: [534],
            field_plain_id_programs: ['103111030000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [550],
            rejection_thresh: [549],
            field_plain_id_programs: ['072311050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [610],
            rejection_thresh: [600],
            field_plain_id_programs: ['101111050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [610],
            rejection_thresh: [600],
            field_plain_id_programs: ['101111050000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [706],
            rejection_thresh: [695],
            field_plain_id_programs: ['036811010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [706],
            rejection_thresh: [695],
            field_plain_id_programs: ['036811010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [710],
            rejection_thresh: [690],
            field_plain_id_programs: ['051211010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [710],
            rejection_thresh: [690],
            field_plain_id_programs: ['051211010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [650],
            rejection_thresh: [616],
            field_plain_id_programs: ['054211010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [650],
            rejection_thresh: [616],
            field_plain_id_programs: ['054211010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [607],
            rejection_thresh: [606],
            field_plain_id_programs: ['016511010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [607],
            rejection_thresh: [606],
            field_plain_id_programs: ['016511010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [667],
            rejection_thresh: [647],
            field_plain_id_programs: ['057311010000'],
          },
        },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          getProgramByIdAndLang: {
            receipt_threshol: [576],
            rejection_thresh: [570],
            field_plain_id_programs: ['045511050000'],
          },
        },
      }),
    );
}

describe('runAdmissionsLiveProof', () => {
  it('runs the verified HUJI, BGU, Technion, Haifa, and TAU programs by default as exact live proof targets', async () => {
    const fetcher = exactAdapterFetcher();
    const report = await runAdmissionsLiveProof({ fetcher });

    expect(report.summary).toMatchObject({
      total: 95,
      exactReproduced: 95,
      partial: 0,
      blocked: 0,
      failed: 0,
    });
    expect(report.results.map((result) => result.proof.id)).toEqual([
      'huji-accounting-live',
      'huji-biology-live',
      'huji-business-live',
      'huji-communication-live',
      'huji-cs-live',
      'huji-datascience-live',
      'huji-economics-live',
      'huji-education-live',
      'huji-huji_accounting-live',
      'huji-huji_biology-live',
      'huji-huji_business-live',
      'huji-huji_cs-live',
      'huji-huji_datascience-live',
      'huji-huji_economics-live',
      'huji-huji_law-live',
      'huji-huji_medicine-live',
      'huji-huji_occupational_therapy-live',
      'huji-huji_psychology-live',
      'huji-huji_socialwork-live',
      'huji-law-live',
      'huji-medicine-live',
      'huji-nursing-live',
      'huji-nutrition-live',
      'huji-occupational_therapy-live',
      'huji-pharmacy-live',
      'huji-political_science-live',
      'huji-psychology-live',
      'huji-social_work-live',
      'bgu-accounting-live',
      'bgu-bgu_accounting-live',
      'bgu-biology-live',
      'bgu-bgu_biology-live',
      'bgu-business-live',
      'bgu-bgu_business-live',
      'bgu-cs-live',
      'bgu-bgu_cs-live',
      'bgu-datascience-live',
      'bgu-bgu_datascience-live',
      'bgu-economics-live',
      'bgu-bgu_economics-live',
      'bgu-ee-live',
      'bgu-bgu_ee-live',
      'bgu-me-live',
      'bgu-bgu_me-live',
      'bgu-bgu_industrial-live',
      'bgu-bgu_medicine-live',
      'bgu-bgu_nursing-live',
      'bgu-psychology-live',
      'bgu-bgu_psychology-live',
      'bgu-social_work-live',
      'bgu-bgu_socialwork-live',
      'technion-cs-live',
      'technion-technion_cs-live',
      'technion-datascience-live',
      'technion-technion_datascience-live',
      'technion-ee-live',
      'technion-technion_ee-live',
      'technion-me-live',
      'technion-technion_me-live',
      'technion-medicine-live',
      'technion-technion_medicine-live',
      'technion-technion_biomedical-live',
      'technion-technion_civil-live',
      'technion-technion_industrial-live',
      'haifa-cs-live',
      'tau-digital-sciences-live',
      'tau-nursing-live',
      'tau-psychology-live',
      'tau-social-work-live',
      'tau-social-work-legacy-live',
      'tau-psychology-legacy-live',
      'tau-digital-sciences-legacy-live',
      'tau-law-live',
      'tau-law-legacy-live',
      'tau-accounting-live',
      'tau-accounting-legacy-live',
      'tau-business-live',
      'tau-business-legacy-live',
      'tau-architecture-live',
      'tau-biology-live',
      'tau-communication-live',
      'tau-political-science-live',
      'tau-education-live',
      'tau-economics-live',
      'tau-economics-legacy-live',
      'tau-cs-live',
      'tau-cs-legacy-live',
      'tau-ee-live',
      'tau-ee-legacy-live',
      'tau-me-live',
      'tau-me-legacy-live',
      'tau-occupational-live',
      'tau-occupational-legacy-live',
      'tau-industrial-live',
      'tau-biology-legacy-live',
    ]);
    expect(JSON.parse(String(fetcher.mock.calls[91][1]?.body))).toMatchObject({
      variables: { scoresData: { bagrut: '100', psicho: '520' } },
    });
    expect(JSON.parse(String(fetcher.mock.calls[93][1]?.body))).toMatchObject({
      variables: { scoresData: { bagrut: '110', psicho: '680' } },
    });
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
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 546 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getPrograms: {
              results: [{ receipt_threshol: [530], field_plain_id_programs: ['016211010000'] }],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: { hatama: 679 } } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [660],
              rejection_thresh: [659],
              field_plain_id_programs: ['107111050000', '107111030000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [580],
              rejection_thresh: [569],
              field_plain_id_programs: ['111011010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [580],
              rejection_thresh: [569],
              field_plain_id_programs: ['111011010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [660],
              rejection_thresh: [659],
              field_plain_id_programs: ['107111050000', '107111030000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_handasa: 664 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [652],
              rejection_thresh: [632],
              field_plain_id_programs: ['056011050000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [647],
              rejection_thresh: [646],
              field_plain_id_programs: ['141111010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [647],
              rejection_thresh: [646],
              field_plain_id_programs: ['141111010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_nihul: 677 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [610],
              rejection_thresh: [609],
              field_plain_id_programs: ['121111050000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_nihul: 677 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [610],
              rejection_thresh: [609],
              field_plain_id_programs: ['121111050000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [631],
              rejection_thresh: [563],
              field_plain_id_programs: ['088111010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [576],
              rejection_thresh: [570],
              field_plain_id_programs: ['045511050000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [530],
              rejection_thresh: [529],
              field_plain_id_programs: ['108511050000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [535],
              rejection_thresh: [534],
              field_plain_id_programs: ['103111030000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [550],
              rejection_thresh: [549],
              field_plain_id_programs: ['072311050000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [610],
              rejection_thresh: [600],
              field_plain_id_programs: ['101111050000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [610],
              rejection_thresh: [600],
              field_plain_id_programs: ['101111050000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [706],
              rejection_thresh: [695],
              field_plain_id_programs: ['036811010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [706],
              rejection_thresh: [695],
              field_plain_id_programs: ['036811010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [710],
              rejection_thresh: [690],
              field_plain_id_programs: ['051211010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [710],
              rejection_thresh: [690],
              field_plain_id_programs: ['051211010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [650],
              rejection_thresh: [616],
              field_plain_id_programs: ['054211010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [650],
              rejection_thresh: [616],
              field_plain_id_programs: ['054211010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [607],
              rejection_thresh: [606],
              field_plain_id_programs: ['016511010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [607],
              rejection_thresh: [606],
              field_plain_id_programs: ['016511010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama_meduyakim: 730 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [667],
              rejection_thresh: [647],
              field_plain_id_programs: ['057311010000'],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { getLastScore: { body: JSON.stringify({ hatama: 679 }) } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            getProgramByIdAndLang: {
              receipt_threshol: [576],
              rejection_thresh: [570],
              field_plain_id_programs: ['045511050000'],
            },
          },
        }),
      );

    const report = await runAdmissionsLiveProof({
      fetcher,
      targetIds: [
        'haifa-cs-live',
        'tau-digital-sciences-live',
        'tau-nursing-live',
        'tau-psychology-live',
        'tau-social-work-live',
        'tau-social-work-legacy-live',
        'tau-psychology-legacy-live',
        'tau-digital-sciences-legacy-live',
        'tau-law-live',
        'tau-law-legacy-live',
        'tau-accounting-live',
        'tau-accounting-legacy-live',
        'tau-architecture-live',
        'tau-biology-live',
        'tau-communication-live',
        'tau-political-science-live',
        'tau-education-live',
        'tau-economics-live',
        'tau-economics-legacy-live',
        'tau-cs-live',
        'tau-cs-legacy-live',
        'tau-ee-live',
        'tau-ee-legacy-live',
        'tau-me-live',
        'tau-me-legacy-live',
        'tau-occupational-live',
        'tau-occupational-legacy-live',
        'tau-industrial-live',
        'tau-biology-legacy-live',
      ],
    });

    expect(report.summary).toMatchObject({
      total: 29,
      exactReproduced: 28,
      failed: 1,
    });
    expect(report.results.map((result) => result.proof.status)).toEqual([
      'failed',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
      'succeeded',
    ]);
  });

  it('can include the full capability matrix without attempting blocked sources live', async () => {
    const report = await runAdmissionsLiveProof({
      includeCapabilityMatrix: true,
      fetcher: exactAdapterFetcher(),
    });

    expect(report.summary).toMatchObject({
      total: 106,
      exactReproduced: 95,
      partial: 8,
      blocked: 2,
    });
    expect(report.results.map((result) => result.proof.institutionId)).toEqual([
      ...Array(28).fill('huji'),
      ...Array(23).fill('bgu'),
      ...Array(13).fill('technion'),
      'haifa',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
      'tau',
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

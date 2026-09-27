import { describe, expect, it, vi } from 'vitest';

import { evaluateAdmissionsSourceProof } from '../admissionsSourceAdapters';
import {
  extractTauGeneralEnglishRequirement,
  extractTauComputerScienceCriticalRequirements,
  TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENT_MINIMUM,
  TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENTS_URL,
  TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
  TAU_COMPUTER_SCIENCE_OFFICIAL_PROOF_CAPTURES,
} from '@/data/admissions/tauComputerScienceVerification';
import {
  parseTauProgramThresholds,
  parseTauScoresBody,
  runTauAdmissionsProof,
} from './tauAdmissions';

const applicant = {
  bagrutAverage: 105.5,
  psychometric: 680,
};

const TAU_CS_REQUIREMENTS_HTML = `
  <main>
    <script>dynamic token and recommendations</script>
    תעודת בגרות ישראלית או תעודת סיום תיכון מחו"ל לפרוט ידיעת השפה העברית לפרוט ידיעת השפה האנגלית פרוט למידע המלא
    <h2>תנאים בסיסיים מצטברים לקבלה</h2>
    הרשמה בעדיפות ראשונה התכנית נבחרה בעדיפות ראשונה
    פסיכומטרי ציון 660 לפחות או תואר בוגר (תואר ראשון) ממוסד אקדמי מוכר ע"י המל"ג בתחום מדעים מדויקים או הנדסה, בציון 80 ומעלה. על התוכנית לכלול קורסי בסיס מתמטיים שקולים ברמתם ובהיקפם לקורסים הנלמדים בביה"ס למדעי המחשב
    ידע במתמטיקה ציון 80 לפחות במתמטיקה בהיקף של 5 יח"ל או בעלי ציון 70-79 במתמטיקה בהיקף 5 יח"ל וציון של 75 לפחות בבחינת הסיווג במתמטיקה או ציון 88 לפחות במתמטיקה בהיקף של 4 יח"ל; או ציון 75-87 במתמטיקה בהיקף 4 יח"ל וציון של 75 לפחות ב בחינת הסיווג במתמטיקה
    הנתונים שלך לא עומדים בדרישות אפיקי קבלה
    <span>תשפ"ז 705 704</span>
    <p>ציון התאמה מדעים מדוייקים-מועמד שנבחן ב-5 יח"ל במתמטיקה ובפיזיקה בציון 55 לפחות בכל אחד מהם, יקבל תוספת של 10 נקודות בונוס לציון ההתאמה הרגיל.</p>
  </main>`;
const TAU_GENERAL_ENGLISH_REQUIREMENTS_HTML = `
  <main>
    <h2>תנאים אוניברסיטאים כלליים</h2>
    <p>ב. ידיעת השפה - סיווג לרמת אנגלית</p>
    <ul><li>כל המועמדות והמועמדים נדרשים להגיע לרמת מתקדמים א' לפחות באנגלית (100 נקודות במבחן המיון באנגלית במסגרת הבחינה הפסיכומטרית או בחינת אמיר"ם ) ולרמת פטור עד סוף שנה א' ללימודים</li>
    <li>המועד האחרון לקבלה כמפורט בלוח הזמנים</li></ul>
    <p>ג. ידיעת השפה העברית</p>
  </main>`;

const tauCsProgram = {
  targetId: 'tau-cs-live',
  pairId: 'cs__tau',
  id: 'cs',
  name: 'Computer Science',
  nodeId: 8220,
  externalId: '036811010000',
  scoreField: 'hatama_meduyakim',
};

function tauCsThresholdResponse(overrides: Record<string, unknown> = {}) {
  return jsonResponse({
    data: {
      getProgramByIdAndLang: {
        nid: '8220',
        title: 'תואר ראשון במדעי המחשב',
        receipt_threshol: [705, 705],
        rejection_thresh: [704, 704],
        field_registration_comments: null,
        field_plain_id_programs: ['036811010000', '036811040455'],
        ...overrides,
      },
    },
  });
}

function tauCsFetcher(options?: {
  score?: Record<string, unknown>;
  threshold?: Record<string, unknown>;
  requirementsHtml?: string;
  englishRequirementsHtml?: string;
}) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      jsonResponse({
        data: { getLastScore: { body: options?.score ?? { hatama_meduyakim: '730' } } },
      }),
    )
    .mockResolvedValueOnce(tauCsThresholdResponse(options?.threshold))
    .mockResolvedValueOnce(
      new Response(options?.requirementsHtml ?? TAU_CS_REQUIREMENTS_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    )
    .mockResolvedValueOnce(
      new Response(options?.englishRequirementsHtml ?? TAU_GENERAL_ENGLISH_REQUIREMENTS_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    );
}

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
        'derivedVerdict',
      ],
      normalizedPayload: {
        programId: 'tau_datascience',
        selectedScoreField: 'hatama_handasa',
        selectedScore: 704,
        acceptanceThreshold: 700,
        rejectionThreshold: 680,
        matchedProgramIds: ['056011050000'],
        derivedVerdict: 'accepted',
        decisionProvenance: 'verified_derivation',
      },
    });
  });

  it('keeps medicine preliminary eligibility separate from the published final selection cutoffs', async () => {
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
              field_registration_comments:
                '<p><strong>ציון התאמה רפואה ראשוני - 726.44</strong></p>' +
                '<p><strong><u>קבלה</u> - ציון התאמה רפואה כולל מור - 743.57</strong></p>' +
                '<p><strong><u>דחיה</u> - ציון התאמה רפואה כולל מור - 742.52 ומטה</strong></p>',
              field_plain_id_programs: ['011167010000'],
            },
          },
        }),
      );

    const proof = await runTauAdmissionsProof({
      applicant: {
        bagrutAverage: 115,
        psychometric: 760,
        psychometricSubscores: { english: 130, math: 130, verbal: 130 },
      },
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
        derivedVerdict: 'eligible_to_apply',
        decisionProvenance: 'verified_derivation',
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
      derivedVerdict: 'accepted',
      decisionProvenance: 'verified_derivation',
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
      derivedVerdict: 'pending',
      decisionProvenance: 'verified_derivation',
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
        derivedVerdict: 'accepted',
        decisionProvenance: 'verified_derivation',
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

  it('extracts only stable TAU CS requirements and excludes dynamic page markup', () => {
    const requirements = extractTauComputerScienceCriticalRequirements(TAU_CS_REQUIREMENTS_HTML);

    expect(requirements).toContain('ציון 660 לפחות');
    expect(requirements).toContain('ציון של 75 לפחות');
    expect(requirements).toContain('תוספת של 10 נקודות בונוס');
    expect(requirements).toContain('תעודת בגרות ישראלית');
    expect(requirements).not.toContain('dynamic token');
    expect(TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('extracts the official English level and numeric minimum from the general admissions page', () => {
    const requirement = extractTauGeneralEnglishRequirement(TAU_GENERAL_ENGLISH_REQUIREMENTS_HTML);

    expect(requirement).toContain("מתקדמים א' לפחות באנגלית");
    expect(requirement).toContain('100 נקודות');
    expect(requirement).toContain("לרמת פטור עד סוף שנה א' ללימודים");
    expect(requirement).not.toContain('המועד האחרון לקבלה');
    expect(TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENT_MINIMUM).toBe(100);
  });

  it('replays a live TAU Computer Science capture through its exact score field and current node', async () => {
    const fetcher = tauCsFetcher();
    const acceptedCapture = TAU_COMPUTER_SCIENCE_OFFICIAL_PROOF_CAPTURES.find(
      (entry) => entry.expected.verdict === 'accepted',
    )!;

    const proof = await runTauAdmissionsProof({
      applicant: acceptedCapture.applicant,
      fetcher,
      program: tauCsProgram,
    });

    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({
      operationName: 'getProgramByIdAndLang',
      variables: { nid: 8220, langcode: 'he' },
    });
    expect(fetcher.mock.calls[3][0]).toBe(TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENTS_URL);
    expect(proof).toMatchObject({
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      reviewedSourceFingerprint: TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      normalizedPayload: {
        programId: 'cs',
        selectedScoreField: 'hatama_meduyakim',
        selectedScore: 730,
        acceptanceThreshold: 705,
        rejectionThreshold: 704,
        matchedProgramIds: ['036811010000', '036811040455'],
        derivedVerdict: 'accepted',
      },
    });
  });

  it('replays the independently captured TAU CS below-cutoff score as below', async () => {
    const capture = TAU_COMPUTER_SCIENCE_OFFICIAL_PROOF_CAPTURES.find(
      (entry) => entry.expected.verdict === 'below',
    )!;
    const fetcher = tauCsFetcher({ score: { hatama_meduyakim: capture.expected.score } });
    const proof = await runTauAdmissionsProof({
      applicant: capture.applicant,
      fetcher,
      program: tauCsProgram,
    });

    expect(proof).toMatchObject({
      status: 'succeeded',
      reviewedSourceFingerprint: TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      normalizedPayload: {
        selectedScore: 618,
        acceptanceThreshold: 705,
        rejectionThreshold: 704,
        derivedVerdict: 'below',
      },
    });
  });

  it('uses the explicit TAU Bagrut average instead of the generic profile average', async () => {
    const fetcher = tauCsFetcher();
    await runTauAdmissionsProof({
      applicant: {
        bagrutAverage: 95,
        psychometric: 730,
        extraInputs: { tauBagrutAverage: 115 },
      },
      fetcher,
      program: tauCsProgram,
    });

    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
      variables: { scoresData: { bagrut: '115' } },
    });
  });

  it('blocks TAU CS before network access when the official TAU Bagrut average is missing', async () => {
    const fetcher = tauCsFetcher();
    const proof = await runTauAdmissionsProof({
      applicant: { bagrutAverage: 115, psychometric: 730 },
      fetcher,
      program: tauCsProgram,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(proof).toMatchObject({
      status: 'blocked',
      capability: 'blocked',
      proofLevel: 'blocked',
      blockedReason: 'TAU Computer Science requires an explicit TAU Bagrut average from 50 to 130',
    });
  });

  it.each([
    [
      'TAU Bagrut average below range',
      { bagrutAverage: 115, psychometric: 730, extraInputs: { tauBagrutAverage: 49.9 } },
    ],
    [
      'TAU Bagrut average above range',
      { bagrutAverage: 115, psychometric: 730, extraInputs: { tauBagrutAverage: 130.1 } },
    ],
    [
      'psychometric score below range',
      { bagrutAverage: 115, psychometric: 199, extraInputs: { tauBagrutAverage: 115 } },
    ],
    [
      'psychometric score above range',
      { bagrutAverage: 115, psychometric: 801, extraInputs: { tauBagrutAverage: 115 } },
    ],
  ])('blocks TAU CS before network access for %s', async (_label, applicantInput) => {
    const fetcher = tauCsFetcher();
    const proof = await runTauAdmissionsProof({
      applicant: applicantInput,
      fetcher,
      program: tauCsProgram,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(proof.status).toBe('blocked');
  });

  it('does not fall back to a general score field when TAU CS omits its reviewed exact-sciences score', async () => {
    const proof = await runTauAdmissionsProof({
      applicant: {
        bagrutAverage: 115,
        psychometric: 730,
        extraInputs: { tauBagrutAverage: 115 },
      },
      fetcher: tauCsFetcher({ score: { hatama: 730, hatama_handasa: 730 } }),
      program: tauCsProgram,
    });

    expect(proof).toMatchObject({
      capability: 'score_only',
      proofLevel: 'partial_official',
      status: 'partial',
    });
    expect(proof.normalizedPayload.selectedScore).toBeUndefined();
    expect(proof.normalizedPayload.derivedVerdict).toBeUndefined();
  });

  const sourceDriftCases: Array<
    [string, Record<string, unknown> | undefined, string | undefined, string | undefined]
  > = [
    [
      'the official program mapping',
      { field_plain_id_programs: ['other-program'] },
      undefined,
      undefined,
    ],
    ['the published acceptance cutoff', { receipt_threshol: [706, 706] }, undefined, undefined],
    [
      'the critical published requirements',
      undefined,
      TAU_CS_REQUIREMENTS_HTML.replace('ציון 660 לפחות', 'ציון 661 לפחות'),
      undefined,
    ],
    [
      'the official general English minimum',
      undefined,
      undefined,
      TAU_GENERAL_ENGLISH_REQUIREMENTS_HTML.replace('100 נקודות', '101 נקודות'),
    ],
  ];

  it.each(sourceDriftCases)(
    'withholds exact TAU CS proof when %s drifts',
    async (_description, threshold, requirementsHtml, englishRequirementsHtml) => {
      const proof = await runTauAdmissionsProof({
        applicant: {
          bagrutAverage: 115,
          psychometric: 730,
          extraInputs: { tauBagrutAverage: 115 },
        },
        fetcher: tauCsFetcher({
          threshold,
          requirementsHtml,
          englishRequirementsHtml,
        }),
        program: tauCsProgram,
      });

      expect(proof).toMatchObject({
        capability: 'score_only',
        proofLevel: 'partial_official',
        status: 'partial',
      });
      expect(proof.normalizedPayload.derivedVerdict).toBeUndefined();
    },
  );
});

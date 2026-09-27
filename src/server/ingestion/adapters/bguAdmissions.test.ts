import { describe, expect, it, vi } from 'vitest';

import type { BagrutSubjectRecord } from '@/types';
import {
  BGU_COMPUTER_SCIENCE_CONTRACTS_BY_PAIR_ID,
  BGU_COMPUTER_SCIENCE_FIXTURES_BY_PAIR_ID,
  BGU_COMPUTER_SCIENCE_OFFICIAL_PROOF_CAPTURES_BY_TARGET_ID,
  BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT,
  BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
  fingerprintBguComputerScienceRules,
  normalizeBguComputerScienceRule,
} from '@/data/admissions/bguComputerScienceVerification';
import { BGU_PROGRAM_VERIFICATION_METADATA } from '@/data/admissions/bguProgramVerification';
import { evaluateProgramVerification } from '@/server/admissions/verification/programVerification';
import { runBguAdmissionsProof, runBguComputerScienceLiveVerification } from './bguAdmissions';
import type { AdmissionsAdapterContext } from '../admissionsSourceAdapters';

const BGU_CS_SOURCE_URL =
  'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1';

const BAGruT_RECORD: BagrutSubjectRecord = {
  schemaVersion: 1,
  sector: 'jewish',
  subjects: [{ subjectId: 'mathematics', units: 5, grade: 85 }],
};

type MockFetcher = ReturnType<typeof vi.fn<typeof fetch>>;

interface BguTestContext extends AdmissionsAdapterContext {
  fetcher: MockFetcher;
  program: NonNullable<AdmissionsAdapterContext['program']>;
}

function context(
  overrides: {
    fetcher?: MockFetcher;
    applicant?: AdmissionsAdapterContext['applicant'];
  } = {},
): BguTestContext {
  return {
    fetcher:
      overrides.fetcher ??
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse({ items: [currentRule()] }))
        .mockResolvedValueOnce(htmlResponse(879)),
    program: {
      targetId: 'bgu-bgu_cs-live',
      pairId: 'bgu_cs__bgu',
      id: 'bgu_cs',
      name: 'Computer Science',
      externalId: 'dep232-pat1-spe3',
      searchText: BGU_CS_SOURCE_URL,
    },
    applicant: overrides.applicant ?? {
      psychometric: 800,
      bagrutAverage: 120,
      extraInputs: {
        bguBagrutAverage: 120,
        psychometricMath: 150,
        psychometricVerbal: 150,
        psychometricEnglish: 150,
        bguLanguageRequirementsConfirmed: true,
        bagrutSubjectRecord: BAGruT_RECORD,
      },
    },
  };
}

function currentRule(overrides: Record<string, unknown> = {}) {
  return {
    department: 232,
    path: 1,
    specialization: 3,
    sekem_label: 'סכם כמותי ',
    psycho_sekem: 720,
    psycho_value: 600,
    psycho_info:
      "1=מתמטיקה=90/4 או 80/5$3=חשיבה כמותית=125$4=רמה באנגלית=בסיסי$5=רמה בעברית לנדרשים=רמה ה'",
    bagrut_info: "רמה באנגלית=בסיסי$רמה בעברית לנדרשים=רמה ה'",
    ...overrides,
  };
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function htmlResponse(score: number) {
  return new Response(
    `<script>parent.main.document.getElementById("on_c_val").innerHTML = ${score};</script>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=ISO-8859-8-I' } },
  );
}

describe('BGU Computer Science official proof', () => {
  it('publishes pair-specific contracts, captured fixtures, and calculated rule fingerprints', () => {
    expect(normalizeBguComputerScienceRule({ items: [currentRule()] })).toEqual(
      BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT,
    );
    expect(fingerprintBguComputerScienceRules(BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT)).toBe(
      BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
    );
    expect(BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT).toMatch(/^sha256:[a-f0-9]{64}$/);

    for (const pairId of ['cs__bgu', 'bgu_cs__bgu']) {
      const contract = BGU_COMPUTER_SCIENCE_CONTRACTS_BY_PAIR_ID[pairId];
      const fixtures = BGU_COMPUTER_SCIENCE_FIXTURES_BY_PAIR_ID[pairId];
      expect(contract).toMatchObject({
        pairId,
        institutionId: 'bgu',
        source: { url: BGU_CS_SOURCE_URL },
        calculation: {
          mode: 'official_replay',
          cutoff: { acceptance: 720, rejection: 720 },
          requiredInputs: [
            'bgu_bagrut_average',
            'bgu_language_requirements',
            'psychometric_math',
            'psychometric_verbal',
            'psychometric_english',
            'bagrut_subject_record',
          ],
        },
        proof: {
          state: 'verified',
          comparedScore: true,
          comparedVerdict: true,
          sourceFingerprint: BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
        },
      });
      expect(fixtures.map((fixture) => fixture.expected)).toEqual([
        { score: 879, verdict: 'accepted' },
        { score: 636, verdict: 'below' },
      ]);
      expect(BGU_PROGRAM_VERIFICATION_METADATA[pairId].contract).toEqual(contract);
      expect(
        BGU_COMPUTER_SCIENCE_OFFICIAL_PROOF_CAPTURES_BY_TARGET_ID[contract.source.targetId],
      ).toHaveLength(2);
      expect(
        evaluateProgramVerification({
          contract,
          fixtures,
          currentAdmissionCycle: '2026-2027',
          currentSourceFingerprint: BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
        }).capability,
      ).toBe('exact');
    }
  });

  it('uses the quantitative simulator and reproduces the current accepted capture', async () => {
    const request = context();
    const proof = await runBguAdmissionsProof(request);

    expect(proof.normalizedPayload).toMatchObject({
      pairId: 'bgu_cs__bgu',
      selectedScore: 879,
      acceptanceThreshold: 720,
      derivedVerdict: 'accepted',
      proofStatus: 'succeeded',
    });
    expect(proof.normalizedPayload.sourceFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(request.fetcher).toHaveBeenCalledTimes(2);
    expect(request.fetcher).toHaveBeenNthCalledWith(1, BGU_CS_SOURCE_URL);

    const [scoreUrl, scoreRequest] = request.fetcher.mock.calls[1];
    expect(scoreUrl).toBe('https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmiTevaSekem');
    expect(scoreRequest?.headers).toMatchObject({
      Referer: 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=4',
    });
    expect(new URLSearchParams(String(scoreRequest?.body))).toEqual(
      new URLSearchParams({
        on_grade_psycho_quantity: '',
        rn_count_other_subjects: '0',
        on_grade_other_quantity: '150',
        on_grade_other_verbal: '150',
        on_grade_other_psycho: '150',
        on_grade_other_average: '120',
        on_grade_prep_average: '',
      }),
    );
  });

  it('blocks an invalid rule mapping or changed critical gate fingerprint', async () => {
    const wrongMapping = context({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse({ items: [currentRule({ specialization: 13 })] })),
    });
    const blocked = await runBguAdmissionsProof(wrongMapping);
    expect(blocked.status).toBe('failed');
    expect(blocked.capability).toBe('blocked');

    const changedRule = context({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          jsonResponse({ items: [currentRule({ psycho_info: '3=חשיבה כמותית=130' })] }),
        )
        .mockResolvedValueOnce(htmlResponse(879)),
    });
    const partial = await runBguAdmissionsProof(changedRule);
    expect(partial.status).toBe('partial');
    expect(partial.proofLevel).toBe('partial_official');
    expect(partial.normalizedPayload).toMatchObject({ proofStatus: 'partial' });
  });

  it('rejects an ambiguous pair and malformed score output instead of falling back to generic parsing', async () => {
    const wrongPairFetcher = vi.fn<typeof fetch>();
    const wrongPair = context({ fetcher: wrongPairFetcher });
    wrongPair.program.pairId = 'cs__bgu';
    const pairProof = await runBguAdmissionsProof(wrongPair);
    expect(pairProof.capability).toBe('blocked');
    expect(wrongPairFetcher).not.toHaveBeenCalled();

    const malformedFetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ items: [currentRule()] }))
      .mockResolvedValueOnce(new Response('<input value="879">'));
    const malformed = await runBguAdmissionsProof(context({ fetcher: malformedFetcher }));
    expect(malformed.status).toBe('failed');
    expect(malformed.capability).toBe('blocked');
    expect(malformed.normalizedPayload).toEqual({});
  });

  it('returns a sanitized current two-fixture report only when both live comparisons and rule fingerprints match', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ items: [currentRule()] }))
      .mockResolvedValueOnce(htmlResponse(879))
      .mockResolvedValueOnce(jsonResponse({ items: [currentRule()] }))
      .mockResolvedValueOnce(htmlResponse(636));

    const report = await runBguComputerScienceLiveVerification({
      fetcher,
      checkedAt: new Date('2026-09-27T06:44:20Z'),
    });

    expect(report).toMatchObject({
      pairId: 'bgu_cs__bgu',
      checkedAt: '2026-09-27T06:44:20.000Z',
      passed: true,
      comparisons: [
        {
          expectedScore: 879,
          actualScore: 879,
          expectedVerdict: 'accepted',
          actualVerdict: 'accepted',
          scoreMatches: true,
          verdictMatches: true,
          sourceFingerprintMatches: true,
        },
        {
          expectedScore: 636,
          actualScore: 636,
          expectedVerdict: 'below',
          actualVerdict: 'below',
          scoreMatches: true,
          verdictMatches: true,
          sourceFingerprintMatches: true,
        },
      ],
    });
    expect(JSON.stringify(report)).not.toContain('psychometricMath');
    expect(JSON.stringify(report)).not.toContain('bguBagrutAverage');
  });

  it('blocks before a score request when required quantitative applicant inputs are missing', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const request = context({
      fetcher,
      applicant: {
        psychometric: 800,
        bagrutAverage: 120,
        extraInputs: { bguBagrutAverage: 120 },
      },
    });

    const proof = await runBguAdmissionsProof(request);

    expect(proof.status).toBe('failed');
    expect(proof.capability).toBe('blocked');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [110.25, 'succeeded'],
    [130, 'succeeded'],
    [49.99, 'failed'],
    [130.01, 'failed'],
  ] as const)(
    'accepts only official Bagrut averages in range (average %s)',
    async (average, expectedStatus) => {
      const request = context();
      request.applicant.extraInputs!.bguBagrutAverage = average;

      const proof = await runBguAdmissionsProof(request);

      expect(proof.status).toBe(expectedStatus);
      if (expectedStatus === 'succeeded') {
        expect(
          new URLSearchParams(String(request.fetcher.mock.calls[1][1]?.body)).get(
            'on_grade_other_average',
          ),
        ).toBe(String(average));
      } else {
        expect(proof.capability).toBe('blocked');
        expect(request.fetcher).not.toHaveBeenCalled();
      }
    },
  );

  it('requires quantitative, verbal, and English component scores within official calculator bounds', async () => {
    const request = context();
    request.applicant.extraInputs!.psychometricVerbal = 49;

    const proof = await runBguAdmissionsProof(request);

    expect(proof.capability).toBe('blocked');
    expect(request.fetcher).not.toHaveBeenCalled();
  });

  it('blocks malformed Bagrut subject records and unconfirmed language gates', async () => {
    const malformedRecord = context();
    malformedRecord.applicant.extraInputs!.bagrutSubjectRecord!.subjects[0].grade = 101;
    const malformedProof = await runBguAdmissionsProof(malformedRecord);
    expect(malformedProof.capability).toBe('blocked');
    expect(malformedRecord.fetcher).not.toHaveBeenCalled();

    const unconfirmedLanguage = context();
    unconfirmedLanguage.applicant.extraInputs!.bguLanguageRequirementsConfirmed = false;
    const languageProof = await runBguAdmissionsProof(unconfirmedLanguage);
    expect(languageProof.capability).toBe('blocked');
    expect(unconfirmedLanguage.fetcher).not.toHaveBeenCalled();
  });

  it('keeps the existing BGU score endpoint and generic parsing for programmes outside the corrected quantitative families', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ items: [{ psycho_sekem: 620 }] }))
      .mockResolvedValueOnce(new Response('<script>on_final_sekem.value = 875;</script>'));
    const request = {
      fetcher,
      program: {
        targetId: 'bgu-communication-live',
        pairId: 'communication__bgu',
        id: 'communication',
        name: 'Communication',
        searchText:
          'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_institution=0&p_dep1=183&p_pat1=2',
      },
      applicant: { psychometric: 800, bagrutAverage: 120 },
    } satisfies AdmissionsAdapterContext & { fetcher: MockFetcher };

    const proof = await runBguAdmissionsProof(request);

    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: 875,
      derivedVerdict: 'accepted',
    });
    expect(fetcher.mock.calls[1][0]).toBe('https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitSekem');
  });
});

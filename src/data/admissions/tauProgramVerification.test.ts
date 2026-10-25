import { describe, expect, it, vi } from 'vitest';

import {
  TAU_PROGRAM_VERIFICATION_METADATA,
  TAU_BIOLOGY_CONTRACT,
  TAU_LEGACY_BIOLOGY_CONTRACT,
  TAU_ECONOMICS_CONTRACT,
  TAU_LEGACY_ECONOMICS_CONTRACT,
  TAU_INDUSTRIAL_CONTRACT,
  TAU_EE_CONTRACT,
  TAU_LEGACY_EE_CONTRACT,
  TAU_ME_CONTRACT,
  TAU_LEGACY_ME_CONTRACT,
  TAU_LEGACY_SOCIAL_WORK_CONTRACT,
  TAU_COMMUNICATION_CONTRACT,
  TAU_POLITICAL_SCIENCE_CONTRACT,
  TAU_EDUCATION_CONTRACT,
  TAU_OCCUPATIONAL_CONTRACT,
  TAU_LEGACY_OCCUPATIONAL_CONTRACT,
  TAU_DIGITAL_SCIENCES_CONTRACT,
  TAU_DIGITAL_SCIENCES_FIXTURES,
  TAU_NURSING_CONTRACT,
  TAU_NURSING_FIXTURES,
  TAU_PSYCHOLOGY_CONTRACT,
  TAU_PSYCHOLOGY_FIXTURES,
  TAU_LEGACY_PSYCHOLOGY_CONTRACT,
  TAU_LEGACY_PSYCHOLOGY_FIXTURES,
  TAU_GENERIC_DATASCIENCE_CONTRACT,
  TAU_GENERIC_DATASCIENCE_FIXTURES,
  TAU_SOCIAL_WORK_CONTRACT,
  TAU_SOCIAL_WORK_FIXTURES,
} from './tauProgramVerification';
import {
  evaluateProgramVerification,
  fingerprintVerificationFixtures,
} from '@/server/admissions/verification/programVerification';
import {
  evaluateTauDigitalSciencesGates,
  TAU_DIGITAL_SCIENCES_POLICY,
} from '@/server/admissions/tauDigitalSciencesPolicy';
import { TAU_NURSING_POLICY } from '@/server/admissions/tauNursingPolicy';
import { TAU_PSYCHOLOGY_POLICY } from '@/server/admissions/tauPsychologyPolicy';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';

describe('TAU programme requirements URLs', () => {
  it('uses the canonical node-redirect URLs for all 12 affected contracts', () => {
    const expectedUrls = {
      [TAU_BIOLOGY_CONTRACT.pairId]: 'https://go.tau.ac.il/he/life/ba/bio?v=admission-requirements',
      [TAU_LEGACY_BIOLOGY_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/life/ba/bio?v=admission-requirements',
      [TAU_COMMUNICATION_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/social-sciences/ba/communications?v=admission-requirements',
      [TAU_EDUCATION_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/education/ba?v=admission-requirements',
      [TAU_ECONOMICS_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/social-sciences/ba/economics?v=admission-requirements',
      [TAU_LEGACY_ECONOMICS_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/social-sciences/ba/economics?v=admission-requirements',
      [TAU_EE_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/engineering/ba/electrical?v=admission-requirements',
      [TAU_LEGACY_EE_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/engineering/ba/electrical?v=admission-requirements',
      [TAU_ME_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/engineering/ba/mechanical?v=admission-requirements',
      [TAU_LEGACY_ME_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/engineering/ba/mechanical?v=admission-requirements',
      [TAU_OCCUPATIONAL_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/med/ba/occu?v=admission-requirements',
      [TAU_LEGACY_OCCUPATIONAL_CONTRACT.pairId]:
        'https://go.tau.ac.il/he/med/ba/occu?v=admission-requirements',
    };
    const oldUrls = [
      'https://go.tau.ac.il/he/life-sciences/ba/biology?v=admission-requirements',
      'https://go.tau.ac.il/he/social-sciences/ba/communication?v=admission-requirements',
      'https://go.tau.ac.il/he/social-sciences/ba/education?v=admission-requirements',
      'https://go.tau.ac.il/he/management/ba/economics?v=admission-requirements',
      'https://go.tau.ac.il/he/engineering/ba/electrical-engineering?v=admission-requirements',
      'https://go.tau.ac.il/he/engineering/ba/mechanical-engineering?v=admission-requirements',
      'https://go.tau.ac.il/he/med/ba/occupational-therapy?v=admission-requirements',
    ];
    const actualUrls = Object.fromEntries(
      Object.keys(expectedUrls).map((pairId) => [
        pairId,
        TAU_PROGRAM_VERIFICATION_METADATA[pairId].requirementsUrl,
      ]),
    );

    expect(actualUrls).toEqual(expectedUrls);
    for (const url of Object.values(actualUrls)) {
      for (const oldUrl of oldUrls) {
        expect(url).not.toContain(oldUrl);
      }
    }
  });
});

describe('TAU Digital Sciences verification artifact', () => {
  it('passes the composed pair-verification gate', () => {
    expect(fingerprintVerificationFixtures(TAU_DIGITAL_SCIENCES_FIXTURES)).toBe(
      TAU_DIGITAL_SCIENCES_CONTRACT.fixtureSetFingerprint,
    );

    expect(
      evaluateProgramVerification({
        contract: TAU_DIGITAL_SCIENCES_CONTRACT,
        fixtures: TAU_DIGITAL_SCIENCES_FIXTURES,
        currentAdmissionCycle: '2026-2027',
        currentSourceFingerprint: TAU_DIGITAL_SCIENCES_CONTRACT.sourceFingerprint,
      }),
    ).toEqual({
      state: 'exact',
      capability: 'exact',
      issues: [],
    });
  });

  it('keeps the runtime policy aligned with the reviewed programme contract', () => {
    expect(TAU_DIGITAL_SCIENCES_POLICY).toMatchObject({
      admissionCycle: TAU_DIGITAL_SCIENCES_CONTRACT.admissionCycle,
      officialProgramId: TAU_DIGITAL_SCIENCES_CONTRACT.officialProgramId,
      acceptanceCutoff: TAU_DIGITAL_SCIENCES_CONTRACT.calculation.cutoff.acceptance,
      rejectionCutoff: TAU_DIGITAL_SCIENCES_CONTRACT.calculation.cutoff.rejection,
    });
  });

  it.each(TAU_DIGITAL_SCIENCES_FIXTURES)(
    'replays $id through the reviewed gates and official adapter contract',
    async (fixture) => {
      const psychometricEnglish = Number(fixture.input.psychometricEnglish);
      const bagrutSubjectRecord = fixture.input.bagrutSubjectRecord!;
      const gateResult = evaluateTauDigitalSciencesGates({
        degreeId: 'tau_datascience',
        psychometric: fixture.input.psychometric,
        bagrut: fixture.input.bagrut,
        extraInputs: {
          psychometricEnglish,
          bagrutSubjectRecord,
        },
      });
      expect(gateResult.state).toBe('pass');

      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          jsonResponse({
            data: {
              getLastScore: {
                body: JSON.stringify({ hatama_handasa: fixture.expected.score }),
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
                    title: 'תואר ראשון במדעים דיגיטליים להיי-טק',
                    field_plain_id_programs: [TAU_DIGITAL_SCIENCES_CONTRACT.officialProgramId],
                    receipt_threshol: [TAU_DIGITAL_SCIENCES_CONTRACT.calculation.cutoff.acceptance],
                    rejection_thresh: [TAU_DIGITAL_SCIENCES_CONTRACT.calculation.cutoff.rejection],
                  },
                ],
              },
            },
          }),
        );

      const proof = await runTauAdmissionsProof({
        fetcher,
        program: {
          id: 'tau-digital-sciences',
          name: 'Digital Sciences for High-Tech',
          externalId: TAU_DIGITAL_SCIENCES_CONTRACT.officialProgramId,
          searchText: 'מדעים דיגיטליים',
          scoreField: 'hatama_handasa',
        },
        applicant: {
          psychometric: fixture.input.psychometric,
          bagrutAverage: fixture.input.bagrut,
          exactSciencesBonusEligible:
            gateResult.state === 'pass' && gateResult.exactSciencesBonusEligible,
        },
      });

      expect(proof.normalizedPayload).toMatchObject({
        selectedScore: fixture.expected.score,
        derivedVerdict: fixture.expected.verdict,
        matchedProgramIds: [TAU_DIGITAL_SCIENCES_CONTRACT.officialProgramId],
      });
      expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
        variables: {
          scoresData: {
            reali10: fixture.input.exactSciencesBonusEligible ? 1 : 0,
          },
        },
      });
    },
  );

  it('activates Nursing as exact eligibility-to-apply rather than acceptance', () => {
    expect(fingerprintVerificationFixtures(TAU_NURSING_FIXTURES)).toBe(
      TAU_NURSING_CONTRACT.fixtureSetFingerprint,
    );
    expect(TAU_NURSING_POLICY).toMatchObject({
      admissionCycle: TAU_NURSING_CONTRACT.admissionCycle,
      officialProgramId: TAU_NURSING_CONTRACT.officialProgramId,
      acceptanceCutoff: TAU_NURSING_CONTRACT.calculation.cutoff.acceptance,
      rejectionCutoff: TAU_NURSING_CONTRACT.calculation.cutoff.rejection,
    });
    expect(
      evaluateProgramVerification({
        contract: TAU_NURSING_CONTRACT,
        fixtures: TAU_NURSING_FIXTURES,
        currentAdmissionCycle: '2026-2027',
        currentSourceFingerprint: TAU_NURSING_CONTRACT.sourceFingerprint,
      }),
    ).toEqual({
      state: 'exact',
      capability: 'exact',
      issues: [],
    });
    expect(TAU_NURSING_FIXTURES[0].expected.verdict).toBe('eligible_to_apply');
  });

  it('activates Psychology only when the node-specific contract and fixtures agree', () => {
    expect(fingerprintVerificationFixtures(TAU_PSYCHOLOGY_FIXTURES)).toBe(
      TAU_PSYCHOLOGY_CONTRACT.fixtureSetFingerprint,
    );
    expect(TAU_PSYCHOLOGY_POLICY).toMatchObject({
      admissionCycle: TAU_PSYCHOLOGY_CONTRACT.admissionCycle,
      officialProgramId: TAU_PSYCHOLOGY_CONTRACT.officialProgramId,
      acceptanceCutoff: TAU_PSYCHOLOGY_CONTRACT.calculation.cutoff.acceptance,
      rejectionCutoff: TAU_PSYCHOLOGY_CONTRACT.calculation.cutoff.rejection,
    });
    expect(
      evaluateProgramVerification({
        contract: TAU_PSYCHOLOGY_CONTRACT,
        fixtures: TAU_PSYCHOLOGY_FIXTURES,
        currentAdmissionCycle: '2026-2027',
        currentSourceFingerprint: TAU_PSYCHOLOGY_CONTRACT.sourceFingerprint,
      }),
    ).toEqual({
      state: 'exact',
      capability: 'exact',
      issues: [],
    });
  });

  it('keeps the legacy Psychology alias on the current node-specific proof', () => {
    expect(fingerprintVerificationFixtures(TAU_LEGACY_PSYCHOLOGY_FIXTURES)).toBe(
      TAU_LEGACY_PSYCHOLOGY_CONTRACT.fixtureSetFingerprint,
    );
    expect(
      evaluateProgramVerification({
        contract: TAU_LEGACY_PSYCHOLOGY_CONTRACT,
        fixtures: TAU_LEGACY_PSYCHOLOGY_FIXTURES,
        currentAdmissionCycle: '2026-2027',
        currentSourceFingerprint: TAU_LEGACY_PSYCHOLOGY_CONTRACT.sourceFingerprint,
      }),
    ).toEqual({
      state: 'exact',
      capability: 'exact',
      issues: [],
    });
  });

  it('keeps the generic data-science alias on the Digital Sciences proof', () => {
    expect(fingerprintVerificationFixtures(TAU_GENERIC_DATASCIENCE_FIXTURES)).toBe(
      TAU_GENERIC_DATASCIENCE_CONTRACT.fixtureSetFingerprint,
    );
    expect(
      evaluateProgramVerification({
        contract: TAU_GENERIC_DATASCIENCE_CONTRACT,
        fixtures: TAU_GENERIC_DATASCIENCE_FIXTURES,
        currentAdmissionCycle: '2026-2027',
        currentSourceFingerprint: TAU_GENERIC_DATASCIENCE_CONTRACT.sourceFingerprint,
      }),
    ).toEqual({
      state: 'exact',
      capability: 'exact',
      issues: [],
    });
  });

  it.each(TAU_SOCIAL_WORK_FIXTURES)(
    'replays the reviewed TAU Social Work score route for $id',
    async (fixture) => {
      expect(fingerprintVerificationFixtures(TAU_SOCIAL_WORK_FIXTURES)).toBe(
        TAU_SOCIAL_WORK_CONTRACT.fixtureSetFingerprint,
      );
      expect(
        evaluateProgramVerification({
          contract: TAU_SOCIAL_WORK_CONTRACT,
          fixtures: TAU_SOCIAL_WORK_FIXTURES,
          currentAdmissionCycle: '2026-2027',
          currentSourceFingerprint: TAU_SOCIAL_WORK_CONTRACT.sourceFingerprint,
        }),
      ).toEqual({
        state: 'exact',
        capability: 'exact',
        issues: [],
      });

      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          jsonResponse({
            data: {
              getLastScore: {
                body: JSON.stringify({ hatama: fixture.expected.score }),
              },
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: {
              getProgramByIdAndLang: {
                nid: '8299',
                title: 'תואר ראשון בעבודה סוציאלית',
                field_plain_id_programs: [TAU_SOCIAL_WORK_CONTRACT.officialProgramId],
                receipt_threshol: [TAU_SOCIAL_WORK_CONTRACT.calculation.cutoff.acceptance],
                rejection_thresh: [TAU_SOCIAL_WORK_CONTRACT.calculation.cutoff.rejection],
              },
            },
          }),
        );

      const proof = await runTauAdmissionsProof({
        fetcher,
        program: {
          targetId: 'tau-social-work-live',
          pairId: TAU_SOCIAL_WORK_CONTRACT.pairId,
          id: 'tau-social-work',
          name: 'Social Work',
          nodeId: 8299,
          externalId: TAU_SOCIAL_WORK_CONTRACT.officialProgramId,
          scoreField: 'hatama',
        },
        applicant: {
          psychometric: fixture.input.psychometric,
          bagrutAverage: fixture.input.bagrut,
        },
      });

      expect(proof.normalizedPayload).toMatchObject({
        selectedScore: fixture.expected.score,
        derivedVerdict: fixture.expected.verdict,
        matchedProgramIds: [TAU_SOCIAL_WORK_CONTRACT.officialProgramId],
      });
    },
  );
});

describe('TAU 2027 official rejection thresholds', () => {
  it.each([
    ['Biology', TAU_BIOLOGY_CONTRACT, 576, 575],
    ['legacy Biology', TAU_LEGACY_BIOLOGY_CONTRACT, 576, 575],
    ['Digital Sciences', TAU_DIGITAL_SCIENCES_CONTRACT, 652, 651],
    ['generic Data Science', TAU_GENERIC_DATASCIENCE_CONTRACT, 652, 651],
    ['Economics', TAU_ECONOMICS_CONTRACT, 610, 609],
    ['legacy Economics', TAU_LEGACY_ECONOMICS_CONTRACT, 610, 609],
    ['Industrial Engineering', TAU_INDUSTRIAL_CONTRACT, 667, 666],
    ['Electrical Engineering', TAU_EE_CONTRACT, 710, 709],
    ['legacy Electrical Engineering', TAU_LEGACY_EE_CONTRACT, 710, 709],
    ['Mechanical Engineering', TAU_ME_CONTRACT, 650, 649],
    ['legacy Mechanical Engineering', TAU_LEGACY_ME_CONTRACT, 650, 649],
    ['Social Work', TAU_SOCIAL_WORK_CONTRACT, 580, 579],
    ['legacy Social Work', TAU_LEGACY_SOCIAL_WORK_CONTRACT, 580, 579],
  ] as const)(
    'uses the official rejection cutoff and unchanged acceptance cutoff for %s',
    (_name, contract, acceptance, rejection) => {
      expect(contract.calculation.cutoff.acceptance).toBe(acceptance);
      expect(contract.calculation.cutoff.rejection).toBe(rejection);
    },
  );

  it('uses the official Digital Sciences cutoffs in the runtime policy', () => {
    expect(TAU_DIGITAL_SCIENCES_POLICY.acceptanceCutoff).toBe(652);
    expect(TAU_DIGITAL_SCIENCES_POLICY.rejectionCutoff).toBe(651);
  });

  it.each([
    ['Communication', TAU_COMMUNICATION_CONTRACT, 530, 529],
    ['Political Science', TAU_POLITICAL_SCIENCE_CONTRACT, 535, 534],
    ['Education', TAU_EDUCATION_CONTRACT, 550, 549],
    ['Occupational Therapy', TAU_OCCUPATIONAL_CONTRACT, 607, 606],
    ['legacy Occupational Therapy', TAU_LEGACY_OCCUPATIONAL_CONTRACT, 607, 606],
  ] as const)(
    'preserves the explicit cutoffs for non-target descendant %s',
    (_name, contract, acceptance, rejection) => {
      expect(contract.calculation.cutoff.acceptance).toBe(acceptance);
      expect(contract.calculation.cutoff.rejection).toBe(rejection);
    },
  );
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

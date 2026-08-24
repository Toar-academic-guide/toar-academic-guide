import { describe, expect, it, vi } from 'vitest';

import {
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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

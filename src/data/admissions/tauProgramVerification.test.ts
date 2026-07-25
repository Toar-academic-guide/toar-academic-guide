import { describe, expect, it, vi } from 'vitest';

import {
  TAU_DIGITAL_SCIENCES_CONTRACT,
  TAU_DIGITAL_SCIENCES_FIXTURES,
} from './tauProgramVerification';
import {
  evaluateProgramVerification,
  fingerprintVerificationFixtures,
} from '@/server/admissions/verification/programVerification';
import {
  evaluateTauDigitalSciencesGates,
  TAU_DIGITAL_SCIENCES_POLICY,
} from '@/server/admissions/tauDigitalSciencesPolicy';
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
        officialVerdict: fixture.expected.verdict,
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
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

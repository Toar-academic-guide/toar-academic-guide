import { createHash } from 'node:crypto';
import captures from '../../../docs/admissions-verification/2026-09-28-haifa-information-systems-tracks.json';
import policyEvidence from './haifaProgrammePolicies.json';
import { HAIFA_PROGRAM_VERIFICATION_METADATA } from './haifaProgramVerification';
import { HAIFA_INFORMATION_SYSTEMS_TRACKS } from '@/lib/haifaAdmissionsInputs';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import type { HaifaProgramVerificationMetadata } from './haifaProgramVerification';

const base = HAIFA_PROGRAM_VERIFICATION_METADATA.haifa_infosystems__haifa;

// Each selectable route binds its own official identity, captures and reviewed fingerprint.
// The ordinary single-major contract stays blocked in the catalogue completion ledger.
export const HAIFA_INFORMATION_SYSTEMS_TRACK_ARTIFACTS: Record<
  string,
  HaifaProgramVerificationMetadata
> = Object.fromEntries(
  HAIFA_INFORMATION_SYSTEMS_TRACKS.map((track) => {
    const capture = captures.records.find(
      (record) => record.officialProgramId === track.officialProgramId,
    )!;
    const sourceFingerprint = `sha256:${createHash('sha256')
      .update(
        JSON.stringify({
          track,
          capture,
          programmePolicy: policyEvidence.records.find(
            (record) => record.programme === 'infosystems',
          ),
          generalRequirements: policyEvidence.generalRequirements,
          deadlineSource: policyEvidence.deadlineSource,
        }),
      )
      .digest('hex')}`;
    const fixtures = base.fixtures.map((fixture, index) => ({
      ...fixture,
      id: `${fixture.id}:${track.value}`,
      input: {
        ...fixture.input,
        haifaInformationSystemsTrack: track.value,
        ...(track.partnerRequired
          ? { haifaInformationSystemsPartnerRequirementsConfirmed: true }
          : {}),
      },
      sourceFingerprint,
      capturedAt: capture.capturedAt,
      expected: {
        ...fixture.expected,
        score: Number(
          (index === 0 ? capture.high : capture.low).response.data[0].results?.[0].content?.find(
            (entry) => entry.label === 'הציון המשוקלל שלך',
          )?.value,
        ),
      },
    }));
    const requiredInputs = [
      ...base.contract.calculation.requiredInputs,
      'haifa_information_systems_track' as const,
    ];
    if (track.partnerRequired)
      requiredInputs.push('haifa_information_systems_partner_requirements');
    return [
      track.value,
      {
        contract: {
          ...base.contract,
          officialProgramId: track.officialProgramId,
          source: { ...base.contract.source, targetId: `haifa-infosystems-${track.value}-live` },
          calculation: {
            ...base.contract.calculation,
            requiredInputs,
            gates: [
              ...base.contract.calculation.gates,
              ...(track.partnerRequired
                ? [
                    {
                      id: 'partner_department',
                      kind: 'manual' as const,
                      field: 'haifaInformationSystemsPartnerRequirementsConfirmed',
                      description:
                        'Applicant confirms the second department requirements separately.',
                    },
                  ]
                : []),
            ],
          },
          fixtureIds: fixtures.map((fixture) => fixture.id),
          fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
          sourceFingerprint,
          proof: {
            state: 'verified',
            comparedScore: true,
            comparedVerdict: true,
            liveComparedAt: capture.capturedAt,
            sourceFingerprint,
          },
        },
        fixtures,
        ledgerReason:
          'Verified selected Information Systems track; ordinary single-major mapping remains unresolved.',
      } satisfies HaifaProgramVerificationMetadata,
    ];
  }),
);

export function getHaifaInformationSystemsTrackArtifact(track: string | undefined) {
  return track && Object.hasOwn(HAIFA_INFORMATION_SYSTEMS_TRACK_ARTIFACTS, track)
    ? HAIFA_INFORMATION_SYSTEMS_TRACK_ARTIFACTS[track]
    : undefined;
}

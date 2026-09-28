import type { OfficialProgramProofCapture } from './officialProgramProofCaptures';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import type { BguComputerScienceVerificationMetadata } from './bguComputerScienceVerification';
import {
  BGU_COMPUTER_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID,
  fingerprintBguComputerScienceRules,
  normalizeBguComputerScienceRule,
} from './bguComputerScienceVerification';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';

export const BGU_DATA_SCIENCE_SOURCE_URL =
  'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=13&p_degree_level=1';
export const BGU_DATA_SCIENCE_RULE_CAPTURE = {
  department: 232,
  path: 1,
  specialization: 13,
  sekem_label: 'סכם כמותי ',
  psycho_sekem: 720,
  psycho_value: 600,
  psycho_info:
    "1=מתמטיקה=90/4 או 80/5$3=חשיבה כמותית=125$4=רמה באנגלית=בסיסי$5=רמה בעברית לנדרשים=רמה ה'",
  bagrut_info: "רמה באנגלית=בסיסי$רמה בעברית לנדרשים=רמה ה'",
} as const;

// Current Data Science rules independently match the CS quantitative gates.
// Its mapping, fingerprint and official score captures remain pair-specific.
const snapshot = normalizeBguComputerScienceRule(BGU_DATA_SCIENCE_RULE_CAPTURE, 13);
if (!snapshot) throw new Error('Invalid captured BGU Data Science rules');
export const BGU_DATA_SCIENCE_SOURCE_FINGERPRINT = fingerprintBguComputerScienceRules(snapshot);

const CAPTURED_AT_BY_PAIR_ID = {
  datascience__bgu: ['2026-09-27T14:56:36.816Z', '2026-09-27T14:56:36.895Z'],
  bgu_datascience__bgu: ['2026-09-27T14:56:36.972Z', '2026-09-27T14:56:37.116Z'],
} as const;

const quantitativeArtifact = BGU_COMPUTER_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID.bgu_cs__bgu;

export const BGU_DATA_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID: Record<
  string,
  BguComputerScienceVerificationMetadata
> = Object.fromEntries(
  (['datascience', 'bgu_datascience'] as const).map((programId) => {
    const pairId = `${programId}__bgu` as keyof typeof CAPTURED_AT_BY_PAIR_ID;
    const captureTimes = CAPTURED_AT_BY_PAIR_ID[pairId];
    const fixtures = [
      {
        verdict: 'accepted' as const,
        psychometric: 800,
        average: 120,
        q: 150,
        v: 150,
        english: 150,
        score: 879,
      },
      {
        verdict: 'below' as const,
        psychometric: 600,
        average: 100,
        q: 125,
        v: 110,
        english: 100,
        score: 636,
      },
    ].map((capture, index) => ({
      pairId,
      id: `${pairId}:${capture.verdict}:2026-2027`,
      admissionCycle: '2026-2027',
      verdict: capture.verdict,
      input: {
        psychometric: capture.psychometric,
        bagrut: capture.average,
        bguBagrutAverage: capture.average,
        psychometricMath: capture.q,
        psychometricVerbal: capture.v,
        psychometricEnglish: capture.english,
        bguLanguageRequirementsConfirmed: true,
        bagrutSubjectRecord: {
          schemaVersion: 1 as const,
          sector: 'jewish' as const,
          subjects: [{ subjectId: 'mathematics', units: 5, grade: 85 }],
        },
      },
      expected: { score: capture.score, verdict: capture.verdict },
      capturedAt: captureTimes[index],
      sourceFingerprint: BGU_DATA_SCIENCE_SOURCE_FINGERPRINT,
    }));
    const contract = {
      ...quantitativeArtifact.contract,
      pairId,
      programId,
      officialProgramId: 'dep232-pat1-spe13',
      source: { targetId: `bgu-${programId}-live`, url: BGU_DATA_SCIENCE_SOURCE_URL },
      calculation: {
        ...quantitativeArtifact.contract.calculation,
        gates: quantitativeArtifact.contract.calculation.gates.map((gate) => ({
          ...gate,
          id: gate.id.replace('bgu-cs:', 'bgu-datascience:'),
        })),
      },
      fixtureIds: fixtures.map((fixture) => fixture.id),
      fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      sourceFingerprint: BGU_DATA_SCIENCE_SOURCE_FINGERPRINT,
      proof: {
        state: 'verified' as const,
        comparedScore: true,
        comparedVerdict: true,
        liveComparedAt: captureTimes[1],
        sourceFingerprint: BGU_DATA_SCIENCE_SOURCE_FINGERPRINT,
      },
    };
    return [
      pairId,
      {
        contract,
        fixtures,
        ledgerReason:
          'Verified against the current BGU Data Science programme mapping, quantitative gates, independent official Teva Sekem eligible/below captures, and matching source fingerprint.',
      },
    ];
  }),
);

export const BGU_DATA_SCIENCE_OFFICIAL_PROOF_CAPTURES_BY_TARGET_ID = Object.fromEntries(
  Object.values(BGU_DATA_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID).map(({ contract, fixtures }) => {
    const captures: OfficialProgramProofCapture[] = fixtures.map((fixture, index) => {
      const { psychometric, bagrut, ...extraInputs } = fixture.input;
      return {
        captureId: `${contract.source.targetId}:official-${index === 0 ? 'eligible' : 'below'}:2026-09-27`,
        capturedAt: fixture.capturedAt,
        officialUrl: 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmiTevaSekem',
        applicant: {
          psychometric,
          bagrutAverage: bagrut,
          extraInputs: extraInputs as AdmissionsExtraInputs,
        },
        expected: fixture.expected,
      };
    });
    return [contract.source.targetId, captures];
  }),
);

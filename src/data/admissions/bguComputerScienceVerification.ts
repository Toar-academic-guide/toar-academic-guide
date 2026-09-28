import { createHash } from 'node:crypto';

import type { OfficialProgramProofCapture } from './officialProgramProofCaptures';
import type { BagrutSubjectRecord } from '@/types';
import type {
  AdmissionsExtraInputs,
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import { BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY } from '@/server/admissions/bguComputerSciencePolicy';

export const BGU_COMPUTER_SCIENCE_SOURCE_URL = BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY.sourceUrl;
export const BGU_COMPUTER_SCIENCE_CALCULATOR_URL =
  BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY.calculatorUrl;
export const BGU_COMPUTER_SCIENCE_SCORE_URL =
  'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmiTevaSekem';
export const BGU_COMPUTER_SCIENCE_OFFICIAL_PROGRAM_ID = 'dep232-pat1-spe3';
export const BGU_COMPUTER_SCIENCE_CAPTURED_AT_BY_PAIR_ID = {
  cs__bgu: '2026-09-27T07:02:47.329Z',
  bgu_cs__bgu: '2026-09-27T07:02:47.312Z',
} as const;

export interface BguComputerScienceRuleSnapshot {
  mapping: {
    department: 232;
    path: 1;
    specialization: 3 | 13;
    label: 'סכם כמותי';
    year: 2027;
    semester: 1;
    degreeLevel: 1;
  };
  acceptanceThreshold: number;
  minimumPsychometric: number;
  psychometricInfo: string;
  bagrutInfo: string;
}

export const BGU_COMPUTER_SCIENCE_RULE_CAPTURE = {
  department: 232,
  path: 1,
  specialization: 3,
  sekem_label: 'סכם כמותי ',
  psycho_sekem: 720,
  psycho_value: 600,
  psycho_info:
    "1=מתמטיקה=90/4 או 80/5$3=חשיבה כמותית=125$4=רמה באנגלית=בסיסי$5=רמה בעברית לנדרשים=רמה ה'",
  bagrut_info: "רמה באנגלית=בסיסי$רמה בעברית לנדרשים=רמה ה'",
} as const;

function normalizedText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : undefined;
}

function numericValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\s*\d+(?:\.\d+)?\s*$/.test(value)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function normalizeBguComputerScienceRule(
  value: unknown,
  specialization: 3 | 13 = 3,
): BguComputerScienceRuleSnapshot | null {
  const payload = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  const items = payload?.items;
  if (items !== undefined && (!Array.isArray(items) || items.length !== 1)) return null;
  const item = Array.isArray(items) ? items[0] : value;
  const rule = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
  if (!rule) return null;

  const label = normalizedText(rule.sekem_label);
  const acceptanceThreshold = numericValue(rule.psycho_sekem);
  const minimumPsychometric = numericValue(rule.psycho_value);
  const psychometricInfo = normalizedText(rule.psycho_info);
  const bagrutInfo = normalizedText(rule.bagrut_info);

  if (
    numericValue(rule.department) !== 232 ||
    numericValue(rule.path) !== 1 ||
    numericValue(rule.specialization) !== specialization ||
    label !== 'סכם כמותי' ||
    acceptanceThreshold === undefined ||
    minimumPsychometric === undefined ||
    !psychometricInfo ||
    !bagrutInfo
  ) {
    return null;
  }

  return {
    mapping: {
      department: 232,
      path: 1,
      specialization,
      label,
      year: 2027,
      semester: 1,
      degreeLevel: 1,
    },
    acceptanceThreshold,
    minimumPsychometric,
    psychometricInfo,
    bagrutInfo,
  };
}

export function fingerprintBguComputerScienceRules(
  snapshot: BguComputerScienceRuleSnapshot,
): string {
  const normalized = {
    mapping: snapshot.mapping,
    acceptanceThreshold: snapshot.acceptanceThreshold,
    minimumPsychometric: snapshot.minimumPsychometric,
    psychometricInfo: snapshot.psychometricInfo,
    bagrutInfo: snapshot.bagrutInfo,
  };
  return `sha256:${createHash('sha256').update(JSON.stringify(normalized)).digest('hex')}`;
}

const reviewedRuleSnapshot = normalizeBguComputerScienceRule(BGU_COMPUTER_SCIENCE_RULE_CAPTURE);

if (!reviewedRuleSnapshot) {
  throw new Error('Invalid captured BGU Computer Science rule snapshot');
}

export const BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT: BguComputerScienceRuleSnapshot =
  reviewedRuleSnapshot;

export const BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT = fingerprintBguComputerScienceRules(
  BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT,
);

type BguComputerScienceFixtureInput = AdmissionsVerificationFixture['input'] & {
  psychometric: number;
  bagrut: number;
  bguBagrutAverage: number;
  psychometricMath: number;
  psychometricVerbal: number;
  psychometricEnglish: number;
  bguLanguageRequirementsConfirmed: boolean;
  bagrutSubjectRecord: BagrutSubjectRecord;
};

function fixtureInput(args: {
  psychometric: number;
  bagrut: number;
  bguBagrutAverage: number;
  psychometricMath: number;
  psychometricVerbal: number;
  psychometricEnglish: number;
}): BguComputerScienceFixtureInput {
  return {
    ...args,
    bguLanguageRequirementsConfirmed: true,
    bagrutSubjectRecord: {
      schemaVersion: 1,
      sector: 'jewish',
      subjects: [{ subjectId: 'mathematics', units: 5, grade: 85 }],
    },
  };
}

const BGU_COMPUTER_SCIENCE_ACCEPTED_INPUT = fixtureInput({
  psychometric: 800,
  bagrut: 120,
  bguBagrutAverage: 120,
  psychometricMath: 150,
  psychometricVerbal: 150,
  psychometricEnglish: 150,
});

const BGU_COMPUTER_SCIENCE_BELOW_INPUT = fixtureInput({
  psychometric: 600,
  bagrut: 100,
  bguBagrutAverage: 100,
  psychometricMath: 125,
  psychometricVerbal: 110,
  psychometricEnglish: 100,
});

function fixturesFor(
  pairId: 'cs__bgu' | 'bgu_cs__bgu',
  capturedAt: string,
): AdmissionsVerificationFixture[] {
  return [
    {
      id: `${pairId}:accepted:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'accepted',
      input: BGU_COMPUTER_SCIENCE_ACCEPTED_INPUT,
      expected: { score: 879, verdict: 'accepted' },
      sourceFingerprint: BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      capturedAt,
    },
    {
      id: `${pairId}:below:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'below',
      input: BGU_COMPUTER_SCIENCE_BELOW_INPUT,
      expected: { score: 636, verdict: 'below' },
      sourceFingerprint: BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      capturedAt,
    },
  ];
}

export interface BguComputerScienceVerificationMetadata {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
  ledgerReason: string;
}

function metadataFor(programId: 'cs' | 'bgu_cs'): BguComputerScienceVerificationMetadata {
  const pairId = programId === 'cs' ? 'cs__bgu' : 'bgu_cs__bgu';
  const capturedAt = BGU_COMPUTER_SCIENCE_CAPTURED_AT_BY_PAIR_ID[pairId];
  const fixtures = fixturesFor(pairId, capturedAt);
  const targetId = `bgu-${programId}-live`;
  const contract: AdmissionsProgramVerificationContract = {
    pairId,
    programId,
    institutionId: 'bgu',
    officialProgramId: BGU_COMPUTER_SCIENCE_OFFICIAL_PROGRAM_ID,
    admissionCycle: '2026-2027',
    source: { targetId, url: BGU_COMPUTER_SCIENCE_SOURCE_URL },
    calculation: {
      adapterId: 'bgu',
      mode: 'official_replay',
      formulaFamily: 'bgu_quantitative_sekhem',
      requiredInputs: [
        'bgu_bagrut_average',
        'bgu_language_requirements',
        'psychometric_math',
        'psychometric_verbal',
        'psychometric_english',
        'bagrut_subject_record',
      ],
      cutoff: {
        acceptance: BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT.acceptanceThreshold,
        rejection: BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT.acceptanceThreshold,
      },
      gates: [
        {
          id: 'bgu-cs:psychometric-minimum',
          kind: 'minimum',
          field: 'psychometric',
          minimum: BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT.minimumPsychometric,
          description: 'The official quantitative route requires psychometric total 600 or above.',
        },
        {
          id: 'bgu-cs:quantitative-subscore',
          kind: 'minimum',
          field: 'psychometricMath',
          minimum: 125,
          description:
            'The official quantitative route requires a quantitative subscore of 125 or above.',
        },
        {
          id: 'bgu-cs:mathematics-route',
          kind: 'subject',
          field: 'bagrutSubjectRecord',
          description: 'Mathematics must be 90 at 4 units or 80 at 5 units.',
        },
        {
          id: 'bgu-cs:language-classifications',
          kind: 'manual',
          field: 'bguLanguageRequirementsConfirmed',
          description: 'Required English and Hebrew language classifications must be confirmed.',
        },
      ],
    },
    fixtureIds: fixtures.map((fixture) => fixture.id),
    fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
    sourceFingerprint: BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
    proof: {
      state: 'verified',
      comparedScore: true,
      comparedVerdict: true,
      liveComparedAt: capturedAt,
      sourceFingerprint: BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
    },
  };

  return {
    contract,
    fixtures,
    ledgerReason:
      'Verified against the current BGU Computer Science quantitative rule, programme mapping, official Teva Sekem score replay, accepted/below fixtures, and matching live source fingerprint.',
  };
}

export const BGU_COMPUTER_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID: Record<
  string,
  BguComputerScienceVerificationMetadata
> = Object.fromEntries(
  (['cs', 'bgu_cs'] as const).map((programId) => {
    const metadata = metadataFor(programId);
    return [metadata.contract.pairId, metadata];
  }),
);

export const BGU_COMPUTER_SCIENCE_FIXTURES_BY_PAIR_ID = Object.fromEntries(
  Object.entries(BGU_COMPUTER_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID).map(
    ([pairId, metadata]) => [pairId, metadata.fixtures],
  ),
);

export const BGU_COMPUTER_SCIENCE_CONTRACTS_BY_PAIR_ID = Object.fromEntries(
  Object.entries(BGU_COMPUTER_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID).map(
    ([pairId, metadata]) => [pairId, metadata.contract],
  ),
);

function proofCapturesFor(
  targetId: string,
  capturedAt: string,
): readonly OfficialProgramProofCapture[] {
  const acceptedExtraInputs: AdmissionsExtraInputs = {
    bguBagrutAverage: BGU_COMPUTER_SCIENCE_ACCEPTED_INPUT.bguBagrutAverage,
    psychometricMath: BGU_COMPUTER_SCIENCE_ACCEPTED_INPUT.psychometricMath,
    psychometricVerbal: BGU_COMPUTER_SCIENCE_ACCEPTED_INPUT.psychometricVerbal,
    psychometricEnglish: BGU_COMPUTER_SCIENCE_ACCEPTED_INPUT.psychometricEnglish,
    bguLanguageRequirementsConfirmed: true,
    bagrutSubjectRecord: BGU_COMPUTER_SCIENCE_ACCEPTED_INPUT.bagrutSubjectRecord,
  };
  const belowExtraInputs: AdmissionsExtraInputs = {
    bguBagrutAverage: BGU_COMPUTER_SCIENCE_BELOW_INPUT.bguBagrutAverage,
    psychometricMath: BGU_COMPUTER_SCIENCE_BELOW_INPUT.psychometricMath,
    psychometricVerbal: BGU_COMPUTER_SCIENCE_BELOW_INPUT.psychometricVerbal,
    psychometricEnglish: BGU_COMPUTER_SCIENCE_BELOW_INPUT.psychometricEnglish,
    bguLanguageRequirementsConfirmed: true,
    bagrutSubjectRecord: BGU_COMPUTER_SCIENCE_BELOW_INPUT.bagrutSubjectRecord,
  };
  return [
    {
      captureId: `${targetId}:official-eligible:2026-09-27`,
      capturedAt,
      officialUrl: BGU_COMPUTER_SCIENCE_SCORE_URL,
      applicant: {
        psychometric: BGU_COMPUTER_SCIENCE_ACCEPTED_INPUT.psychometric,
        bagrutAverage: BGU_COMPUTER_SCIENCE_ACCEPTED_INPUT.bguBagrutAverage,
        extraInputs: acceptedExtraInputs,
      },
      expected: { score: 879, verdict: 'accepted' },
    },
    {
      captureId: `${targetId}:official-below:2026-09-27`,
      capturedAt,
      officialUrl: BGU_COMPUTER_SCIENCE_SCORE_URL,
      applicant: {
        psychometric: BGU_COMPUTER_SCIENCE_BELOW_INPUT.psychometric,
        bagrutAverage: BGU_COMPUTER_SCIENCE_BELOW_INPUT.bguBagrutAverage,
        extraInputs: belowExtraInputs,
      },
      expected: { score: 636, verdict: 'below' },
    },
  ];
}

export const BGU_COMPUTER_SCIENCE_OFFICIAL_PROOF_CAPTURES_BY_TARGET_ID = Object.fromEntries(
  Object.values(BGU_COMPUTER_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID).map(({ contract }) => {
    const capturedAt =
      contract.pairId === 'cs__bgu'
        ? BGU_COMPUTER_SCIENCE_CAPTURED_AT_BY_PAIR_ID['cs__bgu']
        : BGU_COMPUTER_SCIENCE_CAPTURED_AT_BY_PAIR_ID['bgu_cs__bgu'];
    return [contract.source.targetId, proofCapturesFor(contract.source.targetId, capturedAt)];
  }),
);

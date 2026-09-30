import 'server-only';

import { createHash } from 'node:crypto';

import type { BagrutSubjectRecord, BagrutSubjectRecordV2 } from '@/types';
import {
  BGU_BAGRUT_PROFILE_POLICY,
  TAU_BAGRUT_PROFILE_POLICY,
  TAU_ENGINEERING_EXACT_SCIENCES_POLICY,
  calculateBguBagrutAverage,
  calculateTauBagrutAverage,
  evaluateTauEngineeringExactSciencesBonus,
} from '@/server/admissions/bagrutPolicies';
import {
  BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY,
  evaluateBguComputerScienceGates,
} from '@/server/admissions/bguComputerSciencePolicy';
import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';

import { applyRouteAction, type RouteAction, type RouteProfile } from './actions';

export type PostActionPairId = 'tau_cs__tau' | 'bgu_cs__bgu';

export interface PostActionInstitutionInputs {
  tauBagrutAverage?: number;
  bguBagrutAverage?: number;
  hasQualifiedMathAndPhysics?: boolean;
  quantitativeSubscore?: number;
  verbalSubscore?: number;
  englishSubscore?: number;
  languageRequirementsConfirmed?: boolean;
  gates?: ReturnType<typeof evaluateBguComputerScienceGates>;
}

export interface PostActionProfileSnapshot {
  schemaVersion: 1;
  pairId: PostActionPairId;
  psychometric: number;
  subjectRecord: BagrutSubjectRecordV2;
  institutionInputs: PostActionInstitutionInputs;
  policyVersions: string[];
  inputDigest: string;
}

export type PostActionProfileResult =
  | { status: 'ready'; snapshot: PostActionProfileSnapshot }
  | { status: 'invalid_action'; actionId: string }
  | { status: 'needs_input'; missingInputs: string[]; policyVersion: string };

export function recomputePostActionProfile(args: {
  pairId: PostActionPairId;
  psychometric: number;
  subjectRecord: BagrutSubjectRecord;
  quantitativeSubscore?: number;
  verbalSubscore?: number;
  englishSubscore?: number;
  languageRequirementsConfirmed?: boolean;
  actions: RouteAction[];
}): PostActionProfileResult {
  if (args.subjectRecord.schemaVersion !== 2) {
    const policyVersion =
      args.pairId === 'tau_cs__tau'
        ? TAU_BAGRUT_PROFILE_POLICY.version
        : BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY.version;
    return {
      status: 'needs_input',
      missingInputs: ['bagrut_profile_version'],
      policyVersion,
    };
  }

  let profile: RouteProfile = {
    psychometric: args.psychometric,
    ...(args.quantitativeSubscore !== undefined ||
    args.verbalSubscore !== undefined ||
    args.englishSubscore !== undefined
      ? {
          psychometricComponents: {
            ...(args.quantitativeSubscore !== undefined
              ? { quantitative: args.quantitativeSubscore }
              : {}),
            ...(args.verbalSubscore !== undefined ? { verbal: args.verbalSubscore } : {}),
            ...(args.englishSubscore !== undefined ? { english: args.englishSubscore } : {}),
          },
        }
      : {}),
    subjectRecord: cloneVersionedRecord(args.subjectRecord),
  };
  for (const action of args.actions) {
    const nextProfile = applyRouteAction(profile, action);
    if (!nextProfile) {
      return { status: 'invalid_action', actionId: action.id };
    }
    profile = nextProfile;
  }

  const subjectRecord = profile.subjectRecord as BagrutSubjectRecordV2;
  if (args.pairId === 'tau_cs__tau') {
    const average = calculateTauBagrutAverage(subjectRecord);
    if (average.state === 'needs_input') {
      return {
        status: 'needs_input',
        missingInputs: average.missingInputs,
        policyVersion: average.policyVersion,
      };
    }
    return readySnapshot({
      pairId: args.pairId,
      psychometric: profile.psychometric,
      subjectRecord,
      institutionInputs: {
        tauBagrutAverage: average.average,
        hasQualifiedMathAndPhysics:
          evaluateTauEngineeringExactSciencesBonus(subjectRecord).qualifies,
      },
      policyVersions: [
        TAU_BAGRUT_PROFILE_POLICY.version,
        TAU_ENGINEERING_EXACT_SCIENCES_POLICY.version,
      ],
    });
  }

  const bguAverage = calculateBguBagrutAverage(subjectRecord);
  if (bguAverage.state === 'needs_input') {
    return {
      status: 'needs_input',
      missingInputs: bguAverage.missingInputs,
      policyVersion: bguAverage.policyVersion,
    };
  }
  const languageRequirementsConfirmed = args.languageRequirementsConfirmed ?? false;
  const components = profile.psychometricComponents;
  return readySnapshot({
    pairId: args.pairId,
    psychometric: profile.psychometric,
    subjectRecord,
    institutionInputs: {
      bguBagrutAverage: bguAverage.average,
      quantitativeSubscore: components?.quantitative,
      verbalSubscore: components?.verbal,
      englishSubscore: components?.english,
      languageRequirementsConfirmed,
      gates: evaluateBguComputerScienceGates({
        psychometric: profile.psychometric,
        quantitativeSubscore: components?.quantitative,
        subjects: bagrutExamSubjects(subjectRecord),
        languageRequirementsConfirmed,
      }),
    },
    policyVersions: [
      BGU_BAGRUT_PROFILE_POLICY.version,
      BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY.version,
    ],
  });
}

function readySnapshot(
  input: Omit<PostActionProfileSnapshot, 'schemaVersion' | 'inputDigest'>,
): PostActionProfileResult {
  const digestInput = {
    pairId: input.pairId,
    psychometric: input.psychometric,
    subjectRecord: input.subjectRecord,
    institutionInputs: input.institutionInputs,
    policyVersions: input.policyVersions,
  };
  return {
    status: 'ready',
    snapshot: {
      schemaVersion: 1,
      ...input,
      inputDigest: `sha256:${createHash('sha256').update(stableJson(digestInput)).digest('hex')}`,
    },
  };
}

function cloneVersionedRecord(record: BagrutSubjectRecordV2): BagrutSubjectRecordV2 {
  return {
    schemaVersion: 2,
    sector: record.sector,
    certificateType: record.certificateType,
    complete: record.complete,
    subjects: record.subjects.map((subject) => ({ ...subject })),
  };
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}

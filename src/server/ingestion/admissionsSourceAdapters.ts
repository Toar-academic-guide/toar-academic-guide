import {
  evaluateFreshnessDiscovery,
  type FreshnessCapability,
  type FreshnessDiscoveryResult,
  type FreshnessSourceClass,
} from './freshnessDiscovery';

export type AdmissionsProofLevel =
  'blocked' | 'exact_official' | 'open_admission' | 'partial_official' | 'static_data_candidate';

export type AdmissionsProofStatus = 'blocked' | 'failed' | 'partial' | 'succeeded';

export type AdmissionsAdapterId =
  | 'capability_matrix'
  | 'haifa'
  | 'tau'
  | 'huji'
  | 'technion'
  | 'bgu'
  | 'manual_requirements';

export interface AdmissionsApplicantInput {
  bagrutAverage: number;
  psychometric: number;
  psychometricYear?: string;
  bagrutYear?: string;
  exactSciencesBonusEligible?: boolean;
  psychometricSubscores?: {
    english: number;
    math: number;
    verbal: number;
  };
  mathUnits?: number;
  mathGrade?: number;
  englishUnits?: number;
  englishGrade?: number;
  bagrutSubjectRecord?: import('@/types').BagrutSubjectRecord;
}

export interface AdmissionsProgramInput {
  targetId?: string;
  pairId?: string;
  id: string;
  name: string;
  nodeId?: number;
  externalId?: string;
  hug?: string;
  facultyCode?: string;
  searchText?: string;
  scoreField?: string;
  decisionMode?: 'accepted' | 'eligible_to_apply';
  staticThresholds?: {
    acceptance: number;
    rejection: number | null;
  };
  manualGateProfile?: 'technion_architecture' | 'colman_computer_science';
}

export interface AdmissionsAdapterContext {
  applicant: AdmissionsApplicantInput;
  program?: AdmissionsProgramInput;
  fetcher?: typeof fetch;
}

export interface AdmissionsSourceProof {
  id: string;
  institutionId: string;
  institutionName: string;
  officialUrl: string;
  adapterId: AdmissionsAdapterId;
  capability: FreshnessCapability;
  proofLevel: AdmissionsProofLevel;
  status: AdmissionsProofStatus;
  sourceClass: FreshnessSourceClass;
  reproducedFields: string[];
  normalizedPayload: Record<string, unknown>;
  limitations: string[];
  nextAction: string;
  blockedReason?: string;
  errorReason?: string;
  rawResponseMetadata?: Array<{
    endpoint: string;
    status: number;
    contentType?: string | null;
  }>;
}

export interface AdmissionsSourceProofEvaluation {
  freshness: FreshnessDiscoveryResult | null;
  proof: AdmissionsSourceProof;
}

export function evaluateAdmissionsSourceProof(
  proof: AdmissionsSourceProof,
  previousNormalizedFingerprint?: string,
): AdmissionsSourceProofEvaluation {
  if (proof.status === 'failed') {
    return {
      proof,
      freshness: null,
    };
  }

  return {
    proof,
    freshness: evaluateFreshnessDiscovery({
      id: proof.id,
      sourceClass: proof.sourceClass,
      body: proof.normalizedPayload,
      blockedReason: proof.blockedReason,
      previousNormalizedFingerprint,
    }),
  };
}

export function hasDecisionThresholds(payload: Record<string, unknown>): boolean {
  return (
    hasNumericField(payload, 'acceptanceCutoff') ||
    hasNumericField(payload, 'acceptanceThreshold') ||
    hasNumericField(payload, 'rejectionCutoff') ||
    hasNumericField(payload, 'threshold')
  );
}

export function createCapabilityOnlyProof(args: {
  id: string;
  institutionId: string;
  institutionName: string;
  officialUrl: string;
  capability: FreshnessCapability;
  proofLevel: AdmissionsProofLevel;
  status: AdmissionsProofStatus;
  reproducedFields: string[];
  normalizedPayload: Record<string, unknown>;
  limitations: string[];
  nextAction: string;
  blockedReason?: string;
}): AdmissionsSourceProof {
  return {
    adapterId: 'capability_matrix',
    sourceClass: sourceClassForCapability(args.capability),
    ...args,
  };
}

export function sourceClassForCapability(capability: FreshnessCapability): FreshnessSourceClass {
  if (capability === 'blocked') {
    return 'browser_required';
  }

  if (capability === 'score_only') {
    return 'score_only_calculator';
  }

  return 'api_static_json';
}

export function parseOfficialNumeric(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    return parseOfficialNumeric(value[0]);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

export function readOfficialResponseMetadata(endpoint: string, response: Response) {
  return {
    endpoint,
    status: response.status,
    contentType: response.headers.get('content-type'),
  };
}

function hasNumericField(payload: Record<string, unknown>, fieldName: string): boolean {
  return parseOfficialNumeric(payload[fieldName]) !== undefined;
}

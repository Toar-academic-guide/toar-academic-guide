import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { DeltaNeeded } from '@/types';

export type AdmissionsEvaluationDecision = 'accepted' | 'below' | 'eligible_to_apply' | 'unknown';

export type AdmissionsEvaluationKind =
  | 'exact'
  | 'estimated'
  | 'needs_input'
  | 'authority_unavailable'
  | 'tracked_missing_rule'
  | 'unsupported'
  | 'degraded'
  | 'open_admission'
  | 'manual_gate'
  | 'requirements_only';

export type AdmissionsEvaluationCapability =
  | 'exact'
  | 'estimated'
  | 'score_only'
  | 'blocked'
  | 'stale'
  | 'missing'
  | 'needs_input'
  | 'authority_unavailable'
  | 'tracked_missing_rule'
  | 'unsupported'
  | 'open_admission'
  | 'manual_gate'
  | 'requirements_only';

export type AdmissionsConfidence = 'high' | 'medium' | 'low';

export type AdmissionsRequiredInput =
  | 'psychometric_math'
  | 'psychometric_verbal'
  | 'psychometric_english'
  | 'math_units'
  | 'math_grade'
  | 'english_units'
  | 'english_grade'
  | 'physics_units'
  | 'physics_grade'
  | 'cs_units'
  | 'cs_grade';

export interface AdmissionsExtraInputs {
  psychometricMath?: number;
  psychometricVerbal?: number;
  psychometricEnglish?: number;
  mathUnits?: number;
  mathGrade?: number;
  englishUnits?: number;
  englishGrade?: number;
  physicsUnits?: number;
  physicsGrade?: number;
  csUnits?: number;
  csGrade?: number;
}

export type AdmissionsVerificationVerdict = 'accepted' | 'below';

export interface AdmissionsVerificationFixtureInput {
  psychometric: number;
  bagrut: number;
  [field: string]: string | number | boolean | null;
}

export interface AdmissionsVerificationFixture {
  id: string;
  pairId: string;
  admissionCycle: string;
  verdict: AdmissionsVerificationVerdict;
  input: AdmissionsVerificationFixtureInput;
  expected: {
    score: number;
    verdict: AdmissionsVerificationVerdict;
  };
  sourceFingerprint: string;
  capturedAt: string;
}

export interface AdmissionsVerificationGate {
  id: string;
  kind: 'minimum' | 'language' | 'subject' | 'direct_track' | 'manual';
  field: string;
  minimum?: number;
  description: string;
}

export interface AdmissionsProgramVerificationContract {
  pairId: string;
  programId: string;
  institutionId: string;
  officialProgramId: string;
  admissionCycle: string;
  source: {
    targetId: string;
    url: string;
  };
  calculation: {
    adapterId: string;
    mode: 'formula' | 'official_replay';
    formulaFamily: string;
    requiredInputs: AdmissionsRequiredInput[];
    cutoff: {
      acceptance: number;
      rejection: number | null;
    };
    gates: AdmissionsVerificationGate[];
  };
  fixtureIds: string[];
  fixtureSetFingerprint: string;
  sourceFingerprint: string;
  proof: {
    state: 'verified' | 'unverified' | 'blocked';
    comparedScore: boolean;
    comparedVerdict: boolean;
    liveComparedAt: string | null;
    sourceFingerprint: string | null;
  };
}

export type AdmissionsPairVerificationState =
  'exact' | 'withheld' | 'stale' | 'blocked' | 'authority_unavailable';

export interface AdmissionsEvaluationInput {
  degreeId: string;
  psychometric: number;
  bagrut: number;
  extraInputs?: AdmissionsExtraInputs;
}

export interface AdmissionsEvaluationSnapshot {
  evaluatorVersion: string;
  ruleVersion: string;
  ruleFingerprint: string;
  inputDigest: string;
  evaluationDigest: string;
}

export interface AdmissionsEvaluationResult {
  institution: Pick<
    CatalogueInstitution,
    | 'id'
    | 'name'
    | 'region'
    | 'domain'
    | 'logoUrl'
    | 'programUrl'
    | 'calculatorUrl'
    | 'universityId'
  >;
  linkedInstitutionId: string;
  capability: AdmissionsEvaluationCapability;
  kind: AdmissionsEvaluationKind;
  decision: AdmissionsEvaluationDecision;
  confidence: AdmissionsConfidence;
  sourceLabel: string;
  explanation: string;
  nextAction: string;
  score?: number;
  scoreLabel?: string;
  threshold?: number | null;
  deltaNeeded?: DeltaNeeded;
  requiredInputs?: AdmissionsRequiredInput[];
  evidenceItemId?: string;
  evidenceItemName?: string;
  missingData?: string[];
  officialUrls?: string[];
  degradationReason?: string;
  snapshot?: AdmissionsEvaluationSnapshot;
}

export interface AdmissionsEvaluationReport {
  generatedAt: string;
  evaluatorVersion: string;
  inputDigest: string;
  input: AdmissionsEvaluationInput;
  program: Pick<CatalogueProgram, 'id' | 'name'>;
  results: AdmissionsEvaluationResult[];
}

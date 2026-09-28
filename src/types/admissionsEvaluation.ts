import type { BguHealthInputs } from '@/lib/bguHealthInputs';
import type { BguQuantitativeInputs } from '@/lib/bguQuantitativeInputs';
import type { BguPsychologyInputs } from '@/lib/bguPsychologyInputs';
import type { HaifaAdmissionsInputs } from '@/lib/haifaAdmissionsInputs';
import type { BguSocialScienceInputs } from '@/lib/bguSocialScienceInputs';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { BagrutSector, BagrutSubjectRecord, DeltaNeeded } from '@/types';
import type { BguEngineeringInputs } from './bguEngineering';

export type AdmissionsEvaluationDecision =
  'accepted' | 'below' | 'eligible_to_apply' | 'pending' | 'unknown';

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
  | 'bgu_engineering_details'
  | 'bgu_engineering_physics_course'
  | 'bagrut_average'
  | 'haifa_bagrut_average'
  | 'haifa_bagrut_year'
  | 'haifa_psychometric_year'
  | 'haifa_psychometric_month'
  | 'haifa_admission_qualification'
  | 'haifa_english_level'
  | 'haifa_hebrew_qualification'
  | 'haifa_hebrew_score'
  | 'haifa_hebrew_exam_date'
  | 'haifa_science_units'
  | 'haifa_ot_failed_selection_attempts'
  | 'haifa_ot_unjustified_absence'
  | 'bgu_occupational_therapy_requirements'
  | 'bgu_physiotherapy_requirements'
  | 'bgu_occupational_therapy_exam_session'
  | 'bgu_bachelors_degree_completed'
  | 'bgu_bachelors_degree_average'
  | 'bgu_psychology_requirements'
  | 'bgu_social_science_requirements'
  | 'bgu_social_science_language'
  | 'bgu_returning_from_study_break'
  | 'bgu_social_work_academic_background'
  | 'bgu_social_work_academic_average'
  | 'bgu_social_work_transcript'
  | 'bgu_applicant_age'
  | 'bgu_education_second_department'
  | 'bgu_english_classification_missing'
  | 'bgu_hebrew_requirements'
  | 'bgu_education_english_condition'
  | 'bgu_preparatory_average'
  | 'bgu_preparatory_completed'
  | 'bgu_preparatory_track'
  | 'psychometric_overall'
  | 'bagrut_average'
  | 'tau_management_requirements'
  | 'tau_management_academic_route'
  | 'tau_management_mooc_count'
  | 'tau_management_no_psychometric_moocs'
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
  | 'cs_grade'
  | 'bagrut_subject_record'
  | 'bagrut_profile_version'
  | 'bagrut_sector'
  | 'tau_bagrut_average'
  | 'bgu_bagrut_average'
  | 'tau_application_requirements'
  | 'bgu_language_requirements'
  | 'bgu_certificate_requirements'
  | 'bgu_prior_academic_studies'
  | 'bgu_returning_or_changing_track'
  | 'bgu_application_priority'
  | 'bgu_second_track_requirements'
  | 'bgu_preparatory_qualification'
  | 'tau_math_placement_score'
  | 'technion_architecture_bagrut_average'
  | 'technion_architecture_exam_score'
  | 'technion_architecture_exam_passed'
  | 'technion_architecture_requirements';

export interface AdmissionsExtraInputs
  extends
    BguQuantitativeInputs,
    BguPsychologyInputs,
    BguSocialScienceInputs,
    BguHealthInputs,
    HaifaAdmissionsInputs {
  bguEngineering?: BguEngineeringInputs;
  technionArchitectureBagrutAverage?: number;
  technionArchitectureExamScore?: number;
  technionArchitectureExamPassed?: boolean;
  technionArchitectureRequirementsConfirmed?: boolean;
  psychometricMath?: number;
  psychometricVerbal?: number;
  psychometricEnglish?: number;
  bagrutSubjectRecord?: BagrutSubjectRecord;
  bagrutProfileSchemaVersion?: BagrutSubjectRecord['schemaVersion'];
  bagrutSector?: BagrutSector;
  mathUnits?: number;
  mathGrade?: number;
  englishUnits?: number;
  englishGrade?: number;
  physicsUnits?: number;
  physicsGrade?: number;
  csUnits?: number;
  csGrade?: number;
  tauBagrutAverage?: number;
  bguBagrutAverage?: number;
  tauApplicationRequirementsConfirmed?: boolean;
  tauManagementRequirementsConfirmed?: boolean;
  tauManagementAcademicRouteConfirmed?: boolean;
  tauManagementQualifyingMoocCount?: 0 | 1 | 2;
  tauManagementNoPsychometricMoocsConfirmed?: boolean;
  bguLanguageRequirementsConfirmed?: boolean;
  tauMathPlacementScore?: number;
}

export type AdmissionsVerificationVerdict = 'accepted' | 'below' | 'eligible_to_apply';

export interface AdmissionsVerificationFixtureInput {
  psychometric: number;
  bagrut: number;
  bagrutSubjectRecord?: BagrutSubjectRecord;
  [field: string]:
    string | number | boolean | null | BagrutSubjectRecord | BguEngineeringInputs | undefined;
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
  psychometric?: number;
  bagrut?: number;
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

import type { UniversityId } from '@/types';
import type { InstitutionId } from '@/data/institutions';

export type AdmissionsSourceOrigin = 'board_column' | 'item_update' | 'catalogue_url' | 'manual';

export type AdmissionsSourceSpecificity =
  | 'program_admissions'
  | 'program'
  | 'calculator'
  | 'institution_admissions'
  | 'institution'
  | 'generic';

export type AdmissionsConfidence = 'high' | 'medium' | 'low';

export type AdmissionFactKind =
  'numeric_gate' | 'manual_gate' | 'open_admission' | 'explicit_absence' | 'unknown';

export type AdmissionFactField =
  | 'sekhem'
  | 'psychometric'
  | 'bagrut_average'
  | 'psychometric_quantitative'
  | 'psychometric_english'
  | 'math_units'
  | 'math_grade'
  | 'english_units'
  | 'english_grade'
  | 'physics_units'
  | 'physics_grade'
  | 'cs_units'
  | 'cs_grade'
  | 'required_subject'
  | 'interview'
  | 'exam'
  | 'committee'
  | 'portfolio'
  | 'document_check'
  | 'prior_studies'
  | 'open_admission'
  | 'other';

export type AdmissionComparison = 'gte' | 'lte' | 'eq' | 'present' | 'not_required' | 'unknown';
export type AdmissionFactUnit = 'points' | 'average' | 'units' | 'boolean' | 'text';

export type AdmissionAlternativePathKind =
  | 'prep_program'
  | 'transfer_path'
  | 'prior_studies'
  | 'exceptions_committee'
  | 'special_population'
  | 'similar_program'
  | 'lower_threshold_institution'
  | 'online_or_abroad'
  | 'manual_check';

export interface AdmissionsSourceCandidate {
  id: string;
  origin: AdmissionsSourceOrigin;
  specificity: AdmissionsSourceSpecificity;
  confidence: AdmissionsConfidence;
  url: string;
  title?: string;
  notes?: string;
}

export interface AdmissionFact {
  id: string;
  sourceCandidateId?: string;
  kind: AdmissionFactKind;
  field: AdmissionFactField;
  comparison: AdmissionComparison;
  valueNumber: number | null;
  valueText: string | null;
  unit: AdmissionFactUnit;
  description: string;
  confidence: AdmissionsConfidence;
  isRequired: boolean;
  groupKey?: string;
}

export interface AdmissionAlternativePath {
  id: string;
  sourceCandidateId?: string;
  kind: AdmissionAlternativePathKind;
  title: string;
  description: string;
  url?: string;
  priority: number;
}

export interface InstitutionDetail {
  institutionName: string;
  durationYears: number | null;
  estimatedStudentsPerYear: string;
  quantitativeMinRequirement: number | null;
  englishMinRequirement: number | null;
  specificAdmissionNotes: string[];
  /** Legacy single-URL field; kept for backward-compat. Prefer programUrl + calculatorUrl. */
  officialCalculatorUrl: string;
  /** Direct link to the specific degree/track page at the institution's website. */
  programUrl?: string;
  /** Direct link to the institution's official sekhem / admission calculator. */
  calculatorUrl?: string;
  /** Short marketing-style description rendered on hover/expand in the detail view. */
  programDescription?: string;
  admissionsSourceCandidates?: AdmissionsSourceCandidate[];
  admissionFacts?: AdmissionFact[];
  admissionAlternativePaths?: AdmissionAlternativePath[];
}

export interface Program {
  id: string;
  name: string;
  /** Hebrew display name — must match InstitutionRecord.name in INSTITUTION_BY_NAME */
  institution: string;
  /** Typed reference to the master institutions dictionary */
  institutionId?: InstitutionId;
  type: 'academic' | 'certificate' | 'vocational' | 'short-course';
  category: string;
  profileScore: {
    AN: number;
    TE: number;
    CR: number;
    SO: number;
    LE: number;
    OR: number;
    DI: number;
    ER: number;
  };
  /** @deprecated kept during migration — will be removed */
  riasecScore?: { R: number; I: number; A: number; S: number; E: number; C: number };
  admissionType: 'sekhem' | 'requirements';
  admissionRequirements: string[];
  canCombine?: boolean;
  commonPairings?: string[];
  // ── Sekhem-track fields (required when admissionType === 'sekhem') ─────────
  thresholds?: Record<UniversityId, number | null>;
  isTauEngineering?: boolean;
  directPsychometric?: Partial<Record<UniversityId, number>>;
  minimumPsychometric?: Partial<Record<UniversityId, number>>;
  minimumBagrut?: Partial<Record<UniversityId, number>>;
  institutionDetails?: InstitutionDetail[];
}

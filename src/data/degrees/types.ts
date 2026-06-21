import type { UniversityId } from '@/types';
import type { InstitutionId } from '@/data/institutions';

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
    AN: number; TE: number; CR: number; SO: number;
    LE: number; OR: number; DI: number; ER: number;
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
  institutionDetails?: InstitutionDetail[];
}

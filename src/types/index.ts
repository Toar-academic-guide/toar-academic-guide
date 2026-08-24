export type UniversityId = string;

// ── Avoidance tags ────────────────────────────────────────────────────────────
// Captured in the quiz ("what do you want to avoid?") and used to apply a
// −40% score penalty per overlap in the recommendation engine.
export type AvoidanceTag =
  | 'heavy-math' // advanced maths, formulas, statistics
  | 'heavy-reading' // lots of reading, long papers, seminars
  | 'bureaucracy' // forms, regulations, admin
  | 'solo-work'; // isolated screen / solo study

// 'weighted_scaled': Sekhem = w_psy×Psy + w_bag×(Bagrut/120×800), range 200–800
// 'technion_linear': official formula Sekhem = 0.5×Bagrut + 0.075×Psy - 18, range ~60–100
// 'minimum_floors': college model — separate minimum psychometric AND minimum bagrut
export type FormulaType = 'weighted_scaled' | 'technion_linear' | 'minimum_floors';

export interface UserScores {
  psychometric: number; // 200–800
  bagrut: number; // 60–120 (including bonuses)
  mathUnits?: number;
  mathGrade?: number;
  englishUnits?: number;
  englishGrade?: number;
  physicsUnits?: number;
  physicsGrade?: number;
  csUnits?: number;
  csGrade?: number;
}

export interface University {
  id: UniversityId;
  name: string;
  formulaType: FormulaType;
  sekhemWeight?: { psy: number; bag: number }; // only for weighted_scaled
  minPsychometric?: number; // only for minimum_floors
  minBagrut?: number; // only for minimum_floors
  scaleDescription: string;
}

export interface EngineeringOptions {
  hasMath5: boolean;
  hasPhysics5: boolean;
}

export interface DeltaNeeded {
  psychometric: number;
  bagrut: number;
}

export interface UniversityResult {
  university: University;
  sekhem: number;
  threshold: number | null;
  status: 'accepted' | 'below' | 'unavailable';
  deltaNeeded?: DeltaNeeded;
  admissionTrack?: 'direct'; // present when accepted via psychometric-only direct track
  explanation?: string;
}

export type AdmissionsDecisionStatus =
  | 'accepted'
  | 'likely_accepted_needs_verification'
  | 'close_to_accepted'
  | 'not_accepted_has_path'
  | 'far_from_track'
  | 'insufficient_data';

export type AdmissionsDecisionConfidence = 'high' | 'medium' | 'low';

export type AdmissionsNextActionKind =
  | 'register'
  | 'check_dates'
  | 'save_target'
  | 'improve_psychometric'
  | 'improve_bagrut'
  | 'prep_program'
  | 'transfer_path'
  | 'exceptions_committee'
  | 'similar_program'
  | 'other_institution'
  | 'manual_check'
  | 'official_source'
  | 'online_or_abroad';

export interface AdmissionsDecisionSource {
  label: string;
  url?: string;
  confidence: AdmissionsDecisionConfidence;
}

export interface AdmissionsDecisionMissingItem {
  label: string;
  field?: string;
  currentValue?: number;
  requiredValue?: number;
  delta?: number;
}

export interface AdmissionsDecisionNextAction {
  kind: AdmissionsNextActionKind;
  label: string;
  url?: string;
}

export interface AdmissionsDecision {
  status: AdmissionsDecisionStatus;
  confidence: AdmissionsDecisionConfidence;
  statusLabel: string;
  explanation: string[];
  metConditions: string[];
  missing: AdmissionsDecisionMissingItem[];
  manualGates: string[];
  sources: AdmissionsDecisionSource[];
  nextAction: AdmissionsDecisionNextAction;
}

// ── Career Profile Dimensions ─────────────────────────────────────────────────

export type ProfileDimension =
  | 'AN' // Analytical   — research, data, problem-solving
  | 'TE' // Technical    — building, fixing, engineering, hardware
  | 'CR' // Creative     — design, art, innovation, expression
  | 'SO' // Social       — helping, teaching, care, counseling
  | 'LE' // Leadership   — managing, business, persuading
  | 'OR' // Organizational — structure, detail, processes
  | 'DI' // Digital/Tech — coding, AI, apps, cyber, startups
  | 'ER'; // Erudition    — deep study, academic pursuit, reading

export interface ProfileScores {
  AN: number; // Analytical
  TE: number; // Technical
  CR: number; // Creative
  SO: number; // Social
  LE: number; // Leadership
  OR: number; // Organizational
  DI: number; // Digital/Tech
  ER: number; // Erudition
}

export interface ValuesProfile {
  incomeVsImpact: number; // -2 (income) to +2 (impact)
  independenceVsTeam: number; // -2 (independence) to +2 (team)
  growthVsStability: number; // -2 (growth) to +2 (stability)
  prestigeVsMeaning: number; // -2 (prestige) to +2 (meaning)
}

export type StudyTypePreference = 'degree' | 'short-course' | 'all';

export interface EnvironmentPreference {
  soloScore: number; // 0 = strongly team-oriented, 3 = strongly solo
  deskScore: number; // 0 = dynamic/field, 3 = desk/indoor
}

// ── Legacy RIASEC aliases (removed file-by-file during migration) ────────────
/** @deprecated Use ProfileDimension */
export type RiasecDimension = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
/** @deprecated Use ProfileScores */
export interface RiasecScores {
  R: number;
  I: number;
  A: number;
  S: number;
  E: number;
  C: number;
}
/** @deprecated */
export type RiasecAnswers = Record<string, string[]>;

// ── Geographic Preference ─────────────────────────────────────────────────────

/** Where the student wants to study. 'any' = no preference. */
export type GeographicRegion = 'center' | 'north' | 'south' | 'any';

// ── Academic Scores ───────────────────────────────────────────────────────────

/** Sub-scores from the Israeli Psychometric Entrance Test (PET). */
export interface PsychometricScores {
  /** Overall composite score, 200–800 */
  overall?: number;
  /** Quantitative section score, 50–150 */
  quantitative?: number;
  /** Verbal section score, 50–150 */
  verbal?: number;
  /** English section score, 50–150 */
  english?: number;
}

/** Matriculation (Bagrut) academic record. */
export type BagrutSector = 'jewish' | 'arab' | 'druze' | 'circassian' | 'bedouin' | 'samaritan';

export interface BagrutSubject {
  /** Stable Toar-owned subject identifier, for example `mathematics`. */
  subjectId: string;
  /** The study-unit count recorded for this subject. */
  units: number;
  /** Final subject grade on the Bagrut 0–100 scale. */
  grade: number;
}

export interface BagrutSubjectRecord {
  /** Version of the normalized subject-record contract. */
  schemaVersion: 1;
  /** Education-sector context required to interpret mandatory subjects. */
  sector: BagrutSector;
  /** Immutable, normalized subject records used for admissions replay. */
  subjects: BagrutSubject[];
  /** Server-derived digest identifying this exact immutable record. */
  profileHash?: string;
}

export interface BagrutRecord {
  /** Weighted average including all generic bonuses, 60–120 */
  weightedAverage?: number;
  /** Subject-level record required for verified Bagrut calculations. */
  subjectRecord?: BagrutSubjectRecord;
}

/** Combined academic-scores object stored in the user profile. */
export interface AcademicScores {
  psychometric?: PsychometricScores;
  bagrut?: BagrutRecord;
}

/** User profile snapshot used by the browser and authenticated profile APIs. */
export interface UserProfile {
  /** Signup/profile identity fields kept in the app-owned profile model */
  firstName?: string;
  lastName?: string;
  geographicPreference: GeographicRegion;
  /** Academic scores entered in the profile setup step */
  academicScores?: AcademicScores;
  /** IDs of programs the user has bookmarked ("bucket list") */
  savedProgramIds?: string[];
  uploadedDocuments?: Array<{
    id: string;
    kind: 'psychometric' | 'bagrut';
    /** Generic, display-safe label. Raw filenames are not exposed in the public profile snapshot. */
    displayName: string;
    sizeBytes: number | null;
  }>;
}

// ── Recommendations ───────────────────────────────────────────────────────────

export interface RecommendedField {
  id: string;
  name: string;
  description: string;
  suggestedDegreeIds: string[];
  score: number;
  matchedDimensions: ProfileDimension[];
  matchReason: string;
  marketDemand: 'גבוה מאוד' | 'גבוה' | 'בינוני';
  aiResilience: 'גבוהה' | 'בינונית' | 'נמוכה';
  aiResilienceNote: string;
  dailyWorkflow: string;
  hasWarning?: boolean;
  warningText?: string;
  suggestedPairings?: { programId: string; reason: string }[];
}

export type UniversityId = string;

// ── Avoidance tags ────────────────────────────────────────────────────────────
// Captured in the quiz ("what do you want to avoid?") and used to apply a
// −40% score penalty per overlap in the recommendation engine.
export type AvoidanceTag =
  | 'heavy-math'    // advanced maths, formulas, statistics
  | 'heavy-reading' // lots of reading, long papers, seminars
  | 'bureaucracy'   // forms, regulations, admin
  | 'solo-work';    // isolated screen / solo study

// 'weighted_scaled': Sekhem = w_psy×Psy + w_bag×(Bagrut/120×800), range 200–800
// 'technion_linear': official formula Sekhem = 0.5×Bagrut + 0.075×Psy - 18, range ~60–100
export type FormulaType = 'weighted_scaled' | 'technion_linear';

export interface UserScores {
  psychometric: number; // 200–800
  bagrut: number;       // 60–120 (including bonuses)
}

export interface University {
  id: UniversityId;
  name: string;
  formulaType: FormulaType;
  sekhemWeight?: { psy: number; bag: number }; // only for weighted_scaled
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
}

// ── RIASEC (Holland Codes) ────────────────────────────────────────────────────

export type RiasecDimension = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export interface RiasecScores {
  R: number; // Realistic   — hands-on, technical
  I: number; // Investigative — research, analysis
  A: number; // Artistic    — creative, expressive
  S: number; // Social      — helping, interpersonal
  E: number; // Enterprising — leadership, persuasion
  C: number; // Conventional — organized, systematic
}

export interface EnvironmentPreference {
  soloScore: number; // 0 = strongly team-oriented, 3 = strongly solo
  deskScore: number; // 0 = dynamic/field, 3 = desk/indoor
}

export type RiasecAnswers = Record<string, string[]>; // questionId → selected answer labels

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
export interface BagrutRecord {
  /** Weighted average including all generic bonuses, 60–120 */
  weightedAverage?: number;
}

/** Combined academic-scores object stored in the user profile. */
export interface AcademicScores {
  psychometric?: PsychometricScores;
  bagrut?: BagrutRecord;
}

/** Persisted user profile (localStorage-backed). */
export interface UserProfile {
  /** Signup/profile identity fields kept in the app-owned profile model */
  firstName?: string;
  lastName?: string;
  geographicPreference: GeographicRegion;
  /** Academic scores entered in the profile setup step */
  academicScores?: AcademicScores;
  /** IDs of programs the user has bookmarked ("bucket list") */
  savedProgramIds?: string[];
}

// ── Recommendations ───────────────────────────────────────────────────────────

export interface RecommendedField {
  id: string;
  name: string;
  description: string;
  suggestedDegreeIds: string[];
  score: number;
  matchedDimensions: RiasecDimension[];
  matchReason: string;
  marketDemand: 'גבוה מאוד' | 'גבוה' | 'בינוני';
  aiResilience: 'גבוהה' | 'בינונית' | 'נמוכה';
  aiResilienceNote: string;
  dailyWorkflow: string;
  hasWarning?: boolean;
  warningText?: string;
}

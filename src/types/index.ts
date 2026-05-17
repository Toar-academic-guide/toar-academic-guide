export type UniversityId = 'tau' | 'huji' | 'technion' | 'bgu';

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

export interface Degree {
  id: string;
  name: string;
  thresholds: Record<UniversityId, number | null>;
  isTauEngineering: boolean;
  // Per-university psychometric-only cutoff for direct admission tracks (קבלה ישירה).
  // If the applicant's raw psychometric ≥ this value the combined-index check is skipped.
  directPsychometric?: Partial<Record<UniversityId, number>>;
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

export type RiasecAnswers = Record<string, number[]>; // questionId → selected answer indices

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

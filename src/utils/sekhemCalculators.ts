import { University, UserScores, UniversityResult, DeltaNeeded, EngineeringOptions } from '@/types';
import type { Program } from '@/data/degrees/types';

// ── TAU Engineering & Exact Sciences bonuses ─────────────────────────────────
// TAU's Faculty of Exact Sciences and Engineering applies direct additive
// bonuses to the admission index for students with 5-unit Bagrut subjects.
// These are applied on top of the base weighted formula and are specific to
// programs flagged as isTauEngineering (CS, EE, ME, Data Science).
const TAU_MATH5_BONUS = 35; // 5 units of Mathematics
const TAU_PHYSICS5_BONUS = 25; // 5 units of Physics

// ── Bagrut normalization ──────────────────────────────────────────────────────
// Converts raw bagrut average (60–120 with bonuses) to the 200–800 psychometric
// scale used by TAU / HUJI / BGU weighted formulas.
// At bagrut=120 (max with bonuses) → 800; at bagrut=100 → 667.
function normalizeBagrut(bagrut: number): number {
  return (bagrut / 120) * 800;
}

// ── Technion official formula ─────────────────────────────────────────────────
// Source: Technion published formula (widely cited in Israeli admission guides)
// Sekhem = 0.5 × BagrutAvg + 0.075 × Psychometric − 18
// Output range: ~60–100 (Technion uses its own scale)
function sekhemTechnion(scores: UserScores): number {
  return 0.5 * scores.bagrut + 0.075 * scores.psychometric - 18;
}

// ── Weighted formula (TAU, HUJI, BGU) ────────────────────────────────────────
// Sekhem = w_psy × Psychometric + w_bag × (Bagrut / 120 × 800)
// Output range: 200–800 (same axis as psychometric)
function sekhemWeighted(university: University, scores: UserScores): number {
  const w = university.sekhemWeight!;
  return w.psy * scores.psychometric + w.bag * normalizeBagrut(scores.bagrut);
}

// ── TAU engineering bonus calculation ────────────────────────────────────────
// Returns the total additive bonus for TAU engineering/exact-sciences programs.
function tauEngineeringBonus(opts: EngineeringOptions): number {
  return (opts.hasMath5 ? TAU_MATH5_BONUS : 0) + (opts.hasPhysics5 ? TAU_PHYSICS5_BONUS : 0);
}

// ── Core sekhem dispatcher ────────────────────────────────────────────────────
// engineeringOptions is only applied when:
//   - university is TAU ('tau')
//   - the degree is flagged isTauEngineering
// For all other universities the parameter is ignored.
export function calculateSekhem(
  university: University,
  scores: UserScores,
  degree: Program,
  engineeringOptions: EngineeringOptions,
): number {
  if (university.formulaType === 'technion_linear') {
    return sekhemTechnion(scores);
  }

  if (university.formulaType === 'minimum_floors') {
    return scores.psychometric;
  }

  const base = sekhemWeighted(university, scores);

  if (university.id === 'tau' && (degree.isTauEngineering ?? false)) {
    // Cap at 800 — the upper bound of the TAU/HUJI/BGU scale
    return Math.min(base + tauEngineeringBonus(engineeringOptions), 800);
  }

  return base;
}

// ── Delta calculator ─────────────────────────────────────────────────────────
// Given a deficit (threshold − sekhem after bonuses), computes how many raw
// points the user must add to either variable to close the remaining gap.
// Engineering bonuses are fixed constants so derivatives are unchanged.
export function calculateDelta(deficit: number, university: University): DeltaNeeded {
  if (university.formulaType === 'technion_linear') {
    // d(sekhem)/d(psy) = 0.075  →  delta_psy = deficit / 0.075
    // d(sekhem)/d(bag) = 0.5    →  delta_bag = deficit / 0.5
    return {
      psychometric: Math.ceil(deficit / 0.075),
      bagrut: Math.ceil(deficit / 0.5),
    };
  }
  if (university.formulaType === 'minimum_floors') {
    return {
      psychometric: Math.ceil(deficit),
      bagrut: 0,
    };
  }
  const w = university.sekhemWeight!;
  // d(sekhem)/d(psy)  = w.psy
  // d(sekhem)/d(bag)  = w.bag × (800/120)   (chain rule through normalizeBagrut)
  const dBag = w.bag * (800 / 120);
  return {
    psychometric: Math.ceil(deficit / w.psy),
    bagrut: Math.ceil(deficit / dBag),
  };
}

export function evaluateMinimumFloorsAdmission(
  university: University,
  threshold: number,
  scores: UserScores,
): {
  meetsAll: boolean;
  deltaNeeded: DeltaNeeded;
} {
  const psychometricGap = threshold - scores.psychometric;
  const bagrutGap = (university.minBagrut ?? 0) - scores.bagrut;

  return {
    meetsAll: psychometricGap <= 0 && bagrutGap <= 0,
    deltaNeeded: {
      psychometric: Math.max(0, Math.ceil(psychometricGap)),
      bagrut: Math.max(0, Math.ceil(bagrutGap)),
    },
  };
}

// ── Main evaluator ────────────────────────────────────────────────────────────
export function evaluateUniversities(
  universities: University[],
  degree: Program,
  scores: UserScores,
  engineeringOptions: EngineeringOptions,
): UniversityResult[] {
  return universities.map((university) => {
    const threshold = degree.thresholds?.[university.id] ?? null;

    if (threshold === null) {
      return { university, sekhem: 0, threshold: null, status: 'unavailable' };
    }

    // ── Minimum-floors model (colleges) ──────────────────────────────────────
    // threshold = minimum psychometric; university.minBagrut = minimum bagrut.
    // Both must be met independently.
    if (university.formulaType === 'minimum_floors') {
      const { meetsAll, deltaNeeded } = evaluateMinimumFloorsAdmission(
        university,
        threshold,
        scores,
      );

      if (meetsAll) {
        return { university, sekhem: scores.psychometric, threshold, status: 'accepted' };
      }
      return {
        university,
        sekhem: scores.psychometric,
        threshold,
        status: 'below',
        deltaNeeded,
      };
    }

    const raw = calculateSekhem(university, scores, degree, engineeringOptions);
    // Technion: keep 1 decimal; others: round to integer
    const sekhem =
      university.formulaType === 'technion_linear' ? Math.round(raw * 10) / 10 : Math.round(raw);

    // ── Direct admission track (קבלה ישירה) ──────────────────────────────────
    // Some universities admit applicants whose raw psychometric score alone
    // exceeds a published cutoff, bypassing the combined-index threshold.
    const directCutoff = degree.directPsychometric?.[university.id];
    if (directCutoff !== undefined && scores.psychometric >= directCutoff) {
      return { university, sekhem, threshold, status: 'accepted', admissionTrack: 'direct' };
    }

    const deficit = threshold - raw;

    if (deficit <= 0) {
      return { university, sekhem, threshold, status: 'accepted' };
    }

    return {
      university,
      sekhem,
      threshold,
      status: 'below',
      deltaNeeded: calculateDelta(deficit, university),
    };
  });
}

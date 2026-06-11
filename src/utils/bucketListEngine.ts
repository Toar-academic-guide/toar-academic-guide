import { UNIVERSITIES } from '@/data/degreesData';
import { allPrograms } from '@/data/degrees';
import { calculateSekhem, calculateDelta } from '@/utils/sekhemCalculators';
import { INSTITUTION_BY_NAME } from '@/data/institutions';
import type { UserScores, DeltaNeeded } from '@/types';
import type { Program } from '@/data/degrees/types';

// ── Result types ──────────────────────────────────────────────────────────────

export type BucketStatus =
  | 'qualified'     // user's scores meet or exceed the threshold
  | 'gap'           // user's scores are below the threshold — delta calculated
  | 'requirements'  // admissionType === 'requirements', no sekhem threshold
  | 'no-data';      // scores missing or threshold not available for this program

export interface BucketEntry {
  program: Program;
  status: BucketStatus;
  /** Calculated sekhem on the university's own scale (sekhem-track only) */
  sekhem?: number;
  /** Admission threshold for this program+university pair */
  threshold?: number;
  /** How many raw points are needed to close the gap (gap status only) */
  delta?: DeltaNeeded;
}

// ── Main analyser ─────────────────────────────────────────────────────────────

/**
 * Given an array of saved program IDs and the user's current academic scores,
 * returns a `BucketEntry[]` — one entry per resolved program ID.
 *
 * Institution → UniversityId resolution uses the master INSTITUTIONS dictionary
 * (via `INSTITUTION_BY_NAME[program.institution].universityId`) instead of a
 * brittle hand-rolled name map.
 *
 * Unknown IDs are silently skipped so stale saved data never throws.
 * TAU engineering bonuses are not applied (conservative baseline).
 */
export function analyzeBucketList(
  savedProgramIds: string[],
  userScores: UserScores | null,
  programs: Program[] = allPrograms,
): BucketEntry[] {
  const entries: BucketEntry[] = [];

  for (const id of savedProgramIds) {
    const program = programs.find((p) => p.id === id);
    if (!program) continue;

    // ── Requirements-track: no sekhem calculation possible ───────────────────
    if (program.admissionType === 'requirements') {
      entries.push({ program, status: 'requirements' });
      continue;
    }

    // ── Sekhem-track: resolve university via master dict ─────────────────────
    const instRecord  = INSTITUTION_BY_NAME[program.institution];
    const univId      = instRecord?.universityId;
    const university  = univId ? UNIVERSITIES.find((u) => u.id === univId) : undefined;
    const threshold   = univId ? (program.thresholds?.[univId] ?? null) : null;

    if (!university || threshold === null) {
      entries.push({ program, status: 'no-data' });
      continue;
    }

    // ── No profile scores yet ────────────────────────────────────────────────
    if (!userScores) {
      entries.push({ program, status: 'no-data', threshold });
      continue;
    }

    // ── Calculate and compare ────────────────────────────────────────────────
    // Engineering bonuses are skipped for a conservative baseline estimate.
    const raw    = calculateSekhem(university, userScores, program, { hasMath5: false, hasPhysics5: false });
    const sekhem =
      university.formulaType === 'technion_linear'
        ? Math.round(raw * 10) / 10
        : Math.round(raw);

    const deficit = threshold - raw;

    if (deficit <= 0) {
      entries.push({ program, status: 'qualified', sekhem, threshold });
    } else {
      entries.push({
        program,
        status:    'gap',
        sekhem,
        threshold,
        delta: calculateDelta(deficit, university),
      });
    }
  }

  return entries;
}

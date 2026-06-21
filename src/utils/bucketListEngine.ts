import { allPrograms } from '@/data/degrees';
import { calculateSekhem, calculateDelta, evaluateMinimumFloorsAdmission } from '@/utils/sekhemCalculators';
import { UNIVERSITIES } from '@/data/degreesData';
import type { UserScores, DeltaNeeded, University } from '@/types';
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
 * Unknown IDs are silently skipped so stale saved data never throws.
 * TAU engineering bonuses are not applied (conservative baseline).
 */
export function analyzeBucketList(
  savedProgramIds: string[],
  userScores: UserScores | null,
  programs: Program[] = allPrograms,
  calculatorInstitutions: University[] = UNIVERSITIES
): BucketEntry[] {
  const entries: BucketEntry[] = [];
  const calculatorInstitutionsById = new Map(
    calculatorInstitutions.map((institution) => [institution.id, institution])
  );

  for (const id of savedProgramIds) {
    const program = programs.find((p) => p.id === id);
    if (!program) continue;

    // ── Requirements-track: no sekhem calculation possible ───────────────────
    if (program.admissionType === 'requirements') {
      entries.push({ program, status: 'requirements' });
      continue;
    }

    // ── Sekhem-track: resolve the calculator config from DB-backed institutions ──
    const thresholdIds = Object.entries(program.thresholds ?? {})
      .filter(([, threshold]) => threshold !== null)
      .map(([institutionId]) => institutionId);
    const calculatorInstitutionId =
      (program.institutionId && calculatorInstitutionsById.has(program.institutionId)
        ? program.institutionId
        : undefined) ?? thresholdIds.find((institutionId) => calculatorInstitutionsById.has(institutionId));
    const university = calculatorInstitutionId
      ? calculatorInstitutionsById.get(calculatorInstitutionId)
      : undefined;
    const threshold = calculatorInstitutionId ? (program.thresholds?.[calculatorInstitutionId] ?? null) : null;

    if (!university || threshold === null) {
      entries.push({ program, status: 'no-data' });
      continue;
    }

    // ── No profile scores yet ────────────────────────────────────────────────
    if (!userScores) {
      entries.push({ program, status: 'no-data', threshold });
      continue;
    }

    // ── Minimum-floors model (colleges) ────────────────────────────────────
    if (university.formulaType === 'minimum_floors') {
      const { meetsAll, deltaNeeded } = evaluateMinimumFloorsAdmission(university, threshold, userScores);

      if (meetsAll) {
        entries.push({ program, status: 'qualified', sekhem: userScores.psychometric, threshold });
      } else {
        entries.push({
          program,
          status: 'gap',
          sekhem: userScores.psychometric,
          threshold,
          delta: deltaNeeded,
        });
      }
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

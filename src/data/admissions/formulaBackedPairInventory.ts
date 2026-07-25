import type { Program } from '@/data/degrees/types';
import { INSTITUTIONS, INSTITUTION_BY_ID, type InstitutionId } from '@/data/institutions';

export const FORMULA_BACKED_INSTITUTION_IDS = [
  'tau',
  'huji',
  'bgu',
  'haifa',
  'technion',
  'colman',
] as const;

export const FORMULA_BACKED_EXCLUDED_INSTITUTION_IDS = ['ariel', 'biu'] as const;

export type FormulaBackedInstitutionId = (typeof FORMULA_BACKED_INSTITUTION_IDS)[number];
export type FormulaBackedExcludedInstitutionId =
  (typeof FORMULA_BACKED_EXCLUDED_INSTITUTION_IDS)[number];
export type FormulaBackedPairDiscovery = 'threshold' | 'explicit_program' | 'reviewed_override';

export interface FormulaBackedPair {
  id: string;
  programId: string;
  programName: string;
  institutionId: InstitutionId;
  cutoff: number | null;
  discovery: FormulaBackedPairDiscovery;
}

export interface FormulaBackedPairInventoryError {
  code: 'duplicate_pair' | 'missing_institution_mapping' | 'missing_institution_policy';
  programId: string;
  institutionId: string | null;
  pairId: string | null;
  message: string;
}

export interface FormulaBackedPairInventory {
  pairs: FormulaBackedPair[];
  excludedPairs: FormulaBackedPair[];
  totalsByInstitution: Record<FormulaBackedInstitutionId, number>;
  total: number;
  errors: FormulaBackedPairInventoryError[];
}

export interface FormulaBackedSeedPairSource {
  programs: Array<{ id: string; admissionType: string }>;
  programInstitutions: Array<{ programId: string; institutionId: string }>;
}

export interface FormulaBackedSeedReconciliation {
  isMatching: boolean;
  missingPairIds: string[];
  unexpectedPairIds: string[];
}

interface ProgramPairResolution {
  pairs: FormulaBackedPair[];
  errors: FormulaBackedPairInventoryError[];
}

const INCLUDED_INSTITUTION_IDS = new Set<string>(FORMULA_BACKED_INSTITUTION_IDS);
const EXCLUDED_INSTITUTION_IDS = new Set<string>(FORMULA_BACKED_EXCLUDED_INSTITUTION_IDS);
const REVIEWED_REQUIREMENTS_PAIR_IDS = new Set(['colmgmt_cs__colman']);

export function formulaBackedPairId(programId: string, institutionId: string): string {
  return `${programId}__${institutionId}`;
}

function resolveInstitutionId(value: string): InstitutionId | undefined {
  if (value in INSTITUTION_BY_ID) {
    return value as InstitutionId;
  }

  return INSTITUTIONS.find((institution) => institution.universityId === value)?.id;
}

function cutoffFor(program: Program, institutionId: InstitutionId): number | null {
  const institution = INSTITUTION_BY_ID[institutionId];
  const universityId = institution?.universityId ?? institutionId;
  return program.thresholds?.[universityId] ?? program.thresholds?.[institutionId] ?? null;
}

function pairFor(args: {
  program: Program;
  institutionId: InstitutionId;
  discovery: FormulaBackedPairDiscovery;
}): FormulaBackedPair {
  const { program, institutionId, discovery } = args;

  return {
    id: formulaBackedPairId(program.id, institutionId),
    programId: program.id,
    programName: program.name,
    institutionId,
    cutoff: cutoffFor(program, institutionId),
    discovery,
  };
}

function resolveProgramPairs(program: Program): ProgramPairResolution {
  const pairsById = new Map<string, FormulaBackedPair>();
  const errors: FormulaBackedPairInventoryError[] = [];

  const addPair = (institutionId: InstitutionId, discovery: FormulaBackedPairDiscovery): void => {
    const pair = pairFor({ program, institutionId, discovery });
    const existing = pairsById.get(pair.id);

    if (!existing || existing.discovery === 'threshold') {
      pairsById.set(pair.id, pair);
    }
  };

  if (program.admissionType === 'sekhem') {
    if (program.institutionId) {
      const institutionId = resolveInstitutionId(program.institutionId);

      if (institutionId) {
        addPair(institutionId, 'explicit_program');
      } else {
        errors.push({
          code: 'missing_institution_mapping',
          programId: program.id,
          institutionId: program.institutionId,
          pairId: null,
          message: `Formula-backed program "${program.id}" references unknown institution or university "${program.institutionId}".`,
        });
      }
    }

    for (const [universityId, threshold] of Object.entries(program.thresholds ?? {})) {
      if (threshold === null) {
        continue;
      }

      const institutionId = resolveInstitutionId(universityId);
      if (!institutionId) {
        errors.push({
          code: 'missing_institution_mapping',
          programId: program.id,
          institutionId: universityId,
          pairId: null,
          message: `Formula-backed program "${program.id}" references unknown institution or university "${universityId}".`,
        });
        continue;
      }

      addPair(institutionId, 'threshold');
    }
  }

  const reviewedOverrideId = formulaBackedPairId(program.id, program.institutionId ?? '');
  if (REVIEWED_REQUIREMENTS_PAIR_IDS.has(reviewedOverrideId) && program.institutionId) {
    addPair(program.institutionId, 'reviewed_override');
  }

  return {
    pairs: [...pairsById.values()],
    errors,
  };
}

export function buildFormulaBackedPairInventory(
  programs: readonly Program[],
): FormulaBackedPairInventory {
  const pairsById = new Map<string, FormulaBackedPair>();
  const excludedPairsById = new Map<string, FormulaBackedPair>();
  const errors: FormulaBackedPairInventoryError[] = [];

  for (const program of programs) {
    const resolution = resolveProgramPairs(program);
    errors.push(...resolution.errors);

    for (const pair of resolution.pairs) {
      const destination = EXCLUDED_INSTITUTION_IDS.has(pair.institutionId)
        ? excludedPairsById
        : pairsById;

      if (
        !INCLUDED_INSTITUTION_IDS.has(pair.institutionId) &&
        !EXCLUDED_INSTITUTION_IDS.has(pair.institutionId)
      ) {
        errors.push({
          code: 'missing_institution_policy',
          programId: pair.programId,
          institutionId: pair.institutionId,
          pairId: pair.id,
          message: `Formula-backed pair "${pair.id}" has no inventory inclusion or exclusion policy.`,
        });
        continue;
      }

      if (destination.has(pair.id)) {
        errors.push({
          code: 'duplicate_pair',
          programId: pair.programId,
          institutionId: pair.institutionId,
          pairId: pair.id,
          message: `Duplicate formula-backed pair "${pair.id}".`,
        });
        continue;
      }

      destination.set(pair.id, pair);
    }
  }

  const pairs = [...pairsById.values()].sort((left, right) => left.id.localeCompare(right.id));
  const excludedPairs = [...excludedPairsById.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const totalsByInstitution = Object.fromEntries(
    FORMULA_BACKED_INSTITUTION_IDS.map((institutionId) => [institutionId, 0]),
  ) as Record<FormulaBackedInstitutionId, number>;

  for (const pair of pairs) {
    totalsByInstitution[pair.institutionId as FormulaBackedInstitutionId] += 1;
  }

  return {
    pairs,
    excludedPairs,
    totalsByInstitution,
    total: pairs.length,
    errors,
  };
}

export function allResolvedFormulaBackedPairs(
  inventory: FormulaBackedPairInventory,
): FormulaBackedPair[] {
  return [...inventory.pairs, ...inventory.excludedPairs];
}

export function reconcileFormulaBackedSeedPairs(
  inventory: FormulaBackedPairInventory,
  seed: FormulaBackedSeedPairSource,
): FormulaBackedSeedReconciliation {
  const expectedPairIds = new Set(inventory.pairs.map((pair) => pair.id));
  const admissionTypesByProgramId = new Map(
    seed.programs.map((program) => [program.id, program.admissionType]),
  );
  const actualPairIds = new Set(
    seed.programInstitutions
      .filter(({ programId, institutionId }) => {
        if (!INCLUDED_INSTITUTION_IDS.has(institutionId)) {
          return false;
        }

        const pairId = formulaBackedPairId(programId, institutionId);
        return (
          admissionTypesByProgramId.get(programId) === 'sekhem' ||
          REVIEWED_REQUIREMENTS_PAIR_IDS.has(pairId)
        );
      })
      .map(({ programId, institutionId }) => formulaBackedPairId(programId, institutionId)),
  );
  const missingPairIds = [...expectedPairIds].filter((pairId) => !actualPairIds.has(pairId)).sort();
  const unexpectedPairIds = [...actualPairIds]
    .filter((pairId) => !expectedPairIds.has(pairId))
    .sort();

  return {
    isMatching: missingPairIds.length === 0 && unexpectedPairIds.length === 0,
    missingPairIds,
    unexpectedPairIds,
  };
}

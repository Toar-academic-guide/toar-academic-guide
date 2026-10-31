import { describe, expect, it } from 'vitest';

import type { Program } from '@/data/degrees/types';
import {
  buildFormulaBackedPairInventory,
  formulaBackedPairId,
  reconcileFormulaBackedSeedPairs,
} from './formulaBackedPairInventory';
import { allPrograms } from '@/data/degrees';
import { BIU_PUBLISHED_ROUTE_PROGRAM_IDS } from './biuPublishedRoutes';

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'test_program',
    name: 'תוכנית בדיקה',
    institution: 'אוניברסיטה',
    type: 'academic',
    category: 'בדיקות',
    profileScore: { AN: 1, TE: 1, CR: 1, SO: 1, LE: 1, OR: 1, DI: 1, ER: 1 },
    admissionType: 'sekhem',
    admissionRequirements: [],
    thresholds: {},
    ...overrides,
  };
}

describe('formulaBackedPairInventory', () => {
  it('includes exactly the encoded BIU pairs and keeps future and deferred programmes excluded', () => {
    const inventory = buildFormulaBackedPairInventory([
      ...allPrograms,
      makeProgram({ id: 'biu_future', institutionId: 'biu', thresholds: { biu: 700 } }),
    ]);
    const expected = [
      ...BIU_PUBLISHED_ROUTE_PROGRAM_IDS,
      'biu_cs',
      'biu_ee',
      'biu_socialwork',
      'cs',
      'ee',
    ]
      .map((id) => `${id}__biu`)
      .sort();
    // Approved test update, Jorje 2026-10-28
    expect(
      inventory.pairs
        .filter((pair) => pair.institutionId === 'biu')
        .map((pair) => pair.id)
        .sort(),
    ).toEqual(expected);
    for (const programId of [
      'cs',
      'ee',
      'psychology',
      'medicine',
      'biu_psychology',
      'biu_medicine',
      'biu_optometry',
      'biu_future',
    ]) {
      // Approved test update, Jorje 2026-10-28
      expect(
        ['cs', 'ee'].includes(programId) ? inventory.pairs : inventory.excludedPairs,
      ).toContainEqual(expect.objectContaining({ programId, institutionId: 'biu' }));
    }
    const reconciliation = reconcileFormulaBackedSeedPairs(inventory, {
      programs: allPrograms.map((program) => ({
        id: program.id,
        admissionType: program.admissionType,
      })),
      programInstitutions: [...inventory.pairs, ...inventory.excludedPairs].map((pair) => ({
        programId: pair.programId,
        institutionId: pair.institutionId,
      })),
    });
    expect(reconciliation).toEqual({ isMatching: true, missingPairIds: [], unexpectedPairIds: [] });
  });
  it('expands non-null legacy threshold maps into explicit pair identities', () => {
    const inventory = buildFormulaBackedPairInventory([
      makeProgram({
        id: 'legacy_multi',
        thresholds: { tau: 640, huji: 635, bgu: null },
      }),
    ]);

    expect(inventory.pairs.map((pair) => pair.id)).toEqual([
      'legacy_multi__huji',
      'legacy_multi__tau',
    ]);
    expect(inventory.errors).toEqual([]);
  });

  it('keeps an explicit formula-backed pair when its cutoff is currently null', () => {
    const inventory = buildFormulaBackedPairInventory([
      makeProgram({
        id: 'bgu_pending_cutoff',
        institution: 'אוניברסיטת בן-גוריון בנגב',
        institutionId: 'bgu',
        thresholds: { bgu: null },
      }),
    ]);

    expect(inventory.pairs).toEqual([
      expect.objectContaining({
        id: 'bgu_pending_cutoff__bgu',
        institutionId: 'bgu',
        cutoff: null,
        discovery: 'explicit_program',
      }),
    ]);
  });

  it('adds a newly discovered in-scope pair to the denominator', () => {
    const inventory = buildFormulaBackedPairInventory([
      makeProgram({
        id: 'haifa_new_program',
        thresholds: { haifa: 640 },
      }),
    ]);

    expect(inventory.pairs.map((pair) => pair.id)).toEqual(['haifa_new_program__haifa']);
    expect(inventory.totalsByInstitution.haifa).toBe(1);
  });

  it('records Ariel and Bar-Ilan as excluded instead of counting them as complete', () => {
    const inventory = buildFormulaBackedPairInventory([
      makeProgram({
        id: 'excluded_program',
        thresholds: { ariel: 600, biu: 650, tau: 680 },
      }),
    ]);

    expect(inventory.pairs.map((pair) => pair.id)).toEqual(['excluded_program__tau']);
    expect(inventory.excludedPairs.map((pair) => pair.id)).toEqual([
      'excluded_program__ariel',
      'excluded_program__biu',
    ]);
    expect(inventory.total).toBe(1);
  });

  it('reports duplicate pair identities instead of silently overwriting them', () => {
    const duplicate = makeProgram({
      id: 'duplicate_program',
      thresholds: { tau: 640 },
    });
    const inventory = buildFormulaBackedPairInventory([duplicate, duplicate]);

    expect(inventory.pairs.map((pair) => pair.id)).toEqual(['duplicate_program__tau']);
    expect(inventory.errors).toContainEqual({
      code: 'duplicate_pair',
      programId: 'duplicate_program',
      institutionId: 'tau',
      pairId: formulaBackedPairId('duplicate_program', 'tau'),
      message: 'Duplicate formula-backed pair "duplicate_program__tau".',
    });
  });

  it('reports a non-null threshold whose institution cannot be resolved', () => {
    const inventory = buildFormulaBackedPairInventory([
      makeProgram({
        id: 'unknown_mapping',
        thresholds: { unknown_university: 600 },
      }),
    ]);

    expect(inventory.pairs).toEqual([]);
    expect(inventory.errors).toContainEqual({
      code: 'missing_institution_mapping',
      programId: 'unknown_mapping',
      institutionId: 'unknown_university',
      pairId: null,
      message:
        'Formula-backed program "unknown_mapping" references unknown institution or university "unknown_university".',
    });
  });
});

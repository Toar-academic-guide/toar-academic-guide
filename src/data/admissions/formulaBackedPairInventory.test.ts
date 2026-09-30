import { describe, expect, it } from 'vitest';

import type { Program } from '@/data/degrees/types';
import { buildFormulaBackedPairInventory, formulaBackedPairId } from './formulaBackedPairInventory';

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

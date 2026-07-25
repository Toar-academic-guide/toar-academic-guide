import { describe, expect, it } from 'vitest';

import { allPrograms } from '@/data/degrees';
import { buildFormulaBackedPairInventory } from './formulaBackedPairInventory';
import {
  FORMULA_BACKED_VERIFICATION_LEDGER,
  formulaPairVerificationCompletion,
  reconcileFormulaPairVerificationLedger,
} from './formulaBackedVerificationLedger';

describe('formula-backed verification ledger', () => {
  const inventory = buildFormulaBackedPairInventory(allPrograms);

  it('has one reviewed capability record for every in-scope pair', () => {
    const reconciliation = reconcileFormulaPairVerificationLedger(
      inventory,
      FORMULA_BACKED_VERIFICATION_LEDGER,
    );

    expect(reconciliation).toEqual({
      isMatching: true,
      missingPairIds: [],
      unexpectedPairIds: [],
      duplicatePairIds: [],
    });
    expect(FORMULA_BACKED_VERIFICATION_LEDGER).toHaveLength(135);
  });

  it('counts only fully proved pairs as exact', () => {
    const completion = formulaPairVerificationCompletion(
      inventory,
      FORMULA_BACKED_VERIFICATION_LEDGER,
    );

    expect(completion).toMatchObject({
      total: 135,
      exact: 56,
      withheld: 79,
      isComplete: false,
    });
    expect(completion.totalsByInstitution).toEqual({
      tau: { total: 35, exact: 28, withheld: 7, stale: 0, blocked: 0 },
      huji: { total: 29, exact: 28, withheld: 1, stale: 0, blocked: 0 },
      bgu: { total: 29, exact: 0, withheld: 29, stale: 0, blocked: 0 },
      haifa: { total: 27, exact: 0, withheld: 27, stale: 0, blocked: 0 },
      technion: { total: 14, exact: 0, withheld: 14, stale: 0, blocked: 0 },
      colman: { total: 1, exact: 0, withheld: 1, stale: 0, blocked: 0 },
    });
    expect(
      FORMULA_BACKED_VERIFICATION_LEDGER.filter((entry) => entry.state === 'exact').map(
        (entry) => entry.pairId,
      ),
    ).toEqual([
      'accounting__tau',
      'architecture__tau',
      'biology__tau',
      'communication__tau',
      'cs__tau',
      'datascience__tau',
      'economics__tau',
      'education__tau',
      'ee__tau',
      'law__tau',
      'me__tau',
      'nursing__tau',
      'occupational_therapy__tau',
      'political_science__tau',
      'psychology__tau',
      'social_work__tau',
      'tau_accounting__tau',
      'tau_biology__tau',
      'tau_cs__tau',
      'tau_datascience__tau',
      'tau_economics__tau',
      'tau_ee__tau',
      'tau_industrial__tau',
      'tau_law__tau',
      'tau_me__tau',
      'tau_occupational_therapy__tau',
      'tau_psychology__tau',
      'tau_socialwork__tau',
      'accounting__huji',
      'biology__huji',
      'business__huji',
      'communication__huji',
      'cs__huji',
      'datascience__huji',
      'economics__huji',
      'education__huji',
      'huji_accounting__huji',
      'huji_biology__huji',
      'huji_business__huji',
      'huji_cs__huji',
      'huji_datascience__huji',
      'huji_economics__huji',
      'huji_law__huji',
      'huji_medicine__huji',
      'huji_occupational_therapy__huji',
      'huji_psychology__huji',
      'huji_socialwork__huji',
      'law__huji',
      'medicine__huji',
      'nursing__huji',
      'nutrition__huji',
      'occupational_therapy__huji',
      'pharmacy__huji',
      'political_science__huji',
      'psychology__huji',
      'social_work__huji',
    ]);
  });

  it('names a newly discovered pair that lacks a reviewed ledger record', () => {
    const expandedInventory = {
      ...inventory,
      pairs: [
        ...inventory.pairs,
        {
          id: 'new_program__tau',
          programId: 'new_program',
          programName: 'New Program',
          institutionId: 'tau' as const,
          cutoff: 700,
          discovery: 'threshold' as const,
        },
      ],
      total: inventory.total + 1,
      totalsByInstitution: {
        ...inventory.totalsByInstitution,
        tau: inventory.totalsByInstitution.tau + 1,
      },
    };

    expect(
      reconcileFormulaPairVerificationLedger(expandedInventory, FORMULA_BACKED_VERIFICATION_LEDGER),
    ).toMatchObject({
      isMatching: false,
      missingPairIds: ['new_program__tau'],
    });
  });

  it('never puts explicitly excluded Ariel or Bar-Ilan pairs in completion totals', () => {
    const ledgerPairIds = new Set(FORMULA_BACKED_VERIFICATION_LEDGER.map((entry) => entry.pairId));

    expect(inventory.excludedPairs.length).toBeGreaterThan(0);
    expect(inventory.excludedPairs.some((pair) => ledgerPairIds.has(pair.id))).toBe(false);
  });
});

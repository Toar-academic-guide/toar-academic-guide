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
      exact: 126,
      withheld: 9,
      isComplete: false,
    });
    expect(completion.totalsByInstitution).toEqual({
      tau: { total: 35, exact: 30, withheld: 5, stale: 0, blocked: 0 },
      huji: { total: 29, exact: 28, withheld: 1, stale: 0, blocked: 0 },
      bgu: { total: 29, exact: 28, withheld: 1, stale: 0, blocked: 0 },
      haifa: { total: 27, exact: 27, withheld: 0, stale: 0, blocked: 0 },
      technion: { total: 14, exact: 13, withheld: 1, stale: 0, blocked: 0 },
      colman: { total: 1, exact: 0, withheld: 1, stale: 0, blocked: 0 },
    });
    expect(
      FORMULA_BACKED_VERIFICATION_LEDGER.filter((entry) => entry.state === 'exact').map(
        (entry) => entry.pairId,
      ),
    ).toHaveLength(126);
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

  it('records an authority-specific reason for every withheld pair', () => {
    const withheld = FORMULA_BACKED_VERIFICATION_LEDGER.filter(
      (entry) => entry.state === 'withheld',
    );

    expect(withheld).toHaveLength(9);
    expect(withheld.every((entry) => entry.reason.length > 80)).toBe(true);
    expect(withheld.every((entry) => entry.sourceUrl.startsWith('https://'))).toBe(true);
    expect(
      withheld
        .filter((entry) =>
          ['tau_infosystems__tau', 'architecture__technion', 'colmgmt_cs__colman'].includes(
            entry.pairId,
          ),
        )
        .every(
          (entry) =>
            entry.officialProgramId === null &&
            !entry.liveProof.comparedScore &&
            !entry.liveProof.comparedVerdict,
        ),
    ).toBe(true);
  });
});

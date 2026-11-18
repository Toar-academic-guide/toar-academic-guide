import { expect, it, vi } from 'vitest';
import { allPrograms } from '@/data/degrees';
import { buildFormulaBackedPairInventory } from '@/data/admissions/formulaBackedPairInventory';
import {
  FORMULA_BACKED_VERIFICATION_LEDGER,
  formulaPairVerificationCompletion,
} from '@/data/admissions/formulaBackedVerificationLedger';

vi.mock('server-only', () => ({}));

it('retains the pair-level verification baseline independently of the institution registry', () => {
  const inventory = buildFormulaBackedPairInventory(allPrograms);
  expect(
    formulaPairVerificationCompletion(inventory, FORMULA_BACKED_VERIFICATION_LEDGER),
  ).toMatchObject({
    // Approved test update, Jorje 2026-10-31: generic BGU medicine adds one pair; NULL HUJI medicine retains its independent authority.
    total: 144,
    // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
    exact: 125,
    // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
    // Approved test update, Jorje 2026-10-31: generic BGU medicine lacks exact alias replay proof and adds one withheld pair.
    withheld: 18,
    isComplete: false,
  });
});

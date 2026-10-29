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
    total: 143,
    // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
    exact: 125,
    // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
    withheld: 17,
    isComplete: false,
  });
});

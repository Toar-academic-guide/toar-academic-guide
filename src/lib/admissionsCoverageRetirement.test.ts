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
    exact: 123,
    withheld: 19,
    isComplete: false,
  });
});

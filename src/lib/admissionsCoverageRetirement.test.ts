import { expect, it, vi } from 'vitest';
import { allPrograms } from '@/data/degrees';
import { buildFormulaBackedPairInventory } from '@/data/admissions/formulaBackedPairInventory';
import {
  FORMULA_BACKED_VERIFICATION_LEDGER,
  formulaPairVerificationCompletion,
} from '@/data/admissions/formulaBackedVerificationLedger';

vi.mock('server-only', () => ({}));

it('retains the pair-level verification baseline without the retired institution registry', () => {
  const inventory = buildFormulaBackedPairInventory(allPrograms);
  expect(
    formulaPairVerificationCompletion(inventory, FORMULA_BACKED_VERIFICATION_LEDGER),
  ).toMatchObject({
    total: 141,
    exact: 124,
    withheld: 16,
    isComplete: false,
  });
});

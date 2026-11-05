// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import TechnionMedicineComparison from '@/components/TechnionMedicineComparison';

it.each([
  [92, 'בסף', 'text-green-700'],
  [92.1, 'מעל סף', 'text-green-700'],
  [91.9, 'מתחת לסף', 'text-slate-500'],
])('describes the medicine invitation boundary at %s', (score, relation, colour) => {
  render(<TechnionMedicineComparison score={score as number} />);
  // Approved test update, Jorje 2026-10-29
  expect(
    screen.getByText(`ציון הקבלה שלך ${score}, ${relation} הזימון המשוער (92)`).className,
  ).toContain(colour);
});

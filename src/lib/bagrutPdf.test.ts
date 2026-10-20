import { expect, it } from 'vitest';
import { parseGradeLines } from './bagrutPdf';

it('extracts unambiguous subject rows, not identity numbers or unrelated scores', () => {
  expect(
    parseGradeLines(['תעודת זהות 123456789', 'מתמטיקה 5 92', 'אנגלית 88 5', 'ממוצע 110']),
  ).toEqual([
    { label: 'מתמטיקה', units: 5, grade: 92 },
    { label: 'אנגלית', units: 5, grade: 88 },
  ]);
});
it('leaves ambiguous rows for manual entry rather than inventing a grade', () => {
  expect(parseGradeLines(['מתמטיקה 5 80 90', 'אנגלית 5', 'ביולוגיה 5 121'])).toEqual([]);
});

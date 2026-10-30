import { SECTORS } from '@/data/bagrutSubjects';

export function defaultUnitsFor(label: string, sector: string): number {
  const preferred = label === 'אנגלית' || label === 'מתמטיקה' ? 3 : 2;
  const subject = SECTORS[sector]?.find((subject) => subject.n === label);
  const min = subject?.min ?? 1;
  const max = subject?.max ?? 5;
  return preferred >= min && preferred <= max ? preferred : min;
}

export function unitOptionsFor(label: string, sector: string, storedUnits: number | '') {
  const subject = SECTORS[sector]?.find((subject) => subject.n === label);
  const min = subject?.min ?? 1;
  const max = subject?.max ?? 5;
  const options = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  if (storedUnits !== '' && !options.includes(storedUnits)) options.push(storedUnits);
  return options;
}

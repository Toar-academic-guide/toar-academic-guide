import { SECTORS } from '@/data/bagrutSubjects';

export function unitOptionsFor(label: string, sector: string, storedUnits: number | '') {
  const subject = SECTORS[sector]?.find((subject) => subject.n === label);
  const min = subject?.min ?? 1;
  const max = subject?.max ?? 5;
  const options = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  if (storedUnits !== '' && !options.includes(storedUnits)) options.push(storedUnits);
  return options;
}

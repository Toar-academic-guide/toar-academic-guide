import reviewedCategories from './reviewedInstitutionCategories.json';
import type { Program } from './types';

const broadLabels: Readonly<Record<string, string>> = reviewedCategories;

/** A legacy URL can identify a department or admissions group without identifying a programme. */
export function isInstitutionCategory(program: Pick<Program, 'id' | 'name' | 'institution'>) {
  const label = broadLabels[program.id];
  if (!label) return false;
  return (
    program.name === label ||
    ['-', '–', '—'].some((dash) => program.name === `${label} ${dash} ${program.institution}`)
  );
}

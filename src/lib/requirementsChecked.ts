import repair from '@/data/admissions/catalogueContentRepair.json';
import { canonicalInstitutionId } from '@/data/institutionAliases';
import { institutionLink } from '@/lib/institutionLinks';
import type { CatalogueInstitution } from '@/types/catalogue';

export interface RequirementsChecked {
  date: string;
  sourceUrl?: string;
}

export function formatRequirementsCheckedDate(isoDate: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const leapYear = +year % 4 === 0 && (+year % 100 !== 0 || +year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (+day < 1 || +day > (daysInMonth[+month - 1] ?? 0)) return undefined;
  return `${day}.${month}.${year}`;
}

/** Check the selected row's raw notes, before display filtering or fallback copy. */
export function getRequirementsChecked(
  sourceProgramId: string,
  institution: Pick<CatalogueInstitution, 'id'>,
  sourceNotes?: readonly string[],
): RequirementsChecked | undefined {
  const entry = repair.requirements.find(
    (row) =>
      row.programId === sourceProgramId &&
      canonicalInstitutionId(row.institutionId) === canonicalInstitutionId(institution.id),
  );
  if (
    !entry ||
    !sourceNotes ||
    sourceNotes.length !== entry.notes.length ||
    !sourceNotes.every((note, index) => note === entry.notes[index])
  ) {
    return undefined;
  }
  const date = formatRequirementsCheckedDate(entry.checkedAt);
  if (!date) return undefined;
  return {
    date,
    sourceUrl: institutionLink(entry.sourceUrl, institution.id, { fallbackToWebsite: false }),
  };
}

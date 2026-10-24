import repair from '@/data/admissions/catalogueContentRepair.json';
import { ACADEMIC_PROGRAMS } from '@/data/degrees/academic';
import { academicPrograms } from '@/data/degrees/academicPrograms';
import { vocationalPrograms } from '@/data/degrees/vocationalPrograms';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

// Content commit dates, not request/deploy times. Keep these provenance entries
// in sync when changing the corresponding source; checkedAt remains authoritative
// for reviewed requirements even when their source file is edited later.
const SOURCE_DATES = {
  'src/data/degrees/academic.ts': '2026-10-22T14:40:56+03:00', // 001b47c
  'src/data/degrees/academicPrograms.ts': '2026-10-24T02:43:11+03:00', // 5c8d50c
  'src/data/degrees/vocationalPrograms.ts': '2026-10-21T09:46:07+03:00', // 7e8deab
  'src/data/degrees/index.ts': '2026-10-24T02:43:11+03:00', // 5c8d50c
  'src/data/institutions.ts': '2026-10-21T09:46:07+03:00', // 7e8deab
};

// Snapshot of main 5c8d50c; changing build/request clocks cannot change lastmod.
export const STATIC_PAGE_MODIFIED_AT = '2026-10-24T02:43:11+03:00';

const programSourceDates = new Map([
  ...ACADEMIC_PROGRAMS.map((p) => [p.id, SOURCE_DATES['src/data/degrees/academic.ts']] as const),
  ...academicPrograms.map(
    (p) => [p.id, SOURCE_DATES['src/data/degrees/academicPrograms.ts']] as const,
  ),
  ...vocationalPrograms.map(
    (p) => [p.id, SOURCE_DATES['src/data/degrees/vocationalPrograms.ts']] as const,
  ),
]);

export function latestModified(...dates: (string | undefined)[]): string {
  return dates
    .filter((date): date is string => !!date && Number.isFinite(Date.parse(date)))
    .reduce((latest, date) => (Date.parse(date) > Date.parse(latest) ? date : latest));
}

const programCheckedDates = new Map<string, string>();
for (const row of repair.requirements) {
  programCheckedDates.set(
    row.programId,
    latestModified(row.checkedAt, programCheckedDates.get(row.programId)),
  );
}

export function programModifiedAt(program: CatalogueProgram): string {
  const sourceDate =
    programCheckedDates.get(program.id) ??
    programSourceDates.get(program.id) ??
    SOURCE_DATES['src/data/degrees/index.ts'];
  return latestModified(sourceDate, program.updatedAt);
}

export function institutionModifiedAt(
  institution: CatalogueInstitution,
  programs: CatalogueProgram[],
): string {
  return latestModified(
    SOURCE_DATES['src/data/institutions.ts'],
    institution.updatedAt,
    ...programs
      .filter((p) => p.linkedInstitutionIds.includes(institution.id))
      .map(programModifiedAt),
  );
}

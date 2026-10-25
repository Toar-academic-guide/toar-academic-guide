import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

/** Remove an exact provider suffix when the surrounding context identifies the institution. */
export function institutionProgramName(
  program: Pick<CatalogueProgram, 'name' | 'institution' | 'institutionId'>,
  institution: Pick<CatalogueInstitution, 'id' | 'name'>,
): string {
  const institutionNames = [institution.name];
  // Own programs may use the generator's displayName rather than the page's spelling.
  if (program.institutionId === institution.id) institutionNames.push(program.institution);

  for (const name of institutionNames) {
    for (const dash of ['-', '–', '—']) {
      const suffix = ` ${dash} ${name}`;
      if (!program.name.endsWith(suffix)) continue;
      const shortName = program.name.slice(0, -suffix.length);
      return shortName.trim() ? shortName : program.name;
    }
  }
  return program.name;
}

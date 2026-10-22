import { loadPublicCatalogue } from '@/lib/publicCataloguePages';

type Catalogue = Awaited<ReturnType<typeof loadPublicCatalogue>>;

export async function isIndexableInstitution(id: string, catalogue?: Catalogue): Promise<boolean> {
  const { institutions, programs } = catalogue ?? (await loadPublicCatalogue());
  return (
    !id.startsWith('mon_') &&
    institutions.some((institution) => institution.id === id) &&
    programs.some(
      (program) => program.isListed !== false && program.linkedInstitutionIds.includes(id),
    )
  );
}

export async function isIndexableProgram(id: string, catalogue?: Catalogue): Promise<boolean> {
  const { institutions, programs } = catalogue ?? (await loadPublicCatalogue());
  const program = programs.find((program) => program.id === id);
  return (
    !id.startsWith('mon_') &&
    !!program &&
    program.isListed !== false &&
    institutions.some((institution) => program.linkedInstitutionIds.includes(institution.id))
  );
}

export async function indexableInstitutionIds(): Promise<string[]> {
  const catalogue = await loadPublicCatalogue();
  const flags = await Promise.all(
    catalogue.institutions.map((institution) => isIndexableInstitution(institution.id, catalogue)),
  );
  return catalogue.institutions
    .filter((_, index) => flags[index])
    .map((institution) => institution.id);
}

export async function indexableProgramIds(): Promise<string[]> {
  const catalogue = await loadPublicCatalogue();
  const flags = await Promise.all(
    catalogue.programs.map((program) => isIndexableProgram(program.id, catalogue)),
  );
  return catalogue.programs.filter((_, index) => flags[index]).map((program) => program.id);
}

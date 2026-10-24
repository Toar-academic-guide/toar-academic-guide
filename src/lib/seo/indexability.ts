import { loadPublicCatalogue, subjectProgramPages } from '@/lib/publicCataloguePages';
import { canonicalProgramId } from './programAliases';

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
  catalogue ??= await loadPublicCatalogue();
  const { institutions, programs, generalProgramIds } = catalogue;
  const program = programs.find((program) => program.id === id);
  return (
    canonicalProgramId(id) === id &&
    !id.startsWith('mon_') &&
    !!program &&
    program.isListed !== false &&
    institutions.some((institution) => program.linkedInstitutionIds.includes(institution.id)) &&
    // A subject page that links to no programme page is a thin hub: noindex,follow.
    (!generalProgramIds.has(id) || subjectProgramPages(catalogue, program).size > 0)
  );
}

export async function indexableInstitutionIds(catalogue?: Catalogue): Promise<string[]> {
  catalogue ??= await loadPublicCatalogue();
  const flags = await Promise.all(
    catalogue.institutions.map((institution) => isIndexableInstitution(institution.id, catalogue)),
  );
  return catalogue.institutions
    .filter((_, index) => flags[index])
    .map((institution) => institution.id);
}

export async function indexableProgramIds(catalogue?: Catalogue): Promise<string[]> {
  catalogue ??= await loadPublicCatalogue();
  const flags = await Promise.all(
    catalogue.programs.map((program) => isIndexableProgram(program.id, catalogue)),
  );
  return catalogue.programs.filter((_, index) => flags[index]).map((program) => program.id);
}

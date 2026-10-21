import 'server-only';

import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const PUBLIC_PROGRAMS = getStaticCataloguePrograms();
const PUBLIC_INSTITUTIONS = getStaticCatalogueInstitutions();

async function loadPublicCatalogue() {
  const [programs, institutions] = await Promise.all([
    listCataloguePrograms(),
    listCatalogueInstitutions(),
  ]);

  // The active catalogue owns current IDs. Keep older public URLs available only
  // after a successful read; database failures must not become a static fallback.
  return {
    programs: [
      ...programs.data,
      ...PUBLIC_PROGRAMS.filter(
        (legacy) => !programs.data.some((current) => current.id === legacy.id),
      ),
    ],
    institutions: [
      ...institutions.data,
      ...PUBLIC_INSTITUTIONS.filter(
        (legacy) => !institutions.data.some((current) => current.id === legacy.id),
      ),
    ],
  };
}

export interface PublicProgramPageData {
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
}

export interface PublicInstitutionPageData {
  institution: CatalogueInstitution;
  programs: CatalogueProgram[];
}

export async function getPublicProgramPageData(
  programId: string,
): Promise<PublicProgramPageData | null> {
  const catalogue = await loadPublicCatalogue();
  const program = catalogue.programs.find((candidate) => candidate.id === programId);

  if (!program) {
    return null;
  }

  return {
    program,
    institutions: catalogue.institutions.filter((institution) =>
      program.linkedInstitutionIds.includes(institution.id),
    ),
  };
}

export async function getPublicInstitutionPageData(
  institutionId: string,
): Promise<PublicInstitutionPageData | null> {
  const catalogue = await loadPublicCatalogue();
  const institution = catalogue.institutions.find((candidate) => candidate.id === institutionId);

  if (!institution) {
    return null;
  }

  return {
    institution,
    programs: catalogue.programs.filter(
      (program) =>
        program.isListed !== false && program.linkedInstitutionIds.includes(institution.id),
    ),
  };
}

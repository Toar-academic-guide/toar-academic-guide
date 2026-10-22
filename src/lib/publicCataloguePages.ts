import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const PUBLIC_PROGRAMS = getStaticCataloguePrograms();
const PUBLIC_INSTITUTIONS = getStaticCatalogueInstitutions();

export interface PublicProgramPageData {
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
}

export interface PublicInstitutionPageData {
  institution: CatalogueInstitution;
  programs: CatalogueProgram[];
}

export function getPublicProgramPageData(programId: string): PublicProgramPageData | null {
  const program = PUBLIC_PROGRAMS.find((candidate) => candidate.id === programId);

  if (!program) {
    return null;
  }

  return {
    program,
    institutions: PUBLIC_INSTITUTIONS.filter((institution) =>
      program.linkedInstitutionIds.includes(institution.id),
    ),
  };
}

export function getPublicInstitutionPageData(
  institutionId: string,
): PublicInstitutionPageData | null {
  const institution = PUBLIC_INSTITUTIONS.find((candidate) => candidate.id === institutionId);

  if (!institution) {
    return null;
  }

  return {
    institution,
    programs: PUBLIC_PROGRAMS.filter((program) =>
      program.linkedInstitutionIds.includes(institution.id),
    ),
  };
}

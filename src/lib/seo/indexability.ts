import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getPublicInstitutionPageData, getPublicProgramPageData } from '@/lib/publicCataloguePages';

export function isIndexableInstitution(id: string): boolean {
  return !id.startsWith('mon_') && (getPublicInstitutionPageData(id)?.programs.length ?? 0) > 0;
}

export function isIndexableProgram(id: string): boolean {
  return !id.startsWith('mon_') && (getPublicProgramPageData(id)?.institutions.length ?? 0) > 0;
}

export function indexableInstitutionIds(): string[] {
  return getStaticCatalogueInstitutions()
    .filter((institution) => isIndexableInstitution(institution.id))
    .map((institution) => institution.id);
}

export function indexableProgramIds(): string[] {
  return getStaticCataloguePrograms()
    .filter((program) => isIndexableProgram(program.id))
    .map((program) => program.id);
}

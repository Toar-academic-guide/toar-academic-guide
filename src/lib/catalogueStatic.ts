import { allPrograms } from '@/data/degrees';
import type { Program } from '@/data/degrees/types';
import { INSTITUTIONS, INSTITUTION_BY_NAME, type InstitutionId } from '@/data/institutions';
import { getStaticCalculatorConfig } from '@/lib/calculatorInstitutions';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

function getLinkedInstitutionIds(program: Program): InstitutionId[] {
  if (program.institutionId) {
    return [program.institutionId];
  }

  const byName = INSTITUTION_BY_NAME[program.institution];
  if (byName) {
    return [byName.id];
  }

  const thresholdInstitutions =
    program.thresholds == null
      ? []
      : (Object.entries(program.thresholds)
          .filter(([, threshold]) => threshold !== null)
          .map(([institutionId]) => institutionId) as InstitutionId[]);

  if (thresholdInstitutions.length > 0) {
    return thresholdInstitutions;
  }

  const detailInstitutions =
    program.institutionDetails
      ?.map((detail) => INSTITUTION_BY_NAME[detail.institutionName]?.id)
      .filter((value): value is InstitutionId => Boolean(value)) ?? [];

  return [...new Set(detailInstitutions)];
}

export function toStaticCatalogueProgram(program: Program): CatalogueProgram {
  return {
    ...program,
    linkedInstitutionIds: getLinkedInstitutionIds(program),
  };
}

export function getStaticCataloguePrograms(programs: Program[] = allPrograms): CatalogueProgram[] {
  return programs.map(toStaticCatalogueProgram);
}

export function getStaticCatalogueInstitutions(): CatalogueInstitution[] {
  return INSTITUTIONS.map((institution) => ({
    id: institution.id,
    name: institution.name,
    region: institution.region,
    domain: institution.domain,
    logoUrl: institution.logoUrl,
    programUrl: institution.programUrl,
    calculatorUrl: institution.calculatorUrl,
    universityId: institution.universityId,
    calculatorConfig: getStaticCalculatorConfig(institution.id),
  }));
}

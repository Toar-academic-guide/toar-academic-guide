import { UNIVERSITIES } from '@/data/degreesData';
import type { University } from '@/types';
import type { CatalogueCalculatorConfig, CatalogueInstitution } from '@/types/catalogue';

export function toCatalogueCalculatorConfig(university: University): CatalogueCalculatorConfig {
  return {
    formulaType: university.formulaType,
    scaleDescription: university.scaleDescription,
    ...(university.sekhemWeight ? { sekhemWeight: university.sekhemWeight } : {}),
    ...(university.minPsychometric !== undefined
      ? { minPsychometric: university.minPsychometric }
      : {}),
    ...(university.minBagrut !== undefined ? { minBagrut: university.minBagrut } : {}),
  };
}

export function getStaticCalculatorConfig(institutionId: string): CatalogueCalculatorConfig | undefined {
  const university = UNIVERSITIES.find((entry) => entry.id === institutionId);
  return university ? toCatalogueCalculatorConfig(university) : undefined;
}

export function getCalculatorInstitutionsFromCatalogue(
  institutions: CatalogueInstitution[]
): University[] {
  return institutions.flatMap((institution) => {
    if (!institution.calculatorConfig) {
      return [];
    }

    return [
      {
        id: institution.universityId ?? institution.id,
        name: institution.name,
        formulaType: institution.calculatorConfig.formulaType,
        scaleDescription: institution.calculatorConfig.scaleDescription,
        ...(institution.calculatorConfig.sekhemWeight
          ? { sekhemWeight: institution.calculatorConfig.sekhemWeight }
          : {}),
        ...(institution.calculatorConfig.minPsychometric !== undefined
          ? { minPsychometric: institution.calculatorConfig.minPsychometric }
          : {}),
        ...(institution.calculatorConfig.minBagrut !== undefined
          ? { minBagrut: institution.calculatorConfig.minBagrut }
          : {}),
      },
    ];
  });
}

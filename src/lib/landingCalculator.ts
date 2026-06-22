import { getCalculatorInstitutionsFromCatalogue } from '@/lib/calculatorInstitutions';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { UniversityResult } from '@/types';
import { evaluateUniversities } from '@/utils/sekhemCalculators';

interface LandingCalculatorInput {
  psychometric: number;
  bagrut: number;
  degreeId: string;
}

interface LandingCalculatorState {
  degreeName: string;
  results: UniversityResult[];
}

export function calculateLandingCalculatorState(
  programs: CatalogueProgram[],
  institutions: CatalogueInstitution[],
  input: LandingCalculatorInput
): LandingCalculatorState {
  const degree = programs.find((program) => program.id === input.degreeId);
  if (!degree) {
    return { degreeName: '', results: [] };
  }

  const calculatorInstitutions = getCalculatorInstitutionsFromCatalogue(institutions);
  const results = evaluateUniversities(
    calculatorInstitutions,
    degree,
    { psychometric: input.psychometric, bagrut: input.bagrut },
    { hasMath5: false, hasPhysics5: false }
  );

  return {
    degreeName: degree.name,
    results,
  };
}

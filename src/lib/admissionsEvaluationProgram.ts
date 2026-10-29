import 'server-only';
import { BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS } from '@/data/admissions/batchCUnsupportedProgramIds';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { BATCH_B_PROGRAMS } from '@/server/admissions/batchBManualPathEvaluation';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

/** The evaluate route's identity lookup, shared with calculator offering selection. */
export function findAdmissionsEvaluationProgram(
  programs: CatalogueProgram[],
  degreeId: string,
): CatalogueProgram | undefined {
  const resolvedId = BATCH_B_PROGRAMS[degreeId] ? degreeId : canonicalProgramId(degreeId);
  const program = programs.find((program) => program.id === resolvedId);
  if (program || !Object.hasOwn(BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS, resolvedId)) {
    return program;
  }
  // Keep known unsupported identities resolvable when the runtime catalogue omits them.
  return getStaticCataloguePrograms().find((entry) => entry.id === resolvedId);
}

export function resolveAdmissionsEvaluationInstitutions(
  program: CatalogueProgram,
  institutions: CatalogueInstitution[],
): CatalogueInstitution[] {
  const institutionId = BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS[program.id];
  if (
    !institutionId ||
    !program.linkedInstitutionIds.includes(institutionId) ||
    institutions.some((institution) => institution.id === institutionId)
  ) {
    return institutions;
  }
  // The evaluator skips missing institutions; use only the existing Batch C institution identity.
  const institution = getStaticCatalogueInstitutions().find((entry) => entry.id === institutionId);
  return institution ? [...institutions, institution] : institutions;
}

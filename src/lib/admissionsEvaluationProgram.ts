import 'server-only';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { BATCH_B_PROGRAMS } from '@/server/admissions/batchBManualPathEvaluation';
import type { CatalogueProgram } from '@/types/catalogue';

/** The evaluate route's identity lookup, shared with calculator offering selection. */
export function findAdmissionsEvaluationProgram(
  programs: CatalogueProgram[],
  degreeId: string,
): CatalogueProgram | undefined {
  const resolvedId = BATCH_B_PROGRAMS[degreeId] ? degreeId : canonicalProgramId(degreeId);
  return programs.find((program) => program.id === resolvedId);
}

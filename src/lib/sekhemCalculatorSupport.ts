import 'server-only';
import { cache } from 'react';
import { canonicalProgramId } from './seo/programAliases';
import { isBatchCUnsupportedProgramId } from '@/data/admissions/batchCUnsupportedProgramIds';
import {
  formulaBackedPairScope,
  getFormulaPairVerificationEntry,
} from '@/data/admissions/formulaBackedVerificationLedger';
import { isBiuPublishedRoutePair } from '@/data/admissions/biuPublishedRoutes';
import { isBatchBManualProgram } from '@/server/admissions/batchBManualPathEvaluation';
import { loadPublicCatalogue } from './publicCataloguePages';
import { listCataloguePrograms } from '@/server/catalogue/queries';
import { findAdmissionsEvaluationProgram } from './admissionsEvaluationProgram';
import type { CalculatorOffering } from './sekhemCalculator';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const institutionsInScope = new Set([
  'tau',
  'huji',
  'bgu',
  'haifa',
  'technion',
  'reichman',
  'biu',
  'afeka',
  'hit',
]);

/** Identity comes from the public catalogue, not a formula/coverage registry. */
export function calculatorOfferings(
  programs: CatalogueProgram[],
  institutions: CatalogueInstitution[],
  generalProgramIds = new Set(programs.filter((p) => !p.institutionId).map((p) => p.id)),
): CalculatorOffering[] {
  const available = programs.filter(
    (p) => p.type === 'academic' && p.isListed !== false && canonicalProgramId(p.id) === p.id,
  );
  const pairs = new Map<string, CalculatorOffering>();
  for (const program of available) {
    for (const institution of institutions) {
      if (
        !sekhemPairSupport(program, institution.id) ||
        !program.linkedInstitutionIds.includes(institution.id)
      )
        continue;
      const specific = generalProgramIds.has(program.id)
        ? available.find(
            (p) =>
              !generalProgramIds.has(p.id) &&
              p.institutionId === institution.id &&
              !!sekhemPairSupport(p, institution.id) &&
              p.name === program.name,
          )
        : undefined;
      const target = specific ?? program;
      pairs.set(`${institution.id}:${target.id}`, {
        programId: target.id,
        programName: target.name,
        institutionId: institution.id,
        institutionName: institution.name,
      });
    }
  }
  return [...pairs.values()].sort(
    (a, b) =>
      a.institutionName.localeCompare(b.institutionName, 'he') ||
      a.programName.localeCompare(b.programName, 'he'),
  );
}

/** Reuse evaluator-owned exclusions, formula verification and named manual routes. */
export function sekhemPairSupport(
  program: CatalogueProgram,
  institutionId: string,
): 'score' | 'gate' | 'floors' | 'unverified' | undefined {
  if (
    !institutionsInScope.has(institutionId) ||
    program.type !== 'academic' ||
    program.isListed === false ||
    canonicalProgramId(program.id) !== program.id ||
    isBatchCUnsupportedProgramId(program.id, institutionId)
  )
    return undefined;
  if (isBatchBManualProgram(program.id, institutionId)) return 'gate';
  const pairId = `${program.id}__${institutionId}`;
  const verification = getFormulaPairVerificationEntry(pairId);
  if (formulaBackedPairScope(pairId) === 'in_scope')
    return verification?.state === 'exact' ? 'score' : 'unverified';
  if (isBiuPublishedRoutePair(program.id, institutionId)) return 'floors';
  if (institutionId === 'reichman' && program.thresholds?.[institutionId] != null) return 'score';
  if (institutionId === 'afeka' && program.admissionRequirements.length) return 'floors';
  return undefined;
}

/** Public URLs can include legacy rows; the evaluate route only knows active catalogue IDs. */
export const loadSekhemCalculatorOfferings = cache(async () => {
  const [catalogue, active] = await Promise.all([loadPublicCatalogue(), listCataloguePrograms()]);
  return calculatorOfferings(
    catalogue.programs.filter((program) =>
      findAdmissionsEvaluationProgram(active.data, program.id),
    ),
    catalogue.institutions,
    catalogue.generalProgramIds,
  );
});

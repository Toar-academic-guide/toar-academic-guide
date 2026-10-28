import 'server-only';
import { cache } from 'react';
import { canonicalProgramId } from './seo/programAliases';
import { HAIFA_INFORMATION_SYSTEMS_TRACK_ARTIFACTS } from '@/data/admissions/haifaInformationSystemsVerification';
import { verifiedProgramEntry } from '@/data/admissions/formulaBackedVerificationLedger';
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
        sourceProgramIds: [
          ...new Set([
            ...(pairs.get(`${institution.id}:${target.id}`)?.sourceProgramIds ?? []),
            program.id,
            target.id,
          ]),
        ],
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
  if (
    Object.values(HAIFA_INFORMATION_SYSTEMS_TRACK_ARTIFACTS).some(
      (artifact) =>
        artifact.contract.pairId === pairId && verifiedProgramEntry(artifact).state === 'exact',
    )
  )
    return 'score';
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

export function canLinkToSekhemCalculator(
  program: CatalogueProgram,
  institutionId: string,
  offerings?: readonly CalculatorOffering[],
): boolean {
  const support = sekhemPairSupport(program, institutionId);
  return (
    (support === 'score' || support === 'gate') &&
    (!offerings ||
      offerings.some(
        (offering) =>
          offering.institutionId === institutionId &&
          (offering.programId === program.id || offering.sourceProgramIds?.includes(program.id)),
      ))
  );
}

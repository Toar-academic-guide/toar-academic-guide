import 'server-only';
import { createHash } from 'node:crypto';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import { isSupportedTarget, type AdmissionAlertBaselineEvaluator } from './subscriptionService';

export function alertCutoffRuleVersion(cutoff: number) {
  // Same canonical rule encoding as the reviewed release publisher.
  return `sha256:${createHash('sha256')
    .update(JSON.stringify([{ ruleKind: 'admission_cutoff', value: cutoff }]))
    .digest('hex')}`;
}

export async function evaluateAdmissionAlertBaseline(
  input: Parameters<AdmissionAlertBaselineEvaluator>[0],
  dependencies: {
    evaluate?: typeof evaluateAdmissionsForProgram;
    loadPrograms?: typeof listCataloguePrograms;
    loadInstitutions?: typeof listCatalogueInstitutions;
    fetcher?: typeof fetch;
  } = {},
): ReturnType<AdmissionAlertBaselineEvaluator> {
  const unavailable = { decision: 'unavailable' as const, ruleVersion: 'unavailable' };
  if (
    !isSupportedTarget(input) ||
    !input.profile.hasStructuredBagrut ||
    !input.profile.extraInputs?.bagrutSubjectRecord
  )
    return unavailable;
  const [programs, institutions] = await Promise.all([
    (dependencies.loadPrograms ?? listCataloguePrograms)(),
    (dependencies.loadInstitutions ?? listCatalogueInstitutions)(),
  ]);
  const program = programs.data.find((row) => row.id === input.programId);
  const institution = institutions.data.find((row) => row.id === input.institutionId);
  if (!program || !institution) return unavailable;
  const report = await (dependencies.evaluate ?? evaluateAdmissionsForProgram)({
    input: {
      degreeId: input.programId,
      psychometric: input.profile.psychometric,
      bagrut: input.profile.bagrutAverage,
      extraInputs: input.profile.extraInputs,
    },
    program: { ...program, linkedInstitutionIds: [input.institutionId] },
    institutions: [institution],
    fetcher: dependencies.fetcher,
  });
  const result = report.results.find((row) => row.linkedInstitutionId === input.institutionId);
  if (
    !result ||
    result.kind !== 'exact' ||
    result.capability !== 'exact' ||
    (result.requiredInputs?.length ?? 0) > 0 ||
    typeof result.score !== 'number' ||
    !Number.isFinite(result.score) ||
    typeof result.threshold !== 'number' ||
    !Number.isFinite(result.threshold) ||
    (result.decision !== 'below' && result.decision !== 'accepted')
  )
    return unavailable;
  return {
    decision: result.decision === 'accepted' ? 'eligible' : 'below',
    ruleVersion: alertCutoffRuleVersion(result.threshold),
  };
}

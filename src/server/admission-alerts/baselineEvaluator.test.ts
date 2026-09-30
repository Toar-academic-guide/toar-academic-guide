import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { type AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';
import { evaluateAdmissionAlertBaseline, alertCutoffRuleVersion } from './baselineEvaluator';
import { buildSavedAlertProfile } from './subscriptionService';

const scores = {
  psychometricOverall: 680,
  psychometricQuantitative: 135,
  psychometricVerbal: 120,
  psychometricEnglish: 125,
  bagrutWeightedAverage: 108,
  admissionsInputs: {
    tauBagrutAverage: 110,
    bguBagrutAverage: 112,
    tauApplicationRequirementsConfirmed: true,
    bguLanguageRequirementsConfirmed: true,
  },
};
const version = {
  id: 'profile-v1',
  schemaVersion: 1,
  sector: 'jewish',
  subjects: [
    { subjectId: 'mathematics', units: 5, grade: 90 },
    { subjectId: 'physics', units: 5, grade: 80 },
  ],
};
const profile = buildSavedAlertProfile(scores, version)!;
const loadPrograms = async () => ({ data: getStaticCataloguePrograms(), meta: {} });
const loadInstitutions = async () => ({ data: getStaticCatalogueInstitutions(), meta: {} });
function report(institutionId: string): AdmissionsEvaluationReport {
  const institution = getStaticCatalogueInstitutions().find((row) => row.id === institutionId)!;
  return {
    generatedAt: '2026-09-29T00:00:00Z',
    evaluatorVersion: 'test',
    inputDigest: 'digest',
    input: { degreeId: `${institutionId}_cs` },
    program: { id: `${institutionId}_cs`, name: 'CS' },
    results: [
      {
        institution,
        linkedInstitutionId: institutionId,
        capability: 'exact',
        kind: 'exact',
        decision: 'below',
        confidence: 'high',
        sourceLabel: 'official',
        explanation: '',
        nextAction: '',
        score: 695,
        threshold: 700,
      },
    ],
  };
}
describe('canonical alert baseline', () => {
  it.each(['tau', 'bgu'])(
    'replays all saved inputs through the canonical %s evaluator',
    async (institutionId) => {
      const evaluate = vi.fn().mockResolvedValue(report(institutionId));
      expect(
        await evaluateAdmissionAlertBaseline(
          { institutionId, programId: `${institutionId}_cs`, profile },
          { evaluate, loadPrograms, loadInstitutions },
        ),
      ).toEqual({ decision: 'below', ruleVersion: alertCutoffRuleVersion(700) });
      expect(evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            degreeId: `${institutionId}_cs`,
            psychometric: 680,
            bagrut: 108,
            extraInputs: profile.extraInputs,
          },
        }),
      );
    },
  );
  it.each(['estimated', 'needs_input', 'degraded'] as const)(
    'rejects a %s verdict',
    async (kind) => {
      const result = report('bgu');
      result.results[0].kind = kind;
      expect(
        (
          await evaluateAdmissionAlertBaseline(
            { institutionId: 'bgu', programId: 'bgu_cs', profile },
            { evaluate: vi.fn().mockResolvedValue(result), loadPrograms, loadInstitutions },
          )
        ).decision,
      ).toBe('unavailable');
    },
  );
  it('accepts only a complete exact accepted verdict', async () => {
    const result = report('tau');
    result.results[0].decision = 'accepted';
    const evaluate = vi.fn().mockResolvedValue(result);
    expect(
      (
        await evaluateAdmissionAlertBaseline(
          { institutionId: 'tau', programId: 'tau_cs', profile },
          { evaluate, loadPrograms, loadInstitutions },
        )
      ).decision,
    ).toBe('eligible');
    result.results[0].requiredInputs = ['tau_application_requirements'];
    expect(
      (
        await evaluateAdmissionAlertBaseline(
          { institutionId: 'tau', programId: 'tau_cs', profile },
          { evaluate, loadPrograms, loadInstitutions },
        )
      ).decision,
    ).toBe('unavailable');
  });
  it('binds the baseline to psychometric scores and admissions answers, not just subjects', () => {
    for (const changed of [
      { ...scores, psychometricOverall: 681 },
      { ...scores, psychometricQuantitative: 136 },
      {
        ...scores,
        admissionsInputs: { ...scores.admissionsInputs, bguLanguageRequirementsConfirmed: false },
      },
    ]) {
      expect(buildSavedAlertProfile(changed, version)?.profileHash).not.toBe(profile.profileHash);
    }
    expect(profile.extraInputs).toMatchObject({
      psychometricMath: 135,
      psychometricEnglish: 125,
      tauBagrutAverage: 110,
      bguBagrutAverage: 112,
      bagrutSubjectRecord: { schemaVersion: 1, sector: 'jewish' },
    });
    expect(buildSavedAlertProfile(scores, { ...version, sector: 'unknown' })).toBeNull();
  });
});

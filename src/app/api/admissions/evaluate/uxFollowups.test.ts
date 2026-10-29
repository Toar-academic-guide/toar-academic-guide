import { expect, it, vi } from 'vitest';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import type { SourceFreshnessStateRow } from '@/db/types';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import official from '../../../../../docs/admissions-verification/2026-09-27-bgu-psychology-official.json';
vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({
  getDb: () => {
    throw new Error('No database in UX regression');
  },
}));

it.each(['psychology', 'bgu_psychology'])(
  '%s persona 98/600 requests subjects without presenting a computed score',
  async (id) => {
    const source = getStaticCataloguePrograms().find((p) => p.id === id)!;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async (url) =>
          new Response(
            String(url).includes('GetRdpData')
              ? JSON.stringify({ items: [official.officialRule] })
              : 'parent.main.document.mainForm.on_final_sekem.value = 620;',
          ),
      );
    const artifact = getProgramVerificationArtifact(`${id}__bgu`)!;
    const sourceId = artifact.contract.source.targetId;
    const now = new Date();
    const freshnessStatesBySourceId = new Map<string, SourceFreshnessStateRow>([
      [
        sourceId,
        {
          sourceId,
          sourceClass: 'api_static_json',
          capability: 'decision_capable',
          status: 'fresh',
          proofLevel: 'exact_official',
          decisionProvenance: 'verified_derivation',
          reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
          normalizedFingerprint: artifact.contract.sourceFingerprint,
          normalizedDecisionPayload: {},
          lastCheckedAt: now,
          lastSuccessfulCheckAt: now,
          lastExactCheckAt: now,
          lastChangedAt: null,
          latestFailureReason: null,
          blockedReason: null,
          rawFingerprint: null,
          latestReviewItemId: null,
          nextAction: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]);
    const report = await evaluateAdmissionsForProgram({
      program: { ...source, linkedInstitutionIds: ['bgu'] },
      institutions: getStaticCatalogueInstitutions(),
      input: { degreeId: id, bagrut: 98, psychometric: 600 },
      fetcher,
      freshnessStatesBySourceId,
    });
    const result = report.results.find((r) => r.linkedInstitutionId === 'bgu')!;
    expect(result).toMatchObject({
      kind: 'needs_input',
      decision: 'unknown',
      requiredInputs: ['bagrut_subject_record'],
    });
    expect(result.score).toBeUndefined();
    expect(result.deltaNeeded).toBeUndefined();
    expect(result.scoreAssessment).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(2);
  },
);

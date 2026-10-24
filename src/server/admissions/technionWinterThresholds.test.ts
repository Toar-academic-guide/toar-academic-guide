import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import type { SourceFreshnessStateRow } from '@/db/types';
import {
  technionWinterSubjectRecord,
  technionWinterThresholdsHtml,
} from '@/test/technionWinterThresholds';
import {
  parseTechnionOfficialThreshold,
  runTechnionAdmissionsProof,
} from '@/server/ingestion/adapters/technionAdmissions';
import { evaluateAdmissionsForProgram } from './evaluator';

vi.mock('server-only', () => ({}));

function freshnessFor(programId: string) {
  const artifact = getProgramVerificationArtifact(`${programId}__technion`);
  if (!artifact) return new Map<string, SourceFreshnessStateRow>();
  const sourceId = artifact.contract.source.targetId;
  const checkedAt = new Date();
  return new Map<string, SourceFreshnessStateRow>([
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
        lastCheckedAt: checkedAt,
        lastSuccessfulCheckAt: checkedAt,
        lastExactCheckAt: checkedAt,
        lastChangedAt: null,
        latestFailureReason: null,
        blockedReason: null,
        rawFingerprint: null,
        normalizedFingerprint: artifact.contract.sourceFingerprint,
        normalizedDecisionPayload: {},
        latestReviewItemId: null,
        nextAction: null,
        createdAt: checkedAt,
        updatedAt: checkedAt,
      },
    ],
  ]);
}

describe('Technion winter תשפ"ז thresholds', () => {
  it('uses winter EE 91.5 when spring 94 appears first', () => {
    expect(parseTechnionOfficialThreshold(technionWinterThresholdsHtml, 'technion_ee')).toBe(91.5);
  });

  it('withholds a cutoff when only the spring table is present', () => {
    const springOnly = technionWinterThresholdsHtml.split(
      '<h2>סיכום אפשרויות הקבלה למסלולים בסמסטר חורף',
    )[0];
    expect(parseTechnionOfficialThreshold(springOnly, 'technion_ee')).toBeUndefined();
  });

  it.each([
    [87, 'accepted'],
    [86.99, 'below'],
  ])('reads ME winter cutoff 87 from the live table at score %s', async (score, verdict) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async (url) =>
          new Response(
            String(url).includes('technion-calculators-sum.php')
              ? `הסכם לדיוני הקבלה הוא:${score}`
              : technionWinterThresholdsHtml,
          ),
      );
    const proof = await runTechnionAdmissionsProof({
      fetcher,
      // The former local value must not replace the current official table cell.
      program: { id: 'technion_me', name: 'הנדסת מכונות', externalId: '92' },
      applicant: {
        psychometric: 750,
        bagrutAverage: 110,
        bagrutSubjectRecord: technionWinterSubjectRecord,
      },
    });
    expect(proof.status).toBe('succeeded');
    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: score,
      acceptanceThreshold: 87,
      rejectionThreshold: 87,
      derivedVerdict: verdict,
    });
  });

  it.each([
    ['technion_ee', 91.5, 'accepted', 91.5],
    ['technion_ee', 91.49, 'below', 91.5],
    ['technion_ee', 92, 'accepted', 91.5],
    ['technion_me', 87, 'accepted', 87],
    ['technion_me', 86.99, 'below', 87],
  ])(
    '%s at %s returns %s against winter cutoff %s',
    async (degreeId, score, decision, threshold) => {
      const program = getStaticCataloguePrograms().find((row) => row.id === degreeId)!;
      const fetcher = vi
        .fn<typeof fetch>()
        .mockImplementation(
          async (url) =>
            new Response(
              String(url).includes('technion-calculators-sum.php')
                ? `הסכם לדיוני הקבלה הוא:${score}`
                : technionWinterThresholdsHtml,
            ),
        );
      const report = await evaluateAdmissionsForProgram({
        program,
        institutions: getStaticCatalogueInstitutions(),
        fetcher,
        freshnessStatesBySourceId: freshnessFor(degreeId),
        input: {
          degreeId,
          bagrut: 110,
          psychometric: 750,
          extraInputs: {
            bagrutSubjectRecord: technionWinterSubjectRecord,
            mathUnits: 5,
            physicsUnits: 5,
            psychometricMath: 150,
          },
        },
      });
      expect(report.results[0]).toMatchObject({ decision, threshold, score });
    },
  );

  it.each(['technion_engineering'])(
    '%s has no evaluator verdict for any profile',
    async (degreeId) => {
      const program = getStaticCataloguePrograms().find((row) => row.id === degreeId)!;
      for (const scores of [
        {},
        { bagrut: 60, psychometric: 200 },
        { bagrut: 120, psychometric: 800 },
      ]) {
        const fetcher = vi.fn<typeof fetch>();
        const report = await evaluateAdmissionsForProgram({
          program,
          institutions: getStaticCatalogueInstitutions(),
          fetcher,
          freshnessStatesBySourceId: freshnessFor(degreeId),
          input: {
            degreeId,
            ...scores,
            extraInputs: { bagrutSubjectRecord: technionWinterSubjectRecord },
          },
        });
        expect(report.results[0].decision).toBe('unknown');
        expect(report.results[0].threshold).toBeUndefined();
        expect(report.results[0].scoreAssessment).toBeUndefined();
        expect(fetcher).not.toHaveBeenCalled();
      }
    },
  );
});

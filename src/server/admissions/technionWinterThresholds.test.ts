import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import type { SourceFreshnessStateRow } from '@/db/types';
import type { CatalogueProgram } from '@/types/catalogue';
import staleTechnionCatalogue from '@/test/fixtures/technionStaleCatalogue.json';
import { createHash } from 'node:crypto';
import { getDb } from '@/db/client';
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
vi.mock('@/db/client', () => ({
  getDb: vi.fn(() => {
    throw new Error('The reviewed winter replay must not query DB freshness');
  }),
}));

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
  it('evaluates the reviewed winter pair without loading database freshness', async () => {
    const program = staleTechnionCatalogue.find(
      (row) => row.id === 'technion_ee',
    )! as CatalogueProgram;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async (url) =>
          new Response(
            String(url).includes('technion-calculators-sum.php')
              ? 'הסכם לדיוני הקבלה הוא:91.5'
              : technionWinterThresholdsHtml,
          ),
      );
    const report = await evaluateAdmissionsForProgram({
      program,
      institutions: getStaticCatalogueInstitutions(),
      fetcher,
      input: {
        degreeId: program.id,
        bagrut: 110,
        psychometric: 735,
        extraInputs: { bagrutSubjectRecord: technionWinterSubjectRecord },
      },
    });
    expect(report.results[0]).toMatchObject({ decision: 'accepted', score: 91.5, threshold: 91.5 });
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each(['changed', 'absent', 'unreachable'] as const)(
    'withholds a verdict when the live winter source is %s despite reviewed code',
    async (failure) => {
      const program = staleTechnionCatalogue.find(
        (row) => row.id === 'technion_ee',
      )! as CatalogueProgram;
      const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
        if (String(url).includes('technion-calculators-sum.php'))
          return new Response('הסכם לדיוני הקבלה הוא:91.5');
        if (failure === 'unreachable') throw new Error('Official source unavailable');
        return new Response(
          failure === 'changed'
            ? technionWinterThresholdsHtml.replace('>91.5<', '>92<')
            : '<table id="tablepress-482"></table>',
        );
      });
      const report = await evaluateAdmissionsForProgram({
        program,
        institutions: getStaticCatalogueInstitutions(),
        fetcher,
        freshnessStatesBySourceId: new Map(),
        input: {
          degreeId: program.id,
          bagrut: 110,
          psychometric: 735,
          extraInputs: { bagrutSubjectRecord: technionWinterSubjectRecord },
        },
      });
      expect(report.results[0].decision).toBe('unknown');
      expect(report.results[0].threshold).toBeUndefined();
      expect(report.results[0].score).toBeUndefined();
    },
  );

  describe.each(['current', 'previous', 'missing'] as const)(
    'with stale deployed catalogue and %s database freshness',
    (freshness) => {
      it.each([
        ['technion_ee', 735, 91.5, 'accepted', 91.5, 94],
        ['technion_ee', 734, 91.4, 'below', 91.5, 94],
        ['technion_me', 675, 87, 'accepted', 87, 92],
        ['technion_me', 674, 86.9, 'below', 87, 92],
      ] as const)(
        '%s psychometric %s evaluates against the reviewed winter cutoff',
        async (degreeId, psychometric, score, decision, threshold, previousThreshold) => {
          // Public DB-backed rows captured by Samuel at /workspace/qa-evidence/pr281-b53d9eb/.
          const program = staleTechnionCatalogue.find(
            (row) => row.id === degreeId,
          )! as CatalogueProgram;
          const before = structuredClone(program);
          const states =
            freshness === 'missing'
              ? new Map<string, SourceFreshnessStateRow>()
              : freshnessFor(degreeId);
          if (freshness === 'previous') {
            for (const state of states.values()) {
              state.reviewedSourceFingerprint = `sha256:${createHash('sha256')
                .update(
                  JSON.stringify({
                    source: getProgramVerificationArtifact(`${degreeId}__technion`)!.contract.source
                      .url,
                    programId: degreeId.slice('technion_'.length),
                    threshold: previousThreshold,
                    verdict: 'accepted',
                  }),
                )
                .digest('hex')}`;
            }
          }
          const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url, options) => {
            if (String(url).includes('technion-calculators-sum.php')) {
              expect(new URLSearchParams(String(options?.body)).get('psychometry')).toBe(
                String(psychometric),
              );
              return new Response(`הסכם לדיוני הקבלה הוא:${score}`);
            }
            return new Response(technionWinterThresholdsHtml);
          });
          const report = await evaluateAdmissionsForProgram({
            program,
            institutions: getStaticCatalogueInstitutions(),
            fetcher,
            freshnessStatesBySourceId: states,
            input: {
              degreeId,
              bagrut: 110,
              psychometric,
              extraInputs: {
                bagrutSubjectRecord: {
                  ...technionWinterSubjectRecord,
                  subjects: technionWinterSubjectRecord.subjects.map((subject) => ({
                    ...subject,
                    units: ['english', 'mathematics'].includes(subject.subjectId) ? 5 : 2,
                  })),
                },
              },
            },
          });
          expect(report.results[0]).toMatchObject({ decision, score, threshold });
          expect(report.results[0].degradationReason).not.toBe('pair_verification_incomplete');
          expect(program).toEqual(before);
          expect(fetcher).toHaveBeenCalledTimes(2);
        },
      );
    },
  );

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

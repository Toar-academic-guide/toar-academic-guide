import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import {
  technionWinterSubjectRecord,
  technionWinterThresholdsHtml,
} from '@/test/technionWinterThresholds';
import { runTechnionAdmissionsProof } from '@/server/ingestion/adapters/technionAdmissions';
import { evaluateAdmissionsForProgram } from './evaluator';

vi.mock('server-only', () => ({}));

describe('Jorje Technion medicine ruling', () => {
  it.each([91.99, 92, 95])(
    'keeps official sekhem %s informational without an admission verdict',
    async (score) => {
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
        program: { id: 'technion_medicine', name: 'רפואה', scoreField: 'invitation' },
        applicant: {
          psychometric: 750,
          bagrutAverage: 110,
          bagrutSubjectRecord: technionWinterSubjectRecord,
        },
      });
      expect(proof.status).toBe('succeeded');
      expect(proof.normalizedPayload.selectedScore).toBe(score);
      expect(proof.normalizedPayload.derivedVerdict).toBeUndefined();
      expect(proof.normalizedPayload.acceptanceThreshold).toBeUndefined();
      expect(proof.normalizedPayload.rejectionThreshold).toBeUndefined();

      // The public evaluator withholds medicine before requesting any score.
      fetcher.mockClear();
      const program = getStaticCataloguePrograms().find((row) => row.id === 'technion_medicine')!;
      const report = await evaluateAdmissionsForProgram({
        program,
        institutions: getStaticCatalogueInstitutions(),
        freshnessStatesBySourceId: new Map(),
        fetcher,
        input: {
          degreeId: program.id,
          bagrut: 110,
          psychometric: 750,
          extraInputs: { bagrutSubjectRecord: technionWinterSubjectRecord },
        },
      });
      expect(report.results[0].decision).toBe('unknown');
      expect(report.results[0].threshold).toBeUndefined();
      expect(report.results[0].scoreAssessment).toBeUndefined();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});

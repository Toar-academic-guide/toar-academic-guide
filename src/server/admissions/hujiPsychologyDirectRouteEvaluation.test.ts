import { describe, expect, it, vi } from 'vitest';
import feed from '@/test/fixtures/hujiPsychology2027.json';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import type { SourceFreshnessStateRow } from '@/db/types';
import { evaluateAdmissionsForProgram } from './evaluator';

vi.mock('server-only', () => ({}));

describe('HUJI psychology real exact path — expected to fail until hook after #304', () => {
  it.each([
    { psychometric: 730, bagrut: 80 },
    { psychometric: 800, bagrut: 70 },
  ])('accepts the direct route for $psychometric/$bagrut without confirmation', async (scores) => {
    const result = await evaluate(scores);
    expect(result).toMatchObject({
      capability: 'exact',
      kind: 'exact',
      decision: 'accepted',
      score: scores.psychometric,
      threshold: 725,
      scoreLabel: 'פסיכומטרי',
    });
    expect(result.requiredInputs ?? []).toEqual([]);
    expect(result.additionalConditions ?? []).toEqual([]);
    expect(result.explanation).not.toMatch(/אשרו|אישור זכאות|מתואם/);
  });

  it('returns a text-only Kidum manual gate at PET 700/B90', async () => {
    const result = await evaluate({ psychometric: 700, bagrut: 90 });
    expect(result).toMatchObject({
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'unknown',
    });
    expect(result.requiredInputs ?? []).toEqual([]);
    expect(result.explanation).toContain('האגודה לקידום החינוך');
    expect(result.explanation).toContain('ראויים לקידום');
  });

  it('keeps PET 660/B90 on the ordinary 22.5 sekem result', async () => {
    const result = await evaluate({ psychometric: 660, bagrut: 90 });
    expect(result).toMatchObject({
      capability: 'exact',
      kind: 'exact',
      decision: 'below',
      threshold: 22.5,
    });
    expect(result.score).toBeCloseTo(19.71195484, 8);
  });
});

async function evaluate(scores: { psychometric: number; bagrut: number }) {
  const program = getStaticCataloguePrograms().find((row) => row.id === 'huji_psychology')!;
  const artifact = getProgramVerificationArtifact('huji_psychology__huji')!;
  const sourceId = artifact.contract.source.targetId;
  const checkedAt = new Date();
  const state: SourceFreshnessStateRow = {
    sourceId,
    sourceClass: 'api_static_json',
    capability: 'decision_capable',
    status: 'fresh',
    proofLevel: 'exact_official',
    decisionProvenance: 'verified_derivation',
    reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
    normalizedFingerprint: artifact.contract.sourceFingerprint,
    lastCheckedAt: checkedAt,
    lastSuccessfulCheckAt: checkedAt,
    lastExactCheckAt: checkedAt,
    lastChangedAt: null,
    latestFailureReason: null,
    blockedReason: null,
    rawFingerprint: null,
    normalizedDecisionPayload: {},
    latestReviewItemId: null,
    nextAction: null,
    createdAt: checkedAt,
    updatedAt: checkedAt,
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => new Response(JSON.stringify(feed)));
  const report = await evaluateAdmissionsForProgram({
    input: { degreeId: program.id, ...scores },
    program,
    institutions: getStaticCatalogueInstitutions().filter((row) => row.id === 'huji'),
    freshnessStatesBySourceId: new Map([[sourceId, state]]),
    fetcher,
  });
  expect(fetcher).toHaveBeenCalledWith(
    'https://go.huji.ac.il/jjson/huji.json.gz',
    expect.anything(),
  );
  return report.results.find((row) => row.linkedInstitutionId === 'huji')!;
}

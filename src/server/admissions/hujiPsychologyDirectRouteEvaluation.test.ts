import { describe, expect, it, vi } from 'vitest';
import feed from '@/test/fixtures/hujiPsychology2027.json';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import type { SourceFreshnessStateRow } from '@/db/types';
import { evaluateAdmissionsForProgram } from './evaluator';

vi.mock('server-only', () => ({}));

describe('HUJI psychology real exact path', () => {
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

  describe.each(['huji_psychology', 'psychology'])('%s boundaries through the evaluator', (id) => {
    it.each([690, 700, 724])(
      'shows a text-only Kidum gate with no sekem score or threshold at PET %i/B90',
      async (pet) => {
        const result = await evaluate({ psychometric: pet, bagrut: 90 }, id);
        expect(result).toMatchObject({
          capability: 'manual_gate',
          kind: 'manual_gate',
          decision: 'unknown',
        });
        expect(result.explanation).toContain('ראויים לקידום');
        expect(result.score).toBeUndefined();
        expect(result.threshold).toBeUndefined();
        expect(result.scoreLabel).toBeUndefined();
        expect(result.scoreAssessment).toBeUndefined();
        expect(result.deltaNeeded).toBeUndefined();
        expect(result.floorChecks).toBeUndefined();
        const studentFacingFields = JSON.stringify({
          explanation: result.explanation,
          nextAction: result.nextAction,
          sourceLabel: result.sourceLabel,
          scoreLabel: result.scoreLabel,
        });
        for (const forbidden of ['20.81', '22.5', 'סכ״ם', 'סכם', 'נבדק ב']) {
          expect(studentFacingFields).not.toContain(forbidden);
        }
      },
    );

    it.each([
      { psychometric: 689, kind: 'exact', decision: 'below' },
      { psychometric: 690, kind: 'manual_gate', decision: 'unknown' },
      { psychometric: 724, kind: 'manual_gate', decision: 'unknown' },
      { psychometric: 725, kind: 'exact', decision: 'accepted' },
    ])('returns $kind/$decision at PET $psychometric/B90', async (boundary) => {
      const result = await evaluate({ psychometric: boundary.psychometric, bagrut: 90 }, id);
      expect(result).toMatchObject({ kind: boundary.kind, decision: boundary.decision });
      if (boundary.psychometric === 725) {
        expect(result).toMatchObject({ score: 725, threshold: 725, scoreLabel: 'פסיכומטרי' });
      } else if (boundary.psychometric < 690) {
        expect(result.score).toBeCloseTo(
          0.027468921 * boundary.psychometric + 0.145461915 * 90 - 11.50910537,
          8,
        );
        expect(result.threshold).toBe(22.5);
        expect(result.scoreLabel).toBe('ציון התאמה');
      } else {
        expect(result.score).toBeUndefined(); // Approved test update, Jorje 2026-10-26
        expect(result.threshold).toBeUndefined(); // Approved test update, Jorje 2026-10-26
        expect(result.scoreLabel).toBeUndefined(); // Approved test update, Jorje 2026-10-26
        expect(result.scoreAssessment).toBeUndefined(); // Approved test update, Jorje 2026-10-26
      }
    });

    it.each([700, 730])('keeps regular sekem at PET %i when direct_pet is missing', async (pet) => {
      const scores = { psychometric: pet, bagrut: 80 };
      const result = await evaluate(scores, id, { direct_pet: undefined });
      const regular = await evaluate(scores, id, {
        direct_pet: undefined,
        direct_pet_kidum: undefined,
      });
      expect(result).toEqual(regular);
      expect(result).toMatchObject({
        capability: 'exact',
        kind: 'exact',
        decision: 'below',
        threshold: 22.5,
        scoreLabel: 'ציון התאמה',
      });
      expect(result.score).toBeCloseTo(0.027468921 * pet + 0.145461915 * 80 - 11.50910537, 8);
    });

    it('keeps regular sekem when direct_pet_kidum is missing', async () => {
      const result = await evaluate({ psychometric: 700, bagrut: 90 }, id, {
        direct_pet_kidum: undefined,
      });
      expect(result).toMatchObject({
        capability: 'exact',
        kind: 'exact',
        decision: 'below',
        threshold: 22.5,
        scoreLabel: 'ציון התאמה',
      });
      expect(result.score).toBeCloseTo(20.81071168, 8);
    });

    it.each([690, 724])('preserves accepted regular sekem at PET %i/B120', async (pet) => {
      const scores = { psychometric: pet, bagrut: 120 };
      const result = await evaluate(scores, id);
      const regular = await evaluate(scores, id, {
        direct_pet: undefined,
        direct_pet_kidum: undefined,
      });
      expect(result).toEqual(regular);
      expect(result).toMatchObject({
        capability: 'exact',
        kind: 'exact',
        decision: 'accepted',
        threshold: 22.5,
        scoreLabel: 'ציון התאמה',
      });
    });

    // Jorje 2026-10-26 12:47: Kidum gate is text-only, no composite score or threshold.
    it.each([690, 724])('shows a text-only Kidum gate at PET %i/B90', async (pet) => {
      const scores = { psychometric: pet, bagrut: 90 };
      const result = await evaluate(scores, id);
      const regular = await evaluate(scores, id, {
        direct_pet: undefined,
        direct_pet_kidum: undefined,
      });
      expect(regular.decision).toBe('below');
      expect(result).toMatchObject({
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'unknown',
      });
      expect(result.score).toBeUndefined(); // Approved test update, Jorje 2026-10-26
      expect(result.threshold).toBeUndefined(); // Approved test update, Jorje 2026-10-26
      expect(result.scoreLabel).toBeUndefined(); // Approved test update, Jorje 2026-10-26
      expect(result.scoreAssessment).toBeUndefined(); // Approved test update, Jorje 2026-10-26
      expect(result.explanation).toContain('ראויים לקידום');
      expect(result.officialUrls).toEqual(
        expect.arrayContaining([
          ...(regular.officialUrls ?? []),
          'https://info.huji.ac.il/reception-channels/Kidum',
        ]),
      );
    });
  });
});

async function evaluate(
  scores: { psychometric: number; bagrut: number },
  id = 'huji_psychology',
  feedOverrides: Record<string, unknown> = {},
) {
  const program = getStaticCataloguePrograms().find((row) => row.id === id)!;
  const artifact = getProgramVerificationArtifact(`${id}__huji`)!;
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
  const source = structuredClone(feed);
  for (const row of source.currentYearObj) Object.assign(row, feedOverrides);
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => new Response(JSON.stringify(source)));
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

import { describe, expect, it } from 'vitest';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';
import * as policy from './hujiPsychologyDirectRoutePolicy';
import { applyHujiPsychologyDirectRoute } from './hujiPsychologyDirectRoutePolicy';

const thresholds = { directPsychometric: 725, directPsychometricKidum: 690 };

const sekemResult: AdmissionsEvaluationResult = {
  institution: { id: 'huji', name: 'האוניברסיטה העברית בירושלים', region: 'center' },
  linkedInstitutionId: 'huji',
  capability: 'exact',
  kind: 'exact',
  decision: 'below',
  confidence: 'high',
  sourceLabel: 'אימות רשמי',
  explanation: 'ציון ההתאמה נמוך מהסף.',
  nextAction: 'בדקו את תנאי הקבלה.',
  score: 19.71,
  scoreLabel: 'ציון התאמה',
  threshold: 22.5,
  scoreAssessment: 'below_threshold',
  officialUrls: ['https://go.huji.ac.il/jjson/huji.json.gz'],
};

describe('HUJI psychology direct psychometric policy', () => {
  it.each([689, undefined])('preserves the sekem result for PET %s', (pet) => {
    expect(applyHujiPsychologyDirectRoute(sekemResult, pet, thresholds)).toBe(sekemResult);
  });

  it.each([690, 724])('retains sekem while requiring a Kidum rating at PET %i', (pet) => {
    const result = applyHujiPsychologyDirectRoute(sekemResult, pet, thresholds);
    expect(result).toMatchObject({
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'unknown',
    });
    expect(result.explanation).toContain('האגודה לקידום החינוך');
    expect(result.explanation).toContain('ראויים לקידום');
    expect(result.explanation).toContain('30');
    expect(result.requiredInputs ?? []).toEqual([]);
    expect(result.score).toBe(sekemResult.score); // Approved test update, Jorje 2026-10-26
    expect(result.threshold).toBe(sekemResult.threshold); // Approved test update, Jorje 2026-10-26
    expect(result.scoreLabel).toBe(sekemResult.scoreLabel);
    expect(result.scoreAssessment).toBe(sekemResult.scoreAssessment);
    expect(result.officialUrls).toEqual([
      ...sekemResult.officialUrls!,
      'https://info.huji.ac.il/bachelor/Psychology',
      'https://info.huji.ac.il/reception-channels/Kidum',
    ]);
  });

  it.each([725, 800])('accepts PET %i without a bagrut confirmation gate', (pet) => {
    const result = applyHujiPsychologyDirectRoute(sekemResult, pet, thresholds);
    expect(result).toMatchObject({
      capability: 'exact',
      kind: 'exact',
      decision: 'accepted',
      score: pet,
      threshold: 725,
      scoreLabel: 'פסיכומטרי',
      scoreAssessment: 'meets_threshold',
    });
    expect(result.requiredInputs ?? []).toEqual([]);
    expect(result.explanation).not.toMatch(/אישור|אשרו|זכאות|מתואם/);
  });

  it('uses feed values rather than fallback thresholds', () => {
    const feed = { directPsychometric: 740, directPsychometricKidum: 710 };
    expect(applyHujiPsychologyDirectRoute(sekemResult, 700, feed)).toBe(sekemResult);
    expect(applyHujiPsychologyDirectRoute(sekemResult, 730, feed).kind).toBe('manual_gate');
    expect(applyHujiPsychologyDirectRoute(sekemResult, 740, feed)).toMatchObject({
      decision: 'accepted',
      threshold: 740,
    });
  });

  it('exports both programme aliases for shared route scoping', () => {
    expect(policy).toHaveProperty('HUJI_PSYCHOLOGY_DIRECT_ROUTE_PROGRAM_IDS', [
      'huji_psychology',
      'psychology',
    ]);
  });

  it('does not accept or apply Kidum without the feed direct threshold', () => {
    const withoutDirect = applyHujiPsychologyDirectRoute(sekemResult, 725, {
      directPsychometricKidum: 700,
    });
    expect(withoutDirect).toBe(sekemResult); // Approved test update, Jorje 2026-10-26
    expect(applyHujiPsychologyDirectRoute(sekemResult, 710, { directPsychometricKidum: 700 })).toBe(
      sekemResult,
    );
    const withoutKidum = applyHujiPsychologyDirectRoute(sekemResult, 690, {
      directPsychometric: 740,
    });
    expect(withoutKidum).toBe(sekemResult); // Approved test update, Jorje 2026-10-26
    expect(applyHujiPsychologyDirectRoute(sekemResult, 800)).toBe(sekemResult);
  });

  it('can accept a feed direct threshold without a Kidum threshold', () => {
    expect(
      applyHujiPsychologyDirectRoute(sekemResult, 725, {
        directPsychometric: 725,
      }).decision,
    ).toBe('accepted');
  });

  it('preserves an already accepted sekem result in the Kidum interval', () => {
    const accepted = { ...sekemResult, decision: 'accepted' as const, score: 23 };
    expect(applyHujiPsychologyDirectRoute(accepted, 700, thresholds)).toBe(accepted);
  });

  it('does not override an unavailable exact proof', () => {
    const degraded = {
      ...sekemResult,
      capability: 'unsupported' as const,
      kind: 'degraded' as const,
      decision: 'unknown' as const,
    };
    expect(applyHujiPsychologyDirectRoute(degraded, 800, thresholds)).toBe(degraded);
  });
});

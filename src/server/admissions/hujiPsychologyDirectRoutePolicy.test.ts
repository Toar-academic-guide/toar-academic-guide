import { describe, expect, it } from 'vitest';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';
import { applyHujiPsychologyDirectRoute } from './hujiPsychologyDirectRoutePolicy';

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
};

describe('HUJI psychology direct psychometric policy', () => {
  it.each([689, undefined])('preserves the sekem result for PET %s', (pet) => {
    expect(applyHujiPsychologyDirectRoute(sekemResult, pet)).toBe(sekemResult);
  });

  it.each([690, 724])('requires a text-only Kidum rating at PET %i', (pet) => {
    const result = applyHujiPsychologyDirectRoute(sekemResult, pet);
    expect(result).toMatchObject({
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'unknown',
    });
    expect(result.explanation).toContain('האגודה לקידום החינוך');
    expect(result.explanation).toContain('ראויים לקידום');
    expect(result.explanation).toContain('30');
    expect(result.requiredInputs ?? []).toEqual([]);
    expect(result.score).toBeUndefined();
    expect(result.threshold).toBeUndefined();
  });

  it.each([725, 800])('accepts PET %i without a bagrut confirmation gate', (pet) => {
    const result = applyHujiPsychologyDirectRoute(sekemResult, pet);
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

  it('falls back independently when either feed threshold is missing', () => {
    expect(
      applyHujiPsychologyDirectRoute(sekemResult, 725, { directPsychometricKidum: 700 }).decision,
    ).toBe('accepted');
    expect(applyHujiPsychologyDirectRoute(sekemResult, 690, { directPsychometric: 740 }).kind).toBe(
      'manual_gate',
    );
  });

  it('preserves an already accepted sekem result in the Kidum interval', () => {
    const accepted = { ...sekemResult, decision: 'accepted' as const, score: 23 };
    expect(applyHujiPsychologyDirectRoute(accepted, 700)).toBe(accepted);
  });

  it('does not override an unavailable exact proof', () => {
    const degraded = {
      ...sekemResult,
      capability: 'unsupported' as const,
      kind: 'degraded' as const,
      decision: 'unknown' as const,
    };
    expect(applyHujiPsychologyDirectRoute(degraded, 800)).toBe(degraded);
  });
});

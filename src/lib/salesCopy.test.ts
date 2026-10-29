import { describe, expect, it, vi } from 'vitest';
import { resultLabel, resultExplanation } from './studyJourney';
import { resultVerdict } from './sekhemCalculator';
import { resultInputReasons, resultSourceReason } from './sekhemResultPresentation';
import { acceptedManualGateFootnote } from './acceptedManualGateFootnote';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';
import { academicPrograms } from '@/data/degrees/academicPrograms';
import repair from '@/data/admissions/catalogueContentRepair.json';

vi.mock('server-only', () => ({}));
const result = (
  overrides: Partial<AdmissionsEvaluationResult> = {},
): AdmissionsEvaluationResult => ({
  institution: { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
  linkedInstitutionId: 'tau',
  kind: 'exact',
  capability: 'exact',
  decision: 'unknown',
  confidence: 'high',
  sourceLabel: '',
  explanation: '',
  nextAction: '',
  ...overrides,
});

describe('approved student result copy', () => {
  it.each([
    [650, 670, '20'],
    [21.12, 22.5, '1.38'],
    [84.999, 85.124, '0.13'],
    [0, 1, '1'],
  ])('renders only the real journey gap %s to %s', (score, threshold, gap) => {
    for (const state of [
      { decision: 'below' as const },
      { scoreAssessment: 'below_threshold' as const },
    ]) {
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 2)
      expect(
        resultLabel(result({ score: Number(score), threshold: Number(threshold), ...state })),
      ).toEqual({ label: `חסרות לכם ${gap} נקודות לסף`, group: 'improve' });
    }
  });
  it.each([
    [undefined, 650],
    [640, undefined],
    [640, null],
    [NaN, 650],
    [640, Infinity],
    [Infinity, 650],
    [650, 650],
    [651, 650],
    [84.999, 85],
  ])('never invents or displays a zero/negative journey gap: %s, %s', (score, threshold) => {
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 2)
    expect(resultLabel(result({ decision: 'below', score, threshold })).label).toBe('עוד לא בסף');
  });
  it('uses the existing integer Reichman scale in journey gap and score labels', () => {
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 2)
    expect(
      resultLabel(
        result({
          linkedInstitutionId: 'reichman',
          decision: 'below',
          score: 635.2,
          threshold: 650,
        }),
      ).label,
    ).toBe('חסרות לכם 15 נקודות לסף');
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 7)
    expect(resultLabel(result({ linkedInstitutionId: 'reichman', score: 635.7968 })).label).toBe(
      'הסכם שלכם: 636',
    );
  });
  it.each(['exact', 'estimated'] as const)(
    'renders the formatted %s score with no cutoff',
    (kind) => {
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 7)
      expect(resultLabel(result({ kind, score: 635.126 })).label).toBe('הסכם שלכם: 635.13');
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 7)
      expect(resultLabel(result({ kind, score: 0 })).label).toBe('הסכם שלכם: 0');
    },
  );
  it.each(['exact', 'estimated'] as const)(
    'no-score case stays on main copy for %s results',
    (kind) => {
      for (const score of [undefined, null, NaN, Infinity, -Infinity]) {
        // Include null scores returned by production responses.
        const row = { ...result({ kind }), score } as AdmissionsEvaluationResult;
        expect(resultLabel(row).label).toBe('אין הכרעת קבלה');
      }
    },
  );
  it('preserves the existing pending-cutoff label outside row 7', () => {
    expect(resultLabel(result({ score: 635, threshold: 650, decision: 'pending' })).label).toBe(
      'אין הכרעת קבלה',
    );
  });
  it('states the approved green light while preserving the exact branch', () => {
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 1, 8)
    expect(resultLabel(result({ scoreAssessment: 'meets_threshold' })).label).toBe(
      'עוברים את הסף ✓',
    );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 8)
    expect(resultLabel(result({ kind: 'estimated', decision: 'accepted' })).label).toBe(
      'עוברים את הסף ✓',
    );
    expect(resultLabel(result({ kind: 'exact', decision: 'accepted' })).label).toBe(
      'עומד/ת בסף שחושב',
    );
  });
  it.each([
    ['needs_input', 'השלימו פרטים וקבלו תשובה'],
    ['manual_gate', 'השלב הבא: מיון במוסד'],
    ['unsupported', 'בדיקה אישית מול המוסד'],
    ['authority_unavailable', 'בדיקה אישית מול המוסד'],
    ['tracked_missing_rule', 'בדיקה אישית מול המוסד'],
    ['degraded', 'בדיקה אישית מול המוסד'],
  ] as const)('uses student-facing copy for %s', (kind, label) => {
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 3, 4, 5, 9)
    expect(resultLabel(result({ kind })).label).toBe(label);
  });
  it('offers an institution response for unsupported results and directs manual selection', () => {
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 6)
    expect(resultExplanation(result({ kind: 'unsupported' }))).toBe(
      'תנאי הקבלה כאן למטה. רוצים תשובה אישית? השאירו פרטים והמוסד יחזור אליכם.',
    );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 10)
    expect(resultExplanation(result({ kind: 'manual_gate' }))).toBe(
      'השלב הבא הוא המיון. כל הפרטים כאן.',
    );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 24)
    expect(resultSourceReason(result())).toBe('תל אביב: בדיקה אישית מול המוסד');
  });
  it.each(['ראיון קבלה', 'מבחן כניסה', 'הגשת תיק עבודות'])(
    'uses the existing gate label %s',
    (label) => {
      const row = result({
        kind: 'manual_gate',
        decision: 'accepted',
        scoreAssessment: 'meets_threshold',
        additionalConditions: [{ id: 'admissions_committee', label, status: 'unconfirmed' }],
      });
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 11)
      expect(acceptedManualGateFootnote(row)).toBe(
        `השלב הבא: ${label.replace(/ראיון/g, 'ריאיון')}.`,
      );
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 11)
      expect(acceptedManualGateFootnote(row)).not.toContain('אישור סופי מהמכללה');
    },
  );
  it('does not invent a gate for an accepted result with no condition', () => {
    expect(
      acceptedManualGateFootnote(
        result({ kind: 'manual_gate', decision: 'accepted', scoreAssessment: 'meets_threshold' }),
      ),
    ).toBeUndefined();
  });
  it.each([
    ['psychometric_english', 'ציון האנגלית'],
    ['english_grade', 'ציון הבגרות באנגלית'],
    ['psychometric_math', 'ציון החלק הכמותי'],
    ['bagrut_average', 'ממוצע הבגרות'],
  ] as const)('names the missing field %s in both sekhem paths', (key, label) => {
    const row = result({ kind: 'needs_input', requiredInputs: [key] });
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 25)
    expect(resultInputReasons(row)).toEqual([`הוסיפו את ${label} וקבלו את ציון הקבלה`]);
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 25)
    expect(resultVerdict(row)).toBe(`הוסיפו את ${label} וקבלו את ציון הקבלה`);
  });
  it('uses a task fallback without inventing a missing field', () => {
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 25)
    expect(resultVerdict(result({ kind: 'needs_input' }))).toBe('השלימו פרטים וקבלו את ציון הקבלה');
  });
  it('suppresses the evaluator no-data explanation at render time', () => {
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 40)
    expect(
      resultExplanation(
        result({ kind: 'unsupported', explanation: 'אין כרגע מידע עדכני על המסלול.' }),
      ),
    ).toBeUndefined();
  });
  it('removes the exact Ono note from both source arrays without deleting admission routes', () => {
    const removed =
      'המחשבון בודק רק ממוצע בגרות ופסיכומטרי. מסלול גיל 30+, תואר קודם ואפיק המעבר לא נבדקים בו.';
    const program = academicPrograms.find((p) => p.id === 'ono_law')!;
    const notes = program.institutionDetails![0].specificAdmissionNotes;
    const repaired = repair.requirements.find((p) => p.programId === 'ono_law')!.notes;
    for (const values of [notes, repaired]) {
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 39)
      expect(values).not.toContain(removed);
      expect(values.some((note) => note.includes('אפיק מעבר לאקדמיה'))).toBe(true);
      expect(values.every((note) => note.trim())).toBe(true);
    }
  });
});

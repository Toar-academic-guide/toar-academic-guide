// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';
import AdmissionEstimate from './AdmissionEstimate';

afterEach(cleanup);
const averageReason = 'הממוצע הכללי 110 משמש אומדן לממוצע המוסדי.';
const yearReason = 'שנת הבגרות לא נמסרה; החישוב מניח את מחזור 2026.';

describe('07:24 estimate notice scope', () => {
  it.each([
    'needs_input',
    'unsupported',
    'requirements_only',
    'degraded',
    'authority_unavailable',
    'tracked_missing_rule',
  ] as const)('hides stale estimate metadata for %s even when a score is retained', (kind) => {
    render(
      <AdmissionEstimate
        result={{
          kind,
          decision: 'unknown',
          score: 83.3,
          estimated: true,
          estimationReason: averageReason,
        }}
      />,
    );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 13)
    expect(screen.queryByText(/רוצים תשובה מדויקת יותר\?|הערכה:/)).toBeNull();
  });
  it('hides unknown results without a calculated score', () => {
    render(
      <AdmissionEstimate
        result={{
          kind: 'estimated',
          decision: 'unknown',
          estimated: true,
          estimationReason: averageReason,
        }}
      />,
    );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 13)
    expect(screen.queryByText(/רוצים תשובה מדויקת יותר\?|הערכה:/)).toBeNull();
  });
  it.each([true, false, undefined])(
    'renders a calculated proxy verdict only when flagged: %s',
    (estimated) => {
      render(
        <AdmissionEstimate
          result={{
            kind: 'manual_gate',
            decision: 'below',
            estimated,
            estimationReason: averageReason,
          }}
        />,
      );
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 13)
      expect(screen.queryByText(/רוצים תשובה מדויקת יותר\?|הערכה:/) !== null).toBe(
        estimated === true,
      );
    },
  );
  it('renders an actual score even before a decision is known', () => {
    render(
      <AdmissionEstimate
        result={{
          kind: 'estimated',
          decision: 'unknown',
          score: 0,
          estimated: true,
          estimationReason: averageReason,
        }}
      />,
    );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 13)
    expect(screen.getByText(/רוצים תשובה מדויקת יותר\?|הערכה:/).textContent).toContain(
      'הזינו ציונים לפי מקצוע',
    );
  });
  it.each(['exact', 'needs_input'] as const)(
    'gates defaulted-year wording on calculated state: %s',
    (kind) => {
      const result: Pick<
        AdmissionsEvaluationResult,
        'kind' | 'decision' | 'score' | 'estimated' | 'estimationReason'
      > = {
        kind,
        decision: kind === 'exact' ? 'pending' : 'unknown',
        estimated: true,
        estimationReason: yearReason,
      };
      render(<AdmissionEstimate result={result} />);
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 13)
      const note = screen.queryByText(/רוצים תשובה מדויקת יותר\?|הערכה:/);
      expect(note !== null).toBe(kind === 'exact');
      if (note) {
        expect(note.textContent).toContain('שנת הבחינה');
        expect(note.textContent).not.toContain('ציונים לפי מקצוע');
        expect(note.getAttribute('dir')).toBe('rtl');
        expect(note.className).toContain('text-right');
      }
    },
  );
});

it('offers more precise subject input for an average-based estimate', () => {
  render(
    <AdmissionEstimate
      result={{
        kind: 'estimated',
        decision: 'accepted',
        score: 650,
        estimated: true,
        estimationReason: averageReason,
      }}
    />,
  );
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 13)
  expect(screen.getByText('רוצים תשובה מדויקת יותר? הזינו ציונים לפי מקצוע.')).toBeTruthy();
});

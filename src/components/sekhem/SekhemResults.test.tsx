// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SekhemResults from './SekhemResults';
import type {
  AdmissionsEvaluationReport,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';

const institution = (id: string) => ({
  id,
  name: id === 'ariel' ? 'אוניברסיטת אריאל' : id,
  region: 'מרכז',
  domain: 'university',
});
function report(
  id: string,
  values: Partial<AdmissionsEvaluationResult> = {},
): AdmissionsEvaluationReport {
  return {
    generatedAt: '2026-10-28',
    evaluatorVersion: 'test',
    inputDigest: 'test',
    input: { degreeId: 'psychology' },
    program: { id: 'psychology', name: 'פסיכולוגיה' },
    results: [
      {
        institution: institution(id),
        linkedInstitutionId: id,
        kind: 'exact',
        capability: 'exact',
        decision: 'below',
        confidence: 'high',
        sourceLabel: 'מקור רשמי',
        explanation: '',
        nextAction: '',
        score: 21.12,
        threshold: 22.5,
        scoreLabel: 'ציון התאמה',
        ...values,
      } as AdmissionsEvaluationResult,
    ],
  };
}
const offerings = ['huji', 'tau', 'ariel', 'biu', 'afeka', 'hit', 'reichman'].map((id) => ({
  programId: 'psychology',
  programName: 'פסיכולוגיה',
  institutionId: id,
  institutionName: institution(id).name,
}));
const renderReports = (reports: AdmissionsEvaluationReport[]) => {
  const onEnquiry = vi.fn();
  const view = render(
    <SekhemResults reports={reports} offerings={offerings} onEnquiry={onEnquiry} />,
  );
  return { ...view, onEnquiry };
};

describe('API-only result rows', () => {
  it('renders only returned numbers and preserves the API verdict', () => {
    const source = report('huji', { score: 21.12, threshold: 21.12, decision: 'below' });
    renderReports([source]);
    const row = screen.getByTestId('result-psychology-huji');
    expect(within(row).getByText('הציונים מתחת לסף')).toBeTruthy();
    expect(within(row).getByText('סף קבלה')).toBeTruthy();
    for (const number of row.querySelectorAll('[data-result-number]')) {
      const field = number.getAttribute('data-result-number') as 'score' | 'threshold';
      expect(Number(number.textContent)).toBe(source.results[0][field]);
    }
    expect(row.textContent).not.toContain('נדרשת בדיקה מול המוסד');
  });
  it('keeps the HUJI Kidum result text-only with its sourced gate text', () => {
    renderReports([
      report('huji', {
        kind: 'manual_gate',
        capability: 'manual_gate',
        decision: 'unknown',
        score: undefined,
        threshold: undefined,
        explanation: 'מסלול ראויים לקידום של האגודה לקידום החינוך.',
      }),
    ]);
    const row = screen.getByTestId('result-psychology-huji');
    expect(row.querySelector('[data-result-number]')).toBeNull();
    expect(row.textContent).toContain('ראויים לקידום');
    expect(row.textContent).not.toMatch(/\d|נדרשת בדיקה מול המוסד/);
  });
  it('names an API-returned interview without inventing an admission answer', () => {
    renderReports([
      report('tau', {
        kind: 'manual_gate',
        capability: 'manual_gate',
        decision: 'eligible_to_apply',
        additionalConditions: [
          { id: 'admissions_committee', label: 'ראיון אישי', status: 'unconfirmed' },
        ],
      }),
    ]);
    expect(screen.getByText('ראיון אישי')).toBeTruthy();
  });
  it('collapses no-score institutions into one honest line and hides Ariel', () => {
    renderReports(
      ['biu', 'afeka', 'hit', 'ariel'].map((id) =>
        report(id, {
          score: undefined,
          threshold: undefined,
          decision: 'unknown',
          kind: 'unsupported',
        }),
      ),
    );
    expect(screen.getAllByText('בחלק מהמוסדות נבדקים תנאי קבלה בלי חישוב סכם.')).toHaveLength(1);
    expect(screen.queryByText('אוניברסיטת אריאל')).toBeNull();
    expect(screen.queryByText('עדיין לא נתמך')).toBeNull();
    expect(screen.getByRole('link', { name: 'יש גם אפיקי קבלה נוספים' }).getAttribute('href')).toBe(
      '/institutions/afeka',
    );
  });
  it('offers an explicit enquiry for every verdict group and keeps Reichman attribution', () => {
    const { onEnquiry } = renderReports([
      report('huji'),
      report('tau'),
      report('reichman', { kind: 'estimated', capability: 'estimated' }),
    ]);
    expect(screen.getAllByRole('button', { name: 'קבלת מידע על התוכנית' })).toHaveLength(3);
    fireEvent.click(
      within(screen.getByTestId('institution-huji')).getByRole('button', {
        name: 'קבלת מידע על התוכנית',
      }),
    );
    expect(onEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: 'huji', programId: 'psychology' }),
      expect.objectContaining({ program: { id: 'psychology', name: 'פסיכולוגיה' } }),
    );
    expect(screen.getByText('אומדן, עד לאישור המוסד')).toBeTruthy();
  });
});

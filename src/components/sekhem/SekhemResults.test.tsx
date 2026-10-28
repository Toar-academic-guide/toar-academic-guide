// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SekhemResults from './SekhemResults';
import type {
  AdmissionsEvaluationKind,
  AdmissionsRequiredInput,
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
  it.each([
    ['reichman', 635.7968000000001, '636'],
    ['reichman', 700, '700'],
    ['huji', 21.01, '21.01'],
    ['huji', 25.186, '25.186'],
  ] as const)(
    'formats %s score %s as %s without changing the API value or verdict',
    (id, score, shown) => {
      const source = report(id, { score, threshold: 636, decision: 'below' });
      renderReports([source]);
      const row = screen.getByTestId(`result-psychology-${id}`);
      expect(row.querySelector('[data-result-number="score"]')?.textContent).toBe(shown);
      expect(within(row).getByText('הציונים מתחת לסף')).toBeTruthy();
      expect(source.results[0].score).toBe(score);
    },
  );
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
  it('uses the returned route name when a text-only gate explanation contains hidden numerical bands', () => {
    renderReports([
      report('huji', {
        kind: 'manual_gate',
        capability: 'manual_gate',
        decision: 'unknown',
        score: undefined,
        threshold: undefined,
        sourceLabel: 'מסלול ראויים לקידום',
        explanation:
          'קבלה ישירה מציון 690 בפסיכומטרי מיועדת לראויים לקידום בדירוג של 30 נקודות לפחות מטעם האגודה לקידום החינוך.',
      }),
    ]);
    const row = screen.getByTestId('result-psychology-huji');
    expect(row.textContent).toContain('מסלול ראויים לקידום');
    expect(row.textContent).not.toMatch(/\d/);
  });
  it('keeps a numberless architecture gate free of formula coefficients', () => {
    renderReports([
      report('tau', {
        kind: 'manual_gate',
        capability: 'manual_gate',
        decision: 'eligible_to_apply',
        score: undefined,
        threshold: undefined,
        sourceLabel: 'נדרש מיון נוסף',
        explanation:
          'ציון הקבלה מורכב מ־50% ציון ההתאמה ו־50% ציון מבחן מיון אדריכלי; מבחן המיון הוא חובה, ואוניברסיטת תל אביב מחליטה על הקבלה לאחריו.',
      }),
    ]);
    const row = screen.getByTestId('result-psychology-tau');
    expect(row.textContent).toContain('מבחן המיון הוא חובה');
    expect(row.textContent).not.toMatch(/\d/);
    expect(row.querySelector('[data-result-number]')).toBeNull();
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
  it.each([
    'exact',
    'estimated',
    'needs_input',
    'authority_unavailable',
    'tracked_missing_rule',
    'unsupported',
    'degraded',
    'open_admission',
    'manual_gate',
    'requirements_only',
  ] as AdmissionsEvaluationKind[])('explains a numberless %s result', (kind) => {
    renderReports([
      report('tau', {
        kind,
        score: undefined,
        threshold: undefined,
        decision: 'unknown',
        sourceLabel: 'חסרים תנאי קבלה לחישוב',
        explanation: '',
      }),
    ]);
    const row = screen.getByTestId('result-psychology-tau');
    expect(row.querySelector('[data-result-reason]')?.textContent?.trim()).toBeTruthy();
    expect(row.textContent).toContain('חסרים תנאי קבלה לחישוב');
  });
  it.each([
    ['haifa', 'haifa_bagrut_average', 'ממוצע בגרות רשמי של חיפה'],
    ['technion', 'bagrut_subject_record', 'הבעה עברית'],
    ['bgu', 'bgu_bagrut_average', 'ממוצע הבגרות הרשמי של בן־גוריון'],
    ['tau', 'tau_physiotherapy_route', 'אפיק הקבלה לפיזיותרפיה'],
    ['huji', 'huji_medicine_assessment_score', 'ציון מו״ר/מרק״ם'],
  ] as const)('names the missing %s input %s', (id, key, label) => {
    render(
      <SekhemResults
        reports={[
          report(id, {
            kind: 'needs_input',
            score: undefined,
            threshold: undefined,
            requiredInputs: [key as AdmissionsRequiredInput],
          }),
        ]}
        offerings={[
          {
            programId: 'psychology',
            programName: 'פסיכולוגיה',
            institutionId: id,
            institutionName: id,
          },
        ]}
        onEnquiry={vi.fn()}
      />,
    );
    const row = screen.getByTestId(`result-psychology-${id}`);
    expect(row.querySelector('[data-result-reason]')?.textContent).toContain(label);
    if (id === 'haifa')
      expect(
        within(row)
          .getByRole('link', { name: /ממוצע בגרות/ })
          .getAttribute('href'),
      ).toBe('#haifaBagrutAverage');
  });
  it('starts with a numerical programme when available and preserves manual selection', () => {
    const missing = report('huji', {
      score: undefined,
      threshold: undefined,
      kind: 'authority_unavailable',
      sourceLabel: 'האימות הרשמי טרם הושלם',
    });
    const numeric = {
      ...report('huji'),
      input: { degreeId: 'law' },
      program: { id: 'law', name: 'משפטים' },
    };
    render(
      <SekhemResults
        reports={[missing, numeric]}
        offerings={[offerings[0], { ...offerings[0], programId: 'law', programName: 'משפטים' }]}
        onEnquiry={vi.fn()}
      />,
    );
    expect(screen.getByTestId('result-law-huji')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('בחירת תוכנית'), { target: { value: 'psychology' } });
    expect(screen.getByTestId('result-psychology-huji').textContent).toContain(
      'האימות הרשמי טרם הושלם',
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

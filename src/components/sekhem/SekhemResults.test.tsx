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
  it.each([
    { programId: 'tau_ee', institutionId: 'tau', threshold: undefined, capability: 'exact' },
    {
      programId: 'technion_medicine',
      institutionId: 'technion',
      threshold: null,
      capability: 'score_only',
    },
  ] as const)(
    'shows a neutral exact score without a threshold or verdict for $programId',
    ({ programId, institutionId, threshold, capability }) => {
      const source = report(institutionId, {
        kind: 'exact',
        capability,
        decision: 'unknown',
        score: 87.6,
        threshold,
      });
      source.input.degreeId = source.program.id = programId;
      render(
        <SekhemResults
          reports={[source]}
          offerings={[
            {
              programId,
              institutionId,
              programName: 'תוכנית לדוגמה',
              institutionName: institutionId,
              programPath: `/programs/${programId}`,
            },
          ]}
          onEnquiry={vi.fn()}
        />,
      );
      const card = screen.getByTestId(`institution-${institutionId}`);
      const row = screen.getByTestId(`result-${programId}-${institutionId}`);
      expect(row.querySelector('[data-result-number="score"]')?.textContent).toBe('87.6');
      expect(within(row).getByText('ציון הקבלה')).toBeTruthy();
      expect(
        within(card).getByRole('link', { name: 'לתנאי הקבלה של התוכנית' }).getAttribute('href'),
      ).toBe(`/programs/${programId}`);
      expect(row.textContent).toBe('87.6ציון הקבלה');
      expect(row.querySelectorAll('p, [data-result-reason], [data-result-verdict]')).toHaveLength(
        0,
      );
      expect(card.textContent).not.toMatch(/עדיין לא מחשבים כאן|עומדים|נתונים|מתואם|סכם|מצרף/);
      const classes = Array.from(card.querySelectorAll('[class]'), (node) =>
        node.getAttribute('class'),
      ).join(' ');
      expect(classes).not.toMatch(/eligible|success|accepted|green|#206345/);
    },
  );
  it('renders the Haifa API no-calculation note once without an invented score', () => {
    render(
      <SekhemResults
        reports={[
          report('haifa', {
            kind: 'needs_input',
            capability: 'needs_input',
            decision: 'unknown',
            score: undefined,
            threshold: undefined,
            requiredInputs: ['haifa_bagrut_average'],
            explanation: 'עדיין לא מחשבים כאן את ציון הקבלה של חיפה',
          }),
        ]}
        offerings={[
          { ...offerings[0], institutionId: 'haifa', programPath: '/programs/psychology' },
        ]}
        onEnquiry={vi.fn()}
      />,
    );
    const row = screen.getByTestId('result-psychology-haifa');
    expect(row.textContent).toBe('עדיין לא מחשבים כאן את ציון הקבלה של חיפה');
    expect(row.querySelector('[data-result-number]')).toBeNull();
  });
  it('names the institution when its score is not calculated here', () => {
    renderReports([
      report('tau', {
        kind: 'unsupported',
        decision: 'unknown',
        score: undefined,
        threshold: undefined,
      }),
    ]);
    expect(screen.getByTestId('result-psychology-tau').textContent).toBe(
      'עדיין לא מחשבים כאן את ציון הקבלה של תל אביב',
    );
  });
  it('links a returned missing subject only when the API names required inputs', () => {
    const focus = vi.fn();
    render(
      <SekhemResults
        reports={[
          report('tau', {
            kind: 'needs_input',
            decision: 'accepted',
            scoreAssessment: 'meets_threshold',
            score: undefined,
            threshold: 600,
            requiredInputs: ['physics_grade'],
          }),
        ]}
        offerings={offerings}
        onEnquiry={vi.fn()}
        onInputFocus={focus}
      />,
    );
    const row = screen.getByTestId('result-psychology-tau');
    expect(row.textContent).toContain(
      'עומדים בתנאי הסף. כדי לחשב את ציון הקבלה, הוסיפו ציון בפיזיקה',
    );
    fireEvent.click(within(row).getByRole('button', { name: 'פיזיקה' }));
    expect(focus).toHaveBeenCalledWith({ subject: 'פיזיקה', field: 'grade' });
  });
  it('describes a passed published threshold without claiming a calculated score', () => {
    renderReports([
      report('tau', {
        score: undefined,
        threshold: 600,
        decision: 'accepted',
        scoreAssessment: 'meets_threshold',
        requiredInputs: [],
      }),
    ]);
    const row = screen.getByTestId('result-psychology-tau');
    expect(row.textContent).toContain(
      'עומדים בתנאי הסף. לתוכנית הזו עוד אין חישוב ציון קבלה אצלנו, ולכן מוצג רק סף הקבלה.',
    );
    expect(within(row).queryByRole('button')).toBeNull();
    expect(row.querySelectorAll('[data-result-number]')).toHaveLength(1);
  });
  it.each(['afeka_cs', 'afeka_ee', 'afeka_softwareeng', 'afeka_biomedical', 'tau_law'])(
    'gives accepted numberless %s one positive line and its conditions link',
    (programId) => {
      const id = programId.startsWith('afeka') ? 'afeka' : 'tau';
      const source = report(id, {
        kind: 'exact',
        decision: 'accepted',
        scoreAssessment: 'meets_threshold',
        score: undefined,
        threshold: undefined,
      });
      source.input.degreeId = source.program.id = programId;
      render(
        <SekhemResults
          reports={[source]}
          offerings={[
            {
              ...offerings[0],
              institutionId: id,
              programId,
              programPath: `/programs/${programId}`,
            },
          ]}
          onEnquiry={vi.fn()}
        />,
      );
      const row = screen.getByTestId(`result-${programId}-${id}`);
      expect(row.textContent).toBe('עומדים בתנאי הקבלה של התוכנית');
      expect(
        screen.getByRole('link', { name: 'לתנאי הקבלה של התוכנית' }).getAttribute('href'),
      ).toBe(`/programs/${programId}`);
    },
  );
  it('shows a returned Reichman estimate next to the cutoff with one below verdict', () => {
    renderReports([
      report('reichman', {
        kind: 'estimated',
        decision: 'below',
        scoreAssessment: 'below_threshold',
        score: 635.7968000000001,
        threshold: 650,
      }),
    ]);
    const row = screen.getByTestId('result-psychology-reichman');
    expect(row.textContent).toContain('ציון הקבלה המשוער שלכם נמוך מהסף');
    expect(row.querySelector('[data-result-number="score"]')?.textContent).toBe('636');
    expect(row.querySelector('[data-result-number="threshold"]')?.textContent).toBe('650');
    expect(row.textContent).not.toContain('עומדים');
  });
  it('does not invent a Reichman CS estimate from below-threshold flags without numbers', () => {
    renderReports([
      report('reichman', {
        kind: 'estimated',
        decision: 'below',
        scoreAssessment: 'below_threshold',
        score: undefined,
        threshold: undefined,
        explanation: 'תנאי מסלולי הקבלה הרגילים שנבדקו אינם מתקיימים.',
      }),
    ]);
    const row = screen.getByTestId('result-psychology-reichman');
    expect(row.textContent).toBe('הציונים אינם עומדים בתנאי הקבלה שנבדקו.');
    expect(row.querySelector('[data-result-number]')).toBeNull();
  });
  it('links each result card to its supplied canonical public programme page', () => {
    const publicOfferings = offerings.map((offering) => ({
      ...offering,
      programPath: '/programs/psychology',
    }));
    render(
      <SekhemResults
        reports={[report('huji'), report('tau'), report('reichman')]}
        offerings={publicOfferings}
        onEnquiry={vi.fn()}
      />,
    );
    for (const id of ['huji', 'tau', 'reichman']) {
      const group = screen.getByTestId(`institution-${id}`);
      expect(
        within(group).getByRole('link', { name: 'לתנאי הקבלה של התוכנית' }).getAttribute('href'),
      ).toBe('/programs/psychology');
    }
  });
  it('does not invent a programme link for a result without a public page', () => {
    const source = report('tau');
    source.input.degreeId = source.program.id = 'no_public_page';
    render(
      <SekhemResults
        reports={[source]}
        offerings={[
          {
            programId: 'no_public_page',
            programName: 'תוכנית ללא עמוד',
            institutionId: 'tau',
            institutionName: 'tau',
          },
        ]}
        onEnquiry={vi.fn()}
      />,
    );
    expect(screen.getByTestId('institution-tau')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'לתנאי הקבלה של התוכנית' })).toBeNull();
  });
  it('updates the programme page link when the selected programme changes', () => {
    const psychology = report('huji');
    const law = report('huji');
    law.input.degreeId = law.program.id = 'huji_law';
    render(
      <SekhemResults
        reports={[psychology, law]}
        offerings={[
          { ...offerings[0], programPath: '/programs/psychology' },
          {
            ...offerings[0],
            programId: 'huji_law',
            programName: 'משפטים',
            programPath: '/programs/huji_law',
          },
        ]}
        onEnquiry={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'huji_law' } });
    expect(screen.getByRole('link', { name: 'לתנאי הקבלה של התוכנית' }).getAttribute('href')).toBe(
      '/programs/huji_law',
    );
  });
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
    expect(row.textContent).not.toContain('חסרים תנאי קבלה לחישוב');
  });
  it.each([
    ['haifa', 'haifa_bagrut_average', 'עדיין לא מחשבים כאן את ציון הקבלה של חיפה'],
    ['technion', 'bagrut_subject_record', 'בכל מקצועות הבגרות'],
    ['bgu', 'bgu_bagrut_average', 'ממוצע הבגרות לפי כללי בן־גוריון'],
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
            programPath: '/programs/psychology',
          },
        ]}
        onEnquiry={vi.fn()}
      />,
    );
    const row = screen.getByTestId(`result-psychology-${id}`);
    expect(row.querySelector('[data-result-reason]')?.textContent).toContain(label);
    if (id === 'haifa') {
      expect(row.querySelector('[data-result-reason]')?.textContent).toBe(
        'עדיין לא מחשבים כאן את ציון הקבלה של חיפה',
      );
      expect(row.textContent).not.toContain('ממוצע בגרות רשמי של חיפה');
      expect(
        within(screen.getByTestId('institution-haifa'))
          .getByRole('link', { name: 'לתנאי הקבלה של התוכנית' })
          .getAttribute('href'),
      ).toBe('/programs/psychology');
    }
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
      'עדיין לא מחשבים כאן את ציון הקבלה של האוניברסיטה העברית',
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
  ] as AdmissionsEvaluationKind[])(
    'uses student Hebrew for numberless %s reasons across institutions',
    (kind) => {
      const ids = ['haifa', 'technion', 'bgu', 'tau', 'huji', 'reichman', 'biu', 'afeka', 'hit'];
      const required: Record<string, AdmissionsRequiredInput> = {
        haifa: 'haifa_bagrut_average',
        technion: 'bagrut_subject_record',
        bgu: 'bgu_bagrut_average',
        tau: 'tau_physiotherapy_route',
        huji: 'huji_medicine_assessment_score',
      };
      render(
        <SekhemResults
          reports={ids.map((id) =>
            report(id, {
              kind,
              score: undefined,
              threshold: undefined,
              decision: 'below',
              sourceLabel: 'מקור חסום',
              explanation: 'bagrut_subject_record: authority_unavailable',
              requiredInputs: kind === 'needs_input' && required[id] ? [required[id]] : [],
            }),
          )}
          offerings={ids.map((id) => ({
            ...offerings[0],
            institutionId: id,
            institutionName: id,
            programPath: '/programs/psychology',
          }))}
          onEnquiry={vi.fn()}
        />,
      );
      for (const id of ids) {
        const row = screen.getByTestId(`result-psychology-${id}`);
        const reasons = Array.from(
          row.querySelectorAll('[data-result-reason]'),
          (node) => node.textContent,
        );
        expect(reasons.length).toBeGreaterThan(0);
        for (const text of reasons) {
          expect(text?.trim()).toBeTruthy();
          expect(text).not.toMatch(/מקור חסום|ממוצע בגרות רשמי של חיפה|[a-z]+_[a-z_]+/i);
        }
        expect(screen.getByTestId(`institution-${id}`).textContent).not.toMatch(
          /נתונים|מתואם|סכם|מצרף/,
        );
        if (id === 'haifa') expect(reasons).toEqual(['עדיין לא מחשבים כאן את ציון הקבלה של חיפה']);
      }
    },
  );
  it('places groups with a default number first and preserves order within both sets', () => {
    const ids = ['haifa', 'tau', 'bgu', 'huji', 'technion', 'reichman'];
    const numbered = new Set(['tau', 'huji', 'reichman']);
    render(
      <SekhemResults
        reports={ids.map((id) =>
          report(id, {
            score: numbered.has(id) ? 0 : undefined,
            threshold: undefined,
            kind: numbered.has(id) ? 'exact' : 'needs_input',
            decision: 'unknown',
          }),
        )}
        offerings={ids.map((id) => ({ ...offerings[0], institutionId: id, institutionName: id }))}
        onEnquiry={vi.fn()}
      />,
    );
    expect(
      screen.getAllByTestId(/^institution-/).map((node) => node.getAttribute('data-testid')),
    ).toEqual(
      ['tau', 'huji', 'reichman', 'haifa', 'bgu', 'technion'].map((id) => `institution-${id}`),
    );
  });
  it('ranks the displayed BGU communication card as numberless despite three numbered alternatives', () => {
    const source = (id: string, programId: string, score?: number, threshold?: number) => ({
      ...report(id, {
        kind: score === undefined && threshold === undefined ? 'unsupported' : 'exact',
        score,
        threshold,
        decision: 'unknown',
      }),
      input: { degreeId: programId },
      program: { id: programId, name: programId },
    });
    const reports = [
      source('bgu', 'bgu_communication'),
      source('bgu', 'bgu_accounting', 600),
      source('bgu', 'bgu_business', 610),
      source('bgu', 'bgu_psychology', 620),
      source('haifa', 'haifa_cs'),
      source('tau', 'tau_law', undefined, 647),
      source('huji', 'huji_law', 0),
      source('technion', 'technion_cs'),
    ];
    const offered = reports.map((item) => ({
      programId: item.program.id,
      programName: item.program.name,
      institutionId: item.results[0].linkedInstitutionId,
      institutionName: item.results[0].linkedInstitutionId,
    }));
    const view = render(
      <SekhemResults reports={reports} offerings={offered} onEnquiry={vi.fn()} />,
    );
    const picker = within(screen.getByTestId('institution-bgu')).getByRole('combobox');
    // Preserve the existing numbered default, then retain the student's communication selection.
    expect(picker).toHaveProperty('value', 'bgu_accounting');
    fireEvent.change(picker, { target: { value: 'bgu_communication' } });
    expect(
      screen.getByTestId('result-bgu_communication-bgu').querySelector('[data-result-number]'),
    ).toBeNull();
    expect(picker).toHaveProperty('value', 'bgu_communication');
    const order = () =>
      screen.getAllByTestId(/^institution-/).map((node) => node.getAttribute('data-testid'));
    expect(order()).toEqual(
      ['tau', 'huji', 'bgu', 'haifa', 'technion'].map((id) => `institution-${id}`),
    );
    view.rerender(<SekhemResults reports={[...reports]} offerings={offered} onEnquiry={vi.fn()} />);
    expect(picker).toHaveProperty('value', 'bgu_communication');
    expect(order()).toEqual(
      ['tau', 'huji', 'bgu', 'haifa', 'technion'].map((id) => `institution-${id}`),
    );
  });
  it('keeps the primary lead CTA on a numberless card without a public programme page', () => {
    const { onEnquiry } = renderReports([
      report('huji', { score: undefined, threshold: undefined, kind: 'needs_input' }),
    ]);
    expect(screen.getByRole('button', { name: 'קבלת מידע על התוכנית' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'קבלת מידע על התוכנית' }));
    expect(onEnquiry).toHaveBeenCalledTimes(1);
  });
  it('shows a secondary conditions link on a numberless card with a public page', () => {
    render(
      <SekhemResults
        reports={[
          report('haifa', {
            score: undefined,
            threshold: undefined,
            kind: 'needs_input',
            requiredInputs: ['haifa_bagrut_average'],
          }),
        ]}
        offerings={[
          { ...offerings[0], institutionId: 'haifa', programPath: '/programs/psychology' },
        ]}
        onEnquiry={vi.fn()}
      />,
    );
    const link = screen.getByRole('link', { name: 'לתנאי הקבלה של התוכנית' });
    expect(link.getAttribute('href')).toBe('/programs/psychology');
    expect(link.classList.contains('way-button-secondary')).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'קבלת מידע על התוכנית' })
        .classList.contains('way-button-primary'),
    ).toBe(true);
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

it.each(['biu', 'hit', 'afeka'])(
  'keeps programme and enquiry actions when every programme entry is filtered (%s)',
  (id) => {
    const source = report(id, {
      score: undefined,
      threshold: undefined,
      decision: 'unknown',
      kind: 'estimated',
    });
    const offering = {
      ...offerings.find((item) => item.institutionId === id)!,
      programPath: '/programs/psychology',
    };
    const onEnquiry = vi.fn();
    render(<SekhemResults reports={[source]} offerings={[offering]} onEnquiry={onEnquiry} />);
    const card = screen.getByTestId(`programme-actions-${id}`);
    expect(within(card).getByText('פסיכולוגיה')).toBeTruthy();
    expect(
      within(card).getByRole('link', { name: 'לתנאי הקבלה של התוכנית' }).getAttribute('href'),
    ).toBe('/programs/psychology');
    expect(within(card).getByRole('heading', { name: offering.institutionName })).toBeTruthy();
    expect(card.hasAttribute('hidden')).toBe(false);
    expect(card.querySelector('[data-testid^="result-"]')).toBeNull();
    expect(card.querySelectorAll('[data-result-number], [data-result-reason]')).toHaveLength(0);
    expect(card.textContent).not.toMatch(/\d|עומדים|מתחת|חסרים|עדיין לא/);
    fireEvent.click(within(card).getByRole('button', { name: 'קבלת מידע על התוכנית' }));
    expect(onEnquiry).toHaveBeenCalledWith(offering, source);
  },
);

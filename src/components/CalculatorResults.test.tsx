// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CalculatorResults from '@/components/CalculatorResults';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';

const hoistedMocks = vi.hoisted(() => ({
  fetchAdmissionsEvaluation: vi.fn(),
}));

vi.mock('@/lib/admissionsEvaluationClient', () => ({
  AdmissionsEvaluationApiError: class AdmissionsEvaluationApiError extends Error {
    code: string;

    constructor(message: string, code = 'ADMISSIONS_EVALUATION_REQUEST_FAILED') {
      super(message);
      this.code = code;
    }
  },
  fetchAdmissionsEvaluation: hoistedMocks.fetchAdmissionsEvaluation,
}));

vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
  },
}));

const programs = getStaticCataloguePrograms();

function report(results: AdmissionsEvaluationReport['results']): AdmissionsEvaluationReport {
  return {
    generatedAt: '2026-06-27T00:00:00.000Z',
    evaluatorVersion: 'admissions-evaluator-v1',
    inputDigest: 'sha256:test',
    input: {
      degreeId: 'tau_cs',
      psychometric: 700,
      bagrut: 110,
    },
    program: {
      id: 'tau_cs',
      name: 'מדעי המחשב',
    },
    results,
  };
}

describe('CalculatorResults', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoistedMocks.fetchAdmissionsEvaluation.mockReset();
  });

  it('renders an exact accepted result from the admissions evaluation route', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: {
            id: 'tau',
            name: 'אוניברסיטת תל אביב',
            region: 'center',
            domain: 'tau.ac.il',
            universityId: 'tau',
          },
          linkedInstitutionId: 'tau',
          capability: 'exact',
          kind: 'exact',
          decision: 'accepted',
          confidence: 'high',
          sourceLabel: 'אימות רשמי',
          explanation: 'מקור רשמי של אוניברסיטת תל אביב סיפק ציון וסף קבלה מעודכנים למסלול זה.',
          nextAction: 'בדקו את דף ההרשמה הרשמי והשלימו כל דרישה ידנית נוספת.',
          score: 712,
          scoreLabel: 'ציון התאמה',
          threshold: 700,
        },
      ]),
    );

    render(
      <CalculatorResults
        degreeId="tau_cs"
        programs={programs}
        psychometric={700}
        bagrut={110}
        onBack={() => {}}
      />,
    );

    expect(await screen.findByLabelText('אוניברסיטת תל אביב: מתקבל/ת')).toBeTruthy();
    expect(screen.getByText('אימות רשמי')).toBeTruthy();
    expect(screen.getByText(/ציון התאמה 712 · סף 700/)).toBeTruthy();
  });

  it('renders mapped formula and needs-input states with distinct labels', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: {
            id: 'technion',
            name: 'הטכניון – מכון טכנולוגי לישראל',
            region: 'north',
            domain: 'technion.ac.il',
            universityId: 'technion',
          },
          linkedInstitutionId: 'technion',
          capability: 'estimated',
          kind: 'estimated',
          decision: 'below',
          confidence: 'high',
          sourceLabel: 'כלל קבלה ממופה',
          explanation: 'התוצאה מבוססת על נוסחת סכם וסף קבלה שמופו ממקור מוסדי ונבדקו בקטלוג.',
          nextAction: 'שפרו את הנתונים שמופיעים בפער או השוו למסלולים אחרים שבהם אתם עומדים בסף.',
          score: 88.2,
          scoreLabel: 'סכם',
          threshold: 90,
          deltaNeeded: {
            psychometric: 12,
            bagrut: 1,
          },
        },
        {
          institution: {
            id: 'haifa',
            name: 'אוניברסיטת חיפה',
            region: 'north',
            domain: 'haifa.ac.il',
            universityId: 'haifa',
          },
          linkedInstitutionId: 'haifa',
          capability: 'needs_input',
          kind: 'needs_input',
          decision: 'unknown',
          confidence: 'low',
          sourceLabel: 'נדרשים נתונים נוספים',
          explanation: 'כדי לחשב מסלול זה דרך המקור הרשמי צריך גם תתי-ציונים בפסיכומטרי.',
          nextAction: 'השלימו ציוני כמותי, מילולי ואנגלית כדי לקבל אימות רשמי.',
          requiredInputs: ['psychometric_math', 'psychometric_verbal', 'psychometric_english'],
        },
      ]),
    );

    render(
      <CalculatorResults
        degreeId="tau_cs"
        programs={programs}
        psychometric={700}
        bagrut={110}
        onBack={() => {}}
      />,
    );

    expect(await screen.findByLabelText('הטכניון – מכון טכנולוגי לישראל: מתחת לסף')).toBeTruthy();
    expect(screen.getByLabelText('אוניברסיטת חיפה: נדרשים נתונים')).toBeTruthy();
    expect(screen.getByText('נדרשים נתונים נוספים')).toBeTruthy();
    expect(
      screen.getByText('כדי לחשב מסלול זה דרך המקור הרשמי צריך גם תתי-ציונים בפסיכומטרי.'),
    ).toBeTruthy();
    expect(screen.queryByText('אימות רשמי')).toBeNull();
  });

  it('renders the official link for mapped estimated results when the official source is currently blocked', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: {
            id: 'ariel',
            name: 'אוניברסיטת אריאל',
            region: 'center',
            domain: 'ariel.ac.il',
            universityId: 'ariel',
          },
          linkedInstitutionId: 'ariel',
          capability: 'score_only',
          kind: 'estimated',
          decision: 'accepted',
          confidence: 'medium',
          sourceLabel: 'כלל קבלה ממופה, מקור רשמי חסום',
          explanation:
            'המקור הרשמי חסום כרגע, לכן התוצאה מבוססת על נוסחת סכם ממופה ועל סף קבלה שנשמר בקטלוג, בלי אימות חי של אתר המוסד.',
          nextAction:
            'Move Ariel to a browser-automation lane that can actually clear the current Radware challenge.',
          score: 707,
          scoreLabel: 'סכם',
          threshold: 600,
          officialUrls: ['https://pniot.ariel.ac.il/projects/tzmm/NewCalcMark/'],
        },
      ]),
    );

    render(
      <CalculatorResults
        degreeId="ariel_cs"
        programs={programs}
        psychometric={680}
        bagrut={110}
        onBack={() => {}}
      />,
    );

    expect(await screen.findByLabelText('אוניברסיטת אריאל: מתקבל/ת')).toBeTruthy();
    expect(screen.getByText('כלל קבלה ממופה, מקור רשמי חסום')).toBeTruthy();
    expect(
      screen.getByRole('link', {
        name: 'https://pniot.ariel.ac.il/projects/tzmm/NewCalcMark/',
      }),
    ).toBeTruthy();
  });

  it('renders manual-gate results as eligible to apply', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: {
            id: 'bezalel',
            name: 'בצלאל',
            region: 'center',
            domain: 'bezalel.ac.il',
            universityId: 'bezalel',
          },
          linkedInstitutionId: 'bezalel',
          capability: 'manual_gate',
          kind: 'manual_gate',
          decision: 'eligible_to_apply',
          confidence: 'high',
          sourceLabel: 'אפשר להגיש מועמדות',
          explanation:
            'לפי תנאי הקבלה שמופו, אין סף ציונים אוטומטי שמונע הגשה. עדיין צריך להשלים: תיק עבודות; ראיון קבלה',
          nextAction: 'הגישו מועמדות ובדקו את מועדי תיק העבודות, המבחנים או הראיונות באתר המוסד.',
        },
      ]),
    );

    render(
      <CalculatorResults
        degreeId="tau_cs"
        programs={programs}
        psychometric={700}
        bagrut={110}
        onBack={() => {}}
      />,
    );

    expect(await screen.findByLabelText('בצלאל: אפשר להגיש מועמדות')).toBeTruthy();
    expect(screen.getByText(/אין סף ציונים אוטומטי שמונע הגשה/)).toBeTruthy();
  });

  it('renders manual-gate threshold failures as below the official invitation score', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: {
            id: 'technion',
            name: 'הטכניון – מכון טכנולוגי לישראל',
            region: 'north',
            domain: 'technion.ac.il',
            universityId: 'technion',
          },
          linkedInstitutionId: 'technion',
          capability: 'manual_gate',
          kind: 'manual_gate',
          decision: 'below',
          confidence: 'high',
          sourceLabel: 'סף זימון נדרש',
          explanation: 'לפי המקור הרשמי, צריך להגיע לפחות לסכם 92 כדי לעבור לשלב המיון הידני.',
          nextAction:
            'שפרו את הנתונים שמופיעים בפער לפני הרשמה. גם מעבר סף הזימון לא מבטיח קבלה סופית.',
          score: 84.5,
          scoreLabel: 'סכם',
          threshold: 92,
          deltaNeeded: {
            psychometric: 100,
            bagrut: 15,
          },
        },
      ]),
    );

    render(
      <CalculatorResults
        degreeId="technion_medicine"
        programs={programs}
        psychometric={700}
        bagrut={100}
        onBack={() => {}}
      />,
    );

    expect(await screen.findByLabelText('הטכניון – מכון טכנולוגי לישראל: מתחת לסף')).toBeTruthy();
    expect(screen.getByText(/סכם 84\.5 · סף 92/)).toBeTruthy();
    expect(screen.getByText(/צריך להגיע לפחות לסכם 92/)).toBeTruthy();
  });

  it('renders a recoverable error state when the route request fails', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockRejectedValue(
      new Error('Unable to evaluate admissions right now.'),
    );

    render(
      <CalculatorResults
        degreeId="tau_cs"
        programs={programs}
        psychometric={700}
        bagrut={110}
        onBack={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByText('לא הצלחנו לחשב את התוצאות כרגע')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'נסו שוב' })).toBeTruthy();
  });
});

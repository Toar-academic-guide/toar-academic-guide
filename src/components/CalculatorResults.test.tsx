// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CalculatorResults from '@/components/CalculatorResults';
import { evaluateColmanBagrutResult } from '@/server/admissions/colmanBagrutEvaluation';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';

const hoistedMocks = vi.hoisted(() => ({
  fetchAdmissionsEvaluation: vi.fn(),
  fetchTauComputerScienceRoutes: vi.fn(),
  push: vi.fn(),
  user: null as { id: string } | null,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: hoistedMocks.push }) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: hoistedMocks.user }) }));

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

vi.mock('@/lib/admissionsRouteClient', () => ({
  AdmissionsRouteApiError: class AdmissionsRouteApiError extends Error {
    code: string;
    constructor(message: string, code = 'ADMISSIONS_ROUTE_REQUEST_FAILED') {
      super(message);
      this.code = code;
    }
  },
  fetchComputerScienceRoutes: hoistedMocks.fetchTauComputerScienceRoutes,
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

function route(id: string, durationWeeks: number, effortPoints: number) {
  return {
    id,
    actions: [
      {
        id,
        kind: id.startsWith('psychometric')
          ? ('psychometric' as const)
          : ('improve_grade' as const),
        ...(id.startsWith('psychometric')
          ? { from: 680, to: 700 }
          : { subjectId: 'history', fromGrade: 80, toGrade: 95 }),
      },
    ],
    afterProfile: { psychometric: 700, subjects: [] },
    estimate: {
      durationWeeks,
      effortPoints,
      estimateVersion: 'standard-estimates-test',
      owner: 'Toar admissions editorial',
      effectiveDate: '2026-07-20',
      eligibility: 'Test estimate.',
      rationale: 'Test estimate.',
    },
    verification: { eligible: true, margin: 1, score: 707, cutoff: 706 },
  };
}

describe('CalculatorResults', () => {
  it.each([
    [85, 'תנאי הציונים מתקיימים — נדרש מבדק פנימי'],
    [84.99, 'מתחת לתנאי מסלול הבגרות'],
  ])(
    'labels the Colman route for average %s and provides profile editing',
    async (average, label) => {
      const onCompleteAcademicProfile = vi.fn();
      const result = evaluateColmanBagrutResult({
        institution: { id: 'colman', name: 'מכללת ניהול – לימודים אקדמיים', region: 'center' },
        input: {
          degreeId: 'colmgmt_cs',
          extraInputs: {
            colmanBagrutAverage: average as number,
            colmanBagrutCertificateConfirmed: true,
            mathUnits: 5,
            mathGrade: 70,
          },
        },
      });
      hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(report([result]));
      render(
        <CalculatorResults
          degreeId="colmgmt_cs"
          programs={programs}
          onBack={vi.fn()}
          onCompleteAcademicProfile={onCompleteAcademicProfile}
        />,
      );
      expect(await screen.findByText(label)).toBeTruthy();
      if (average === 84.99) expect(screen.getByText(/מסלול בגרות 84.99/)).toBeTruthy();
      fireEvent.click(
        screen.getByRole('button', { name: 'עדכון נתוני מסלול הבגרות בפרופיל האקדמי' }),
      );
      expect(onCompleteAcademicProfile).toHaveBeenCalledOnce();
    },
  );
  it('sends an explicit Haifa track, clears partner confirmation when switching and labels the unverified option', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(report([]));
    render(
      <CalculatorResults
        degreeId="haifa_infosystems"
        programs={programs}
        psychometric={800}
        bagrut={120}
        onBack={() => {}}
      />,
    );
    const selector = screen.getByLabelText('מסלול מערכות מידע בחיפה');
    expect(selector).toHaveProperty('value', '');
    fireEvent.change(selector, { target: { value: 'computer_science' } });
    fireEvent.change(screen.getByLabelText('האם אתם עומדים בתנאי הקבלה של החוג השני?'), {
      target: { value: 'true' },
    });
    await waitFor(() =>
      expect(hoistedMocks.fetchAdmissionsEvaluation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          extraInputs: expect.objectContaining({
            haifaInformationSystemsTrack: 'computer_science',
            haifaInformationSystemsPartnerRequirementsConfirmed: true,
          }),
        }),
      ),
    );
    fireEvent.change(selector, { target: { value: 'mathematics' } });
    expect(screen.getByLabelText('האם אתם עומדים בתנאי הקבלה של החוג השני?')).toHaveProperty(
      'value',
      '',
    );
    await waitFor(() =>
      expect(hoistedMocks.fetchAdmissionsEvaluation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          extraInputs: expect.objectContaining({
            haifaInformationSystemsTrack: 'mathematics',
            haifaInformationSystemsPartnerRequirementsConfirmed: undefined,
          }),
        }),
      ),
    );
    fireEvent.change(selector, { target: { value: 'single_major' } });
    expect(await screen.findByText(/המיפוי של המסלול החד־חוגי הרגיל/)).toBeTruthy();
    expect(screen.queryByLabelText('האם אתם עומדים בתנאי הקבלה של החוג השני?')).toBeNull();
  });
  it('labels Technion Architecture eligibility as conditional on available places', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: { id: 'technion', name: 'הטכניון', region: 'north' },
          linkedInstitutionId: 'technion',
          capability: 'exact',
          kind: 'manual_gate',
          decision: 'eligible_to_apply',
          confidence: 'high',
          score: 97.5,
          threshold: 85,
          sourceLabel: 'עמידה בתנאים — על בסיס מקום פנוי',
          explanation: 'הקבלה תלויה במקום פנוי ובהחלטה הסופית של הטכניון.',
          nextAction: 'בדקו מקום פנוי עם הטכניון.',
        },
      ]),
    );
    render(
      <CalculatorResults
        degreeId="architecture"
        programs={programs}
        psychometric={730}
        bagrut={100}
        onBack={() => {}}
      />,
    );
    expect(await screen.findByText('עמידה בתנאים — בכפוף למקום פנוי')).toBeTruthy();
    expect(screen.queryByText('מתקבל/ת')).toBeNull();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    hoistedMocks.fetchAdmissionsEvaluation.mockReset();
    hoistedMocks.fetchTauComputerScienceRoutes.mockReset();
  });

  it('labels exact Management eligibility as eligible to apply, without asking for more data', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
          linkedInstitutionId: 'tau',
          capability: 'exact',
          kind: 'exact',
          decision: 'eligible_to_apply',
          confidence: 'high',
          score: 639,
          threshold: 610,
          sourceLabel: 'תנאי קבלה רשמיים לניהול',
          explanation: 'עומדים בתנאי אפיק PMA (PMA 835).',
          nextAction: 'בדקו את תנאי החוג השני.',
        },
      ]),
    );
    render(
      <CalculatorResults
        degreeId="tau_business"
        programs={programs}
        psychometric={605}
        bagrut={100}
        onBack={() => {}}
      />,
    );
    expect(await screen.findByLabelText('אוניברסיטת תל אביב: אפשר להגיש מועמדות')).toBeTruthy();
    expect(screen.queryByText('נדרשים נתונים')).toBeNull();
    expect(screen.queryByText('מתקבל/ת')).toBeNull();
  });

  it('renders a pending official verdict as waiting, not missing input', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
          linkedInstitutionId: 'tau',
          capability: 'exact',
          kind: 'exact',
          decision: 'pending',
          confidence: 'high',
          sourceLabel: 'טווח המתנה רשמי',
          explanation: 'הציון נמצא בטווח המתנה.',
          nextAction: 'המתינו לעדכון.',
          score: 700,
          threshold: 705,
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

    expect(await screen.findByText('בהמתנה לעדכון')).toBeTruthy();
    expect(screen.queryByText('נדרשים נתונים')).toBeNull();
  });

  it('withholds route cards until the structured Bagrut profile is complete', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
          linkedInstitutionId: 'tau',
          capability: 'exact',
          kind: 'exact',
          decision: 'below',
          confidence: 'high',
          sourceLabel: 'אימות רשמי',
          explanation: 'מתחת לסף',
          nextAction: 'השלימו נתונים',
          score: 690,
          threshold: 706,
        },
      ]),
    );

    render(
      <CalculatorResults
        degreeId="tau_cs"
        programs={programs}
        psychometric={680}
        bagrut={108}
        onBack={() => {}}
        onCompleteAcademicProfile={() => {}}
        academicScores={{
          psychometric: { overall: 680 },
          bagrut: { weightedAverage: 108 },
          admissions: { tauBagrutAverage: 108 },
        }}
      />,
    );

    expect(await screen.findByText('השלמת פרופיל אקדמי')).toBeTruthy();
    expect(hoistedMocks.fetchTauComputerScienceRoutes).not.toHaveBeenCalled();
  });

  it('withholds route cards until the official TAU Bagrut average is available', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
          linkedInstitutionId: 'tau',
          capability: 'exact',
          kind: 'exact',
          decision: 'below',
          confidence: 'high',
          sourceLabel: 'אימות רשמי',
          explanation: 'מתחת לסף',
          nextAction: 'השלימו נתונים',
          score: 690,
          threshold: 706,
        },
      ]),
    );

    render(
      <CalculatorResults
        degreeId="tau_cs"
        programs={programs}
        psychometric={680}
        bagrut={108}
        onBack={() => {}}
        onCompleteAcademicProfile={() => {}}
        academicScores={{
          psychometric: { overall: 680 },
          bagrut: {
            weightedAverage: 108,
            subjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [{ subjectId: 'mathematics', units: 5, grade: 80 }],
            },
          },
        }}
      />,
    );

    expect(await screen.findByText(/ממוצע הבגרות הרשמי של אוניברסיטת תל אביב/)).toBeTruthy();
    expect(hoistedMocks.fetchTauComputerScienceRoutes).not.toHaveBeenCalled();
  });

  it('requires the saved profile scores to match the calculation before requesting a route', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
          linkedInstitutionId: 'tau',
          capability: 'exact',
          kind: 'exact',
          decision: 'below',
          confidence: 'high',
          sourceLabel: 'אימות רשמי',
          explanation: 'מתחת לסף',
          nextAction: 'השלימו נתונים',
          score: 690,
          threshold: 706,
        },
      ]),
    );

    render(
      <CalculatorResults
        degreeId="tau_cs"
        programs={programs}
        psychometric={680}
        bagrut={108}
        onBack={() => {}}
        onCompleteAcademicProfile={() => {}}
        academicScores={{
          psychometric: { overall: 690 },
          admissions: { tauBagrutAverage: 108 },
          bagrut: {
            weightedAverage: 108,
            subjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [{ subjectId: 'mathematics', units: 5, grade: 80 }],
            },
          },
        }}
      />,
    );

    expect(
      await screen.findByText(/יש לעדכן את הפרופיל כך שיתאים לציונים שחושבו כאן/),
    ).toBeTruthy();
    expect(hoistedMocks.fetchTauComputerScienceRoutes).not.toHaveBeenCalled();
  });

  it('renders separate official fastest and lowest-effort route cards', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
          linkedInstitutionId: 'tau',
          capability: 'exact',
          kind: 'exact',
          decision: 'below',
          confidence: 'high',
          sourceLabel: 'אימות רשמי',
          explanation: 'מתחת לסף',
          nextAction: 'השלימו נתונים',
          score: 690,
          threshold: 706,
        },
      ]),
    );
    hoistedMocks.fetchTauComputerScienceRoutes.mockResolvedValue({
      status: 'complete',
      fastest: route('psychometric_680_700', 10, 5),
      lowestEffort: route('grade_history_80_95', 12, 3),
    });

    render(
      <CalculatorResults
        degreeId="tau_cs"
        programs={programs}
        psychometric={680}
        bagrut={108}
        onBack={() => {}}
        academicScores={{
          psychometric: { overall: 680 },
          admissions: { tauBagrutAverage: 108 },
          bagrut: {
            weightedAverage: 108,
            subjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [
                { subjectId: 'mathematics', units: 5, grade: 80 },
                { subjectId: 'physics', units: 5, grade: 80 },
              ],
            },
          },
        }}
      />,
    );

    expect(await screen.findByText(/בלי שם, דוא״ל או מזהה משתמש/)).toBeTruthy();
    expect(hoistedMocks.fetchTauComputerScienceRoutes).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'בדיקת מסלולים מאומתים' }));
    expect(await screen.findByText('המהיר ביותר')).toBeTruthy();
    expect(screen.getByText('הכי מעט מאמץ')).toBeTruthy();
    expect(screen.getByText(/לשפר פסיכומטרי מ-680 ל-700/)).toBeTruthy();
  });

  it('requests and renders verified BGU route winners from a complete profile', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: { id: 'bgu', name: 'אוניברסיטת בן־גוריון', region: 'south' },
          linkedInstitutionId: 'bgu',
          capability: 'exact',
          kind: 'exact',
          decision: 'below',
          confidence: 'high',
          sourceLabel: 'אימות רשמי',
          explanation: 'מתחת לסף',
          nextAction: 'בדקו מסלול שיפור',
          score: 636,
          threshold: 681,
        },
      ]),
    );
    hoistedMocks.fetchTauComputerScienceRoutes.mockResolvedValue({
      status: 'complete',
      fastest: route('grade_history_80_95', 12, 3),
      lowestEffort: route('grade_history_80_95', 12, 3),
    });

    render(
      <CalculatorResults
        degreeId="bgu_cs"
        programs={programs}
        psychometric={610}
        bagrut={105}
        onBack={() => {}}
        academicScores={{
          psychometric: { overall: 610, quantitative: 125, verbal: 110, english: 115 },
          admissions: {
            bguBagrutAverage: 105,
            bguLanguageRequirementsConfirmed: true,
          },
          bagrut: {
            weightedAverage: 105,
            subjectRecord: {
              schemaVersion: 2,
              sector: 'jewish',
              certificateType: 'internal',
              complete: true,
              subjects: [
                {
                  subjectId: 'mathematics',
                  units: 4,
                  grade: 90,
                  assessmentKind: 'exam',
                },
              ],
            },
          },
        }}
      />,
    );

    expect(await screen.findByText(/להתקבל למדעי המחשב בבן־גוריון/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'בדיקת מסלולים מאומתים' }));
    expect(await screen.findByText('המהיר ביותר')).toBeTruthy();
    expect(hoistedMocks.fetchTauComputerScienceRoutes).toHaveBeenCalledWith(
      'bgu_cs',
      expect.any(Object),
    );
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

  it('renders an unproved formula pair as unavailable without an admission verdict', async () => {
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
          capability: 'authority_unavailable',
          kind: 'authority_unavailable',
          decision: 'unknown',
          confidence: 'low',
          sourceLabel: 'האימות הרשמי טרם הושלם',
          explanation: 'עדיין אין למסלול זה שתי דוגמאות גבול והשוואה חיה מול המקור הרשמי.',
          nextAction: 'בדקו בינתיים ישירות במחשבון הרשמי של המוסד.',
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

    expect(await screen.findByLabelText('אוניברסיטת תל אביב: האימות טרם הושלם')).toBeTruthy();
    expect(screen.queryByText('מתקבל/ת')).toBeNull();
    expect(screen.queryByText('מתחת לסף')).toBeNull();
  });

  it('sends saved psychometric subscores and structured Bagrut subjects to the evaluator', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(report([]));

    render(
      <CalculatorResults
        degreeId="haifa_cs"
        programs={programs}
        psychometric={700}
        bagrut={110}
        onBack={() => {}}
        academicScores={{
          psychometric: { overall: 700, quantitative: 125, verbal: 120, english: 118 },
          bagrut: {
            weightedAverage: 110,
            subjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [
                { subjectId: 'mathematics', units: 5, grade: 93 },
                { subjectId: 'english', units: 5, grade: 90 },
              ],
            },
          },
        }}
      />,
    );

    await waitFor(() =>
      expect(hoistedMocks.fetchAdmissionsEvaluation).toHaveBeenCalledWith({
        degreeId: 'haifa_cs',
        psychometric: 700,
        bagrut: 110,
        extraInputs: {
          psychometricMath: 125,
          psychometricVerbal: 120,
          psychometricEnglish: 118,
          bagrutProfileSchemaVersion: 1,
          bagrutSector: 'jewish',
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [
              { subjectId: 'mathematics', units: 5, grade: 93 },
              { subjectId: 'english', units: 5, grade: 90 },
            ],
          },
          mathUnits: 5,
          mathGrade: 93,
          englishUnits: 5,
          englishGrade: 90,
        },
      }),
    );
  });

  it('does not combine structured profile details with a different manual calculation', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(report([]));

    render(
      <CalculatorResults
        degreeId="haifa_cs"
        programs={programs}
        psychometric={680}
        bagrut={108}
        onBack={() => {}}
        academicScores={{
          psychometric: { overall: 700, quantitative: 125, verbal: 120, english: 118 },
          bagrut: { weightedAverage: 110 },
        }}
      />,
    );

    await waitFor(() =>
      expect(hoistedMocks.fetchAdmissionsEvaluation).toHaveBeenCalledWith({
        degreeId: 'haifa_cs',
        psychometric: 680,
        bagrut: 108,
      }),
    );
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

  it('summarizes institution-specific inputs as official averages or confirmed requirements', async () => {
    hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(
      report([
        {
          institution: { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
          linkedInstitutionId: 'tau',
          capability: 'needs_input',
          kind: 'needs_input',
          decision: 'unknown',
          confidence: 'low',
          sourceLabel: 'נדרשים נתונים נוספים',
          explanation: 'חסרים ממוצע רשמי ואישור תנאי קבלה.',
          nextAction: 'עדכנו את הנתונים.',
          requiredInputs: ['tau_bagrut_average', 'tau_application_requirements'],
        },
        {
          institution: { id: 'bgu', name: 'אוניברסיטת בן־גוריון', region: 'south' },
          linkedInstitutionId: 'bgu',
          capability: 'needs_input',
          kind: 'needs_input',
          decision: 'unknown',
          confidence: 'low',
          sourceLabel: 'נדרשים נתונים נוספים',
          explanation: 'חסר ציון סיווג במתמטיקה.',
          nextAction: 'עדכנו את הנתון.',
          requiredInputs: ['tau_math_placement_score'],
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

    expect(await screen.findByLabelText('אוניברסיטת תל אביב: נדרשים נתונים')).toBeTruthy();
    expect(screen.getByText(/נדרשים ממוצעים רשמיים או אישור תנאי קבלה/)).toBeTruthy();
    expect(screen.getByText(/נדרש ציון סיווג במתמטיקה/)).toBeTruthy();
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

it('forwards degree-route profile inputs when optional generic scores are omitted', async () => {
  hoistedMocks.fetchAdmissionsEvaluation.mockResolvedValue(report([]));
  const admissions = {
    bguOccupationalTherapyRoute: 'academic' as const,
    bguOccupationalTherapyRequirementsConfirmed: true,
    bguBachelorsDegreeCompleted: true,
    bguBachelorsDegreeAverage: 85.25,
    bguPhysiotherapyRequirementsConfirmed: false,
  };
  render(
    <CalculatorResults
      degreeId="occupational_therapy"
      programs={programs}
      onBack={() => {}}
      academicScores={{
        psychometric: { overall: 700 },
        bagrut: { weightedAverage: 100 },
        admissions,
      }}
    />,
  );
  await waitFor(() =>
    expect(hoistedMocks.fetchAdmissionsEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        degreeId: 'occupational_therapy',
        psychometric: undefined,
        bagrut: undefined,
        extraInputs: expect.objectContaining(admissions),
      }),
    ),
  );
});

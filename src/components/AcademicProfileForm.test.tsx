// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AcademicProfileForm from '@/components/AcademicProfileForm';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/components/BagrutCalculatorWizard', () => ({
  default: ({ onComplete }: { onComplete: (avg: number) => void }) => (
    <button type="button" onClick={() => onComplete(91.4)}>
      חשב אומדן
    </button>
  ),
}));

describe('AcademicProfileForm', () => {
  it('shares preparatory facts across BGU sections and saves the latest edit or clearing', async () => {
    const onComplete = vi.fn();
    const bguEngineering = {
      detailsConfirmed: false,
      industrialPreparatoryAverage: 91.25,
      physicsCoursePassed: false,
    };
    const props = {
      onComplete,
      onSkip: vi.fn(),
      onClearLocalProfileData: vi.fn().mockResolvedValue(undefined),
    };
    const view = render(
      <AcademicProfileForm
        {...props}
        initialScores={{
          admissions: {
            bguEngineering,
            bguPsychologyRoute: 'bagrut',
            bguPsychologyRequirementsConfirmed: false,
            bguQuantitativeRoute: 'bagrut',
            bguPriorAcademicStudies: false,
            bguPreparatoryTrack: 'natural_life_sciences',
            bguPreparatoryAverage: 94.25,
            bguPreparatoryCompleted: true,
          },
        }}
      />,
    );
    const quantitativeAverage = () => screen.getByLabelText('ממוצע מכינה מוכרת בבן־גוריון');
    const psychologyAverage = () => screen.getByLabelText('ממוצע מכינה מוכרת לפסיכולוגיה (0–100)');
    const socialAverage = () => screen.getByLabelText('ממוצע מכינה מוכרת למדעי החברה (0–100)');
    expect(quantitativeAverage()).toHaveProperty('value', '94.25');
    expect(psychologyAverage()).toHaveProperty('value', '94.25');
    expect(socialAverage()).toHaveProperty('value', '94.25');
    fireEvent.change(quantitativeAverage(), { target: { value: '87.25' } });
    expect(psychologyAverage()).toHaveProperty('value', '87.25');
    expect(socialAverage()).toHaveProperty('value', '87.25');
    fireEvent.change(socialAverage(), { target: { value: '0' } });
    expect(psychologyAverage()).toHaveProperty('value', '0');
    expect(quantitativeAverage()).toHaveProperty('value', '0');
    fireEvent.change(screen.getByLabelText('האם המכינה לפסיכולוגיה הושלמה?'), {
      target: { value: 'false' },
    });
    expect(screen.getByLabelText('האם המכינה המוכרת בבן־גוריון הושלמה?')).toHaveProperty(
      'value',
      'false',
    );
    fireEvent.change(screen.getByLabelText('מכינה מוכרת של בן־גוריון'), {
      target: { value: 'precise_sciences_engineering' },
    });
    expect(screen.getByLabelText('מכינה מוכרת של בן־גוריון לפסיכולוגיה')).toHaveProperty(
      'value',
      'precise_sciences_engineering',
    );
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const saved = onComplete.mock.calls[0][0];
    expect(saved.admissions).toEqual({
      bguEngineering,
      bguPsychologyRoute: 'bagrut',
      bguPsychologyRequirementsConfirmed: false,
      bguQuantitativeRoute: 'bagrut',
      bguPriorAcademicStudies: false,
      bguPreparatoryTrack: 'precise_sciences_engineering',
      bguPreparatoryAverage: 0,
      bguPreparatoryCompleted: false,
    });
    view.unmount();
    render(<AcademicProfileForm {...props} initialScores={saved} />);
    expect(psychologyAverage()).toHaveProperty('value', '0');
    fireEvent.change(psychologyAverage(), { target: { value: '' } });
    expect(quantitativeAverage()).toHaveProperty('value', '');
    expect(socialAverage()).toHaveProperty('value', '');
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
    expect(onComplete.mock.calls[1][0].admissions).not.toHaveProperty('bguPreparatoryAverage');
    expect(onComplete.mock.calls[1][0].admissions.bguPreparatoryCompleted).toBe(false);
    expect(onComplete.mock.calls[1][0].admissions.bguEngineering).toEqual(bguEngineering);
  });
  it('saves and reopens recognized preparatory route details without generic scores', async () => {
    const onComplete = vi.fn();
    const props = {
      onComplete,
      onSkip: vi.fn(),
      onClearLocalProfileData: vi.fn().mockResolvedValue(undefined),
    };
    const view = render(<AcademicProfileForm {...props} />);
    fireEvent.change(screen.getByLabelText('אפיק לבדיקה בבן־גוריון'), {
      target: { value: 'bagrut' },
    });
    fireEvent.change(screen.getByLabelText('מכינה מוכרת של בן־גוריון'), {
      target: { value: 'natural_life_sciences' },
    });
    fireEvent.change(screen.getByLabelText('ממוצע מכינה מוכרת בבן־גוריון'), {
      target: { value: '87.25' },
    });
    fireEvent.change(screen.getByLabelText('האם המכינה המוכרת בבן־גוריון הושלמה?'), {
      target: { value: 'true' },
    });
    fireEvent.change(screen.getByLabelText('האם יש לימודים אקדמיים קודמים?'), {
      target: { value: 'false' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const saved = onComplete.mock.calls[0][0];
    expect(saved).toEqual({
      admissions: {
        bguQuantitativeRoute: 'bagrut',
        bguPreparatoryTrack: 'natural_life_sciences',
        bguPreparatoryAverage: 87.25,
        bguPreparatoryCompleted: true,
        bguPriorAcademicStudies: false,
      },
    });
    view.unmount();
    render(<AcademicProfileForm {...props} initialScores={saved} />);
    expect((screen.getByLabelText('ממוצע מכינה מוכרת בבן־גוריון') as HTMLInputElement).value).toBe(
      '87.25',
    );
    expect(
      (screen.getByLabelText('האם יש לימודים אקדמיים קודמים?') as HTMLSelectElement).value,
    ).toBe('false');
  });
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders pre-populated file names from initialDocuments', () => {
    const initialDocuments = [
      {
        id: '1',
        kind: 'psychometric' as const,
        displayName: 'תדפיס פסיכומטרי',
        sizeBytes: 153600, // 150 KB
      },
      {
        id: '2',
        kind: 'bagrut' as const,
        displayName: 'גיליון ציוני בגרות',
        sizeBytes: 204800, // 200 KB
      },
    ];

    render(
      <AcademicProfileForm
        onComplete={vi.fn()}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
        initialDocuments={initialDocuments}
      />,
    );

    expect(screen.getByText('תדפיס פסיכומטרי')).toBeTruthy();
    expect(screen.getByText('(150 KB)')).toBeTruthy();
    expect(screen.getByText('גיליון ציוני בגרות')).toBeTruthy();
    expect(screen.getByText('(200 KB)')).toBeTruthy();
  });

  it('does not save the wizard estimate as the official weighted average automatically', () => {
    const onComplete = vi.fn();

    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'חשב אומדן' }));
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    return waitFor(() => expect(onComplete).toHaveBeenCalledWith({}));
  });

  it('saves a weighted average only after the user copies or enters it explicitly', () => {
    const onComplete = vi.fn();

    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'חשב אומדן' }));
    fireEvent.click(screen.getByRole('button', { name: 'העתק לשדה' }));
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    return waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        bagrut: { weightedAverage: 91.4 },
      }),
    );
  });

  it('requires a structured Bagrut record before continuing an admission-alert setup', async () => {
    const onComplete = vi.fn();

    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
        initialScores={{
          psychometric: { overall: 650 },
          bagrut: { weightedAverage: 102 },
        }}
        alertContinuation={{
          title: 'המשך למעקב',
          submitLabel: 'שמור והמשך לבדיקת המעקב ←',
          requiresStructuredBagrut: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לבדיקת המעקב ←' }));

    expect(
      await screen.findByText('כדי להפעיל מעקב צריך להשלים את מקצועות הבגרות והיחידות שלך.'),
    ).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('keeps Management route confirmations separate from CS and preserves false and zero when saved', async () => {
    const onComplete = vi.fn();
    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onSkip={vi.fn()}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        initialScores={{
          admissions: {
            tauManagementRequirementsConfirmed: true,
            tauManagementAcademicRouteConfirmed: false,
            tauManagementQualifyingMoocCount: 0,
            tauManagementNoPsychometricMoocsConfirmed: false,
          },
        }}
      />,
    );
    expect(screen.getByLabelText('אישור תנאי הגשה לניהול בתל אביב')).toHaveProperty(
      'value',
      'true',
    );
    expect(screen.getByLabelText('אישור תנאי הגשה לתל אביב')).toHaveProperty('value', '');
    expect(screen.getByLabelText('מספר קורסי הבונוס לניהול בציון 85 ומעלה')).toHaveProperty(
      'value',
      '0',
    );
    fireEvent.change(screen.getByLabelText('שני הקורסים לאפיק ללא פסיכומטרי'), {
      target: { value: 'true' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        admissions: {
          tauManagementRequirementsConfirmed: true,
          tauManagementAcademicRouteConfirmed: false,
          tauManagementQualifyingMoocCount: 0,
          tauManagementNoPsychometricMoocsConfirmed: true,
        },
      }),
    );
  });

  it('hydrates and saves only defined admissions inputs, preserving false and zero', async () => {
    const onComplete = vi.fn();

    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
        initialScores={{
          admissions: {
            tauBagrutAverage: 112.5,
            tauApplicationRequirementsConfirmed: false,
            tauMathPlacementScore: 0,
          },
        }}
      />,
    );

    expect(screen.getByDisplayValue('112.5')).toBeTruthy();
    expect(screen.getByDisplayValue('0')).toBeTruthy();
    expect(screen.getByLabelText('אישור תנאי הגשה לתל אביב')).toHaveProperty('value', 'false');
    expect(screen.getByLabelText('אישור דרישות שפה בבן־גוריון')).toHaveProperty('value', '');
    expect(
      screen.getByRole('link', { name: 'מחשבון ממוצע בגרות של אוניברסיטת תל אביב' }),
    ).toHaveProperty('href', 'https://www.ims.tau.ac.il/md/ut/bagrut.aspx');

    fireEvent.change(screen.getByLabelText('ממוצע בגרות או הנדסאי מוכר של בן־גוריון (50–130)'), {
      target: { value: '108.25' },
    });
    fireEvent.change(screen.getByLabelText('אישור דרישות שפה בבן־גוריון'), {
      target: { value: 'false' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        admissions: {
          tauBagrutAverage: 112.5,
          bguBagrutAverage: 108.25,
          tauApplicationRequirementsConfirmed: false,
          bguLanguageRequirementsConfirmed: false,
          tauMathPlacementScore: 0,
        },
      }),
    );
  });

  it('restores, edits and saves engineering qualification fields without losing false confirmations', async () => {
    const onComplete = vi.fn();
    const bguEngineering = {
      detailsConfirmed: true,
      route: 'engineering_score' as const,
      physicsCoursePassed: false,
      preparatoryInstitution: 'bgu' as const,
      preparatoryCompletionYear: 2026,
      preparatoryMathUnits: 5 as const,
      preparatoryMathGrade: 95,
      preparatoryPhysicsUnits: 5 as const,
      preparatoryPhysicsGrade: 90,
      industrialPreparatoryAverage: 91.25,
      diplomaRecognized: true,
      diplomaMathHours: 90,
      diplomaMathGrade: 95,
      diplomaPhysicsHours: 90,
      diplomaPhysicsGrade: 80,
    };
    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
        initialScores={{ admissions: { bguEngineering } }}
      />,
    );
    expect(screen.getByLabelText('השלמת קורס פיזיקה מוכר בבן־גוריון')).toHaveProperty(
      'value',
      'false',
    );
    expect(screen.getByLabelText('כל נתוני ההנדסה הרלוונטיים הוזנו')).toHaveProperty(
      'checked',
      true,
    );
    fireEvent.change(screen.getByLabelText('ציון מתמטיקה במכינה'), { target: { value: '96' } });
    fireEvent.change(screen.getByLabelText('תעודת הנדסאי מוסמך מוכרת בבן־גוריון'), {
      target: { value: 'false' },
    });
    fireEvent.change(screen.getByLabelText('השלמת קורס פיזיקה מוכר בבן־גוריון'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
    const { physicsCoursePassed: omitted, ...remaining } = bguEngineering;
    void omitted;
    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        admissions: {
          bguEngineering: {
            ...remaining,
            preparatoryMathGrade: 96,
            diplomaRecognized: false,
          },
        },
      }),
    );
  });

  it('restores and saves Architecture decimals, zero and false without replacing the generic average', async () => {
    const onComplete = vi.fn();
    const admissions = {
      technionArchitectureBagrutAverage: 101.9,
      technionArchitectureExamScore: 0,
      technionArchitectureExamPassed: false,
      technionArchitectureRequirementsConfirmed: true,
    };
    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onSkip={vi.fn()}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        initialScores={{ bagrut: { weightedAverage: 100 }, admissions }}
      />,
    );
    expect(screen.getByLabelText('ממוצע בגרות רשמי לארכיטקטורה בטכניון (עד 119)')).toHaveProperty(
      'value',
      '101.9',
    );
    expect(screen.getByLabelText('ציון בחינת כניסה לארכיטקטורה בטכניון (0–140)')).toHaveProperty(
      'value',
      '0',
    );
    expect(screen.getByLabelText('תוצאה רשמית של בחינת הכניסה לארכיטקטורה')).toHaveProperty(
      'value',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({ bagrut: { weightedAverage: 100 }, admissions }),
    );
  });

  it('triggers POST requests for newly selected files on save', async () => {
    const onComplete = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'new-id' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
      />,
    );

    const file = new File(['hello'], 'test_psy.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('העלאת תדפיס פסיכומטרי');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('test_psy.pdf')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('למשל: 650'), { target: { value: '710' } });
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    expect(
      screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByLabelText('אישור תנאי הגשה לתל אביב').hasAttribute('disabled')).toBe(true);

    await waitFor(() => expect(onComplete).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/documents');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('kind')).toBe('psychometric');
    expect(init.body.get('file')).toBeInstanceOf(File);
    expect(init.body.get('file').name).toBe('test_psy.pdf');
  });

  it('triggers DELETE requests for removed initial documents on save', async () => {
    const onComplete = vi.fn();
    const initialDocuments = [
      {
        id: '1',
        kind: 'psychometric' as const,
        displayName: 'תדפיס פסיכומטרי',
        sizeBytes: 153600,
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { success: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
        initialDocuments={initialDocuments}
      />,
    );

    expect(screen.getByText('תדפיס פסיכומטרי')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'הסר קובץ' }));

    expect(screen.queryByText('תדפיס פסיכומטרי')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/documents?kind=psychometric');
    expect(init.method).toBe('DELETE');
  });

  it('renders error message in Hebrew on upload failure', async () => {
    const onComplete = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { code: 'FILE_TOO_LARGE', message: 'קובץ גדול מדי' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
      />,
    );

    const file = new File(['hello'], 'large.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('העלאת תדפיס פסיכומטרי');
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    await waitFor(() => {
      expect(screen.getByText('קובץ גדול מדי')).toBeTruthy();
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }).hasAttribute('disabled'),
    ).toBe(false);
  });

  it('clears signed-out local form state through the device-data control', async () => {
    const onClearLocalProfileData = vi.fn().mockResolvedValue(undefined);

    render(
      <AcademicProfileForm
        onComplete={vi.fn()}
        onClearLocalProfileData={onClearLocalProfileData}
        onSkip={vi.fn()}
        initialScores={{
          psychometric: { overall: 700 },
          bagrut: { weightedAverage: 105 },
          admissions: {
            tauBagrutAverage: 112.5,
            tauApplicationRequirementsConfirmed: false,
            tauMathPlacementScore: 0,
          },
        }}
      />,
    );

    expect(screen.getByDisplayValue('700')).toBeTruthy();
    expect(screen.getByDisplayValue('105')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'נקה נתונים מהמכשיר הזה' }));

    await waitFor(() => expect(onClearLocalProfileData).toHaveBeenCalled());
    expect(screen.queryByDisplayValue('700')).toBeNull();
    expect(screen.queryByDisplayValue('105')).toBeNull();
    expect(screen.queryByDisplayValue('112.5')).toBeNull();
    expect(screen.queryByDisplayValue('0')).toBeNull();
    expect(screen.getByLabelText('אישור תנאי הגשה לתל אביב')).toHaveProperty('value', '');
  });

  it('shows signed-in copy that the clear action does not delete account data', () => {
    render(
      <AcademicProfileForm
        onComplete={vi.fn()}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
        isAuthenticated={true}
      />,
    );

    expect(
      screen.getByText(
        'הפעולה הזאת מוחקת רק נתונים שנשמרו בדפדפן במכשיר הזה. נתוני החשבון, רשימת הייעוד והמסמכים שנשמרו בחשבון לא יימחקו כאן.',
      ),
    ).toBeTruthy();
  });
});

it('restores and saves Psychology prep decimals and false values without generic scores', async () => {
  const admissions = {
    bguPsychologyRoute: 'bagrut' as const,
    bguPsychologyRequirementsConfirmed: false,
    bguPreparatoryTrack: 'natural_life_sciences' as const,
    bguPreparatoryAverage: 94.25,
    bguPreparatoryCompleted: false,
  };
  const onComplete = vi.fn();
  render(
    <AcademicProfileForm
      onComplete={onComplete}
      onClearLocalProfileData={vi.fn()}
      onSkip={vi.fn()}
      initialScores={{ admissions }}
    />,
  );
  expect(screen.getByLabelText('ממוצע מכינה מוכרת לפסיכולוגיה (0–100)')).toHaveProperty(
    'value',
    '94.25',
  );
  expect(screen.getByLabelText('האם המכינה לפסיכולוגיה הושלמה?')).toHaveProperty('value', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ admissions }));
});

it('restores and saves social science details and shares the same prep values', async () => {
  const admissions = {
    bguSocialScienceRoute: 'bagrut' as const,
    bguSocialScienceRequirementsConfirmed: false,
    bguSocialScienceLanguageConfirmed: true,
    bguReturningFromStudyBreak: false,
    bguSocialWorkAcademicBackground: 'social_work' as const,
    bguSocialWorkAcademicAverage: 85.25,
    bguSocialWorkTranscriptProvided: false,
    bguApplicantAge: 45,
    bguPreparatoryAverage: 90.25,
    bguPreparatoryTrack: 'natural_life_sciences' as const,
    bguPreparatoryCompleted: false,
  };
  const onComplete = vi.fn();
  render(
    <AcademicProfileForm
      onComplete={onComplete}
      onClearLocalProfileData={vi.fn()}
      onSkip={vi.fn()}
      initialScores={{ admissions }}
    />,
  );
  expect(screen.getByLabelText('ממוצע לימודים קודמים בעבודה סוציאלית (0–100)')).toHaveProperty(
    'value',
    '85.25',
  );
  fireEvent.change(screen.getByLabelText('ממוצע מכינה מוכרת למדעי החברה (0–100)'), {
    target: { value: '90.75' },
  });
  expect(screen.getByLabelText('ממוצע מכינה מוכרת לפסיכולוגיה (0–100)')).toHaveProperty(
    'value',
    '90.75',
  );
  fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
  await waitFor(() =>
    expect(onComplete).toHaveBeenCalledWith({
      admissions: { ...admissions, bguPreparatoryAverage: 90.75 },
    }),
  );
});

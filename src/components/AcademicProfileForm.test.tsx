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
  it('asks the student to correct an invalid Haifa year before saving a device draft', async () => {
    const onComplete = vi.fn();
    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('שנת הזכאות לבגרות או השיפור האחרון בחיפה'), {
      target: { value: '2015.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
    expect(onComplete).not.toHaveBeenCalled();
    expect(await screen.findByText(/בדקו את נתוני חיפה/)).toBeTruthy();
  });
  it('loads and saves Haifa decimal average and actual years without generic scores', async () => {
    const onComplete = vi.fn();
    const admissions = {
      haifaBagrutAverage: 102.25,
      haifaBagrutYear: 2015,
      haifaPsychometricYear: 2026,
    };
    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
        initialScores={{ admissions }}
      />,
    );
    expect(screen.getByLabelText('ממוצע בגרות רשמי של אוניברסיטת חיפה (50–130)')).toHaveProperty(
      'value',
      '102.25',
    );
    fireEvent.change(screen.getByLabelText('שנת הזכאות לבגרות או השיפור האחרון בחיפה'), {
      target: { value: '2020' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        admissions: { ...admissions, haifaBagrutYear: 2020 },
      }),
    );
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

  it('collects, saves and restores programme-specific Haifa facts without assuming missing answers', async () => {
    const onComplete = vi.fn();
    const admissions = {
      haifaAdmissionQualification: 'full_bagrut' as const,
      haifaEnglishLevel: 'advanced_a' as const,
      haifaHebrewQualification: 'university_exam' as const,
      haifaHebrewScore: 120,
      haifaHebrewExamDate: '2026-04-01',
      haifaPsychometricMonth: 4,
      haifaScienceUnits: 8,
      haifaOtFailedSelectionAttempts: 0,
      haifaOtUnjustifiedAbsence: false,
    };
    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onClearLocalProfileData={vi.fn().mockResolvedValue(undefined)}
        onSkip={vi.fn()}
        initialScores={{ admissions }}
      />,
    );
    expect(screen.getByLabelText('תעודת הקבלה לאוניברסיטת חיפה')).toHaveProperty(
      'value',
      'full_bagrut',
    );
    expect(screen.getByLabelText('תאריך מבחן העברית בחיפה')).toHaveProperty('value', '2026-04-01');
    fireEvent.change(screen.getByLabelText('מספר היחידות המדעיות לסיעוד בחיפה'), {
      target: { value: '9' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));
    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        admissions: { ...admissions, haifaScienceUnits: 9 },
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
            haifaBagrutAverage: 102.25,
            haifaBagrutYear: 2015,
            haifaPsychometricYear: 2026,
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

    fireEvent.change(screen.getByLabelText('ממוצע בגרות רשמי של בן־גוריון (50–130)'), {
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
          haifaBagrutAverage: 102.25,
          haifaBagrutYear: 2015,
          haifaPsychometricYear: 2026,
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
            haifaBagrutAverage: 102.25,
            haifaBagrutYear: 2015,
            haifaPsychometricYear: 2026,
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
    expect(screen.queryByDisplayValue('102.25')).toBeNull();
    expect(screen.queryByDisplayValue('2015')).toBeNull();
    expect(screen.queryByDisplayValue('2026')).toBeNull();
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

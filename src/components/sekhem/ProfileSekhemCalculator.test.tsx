// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ProfileSekhemCalculator from './ProfileSekhemCalculator';

const { user } = vi.hoisted(() => ({ user: { id: 'synthetic-profile' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user, loading: false }) }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

it('saves a partial signed-in profile only on explicit update and retains edits after a failed PUT', async () => {
  const original = {
    geographicPreference: 'north',
    savedProgramIds: ['tau_cs'],
    academicScores: {
      bagrut: { weightedAverage: 106.5 },
      admissions: { activeBagrutPath: 'quick' },
      psychometric: { overall: 650, english: 110 },
    },
  };
  const puts: (typeof original)[] = [];
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    expect(url).toBe('/api/profile');
    if (init?.method !== 'PUT') return Response.json({ data: original });
    const { profile } = JSON.parse(String(init.body));
    puts.push(profile);
    return puts.length === 1
      ? Response.json({}, { status: 503 })
      : Response.json({ data: profile });
  });
  try {
    render(
      <ProfileSekhemCalculator
        initialProgramId="tau_cs"
        offerings={[
          {
            programId: 'tau_cs',
            programName: 'מדעי המחשב',
            institutionId: 'tau',
            institutionName: 'תל אביב',
          },
        ]}
      />,
    );
    const score = await screen.findByDisplayValue('650');
    expect(screen.getByLabelText('ציון 1')).toHaveProperty('value', '');
    expect(screen.queryByRole('button', { name: 'עדכון הפרופיל' })).toBeNull();
    fireEvent.change(score, { target: { value: '700' } });
    expect(puts).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'עדכון הפרופיל' }));
    await screen.findByText('שמירת הציונים נכשלה. נסו שוב.');
    expect(score).toHaveProperty('value', '700');
    fireEvent.click(screen.getByRole('button', { name: 'עדכון הפרופיל' }));
    await screen.findByText('הציונים נשמרו בפרופיל.');
    expect(puts).toHaveLength(2);
    expect(puts[1]).toEqual({
      ...original,
      academicScores: { ...original.academicScores, psychometric: { overall: 700, english: 110 } },
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'עדכון הפרופיל' })).toBeNull());
  } finally {
    fetcher.mockRestore();
  }
});

// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdmissionAlertManager from './AdmissionAlertManager';

afterEach(() => vi.unstubAllGlobals());
const alert = {
  id: 'test-alert',
  institutionId: 'bgu',
  programId: 'bgu_cs',
  cycle: '2026',
  status: 'active',
};
const response = (data: unknown) => ({ ok: true, json: async () => data });
describe('account alert controls', () => {
  it('cancels an owned alert and reloads its persisted status', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ data: [alert] }))
      .mockResolvedValueOnce(response({ data: { status: 'cancelled', mayStillArrive: true } }))
      .mockResolvedValueOnce(response({ data: [{ ...alert, status: 'cancelled' }] }));
    vi.stubGlobal('fetch', fetch);
    render(<AdmissionAlertManager userId="user-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'ביטול המעקב' }));
    expect(
      await screen.findByText('המעקב בוטל. הודעה שכבר נמצאת בשליחה עדיין עשויה להגיע.'),
    ).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'ביטול המעקב' })).toBeNull());
    expect(fetch).toHaveBeenCalledWith('/api/admission-alerts/test-alert', { method: 'DELETE' });
    expect(screen.getByText(/מחזור 2026 · המעקב בוטל/)).toBeTruthy();
  });
  it('shows paused BGU continuation and no new-send action for uncertain acceptance', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          data: [
            { ...alert, status: 'needs_profile_refresh' },
            {
              ...alert,
              id: 'uncertain',
              status: 'pending_delivery',
              deliveryStatus: 'acceptance_unknown',
            },
          ],
          supportEmail: 'support@example.org',
        }),
      ),
    );
    render(<AdmissionAlertManager userId="user-1" />);
    const continuation = await screen.findByRole('link', { name: /לבדיקת הפרופיל/ });
    expect(continuation.getAttribute('href')).toContain('bgu_cs');
    const uncertain = screen.getByText(/לא ידוע אם הספק קיבל/).closest('li')!;
    expect(within(uncertain).queryByRole('button', { name: /ניסיון נוסף/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'פנייה לתמיכה' }).getAttribute('href')).toBe(
      'mailto:support@example.org',
    );
  });
  it('allows a failed read to be retried without claiming there are no subscriptions', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error())
        .mockResolvedValueOnce(response({ data: [alert] })),
    );
    render(<AdmissionAlertManager userId="user-1" />);
    expect(await screen.findByText('לא הצלחנו לטעון את ההתראות. אפשר לנסות שוב.')).toBeTruthy();
    expect(screen.queryByText(/אין עדיין התראות/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'רענון ההתראות' }));
    expect(await screen.findByRole('button', { name: 'ביטול המעקב' })).toBeTruthy();
  });
});

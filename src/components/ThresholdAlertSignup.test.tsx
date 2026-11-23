// @vitest-environment jsdom
import { THRESHOLD_ALERT_CONSENT, THRESHOLD_ALERT_COPY } from '@/lib/thresholdAlerts';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ThresholdAlertSignup from './ThresholdAlertSignup';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture } }));
vi.mock('@/lib/sessionAttribution', () => ({ getSessionAttribution: () => ({}) }));

describe('threshold alert signup form', () => {
  it('asks for a target and consent before storing anything', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ThresholdAlertSignup />);
    fireEvent.click(screen.getByRole('button', { name: THRESHOLD_ALERT_COPY.submit }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      THRESHOLD_ALERT_COPY.targetError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(THRESHOLD_ALERT_CONSENT)).toBeTruthy();
    expect(screen.queryByText(/חברת הכנה/)).toBeNull();
  });

  it('posts the selected institution and email without a phone', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { received: true } }, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('crypto', { randomUUID: () => 'b783a6d4-0428-4ddd-827f-82d33251be52' });
    render(<ThresholdAlertSignup initialInstitutions={['technion']} />);
    expect((screen.getByRole('checkbox', { name: 'הטכניון' }) as HTMLInputElement).checked).toBe(
      true,
    );
    fireEvent.change(screen.getByLabelText(THRESHOLD_ALERT_COPY.emailLabel), {
      target: { value: 'student@example.com' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: THRESHOLD_ALERT_CONSENT }));
    fireEvent.click(screen.getByRole('button', { name: THRESHOLD_ALERT_COPY.submit }));
    expect((await screen.findByRole('status')).textContent).toContain(THRESHOLD_ALERT_COPY.success);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({
      institutions: ['technion'],
      degrees: [],
      email: 'student@example.com',
      phone: '',
      consent: true,
    });
    expect(JSON.stringify(capture.mock.calls)).not.toContain('student@example.com');
  });
});

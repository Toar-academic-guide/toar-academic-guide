// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EnquiryForm from './EnquiryForm';
import { getSessionAttribution } from '@/lib/sessionAttribution';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture } }));

describe('EnquiryForm', () => {
  beforeEach(() => {
    capture.mockReset();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/enquiry?name=private#private');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });
  it('tracks one view per mount, including Strict Mode, with only pathname attribution', () => {
    const form = (
      <StrictMode>
        <EnquiryForm programId="physiotherapy" institutionId="tau" title="פיזיותרפיה" />
      </StrictMode>
    );
    const { rerender, unmount } = render(form);
    rerender(form);
    expect(capture.mock.calls).toEqual([
      [
        'enquiry_form_viewed',
        {
          program_id: 'physiotherapy',
          institution_id: 'tau',
          surface: 'enquiry_page',
          source_path: '/enquiry',
        },
      ],
    ]);
    unmount();
    render(form);
    expect(capture).toHaveBeenCalledTimes(2);
  });
  it('keeps the details after failure, retries the same request, then confirms delivery', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: { message: 'לא נשלח' } }, { status: 502 }))
      .mockResolvedValueOnce(Response.json({ data: { received: true } }, { status: 201 }));
    vi.stubGlobal('fetch', send);
    render(
      <EnquiryForm
        programId="physiotherapy"
        institutionId="tau"
        title="פיזיותרפיה"
        evaluationInput={{ degreeId: 'physiotherapy', bagrut: 105.5, psychometric: 680 }}
        surface="journey"
      />,
    );
    fireEvent.change(screen.getByLabelText('שם מלא'), { target: { value: 'בדיקת MyWay' } });
    fireEvent.change(screen.getByLabelText('מספר טלפון'), { target: { value: '0501234567' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'שליחת בקשה' }));
    expect((await screen.findByRole('alert')).textContent).toContain('לא נשלח');
    expect((screen.getByLabelText('שם מלא') as HTMLInputElement).value).toBe('בדיקת MyWay');
    expect(capture.mock.calls).toEqual([
      [
        'enquiry_form_viewed',
        {
          program_id: 'physiotherapy',
          institution_id: 'tau',
          surface: 'journey',
          source_path: '/enquiry',
        },
      ],
      [
        'enquiry_submit_failed',
        {
          program_id: 'physiotherapy',
          institution_id: 'tau',
          surface: 'journey',
          http_status: 502,
          reason: 'server',
        },
      ],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'שליחת בקשה' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('הפנייה התקבלה'));
    expect(send.mock.calls[0][1].body).toBe(send.mock.calls[1][1].body);
    expect(JSON.parse(send.mock.calls[0][1].body)).toMatchObject({
      programId: 'physiotherapy',
      institutionId: 'tau',
      consent: true,
      evaluationInput: { degreeId: 'physiotherapy', bagrut: 105.5, psychometric: 680 },
    });
    expect(capture.mock.calls[2]).toEqual([
      'enquiry_submitted',
      {
        program_id: 'physiotherapy',
        institution_id: 'tau',
        surface: 'journey',
        source_path: '/enquiry',
      },
    ]);
  });

  it('submits first-touch attribution after navigation without adding visible fields', async () => {
    window.history.replaceState(null, '', '/?utm_source=instagram&utm_campaign=fall_2026');
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      'https://example.com/article?token=private',
    );
    getSessionAttribution();
    window.history.replaceState(null, '', '/enquiry?utm_source=facebook');
    const send = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { received: true } }, { status: 201 }));
    vi.stubGlobal('fetch', send);
    render(<EnquiryForm programId="physiotherapy" institutionId="tau" title="פיזיותרפיה" />);
    expect(document.querySelectorAll('form input')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('שם מלא'), { target: { value: 'בדיקת MyWay' } });
    fireEvent.change(screen.getByLabelText('מספר טלפון'), { target: { value: '0501234567' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'שליחת בקשה' }));
    await screen.findByRole('status');
    expect(JSON.parse(send.mock.calls[0][1].body).attribution).toEqual({
      utm_source: 'instagram',
      utm_campaign: 'fall_2026',
      referrer: 'https://example.com/article',
    });
  });

  it.each([
    ['network', () => Promise.reject(new Error('private network details')), null, 'network'],
    [
      'invalid JSON',
      () => Promise.resolve(new Response('private invalid JSON', { status: 502 })),
      502,
      'server',
    ],
    ['unconfirmed response', () => Promise.resolve(Response.json({ data: {} })), 200, 'server'],
  ] as const)(
    'tracks %s failure without personal details',
    async (_label, response, httpStatus, reason) => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(response));
      render(
        <EnquiryForm
          programId="psychometric-preparation"
          institutionId=""
          title="הכנה לפסיכומטרי"
        />,
      );
      fireEvent.change(screen.getByLabelText('שם מלא'), { target: { value: 'בדיקת MyWay' } });
      fireEvent.change(screen.getByLabelText('מספר טלפון'), { target: { value: '0501234567' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: 'שליחת בקשה' }));
      await screen.findByRole('alert');
      expect(capture.mock.calls[1]).toEqual([
        'enquiry_submit_failed',
        {
          program_id: 'psychometric-preparation',
          institution_id: '',
          surface: 'enquiry_page',
          http_status: httpStatus,
          reason,
        },
      ]);
      expect(capture).toHaveBeenCalledTimes(2);
    },
  );
});

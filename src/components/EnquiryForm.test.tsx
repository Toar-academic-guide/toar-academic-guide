// @vitest-environment jsdom
import { ENQUIRY_COPY, ENQUIRY_PREP_CONSENT } from '@/lib/enquiries';
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
  it('matches the R7g submit icon size and important semibold weight', () => {
    render(<EnquiryForm programId="cs" institutionId="tau" title="מדעי המחשב" />);
    const button = screen.getByRole('button', { name: ENQUIRY_COPY.button });
    expect(button.classList.contains('font-semibold!')).toBe(true);
    const icon = button.querySelector('svg')!;
    expect(icon.getAttribute('width')).toBe('20');
    expect(icon.getAttribute('height')).toBe('20');
  });

  it('focuses the success heading with the R7g ring, size and body colour token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: { received: true } }, { status: 201 })),
    );
    render(<EnquiryForm programId="cs" institutionId="tau" title="מדעי המחשב" />);
    fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.nameLabel), {
      target: { value: 'בדיקת MyWay' },
    });
    fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.phoneLabel), {
      target: { value: '0501234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: ENQUIRY_COPY.button }));
    const heading = await screen.findByRole('heading', { name: ENQUIRY_COPY.successTitle });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(heading.tabIndex).toBe(-1);
    for (const className of [
      'focus:outline-3',
      'focus:outline-offset-3',
      'focus:outline-[#6554b8]',
      'text-[23px]',
      'leading-7',
      'font-semibold',
    ]) {
      expect(heading.classList.contains(className)).toBe(true);
    }
    expect(heading.nextElementSibling?.classList.contains('text-(--text-body)')).toBe(true);
  });

  it.each([false, true])(
    'locks prep consent at checked=%s without native disabling or dimming, then unlocks for retry',
    async (initialChecked) => {
      let releaseSend!: (response: Response) => void;
      const send = vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            releaseSend = resolve;
          }),
      );
      vi.stubGlobal('fetch', send);
      render(<EnquiryForm programId="cs" institutionId="tau" title="מדעי המחשב" />);
      fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.nameLabel), {
        target: { value: 'בדיקת MyWay' },
      });
      fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.phoneLabel), {
        target: { value: '0501234567' },
      });
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      if (initialChecked) fireEvent.click(checkbox);
      const submit = screen.getByRole('button', { name: ENQUIRY_COPY.button });
      fireEvent.click(submit);
      expect(checkbox.getAttribute('aria-disabled')).toBe('true');
      expect(checkbox.disabled).toBe(false);
      expect(checkbox.hasAttribute('disabled')).toBe(false);
      expect(checkbox.className).not.toMatch(/opacity|dim|grayscale|brightness/);
      expect(checkbox.classList.contains('size-[22px]')).toBe(true);
      expect(checkbox.classList.contains('accent-[#5548aa]')).toBe(true);
      expect(submit.querySelector('svg')?.getAttribute('width')).toBe('20');
      expect(submit.querySelector('svg')?.getAttribute('height')).toBe('20');
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(initialChecked);
      fireEvent.click(document.getElementById('consent-prep')!);
      expect(checkbox.checked).toBe(initialChecked);
      releaseSend(Response.json({ error: { message: 'לא נשלח' } }, { status: 502 }));
      await screen.findByRole('alert');
      expect(checkbox.hasAttribute('aria-disabled')).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(!initialChecked);
      fireEvent.click(screen.getByRole('button', { name: ENQUIRY_COPY.retry }));
      expect(checkbox.getAttribute('aria-disabled')).toBe('true');
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(!initialChecked);
      releaseSend(Response.json({ error: { message: 'לא נשלח' } }, { status: 502 }));
      await screen.findByRole('alert');
      expect(checkbox.hasAttribute('aria-disabled')).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(initialChecked);
    },
  );

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
    fireEvent.change(screen.getByLabelText('שם'), { target: { value: 'בדיקת MyWay' } }); // Approved test update, Jorje 2026-10-26
    fireEvent.change(screen.getByLabelText('טלפון נייד'), { target: { value: '0501234567' } }); // Approved test update, Jorje 2026-10-26
    // Approved test update, Jorje 2026-10-26: removed checkbox tick (institution consent = button press)
    fireEvent.click(screen.getByRole('button', { name: ENQUIRY_COPY.button })); // Approved test update, Jorje 2026-10-26
    expect((await screen.findByRole('alert')).textContent).toContain(ENQUIRY_COPY.serverError); // Approved test update, Jorje 2026-10-26
    expect((screen.getByLabelText('שם') as HTMLInputElement).value).toBe('בדיקת MyWay'); // Approved test update, Jorje 2026-10-26
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
    fireEvent.click(screen.getByRole('button', { name: ENQUIRY_COPY.retry })); // Approved test update, Jorje 2026-10-26
    await // Approved test update, Jorje 2026-10-26
    waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain(ENQUIRY_COPY.successTitle),
    );
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
    fireEvent.change(screen.getByLabelText('שם'), { target: { value: 'בדיקת MyWay' } }); // Approved test update, Jorje 2026-10-26
    fireEvent.change(screen.getByLabelText('טלפון נייד'), { target: { value: '0501234567' } }); // Approved test update, Jorje 2026-10-26
    // Approved test update, Jorje 2026-10-26: removed checkbox tick (institution consent = button press)
    fireEvent.click(screen.getByRole('button', { name: ENQUIRY_COPY.button })); // Approved test update, Jorje 2026-10-26
    await screen.findByRole('status');
    expect(JSON.parse(send.mock.calls[0][1].body).attribution).toEqual({
      utm_source: 'instagram',
      utm_campaign: 'fall_2026',
      referrer: 'https://example.com',
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
      fireEvent.change(screen.getByLabelText('שם'), { target: { value: 'בדיקת MyWay' } }); // Approved test update, Jorje 2026-10-26
      fireEvent.change(screen.getByLabelText('טלפון נייד'), { target: { value: '0501234567' } }); // Approved test update, Jorje 2026-10-26
      // Approved test update, Jorje 2026-10-26: removed checkbox tick (institution consent = button press)
      fireEvent.click(screen.getByRole('button', { name: ENQUIRY_COPY.button })); // Approved test update, Jorje 2026-10-26
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

it('pins all approved R7g state copy and the revised button in one place', () => {
  expect(ENQUIRY_PREP_CONSENT).toBe(
    'אני רוצה שפרטיי יועברו גם לחברת הכנה לפסיכומטרי, שתחזור אליי בטלפון לגבי קורסים והטבות (לבני 18 ומעלה).',
  );
  expect(ENQUIRY_COPY).toMatchObject({
    button: 'שליחת פרטים',
    loadingLive: 'שולחים את הפנייה',
    loadingButton: 'שליחת פרטים',
    successTitle: 'הפנייה נשלחה',
    successLive: 'הפנייה נשלחה',
    successBody: '{institution_me} יחזרו אליך בטלפון.',
    serverError: 'השליחה נכשלה. נסו שוב.',
    retry: 'ניסיון נוסף',
    nameError: 'נא להזין שם',
    phoneError: 'מספר נייד לא תקין',
  });
});

it('starts with exactly one optional unchecked checkbox, named only by the prep sentence', () => {
  render(
    <EnquiryForm programId="tau_cs" institutionId="tau" title="מדעי המחשב · אוניברסיטת תל אביב" />,
  );
  const boxes = screen.getAllByRole('checkbox');
  expect(boxes).toHaveLength(1);
  expect(screen.getByRole('checkbox', { name: ENQUIRY_PREP_CONSENT })).toBe(boxes[0]);
  expect((boxes[0] as HTMLInputElement).checked).toBe(false);
  expect((boxes[0] as HTMLInputElement).required).toBe(false);
  const button = screen.getByRole('button', { name: ENQUIRY_COPY.button });
  const icon = button.querySelector('svg')!;
  expect(icon.getAttribute('aria-hidden')).toBe('true');
  expect(icon.getAttribute('focusable')).toBe('false');
  expect(icon.classList.contains('rtl:-scale-x-100')).toBe(true);
  const consent = ['action-consent', 'consent-prep', 'privacy-link'].map((id) =>
    document.getElementById(id)!,
  );
  expect(
    consent[0].compareDocumentPosition(consent[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    consent[1].compareDocumentPosition(consent[2]) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(consent[0].textContent).toContain('״שליחת פרטים״');
  expect(consent[0].querySelector('bdi[dir="rtl"]')?.textContent).toBe('״שליחת פרטים״');
});

it.each([false, true])(
  'submits institution consent with prepConsent=%s independently',
  async (prepConsent) => {
    const send = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { received: true } }, { status: 201 }));
    vi.stubGlobal('fetch', send);
    try {
      render(
        <EnquiryForm
          programId="tau_cs"
          institutionId="tau"
          title="מדעי המחשב · אוניברסיטת תל אביב"
        />,
      );
      fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.nameLabel), {
        target: { value: 'בדיקת MyWay' },
      });
      fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.phoneLabel), {
        target: { value: '0501234567' },
      });
      if (prepConsent) fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: ENQUIRY_COPY.button }));
      await waitFor(() =>
        expect(screen.getByRole('status').textContent).toContain(ENQUIRY_COPY.successTitle),
      );
      expect(JSON.parse(send.mock.calls[0][1].body)).toMatchObject({ consent: true, prepConsent });
      expect(JSON.parse(send.mock.calls[0][1].body)).not.toHaveProperty('prepConsentText');
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it('shows text errors for untouched required fields and keeps prep optional', () => {
  const send = vi.fn();
  vi.stubGlobal('fetch', send);
  try {
    render(
      <EnquiryForm
        programId="tau_cs"
        institutionId="tau"
        title="מדעי המחשב · אוניברסיטת תל אביב"
      />,
    );
    fireEvent.submit(document.querySelector('form')!);
    expect(screen.getByText(ENQUIRY_COPY.nameError)).toBeTruthy();
    expect(screen.getByText(ENQUIRY_COPY.phoneError)).toBeTruthy();
    for (const label of [ENQUIRY_COPY.nameLabel, ENQUIRY_COPY.phoneLabel]) {
      const field = screen.getByLabelText(label) as HTMLInputElement;
      expect(field.required).toBe(true);
      expect(field.getAttribute('aria-required')).toBe('true');
      expect(field.getAttribute('aria-invalid')).toBe('true');
    }
    expect(send).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

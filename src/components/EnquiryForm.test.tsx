// @vitest-environment jsdom
import { ENQUIRY_COPY, ENQUIRY_PREP_CONSENT, ENQUIRY_PREP_COPY } from '@/lib/enquiries';
import { StrictMode } from 'react';
import { INSTITUTIONS } from '@/data/institutions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EnquiryForm from './EnquiryForm';
import { getSessionAttribution } from '@/lib/sessionAttribution';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture, init: vi.fn() } }));

describe('EnquiryForm source page', () => {
  const key = 'myway_enquiry_origin_v1';
  beforeEach(async () => {
    await import('../../instrumentation-client');
    sessionStorage.clear();
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('');
    window.history.replaceState(null, '', '/enquiry');
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  async function submitSource() {
    const send = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { received: true } }, { status: 201 }));
    vi.stubGlobal('fetch', send);
    render(
      <EnquiryForm programId="psychometric-preparation" institutionId="" title="הכנה לפסיכומטרי" />,
    );
    fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.nameLabel), {
      target: { value: 'בדיקת MyWay' },
    });
    fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.phoneLabel), {
      target: { value: '0501234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: ENQUIRY_PREP_COPY.button })); // Approved copy update, Jorje/Amit 2026-10-30
    await screen.findByRole('status');
    return JSON.parse(send.mock.calls[0][1].body).sourcePath;
  }

  it.each(['/psychometric-dates', '/sekhem-calculator', '/'])(
    'records header link soft navigation from %s',
    async (origin) => {
      window.history.replaceState(null, '', origin);
      const { onRouterTransitionStart } = await import('../../instrumentation-client');
      onRouterTransitionStart('/enquiry?program=psychometric-preparation', 'push');
      window.history.replaceState(null, '', '/enquiry?program=psychometric-preparation');
      expect(await submitSource()).toBe(origin);
    },
  );

  it.each(['replace', 'traverse'] as const)('records %s transitions as well', async (type) => {
    window.history.replaceState(null, '', '/sekhem-calculator');
    const { onRouterTransitionStart } = await import('../../instrumentation-client');
    onRouterTransitionStart('/enquiry?program=psychometric-preparation', type);
    window.history.replaceState(null, '', '/enquiry');
    expect(await submitSource()).toBe('/sekhem-calculator');
  });

  it.each(['', 'https://evil.example/programs/cs'])(
    'records /enquiry on a direct visit with referrer %s',
    async (referrer) => {
      vi.spyOn(document, 'referrer', 'get').mockReturnValue(referrer);
      window.history.replaceState(null, '', '/enquiry?program=psychometric-preparation#private');
      expect(await submitSource()).toBe('/enquiry');
    },
  );

  it.each([
    'garbage',
    '/not-a-page',
    '/enquiry-fake',
    'https://evil.example/x',
    '//evil.example/x',
  ])('falls back to /enquiry for invalid stored origin %s', async (value) => {
    sessionStorage.setItem(key, value);
    expect(await submitSource()).toBe('/enquiry');
  });

  it.each(['/programs/cs?x=1', '/programs/cs#y', '/programs/cs?x=1#y'])(
    'submits bare stored origin from %s',
    async (value) => {
      sessionStorage.setItem(key, value);
      expect(await submitSource()).toBe('/programs/cs');
    },
  );

  it('records a bare same-origin referrer on a full load', async () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      `${window.location.origin}/programs/cs?x=1#y`,
    );
    expect(await submitSource()).toBe('/programs/cs');
  });

  it('keeps embedded forms on their own bare path despite stored origin and referrer', async () => {
    sessionStorage.setItem(key, '/psychometric-dates');
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      `${window.location.origin}/sekhem-calculator`,
    );
    window.history.replaceState(null, '', '/programs/cs#score');
    expect(await submitSource()).toBe('/programs/cs');
  });

  it('does not reuse a soft navigation origin after a fresh document load', async () => {
    const { onRouterTransitionStart } = await import('../../instrumentation-client');
    window.history.replaceState(null, '', '/psychometric-dates');
    onRouterTransitionStart('/enquiry?program=psychometric-preparation', 'push');
    expect(sessionStorage.getItem(key)).toBe('/psychometric-dates');
    window.history.replaceState(null, '', '/enquiry');
    vi.resetModules();
    await import('../../instrumentation-client');
    expect(await submitSource()).toBe('/enquiry');
  });

  it('clears origin when a later soft transition goes elsewhere', async () => {
    const { onRouterTransitionStart } = await import('../../instrumentation-client');
    window.history.replaceState(null, '', '/psychometric-dates');
    onRouterTransitionStart('/enquiry', 'push');
    window.history.replaceState(null, '', '/enquiry');
    onRouterTransitionStart('/about', 'push');
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(await submitSource()).toBe('/enquiry');
  });
});

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
  it('adds plain grey placeholders while preserving required labels and the phone RTL hook', () => {
    render(<EnquiryForm programId="cs" institutionId="tau" title="מדעי המחשב" />);
    expect(ENQUIRY_COPY.namePlaceholder).toBe('שם מלא');
    expect(ENQUIRY_COPY.phonePlaceholder).toBe('מספר טלפון');
    const name = screen.getByLabelText('שם', { exact: true }) as HTMLInputElement;
    const phone = screen.getByLabelText('טלפון נייד', { exact: true }) as HTMLInputElement;
    for (const [input, placeholder, labelText] of [
      [name, ENQUIRY_COPY.namePlaceholder, 'שם'],
      [phone, ENQUIRY_COPY.phonePlaceholder, 'טלפון נייד'],
    ] as const) {
      expect(input.getAttribute('placeholder')).toBe(placeholder);
      expect(input.getAttribute('aria-label')).toBe(labelText);
      expect(input.required).toBe(true);
      expect(input.getAttribute('aria-required')).toBe('true');
      expect(input.classList.contains('text-right')).toBe(true);
      expect(input.classList.contains('placeholder:text-[#666666]!')).toBe(true);
      expect(input.classList.contains('placeholder:opacity-100')).toBe(true);
      const label = input.labels![0];
      expect(label.textContent).toBe(`${labelText} *`);
      const asterisk = label.querySelector('span')!;
      expect(asterisk.textContent?.trim()).toBe('*');
      expect(asterisk.getAttribute('aria-hidden')).toBe('true');
      expect(asterisk.classList.contains('text-[#8c2438]')).toBe(true);
    }
    expect(name.getAttribute('dir')).toBe('rtl');
    expect(phone.getAttribute('dir')).toBe('ltr');
    expect(phone.classList.contains('placeholder-shown:[direction:rtl]')).toBe(true);
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
      fireEvent.click(screen.getByRole('button', { name: ENQUIRY_PREP_COPY.button })); // Approved copy update, Jorje/Amit 2026-10-30
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

it.each(['enquiry_page', 'journey'])(
  'uses the prep button while idle and sending on %s, keeping the default intro',
  async (surface) => {
    let releaseSend!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            releaseSend = resolve;
          }),
      ),
    );
    try {
      render(
        <EnquiryForm
          programId="psychometric-preparation"
          institutionId=""
          title="הכנה לפסיכומטרי"
          surface={surface}
        />,
      );
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('רוצים תשובות ישר מהמוסד?');
      expect(screen.queryByText('הציון שלכם בפסיכומטרי מתחיל בהכנה')).toBeNull();
      const button = screen.getByRole('button', { name: 'שלחו וחברת הכנה תחזור אליכם' });
      expect(screen.queryByText('שלחו, והמוסד יחזור אליכם')).toBeNull();
      fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.nameLabel), {
        target: { value: 'בדיקת MyWay' },
      });
      fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.phoneLabel), {
        target: { value: '0501234567' },
      });
      fireEvent.click(button);
      expect(screen.getByRole('button', { name: 'שלחו וחברת הכנה תחזור אליכם' })).toBe(button);
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(screen.queryByText('שלחו, והמוסד יחזור אליכם')).toBeNull();
      releaseSend(Response.json({ data: { received: true } }, { status: 201 }));
      await screen.findByRole('heading', { name: ENQUIRY_COPY.successTitle });
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it('keeps the institution submit button copy unchanged', () => {
  render(<EnquiryForm programId="cs" institutionId="tau" title="מדעי המחשב" />);
  expect(screen.getByRole('button', { name: 'שלחו, והמוסד יחזור אליכם' })).toBeTruthy();
  expect(screen.queryByText('שלחו וחברת הכנה תחזור אליכם')).toBeNull();
});

it('pins all approved R7g state copy and the revised button in one place', () => {
  // Approved test update, Jorje 2026-10-29 (consent wording item c)
  expect(ENQUIRY_PREP_CONSENT).toBe(
    'אני רוצה שפרטיי יועברו גם לחברת הכנה לפסיכומטרי, שתפנה אליי בטלפון, SMS או WhatsApp לגבי קורסים והטבות. אני מאשר/ת שגילי 18 ומעלה.',
  );
  expect(ENQUIRY_COPY).toMatchObject({
    namePlaceholder: 'שם מלא',
    phonePlaceholder: 'מספר טלפון',
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 19)
    button: 'שלחו, והמוסד יחזור אליכם',
    loadingLive: 'שולחים את הפנייה',
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 19)
    loadingButton: 'שלחו, והמוסד יחזור אליכם',
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
  // Approved test update, Jorje 2026-10-29 (consent wording item a)
  const consent = ['consent-prep', 'privacy-link', 'action-consent'].map((id) =>
    document.getElementById(id)!,
  );
  // Approved test update, Jorje 2026-10-29 (consent wording item a)
  expect(
    consent[0].compareDocumentPosition(consent[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  // Approved test update, Jorje 2026-10-29 (consent wording item a)
  expect(
    consent[1].compareDocumentPosition(consent[2]) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  // Approved test update, Jorje 2026-10-29 (consent wording item a)
  expect(consent[2].textContent).toBe(
    'בלחיצה על שליחה אני מאשר/ת להעביר את פרטיי לאוניברסיטת תל אביב בלבד',
  );
  // Approved test update, Jorje 2026-10-29 (consent wording item a)
  expect(button.previousElementSibling).toBe(consent[2]);
  expect(button.getAttribute('aria-describedby')).toBe('action-consent');
  expect(consent[0].textContent).toContain('אני מאשר/ת שגילי 18 ומעלה');
  expect(consent[0].textContent).toContain('טלפון, SMS או WhatsApp');
  expect(
    Array.from(consent[0].querySelectorAll('bdi[dir="ltr"]'), (node) => node.textContent),
  ).toEqual(['SMS', 'WhatsApp', '18']);
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

it.each([
  ['המכללה האקדמית אונו', 'למכללה האקדמית אונו'],
  ['האוניברסיטה העברית בירושלים', 'לאוניברסיטה העברית בירושלים'],
  ['הטכניון – מכון טכנולוגי לישראל', 'לטכניון – מכון טכנולוגי לישראל'],
  ['המרכז האקדמי רופין', 'למרכז האקדמי רופין'],
  ['המכון הטכנולוגי חולון (HIT)', 'למכון הטכנולוגי חולון (HIT)'],
  ['האקדמיה למוזיקה ולמחול ירושלים', 'לאקדמיה למוזיקה ולמחול ירושלים'],
  ['הנדסאים תל-אביב', 'להנדסאים תל-אביב'],
  ['הנדסה בגובה בע"מ', 'להנדסה בגובה בע"מ'],
  ['הגעתון - מחול', 'להגעתון - מחול'],
  ['מכללת הרצוג', 'למכללת הרצוג'],
])('uses the correct Hebrew prefix for catalogue institution %s', (name, prefixed) => {
  const institution = INSTITUTIONS.find((entry) => entry.name === name)!;
  expect(institution).toBeDefined();
  render(
    <EnquiryForm
      programId="cs"
      institutionId={institution.id}
      title={`מדעי המחשב · ${institution.name}`}
    />,
  );
  const button = screen.getByRole('button', { name: ENQUIRY_COPY.button });
  expect(button.previousElementSibling?.id).toBe('action-consent');
  expect(button.previousElementSibling?.textContent).toBe(
    `בלחיצה על שליחה אני מאשר/ת להעביר את פרטיי ${prefixed} בלבד`,
  );
});

it('uses the approved enquiry opening and action', () => {
  render(<EnquiryForm programId="cs" institutionId="tau" title="מדעי המחשב" />);
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 17)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('רוצים תשובות ישר מהמוסד?');
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 18)
  expect(screen.getByRole('button', { name: 'השאירו פרטים' })).toBeTruthy();
});

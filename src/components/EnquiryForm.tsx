'use client';

import { useEffect, useId, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { CircleAlert, GraduationCap, LoaderCircle, Send, X } from 'lucide-react';
import { getSessionAttribution } from '@/lib/sessionAttribution';
import { ENQUIRY_COPY as COPY, ENQUIRY_PREP_CONSENT, type EnquiryInput } from '@/lib/enquiries';

const CONSENT_COLOR = '#666666';
const consentStyle = { color: CONSENT_COLOR, fontSize: '12px', lineHeight: '18px' };

export default function EnquiryForm({
  programId,
  institutionId,
  title,
  onBack,
  surface = 'enquiry_page',
  evaluationInput,
}: {
  programId: string;
  institutionId: string;
  title: string;
  onBack?: () => void;
  surface?: string;
  evaluationInput?: EnquiryInput['evaluationInput'];
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const nameField = useRef<HTMLInputElement>(null);
  const phoneField = useRef<HTMLInputElement>(null);
  const successTitle = useRef<HTMLHeadingElement>(null);
  const requestId = useRef<string | null>(null);
  const sending = useRef(false);
  const viewed = useRef(false);
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [errors, setErrors] = useState({ name: false, phone: false });
  const institutionName = title.split(' · ').slice(1).join(' · ') || title;
  const institutionLe = `ל${institutionName.replace(/^האוניברסיטה/, 'אוניברסיטה')}`;
  const institutionMe = `מ${institutionName}`;
  const [actionStart, actionButton, actionEnd] = COPY.actionNotice
    .replace('{institution_le}', institutionLe)
    .split('״');
  const close = () => {
    setOpen(false);
    onBack?.();
  };

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    posthog.capture('enquiry_form_viewed', {
      program_id: programId,
      institution_id: institutionId,
      surface,
      source_path: window.location.pathname,
    });
  }, [programId, institutionId, surface]);

  useEffect(() => {
    if (!open || !dialog.current) return;
    const node = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    if (typeof node.showModal === 'function') node.showModal();
    else node.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    nameField.current?.focus();
    return () => {
      if (typeof node.close === 'function') node.close();
      else node.removeAttribute('open');
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (status === 'sent') successTitle.current?.focus();
  }, [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const values = new FormData(event.currentTarget);
    const name = String(values.get('name') ?? '').trim();
    const phone = String(values.get('phone') ?? '').trim();
    const invalid = {
      name: name.length < 2,
      phone: !/^(?:0|\+972)[2-9]\d{7,8}$/.test(phone.replace(/[\s()-]/g, '')),
    };
    setErrors(invalid);
    if (invalid.name || invalid.phone) {
      (invalid.name ? nameField : phoneField).current?.focus();
      return;
    }
    sending.current = true;
    setStatus('sending');
    requestId.current ??= crypto.randomUUID();
    const body: EnquiryInput = {
      requestId: requestId.current,
      name,
      phone,
      programId,
      institutionId,
      sourcePath: `${window.location.pathname}${window.location.hash}`.slice(0, 300),
      consent: true,
      prepConsent: values.has('prepConsent'),
      attribution: getSessionAttribution(),
      ...(evaluationInput ? { evaluationInput } : {}),
    };
    let httpStatus: number | null = null;
    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      httpStatus = response.status;
      const result = await response.json();
      if (!response.ok || !result.data?.received) throw new Error('Unconfirmed enquiry');
      posthog.capture('enquiry_submitted', {
        program_id: programId,
        institution_id: institutionId,
        surface,
        source_path: window.location.pathname,
      });
      setStatus('sent');
    } catch {
      posthog.capture('enquiry_submit_failed', {
        program_id: programId,
        institution_id: institutionId,
        surface,
        http_status: httpStatus,
        reason: httpStatus === null ? 'network' : 'server',
      });
      setStatus('failed');
    } finally {
      sending.current = false;
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-[#dce2ef] bg-white p-6 text-right" dir="rtl">
        <h1 className="text-2xl font-bold">רוצה לשמוע עוד?</h1>
        <p className="mt-2">{title}</p>
        <button
          type="button"
          className="way-button-primary mt-4 px-6 py-3"
          onClick={() => setOpen(true)}
        >
          יצירת קשר
        </button>
      </section>
      {open && (
        <dialog
          ref={dialog}
          aria-labelledby={`${id}-institution`}
          aria-modal="true"
          dir="rtl"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          className="fixed inset-0 m-auto w-80 max-w-[calc(100%_-_32px)] max-h-[calc(100dvh_-_32px)] overflow-y-auto overscroll-contain rounded-2xl border-0 bg-[#ffffff] p-6 text-right text-[#0c1d45] shadow-2xl backdrop:bg-[#0c1d45]/50"
        >
          <button
            type="button"
            aria-label="סגירה"
            onClick={close}
            className="absolute left-2 top-2 flex size-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6554b8]"
          >
            <X size={20} aria-hidden="true" focusable="false" />
          </button>
          <header className="mb-5 text-center">
            <GraduationCap
              className="mx-auto mb-3"
              size={40}
              aria-hidden="true"
              focusable="false"
            />
            <h2 id={`${id}-institution`} className="text-lg font-semibold leading-6">
              {institutionName}
            </h2>
          </header>
          {status === 'sent' ? (
            <section role="status" className="py-6 text-center">
              <h3
                ref={successTitle}
                tabIndex={-1}
                className="text-[23px] font-semibold leading-7 focus:outline-3 focus:outline-offset-3 focus:outline-[#6554b8]"
              >
                {COPY.successTitle}
              </h3>
              <p className="mt-2 text-(--text-body)">
                {COPY.successBody.replace('{institution_me}', institutionMe)}
              </p>
            </section>
          ) : (
            <form noValidate onSubmit={handleSubmit}>
              <p className="mb-2 text-[13px] leading-5 text-[#4b5563]">
                <span aria-hidden="true" className="text-[#8c2438]">
                  *
                </span>{' '}
                {COPY.requiredLegend}
              </p>
              <div className="grid gap-3">
                {(['name', 'phone'] as const).map((field) => (
                  <div key={field}>
                    <label htmlFor={`${id}-${field}`} className="mb-1 block text-sm font-semibold">
                      {field === 'name' ? COPY.nameLabel : COPY.phoneLabel}
                      <span aria-hidden="true" className="text-[#8c2438]">
                        {' '}
                        *
                      </span>
                    </label>
                    <input
                      ref={field === 'name' ? nameField : phoneField}
                      id={`${id}-${field}`}
                      name={field}
                      aria-label={field === 'name' ? COPY.nameLabel : COPY.phoneLabel}
                      placeholder={field === 'name' ? COPY.namePlaceholder : COPY.phonePlaceholder}
                      type={field === 'phone' ? 'tel' : 'text'}
                      dir={field === 'phone' ? 'ltr' : 'rtl'}
                      autoComplete={field === 'phone' ? 'tel' : 'name'}
                      required
                      aria-required="true"
                      aria-invalid={errors[field] || undefined}
                      aria-describedby={errors[field] ? `${id}-${field}-error` : undefined}
                      maxLength={field === 'name' ? 100 : 22}
                      readOnly={status === 'sending'}
                      className={`min-h-11 w-full rounded-lg border border-[#7f8faa] bg-white px-3 py-[9px] text-right text-base leading-6 placeholder:text-[#666666]! placeholder:opacity-100 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#6554b8] aria-invalid:border-[#8c2438]! ${field === 'phone' ? 'placeholder-shown:[direction:rtl]' : ''}`}
                    />
                    {errors[field] && (
                      <p
                        id={`${id}-${field}-error`}
                        className="mt-1 flex items-center gap-2 text-sm leading-[21px] text-[#8c2438]"
                      >
                        <CircleAlert size={18} aria-hidden="true" focusable="false" />
                        {field === 'name' ? COPY.nameError : COPY.phoneError}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div
                id="consent-block"
                className="mb-3 mt-4 border-t border-[#dce2ef] pt-3"
                style={{ backgroundColor: '#ffffff' }}
              >
                <div className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-2">
                  <div className="flex size-11 items-center justify-center">
                    <input
                      id={`${id}-prep`}
                      name="prepConsent"
                      type="checkbox"
                      aria-labelledby="consent-prep"
                      aria-disabled={status === 'sending' || undefined}
                      onClick={(event) => {
                        if (sending.current) event.preventDefault();
                      }}
                      className="size-[22px] accent-[#5548aa]"
                    />
                  </div>
                  <div className="pt-[10px]">
                    <p id="action-consent" style={consentStyle}>
                      {actionStart}
                      <bdi dir="rtl">״{actionButton}״</bdi>
                      {actionEnd}
                    </p>
                    <label
                      id="consent-prep"
                      htmlFor={`${id}-prep`}
                      className="mt-1 block cursor-pointer"
                      style={consentStyle}
                    >
                      {ENQUIRY_PREP_CONSENT.split('18')[0]}
                      <bdi dir="ltr">18</bdi>
                      {ENQUIRY_PREP_CONSENT.split('18')[1]}
                    </label>
                    <a
                      id="privacy-link"
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-4"
                      style={consentStyle}
                    >
                      {COPY.privacyLink}
                    </a>
                  </div>
                </div>
              </div>
              {status === 'failed' && (
                <p role="alert" className="mb-3 text-sm leading-[21px] text-[#8c2438]">
                  {COPY.serverError}
                </p>
              )}
              <button
                type="submit"
                aria-describedby="action-consent"
                aria-disabled={status === 'sending' || undefined}
                aria-busy={status === 'sending' || undefined}
                className="flex min-h-12 w-full items-center justify-center gap-[10px] rounded-[10px] bg-[#5548aa] px-4 py-3 text-base font-semibold! leading-6 text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#6554b8]"
              >
                {status === 'sending' ? (
                  <LoaderCircle
                    size={20}
                    className="motion-safe:animate-spin"
                    aria-hidden="true"
                    focusable="false"
                  />
                ) : (
                  <Send
                    size={20}
                    className="rtl:-scale-x-100"
                    aria-hidden="true"
                    focusable="false"
                  />
                )}
                {status === 'failed'
                  ? COPY.retry
                  : status === 'sending'
                    ? COPY.loadingButton
                    : COPY.button}
              </button>
              {status === 'sending' && (
                <p role="status" className="sr-only">
                  {COPY.loadingLive}
                </p>
              )}
            </form>
          )}
        </dialog>
      )}
    </>
  );
}

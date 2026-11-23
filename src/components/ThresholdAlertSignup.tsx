'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import posthog from 'posthog-js';
import { getSessionAttribution } from '@/lib/sessionAttribution';
import {
  THRESHOLD_ALERT_CONSENT,
  THRESHOLD_ALERT_COPY as COPY,
  THRESHOLD_ALERT_CYCLE,
  THRESHOLD_ALERT_DEGREES,
  THRESHOLD_ALERT_INSTITUTIONS,
  parseThresholdAlertSignup,
  thresholdAlertContactChannel,
  type ThresholdAlertDegreeId,
  type ThresholdAlertFieldError,
  type ThresholdAlertInstitutionId,
} from '@/lib/thresholdAlerts';

export default function ThresholdAlertSignup({
  initialInstitutions = [],
  initialDegrees = [],
}: {
  initialInstitutions?: readonly ThresholdAlertInstitutionId[];
  initialDegrees?: readonly ThresholdAlertDegreeId[];
}) {
  const id = useId();
  const requestId = useRef<string | null>(null);
  const viewed = useRef(false);
  const [institutions, setInstitutions] = useState<ThresholdAlertInstitutionId[]>([
    ...initialInstitutions,
  ]);
  const [degrees, setDegrees] = useState<ThresholdAlertDegreeId[]>([...initialDegrees]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<ThresholdAlertFieldError | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    posthog.capture('threshold_alert_form_viewed', {
      cycle: THRESHOLD_ALERT_CYCLE,
      institution_count: initialInstitutions.length,
      degree_count: initialDegrees.length,
      source_path: window.location.pathname,
    });
  }, [initialDegrees.length, initialInstitutions.length]);

  function toggleInstitution(value: ThresholdAlertInstitutionId) {
    setInstitutions((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function toggleDegree(value: ThresholdAlertDegreeId) {
    setDegrees((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    const parsed = parseThresholdAlertSignup({
      institutions,
      degrees,
      email,
      phone,
      consent,
      sourcePath: window.location.pathname,
    });
    const channel = parsed.ok ? thresholdAlertContactChannel(parsed.value) : 'none';
    posthog.capture('threshold_alert_signup_attempted', {
      cycle: THRESHOLD_ALERT_CYCLE,
      institution_count: institutions.length,
      degree_count: degrees.length,
      contact_channel: channel,
      valid: parsed.ok,
    });
    if (!parsed.ok) {
      setError(parsed.field);
      setStatus('idle');
      return;
    }
    setError(null);
    setStatus('sending');
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch('/api/threshold-alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId.current,
          institutions: parsed.value.institutions,
          degrees: parsed.value.degrees,
          email: parsed.value.email ?? '',
          phone: parsed.value.phone ?? '',
          consent: true,
          sourcePath: window.location.pathname,
          attribution: getSessionAttribution(),
        }),
      });
      if (!response.ok) throw new Error('signup failed');
      posthog.capture('threshold_alert_signup_completed', {
        cycle: THRESHOLD_ALERT_CYCLE,
        institution_count: parsed.value.institutions.length,
        degree_count: parsed.value.degrees.length,
        contact_channel: channel,
        source_path: parsed.value.sourcePath,
      });
      setStatus('sent');
    } catch {
      posthog.capture('threshold_alert_signup_failed', {
        cycle: THRESHOLD_ALERT_CYCLE,
        reason: 'server',
      });
      setStatus('failed');
    }
  }

  if (status === 'sent') {
    return (
      <p
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-900"
        role="status"
      >
        {COPY.success}
      </p>
    );
  }

  const message =
    error === 'target'
      ? COPY.targetError
      : error === 'contact'
        ? COPY.contactError
        : error === 'email'
          ? COPY.emailError
          : error === 'phone'
            ? COPY.phoneError
            : error === 'consent'
              ? COPY.consentError
              : status === 'failed'
                ? COPY.serverError
                : null;

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">{COPY.institutionsLegend}</legend>
        <div className="grid grid-cols-2 gap-2">
          {THRESHOLD_ALERT_INSTITUTIONS.map((institution) => (
            <label
              key={institution.id}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <input
                type="checkbox"
                className="size-4"
                checked={institutions.includes(institution.id)}
                onChange={() => toggleInstitution(institution.id)}
              />
              {institution.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">{COPY.degreesLegend}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {THRESHOLD_ALERT_DEGREES.map((degree) => (
            <label
              key={degree.id}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <input
                type="checkbox"
                className="size-4"
                checked={degrees.includes(degree.id)}
                onChange={() => toggleDegree(degree.id)}
              />
              {degree.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4">
        <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-email`}>
          {COPY.emailLabel}
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            value={email}
            placeholder={COPY.emailPlaceholder}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-right text-base font-normal placeholder-shown:[direction:rtl]"
            style={{ textAlign: 'right' }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-phone`}>
          {COPY.phoneLabel}
          <input
            id={`${id}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            placeholder={COPY.phonePlaceholder}
            onChange={(event) => setPhone(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-right text-base font-normal placeholder-shown:[direction:rtl]"
            style={{ textAlign: 'right' }}
          />
        </label>
      </div>
      <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>{THRESHOLD_ALERT_CONSENT}</span>
      </label>
      <p className="text-xs text-slate-500">
        <Link href="/privacy" className="underline underline-offset-4">
          מדיניות פרטיות
        </Link>
      </p>
      {message ? (
        <p className="text-sm font-semibold text-rose-800" role="alert">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="way-button-primary min-h-11 px-5 py-2 text-sm font-bold disabled:cursor-wait disabled:opacity-60"
      >
        {status === 'sending' ? COPY.submitting : COPY.submit}
      </button>
    </form>
  );
}

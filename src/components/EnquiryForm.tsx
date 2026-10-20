'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ENQUIRY_CONSENT, type EnquiryInput } from '@/lib/enquiries';

export default function EnquiryForm({
  programId,
  institutionId,
  title,
  onBack,
}: {
  programId: string;
  institutionId: string;
  title: string;
  onBack?: () => void;
}) {
  const requestId = useRef<string | null>(null);
  const sending = useRef(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  if (status === 'sent') {
    return (
      <section role="status" className="rounded-2xl bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 text-[#6554b8]" size={40} aria-hidden="true" />
        <h2 className="text-2xl font-bold">הפנייה התקבלה</h2>
        <p className="mt-3">צוות MyWay יחזור אליך בנושא {title}.</p>
        {onBack && (
          <button className="way-button-primary mt-6 px-6 py-3" onClick={onBack}>
            חזרה לאפשרויות שלי
          </button>
        )}
      </section>
    );
  }

  return (
    <form
      className="space-y-6 rounded-2xl border border-[#dce2ef] bg-white/85 p-6 sm:p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        if (sending.current) return;
        const values = new FormData(event.currentTarget);
        if (!values.has('consent')) return;
        sending.current = true;
        setStatus('sending');
        setError('');
        requestId.current ??= crypto.randomUUID();
        const body: EnquiryInput = {
          requestId: requestId.current,
          name: String(values.get('name')),
          phone: String(values.get('phone')),
          programId,
          institutionId,
          sourcePath: `${window.location.pathname}${window.location.hash}`.slice(0, 300),
          consent: true,
        };
        try {
          const response = await fetch('/api/enquiries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const result = await response.json();
          if (!response.ok || !result.data?.received) {
            throw new Error(result.error?.message ?? 'הפנייה לא נשלחה. אפשר לנסות שוב.');
          }
          setStatus('sent');
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'לא ניתן לשלוח כרגע.');
          setStatus('idle');
        } finally {
          sending.current = false;
        }
      }}
    >
      <div>
        <h2 className="text-2xl font-bold">רוצה לשמוע עוד?</h2>
        <p className="mt-2 text-[#596987]">{title}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 font-medium">
          שם מלא
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className="min-h-12 rounded-xl border border-[#cbd5e1] bg-white px-4 text-lg"
          />
        </label>
        <label className="grid gap-2 font-medium">
          מספר טלפון
          <input
            name="phone"
            type="tel"
            dir="ltr"
            required
            autoComplete="tel"
            pattern="(?:0|\+972)[2-9][0-9 \(\)\-]{7,14}"
            maxLength={22}
            className="min-h-12 rounded-xl border border-[#cbd5e1] bg-white px-4 text-lg"
          />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-5 w-5 shrink-0 accent-[#6554b8]"
        />
        <span>{ENQUIRY_CONSENT}</span>
      </label>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <button
        disabled={status === 'sending'}
        className="way-button-primary inline-flex min-h-12 items-center gap-3 px-7 py-3 font-bold disabled:opacity-60"
      >
        {status === 'sending' ? 'שולחים…' : 'שליחת בקשה'}
        <ArrowLeft size={18} aria-hidden="true" />
      </button>
    </form>
  );
}

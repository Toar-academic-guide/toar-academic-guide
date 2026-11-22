'use client';

import { useState } from 'react';
import { captureCalculatorShare } from '@/lib/calculatorAnalytics';
import { calculatorShare, type CalculatorShareSurface } from '@/lib/calculatorShare';

export default function CalculatorShareButton({
  surface,
  className,
}: {
  surface: CalculatorShareSurface;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  async function share() {
    const links = calculatorShare(surface);
    captureCalculatorShare(surface);
    setPending(true);
    try {
      const phone = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      if (phone && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: links.title, text: links.message, url: links.url });
          return;
        } catch (cause) {
          if (
            typeof cause === 'object' &&
            cause !== null &&
            'name' in cause &&
            cause.name === 'AbortError'
          ) {
            return;
          }
        }
      }
      window.open(links.whatsappUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      dir="rtl"
      disabled={pending}
      onClick={() => void share()}
    >
      שיתוף התוצאות
    </button>
  );
}

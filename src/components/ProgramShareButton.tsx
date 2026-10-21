'use client';

import { useState } from 'react';

export default function ProgramShareButton({
  programId,
  title,
}: {
  programId: string;
  title: string;
}) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  async function share() {
    const url = `${window.location.origin}/programs/${encodeURIComponent(programId)}`;
    setPending(true);
    setCopied(false);
    // Some embedded browsers leave the native share promise pending indefinitely.
    // Keep the link usable while the OS sheet or clipboard permission is pending.
    setManualUrl(url);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
          setManualUrl('');
          return;
        } catch (cause) {
          // Cancelling the native sheet is intentional; unsupported/denied sharing is not.
          if (
            typeof cause === 'object' &&
            cause !== null &&
            'name' in cause &&
            cause.name === 'AbortError'
          ) {
            setManualUrl('');
            return;
          }
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setManualUrl('');
        setCopied(true);
      } catch {
        // Embedded browsers can deny both APIs. Keep the actual link usable.
        setManualUrl(url);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="journey-share">
      <button type="button" disabled={pending} onClick={() => void share()}>
        שיתוף המסלול
      </button>
      {copied && <span role="status">הקישור הועתק.</span>}
      {manualUrl && (
        <label>
          קישור לשיתוף
          <input
            autoFocus
            readOnly
            dir="ltr"
            value={manualUrl}
            onFocus={(event) => event.currentTarget.select()}
            onClick={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}

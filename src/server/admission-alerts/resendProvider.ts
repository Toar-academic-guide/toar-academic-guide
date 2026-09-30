import 'server-only';
import type { AdmissionAlertMailProvider } from './deliveryWorker';

/** Raw responses/errors may contain recipient addresses, so never expose them. */
export function createResendAdmissionAlertProvider(input: {
  apiKey: string;
  fetcher?: typeof fetch;
}): AdmissionAlertMailProvider {
  if (!input.apiKey.startsWith('re_')) throw new Error('Resend sending key is required.');
  const fetcher = input.fetcher ?? fetch;
  return {
    async send({ idempotencyKey, payload }) {
      try {
        const response = await fetcher('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${input.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            from: payload.from,
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            reply_to: payload.reply_to,
            // Only an opaque internal correlation value, never a profile or recipient tag.
            ...(/^admission-alert:[a-f0-9]{64}$/.test(idempotencyKey)
              ? {
                  tags: [
                    {
                      name: 'admission_alert',
                      value: idempotencyKey.slice('admission-alert:'.length),
                    },
                  ],
                }
              : {}),
          }),
          signal: AbortSignal.timeout(20_000),
          redirect: 'error',
        });
        const body: unknown = await response.json();
        const data =
          typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
        if (response.ok && typeof data.id === 'string' && data.id.length > 0)
          return { status: 'accepted', providerMessageId: data.id };
        if (response.status === 429) return { status: 'retryable' };
        if (
          response.status === 409 ||
          response.status === 408 ||
          response.status >= 500 ||
          response.ok
        )
          return { status: 'acceptance_unknown' };
        if (response.status >= 400 && response.status < 500) return { status: 'permanent' };
        return { status: 'acceptance_unknown' };
      } catch {
        return { status: 'acceptance_unknown' };
      }
    },
  };
}

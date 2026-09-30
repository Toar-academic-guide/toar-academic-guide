import {
  recordAdmissionAlertWebhook,
  verifyAdmissionAlertWebhook,
} from '@/server/admission-alerts/webhookService';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const secret = process.env.ADMISSION_ALERT_RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: 'Webhook not configured.' }, { status: 503 });
  let event;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 64_000)
      return Response.json({ error: 'Payload too large.' }, { status: 413 });
    event = verifyAdmissionAlertWebhook(raw, request.headers, secret);
  } catch {
    return Response.json({ error: 'Invalid webhook.' }, { status: 400 });
  }
  if (!event) return Response.json({ status: 'ignored' });
  try {
    return Response.json(await recordAdmissionAlertWebhook(event));
  } catch {
    // A non-2xx response lets Resend retry. Never expose DB errors or raw payloads.
    return Response.json({ error: 'Unable to record webhook.' }, { status: 503 });
  }
}

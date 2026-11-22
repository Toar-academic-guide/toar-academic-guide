import { enquiryAttributionSchema } from '@/lib/leadAttribution';
import {
  THRESHOLD_ALERT_COPY,
  THRESHOLD_ALERT_DEGREES,
  THRESHOLD_ALERT_INSTITUTIONS,
  parseThresholdAlertSignup,
  thresholdAlertContactChannel,
  type ThresholdAlertFieldError,
} from '@/lib/thresholdAlerts';
import { getPostHogClient } from '@/lib/posthog-server';
import { saveThresholdAlertSignup } from '@/server/threshold-alerts/repository';
import { after } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const inputSchema = z
  .object({
    requestId: z.uuid(),
    institutions: z.array(z.string().max(40)).max(THRESHOLD_ALERT_INSTITUTIONS.length),
    degrees: z.array(z.string().max(40)).max(THRESHOLD_ALERT_DEGREES.length),
    email: z.string().max(254).optional().default(''),
    phone: z.string().max(30).optional().default(''),
    consent: z.literal(true),
    sourcePath: z
      .string()
      .max(300)
      .refine((value) => value.startsWith('/') && !value.startsWith('//')),
    attribution: enquiryAttributionSchema.optional(),
  })
  .strict();

const fieldCopy: Record<ThresholdAlertFieldError, string> = {
  target: THRESHOLD_ALERT_COPY.targetError,
  contact: THRESHOLD_ALERT_COPY.contactError,
  email: THRESHOLD_ALERT_COPY.emailError,
  phone: THRESHOLD_ALERT_COPY.phoneError,
  consent: THRESHOLD_ALERT_COPY.consentError,
};

function failure(status: number, message: string) {
  return Response.json({ error: { message } }, { status });
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return failure(403, 'יש לשלוח את ההרשמה מתוך האתר.');
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return failure(415, 'פורמט ההרשמה אינו תקין.');
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 8_192) return failure(413, 'ההרשמה ארוכה מדי.');
  let parsed;
  try {
    parsed = inputSchema.safeParse(JSON.parse(raw));
  } catch {
    return failure(400, THRESHOLD_ALERT_COPY.serverError);
  }
  if (!parsed.success) return failure(400, THRESHOLD_ALERT_COPY.consentError);
  const signup = parseThresholdAlertSignup(parsed.data);
  if (!signup.ok) return failure(400, fieldCopy[signup.field]);

  try {
    await saveThresholdAlertSignup({
      ...signup.value,
      requestId: parsed.data.requestId,
      attribution: parsed.data.attribution,
    });
  } catch (error) {
    console.error('[threshold-alerts] database write failed', {
      requestId: parsed.data.requestId,
      reason: error instanceof Error ? error.name : 'unknown',
    });
    return failure(503, THRESHOLD_ALERT_COPY.serverError);
  }

  const properties = {
    cycle: signup.value.cycle,
    institution_count: signup.value.institutions.length,
    degree_count: signup.value.degrees.length,
    contact_channel: thresholdAlertContactChannel(signup.value),
    source_path: signup.value.sourcePath,
    $process_person_profile: false,
  };
  if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim()) {
    try {
      after(async () => {
        try {
          const posthog = getPostHogClient();
          posthog.capture({
            distinctId: parsed.data.requestId,
            event: 'server_threshold_alert_signup_created',
            properties,
          });
          await posthog.flush();
        } catch {
          // Analytics must never change the stored signup.
        }
      });
    } catch {
      console.error('[threshold-alerts] analytics scheduling failed', {
        requestId: parsed.data.requestId,
      });
    }
  }

  return Response.json({ data: { received: true } }, { status: 201 });
}

import 'server-only';
import { setTimeout as delay } from 'node:timers/promises';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  createDrizzleAdmissionAlertDeliveryRepository,
  processAdmissionAlertDelivery,
} from './deliveryWorker';
import { createResendAdmissionAlertProvider } from './resendProvider';

export function admissionAlertDeliveryConfiguration(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.ADMISSION_ALERT_DELIVERY_ENABLED !== 'true')
    throw new Error('Admission alert delivery is disabled.');
  if (!env.ADMISSION_ALERT_RESEND_API_KEY?.startsWith('re_'))
    throw new Error('Admission alert sending key is required.');
  return { apiKey: env.ADMISSION_ALERT_RESEND_API_KEY };
}

/** Dry runs only count queue state. They neither claim rows nor construct a provider. */
export async function runAdmissionAlertDelivery(input: {
  dryRun: boolean;
  maxDeliveries?: number;
}) {
  const max = input.maxDeliveries ?? 500;
  if (!Number.isInteger(max) || max < 1 || max > 500)
    throw new Error('maxDeliveries must be between 1 and 500.');
  const configuration = input.dryRun ? null : admissionAlertDeliveryConfiguration();
  const db = getDb();
  const counts = await db.execute<{ status: string; count: number }>(sql`
    select status::text, count(*)::int from admission_alert_outbox group by status
  `);
  if (input.dryRun)
    return {
      status: 'dry_run',
      counts: Object.fromEntries(counts.map((row) => [row.status, row.count])),
    };
  const repository = createDrizzleAdmissionAlertDeliveryRepository(db);
  const provider = createResendAdmissionAlertProvider(configuration!);
  const outcomes: Record<string, number> = {};
  for (let i = 0; i < max; i++) {
    const result = await processAdmissionAlertDelivery({ repository, provider });
    if (result.status === 'idle' || result.status === 'lease_lost')
      return { status: result.status, outcomes };
    outcomes[result.status] = (outcomes[result.status] ?? 0) + 1;
    await delay(1000);
  }
  return { status: 'batch_limit', outcomes };
}

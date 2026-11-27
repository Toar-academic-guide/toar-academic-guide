import 'server-only';
import { enquirySourcePath } from '@/lib/enquirySourcePath';
import { enquiryAttributionSchema, type EnquiryAttribution } from '@/lib/leadAttribution';
import { THRESHOLD_ALERT_CONSENT, type ThresholdAlertSignup } from '@/lib/thresholdAlerts';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';

export async function saveThresholdAlertSignup(
  signup: ThresholdAlertSignup & { attribution?: EnquiryAttribution },
): Promise<void> {
  // app_runtime cannot read this table; only this insert-only function is granted.
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '5s'`);
    await tx.execute(
      sql`select public.store_threshold_alert_signup(${JSON.stringify({
        ...signup,
        sourcePath: enquirySourcePath(signup.sourcePath),
        consentText: THRESHOLD_ALERT_CONSENT,
        attribution: enquiryAttributionSchema.parse(signup.attribution ?? {}),
      })}::jsonb)`,
    );
  });
}

/** Token possession permits suppression only, never reading contacts or reactivating a signup. */
export async function unsubscribeThresholdAlerts(token: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '5s'`);
    const rows = await tx.execute<{ removed: boolean }>(
      sql`select public.unsubscribe_threshold_alert_signup(${token}::uuid) as removed`,
    );
    const result = 'rows' in rows ? rows.rows : rows;
    return result[0]?.removed === true;
  });
}

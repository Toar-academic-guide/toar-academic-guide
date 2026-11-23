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

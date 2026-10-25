import 'server-only';
import { enquirySourcePath } from '@/lib/enquirySourcePath';
import { enquiryAttributionSchema } from '@/lib/leadAttribution';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { ENQUIRY_CONSENT, type EnquiryRecord } from '@/lib/enquiries';

export async function saveEnquiryBackup(enquiry: EnquiryRecord): Promise<void> {
  // app_runtime cannot read this table; only this insert-only function is granted.
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '5s'`);
    await tx.execute(
      sql`select public.store_enquiry(${JSON.stringify({
        ...enquiry,
        sourcePath: enquirySourcePath(enquiry.sourcePath),
        attribution: enquiryAttributionSchema.parse(enquiry.attribution ?? {}),
        consentText: ENQUIRY_CONSENT,
      })}::jsonb)`,
    );
  });
}

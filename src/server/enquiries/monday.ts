import 'server-only';
import { createHash } from 'node:crypto';
import { ENQUIRY_CONSENT, type EnquiryRecord } from '@/lib/enquiries';

export async function sendEnquiryToMonday(enquiry: EnquiryRecord): Promise<string> {
  const token = process.env.MONDAY_API_TOKEN?.trim();
  if (!token) throw new Error('Monday is not configured');
  const now = enquiry.createdAt.toISOString();
  const context = {
    ...enquiry.attribution,
    program_id: enquiry.programId,
    institution_id: enquiry.institutionId,
    result_status: enquiry.resultStatus,
    bagrut: enquiry.bagrut,
    psychometric: enquiry.psychometric,
    // Keep full subject records in Postgres; Monday long text has a 2000-character limit.
    evaluation_input: enquiry.evaluationInput
      ? {
          degreeId: enquiry.evaluationInput.degreeId,
          bagrut: enquiry.evaluationInput.bagrut,
          psychometric: enquiry.evaluationInput.psychometric,
          ...(enquiry.evaluationInput.extraInputs
            ? {
                extraInputs: Object.fromEntries(
                  Object.entries(enquiry.evaluationInput.extraInputs).filter(
                    ([key, value]) => /bagrut|psychometric/i.test(key) && typeof value === 'number',
                  ),
                ),
              }
            : {}),
        }
      : null,
  };
  const columns = {
    phone_mm8ar2e2: { phone: enquiry.phone.replace(/^0/, '+972'), countryShortName: 'IL' },
    text_mm8a6zex: enquiry.programName,
    text_mm8a4c4w: enquiry.institutionName,
    text_mm8ag00n: enquiry.programId,
    text_mm8am52m: enquiry.sourcePath,
    boolean_mm8abpda: { checked: 'true' },
    long_text_mm8ay37r: { text: `${ENQUIRY_CONSENT}\n\nLead context:\n${JSON.stringify(context)}` },
    date_mm8a880y: { date: now.slice(0, 10), time: now.slice(11, 19) },
    text_mm8a78k: enquiry.requestId,
    color_mm8aqhym: { label: 'חדש' },
  };
  // UUID persists across retries, independent of evaluation timestamps/rule changes.
  const idempotencyKey = createHash('sha256').update(enquiry.requestId).digest('hex');
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      'API-Version': '2026-10',
      'Idempotency-Key': idempotencyKey,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      query: `mutation WebsiteEnquiry($board: ID!, $name: String!, $columns: JSON!) {
        create_item(board_id: $board, group_id: "topics", item_name: $name, column_values: $columns) { id }
      }`,
      variables: { board: '18436300533', name: enquiry.name, columns: JSON.stringify(columns) },
    }),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length || !result.data?.create_item?.id) {
    throw new Error('Monday did not acknowledge the enquiry');
  }
  return String(result.data.create_item.id);
}

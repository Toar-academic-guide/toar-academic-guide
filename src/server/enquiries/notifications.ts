import 'server-only';
import type { EnquiryRecord } from '@/lib/enquiries';
import {
  postAdmissionsReviewSlackMessage,
  readAdmissionsReviewSlackConfig,
} from '@/server/automation/admissionsReviewSlack';

export async function notifyEnquiry(
  enquiry: Pick<EnquiryRecord, 'requestId' | 'programId' | 'institutionId' | 'resultStatus'>,
  mondayItemId: string | null,
): Promise<void> {
  const config = readAdmissionsReviewSlackConfig();
  if (!config.slackBotToken || !config.slackChannelId) return;
  const text = [
    'New MyWay enquiry',
    `request_id: ${enquiry.requestId}`,
    `program_id: ${enquiry.programId}`,
    `institution_id: ${enquiry.institutionId || '(none)'}`,
    `result_status: ${enquiry.resultStatus}`,
    mondayItemId
      ? `https://malichi-hub.monday.com/boards/18436300533/pulses/${mondayItemId}`
      : 'Saved in the private enquiries backup; Monday delivery failed.',
  ].join('\n');
  const outcome = await postAdmissionsReviewSlackMessage({ text, blocks: [] }, config);
  if (outcome.status !== 'sent') {
    console.error('[enquiries] notification failed', { requestId: enquiry.requestId });
  }
}

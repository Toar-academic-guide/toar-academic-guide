import 'server-only';
import type { EnquiryRecord } from '@/lib/enquiries';
import { postAdmissionsReviewSlackMessage } from '@/server/automation/admissionsReviewSlack';

export async function notifyEnquiry(
  enquiry: Pick<
    EnquiryRecord,
    | 'requestId'
    | 'programId'
    | 'programName'
    | 'institutionId'
    | 'institutionName'
    | 'resultStatus'
    | 'attribution'
  >,
  mondayItemId: string | null,
): Promise<void> {
  const config = {
    slackBotToken: process.env.SLACK_BOT_TOKEN?.trim(),
    slackChannelId: process.env.SLACK_LEADS_CHANNEL_ID?.trim(),
  };
  if (!config.slackBotToken || !config.slackChannelId) return;
  const text = [
    `program_id: ${enquiry.programId}`,
    `program_name: ${enquiry.programName}`,
    `institution_id: ${enquiry.institutionId}`,
    `institution_name: ${enquiry.institutionName}`,
    `result_status: ${enquiry.resultStatus}`,
    ...(enquiry.attribution?.utm_source ? [`utm_source: ${enquiry.attribution.utm_source}`] : []),
    ...(mondayItemId
      ? [`https://malichi-hub.monday.com/boards/18436300533/pulses/${mondayItemId}`]
      : []),
  ].join('\n');
  const outcome = await postAdmissionsReviewSlackMessage({ text, blocks: [] }, config);
  if (outcome.status !== 'sent') {
    console.error('[enquiries] notification failed', { requestId: enquiry.requestId });
  }
}

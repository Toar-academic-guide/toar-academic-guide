import 'server-only';
import type { EnquiryRecord } from '@/lib/enquiries';
import { postAdmissionsReviewSlackMessage } from '@/server/automation/admissionsReviewSlack';

const MONDAY_ENQUIRIES_BOARD_URL = 'https://malichi-hub.monday.com/boards/18436300533';
const PREP_CONSENT_LABEL = 'הסכמה להעברה לחברת הכנה';

type EnquirySlackInput = Pick<
  EnquiryRecord,
  'programName' | 'institutionName' | 'requestId' | 'prepConsent'
>;

function escapeSlackText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildEnquirySlackMessage(enquiry: EnquirySlackInput, mondayItemId: string | null) {
  const programName = escapeSlackText(enquiry.programName);
  const institutionName = escapeSlackText(enquiry.institutionName);
  const mondayUrl = mondayItemId
    ? `${MONDAY_ENQUIRIES_BOARD_URL}/pulses/${mondayItemId}`
    : MONDAY_ENQUIRIES_BOARD_URL;
  return {
    text: [
      `פנייה חדשה: ${programName}${institutionName ? ` · ${institutionName}` : ''}`,
      `מזהה פנייה: ${enquiry.requestId}`,
      `${PREP_CONSENT_LABEL}: ${enquiry.prepConsent === true ? 'כן' : 'לא'}`,
      `קישור במאנדיי: ${mondayUrl}`,
    ].join('\n'),
    blocks: [],
  };
}

export async function notifyEnquiry(
  enquiry: EnquirySlackInput,
  mondayItemId: string | null,
): Promise<void> {
  try {
    const config = {
      slackBotToken: process.env.SLACK_BOT_TOKEN?.trim(),
      slackChannelId: process.env.SLACK_LEADS_CHANNEL_ID?.trim(),
    };
    if (!config.slackBotToken || !config.slackChannelId) {
      console.warn('[enquiries] slack lead ping not configured', { requestId: enquiry.requestId });
      return;
    }
    const outcome = await postAdmissionsReviewSlackMessage(
      buildEnquirySlackMessage(enquiry, mondayItemId),
      config,
    );
    if (outcome.status !== 'sent') {
      console.error('[enquiries] slack lead ping failed', { requestId: enquiry.requestId });
    }
  } catch {
    console.error('[enquiries] slack lead ping failed', { requestId: enquiry.requestId });
  }
}

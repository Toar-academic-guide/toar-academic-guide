import 'server-only';

import type { AdmissionsReviewSlackMessage } from '@/server/admissions/weeklyReviewRun';

export interface AdmissionsReviewSlackConfig {
  slackBotToken?: string;
  slackChannelId?: string;
}

export type AdmissionsReviewSlackDeliveryResult =
  { status: 'sent'; timestamp?: string } | { status: 'failed'; error: string };

export function readAdmissionsReviewSlackConfig(
  env: Record<string, string | undefined> = process.env,
): AdmissionsReviewSlackConfig {
  return {
    slackBotToken: env.SLACK_BOT_TOKEN?.trim(),
    slackChannelId: env.SLACK_ADMISSIONS_REVIEW_CHANNEL_ID?.trim(),
  };
}

export async function postAdmissionsReviewSlackMessage(
  payload: AdmissionsReviewSlackMessage,
  config: AdmissionsReviewSlackConfig = readAdmissionsReviewSlackConfig(),
  fetcher: typeof fetch = fetch,
): Promise<AdmissionsReviewSlackDeliveryResult> {
  if (!config.slackBotToken || !config.slackChannelId) {
    return { status: 'failed', error: 'Admissions review Slack is not configured.' };
  }

  try {
    const response = await fetcher('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.slackBotToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel: config.slackChannelId,
        text: payload.text,
        blocks: payload.blocks,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });
    if (!response.ok) {
      return { status: 'failed', error: `Slack API request failed (${response.status}).` };
    }

    const body = (await response.json()) as { ok?: boolean; error?: unknown; ts?: unknown };
    if (!body.ok) {
      return {
        status: 'failed',
        error: `Slack API rejected the message: ${safeError(body.error)}`,
      };
    }
    return { status: 'sent', timestamp: typeof body.ts === 'string' ? body.ts : undefined };
  } catch (error) {
    return {
      status: 'failed',
      error: safeError(error instanceof Error ? error.message : String(error)),
    };
  }
}

function safeError(value: unknown): string {
  const text = typeof value === 'string' ? value : 'unknown error';
  return text
    .replace(/[\r\n<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

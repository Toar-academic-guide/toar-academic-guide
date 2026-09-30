import 'server-only';

import type { AdmissionsReviewSlackMessage } from '@/server/admissions/weeklyReviewRun';

export interface AdmissionsReviewSlackConfig {
  slackBotToken?: string;
  slackChannelId?: string;
}

export type AdmissionsReviewSlackDeliveryResult =
  | { status: 'sent'; timestamp?: string }
  | { status: 'failed'; error: string }
  | { status: 'acceptance_unknown'; error: string };

export const ADMISSIONS_REVIEW_SLACK_REQUEST_TIMEOUT_MS = 10_000;

export function canInjectAdmissionsReviewSlackFailure(input: {
  releaseKind: 'canonical_bootstrap' | 'canonical_change' | 'operational_proof';
  proofScenario: string | null;
  confirmationId: string;
}): boolean {
  return (
    input.releaseKind === 'operational_proof' &&
    input.proofScenario !== null &&
    input.proofScenario === input.confirmationId
  );
}

export function shouldPostAdmissionsReviewSlack(
  status: 'pending' | 'sent' | 'failed' | 'acceptance_unknown' | undefined,
): boolean {
  return status !== 'sent' && status !== 'acceptance_unknown';
}

export function readAdmissionsReviewSlackConfig(
  env: Record<string, string | undefined> = process.env,
): AdmissionsReviewSlackConfig {
  return {
    slackBotToken: env.SLACK_BOT_TOKEN?.trim(),
    slackChannelId:
      env.SLACK_READY_PR_CHANNEL_ID?.trim() ?? env.SLACK_ADMISSIONS_REVIEW_CHANNEL_ID?.trim(),
  };
}

export async function postAdmissionsReviewSlackMessage(
  payload: AdmissionsReviewSlackMessage,
  config: AdmissionsReviewSlackConfig = readAdmissionsReviewSlackConfig(),
  fetcher: typeof fetch = fetch,
  options: { requestTimeoutMs?: number } = {},
): Promise<AdmissionsReviewSlackDeliveryResult> {
  if (!config.slackBotToken || !config.slackChannelId) {
    return { status: 'failed', error: 'Admissions review Slack is not configured.' };
  }

  try {
    const { response, body } = await fetchSlackApiWithTimeout(
      fetcher,
      'https://slack.com/api/chat.postMessage',
      {
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
      },
      options.requestTimeoutMs ?? ADMISSIONS_REVIEW_SLACK_REQUEST_TIMEOUT_MS,
    );
    if (!response.ok) {
      return { status: 'failed', error: `Slack API request failed (${response.status}).` };
    }

    if (!body) {
      return {
        status: 'acceptance_unknown',
        error: 'Slack API returned a successful response without a delivery acknowledgement.',
      };
    }

    if (!body.ok) {
      return {
        status: 'failed',
        error: `Slack API rejected the message: ${safeError(body.error)}`,
      };
    }
    return { status: 'sent', timestamp: typeof body.ts === 'string' ? body.ts : undefined };
  } catch (error) {
    return {
      status: error instanceof SlackResponseAfterHeadersError ? 'acceptance_unknown' : 'failed',
      error: safeError(error instanceof Error ? error.message : String(error)),
    };
  }
}

async function fetchSlackApiWithTimeout(
  fetcher: typeof fetch,
  input: Parameters<typeof fetch>[0],
  init: RequestInit,
  timeoutMs: number,
): Promise<{
  response: Response;
  body: { ok?: boolean; error?: unknown; ts?: unknown } | null;
}> {
  const controller = new AbortController();
  let responseReceived = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutError = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Slack API request timed out after ${timeoutMs}ms.`));
      controller.abort();
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetcher(input, { ...init, signal: controller.signal }).then(async (response) => {
        responseReceived = true;
        if (!response.ok) return { response, body: null };
        return {
          response,
          body: (await response.json()) as { ok?: boolean; error?: unknown; ts?: unknown },
        };
      }),
      timeoutError,
    ]);
  } catch (error) {
    if (responseReceived) {
      throw new SlackResponseAfterHeadersError(
        error instanceof Error ? error.message : String(error),
      );
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

class SlackResponseAfterHeadersError extends Error {}

function safeError(value: unknown): string {
  const text = typeof value === 'string' ? value : 'unknown error';
  return text
    .replace(/[\r\n<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

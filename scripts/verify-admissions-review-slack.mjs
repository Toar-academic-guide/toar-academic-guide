import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SLACK_REQUEST_TIMEOUT_MS = 10_000;

export async function slackRequest(
  path,
  token,
  fetcher = fetch,
  timeoutMs = SLACK_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  let timeout;
  const timeoutError = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Slack preflight request timed out after ${timeoutMs}ms.`));
      controller.abort();
    }, timeoutMs);
  });

  try {
    const body = await Promise.race([
      fetcher(`https://slack.com/api/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok) throw new Error(`Slack preflight request failed (${response.status}).`);
        return response.json();
      }),
      timeoutError,
    ]);
    if (!body.ok) throw new Error('Slack preflight was rejected by the configured workspace.');
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function main() {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  const channelId = process.env.SLACK_READY_PR_CHANNEL_ID?.trim();
  if (!token || !channelId) {
    throw new Error(
      'Admissions Slack preflight requires the configured bot token and ready-PR channel.',
    );
  }
  await slackRequest('auth.test', token);
  await slackRequest(`conversations.info?channel=${encodeURIComponent(channelId)}`, token);
  console.info(JSON.stringify({ status: 'ok' }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Slack preflight failed.');
    process.exitCode = 1;
  });
}

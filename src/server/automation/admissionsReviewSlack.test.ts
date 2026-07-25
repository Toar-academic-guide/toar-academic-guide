import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  postAdmissionsReviewSlackMessage,
  readAdmissionsReviewSlackConfig,
} from './admissionsReviewSlack';

describe('admissions review Slack delivery', () => {
  it('uses a dedicated review channel and does not post when it is unconfigured', async () => {
    const config = readAdmissionsReviewSlackConfig({});
    const result = await postAdmissionsReviewSlackMessage({ text: 'summary', blocks: [] }, config);

    expect(result).toEqual({
      status: 'failed',
      error: 'Admissions review Slack is not configured.',
    });
  });

  it('posts a review-safe summary and returns a retryable failure without throwing', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: 'ratelimited' }), { status: 200 }),
      );
    const result = await postAdmissionsReviewSlackMessage(
      { text: 'summary', blocks: [] },
      { slackBotToken: 'xoxb-token', slackChannelId: 'C123' },
      fetcher,
    );

    expect(result).toEqual({
      status: 'failed',
      error: 'Slack API rejected the message: ratelimited',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://slack.com/api/chat.postMessage',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

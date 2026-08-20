import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  canInjectAdmissionsReviewSlackFailure,
  postAdmissionsReviewSlackMessage,
  readAdmissionsReviewSlackConfig,
} from './admissionsReviewSlack';

describe('admissions review Slack delivery', () => {
  it('allows controlled pre-send failures only for the matching operational proof', () => {
    expect(
      canInjectAdmissionsReviewSlackFailure({
        releaseKind: 'operational_proof',
        proofScenario: 'proof-plan001-20260820',
        confirmationId: 'proof-plan001-20260820',
      }),
    ).toBe(true);
    expect(
      canInjectAdmissionsReviewSlackFailure({
        releaseKind: 'canonical_change',
        proofScenario: null,
        confirmationId: 'proof-plan001-20260820',
      }),
    ).toBe(false);
  });

  it('reuses the configured ready-PR channel before any legacy admissions-specific variable', () => {
    expect(
      readAdmissionsReviewSlackConfig({
        SLACK_BOT_TOKEN: 'xoxb-token',
        SLACK_READY_PR_CHANNEL_ID: 'C0BBT7304SF',
        SLACK_ADMISSIONS_REVIEW_CHANNEL_ID: 'C-legacy',
      }),
    ).toEqual({ slackBotToken: 'xoxb-token', slackChannelId: 'C0BBT7304SF' });
  });

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

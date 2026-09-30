import { describe, expect, it, vi } from 'vitest';

import { slackRequest } from '../../../scripts/verify-admissions-review-slack.mjs';

describe('admissions review Slack preflight', () => {
  it('times out when Slack sends headers but never finishes its response body', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: () => new Promise(() => {}),
      } as Response);
      const result = slackRequest('auth.test', 'xoxb-token', fetcher, 10);
      const rejection = expect(result).rejects.toThrow(
        'Slack preflight request timed out after 10ms.',
      );

      await vi.advanceTimersByTimeAsync(10);

      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});

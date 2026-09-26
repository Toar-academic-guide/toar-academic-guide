import { afterEach, describe, expect, it, vi } from 'vitest';

import { runAdmissionsReviewNotificationCli } from '../../../scripts/notify-admissions-review.mjs';

describe('admissions review notification script', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('closes the database pool after an already-sent run without posting a duplicate', async () => {
    const closeDb = vi.fn().mockResolvedValue(undefined);
    const ledger = {
      getRun: vi.fn().mockResolvedValue({ slackStatus: 'sent' }),
      recordPullRequest: vi.fn().mockResolvedValue(undefined),
    };
    const postAdmissionsReviewSlackMessage = vi.fn();
    const vite = {
      close: vi.fn().mockResolvedValue(undefined),
      ssrLoadModule: vi.fn(async (path: string) => {
        if (path === '/src/server/admissions/admissionsReviewRunLedger.ts') {
          return { createAdmissionsReviewRunLedger: () => ledger };
        }
        if (path === '/src/server/admissions/weeklyReviewRun.ts') {
          return { buildAdmissionsReviewSlackMessage: vi.fn() };
        }
        if (path === '/src/server/automation/admissionsReviewSlack.ts') {
          return {
            canInjectAdmissionsReviewSlackFailure: vi.fn(),
            postAdmissionsReviewSlackMessage,
            shouldPostAdmissionsReviewSlack: (status: string | undefined) => status !== 'sent',
          };
        }
        if (path === '/src/db/client.ts') return { closeDb };
        throw new Error(`Unexpected module: ${path}`);
      }),
    };
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const exit = vi.fn();

    await runAdmissionsReviewNotificationCli(
      ['--run-file', 'scratch/admissions-review/run.json'],
      {
        createViteServer: vi.fn().mockResolvedValue(vite),
        readRunFile: vi.fn().mockResolvedValue(JSON.stringify({ run: { runKey: '2026-W40' } })),
      },
      exit,
    );

    expect(postAdmissionsReviewSlackMessage).not.toHaveBeenCalled();
    expect(closeDb).toHaveBeenCalledOnce();
    expect(vite.close).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({ status: 'already_sent', runKey: '2026-W40' }),
    );
  });
});

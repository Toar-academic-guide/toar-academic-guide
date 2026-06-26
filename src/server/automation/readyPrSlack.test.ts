import { describe, expect, it, vi } from 'vitest';

import {
  buildReadyPrSlackMessage,
  evaluateReadyPrNotification,
  getReadyPrSlackConfig,
  READY_PR_NOTIFICATION_LABEL,
  resolvePrNumberFromEvent,
  runReadyPrSlackNotification,
  type GitHubPullRequest,
  type GitHubPullRequestReview,
  type GitHubWorkflowRun,
} from './readyPrSlack';

function createPullRequest(overrides: Partial<GitHubPullRequest> = {}): GitHubPullRequest {
  return {
    number: 123,
    state: 'open',
    draft: false,
    title: 'Tighten ready PR Slack notification',
    html_url: 'https://github.com/Toar-academic-guide/toar-academic-guide/pull/123',
    mergeable: true,
    mergeable_state: 'clean',
    labels: [],
    user: { login: 'amit' },
    head: {
      sha: 'abc123',
      ref: 'chore-ready-pr-slack-notification',
    },
    base: {
      ref: 'main',
    },
    ...overrides,
  };
}

function createReview(overrides: Partial<GitHubPullRequestReview> = {}): GitHubPullRequestReview {
  return {
    id: 1,
    state: 'APPROVED',
    submitted_at: '2026-06-25T10:00:00Z',
    user: { login: 'funksinatra' },
    ...overrides,
  };
}

function createWorkflowRun(overrides: Partial<GitHubWorkflowRun> = {}): GitHubWorkflowRun {
  return {
    id: 100,
    name: 'CI',
    head_sha: 'abc123',
    status: 'completed',
    conclusion: 'success',
    html_url: 'https://github.com/Toar-academic-guide/toar-academic-guide/actions/runs/100',
    created_at: '2026-06-25T10:10:00Z',
    run_started_at: '2026-06-25T10:11:00Z',
    ...overrides,
  };
}

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

describe('evaluateReadyPrNotification', () => {
  it('returns ready for an open approved mergeable PR with required workflows green', () => {
    const evaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest(),
        reviews: [createReview()],
        workflowRuns: [createWorkflowRun()],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: true,
        requiredWorkflowNames: ['CI'],
      },
    );

    expect(evaluation).toMatchObject({
      ready: true,
      approvers: ['funksinatra'],
      ciSummary: 'CI: success',
    });
  });

  it('blocks draft pull requests', () => {
    const evaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest({ draft: true }),
        reviews: [createReview()],
        workflowRuns: [createWorkflowRun()],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: true,
        requiredWorkflowNames: ['CI'],
      },
    );

    expect(evaluation).toMatchObject({
      ready: false,
      reason: 'pr_draft',
    });
  });

  it('blocks when a changes-requested review is still current', () => {
    const evaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest(),
        reviews: [
          createReview({
            id: 1,
            state: 'APPROVED',
            submitted_at: '2026-06-25T10:00:00Z',
            user: { login: 'reviewer-a' },
          }),
          createReview({
            id: 2,
            state: 'CHANGES_REQUESTED',
            submitted_at: '2026-06-25T10:05:00Z',
            user: { login: 'reviewer-b' },
          }),
        ],
        workflowRuns: [createWorkflowRun()],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: true,
        requiredWorkflowNames: ['CI'],
      },
    );

    expect(evaluation).toMatchObject({
      ready: false,
      reason: 'changes_requested',
    });
  });

  it('blocks when the required workflow is pending, failed, or missing', () => {
    const pendingEvaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest(),
        reviews: [createReview()],
        workflowRuns: [createWorkflowRun({ status: 'in_progress', conclusion: null })],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: true,
        requiredWorkflowNames: ['CI'],
      },
    );

    const failedEvaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest(),
        reviews: [createReview()],
        workflowRuns: [createWorkflowRun({ conclusion: 'failure' })],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: true,
        requiredWorkflowNames: ['CI'],
      },
    );

    const missingEvaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest(),
        reviews: [createReview()],
        workflowRuns: [],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: true,
        requiredWorkflowNames: ['CI'],
      },
    );

    expect(pendingEvaluation).toMatchObject({
      ready: false,
      reason: 'required_workflows_incomplete',
      ciSummary: 'CI: pending',
    });
    expect(failedEvaluation).toMatchObject({
      ready: false,
      reason: 'required_workflows_incomplete',
      ciSummary: 'CI: failure',
    });
    expect(missingEvaluation).toMatchObject({
      ready: false,
      reason: 'required_workflows_incomplete',
      ciSummary: 'CI: missing',
    });
  });

  it('blocks duplicate notifications and unresolved mergeability', () => {
    const duplicateEvaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest({
          labels: [{ name: READY_PR_NOTIFICATION_LABEL }],
        }),
        reviews: [createReview()],
        workflowRuns: [createWorkflowRun()],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: true,
        requiredWorkflowNames: ['CI'],
      },
    );

    const pendingMergeabilityEvaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest({
          mergeable: null,
          mergeable_state: 'unknown',
        }),
        reviews: [createReview()],
        workflowRuns: [createWorkflowRun()],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: true,
        requiredWorkflowNames: ['CI'],
      },
    );

    expect(duplicateEvaluation).toMatchObject({
      ready: false,
      reason: 'already_notified',
    });
    expect(pendingMergeabilityEvaluation).toMatchObject({
      ready: false,
      reason: 'mergeability_pending',
    });
  });

  it('treats review-gated blocked PRs as ready when approval enforcement is disabled', () => {
    const evaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest({
          mergeable_state: 'blocked',
        }),
        reviews: [],
        workflowRuns: [createWorkflowRun()],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: false,
        requiredWorkflowNames: ['CI'],
      },
    );

    expect(evaluation).toMatchObject({
      ready: true,
      approvers: [],
      ciSummary: 'CI: success',
    });
  });

  it('still blocks missing approvals when approval enforcement is enabled', () => {
    const evaluation = evaluateReadyPrNotification(
      {
        pullRequest: createPullRequest({
          mergeable_state: 'blocked',
        }),
        reviews: [],
        workflowRuns: [createWorkflowRun()],
      },
      {
        notificationLabel: READY_PR_NOTIFICATION_LABEL,
        requireApproval: true,
        requiredWorkflowNames: ['CI'],
      },
    );

    expect(evaluation).toMatchObject({
      ready: false,
      reason: 'pr_not_mergeable',
    });
  });
});

describe('buildReadyPrSlackMessage', () => {
  it('includes the expected title, author, branch, approval, and CI metadata', () => {
    const message = buildReadyPrSlackMessage(
      {
        pullRequest: createPullRequest(),
        reviews: [createReview()],
        workflowRuns: [createWorkflowRun()],
      },
      {
        ready: true,
        approvers: ['funksinatra'],
        workflowStatuses: [
          {
            name: 'CI',
            status: 'success',
            conclusion: 'success',
          },
        ],
        ciSummary: 'CI: success',
      },
    );

    expect(message.text).toContain('PR ready to merge');
    expect(JSON.stringify(message.blocks)).toContain('funksinatra');
    expect(JSON.stringify(message.blocks)).toContain('chore-ready-pr-slack-notification');
    expect(JSON.stringify(message.blocks)).toContain('CI: success');
  });
});

describe('resolvePrNumberFromEvent', () => {
  it('resolves workflow_run, review, and manual-dispatch PR numbers', () => {
    expect(
      resolvePrNumberFromEvent('workflow_run', {
        workflow_run: {
          conclusion: 'success',
          pull_requests: [{ number: 18 }],
        },
      }),
    ).toEqual({ prNumber: 18 });

    expect(
      resolvePrNumberFromEvent('pull_request_review', {
        pull_request: {
          number: 41,
        },
      }),
    ).toEqual({ prNumber: 41 });

    expect(
      resolvePrNumberFromEvent(
        'workflow_dispatch',
        {},
        {
          INPUT_PR_NUMBER: '55',
        },
      ),
    ).toEqual({ prNumber: 55 });
  });

  it('returns no-op reasons for ineligible workflow runs and PR-less events', () => {
    expect(
      resolvePrNumberFromEvent('workflow_run', {
        workflow_run: {
          conclusion: 'failure',
          pull_requests: [{ number: 18 }],
        },
      }),
    ).toEqual({ reason: 'workflow_not_success' });

    expect(resolvePrNumberFromEvent('workflow_dispatch', {})).toEqual({
      reason: 'event_has_no_pr',
    });
  });
});

describe('getReadyPrSlackConfig', () => {
  it('defaults to the CI workflow and default label', () => {
    expect(getReadyPrSlackConfig({})).toMatchObject({
      requireApproval: false,
      requiredWorkflowNames: ['CI'],
      notificationLabel: READY_PR_NOTIFICATION_LABEL,
    });
  });

  it('parses comma-separated workflow overrides and optional approval enforcement', () => {
    expect(
      getReadyPrSlackConfig({
        READY_PR_REQUIRE_APPROVAL: 'true',
        READY_PR_REQUIRED_WORKFLOWS: 'CI, Preview',
        READY_PR_NOTIFICATION_LABEL: 'custom/ready',
      }),
    ).toMatchObject({
      requireApproval: true,
      requiredWorkflowNames: ['CI', 'Preview'],
      notificationLabel: 'custom/ready',
    });
  });
});

describe('runReadyPrSlackNotification', () => {
  it('returns a no-op when Slack configuration is missing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createPullRequest()))
      .mockResolvedValueOnce(createJsonResponse([createReview()]))
      .mockResolvedValueOnce(createJsonResponse({ workflow_runs: [createWorkflowRun()] }));

    await expect(
      runReadyPrSlackNotification({
        env: {
          GITHUB_EVENT_NAME: 'pull_request_review',
          GITHUB_EVENT_PATH: '/tmp/event.json',
          GITHUB_REPOSITORY: 'Toar-academic-guide/toar-academic-guide',
          GITHUB_TOKEN: 'github-token',
        },
        readFile: async () =>
          JSON.stringify({
            pull_request: {
              number: 123,
            },
          }),
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).resolves.toEqual({
      status: 'noop',
      reason: 'slack_config_missing',
      prNumber: 123,
    });
  });

  it('posts to Slack and adds the notification label for a ready PR', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createPullRequest()))
      .mockResolvedValueOnce(createJsonResponse([createReview()]))
      .mockResolvedValueOnce(createJsonResponse({ workflow_runs: [createWorkflowRun()] }))
      .mockResolvedValueOnce(createJsonResponse({ name: READY_PR_NOTIFICATION_LABEL }, 201))
      .mockResolvedValueOnce(createJsonResponse(createPullRequest()))
      .mockResolvedValueOnce(createJsonResponse({ ok: true, ts: '123.456' }))
      .mockResolvedValueOnce(createJsonResponse([{ name: READY_PR_NOTIFICATION_LABEL }], 200));

    const result = await runReadyPrSlackNotification({
      env: {
        GITHUB_EVENT_NAME: 'workflow_run',
        GITHUB_EVENT_PATH: '/tmp/event.json',
        GITHUB_REPOSITORY: 'Toar-academic-guide/toar-academic-guide',
        GITHUB_TOKEN: 'github-token',
        SLACK_BOT_TOKEN: 'slack-token',
        SLACK_READY_PR_CHANNEL_ID: 'C123',
      },
      readFile: async () =>
        JSON.stringify({
          workflow_run: {
            conclusion: 'success',
            pull_requests: [{ number: 123 }],
          },
        }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result).toEqual({
      status: 'sent',
      prNumber: 123,
      slackTimestamp: '123.456',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://slack.com/api/chat.postMessage',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('retries mergeability resolution before evaluating readiness', async () => {
    const sleepMock = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          createPullRequest({
            mergeable: null,
            mergeable_state: 'unknown',
          }),
        ),
      )
      .mockResolvedValueOnce(createJsonResponse(createPullRequest()))
      .mockResolvedValueOnce(createJsonResponse([]))
      .mockResolvedValueOnce(createJsonResponse({ workflow_runs: [createWorkflowRun()] }))
      .mockResolvedValueOnce(createJsonResponse({ name: READY_PR_NOTIFICATION_LABEL }, 201))
      .mockResolvedValueOnce(createJsonResponse(createPullRequest()))
      .mockResolvedValueOnce(createJsonResponse({ ok: true, ts: '123.456' }))
      .mockResolvedValueOnce(createJsonResponse([{ name: READY_PR_NOTIFICATION_LABEL }], 200));

    await expect(
      runReadyPrSlackNotification({
        env: {
          GITHUB_EVENT_NAME: 'workflow_dispatch',
          GITHUB_EVENT_PATH: '/tmp/event.json',
          GITHUB_REPOSITORY: 'Toar-academic-guide/toar-academic-guide',
          GITHUB_TOKEN: 'github-token',
          INPUT_PR_NUMBER: '123',
          SLACK_BOT_TOKEN: 'slack-token',
          SLACK_READY_PR_CHANNEL_ID: 'C123',
        },
        readFile: async () => JSON.stringify({}),
        fetchImpl: fetchMock as unknown as typeof fetch,
        sleep: sleepMock,
      }),
    ).resolves.toEqual({
      status: 'sent',
      prNumber: 123,
      slackTimestamp: '123.456',
    });

    expect(sleepMock).toHaveBeenCalledTimes(1);
  });

  it('does not post if the label appears during the final pre-post refresh', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createPullRequest()))
      .mockResolvedValueOnce(createJsonResponse([createReview()]))
      .mockResolvedValueOnce(createJsonResponse({ workflow_runs: [createWorkflowRun()] }))
      .mockResolvedValueOnce(createJsonResponse({ name: READY_PR_NOTIFICATION_LABEL }, 201))
      .mockResolvedValueOnce(
        createJsonResponse(
          createPullRequest({
            labels: [{ name: READY_PR_NOTIFICATION_LABEL }],
          }),
        ),
      );

    await expect(
      runReadyPrSlackNotification({
        env: {
          GITHUB_EVENT_NAME: 'pull_request_target',
          GITHUB_EVENT_PATH: '/tmp/event.json',
          GITHUB_REPOSITORY: 'Toar-academic-guide/toar-academic-guide',
          GITHUB_TOKEN: 'github-token',
          SLACK_BOT_TOKEN: 'slack-token',
          SLACK_READY_PR_CHANNEL_ID: 'C123',
        },
        readFile: async () =>
          JSON.stringify({
            pull_request: {
              number: 123,
            },
          }),
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).resolves.toEqual({
      status: 'noop',
      reason: 'already_notified',
      prNumber: 123,
    });
  });

  it('throws when Slack rejects the message', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createPullRequest()))
      .mockResolvedValueOnce(createJsonResponse([createReview()]))
      .mockResolvedValueOnce(createJsonResponse({ workflow_runs: [createWorkflowRun()] }))
      .mockResolvedValueOnce(createJsonResponse({ name: READY_PR_NOTIFICATION_LABEL }, 201))
      .mockResolvedValueOnce(createJsonResponse(createPullRequest()))
      .mockResolvedValueOnce(createJsonResponse({ ok: false, error: 'channel_not_found' }));

    await expect(
      runReadyPrSlackNotification({
        env: {
          GITHUB_EVENT_NAME: 'pull_request_review',
          GITHUB_EVENT_PATH: '/tmp/event.json',
          GITHUB_REPOSITORY: 'Toar-academic-guide/toar-academic-guide',
          GITHUB_TOKEN: 'github-token',
          SLACK_BOT_TOKEN: 'slack-token',
          SLACK_READY_PR_CHANNEL_ID: 'C123',
        },
        readFile: async () =>
          JSON.stringify({
            pull_request: {
              number: 123,
            },
          }),
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/channel_not_found/);
  });
});

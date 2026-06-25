export const DEFAULT_REQUIRED_WORKFLOWS = ['CI'] as const;
export const READY_PR_NOTIFICATION_LABEL = 'automation/slack-ready-notified';
const DEFAULT_GITHUB_API_URL = 'https://api.github.com';
const DEFAULT_LABEL_COLOR = '1f883d';

type EnvMap = Record<string, string | undefined>;

export type GitHubLabel = {
  name?: string;
};

export type GitHubUser = {
  login?: string;
};

export type GitHubPullRequest = {
  number: number;
  state: string;
  draft: boolean;
  title: string;
  html_url: string;
  mergeable: boolean | null;
  mergeable_state?: string | null;
  labels: GitHubLabel[];
  user?: GitHubUser | null;
  head: {
    sha: string;
    ref: string;
  };
  base: {
    ref: string;
  };
};

export type GitHubPullRequestReview = {
  id?: number;
  state?: string;
  submitted_at?: string | null;
  user?: GitHubUser | null;
};

export type GitHubWorkflowRun = {
  id?: number;
  name?: string;
  head_sha?: string;
  status?: string | null;
  conclusion?: string | null;
  html_url?: string;
  created_at?: string;
  run_started_at?: string | null;
};

export type ReadyPrSnapshot = {
  pullRequest: GitHubPullRequest;
  reviews: GitHubPullRequestReview[];
  workflowRuns: GitHubWorkflowRun[];
};

export type WorkflowStatusSummary = {
  name: string;
  status: 'success' | 'pending' | 'failed' | 'missing';
  conclusion: string | null;
  url?: string;
};

export type ReadyPrConfig = {
  githubApiUrl: string;
  githubToken?: string;
  slackBotToken?: string;
  slackChannelId?: string;
  requiredWorkflowNames: string[];
  notificationLabel: string;
};

export type ReadyPrEvaluation =
  | {
      ready: true;
      approvers: string[];
      workflowStatuses: WorkflowStatusSummary[];
      ciSummary: string;
    }
  | {
      ready: false;
      reason:
        | 'pr_closed'
        | 'pr_draft'
        | 'already_notified'
        | 'mergeability_pending'
        | 'pr_not_mergeable'
        | 'changes_requested'
        | 'approval_missing'
        | 'required_workflows_incomplete';
      approvers: string[];
      workflowStatuses: WorkflowStatusSummary[];
      ciSummary: string;
    };

export type SlackMessagePayload = {
  text: string;
  blocks: Array<Record<string, unknown>>;
};

export type ReadyPrNotificationResult =
  | {
      status: 'noop';
      reason: string;
      prNumber?: number;
    }
  | {
      status: 'sent';
      prNumber: number;
      slackTimestamp?: string;
    };

type GitHubRepositoryRef = {
  owner: string;
  repo: string;
};

type WorkflowRunTriggerPayload = {
  workflow_run?: {
    conclusion?: string;
    pull_requests?: Array<{
      number?: number;
    }>;
  };
};

type PullRequestTriggerPayload = {
  pull_request?: {
    number?: number;
  };
};

type GithubRequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
};

type FetchLike = typeof fetch;

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sortWorkflowRunsDesc(a: GitHubWorkflowRun, b: GitHubWorkflowRun): number {
  const aTime = Date.parse(a.run_started_at ?? a.created_at ?? '') || 0;
  const bTime = Date.parse(b.run_started_at ?? b.created_at ?? '') || 0;

  if (aTime !== bTime) {
    return bTime - aTime;
  }

  return (b.id ?? 0) - (a.id ?? 0);
}

function sortReviewsAsc(a: GitHubPullRequestReview, b: GitHubPullRequestReview): number {
  const aTime = Date.parse(a.submitted_at ?? '') || 0;
  const bTime = Date.parse(b.submitted_at ?? '') || 0;

  if (aTime !== bTime) {
    return aTime - bTime;
  }

  return (a.id ?? 0) - (b.id ?? 0);
}

function hasNotificationLabel(pullRequest: GitHubPullRequest, notificationLabel: string): boolean {
  return pullRequest.labels.some((label) => label.name === notificationLabel);
}

function escapeSlackMrkdwn(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function summarizeReviews(reviews: GitHubPullRequestReview[]): {
  approvers: string[];
  blockingReviewers: string[];
} {
  const latestReviewStateByUser = new Map<string, string>();

  for (const review of [...reviews].sort(sortReviewsAsc)) {
    const reviewer = review.user?.login?.trim();
    const state = review.state?.trim().toUpperCase();

    if (!reviewer || !state) {
      continue;
    }

    latestReviewStateByUser.set(reviewer, state);
  }

  const approvers: string[] = [];
  const blockingReviewers: string[] = [];

  for (const [reviewer, state] of latestReviewStateByUser.entries()) {
    if (state === 'CHANGES_REQUESTED') {
      blockingReviewers.push(reviewer);
      continue;
    }

    if (state === 'APPROVED') {
      approvers.push(reviewer);
    }
  }

  approvers.sort();
  blockingReviewers.sort();

  return { approvers, blockingReviewers };
}

function summarizeRequiredWorkflowStatuses(
  workflowRuns: GitHubWorkflowRun[],
  headSha: string,
  requiredWorkflowNames: string[],
): WorkflowStatusSummary[] {
  return requiredWorkflowNames.map((requiredWorkflowName) => {
    const latestRun = workflowRuns
      .filter(
        (workflowRun) =>
          workflowRun.head_sha === headSha && workflowRun.name?.trim() === requiredWorkflowName,
      )
      .sort(sortWorkflowRunsDesc)[0];

    if (!latestRun) {
      return {
        name: requiredWorkflowName,
        status: 'missing',
        conclusion: null,
      };
    }

    if (latestRun.status !== 'completed') {
      return {
        name: requiredWorkflowName,
        status: 'pending',
        conclusion: latestRun.conclusion ?? null,
        url: latestRun.html_url,
      };
    }

    if (latestRun.conclusion === 'success') {
      return {
        name: requiredWorkflowName,
        status: 'success',
        conclusion: latestRun.conclusion,
        url: latestRun.html_url,
      };
    }

    return {
      name: requiredWorkflowName,
      status: 'failed',
      conclusion: latestRun.conclusion ?? 'unknown',
      url: latestRun.html_url,
    };
  });
}

function buildCiSummary(workflowStatuses: WorkflowStatusSummary[]): string {
  return workflowStatuses
    .map((workflowStatus) => {
      if (workflowStatus.status === 'success') {
        return `${workflowStatus.name}: success`;
      }

      if (workflowStatus.status === 'missing') {
        return `${workflowStatus.name}: missing`;
      }

      if (workflowStatus.status === 'pending') {
        return `${workflowStatus.name}: pending`;
      }

      return `${workflowStatus.name}: ${workflowStatus.conclusion ?? 'failed'}`;
    })
    .join(', ');
}

function isMergeabilityBlocked(mergeableState: string | null | undefined): boolean {
  if (!mergeableState) {
    return false;
  }

  return ['blocked', 'dirty', 'behind', 'draft', 'unknown'].includes(mergeableState);
}

export function getReadyPrSlackConfig(env: EnvMap = process.env): ReadyPrConfig {
  const requiredWorkflowNames = parseCsv(env.READY_PR_REQUIRED_WORKFLOWS).filter(Boolean);

  return {
    githubApiUrl: env.GITHUB_API_URL?.trim() || DEFAULT_GITHUB_API_URL,
    githubToken: env.GITHUB_TOKEN?.trim(),
    slackBotToken: env.SLACK_BOT_TOKEN?.trim(),
    slackChannelId: env.SLACK_READY_PR_CHANNEL_ID?.trim(),
    requiredWorkflowNames:
      requiredWorkflowNames.length > 0
        ? requiredWorkflowNames
        : [...DEFAULT_REQUIRED_WORKFLOWS],
    notificationLabel: env.READY_PR_NOTIFICATION_LABEL?.trim() || READY_PR_NOTIFICATION_LABEL,
  };
}

export function evaluateReadyPrNotification(
  snapshot: ReadyPrSnapshot,
  config: Pick<ReadyPrConfig, 'notificationLabel' | 'requiredWorkflowNames'>,
): ReadyPrEvaluation {
  const { pullRequest, reviews, workflowRuns } = snapshot;
  const { approvers, blockingReviewers } = summarizeReviews(reviews);
  const workflowStatuses = summarizeRequiredWorkflowStatuses(
    workflowRuns,
    pullRequest.head.sha,
    config.requiredWorkflowNames,
  );
  const ciSummary = buildCiSummary(workflowStatuses);

  if (pullRequest.state !== 'open') {
    return {
      ready: false,
      reason: 'pr_closed',
      approvers,
      workflowStatuses,
      ciSummary,
    };
  }

  if (pullRequest.draft) {
    return {
      ready: false,
      reason: 'pr_draft',
      approvers,
      workflowStatuses,
      ciSummary,
    };
  }

  if (hasNotificationLabel(pullRequest, config.notificationLabel)) {
    return {
      ready: false,
      reason: 'already_notified',
      approvers,
      workflowStatuses,
      ciSummary,
    };
  }

  if (pullRequest.mergeable === null) {
    return {
      ready: false,
      reason: 'mergeability_pending',
      approvers,
      workflowStatuses,
      ciSummary,
    };
  }

  if (!pullRequest.mergeable || isMergeabilityBlocked(pullRequest.mergeable_state)) {
    return {
      ready: false,
      reason: 'pr_not_mergeable',
      approvers,
      workflowStatuses,
      ciSummary,
    };
  }

  if (blockingReviewers.length > 0) {
    return {
      ready: false,
      reason: 'changes_requested',
      approvers,
      workflowStatuses,
      ciSummary,
    };
  }

  if (approvers.length === 0) {
    return {
      ready: false,
      reason: 'approval_missing',
      approvers,
      workflowStatuses,
      ciSummary,
    };
  }

  if (workflowStatuses.some((workflowStatus) => workflowStatus.status !== 'success')) {
    return {
      ready: false,
      reason: 'required_workflows_incomplete',
      approvers,
      workflowStatuses,
      ciSummary,
    };
  }

  return {
    ready: true,
    approvers,
    workflowStatuses,
    ciSummary,
  };
}

export function buildReadyPrSlackMessage(
  snapshot: ReadyPrSnapshot,
  evaluation: Extract<ReadyPrEvaluation, { ready: true }>,
): SlackMessagePayload {
  const { pullRequest } = snapshot;
  const title = escapeSlackMrkdwn(pullRequest.title);
  const author = escapeSlackMrkdwn(pullRequest.user?.login?.trim() || 'unknown');
  const baseBranch = escapeSlackMrkdwn(pullRequest.base.ref);
  const headBranch = escapeSlackMrkdwn(pullRequest.head.ref);
  const approvers = evaluation.approvers.map(escapeSlackMrkdwn).join(', ');
  const ciSummary = escapeSlackMrkdwn(evaluation.ciSummary);
  const text = `PR ready to merge: ${pullRequest.title} (#${pullRequest.number})`;

  return {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Ready to merge*\n<${pullRequest.html_url}|${title}> *#${pullRequest.number}*`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Author*\n${author}`,
          },
          {
            type: 'mrkdwn',
            text: `*Branches*\n${headBranch} -> ${baseBranch}`,
          },
          {
            type: 'mrkdwn',
            text: `*Approvals*\n${approvers}`,
          },
          {
            type: 'mrkdwn',
            text: `*CI*\n${ciSummary}`,
          },
        ],
      },
    ],
  };
}

function parseRepositoryRef(repository: string | undefined): GitHubRepositoryRef {
  const [owner, repo] = repository?.split('/') ?? [];

  if (!owner || !repo) {
    throw new Error('Missing GITHUB_REPOSITORY. Expected the repository in owner/name form.');
  }

  return { owner, repo };
}

async function parseEventPayload(
  env: EnvMap,
  readFile: (path: string) => Promise<string>,
): Promise<Record<string, unknown>> {
  const eventPath = env.GITHUB_EVENT_PATH?.trim();

  if (!eventPath) {
    throw new Error('Missing GITHUB_EVENT_PATH. GitHub Actions event payload is required.');
  }

  return JSON.parse(await readFile(eventPath)) as Record<string, unknown>;
}

export function resolvePrNumberFromEvent(
  eventName: string | undefined,
  payload: Record<string, unknown>,
  env: EnvMap = process.env,
): {
  prNumber?: number;
  reason?: string;
} {
  const manualPrNumber = Number.parseInt(env.INPUT_PR_NUMBER?.trim() ?? '', 10);
  if (Number.isInteger(manualPrNumber) && manualPrNumber > 0) {
    return { prNumber: manualPrNumber };
  }

  if (eventName === 'workflow_run') {
    const workflowRunPayload = payload as WorkflowRunTriggerPayload;

    if (workflowRunPayload.workflow_run?.conclusion !== 'success') {
      return { reason: 'workflow_not_success' };
    }

    const associatedPullRequest = workflowRunPayload.workflow_run?.pull_requests?.[0];
    if (typeof associatedPullRequest?.number === 'number') {
      return { prNumber: associatedPullRequest.number };
    }

    return { reason: 'workflow_run_has_no_pr' };
  }

  const pullRequestPayload = payload as PullRequestTriggerPayload;
  const prNumber = pullRequestPayload.pull_request?.number;
  if (typeof prNumber === 'number') {
    return { prNumber };
  }

  return { reason: 'event_has_no_pr' };
}

async function githubRequest<T>(
  fetchImpl: FetchLike,
  config: Pick<ReadyPrConfig, 'githubApiUrl' | 'githubToken'>,
  path: string,
  options: GithubRequestOptions = {},
): Promise<T> {
  if (!config.githubToken) {
    throw new Error('Missing GITHUB_TOKEN. GitHub API access is required for ready PR checks.');
  }

  const response = await fetchImpl(`${config.githubApiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.githubToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'toar-ready-pr-slack-notifier',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `GitHub API request failed (${response.status}) for ${path}: ${bodyText || response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

async function fetchPullRequest(
  fetchImpl: FetchLike,
  config: Pick<ReadyPrConfig, 'githubApiUrl' | 'githubToken'>,
  repositoryRef: GitHubRepositoryRef,
  prNumber: number,
): Promise<GitHubPullRequest> {
  return githubRequest<GitHubPullRequest>(
    fetchImpl,
    config,
    `/repos/${repositoryRef.owner}/${repositoryRef.repo}/pulls/${prNumber}`,
  );
}

async function fetchPullRequestReviews(
  fetchImpl: FetchLike,
  config: Pick<ReadyPrConfig, 'githubApiUrl' | 'githubToken'>,
  repositoryRef: GitHubRepositoryRef,
  prNumber: number,
): Promise<GitHubPullRequestReview[]> {
  return githubRequest<GitHubPullRequestReview[]>(
    fetchImpl,
    config,
    `/repos/${repositoryRef.owner}/${repositoryRef.repo}/pulls/${prNumber}/reviews?per_page=100`,
  );
}

async function fetchWorkflowRuns(
  fetchImpl: FetchLike,
  config: Pick<ReadyPrConfig, 'githubApiUrl' | 'githubToken'>,
  repositoryRef: GitHubRepositoryRef,
  headSha: string,
): Promise<GitHubWorkflowRun[]> {
  const response = await githubRequest<{ workflow_runs?: GitHubWorkflowRun[] }>(
    fetchImpl,
    config,
    `/repos/${repositoryRef.owner}/${repositoryRef.repo}/actions/runs?head_sha=${encodeURIComponent(
      headSha,
    )}&per_page=100`,
  );

  return response.workflow_runs ?? [];
}

async function ensureRepositoryLabelExists(
  fetchImpl: FetchLike,
  config: Pick<ReadyPrConfig, 'githubApiUrl' | 'githubToken' | 'notificationLabel'>,
  repositoryRef: GitHubRepositoryRef,
): Promise<void> {
  const response = await fetchImpl(
    `${config.githubApiUrl}/repos/${repositoryRef.owner}/${repositoryRef.repo}/labels`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'toar-ready-pr-slack-notifier',
      },
      body: JSON.stringify({
        name: config.notificationLabel,
        color: DEFAULT_LABEL_COLOR,
        description: 'Ready PR Slack notification already sent',
      }),
    },
  );

  if (response.ok || response.status === 422) {
    return;
  }

  const bodyText = await response.text();
  throw new Error(
    `GitHub label creation failed (${response.status}) for ${config.notificationLabel}: ${bodyText || response.statusText}`,
  );
}

async function addLabelToPullRequest(
  fetchImpl: FetchLike,
  config: Pick<ReadyPrConfig, 'githubApiUrl' | 'githubToken'>,
  repositoryRef: GitHubRepositoryRef,
  prNumber: number,
  notificationLabel: string,
): Promise<void> {
  await githubRequest(
    fetchImpl,
    config,
    `/repos/${repositoryRef.owner}/${repositoryRef.repo}/issues/${prNumber}/labels`,
    {
      method: 'POST',
      body: {
        labels: [notificationLabel],
      },
    },
  );
}

async function postSlackMessage(
  fetchImpl: FetchLike,
  config: Pick<ReadyPrConfig, 'slackBotToken' | 'slackChannelId'>,
  payload: SlackMessagePayload,
): Promise<string | undefined> {
  if (!config.slackBotToken || !config.slackChannelId) {
    throw new Error('Slack configuration is required before posting a ready PR message.');
  }

  const response = await fetchImpl('https://slack.com/api/chat.postMessage', {
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
    const bodyText = await response.text();
    throw new Error(`Slack API request failed (${response.status}): ${bodyText || response.statusText}`);
  }

  const body = (await response.json()) as { ok?: boolean; error?: string; ts?: string };
  if (!body.ok) {
    throw new Error(`Slack API rejected the message: ${body.error ?? 'unknown_error'}`);
  }

  return body.ts;
}

export async function runReadyPrSlackNotification(options: {
  env?: EnvMap;
  fetchImpl?: FetchLike;
  readFile?: (path: string) => Promise<string>;
}): Promise<ReadyPrNotificationResult> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const readFile =
    options.readFile ??
    (async (path: string) => {
      const { readFile: readFileFromFs } = await import('node:fs/promises');
      return readFileFromFs(path, 'utf8');
    });
  const config = getReadyPrSlackConfig(env);
  const repositoryRef = parseRepositoryRef(env.GITHUB_REPOSITORY);
  const eventPayload = await parseEventPayload(env, readFile);
  const { prNumber, reason } = resolvePrNumberFromEvent(env.GITHUB_EVENT_NAME, eventPayload, env);

  if (!prNumber) {
    return {
      status: 'noop',
      reason: reason ?? 'event_has_no_pr',
    };
  }

  const pullRequest = await fetchPullRequest(fetchImpl, config, repositoryRef, prNumber);
  const [reviews, workflowRuns] = await Promise.all([
    fetchPullRequestReviews(fetchImpl, config, repositoryRef, prNumber),
    fetchWorkflowRuns(fetchImpl, config, repositoryRef, pullRequest.head.sha),
  ]);
  const snapshot = { pullRequest, reviews, workflowRuns };
  const evaluation = evaluateReadyPrNotification(snapshot, config);

  if (!evaluation.ready) {
    return {
      status: 'noop',
      reason: evaluation.reason,
      prNumber,
    };
  }

  if (!config.slackBotToken || !config.slackChannelId) {
    return {
      status: 'noop',
      reason: 'slack_config_missing',
      prNumber,
    };
  }

  await ensureRepositoryLabelExists(fetchImpl, config, repositoryRef);

  const refreshedPullRequest = await fetchPullRequest(fetchImpl, config, repositoryRef, prNumber);
  if (hasNotificationLabel(refreshedPullRequest, config.notificationLabel)) {
    return {
      status: 'noop',
      reason: 'already_notified',
      prNumber,
    };
  }

  const slackMessagePayload = buildReadyPrSlackMessage(
    {
      ...snapshot,
      pullRequest: refreshedPullRequest,
    },
    evaluation,
  );
  const slackTimestamp = await postSlackMessage(fetchImpl, config, slackMessagePayload);
  await addLabelToPullRequest(fetchImpl, config, repositoryRef, prNumber, config.notificationLabel);

  return {
    status: 'sent',
    prNumber,
    slackTimestamp,
  };
}

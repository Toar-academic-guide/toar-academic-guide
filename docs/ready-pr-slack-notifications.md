# Ready PR Slack Notifications

This repo can post one Slack message when a pull request first becomes ready to merge.

## What "ready" means

- The pull request is open.
- The pull request is not a draft.
- The pull request has at least one current approval and no current `CHANGES_REQUESTED` review state.
- GitHub reports the pull request as mergeable.
- The required workflows for the current head commit have completed successfully.

By default, the required workflow list is just `CI`.

## Required GitHub configuration

1. Create or reuse a Slack app that has the `chat:write` bot scope.
2. Install that Slack app into the workspace where you want notifications.
3. Invite the app to the target channel.
4. Add the repository secret `SLACK_BOT_TOKEN` with the bot token value.
5. Add the repository variable `SLACK_READY_PR_CHANNEL_ID` with the Slack channel ID.

That is the full required setup. Without those two GitHub values, the workflow exits successfully with a setup no-op instead of failing PR automation.

## Optional GitHub configuration

- `READY_PR_REQUIRED_WORKFLOWS`
  Use a comma-separated repository variable only if the default `CI` workflow name is no longer enough.
  Example: `CI, Preview`
- `READY_PR_NOTIFICATION_LABEL`
  Use a repository variable only if you want to override the default label name `automation/slack-ready-notified`.

## Operational notes

- The workflow runs from the default branch in `pull_request_target` and `workflow_run` contexts. It does not execute code from the pull request head.
- Duplicate suppression uses the pull request label `automation/slack-ready-notified` by default.
- If you need to re-send a notification, remove that label from the pull request and re-run the `Ready PR Slack` workflow manually with the PR number.
- This setup is GitHub Actions-only. It does not use Vercel environment variables and does not affect app runtime configuration.

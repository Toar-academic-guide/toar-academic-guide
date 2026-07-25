# Weekly reviewed admissions updates

The `Admissions Source Freshness` workflow is the only automation path that proposes reviewed admissions changes. It runs every Sunday at 03:00 UTC and never publishes a rule itself. A merged GitHub PR remains the human approval boundary.

## Required configuration

Before enabling the scheduled workflow, configure these repository settings:

- `DATABASE_URL` secret: database access for source freshness persistence and published-rule baselines.
- `ADMISSIONS_GITHUB_APP_ID` and `ADMISSIONS_GITHUB_APP_PRIVATE_KEY` secrets: a least-privileged GitHub App that can create and update the generated review branch and PR.
- `ADMISSIONS_CYCLE` repository variable: the four-digit admission cycle to evaluate.
- `SLACK_BOT_TOKEN` secret and `SLACK_ADMISSIONS_REVIEW_CHANNEL_ID` repository variable: the dedicated reviewer handoff channel.

The GitHub App must have only the repository permissions required to write contents and pull requests. Slack delivery is retryable and cannot publish, approve, or alter an admissions rule.

## How a weekly run behaves

1. The workflow creates a stable weekly identity such as `2026-W30` and reuses `automation/admissions-review-2026-W30`.
2. It persists freshness evidence, compares exact official decision-capable proofs to published reviewed rules, and reports partial, blocked, failed, or unchanged sources as exclusions.
3. If safe changes exist, it updates one data-only PR containing the reviewed manifest, a readable evidence report, and the exclusion metadata. It validates the entire generated branch against an allowlist before committing.
4. It sends one Slack handoff with the PR link, or a no-change summary if no PR is needed.
5. If no candidates remain for an existing run (including after reviewer exclusions), the workflow closes that open PR. It never leaves a stale candidate open for merge.

## Reviewer procedure

Review the before/after values, source links, manifest validation, and affected tests. Only merge when the included values are correct.

To exclude a disputed candidate while keeping the rest of the batch:

1. In the generated PR, edit `docs/admissions-review-runs/<run-key>.json` only.
2. Add the candidate id from the report to `excludedCandidateIds`.
3. Run **Admissions Source Freshness** manually for the same ISO week. The workflow restores that branch, regenerates the manifest/report, and reruns the validation and focused tests.

Do not hand-edit `reviewedManifest.json`; generated-branch validation rejects unrelated paths and malformed metadata. Excluded items remain in the report as `reviewer_excluded` investigation records.

## MVP coverage and escalation

TAU decision-capable official proofs may produce cutoff changes when they match a published baseline. BGU score-only evidence is intentionally reported as partial and cannot generate a cutoff or verdict update until an official cutoff-proof contract exists. Parser drift, unavailable sources, and capability gaps remain exclusions; they need normal engineering work rather than an automated data PR.

Use `/internal/data-health` to inspect the full admissions evidence inventory and source coverage. Its configured/exact/partial/blocked/failed states are operational reporting, not a claim that all institutions can safely generate updates.

## Recovery and rollback

- To retry a Slack failure, rerun the workflow for the same weekly run; the run ledger keeps PR state and retries delivery without creating a duplicate PR.
- To retry a failed generated PR, fix the source contract or exclusion metadata, then rerun the same week so the same branch and PR are updated.
- To reverse a merged reviewed change, use a normal reviewed corrective PR with official evidence. Do not change release tables or canonical data through the internal review UI.

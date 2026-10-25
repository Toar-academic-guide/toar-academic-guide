# GitHub Actions minutes

Recorded 2026-10-25. Non-visual (CI only).

## Changes

- **CI:** cancel superseded PR refs, but give main pushes their own SHA group
  without cancellation. Each main push checks its own `before...HEAD` for the
  operational-schema preflight; cancelling it could leave that diff unchecked.
  Manual dispatches and main pushes always run the full suite.
- **Docs-only PRs:** extend the existing production-sensitive classifier with
  `docs_only`. PR classification still executes the **base branch's** script.
  Missing/empty output runs everything, so the policy-changing PR itself runs
  the full suite. Only a non-empty diff consisting entirely of `.md` files is
  eligible, excluding `AGENTS.md`, `docs/admissions-coverage/`,
  `docs/admissions-review-runs/`, `public/`, `src/`, `e2e/`, `scripts/` and
  `.github/`. An audit of `.md` references in `src/`, `scripts/` and `e2e/`
  found generated admissions evidence, review-run reports and the guard's
  `AGENTS.md` rule; all are excluded. JSON, HTML and PDF evidence always runs
  the full suite. Update this policy if code starts consuming another Markdown
  file.
- **Docs-only checks:** six heavy jobs still get runners and report success,
  executing only an explanatory echo. Every heavy step, including checkout,
  dependency installation and failure-artifact upload, has a step condition.
  Disposable Postgres uses an empty image on these PRs, which
  [GitHub supports for conditional services](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idservicesservice_idimage).
  Quality runs fully. The PR gate additionally requires classifier success.
- **Preview Playwright:** preserve the existing filters and add the exact
  project's hostname prefix and team suffix. Both Vercel projects use
  `vercel[bot]`, so creator is not a discriminator. Only accepted jobs enter
  job-level branch concurrency with cancellation; workflow-level deployment
  concurrency does not cancel running work. Checkout uses the deployed SHA and
  full history, then the same base classifier examines `origin/main...SHA`.
  Docs-only previews skip Node setup, npm and Playwright; classification errors
  run the full suite. Initial logs expose `github.ref`, `github.ref_name`,
  deployment SHA and deployment ref. **The coordinator must confirm the branch
  concurrency key on this PR's Preview run:** Vercel's deployment ref is a SHA,
  and `github.ref_name` being the branch remains unverified.
- **Admission alerts:** processing runs hourly at :15, delivery at :37, retaining
  their existing variable gates. Cycle reset runs hourly at :23 only when either
  pipeline is enabled, plus a separate daily 01:41 UTC safety run regardless of
  those variables. The daily job still expires cycles and invokes retention
  pruning. Dispatch and processing's reusable workflow entry are unchanged.
  There is no additional database probe.
- **Ready PR Slack / PR Title:** unchanged. WAF documentation replaces concrete
  egress addresses with generic pool descriptions, preserving counts and results.

## Checks and gating

The measured `required-approval` ruleset has **no `required_status_checks` rule**;
classic branch protection is absent. No check is formally required today.
**PR gate integrity** is the de-facto gate. It requires successful classification,
Build application, Playwright PR smoke and Internal data-health smoke. Build
retains its unit, admissions, disposable DB and operational-schema gate dependencies.

These are every CI job/check name. The ten applicable PR checks continue to
report success for a valid docs-only PR; four existing main/manual-only checks
continue to report skipped. Any real quality/classification failure still blocks.

| CI check name                           | Ordinary PR                      | Docs-only PR                     |
| --------------------------------------- | -------------------------------- | -------------------------------- |
| Classify production-sensitive changes   | Full                             | Full                             |
| Lint, typecheck & security              | Full                             | Full                             |
| Production operational schema preflight | Skipped                          | Skipped                          |
| Production operational schema gate      | Success when not applicable      | Same                             |
| Unit tests & coverage                   | Full                             | Success, notice only             |
| Disposable Postgres migration and seed  | Full                             | Success, notice only; no service |
| Admissions evidence gates               | Full                             | Success, notice only             |
| Build application                       | Full                             | Success, notice only             |
| Playwright PR smoke                     | Full                             | Success, notice only             |
| Internal data-health smoke              | Full                             | Success, notice only             |
| E2E smoke tests                         | Skipped                          | Skipped                          |
| DB-backed catalogue verification        | Skipped                          | Skipped                          |
| Operational DB verification             | Skipped                          | Skipped                          |
| PR gate integrity                       | Requires successful dependencies | Same                             |

The separate deployment-triggered check is **Playwright against Vercel Preview**.
PR Title and Ready PR Slack are separate, unchanged workflows.

Docs-only proof: pending coordinator run

## Measurement and projections

Source: `/workspace/qa-evidence/ci-diet/MEASUREMENTS.md` and adjacent raw JSON,
recorded by the coordinator. No new database query was performed. Runs were
listed with `gh run list`; job timings came from the Actions jobs API.
Billed minutes are the sum of `ceil((completed_at - started_at) / 60)` for each
job that got a runner; skipped jobs contribute zero. This is the supplied
job-timing estimate of billing, not a billing export.

Daily rates use 2026-10-21T00:00Z through 2026-10-25T00:00Z (four full days),
except alert/Slack/title rates, which use seven days, 2026-10-18 through 10-24.
Runs per PR below means runs per distinct PR branch **within the window**,
not a lifetime-per-PR estimate: CI `141 / 59 = 2.39`, Preview `178 / 60 = 2.97`.
Skipped foreign deployment events are excluded from billed Preview runs.

**After figures are planning projections at the same volume, not measured results.**
The triggers remain: docs-only jobs become cheaper, not absent. Cancellation can
shorten a superseded run but does not remove its start from run counts.

| Workflow           | Runs per PR before → after                  |      Billed min/day before |                                 After projection, before unmeasured docs savings |
| ------------------ | ------------------------------------------- | -------------------------: | -------------------------------------------------------------------------------: |
| Playwright Preview | 2.97 → same starts                          |    ~411 (`178 / 4 × 9.24`) |          ~378–411; up to ~33/day cancellation ceiling, conditional on branch key |
| CI, all events     | 2.39 → same PR starts; main/manual separate |                       ~640 |                     ~640, plus cost of preserving main runs previously cancelled |
| Alert processing   | Not PR-triggered                            |                          0 |                                                                 0 while disabled |
| Alert delivery     | Not PR-triggered                            |                          0 |                                                                 0 while disabled |
| Alert cycle reset  | Not PR-triggered                            | 6.4 (`45 / 7`, each 1 min) | ~1 if the daily job retains its measured 1 min cost; hourly disabled runs bill 0 |
| Ready PR Slack     | Unchanged                                   |                         23 |                                                                               23 |
| PR Title           | Unchanged                                   |                       22.6 |                                                                             22.6 |
| Total              | Same starts; shorter/no-op eligible jobs    |                     ~1,100 |         ~1,065–1,098 before unmeasured docs savings and additional main-run cost |

CI's ~640/day comprises ~539/day PR+main, plus ~100/day dispatches:
`141 / 4 × 10.1 + 48 / 4 × 15.3 ≈ 539`; `26 / 4 ≈ 6.5` dispatches/day
at the supplied ~15 minutes each. A fully green PR costs ~19 billed minutes.
Preview cancellation has an observed ceiling of `131 / 4 = 32.75` wall-minutes/day
across 21 superseded runs. That is a ceiling, not guaranteed billed savings:
rounding, runner timing and the unverified branch context affect the result.

The hostname filter earns **no duplicate-run savings**: the measured baseline
already bills exactly one Preview run per head SHA; foreign project and other
rejected events bill zero. Docs-only savings are unmeasured and are not credited
in the projection. The baseline's broad docs candidate count, `3 / 68` (~4%),
used `.md OR docs/**`, which is wider than the safe policy here (the raw sample
also includes `AGENTS.md`). Notice-only jobs still incur runner billing, and
Preview still checks out and classifies; neither is zero cost.

This is far less than a 60% reduction. Even the optimistic cancellation case,
without unmeasured adjustments, remains about **31,950 minutes per 30-day month**
(`1,065 × 30`), around **16 times** the private Free allowance of 2,000/month
(~67/day). The baseline is ~33,000/month. These changes do not make current
PR volume fit that budget; further coverage/product decisions are necessary.
Re-measure job-level billed minutes after merge and the coordinator's docs-only
proof run before claiming actual savings.

Live admission-alert subscribers: 0 (read-only SELECT count; 4 rows total, 2 notified + 2 cancelled, cycle 2026)

## Further levers requiring a product or coverage decision

1. Run Preview Playwright only for ready-for-review or explicitly labelled PRs.
   Preview (~411/day) and CI (~640/day) dominate the baseline.
2. Drop the duplicate PR smoke: Preview executes the same `npm run test:e2e`.
   Decide what replaces the early, secret-free PR gate and fork coverage first.
3. Build once and reuse `.next` through `actions/cache` in PR smoke/data-health,
   with keys and environment isolation that preserve meaningful checks.
4. Stop routine full CI `workflow_dispatch` reruns (~6.5/day, ~100 minutes/day).
5. Make fewer pushes per PR; batch work before triggering full checks.

These levers are not implemented by this change.

# Weekly reviewed admissions updates

The `Admissions Source Freshness` workflow is the only automation path that proposes reviewed admissions changes. It runs every Sunday at 03:00 UTC and never publishes a rule itself. A merged GitHub PR remains the human approval boundary.

## Required configuration

Before enabling the scheduled workflow, configure these repository settings:

- `DATABASE_URL` secret: database access for source freshness persistence and published-rule baselines.
- `ADMISSIONS_GITHUB_APP_ID` and `ADMISSIONS_GITHUB_APP_PRIVATE_KEY` secrets: a least-privileged GitHub App that can create and update the generated review branch and PR.
- `ADMISSIONS_CYCLE` repository variable: the four-digit admission cycle to evaluate.
- `SLACK_BOT_TOKEN` secret and `SLACK_ADMISSIONS_REVIEW_CHANNEL_ID` repository variable: the dedicated reviewer handoff channel.

The GitHub App must have only the repository permissions required to write contents and pull requests. Slack delivery is retryable and cannot publish, approve, or alter an admissions rule.

## Production schema preflight

Run the read-only preflight before any production migration:

```bash
npm run db:operational:preflight
```

The command reads `OPS_DATABASE_URL` first and falls back to `DATABASE_URL`. It
prints a machine-readable report and succeeds only when the audited production
migration baseline is intact and the remaining forward migrations form a safe,
unapplied suffix. It verifies migration statement fingerprints, effective
roles, required relations, columns, enums, constraints, indexes, triggers, RLS,
policies, and effective table privileges.

The protected production sequence begins with migration `0010`, not `0011`.
Production currently predates `bagrut_profile_versions`, and the release and
alert migrations depend on that table. Apply `0010` through `0016` in order,
then apply forward repair `0017`, which adds the missing `ops_readonly` profile
history read policy without broadening write access, and `0018`, which pins the
threshold-invariant trigger function to a trusted PostgreSQL search path.
Never edit a migration that has already been recorded remotely. If the
preflight reports `drift`, an unexpected migration, a partially present object,
or a role that can bypass RLS, stop and prepare a new forward repair migration.

After the protected apply, run:

```bash
npm run db:operational:verify
```

The verification form requires the complete schema and also checks
representative catalogue rows. Keep the preflight and verification JSON with
the protected-environment run evidence; neither output contains database
credentials.

The protected publication workflow uses the stricter
`npm run db:operational:publication` gate. In addition to the complete schema
and catalogue checks, it refuses to write while a pending release, started
publication attempt, or published release with incomplete digest/commit
identity is present.

### 2026-07-25 production recovery evidence

- Supabase project `toar-academic-guide` (`kfxcdbjeidczltkrjazk`) had a completed
  physical backup at `2026-07-25T08:31:59.127Z` before mutation.
- The protected operator applied forward migrations `0010` through `0018`.
  Remote statement fingerprints match the verifier contract.
- All required operational tables and constraints are present, all 16 private
  admissions/operations tables have RLS enabled, and `anon` and
  `authenticated` have no effective table privileges on them.
- An anonymous PostgREST read of `admission_facts` returns HTTP 401 with
  PostgreSQL permission denial. The threshold repair left zero contradictory
  rows.
- Supabase Security Advisor reports no admissions-schema or RLS finding. The
  remaining leaked-password-protection warning is an unrelated Auth setting.
- The threshold rows removed by migration `0014` were captured before mutation
  as recovery SQL with SHA-256
  `0ece6f536485709f339ea02c2f7b8b9acd587780b9be57689719ea175414252f`.
  Keep that operator artifact with the incident record; do not commit production
  row data to the repository.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Compound Engineering

Always use the Compound Engineering plugin (`ce`) for project work. Pick the most specific CE skill for the task instead of using generic behavior.

- `ce-plan` for multi-step work, planning, unclear scope, or when the work needs structure before implementation.
- `ce-work` for implementing features or fixes once the scope is understood.
- `ce-debug` for bugs, regressions, errors, or root-cause investigation.
- `ce-code-review` for reviewing diffs, branches, or PRs.
- `ce-test-browser` for browser-based verification of affected web pages.
- `ce-test-xcode` for iOS build and simulator test verification.
- `ce-frontend-design` and `ce-polish` for frontend UI work and visual refinement.
- `ce-worktree`, `ce-commit`, `ce-commit-push-pr`, and `ce-resolve-pr-feedback` for branch, commit, PR, and review-feedback workflows.
- `ce-compound` and `ce-compound-refresh` for capturing or refreshing project learnings.
- `docs/solutions/` — documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter. Relevant when implementing or debugging in documented areas.
- `CONCEPTS.md` — shared domain vocabulary (entities, named processes, status concepts) at the repository root. Relevant when orienting to the codebase or discussing domain concepts.

## GitHub Workflow

Use the GitHub CLI (`gh`) for GitHub operations. Do not use browser-based GitHub flows, ad hoc web fetches, or other GitHub clients when `gh` can perform the task.

## Repeatable PR Verification Workflow

When the user says `Verify PR #<number>`, run the full PR verification workflow for `toar-academic-guide`.

Use `ce-code-review` for the initial review. Switch to `ce-debug` if a check fails and root-cause analysis is needed, and to `ce-work` when applying an agreed fix. Use `ce-test-browser` only when an actual browser-verification capability is available; otherwise rely on Playwright results from GitHub Actions/Vercel preview workflows and clearly say that direct interactive browser execution was unavailable.

The verification workflow includes:

1. Inspect the GitHub PR title, description, branch, base, mergeability, changed files, diff, comments, reviews, and requested reviewers.
2. Check all GitHub Actions for the PR head, including CI, PR title validation, Playwright jobs, artifacts, screenshots, videos, traces, and logs when present.
3. Confirm the Vercel Preview deployment belongs to the `toar-academic-guide` Vercel project, not any sibling/legacy project. Inspect deployment status and relevant runtime logs.
4. Check backend/API behavior through available Vercel logs, preview URLs, CI endpoint checks, or added test coverage. Do not claim arbitrary authenticated HTTP/browser access unless the tool or CI job actually performed it.
5. Check the Supabase `toar-academic-guide` project when the PR touches database, auth, catalogue, profile persistence, RLS, seed data, migrations, or environment wiring. Use available Supabase MCP/CLI/tooling for project health, logs, advisors, schema/data verification, and representative queries.
6. Interpret Playwright failures against the PR intent: decide whether they indicate a real regression, an intentional product change that requires test updates, a flaky/CI issue, or missing coverage.
7. Report one clear status: `merge-ready`, `blocked`, `needs product decision`, `CI issue only`, or `test needs update`. Include the exact evidence and recommended next action.
8. If the user asks to fix issues, patch the PR branch, rerun/recheck the relevant workflows, and summarize what changed.

Do not create a new GitHub Action every time the user asks to verify a PR. Prefer the existing reusable CI/Playwright/Vercel-preview workflows. Add or update Playwright tests/workflows only when the PR changes behavior that is not already covered or when the existing workflow cannot verify the relevant risk.

## Project Tasks Board

The project task board is the Monday board at `https://malichi-hub.monday.com/boards/18407769281`.

Treat that board as the source of truth for active tasks, and account for any subitems on the board when interpreting scope, progress, or dependencies.

## Vercel Environment

`DATABASE_URL` and the Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) are already configured in Vercel for both preview and production deployments. Do not treat them as missing or ask the user to wire them.

## Pre-PR / Pre-Push Guard

Run `npm run guard:pre-pr` before pushing a branch or opening a PR that can affect production catalogue loading, admission calculations, Supabase schema/data, auth/session behavior, Vercel environment wiring, or `/internal/data-health`.

The repository tracks `.githooks/pre-push`, and `npm install` configures `core.hooksPath` through the `prepare` script. Do not bypass the hook unless the user explicitly approves an emergency push. If bypassing is unavoidable, say that `SKIP_PRE_PR_GUARD=1` was used and list the verification still owed.

The repository also tracks a project-local Codex hook in `.codex/hooks.json`. After the project hook is trusted with `/hooks`, Codex runs `npm run guard:pre-pr` before Bash commands that push code or create/mark-ready GitHub PRs. The Codex hook must deny bypass attempts such as `git push --no-verify` or `SKIP_PRE_PR_GUARD=1 git push`.

The guard must stay fast enough for local use, but it should fail before a push when local migration checks, catalogue seed dry-runs, operational grants, or targeted regression tests fail. Keep it updated when new production-critical DB tables, dashboards, catalogue routes, or calculator paths are added.

## Production Incident Verification

For database-backed catalogue, Supabase, Vercel, authentication, and `/internal/data-health` work, confirm the deployed behavior instead of relying only on unit tests.

- Use Supabase CLI or MCP to verify production schema, role grants, seed rows, and representative query results when the fix depends on Supabase state.
- Use Vercel CLI or GitHub Actions logs/checks to confirm preview/production environment variables and deployment status when behavior depends on deployed configuration.
- Use Playwright or an equivalent browser check for the affected user flow before marking the work complete. For this app, that includes the landing-page calculator flow and `/internal/data-health` when either path is touched.
- Do not replace a failing database-backed flow with static fallbacks as the primary fix. Static data is acceptable only for explicit local/static modes; production database mode should fail loudly and the database/query/permissions issue should be fixed.
- In the PR description, include the concrete Supabase, Vercel/GitHub Actions, and browser verification performed, or explain why a check was impossible.

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

## Project Tasks Board

The project task board is the Monday board at `https://malichi-hub.monday.com/boards/18407769281`.

Treat that board as the source of truth for active tasks, and account for any subitems on the board when interpreting scope, progress, or dependencies.

## Vercel Environment

`DATABASE_URL` and the Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) are already configured in Vercel for both preview and production deployments. Do not treat them as missing or ask the user to wire them.

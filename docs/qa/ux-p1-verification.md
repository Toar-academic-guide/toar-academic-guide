# UX P1 verification

Scope and standing rules: `docs/plans/2026-10-25-fix-ux-p1-plan.md`,
`myway-rules.md`. Source: the read-only production walkthrough dated
2026-10-25, findings P1-2, P1-3, P1-7 and P1-8.

Each fix has a regression test run against the old implementation first:

- Engineering search: the component test could not find the construct-form
  engineering subjects. Matching now normalizes the engineering synonym in
  names and queries; it has no list of engineering subject IDs.
- Haifa: both static rows and database serialization retained obsolete URLs.
  Tests assert the current programme/calculator URLs and unchanged admission
  data when database records contain old URLs.
- Exact grades: three tests failed on the real `1` defaults and on the absence
  of required units after entering a grade. Tests compare the submitted record
  and calculated weighted average with blank compulsory rows present/removed.
- Programme context: page, query-boundary and journey tests failed because
  the link lost its ID and the journey could not preselect its field.

## Official URL check and network policy

Run `npm run check:haifa-urls -- --strict` locally before marking these links
verified. The script reads the complete exported catalogue rows `haifa_cs`
and `haifa_law`, recursively collects and deduplicates all their URLs, checks
official HTTPS hosts and follows redirects. Both rows and their programme
links must exist. Every destination must finish with HTTP 200 in strict mode.
This check is read-only and does not connect to or seed a database.

The existing CI unit-test job runs `npm run check:haifa-urls -- --ci`.
Definite failures (including 404/410, other non-transient responses, and
redirects outside Haifa) fail CI. Network errors, timeouts, HTTP 408/425/429
and 5xx retry three times with a 15-second request timeout. Exhausted
transient failures emit an **inconclusive warning** in CI. They never count
as verified links: rerun strict mode from a working network before acceptance.
`--strict` overrides `--ci`; there is no blanket `continue-on-error`.
Deterministic tests simulate success, permanent failure and transient recovery
without relying on the external site.

Curl GET verification with redirects on 2026-10-25:

| Destination                                                                 | Final status |
| --------------------------------------------------------------------------- | ------------ |
| `https://admissions.haifa.ac.il/computer-information-science/program/3210/` | 200          |
| `https://admissions.haifa.ac.il/law/program/3000/`                          | 200          |
| `https://admissions.haifa.ac.il/score-calculation/`                         | 200          |

The old programme links and `/index.php/he/admissions/sif` returned 404.
Their replacements affect the static catalogue and URLs from successful DB
reads. No production data write, migration, seed or fallback is needed.

## Preview acceptance

`e2e/ux-p1.spec.ts` exercises engineering search on home/calculator, Haifa
referral URLs, blank units and submitted subjects, and programme CTA selection
through reload at desktop/mobile widths. It blocks enquiry submissions and
external analytics; admissions evaluation remains real and read-only.

Samuel reruns these four cases plus BGU psychology at 112/650, 112/690 and
112/720 on the preview. BGU psychology changes, status labels, brand and
engineering catalogue expansion are outside this PR.

No CSS, typography, component layout or new UI is included. If any such
change becomes necessary, stop for Jorje's mockup workflow.

## Local results

- Full unit suite: 3,244 passed, 65 integration tests skipped.
- Pre-PR guard: passed, including 2,400 targeted regression tests, local
  migration checks, operational grant checks and catalogue seed dry-run.
- Production build, typecheck, formatting and lint: passed. Lint retains one
  existing unused-import warning in `bagrutPolicies.ts` (also addressed by the
  earlier lead-path PR).
- Playwright: all eight new desktop/mobile cases pass; eleven existing
  calculator/durable-navigation cases pass, plus the existing exact-grades
  blank-row test. The first new browser run exposed a test selector issue for
  the certificate select; its accessible-role selector passes at both widths.
- Strict official URL check: all three unique destinations returned 200.
- Desktop/mobile screenshots inspected for Hebrew copy and empty/filled
  grade inputs; all measured subject, units and grade fields align right.
- Public production catalogue GET returned `catalogueSource: database` and
  confirmed the old URLs on both rows before this change. Direct Supabase
  inspection was unavailable: the connector requires reauthentication and
  the worktree has no populated OPS database credentials. No database write
  was performed; stale database URL serialization is covered by unit tests
  and will be exercised by the existing Vercel Preview Playwright workflow.

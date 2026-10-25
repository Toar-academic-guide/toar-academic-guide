# Technion EE/ME programme-page approval mocks

Draft only: waits for Amit's screenshot approval before merge.

The first requirement is `בחורף תשפ"ז: סכם 91.5` (EE) or
`בחורף תשפ"ז: סכם 87` (ME). The value comes from the same reviewed code
verification registry as evaluator replay, through the server-only public
requirement-source resolver. It does not depend on rewriting shared production
DB rows or persisting presentation copy. Existing requirement lists and the
muted Technion notice render the change; no new UI elements are introduced.

EE's spring notice now reads `באביב תשפ"ז, על בסיס מקום פנוי: סכם 94 — מספר המקומות מצומצם`.
The shared notice also uses this wording in calculator details. The official
[Technion source](https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/)
was checked on 2026-10-25: the spring EE row says “94 -על בסיס מקום פנוי”,
with the footnote “מספר המקומות במסלולים אלו מצומצם”. Winter values are the
initial thresholds for winter תשפ"ז (October 2026), not winter תשפ"ח.

## Browser evidence

Captured with local Chromium at `http://localhost:3027` in explicit
`CATALOGUE_SOURCE_MODE=static`, viewport height 900, reduced motion, loaded
fonts, and the Next dev indicator hidden only for screenshots. All four captures
were visually inspected for Hebrew copy, alignment, wrapping and complete CTAs.
`browser-checks.json` records response status, first requirement, spring text,
official source attribution, contact destination and overflow for each page.

| Programme | 1280px               | 390px               |
| --------- | -------------------- | ------------------- |
| EE        | technion_ee-1280.png | technion_ee-390.png |
| ME        | technion_me-1280.png | technion_me-390.png |

## Verification

- Tests first: 7 failures reproduced the missing winter lines and old spring copy;
  all 73 focused tests passed after implementation. Page-data tests deliberately
  retain stale DB values (94/92), and the DB query/serializer tests cover the
  published 91.5/87 rows. Existing subject requirements remain in the source list.
- `CI=true BASE_URL=http://localhost:3027 npx playwright test e2e/technion-winter-thresholds.spec.ts --reporter=line`:
  4 passed. Includes calculator accepted-result rendering and Contact/Save at
  both viewport widths; evaluator responses are mocked in those calculator tests.
- `npm run typecheck` and `npm run lint`: passed.
- `npm run guard:pre-pr`: passed, including migration consistency, seed dry-run,
  committed admissions-evidence validation and 2,558 tests across 104 files.
- Browser captures assert winter-first ordering, right alignment, attributed
  official links, visible contact/calculator CTAs and zero horizontal overflow.
- Production Supabase state was not queried or changed. Live preview validation
  and CI/deployment status are recorded in the PR; these screenshots use local
  static mode rather than claiming production database/browser verification.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.

Screenshot PNGs are not committed (repo convention). They are kept with the QA evidence outside the repo.

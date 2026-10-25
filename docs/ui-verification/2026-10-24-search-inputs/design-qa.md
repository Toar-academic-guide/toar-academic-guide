# Search input border and focus verification

Amit must approve these screenshots before merge. Approval is pending.

The shared `way-search-field` style removes the inner frame and native appearance
from framed search inputs and places a 2px purple focus outline on the wrapper via
`:focus-within`. Existing wrapper borders, spacing, copy, fonts, and icons remain.

Affected fields:

- Subject search: `/app/calculator`, `חיפוש תחום לימודים`.
- Subject/institution results filter: `/#results`, `לפי מוסד` → `סינון`,
  `חיפוש אפשרויות`. The plan view uses this same field.
- Bagrut elective search: `/app/profile`, continue to mandatory subjects, then
  elective subjects. Its existing unframed input acquired an inner focus outline
  from the global form rules, clipped by the wrapper's overflow.

The institution directory and legacy degree picker were also inspected. Their
input owns the search border; neither has a separately framed search wrapper.

## Browser evidence

Before: unchanged `origin/main`, `809c6cc041c72916a54ebf769e6c21096c902c53`.
After: this branch's local production build (`npm run build`, `npm run start`).
Both use explicit `CATALOGUE_SOURCE_MODE=static` for local visual verification;
this does not verify production database state. No database writes were performed.

Chromium viewports: 1280×900 and 390×900, reduced motion, loaded local fonts.
Each field has an empty/unfocused and empty/keyboard-focused screenshot, before
and after (24 PNGs). The Bagrut focus state opens the existing suggestions list.
The profile is scrolled to the elective field; automatic browser scroll positions
can differ between before and after captures.

Original files: `/workspace/codex-tasks/assets/search-input-shots/`.
Repository copies below allow the PR to embed the uploaded screenshots.

| Field                | Width | State   | Before                                                 | After                                                |
| -------------------- | ----- | ------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Subjects             | 1280  | Empty   | [Before](before-subjects-1280-empty.png)               | [After](after-subjects-1280-empty.png)               |
| Subjects             | 1280  | Focused | [Before](before-subjects-1280-focused.png)             | [After](after-subjects-1280-focused.png)             |
| Subjects             | 390   | Empty   | [Before](before-subjects-390-empty.png)                | [After](after-subjects-390-empty.png)                |
| Subjects             | 390   | Focused | [Before](before-subjects-390-focused.png)              | [After](after-subjects-390-focused.png)              |
| Results/institutions | 1280  | Empty   | [Before](before-results-institutions-1280-empty.png)   | [After](after-results-institutions-1280-empty.png)   |
| Results/institutions | 1280  | Focused | [Before](before-results-institutions-1280-focused.png) | [After](after-results-institutions-1280-focused.png) |
| Results/institutions | 390   | Empty   | [Before](before-results-institutions-390-empty.png)    | [After](after-results-institutions-390-empty.png)    |
| Results/institutions | 390   | Focused | [Before](before-results-institutions-390-focused.png)  | [After](after-results-institutions-390-focused.png)  |
| Bagrut electives     | 1280  | Empty   | [Before](before-bagrut-electives-1280-empty.png)       | [After](after-bagrut-electives-1280-empty.png)       |
| Bagrut electives     | 1280  | Focused | [Before](before-bagrut-electives-1280-focused.png)     | [After](after-bagrut-electives-1280-focused.png)     |
| Bagrut electives     | 390   | Empty   | [Before](before-bagrut-electives-390-empty.png)        | [After](after-bagrut-electives-390-empty.png)        |
| Bagrut electives     | 390   | Focused | [Before](before-bagrut-electives-390-focused.png)      | [After](after-bagrut-electives-390-focused.png)      |

The screenshots were visually inspected on desktop and mobile. The search frame
and focus indicator are readable, Hebrew placeholders align right, and the
existing suggestions, filters, Contact, and Save remain in place.

## Regression checks

`e2e/search-inputs.spec.ts` exercises all three fields at both widths. It checks
all four inner borders, outline, shadow, transparent background, native appearance,
right alignment, containment, wrapper focus color/width/offset, and removal of the
wrapper outline on blur, with both empty and filled values. Keyboard Tab navigation
is used to exercise `:focus-visible` as well as `:focus-within`.

All six tests fail against the baseline for the expected inner border/outline,
and all six pass against the fixed production build.

Reproduce after screenshots with a local production server on port 3130:

```sh
CI=1 BASE_URL=http://localhost:3130 \
SEARCH_INPUT_SHOTS_DIR=/workspace/codex-tasks/assets/search-input-shots \
SEARCH_INPUT_SHOT_PREFIX=after \
npx playwright test e2e/search-inputs.spec.ts --workers=2 --retries=0 --reporter=line
```

Production build and typecheck pass. Lint passes with the existing unused-import
warning in `src/server/admissions/bagrutPolicies.ts`.

Full Vitest suite: 221 files / 3,184 tests pass; 11 files / 65 tests skip.
`npm run guard:pre-pr` passes, including migration consistency, operational grant
validation, catalogue seed dry-run, admissions evidence verification, and 2,322
targeted tests in 91 files.

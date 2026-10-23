# Batch A — handoff to Jorje

Codex has encoded nine numeric programme IDs and opened this batch for source/UX verification. **Awaiting Jorje; no merge-ready verdict.** No merge, database write, production seed/publication job, environment change, or manual deployment was performed.

The public model remains: MyWay is free for students; revenue comes from referring qualified leads to academic institutions. Existing Contact/Save flows and referral-link handling are preserved. No new student composite-score field exists.

## Delivered

`telhai_cs`, `telhai_biology`, `ono_cs`, `ono_business`, `ruppin_cs`, `reichman_business`, `reichman_economics`, `colmgmt_accounting`, `colmgmt_infosystems`.

Each has evaluator dispatch, inclusive-boundary/weak/missing-input coverage, and updated in-repo seed requirements. `ruppin_cs` already existed in the dynamic catalogue; its same ID now has an explicit academic seed record. Nothing was seeded to the database. Shared numeric checks were reused in the requested simplification pass; no code-review or multi-agent review pipeline ran.

Full numbers, sources and every deferred candidate: [verification table](2026-10-23-batch-a-encodeable.md).

## Source checks still owned by Jorje

- Tel Hai biology: confirm catalogue biology maps to the accessible animal-sciences page; recheck both Tel Hai programmes' year caveat.
- Ono CS: verify the brief's OR interpretation of the official compressed Bagrut/math/psychometric wording. Complete weak 420/70 plus 3u math at 70 is below. Missing math returns needs_input because that route might independently qualify.
- Reichman business: confirm literal 3u@100 interpretation for coordinated/Bagrut-100 paths. No lower grade at higher units was invented. The 95–99 route additionally requires math and science.
- Reichman economics: official entry math is 4u@75 / 5u@60, with preparation below 4u@85 / 5u@65; psychometric route also needs quantitative 125. Confirm catalogue mapping against the grouped economics row. Specialized/entrepreneurship admissions are outside scope.
- Ruppin: official page now corroborated live, but combined 106 formula remains missing. Reichman formula is reused as estimated; live calculator parity was not established in this run.
- Colman information systems: official page is information systems + business dual major. Same catalogue ID retained and this mapping is called out. Only computable Bagrut routes encoded; unpublished weighting/relaxed-math variants remain gaps.
- TAU medicine: 743.86 is in the **ראויים לקידום** table. Deferred rather than misrepresented as general eligibility; this PR does not validate or change historical medicine scoring.

## Local evidence

| Check | Outcome |
|---|---|
| Focused numeric evaluator/API suite | 128 tests passed before simplification |
| `npm run guard:pre-pr` after simplification | Passed: 82 test files, 1,465 tests; local migration consistency, operational grant validation and non-writing seed dry-run passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with one existing unused-import warning in `bagrutPolicies.ts`; no new errors |
| `npm run format:check` | Passed |
| Existing Playwright + new batch suite | 38 passed, 28.7s, Chromium; 390px and 1440px, local explicit static catalogue |
| Database / production verification | No state-dependent DB fix or DB write. Local browser results are not production verification. No authenticated preview access claimed. |

Playwright command:

```sh
CI=1 BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/batch-a-admissions.spec.ts e2e/reichman-admissions.spec.ts e2e/mta-admissions.spec.ts --workers=2 --retries=0 --reporter=line
```

The initial browser batch shared a client identity and hit the existing rate limit; test clients were isolated without changing the limiter. The successful rerun used the real local API and evaluator. CE's interactive browser driver was unavailable; repository Playwright was used directly, with no new browser tooling installed.

Screenshots for every new programme on both widths: `docs/ui-verification/2026-10-23-batch-a/`. Representative [desktop Tel Hai CS](../ui-verification/2026-10-23-batch-a/telhai_cs-1440.png) and [mobile](../ui-verification/2026-10-23-batch-a/telhai_cs-390.png). Visible copy was inspected for student-facing Hebrew, right alignment, separate confirmations and prominent Contact/Save.

GitHub CI/preview status is reported in the PR checks and delivery message after publishing. Existing workflows are used; no new Action, freshness run or publication job was requested.

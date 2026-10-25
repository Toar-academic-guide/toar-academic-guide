# Bagrut normalization — Option A, Ariel only

Local implementation on `codex/bagrut-normalization-ariel-only`, starting from `d19466a` (main `214f0b7`, including #282). The branch has been pushed and [PR #294](https://github.com/Toar-academic-guide/toar-academic-guide/pull/294) is open. This PM-fix follow-up is local only, with no push. No external messages, production DB/SQL, migrations, seed writes, manifests, Vercel, or environment changes. The final task spec outside the repo remains read-only.

## Formula and retained conditions

HUJI, BGU, Haifa and BIU now return `null` from the legacy composite and derivative APIs. Legacy university evaluation preserves missed official floors as `below`, with the existing explanation and floor gaps only; a met direct psychometric route remains `accepted`/`direct`; otherwise it returns `unavailable`. It never replaces a missing composite with zero or an estimate. Existing exact adapters and published BIU routes are unchanged.

Ariel uses `(6.666 × B + P) / 2` inside `sekhemAriel`, with derivatives `0.5` for psychometric and `3.333` for Bagrut. No shared conversion supplies Ariel or the four withheld institutions. The CLI retains its rounded display and additionally prints `Unrounded Sekhem:` to two decimal places. BGU/BIU CLIs print `not found: no published bagrut conversion` without composite scores or verdicts.

TAU's unbacked legacy normalizer, weighted arithmetic, qualifying bonus, clamp, and numbers are retained until postfreeze-2. Its derivative reuses `normalizeBagrut(1)`, numerically identical to the previous conversion factor. The normalizer is now reached only from TAU branches. Technion's formula is unchanged.

## Ariel source evidence

Ariel publishes exactly **6.666**, with the text:

> נוסחא לחישוב קבלה משולב: 2/ [(ממוצע בגרות * 6.666) + פסיכומטרי]

Read and cross-checked the supplied official captures, without copying them into the repository:

- `/workspace/pm-research/raw/official/ariel/ba-registration-process.2026-10-25T1357.txt`, line 37, and the corresponding `.html`, line 443.
- `/workspace/pm-research/raw/official/ariel/ee-admission.2026-10-25T1403.html`, line 369 (formula in hidden tab content), and corresponding `.txt` (the text capture alone does not expose the hidden formula).
- `/workspace/pm-research/ariel-coefficient-rounding-2026-10-25.md`.

The captures and write-up establish no published rounding rule or Bagrut cap. Ariel pins 1–5 and 15, and the unrounded CLI case, are **text-verified, calculator not run**. The official calculator requires identifying/contact information and does not expose arbitrary B/P inputs before form submission; no form was submitted. Existing integer rounding is a retained application presentation convention, not an official Ariel rounding claim. No extra cap is added.

## Approved and dependent test changes

The first local commit updates only the two approved assertions in `src/utils/__tests__/sekhemCalculators.test.ts`: BGU EE `706 → null` (pin 7), biology `682 → null` (pin 8). Status, thresholds 547/585, explanations, and deltas P10/B0 and P0/B6 stay unchanged. Jorje approved removal of those values because they came from the invented conversion.

The CLI test for B99.9/P701 rounded to 683 was replaced with B120/P800 parsing the labelled unrounded output and asserting `toBeCloseTo(799.96, 2)`. B99.9/P701 is 683.47 to two decimals, but Ariel publishes no integer-rounding rule. Pin 15 remains unchanged: B100/P700 still prints `Computed Sekhem: 683` for all eleven script entries.

Before implementation, the replacement test failed on the unchanged script:

```text
FAIL scripts/admissions-calculators/__tests__/bagrutNormalization.test.ts
  Ariel B120/P800 prints the unrounded composite 799.96
AssertionError: missing labelled Unrounded Sekhem output: expected null not to be null
Test Files 1 failed (1)
Tests 1 failed | 3 skipped (4)
```

Full failure output: `/tmp/pf5-step1a-red.log`. The missing line, rather than imports or execution errors, caused the failure.

Jorje (2026-10-25) approved restoring these three original evaluator cases with their original names and behavior, using a fixture-only `synthetic_score_institution` instead of BGU:

| Restored case | Assertions |
|---|---|
| `asks for structured subject inputs before returning an accepted score-based result` | `capability: needs_input`, `kind: needs_input`, `requiredInputs: ['math_units']`, `decision: unknown`. |
| `keeps an accepted estimated score with bagrut 115 eligible when an interview remains` | `manual_gate` capability/kind, `eligible_to_apply`, numeric score, threshold 600, explanation containing `ראיון קבלה מחייב`. |
| Same original case with Bagrut 118 | Same behavior as Bagrut 115. |

The institution is defined inside each test with a `minimum_floors` calculator configuration. `getCalculatorInstitutionsFromCatalogue` accepts the supplied configuration without a registry lookup; the capability matrix selects `estimated` when configuration and threshold are present; `evaluateUniversities` handles `minimum_floors` for any institution ID, returning a numeric psychometric score. Thus the fixtures need no registry, catalogue, data, or production edits and avoid TAU/Technion dependencies. Psychometric 760, Bagrut 115/118 and threshold 600 are unchanged. The original missing-subject assertions are preserved; the existing structured-result merger retains the base score on `needs_input`, so no new score-undefined assertion is made there.

Separate BGU unsupported tests preserve the previous synthetic math-units and interview programme shapes (interview Bagrut 115 and 118). Each asserts `unsupported` / `unknown` and undefined score, threshold and delta. This keeps unsupported-composite coverage alongside the restored structured-input/manual-gate regressions.

TAU assertions at `sekhemCalculators.test.ts:39/46/53` stay unchanged (696.6667, 686.6667, 800 clamp). The dedicated pin-17 regression is also unchanged. Postfreeze-2 owns their deliberate accuracy replacement.

## Static coverage before and after

Re-ran `analyzeBucketList(allPrograms.map(p => p.id), {psychometric: 650, bagrut: 100})`, resolving each row's calculator institution by `institutionId`, otherwise its first non-null threshold key present in `UNIVERSITIES`, exactly as the spec's Coverage follow-up method. Counted numeric `sekhem`, not statuses or traffic. Both runs use this branch's 403 static programmes; no DB state or fake freshness was supplied.

| Institution | BEFORE numeric | AFTER numeric | Lost |
|---|---:|---:|---:|
| HUJI | 13 | 0 | 13 |
| BGU | 11 | 0 | 11 |
| Haifa | 15 | 0 | 15 |
| BIU | 11 | 0 | 11 |
| TAU | 33 | 33 | 0 |
| Ariel | 19 | 19 | 0 |
| Technion | 7 | 7 | 0 |
| **Total** | **109** | **59** | **50** |

AFTER matches the spec: 50/109 lose their number (45.9%); 59 keep it. AFTER statuses: 39 qualified, 20 gap, 53 no-data, 291 requirements. The accepted coverage loss still needs Jorje's notification to Amit before any later merge; no external message is sent here.

Repeated the in-memory evaluator simulation over all static programmes and three profiles P/B 650/100, 750/115, 520/88, using the original scratch method's rich extra inputs (5 units/90 in math, English, physics, CS; quantitative/verbal/English sub-scores 130), a failing live fetcher and empty freshness map. DB access was mocked to throw. Across 436 linked pairs: **zero normalization-scored pairs**, 9 legacy evaluator calls (Afeka 6, HIT 3), 32 pairs scored through other routes (BIU 6, Reichman 6, Tel-Hai 2, Afeka 1, MTA 4, Colman 8, Ono 3, Ruppin 1, SCE 1); 89 distinct pairs had an unsupported result in at least one profile. Scratch script/output: `/tmp/pf5-simulation/coverage.test.ts`, `/tmp/pf5-coverage-after.json`; neither is committed.

The independent static capability matrix has 436 pairs, **35 unsupported**, 1 missing. This differs from the earlier plan's 37 unsupported: current main includes #282, and BIU now has 7 unsupported / 10 estimated / 2 manual_gate metadata entries, versus the plan's 9 / 7 / 3. Capability matrix and catalogue data are untouched by this implementation. Matrix classifications do not measure legacy numeric bucket coverage; `estimated` metadata is not an accuracy claim or a newly generated composite. Output: `/tmp/pf5-matrix-after.json`.

## Nullable consumers and dead code

Bucket analysis returns `no-data`, null score and no composite delta before numeric arithmetic. Jorje (2026-10-25): null sekhem shows no score badge, no no-data badge and no new copy. The original `ממתין לציונים` badge remains for `no-data` with undefined sekhem, including profiles without scores. The existing `sekhem != null` score-badge guard remains.

UniversityCard and admissionsDecisionEngine receive null-safety only and remain in the repository. UniversityCard is used only by the unmounted ResultsDashboard; the decision engine is referenced only by its tests. ResultsDashboard itself reads status/counts and forwards result objects, with no score arithmetic or formatting, so it needs no edit. Server evaluator changes only three nullable score reads and their corresponding score labels (`null → undefined` at the response boundary).

## Local browser evidence and limits

Used the repository's existing Playwright/Chromium on an isolated local SSR harness rendering the actual BucketList and engine with actual static programmes, real Tailwind CSS and local Rubik fonts. BEFORE renders load only the three relevant baseline modules from `d19466a`; AFTER renders load working files. A temporary Next Image default-export interop adjustment applies only inside the harness, not to repository code. External logo requests were blocked. No app server, API, DB, authentication, deployment or production checks are claimed.

Captured before/after, filled/empty profiles at desktop 1440px and mobile 390px, including HUJI/BGU/Haifa/BIU CS plus TAU/Ariel controls (eight captures). Those earlier AFTER captures showed four no-score labels; that copy is superseded by the PM fix above. The PM-fix browser evidence below checks the final badge behavior. No horizontal overflow, all paragraph alignment right, no page errors. Read the visible Hebrew on both AFTER captures; no internal diagnostics leak into the changed labels.

Screenshots and machine evidence: `/tmp/pf5-browser/{before,after}-{filled,empty}-{1440,390}.png`, `/tmp/pf5-browser/evidence.json`. These are local rendered evidence for Jorje/Amit, not a claim that visual approval was obtained. Contact/Save flows were not changed. Full interactive app verification and Jorje's source/product/visual gate remain for a later authorized delivery.

## PM-fix verification — Jorje, 2026-10-25

The approved follow-up restores the three original evaluator cases, keeps separate unsupported BGU coverage, reverts the badge copy and corrects PR status. Only `BucketList.tsx` changes production behavior. No push is performed; the coordinator owns publishing this single local commit.

- `git fetch origin` followed by `git rev-list --left-right --count HEAD...origin/main`: 4 ahead / 0 behind before the PM-fix commit; no merge needed. `origin/main` matches the remote main SHA `214f0b7`.
- Focused evaluator and bucket-list checks: 3 files / 437 tests passed, including 427 evaluator cases.
- Full `npx vitest run`: 261 files passed, 13 skipped, zero failed; 4,115 tests passed, 1 pre-existing expected fail, 86 skipped, zero failed (4,202 total). The expected-fail remains `clientImportGraph.test.ts`'s StudyJourney server-dependency check; no skips or expected-fail markers were added.
- `npm run typecheck` and `npm run lint`: exit 0. The synthetic ID uses a narrow test-only cast to the catalogue ID type; no registry extension is required.
- `npm run guard:pre-pr`: exit 0; 118 targeted files / 2,880 tests passed, migration consistency, static grants, catalogue seed dry-run and committed evidence checks passed. The absent raw Monday export still skips local regeneration only. No DB connection or write was used.
- Local Playwright/Chromium checked the actual BucketList, engine and static programmes in the isolated SSR harness at 1440px and 390px, with filled and empty profiles. Filled: HUJI/BGU/Haifa/BIU show no score/no-data badge or replacement copy; only the unchanged TAU/Ariel controls have numeric badges. Empty: all six original `ממתין לציונים` badges remain, with no numeric badge. No page errors or horizontal overflow; paragraph alignment is right. Visible Hebrew was read in desktop/mobile captures. This is local rendered verification, with no app/API/DB or deployed-flow claim.

Logs: `/tmp/pf5-pm-{focused,full,typecheck,lint,guard,browser}.log`, `/tmp/pf5-pm-full.json`. Final screenshots and machine evidence: `/tmp/pf5-pm-browser/after-{filled,empty}-{1440,390}.png`, `/tmp/pf5-pm-browser/evidence.json`. The original external spec and all data, seeds, manifests, TAU and Technion code remain untouched.

## Simplification and checks

Applied ce-simplify-code within the changed implementation only, preserving every proof test and the settled Ariel/TAU separation. Shared floor calculations avoid duplicated explanations; removed one redundant fallback comment. No separate code/document review pipeline ran. No dead code was deleted.

All required checks passed before the final local implementation commit:

| Check | Result |
|---|---|
| `npx vitest run` | 261 files passed, 13 skipped, zero failed (274 total); 4,110 tests passed, 1 pre-existing expected fail, 86 skipped, zero failed (4,197 total). |
| Original four postfreeze-5 proof files | All 31 cases pass, including the 26 previously failing cases with the approved unrounded CLI replacement; no proof test weakened. |
| Focused proof + existing utility/consumer tests | 7 files, 46 tests passed. |
| Dependent evaluator tests | 424 passed after the three documented expectation changes. |
| `npm run typecheck` | Exit 0. |
| `npm run lint` | Exit 0, no lint errors/warnings. |
| `npm run guard:pre-pr` | Exit 0: migration consistency, static migration-grant checks, catalogue seed dry-run, committed evidence verification, 118 targeted files / 2,877 tests passed. No raw Monday export existed, so local regeneration was skipped by the guard. No DB writes or connections were required. |
| Formatting / patch integrity | Targeted Prettier check and `git diff --check` passed. |

Logs: `/tmp/pf5-full-green.log`, `/tmp/pf5-full-green.json`, `/tmp/pf5-focused-green.log`, `/tmp/pf5-evaluator-green.log`, `/tmp/pf5-typecheck.log`, `/tmp/pf5-lint.log`, `/tmp/pf5-guard.log`. Existing DB integration skips are not deployed verification. No build/deployment check is claimed; the current implementation brief requires the checks above. Generic runtime setup was not changed to obtain these results.

## Grep residue inventory

Re-ran all specified literal searches over `src` and `scripts`: `normalizeBagrut`, `sekhemWeighted`, `800 / 120`, `800/120`, `/ 120`, `/120`, `6.66`. The combined inventory has 224 matching lines:

- TAU only, `src/utils/sekhemCalculators.ts`: 19 (normalizer declaration), 20 (preserved body), 32 (weighted declaration), 34 (weighted call), 102 (TAU dispatcher), 156 (TAU derivative calls the normalizer). No separate literal derivative conversion remains.
- Ariel only: `src/utils/sekhemCalculators.ts:38,41` (source text and own formula), `scripts/admissions-calculators/8_ariel.js:14` (own formula).
- Tests: `src/utils/__tests__/bagrutNormalization.sourceScan.test.ts:36,43,48,78,83,84,88`; `bagrutNormalization.optionA.test.ts:48,140,150,153`; `sekhemCalculators.test.ts:39,46`. These are scan rules/examples, Ariel precision commentary and TAU regression values.
- Non-formula strings: 200 `Chrome/120.0.0.0` user-agent lines in the existing institution scripts; `src/data/journeyGeography.ts:22,37` are SVG coordinates. No such data files changed.

Full filename/line inventory: `/tmp/pf5-greps.txt`. The source-scan test passes without any allowlist change. No unapproved production conversion remains.

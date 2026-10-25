# TAU Architecture manual gate, 2026–2027

`architecture__tau`, official programme `088111010000`, GraphQL node `8209`. The [canonical requirements page](https://go.tau.ac.il/he/arts/ba/arch?v=admission-requirements) (HTTP 200, information dated 13.01.2026) defines admission as **50% ציון ההתאמה + 50% ציון מבחן המיון**. MyWay does not collect the architecture screening-test score, so Bagrut and psychometric scores cannot establish an admission verdict.

| Official condition                     | Published value                                      |
| -------------------------------------- | ---------------------------------------------------- |
| תשפ״ז composite acceptance / rejection | 629 / 600; also returned by GraphQL                  |
| תשפ״ו composite acceptance / rejection | 614 / 613                                            |
| Psychometric floor                     | Above 550; integer minimum 551                       |
| Mathematics alternatives               | 5 units, 70+; or 4 units, 80+; or 3 units, 90+       |
| Screening                              | Mandatory architecture screening test                |
| English                                | Advanced A, 100+, from university-wide BA conditions |

The English minimum stays: the programme page is silent on English, but the [university-wide BA conditions](https://go.tau.ac.il/he/ba/admissions) require Advanced A (100+). The [English page](https://go.tau.ac.il/he/ba/english) defines Advanced A as 100–119 and requires it by the start of studies unless a unit specifies otherwise. The contract gate cites the BA conditions. Portfolio and interview apply only to advanced-year entry and are removed from this first-year contract.

## Decision and limits

Architecture is a manual gate. Its proof becomes `unverified`, with both comparisons false and no live-comparison timestamp. `evaluateProgramVerification` returns `authority_unavailable`, the ledger records `withheld`, and the capability matrix stops treating the pair as exact. The contract mode stays `official_replay`: its type permits only that or `formula`, and a formula would be false. A true `manual_gate` capability label requires Oded to add `architecture__tau` to `WITHHELD_FORMULA_PAIR_CAPABILITIES` in `capabilityMatrix.ts`. The hard-coded `tau-architecture-live` branch and old architecture URL in `evaluator.ts` also belong to Oded and remain outside this change.

The false accepted fixture (680 / 110 → match score 679) is removed. The remaining fixture (620 / 90 → match score 548) is unchanged, including its capture timestamp, and its fixture-set fingerprint is recomputed. Residual risk: it still labels that match score `below`, although the published cutoff applies to the 50/50 composite. It drives no decision while the pair is withheld. Biology now owns independent fixtures and a contract pinned to origin/main; its proof, fingerprint and all derived programmes retain their previous values.

The reviewed source fingerprint `sha256:ca1b8b5fc2382bb0e899de53238ee2aebd132b33df642393acb73f26a4f2f9e0` stays unchanged, so freshness rows are unaffected. The withheld pair no longer makes decisions from freshness. No reviewed-manifest entry or publication is added.

No screening-test scale was published on the captured official architecture tabs: admission-requirements, requirements, important-info, exceptional-requirements, additional-info, new-info and about. They describe visual perception and creativity, no preparation needed, dates 10.03.26 / 30.03.26, and validity of 2024/2025 results. [BA match scores](https://go.tau.ac.il/he/ba/match) lists architecture (0881) as “יעודכן בהמשך”. No screening scale or composite formula beyond the published weighting is invented.

## Captured official evidence

Existing captures were used without fetching sources again:

- `/workspace/pm-research/raw/official/tau/review10_architecture_20261025T171725Z.txt`: GraphQL node mapping and 629/600 (section 1), match scores 679 and 548 (sections 3/4), old `/he/engineering/ba/architecture?v=admission-requirements` HTTP 404 (section 5), canonical page and requirements (section 6).
- `/workspace/pm-research/raw/official/tau/review10_ba_admissions_20261025T172347Z.txt`: university-wide English minimum.
- `/workspace/pm-research/raw/official/tau/review10_ba_english_20261025T172347Z.txt`: English levels and deadline.
- `/workspace/pm-research/raw/official/tau/review10_architecture_tabs_20261025T172347Z.txt`: architecture tabs and screening-scale finding; BA match finding supplied in the source brief.

## Other TAU programmes with a מבחן מיון

- `medicine__tau` / `tau_medicine__tau`: the [canonical page](https://go.tau.ac.il/he/med/ba/med-doc?v=admission-requirements) has a “מבחני מיון” tab (non-cognitive selection). Contract mode `official_replay`, already withheld in the ledger (`WITHHELD_PAIR_EVIDENCE`) and capability `manual_gate`. Capture: `/workspace/pm-research/raw/official/tau/review10_medicine_20261025T172347Z.txt`.
- `physiotherapy__tau`: the page lists “מבדקי מיון: ראיון אישי” (interview, not a test). Contract mode `official_replay`, already withheld + `manual_gate`. Capture: `/workspace/pm-research/raw/official/tau/review10_physiotherapy_20261025T172347Z.txt`.
- No other TAU contract page (datascience, psychology, social work, law, accounting, business/management, biology, communication, political science, education, economics, cs, ee, me, occupational therapy, industrial, nursing) mentions מבחן מיון / מבדקי מיון. Captures: `/workspace/pm-research/raw/official/tau/review10_<prog>_20261025T172347Z.txt`, fetched via `https://go.tau.ac.il/he/node/<nid>?v=admission-requirements`, following redirects. No fixes here.
- Side finding: existing contract requirements URLs for ee, me, biology, economics, occupational therapy, communication and education now return 404; node URLs redirect respectively to `/he/engineering/ba/electrical`, `/he/engineering/ba/mechanical`, `/he/life/ba/bio`, `/he/social-sciences/ba/economics`, `/he/med/ba/occu`, `/he/social-sciences/ba/communications`, `/he/education/ba`. Not fixed here.

## Local verification

- Tests first: 8 expected architecture failures; biology pins passed. After implementation: all 26 focused tests passed. A deep comparison confirmed all 32 other TAU metadata entries, contracts and fixture sets unchanged from origin/main.
- Typecheck, scoped ESLint and Prettier passed. Admissions tests: 226 passed, 2 failed on old ledger totals.
- `env -u DATABASE_URL npm run guard:pre-pr`: 2,887 tests passed, 4 failed on old aggregate totals in the ledger, calculator coverage and data-health tests (expected 125 exact / 15 withheld; actual 124 / 16). Grants, migration consistency, seed dry-run and committed evidence checks passed. No bypass or out-of-scope edits. Exact failure names and logs: `/workspace/codex-tasks/tau-arch-external-failures.md`.
- No browser, deployed or database verification was performed. Delivery is local only; Jorje's source/product verification remains required.

## Oded: evaluator, capability, registry and captures

Architecture now follows the existing withheld-pair capability override into the evaluator's manual-gate path. It never calls `runTauAdmissionsProof`, calculates a match score, or compares raw hatama with the composite cutoffs. The existing verification contract remains untouched; its unverified proof and ledger withholding remain authoritative. The contract's `official_replay` metadata stays because the contract type has no `manual_gate` mode; the registry target is removed from default exact replay selection and uses `score_only` / `partial_official` / `manual_gate` like the other TAU manual targets. GraphQL node 8209 and programme 088111010000 remain mapped.

The evaluator reads the contract's psychometric and English minima and mandatory 50/50 screening description. It checks mathematics using the existing subject-record/scalar-input helper and the published 5u/70, 4u/80, 3u/90 alternatives. The existing `AdmissionRequirements` table shows each floor as passed, failed or missing. Missing mathematics or English does not imply a pass: admission remains `unknown`, including when every provided score clears its floor. A known floor failure takes precedence and yields `below`, mirroring the existing manual-gate floor-failure pattern. English below 100 cites the university BA conditions, not the architecture page. No final composite verdict, score or score assessment is attached. These floor checks do not use the Bagrut average, so the evaluator does not attach an average-proxy estimate notice, including for failed floors.

The card uses the existing manual-gate label and copy patterns: `נדרש מיון נוסף`, the contract's Hebrew 50/50 explanation, and `בדקו באתר התוכנית את מועדי מבחן המיון ותנאי ההרשמה.` The calculator's existing manual-gate badge says `אפשר להגיש מועמדות`; a failed floor says `לא עומד/ת בתנאי הסף`. The decision remains unknown when no known floor fails. The main study-journey card preserves architecture's screening explanation and uses the existing failed-floor label instead of generic manual-gate copy. The existing floor-table footer now links to TAU's requirements for TAU rather than incorrectly naming Bar-Ilan. No new component, layout or style is introduced.

The unsupported architecture accepted proof capture is removed independently of law and biology. Its historical below capture (raw match score 548) retains its score, applicant and timestamp, but cannot drive a decision for this withheld manual target. Only its source link changes to the canonical requirements URL. All other capture entries remain unchanged.

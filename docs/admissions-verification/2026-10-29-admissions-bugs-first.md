# Admissions bugs first: evidence and decisions

Investigation/capture date: **2026-10-28** (Asia/Jerusalem). The filename follows the supplied brief. Base: `215548a`. Backend/data only. This is evidence for Jorje's verification, not a claim of deployed or final-admission verification.

## 1. Technion Hebrew row — fixed

Official sources:

- [Official calculator form](https://admissions.technion.ac.il/sekem-calculator/), saved official capture dated 2026-10-25, read 2026-10-28; current form fetched again 2026-10-28. Original packet: `/workspace/pm-research/raw/official/technion/sekem-calculator.2026-10-25.html`.
- [Official form validation](https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/js/ckeck_errors.js?ver=2.0.8), fetched 2026-10-28. Asset fingerprints are in [the evidence receipt](evidence/2026-10-29-bugs-first-official.json).
- [Submission endpoint](https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/technion-calculators-sum.php), read-only GET attempted 2026-10-28: security rejection. No live calculator submission was attempted.
- The older [calculator URL](https://admissions.technion.ac.il/calculator/) returns a page-not-found document, consistent with the 2026-10-25 source packet. Endpoint/URL migration is outside this input-row fix.

The form labels `yHabaa` as Hebrew expression and `yHebrew` as Hebrew language for Arabic speakers. These are distinct certificate entries, not two required Hebrew entries for the Jewish-sector audit certificate. The initial values are **zero units and empty grade**; the browser serializes the form with `serializeArray`. Validation checks total units and English/mathematics minima; it does not require a nonzero `yHebrew`.

The adapter now accepts an absent separate `hebrew` row and sends `yHebrew=0&hebrew=`. A supplied Hebrew row is still checked and preserved. Hebrew expression remains required. No grades are invented. CS and civil regressions use the exact schema-v2 audit record and mocked official responses; both reach `exact` score 84.4, below 91/87 respectively. The evaluator test supplies the reviewed catalogue cutoffs rather than the older static catalogue cutoffs; this isolates the subject-record gate.

The official JS also suggests that individual Bible/history/literature rows may be empty when a valid sector-specific certificate supplies enough other units. This PR does not relax those rows: the adapter does not yet represent the complete alternative-sector/elective form or independently check the official 21-unit condition. The evidence does not justify treating an arbitrary partial transcript as a complete certificate. In particular, this fix does not certify elective-subject mapping or recompute the mocked 84.4 locally.

## 2. Duplicate IDs — fixed without retiring IDs

| Institution | Pair                              | Decision                                                                                            |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| Haifa       | `psychology` / `haifa_psychology` | Both withheld / `authority_unavailable`, with the same reason and official link                     |
| BIU         | `cs` / `biu_cs`                   | Both use the reviewed CS floor channels; `estimated`, no fabricated composite                       |
| BIU         | `ee` / `biu_ee`                   | Both use the reviewed EE channels, including existing official-source conflicts                     |
| BIU         | `law` / `biu_law`                 | Both use the institution-specific law alternatives, including the psychometric route                |
| BIU         | `criminology` / `biu_criminology` | Same institution-specific path; existing agreement retained                                         |
| TAU         | `business` / `tau_business`       | Existing six-route Management encoding already agrees; no TAU code change                           |
| TAU         | `accounting` / `tau_accounting`   | Existing Management-score encoding already agrees; mocked score 609 is below, 610 accepted for both |

Haifa's [psychology page](https://admissions.haifa.ac.il/social-sciences/program/3268/) is represented by the approved 2026-10-24 source packet and [re-encoding note](2026-10-24-haifa-psychology-reencode.md). The **650** regular score threshold remains valid published catalogue information, with waiting band **630–649**; the missing authority is a verified current calculator mapping/replay for that programme. The re-encoding explicitly withholds the institution-specific ID. This PR extends that withholding to the generic ID; it does not invalidate the published threshold or activate old numeric fixtures.

BIU sources, captured in the existing 2026-10-23/25 verification packets and read 2026-10-28:

- [Calculator](https://shoham.biu.ac.il/kabala/), [CS requirements](https://cs.biu.ac.il/he/tracks/bsc-in-computer-science), [law requirements](https://law.biu.ac.il/node/129), [engineering requirements](https://engineering.biu.ac.il/tracks/Electrical_Engineering).
- [Published Bagrut routes](https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry), [general requirements](https://www.biu.ac.il/registration-and-admission/information/general-admission-req).
- Interpretation: [BIU floor verification](2026-10-25-biu-floors.md). CS uses psychometric 690 + mathematics product 360, or quantitative 130 + five-unit mathematics 90. Law includes psychometric 720, the published Bagrut route, and the existing combined-floor path; this PR changes no threshold.

Generic IDs are resolved **only inside the institution's evaluation path**. Their other institutions, input IDs, saved references and catalogue IDs remain intact. API snapshots retain their own input/rule digests because those include programme identity; the answers agree. All 23 actual static-catalogue generic/specific pairs at Haifa, BIU and TAU are discovered in a table-driven evaluator test across missing, weak and audit profiles. Offline failures are explicitly mocked, not live calls. Separate API tests check the seven named pairs; accounting additionally exercises successful official-response parsing.

Routing generic BIU CS and EE adds two existing catalogue pairs to the tracked inventory, **141 → 143**, with no new catalogue rows. Withholding generic Haifa psychology changes exact pairs **124 → 123**. Withheld pairs become **16 → 19** (two tracked BIU aliases plus one Haifa withholding); the pre-existing Haifa blocked pair stays blocked.

## 3. BGU — score verdict and runtime authority

### CS score verdict

The captured [official CS conditions JSON](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1) requires quantitative composite **720**, overall psychometric **600**, quantitative section **125**, and mathematics **4 units/90 or 5 units/80**. Source captured 2026-09-27; read 2026-10-28 in `bguComputerScienceVerification.ts`. The [official quantitative calculator](https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=4) supplies the score; its form submission endpoint is `!rg.acc_SubmiTevaSekem`. The [2027 guide](https://www.bgu.ac.il/media/0mdl0p0x/%D7%99%D7%93%D7%99%D7%A2%D7%95%D7%9F-%D7%AA%D7%A9%D7%A4%D7%96-%D7%AA%D7%95%D7%90%D7%A8-%D7%A8%D7%90%D7%A9%D7%95%D7%9F-%D7%A0%D7%9B%D7%95%D7%9F-%D7%9C%D7%99%D7%95%D7%9D-01012026-%D7%9C%D7%90%D7%AA%D7%A8.pdf) describes the quantitative score family; the local 2026-09-27 PDF was read using `pdftotext`.

The adapter returns `derivedVerdict: pending` together with `scoreAssessment: meets_threshold` in score-only mode. This is an intentional separation from final institutional admission, not an official waiting band: acceptance and rejection cutoffs are both 720. A second evaluator wrapper applies language-confirmation conditions and also converts a score match to pending. Therefore changing only `normalizeExactProofResult` cannot fix the student-facing decision.

**Outcome: pending decision semantic explained; misleading waiting-band explanation fixed.** `resultLabel` already maps `scoreAssessment: meets_threshold` to the green `הציונים עומדים בסף` / `match` result when no separate condition is explicitly unmet. Therefore the audited unconfirmed-language profile already satisfies the green-on-scores product rule; changing the decision enum is unnecessary. The narrow normalizer change now describes a numeric score match, supplies the registration next action, and stops calling it an official waiting band. Separate conditions and `pending` remain intact. There are no verdict or threshold flips.

The investigation initially requested permission to edit the later wrapper. Reading the actual presentation mapping resolved that concern without needing the extension: **no wrapper edit was made**. The initial new accepted-enum probe was replaced during test design by the actual product-contract regression (green label, exact score, retained conditions, no false waiting explanation), then rerun against the original normalizer to observe its genuine explanation failure before changing code. No pre-existing BGU assertion was changed.

### Biology, economics, business and accounting — authority gate retained

Contrary to the initial suspicion, these pairs already have complete local official rule captures and independent high/low calculator replay evidence:

| Programme  | Official conditions URL suffix under `GetRdpData/?p_lang=he&p_year=2027&p_semester=1&` | Quantitative cutoff | Psychometric minimum | Current source ID     |
| ---------- | -------------------------------------------------------------------------------------- | ------------------- | -------------------- | --------------------- |
| Biology    | `p_dep1=205&p_pat1=15`                                                                 | 585                 | 585                  | `bgu-biology-live`    |
| Economics  | `p_dep1=142&p_pat1=3`                                                                  | 620                 | 600                  | `bgu-economics-live`  |
| Business   | `p_dep1=142&p_pat1=1&p_spe1=1`                                                         | 620                 | 600                  | `bgu-business-live`   |
| Accounting | `p_dep1=142&p_pat1=1&p_spe1=6`                                                         | 620                 | 620                  | `bgu-accounting-live` |

Source base: [BGU official conditions endpoint](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/). Sources captured **2026-09-27** in `2026-09-27-bgu-quantitative-routes-official.json`; controlled score/verdict comparisons in the matching `-controlled.json`. Each pair has high/low scores **879/486**, matching verdicts and source fingerprints. Institution-specific IDs have their own `bgu-bgu_<programme>-live` source IDs and matching fixtures. The alternative route thresholds and gates already live in `bguQuantitativeRoutesPolicy.ts`; no social-science threshold is substituted.

A local real-evaluator characterization reproduces the audited `authority_unavailable` / `pair_verification_incomplete` with **no current source attestation**, before any fetch. Supplying a fresh matching attestation and the recorded official rule allows all four pairs to evaluate exactly (mocked quantitative score 730, thresholds 585/620). The stored threshold is not the missing rule.

The operational gate requires `source_freshness_states` for the relevant source ID with `status=fresh`, `capability=decision_capable`, `proofLevel=exact_official`, an official-response/verified-derivation provenance, matching `reviewedSourceFingerprint`, and non-null `lastExactCheckAt`. A missing row or mismatched attestation fails closed. The audit response does **not** reveal which persisted field is absent/stale; this run did not inspect production SQL, so identifying a specific live field would be speculation. Jorje must inspect the four generic/equivalent specific source attestations against the fingerprints in `bguQuantitativeRoutesVerification.ts` before any authorized freshness repair. No data is unlocked and no operational state is changed by this PR.

## 4. Haifa subject-derived average — stopped; no code

Official sources read 2026-10-28:

- [Score/average rules](https://admissions.haifa.ac.il/score-calculation/), plus the saved official 2026-10-25 HTML/text capture.
- [Current calculator](https://applicants.haifa.ac.il/enrollmentChances/index.html).
- [Controller](https://applicants.haifa.ac.il/enrollmentChances/app/component/enrollmentChancesApp/controller/enrollmentChancesMain.controller.js), [model](https://applicants.haifa.ac.il/enrollmentChances/app/component/enrollmentChancesApp/store/Model.js), and [validator](https://applicants.haifa.ac.il/enrollmentChances/app/component/enrollmentChancesApp/utils/Validator.js).
- [Existing Haifa evidence note](2026-09-28-haifa-applicant-years.md): the servlet consumes an official average and real exam years; those captures verify composite scoring, not a subject-to-average derivation.

Published facts:

| Rule                                                                                                    | Published value                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Bonus eligibility                                                                                       | Grade at least 60; at least four units; no combined-subject bonus                                                                       |
| Mathematics                                                                                             | Four units +20; five units +35                                                                                                          |
| English, physics, chemistry, biology, Bible, history, literature, Arabic and Hebrew for Arabic speakers | Four units +20; five units +25                                                                                                          |
| Other listed eligible subjects                                                                          | Four units +10; five units +20                                                                                                          |
| Unlisted main technological subject                                                                     | Bonus eligibility begins at seven units; full bonus behavior needs confirmation                                                         |
| Weighted mean                                                                                           | Sum of grade-with-bonus × units divided by included units                                                                               |
| Optimization                                                                                            | Retain compulsory subjects; omit optional subjects only to improve the mean, with at least 20 units and a valid certificate composition |

The page has a 2027 heading but older 2022/2023 subsection text and last-update stamp. It does not establish a current per-subject/overall cap or rounding rule, nor fully map compulsory subject combinations and technological/project rows to the schema-v2 certificate variants. The current browser delegates average calculation to server operation `calculateBagrutAvg` with a diploma code and subject codes; the assets do not supply the numerical implementation. An attempted `getDiplomaCourses` request using diploma `001` returned an error document, not a usable diploma mapping. This is not evidence that every calculator operation is down.

Without a verified current cap/no-cap rule and full certificate mapping, a hand-computed audit result or a “bonus-cap” expectation would be invented. Per the brief, **no `calculateHaifaBagrutAverage` implementation, normalization wiring, or fabricated expected arithmetic is shipped**. Existing average input behavior remains. Needed next evidence: current official diploma/subject dictionary plus average calculation fixtures for the audit profile, a high-bonus profile and a minimum-unit/no-bonus boundary, with confirmed caps, rounding, and compulsory groups.

## 5. TAU spot-check — report only

Exactly **six** direct calls to [TAU GraphQL](https://go.tau.ac.il/graphql), all HTTP 200. Full request/response bodies and timestamps are in [the evidence receipt](evidence/2026-10-29-bugs-first-official.json). No MyWay production request was made. The first three calls request score bundles; the last three read the programme nodes used by the adapter. Requests 4–6 were explicitly spaced by 8.1 seconds after each completed response. The third receipt records response completion rather than request start; its exact start-to-start interval from call 2 cannot be certified from the saved timestamps. No further TAU calls were made.

The normal adapter request is `getLastScore`, `scoresData={prog:calctziun,out:json,psicho:700,bagrut:92.1,reali10:0}`. Engineering sets `reali10:1`. One score bundle contains all faculty fields.

| Programme / official node      | Audited MyWay score | Direct TAU result for the adapter's actual input        | Current official acceptance/rejection | Conclusion                                                                                                              |
| ------------------------------ | ------------------- | ------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Psychology / 8275              | 600                 | `hatama=600`                                            | 660 / 659                             | Matches TAU response                                                                                                    |
| Law / 11820                    | 600                 | `hatama=600`                                            | 647 / 646                             | Matches TAU response; registration comment restricts registration to second year, not proof of an open first-year route |
| Electrical engineering / 11233 | 610                 | `hatama_meduyakim=610` with `reali10=1`; 600 without it | 710 / 709                             | Matches TAU response and official bonus handling                                                                        |

**The 600/610 cluster originates in TAU's service, not a local MyWay score clamp.** These requests show an official lower plateau for this input; they do not reveal TAU's private formula or prove a universal minimum clamp.

There is a separate evaluator input-mapping defect to fix in a later authorized TAU change. `normalizeEvaluationInputs` derives **109.14** from the schema-v2 audit certificate. That certificate is external, so the existing TAU derivation compares its optimized average with its external-certificate alternative. CS explicitly submits `extraInputs.tauBagrutAverage`, while psychology, law and engineering pass `input.bagrut=92.1` to the adapter. Replaying **109.14/700**, with `reali10=1`, returned `hatama=685` and engineering/exact-sciences fields **695**. Thus the audited outputs correctly mirror the requests our code makes, but those requests ignore the institution-specific derived average outside CS/Management. This can change psychology/law score-condition results, and is not evidence to alter TAU formulas in this PR. The legacy dispatcher is not involved in these official replay paths.

## Test-first evidence

New behavior tests were run on unchanged relevant production code before the fix. The test fixture was corrected to use the actual Technion catalogue IDs/current cutoff context before the authoritative Technion red run. Transient fixture/reference errors were not counted as behavioral failures.

| New regression                                                                  | Failing-before output                                                                                                 |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `technion_cs evaluates exactly without a separate Hebrew row`                   | Expected `kind: exact, decision: below, score: 84.4`; received `kind: needs_input, decision: unknown`, no score       |
| `technion_civil evaluates exactly without a separate Hebrew row`                | Same failure: needs_input instead of exact                                                                            |
| `serializes absent Arabic-speaker Hebrew as zero units and an empty grade`      | `expected "vi.fn()" to be called 2 times, but got 0 times`                                                            |
| Haifa `psychology / haifa_psychology`, missing/weak/audit agreement             | `kind: needs_input` and `requiredInputs: [haifa_bagrut_average]` instead of authority_unavailable/no requested inputs |
| BIU `cs / biu_cs`, missing/weak/audit agreement                                 | Generic `unsupported` versus specific needs_input/estimated floor results                                             |
| BIU `ee / biu_ee`, missing/weak/audit agreement                                 | Generic `unsupported` versus specific needs_input/estimated floor results                                             |
| BIU `law / biu_law`, weak/audit agreement                                       | Different channel floor checks and verdict/assessment behavior; generic law was restricted to Bagrut                  |
| `psychology keeps Haifa psychology withheld`                                    | Expected authority_unavailable/pair_verification_incomplete; received needs_input                                     |
| `BGU CS score 720 meeting the published 720 cutoff is accepted`                 | `Expected decision: accepted; Received decision: pending`, with exact score 720 / threshold 720                       |
| `BGU CS score 730 meeting the published 720 cutoff is accepted`                 | Same failure with score 730 / threshold 720                                                                           |
| API `haifa: psychology preserves its identity and agrees with haifa_psychology` | Different kind, required inputs, authority explanation/link                                                           |
| API BIU `cs`, `ee`, `law` identity/agreement tests                              | Unsupported/mismatched floor-channel answers versus the institution-specific answers                                  |

Other duplicate pairs, TAU accounting boundary replays, the retained Haifa-specific withholding, and BGU fresh/absent-attestation characterizations already passed on their unchanged behavior; they assert preservation rather than claim an invented red failure. Baseline logs were retained during execution under `/tmp/myway-bugs-first-evidence/`; their behavior failures above are the durable record for the PR.

## Existing assertion updates approved by the brief

Every directly changed assertion carries `// Approved test update, Jorje 2026-10-28`.

| File/assertion                                                        | Before → after                                                                                                                                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evaluator.capabilityMatrix.test.ts`: full rows and changed-pair list | CS/EE at BIU: unsupported/excluded/browser-required source → estimated/in-scope/no source target; changed pairs `[medicine@bgu]` → `[cs@biu, ee@biu, medicine@bgu]`; every row/field still compared |
| `formulaBackedPairInventory.test.ts`: exact BIU pair list             | Existing ten → twelve, adding `cs__biu`, `ee__biu`                                                                                                                                                  |
| Same test: membership of generic CS/EE                                | Excluded list → included list; other exclusions unchanged                                                                                                                                           |
| `formulaBackedVerificationLedger.test.ts`: ledger length              | 141 → 143                                                                                                                                                                                           |
| Same: overall completion                                              | total 141 → 143, exact 124 → 123, withheld 16 → 19                                                                                                                                                  |
| Same: institution completion                                          | Haifa exact 25 → 24, withheld 1 → 2; BIU total/withheld 10 → 12                                                                                                                                     |
| Same: exact-filter length                                             | 124 → 123                                                                                                                                                                                           |
| Same: withheld-filter length                                          | 16 → 19                                                                                                                                                                                             |
| `degrees/index.test.ts`: inventory total / BIU count                  | 141 → 143 / 10 → 12                                                                                                                                                                                 |
| `calculatorCoverage.test.ts`: aggregate completion                    | 141/124/16 → 143/123/19 (total/exact/withheld); production coverage module unchanged                                                                                                                |
| `server/data-health/queries.test.ts`: aggregate completion            | Same aggregate correction; production data-health code unchanged                                                                                                                                    |
| `biuPublishedRoutesEvaluation.test.ts`: generic-law weak explanation  | “Bagrut-only route” substring → psychometric-720 route substring                                                                                                                                    |
| Same: generic-law Bagrut just below boundary with psychometric 800    | below → pending, matching existing `biu_law`                                                                                                                                                        |
| `biuLawChannels.test.ts`: generic law 95/730                          | below → pending; psychology/optometry/medicine remain below in that direct-helper test                                                                                                              |

## Delivery checks and remaining limits

- CE plan → work → simplification. Review pipelines and subagents are excluded by the brief; no ce-code-review or document-review pipeline ran.
- New regression and API alias tests are added to the existing pre-PR guard list; no GitHub workflow is added or run manually.
- `npx prettier --write` on every changed file: passed. `npm run typecheck`: passed. `npm run lint`: passed.
- Full suite (`env -u DATABASE_URL npm test`): **286 files passed, 14 skipped; 4,646 tests passed, one expected failure, 101 skipped** (4,748 total), no unexpected failures.
- Required `env -u DATABASE_URL npm run guard:pre-pr`: **121 files / 3,080 tests passed**. Local migration/grant checks, catalogue seed dry-run and committed Monday evidence verification also pass. The guard does not itself run lint/typecheck in this checkout, so both were run separately above.
- No UI, auth, environment/secret changes, production SQL, writes, migrations, seeds, workflow runs, or MyWay production calls. The guard performs only the required local catalogue seed **dry-run** and migration/grant consistency checks.
- Browser, deployed Vercel and production Supabase state were not verified. These are backend changes with mocked official-source replay and direct read-only official calculator evidence; no screenshots or authenticated browser claims are made.
- Remaining limits: Haifa average derivation is intentionally stopped; BGU operational attestations require separately authorized inspection/repair; TAU average submission is a report-only follow-up; the old Technion calculator URL/endpoint availability and wider transcript/elective mapping remain outside this fix.

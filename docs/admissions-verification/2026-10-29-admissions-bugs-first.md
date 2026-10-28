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

| New regression                                                                                     | Failing-before output                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `technion_cs evaluates exactly without a separate Hebrew row`                                      | Expected `kind: exact, decision: below, score: 84.4`; received `kind: needs_input, decision: unknown`, no score                                                                    |
| `technion_civil evaluates exactly without a separate Hebrew row`                                   | Same failure: needs_input instead of exact                                                                                                                                         |
| `serializes absent Arabic-speaker Hebrew as zero units and an empty grade`                         | `expected "vi.fn()" to be called 2 times, but got 0 times`                                                                                                                         |
| Haifa `psychology / haifa_psychology`, missing/weak/audit agreement                                | `kind: needs_input` and `requiredInputs: [haifa_bagrut_average]` instead of authority_unavailable/no requested inputs                                                              |
| BIU `cs / biu_cs`, missing/weak/audit agreement                                                    | Generic `unsupported` versus specific needs_input/estimated floor results                                                                                                          |
| BIU `ee / biu_ee`, missing/weak/audit agreement                                                    | Generic `unsupported` versus specific needs_input/estimated floor results                                                                                                          |
| BIU `law / biu_law`, weak/audit agreement                                                          | Different channel floor checks and verdict/assessment behavior; generic law was restricted to Bagrut                                                                               |
| `psychology keeps Haifa psychology withheld`                                                       | Expected authority_unavailable/pair_verification_incomplete; received needs_input                                                                                                  |
| `BGU CS score 720 meeting the published 720 cutoff stays green without a waiting-band explanation` | `Expected: "עומד בסף"; Received: "מקור רשמי של אוניברסיטת בן-גוריון הציב את הציון בין סף הדחייה לסף הקבלה, ולכן עדיין אין החלטה סופית."`; the green-label assertion already passed |
| `BGU CS score 730 meeting the published 720 cutoff stays green without a waiting-band explanation` | Same false-waiting explanation failure with exact score 730 / threshold 720                                                                                                        |
| API `haifa: psychology preserves its identity and agrees with haifa_psychology`                    | Different kind, required inputs, authority explanation/link                                                                                                                        |
| API BIU `cs`, `ee`, `law` identity/agreement tests                                                 | Unsupported/mismatched floor-channel answers versus the institution-specific answers                                                                                               |

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

## Delivery checks and remaining limits — items 1–5

- CE plan → work → simplification. Review pipelines and subagents are excluded by the brief; no ce-code-review or document-review pipeline ran.
- New regression and API alias tests are added to the existing pre-PR guard list; no GitHub workflow is added or run manually.
- `npx prettier --write` on every changed file: passed. `npm run typecheck`: passed. `npm run lint`: passed.
- Full suite (`env -u DATABASE_URL npm test`): **286 files passed, 14 skipped; 4,646 tests passed, one expected failure, 101 skipped** (4,748 total), no unexpected failures.
- Required `env -u DATABASE_URL npm run guard:pre-pr`: **121 files / 3,080 tests passed**. Local migration/grant checks, catalogue seed dry-run and committed Monday evidence verification also pass. The guard does not itself run lint/typecheck in this checkout, so both were run separately above.
- No UI, auth, environment/secret changes, production SQL, writes, migrations, seeds, workflow runs, or MyWay production calls. The guard performs only the required local catalogue seed **dry-run** and migration/grant consistency checks.
- Browser, deployed Vercel and production Supabase state were not verified. These are backend changes with mocked official-source replay and direct read-only official calculator evidence; no screenshots or authenticated browser claims are made.
- Remaining limits: Haifa average derivation is intentionally stopped; BGU operational attestations require separately authorized inspection/repair; TAU average submission is a report-only follow-up; the old Technion calculator URL/endpoint availability and wider transcript/elective mapping remain outside this fix.

## Item 6. TAU and Technion engineering mathematics — fixed

Captured **2026-10-28**. Read commit `208bcf8` (#310) before implementation: it already renders alternatives in the required cell. This change uses its existing `math_route/...` admission-fact groups and changes no component, route handler or UI shell. It does not change acceptance-score formulas or cutoffs.

### Official sources and rules

| Source                                                                                                                    | Mathematics requirement encoded                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [TAU mechanical engineering](https://go.tau.ac.il/he/engineering/ba/mechanical?v=admission-requirements)                  | 5 units ≥75; or 4 units ≥85 plus passing the maths classification exam; or ≥75 in each of two approved courses at the same university. The course route explicitly exempts the classification exam.                                                                                |
| [TAU electrical engineering](https://go.tau.ac.il/he/engineering/ba/electrical?v=admission-requirements)                  | 5 units ≥80; or 4 units ≥90 plus passing the maths classification exam; or ≥75 in one approved course. The page does not explicitly say this course route exempts the exam, so no such exemption is claimed.                                                                       |
| [TAU industrial engineering](https://go.tau.ac.il/he/engineering/ba/industrial-engineering?v=admission-requirements)      | Same maths alternatives as mechanical engineering: 5/75, 4/85 plus classification, or two approved courses ≥75 each with the stated exemption.                                                                                                                                     |
| [TAU digital sciences for high tech](https://go.tau.ac.il/he/engineering/ba/high-tech-plus?v=admission-requirements)      | 5 units ≥75; or 4 units ≥85 plus classification, or ≥70 in **each** of the two online courses גשר למתמטיקה אקדמית 1 ו־2. The two-course option replaces classification within the four-unit route. Existing `tau_datascience`/`datascience@tau` identity mapping is retained.      |
| [TAU computer science](https://go.tau.ac.il/he/exact/ba/computer?v=requirements)                                          | 5 units ≥80; or 4 units ≥88; or 5 units 70–79 / 4 units 75–87 plus classification ≥75. Included because its legacy `isTauEngineering` flag and copy share the same five-unit assumption; it is in the exact-sciences faculty. Existing dedicated CS admission policy is preserved. |
| [Technion knowledge of mathematics](https://admissions.technion.ac.il/math-knowledge/)                                    | For all programmes except the explicitly named nonengineering exceptions: 5 units ≥70 directly; 5 units below 70 or 4 units require classification ≥70. The four-unit clause states no extra certificate-grade floor. Open University חדו״א א׳ (20406) ≥65 exempts classification. |
| [Technion winter acceptance table](https://admissions.technion.ac.il/sechem-for-admission/מסלולי-הלימוד-לפי-אפיקי-הקבלה/) | Cross-check of engineering programme identities. No score cutoff/cycle is changed by item 6.                                                                                                                                                                                       |

ME/industrial approved courses: two from TAU חדו״א 1א, 1ב, 2א, 2ב, אלגברה; **or** two from Open University אינפי 1, אינפי 2, חדו״א ב, אלגברה ליניארית 1, אלגברה ליניארית 2. Courses from different universities are not combined. EE: one from TAU חדו״א 1א, חדו״א 1ב, אלגברה ליניארית; or Open University אינפי 1, אינפי 2, אלגברה ליניארית 1.

The unverified leads are supported, with the programme-specific qualifications above. TAU's engineering pages require passing classification but publish no numeric pass mark in these clauses. That condition is stored as text with a null numeric value, not an invented exam grade. Technion explicitly publishes **70**; TAU CS explicitly publishes **75**. Exam/course results are not collected by this evaluator; a route depending on them remains unverified on that condition. A four-unit applicant is no longer rejected merely for lacking five units, and no passed exam/course is fabricated. This follows the rule that an uncollected published score gets no verdict on that condition. A five-unit Technion grade ≥70 with other score conditions met remains green.

The Technion general page expressly excludes architecture/landscape architecture, biology/chemistry and teaching biology/chemistry. Those programmes are outside this engineering sweep and unchanged. No engineering programme below appears in the exceptions.

The source receipt's `item6` section records URLs, response status, capture timestamps, SHA-256 and extracted maths clauses. Successful GETs were spaced by at least 8.1 seconds after response completion. A guessed TAU `/industrial` URL returned 404 before the correct linked `/industrial-engineering` URL was used. The first Python request to Technion disconnected; a subsequent spaced curl GET succeeded. No MyWay production call, new TAU GraphQL score call, aggregator or database connection was used for item 6.

### Complete programme sweep

The inventory includes all TAU/Technion engineering programmes currently present in this checkout, their generic aliases, and legacy engineering placeholders. A generic alias row is a separate institution pair; all saved IDs and links are retained.

| Institution | Programme ID           | Verdict                                          | Change / source                                                                                                                                                       |
| ----------- | ---------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TAU         | `tau_me`               | fixed                                            | Five-only claim → 5/75 or 4/85 + classification or two-course alternative; ME page.                                                                                   |
| TAU         | `me`                   | fixed                                            | Same source-backed maths routes as `tau_me`.                                                                                                                          |
| TAU         | `tau_ee`               | fixed                                            | Five-only claim → 5/80 or 4/90 + classification or one-course alternative; EE page.                                                                                   |
| TAU         | `ee`                   | fixed                                            | Same source-backed maths routes as `tau_ee`.                                                                                                                          |
| TAU         | `tau_industrial`       | fixed                                            | Five-only claim → 5/75 or 4/85 + classification or two-course alternative; industrial page.                                                                           |
| TAU         | `tau_datascience`      | fixed                                            | Existing 4/85 alternative was correct but incomplete: adds classification/two-MOOC condition and grouped routes; digital-sciences page.                               |
| TAU         | `datascience`          | fixed                                            | Same maths routes as `tau_datascience`; digital-sciences page.                                                                                                        |
| TAU         | `tau_cs`               | fixed                                            | Legacy copy five-only → direct 5/80 or 4/88 and classification-75 alternatives; CS page. Dedicated CS evaluator policy unchanged.                                     |
| TAU         | `cs`                   | fixed                                            | Same maths content as `tau_cs`; existing CS policy retained.                                                                                                          |
| Technion    | `technion_ee`          | fixed                                            | 5/70 direct or 4 units / lower five-unit grade + classification70; OU exemption65. General mathematics page.                                                          |
| Technion    | `ee`                   | fixed                                            | Same maths alternatives as `technion_ee`.                                                                                                                             |
| Technion    | `technion_me`          | fixed                                            | Same general mathematics rule.                                                                                                                                        |
| Technion    | `me`                   | fixed                                            | Same general mathematics rule.                                                                                                                                        |
| Technion    | `technion_civil`       | fixed                                            | Same general mathematics rule.                                                                                                                                        |
| Technion    | `technion_industrial`  | fixed                                            | Same general mathematics rule.                                                                                                                                        |
| Technion    | `technion_biomedical`  | fixed                                            | Same general mathematics rule; no medicine/biomedical dual-track claim.                                                                                               |
| Technion    | `technion_cs`          | fixed                                            | Same general mathematics rule; removes absolute five-only claim.                                                                                                      |
| Technion    | `cs`                   | fixed                                            | Same general mathematics rule.                                                                                                                                        |
| Technion    | `technion_datascience` | fixed                                            | Same general mathematics rule; removes absolute five-only claim.                                                                                                      |
| Technion    | `datascience`          | correct as-is copy; facts fixed                  | Its 2026-10-21 verified note already allows 5/70 or 4 + classification70 and is retained. Stale five-only facts are replaced by the same grouped general rule.        |
| TAU         | `tau_engineering`      | unverifiable programme-specific maths; unchanged | Generic faculty placeholder with no five-only claim or single programme identity. ME/EE rules differ; assigning either would invent a programme-specific floor.       |
| Technion    | `technion_engineering` | correct as-is; unchanged                         | Generic faculty placeholder with no five-only claim. No specific programme floor is invented. Named programme rows above carry the official general mathematics rule. |

### Wiring, tests and limits

`engineeringMathRequirements.ts` provides an explicit programme/institution map and source-linked maths facts. It replaces only maths notes/facts, preserving physics/English and other conditions. `catalogueContentRepair.ts` applies it after static legacy normalization; `server/catalogue/serializers.ts` applies the same narrow helper after successful DB serialization. This is not a static fallback or a DB update. `evaluationInputs.ts` copies missing ordinary maths grade/units from the actual subject record for these programme IDs, preserving explicitly supplied fields. Without this, the new grade gates would ask for maths grades already present in the certificate. No whole-programme verification date is stamped from maths-only evidence.

New test-first evidence (retained locally in `/tmp/myway-item6/`):

| Test                                                                                                                                                            | Observed red before fixing                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `item 6 engineering mathematics alternatives > %s at %s publishes alternatives without an unconditional five-unit gate` (all 20 institution pairs in the sweep) | Existing specific/generic maths rows contained `5 יח"ל מתמטיקה — חובה`; some generic rows had no institution detail. Digital-sciences copy lacked `סיווג`.                                                                                                               |
| `%s repairs stale persisted copy and facts while preserving non-maths requirements` (`tau_me`, `technion_ee`)                                                   | Expected `4 יחידות`; received the five-only note.                                                                                                                                                                                                                        |
| `derives missing ordinary maths fields from an engineering subject record without overwriting supplied fields`                                                  | Expected `mathUnits:4, mathGrade:85`; ordinary maths fields were absent. The preservation assertion already passed.                                                                                                                                                      |
| `Technion EE maths 4/85 retains the official conditional route: unknown`                                                                                        | Expected decision `unknown`, threshold91.5; received `below`, threshold5.                                                                                                                                                                                                |
| `Technion EE maths 5/69 retains the official conditional route: unknown`                                                                                        | Expected `unknown`; received `accepted`.                                                                                                                                                                                                                                 |
| `catalogue serializers > item 6 repairs persisted %s mathematics after a database read` (all 12 specific IDs above)                                             | Expected notes containing `4 יחידות`; received `5 יח"ל מתמטיקה — חובה דרישה אחרת שנשמרת`.                                                                                                                                                                                |
| `does not invent a numeric pass mark for TAU engineering classification exams`                                                                                  | During implementation, caught an erroneous numeric sentinel1: expected null numeric value/textual completion; received `valueNumber:1`, `valueText:null`, unitpoints. Corrected to null numeric value with boolean completion metadata; no artificial cutoff is shipped. |

The authoritative baseline replay restored the pre-item-6 production files, ran the finalized initial tests, and restored the implementation in a `finally` block: **37 failed / 23 passed** across the two new test files and serializer tests. The later no-invented-pass-mark test separately failed **1 / 24** before its fix. Technion 5/70 accepted and 3/100 below are preservation/boundary tests that already passed the baseline; they are not claimed as red failures. Fixture-only corrections (serialized threshold maps omit null entries, and the existing below explanation reports the first failed branch) are excluded from failure evidence.

Existing assertions directly changed for item 6, each marked with `// Approved test update, Jorje 2026-10-28`: `catalogueContentRepair.test.ts`, “preserves every existing numeric rule, fact and alternative path across the content overlay”. Before: all facts byte-equal. After: all **non-maths** facts byte-equal for the explicitly reviewed maths pairs, every fact still byte-equal for other pairs; new tests separately assert the exact grouped source-backed maths routes. Score thresholds, minima, alternative paths and non-maths copy remain checked unchanged. Two further existing test groups directly expected the erroneous five-only copy: `server/catalogue/queries.test.ts` for `technion_ee`/`technion_me` now expects winter cutoff + official maths alternatives + OU exemption + unchanged physics instead of winter cutoff + five-only maths + physics. `lib/__tests__/StudyJourney.technionWinter.test.tsx` (detail/compare × EE/ME) now asserts those three subject notes rather than the old two, with the ordered subject slice changing `[1,3)` → `[1,4)`; the physics lookup moves index1 → index2 while its before-spring assertion stays intact. These are tests only, outside `src/components`; no component is edited. All winter/spring thresholds, order checks and contact/save assertions remain. No unrelated existing assertion is changed.

Final item-6 validation: `npx prettier --write` on all changed files, `npm run lint`, and `npm run typecheck` passed. `env -u DATABASE_URL npm run guard:pre-pr` passed **124 files / 3,128 tests**, including the two new regression files and the existing Technion no-score detail/compare test. The full `env -u DATABASE_URL npm test` passed **288 files; 4,686 tests passed, one expected failure, 101 skipped** (4,788 total; 14 files skipped). Item 6 adds 40 expanded cases. The required CE simplification pass reused the identical ME/industrial source wording without changing behavior; no review pipeline or subagent ran. Source/product verification by Jorje remains required. No deployed browser, Vercel or Supabase verification is claimed; the successful-read DB serializer regression exercises the stale persisted-data case locally without touching a database.

## UX follow-ups (PR317 walkthrough)

Capture/investigation date: **2026-10-28**. Scope: PR #318 after `83b0ab1`. Read the complete [walkthrough report](/workspace/qa-evidence/ux-walkthrough-2026-10-28-pr317/report.md), the supplied Braude/BGU text captures and the medicine-92 screenshot. This follow-up was planned before implementation; no CE review pipeline or subagent ran.

### UX-1 — source fixed; persisted DB publication stopped

The public English is present in repository data, not just an unknown remote row. `src/data/degrees/index.ts` copied `mondayAdmissionsEvidence[].limitations` into `specificAdmissionNotes` and `decisionReason` into `programDescription`. The originating Braude evidence is item **12220708942**, in `mondayEvidenceOverrides.json` and `mondayEvidence.generated.ts`. Its English explains evaluator limitations; it is not an admissions condition.

The generator now keeps those internal fields in the evidence record, omits them from public descriptions, and uses the existing honest Hebrew fallback, **“לפרטים על תנאי הקבלה, יש לבדוק באתר המוסד.”** Source-backed programme repairs still override that fallback. Originally empty notes stay empty: adding a placeholder there could incorrectly imply a manual admissions gate. No evidence record, ID, threshold, fact, alternative path or programme listing is deleted or changed.

Official Braude sources, read-only and spaced, captured **2026-10-28**:

- [Admissions requirements](https://w3.braude.ac.il/intrested/): a department-specific 2027 table, with differing psychometric/components/maths and other subject conditions. `braude_engineering` is an umbrella record; assigning one department's cutoff to it would be false.
- [Preparatory programmes](https://w3.braude.ac.il/department/mechina/?yeudit#section-id-2): distinguishes the dedicated engineering preparatory programme from the shorter pre-engineering route, with different certificate/English/maths conditions. The generic `braude_prep` ID does not identify one route, so it links to this page without inventing a combined rule. This is an identity/route limitation, not a claim that Braude publishes no conditions.

The regression sweeps **all 403 normalized/repaired static programmes**, including unlisted/course rows. It checks programme requirements, institution-specific notes, admission-fact descriptions/value text and alternative-path titles/descriptions. It rejects multiword Latin prose after a narrow qualification/course-code/URL allowlist. Legitimate `UX/UI` and `SOC Analyst` course names are preserved; generic words from developer sentences are not allowlisted. The authoritative baseline found **162 internal notes on 113 programme IDs**. All originate in `record.limitations`; the table below lists every affected programme, not just the two visited in QA. The original evidence remains intact. Verified Hebrew requirements and all structured admission facts are preserved.

| Programme ID                       | Internal notes replaced by Hebrew fallback |
| ---------------------------------- | ------------------------------------------ |
| `technion_engineering`             | 2                                          |
| `bgu_engineering`                  | 7                                          |
| `biu_engineering`                  | 4                                          |
| `biu_prep`                         | 4                                          |
| `ariel_engineering`                | 7                                          |
| `telhai_general_academic`          | 3                                          |
| `reichman_engineering`             | 2                                          |
| `wingate_general_academic`         | 2                                          |
| `afeka_engineering`                | 1                                          |
| `shenkar_engineering`              | 1                                          |
| `hit_engineering`                  | 1                                          |
| `sce_general_academic`             | 3                                          |
| `azrieli_engineering`              | 1                                          |
| `braude_engineering`               | 2                                          |
| `braude_prep`                      | 2                                          |
| `ruppin_engineering`               | 5                                          |
| `ruppin_prep`                      | 3                                          |
| `sapir_law`                        | 2                                          |
| `sapir_prep`                       | 2                                          |
| `emek_yezreel_general_academic`    | 1                                          |
| `bezalel_graphic_design`           | 1                                          |
| `hadassah_general_academic`        | 1                                          |
| `wizo_general_academic`            | 1                                          |
| `beit_berl_graphic_design`         | 1                                          |
| `colman_law`                       | 2                                          |
| `colman_business`                  | 2                                          |
| `ono_medicine`                     | 2                                          |
| `bishulim_culinary`                | 2                                          |
| `mon_12220697934_certificate`      | 1                                          |
| `nativ_graphic_design`             | 1                                          |
| `beit_zvi_certificate`             | 1                                          |
| `mon_12220697942_certificate`      | 1                                          |
| `mon_12220696299_certificate`      | 1                                          |
| `david_yellin_education`           | 1                                          |
| `mon_12341128292_medicine`         | 1                                          |
| `shaare_mishpat_law`               | 1                                          |
| `ramat_gan_law`                    | 1                                          |
| `ramat_gan_business`               | 1                                          |
| `schechter_certificate`            | 1                                          |
| `mon_12341126300_education`        | 1                                          |
| `herzog_general_academic`          | 1                                          |
| `tech_management_engineering`      | 1                                          |
| `mon_12341107541_engineering`      | 1                                          |
| `netanya_law`                      | 2                                          |
| `netanya_business`                 | 2                                          |
| `seminar_certificate`              | 1                                          |
| `tcb_engineering`                  | 2                                          |
| `sce_engineering`                  | 1                                          |
| `telhai_prep`                      | 1                                          |
| `sce_prep`                         | 1                                          |
| `mon_12341128848_engineering`      | 1                                          |
| `kinneret_engineering`             | 1                                          |
| `telhai_engineering`               | 1                                          |
| `atid_engineering`                 | 1                                          |
| `mon_12341126575_beauty`           | 1                                          |
| `israel_academic_general_academic` | 1                                          |
| `mon_12341118768_general_academic` | 1                                          |
| `mon_12341091518_certificate`      | 1                                          |
| `mon_12341092889_certificate`      | 1                                          |
| `open_university_certificate`      | 2                                          |
| `achva_general_academic`           | 1                                          |
| `mon_12341102793_engineering`      | 1                                          |
| `sapir_certificate`                | 1                                          |
| `mon_12341107292_general_academic` | 1                                          |
| `mon_12341098736_certificate`      | 1                                          |
| `givat_washington_medicine`        | 1                                          |
| `mon_12341142058_certificate`      | 1                                          |
| `lfa_beauty`                       | 1                                          |
| `zefat_general_academic`           | 2                                          |
| `mon_12341114281_certificate`      | 1                                          |
| `mon_12341113217_certificate`      | 1                                          |
| `kaye_education`                   | 1                                          |
| `mon_12341114949_certificate`      | 1                                          |
| `mon_12341144078_certificate`      | 1                                          |
| `mon_12341091770_certificate`      | 1                                          |
| `beit_berl_general_academic`       | 1                                          |
| `tiltan_medicine`                  | 1                                          |
| `mon_12341133521_certificate`      | 1                                          |
| `peres_law`                        | 3                                          |
| `peres_business`                   | 3                                          |
| `mon_12341122838_certificate`      | 1                                          |
| `mon_12341122522_certificate`      | 1                                          |
| `mon_12341133625_certificate`      | 1                                          |
| `aliya_certificate`                | 2                                          |
| `mon_12341138527_certificate`      | 1                                          |
| `mon_12341134763_engineering`      | 1                                          |
| `atid_certificate`                 | 1                                          |
| `mon_12341165356_certificate`      | 1                                          |
| `mon_12341134000_certificate`      | 1                                          |
| `mon_12341108613_certificate`      | 1                                          |
| `mon_12341189515_certificate`      | 1                                          |
| `mon_12341166173_certificate`      | 1                                          |
| `tiltan_graphic_design`            | 1                                          |
| `tiltan_certificate`               | 1                                          |
| `mon_12341165867_certificate`      | 1                                          |
| `mon_12341148361_certificate`      | 1                                          |
| `mon_12341165912_certificate`      | 1                                          |
| `mon_12341134405_certificate`      | 1                                          |
| `mon_12341189317_certificate`      | 1                                          |
| `mon_12341162526_general_academic` | 1                                          |
| `mon_12341166462_certificate`      | 1                                          |
| `mon_12341167257_certificate`      | 1                                          |
| `reidman_medicine`                 | 1                                          |
| `johnbryce_certificate`            | 1                                          |
| `mediteva_certificate`             | 1                                          |
| `oranim_education`                 | 1                                          |
| `mon_12341168659_graphic_design`   | 1                                          |
| `mon_12341185806_certificate`      | 1                                          |
| `mon_12341166735_certificate`      | 1                                          |
| `givat_washington_certificate`     | 1                                          |
| `mon_12341187468_certificate`      | 1                                          |
| `mon_12341167283_certificate`      | 1                                          |
| `mon_12341179463_education`        | 1                                          |

**Database boundary:** static/source corrections are complete; no deployed DB fix is claimed. `src/server/catalogue/serializers.ts:100` reads stored institution names and `:106` copies `admission_requirements.specific_admission_notes`; `:244`–`:249` retain stored programme names/institution labels. These Braude rows are not in that serializer's content-repair allowlist. Per the brief, no DB write or workaround was added. Persisted copies require a separately reviewed `reviewedManifest` **`canonical_change`**. Exact logical targets and proposed text:

| Target                                                                                 | Proposed canonical change                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `programs.id=braude_engineering`                                                       | `name`: `הנדסה וטכנולוגיה - המכללה האקדמית להנדסה אורט בראודה`; `institution_name`: `המכללה האקדמית להנדסה אורט בראודה`.                                                                                                                                                                  |
| `admission_requirements` pair `(program_id=braude_engineering, institution_id=braude)` | `specific_admission_notes`: `["לפרטים על תנאי הקבלה, יש לבדוק באתר המוסד."]`; remove the copied internal `program_description` if it matches the diagnostic, retaining the evidence in its internal source. Expected seed key `braude_engineering:braude`. Official admissions URL above. |
| `programs.id=braude_prep`                                                              | `name`: `מכינה קדם-אקדמית - המכללה האקדמית להנדסה אורט בראודה`; same canonical `institution_name`.                                                                                                                                                                                        |
| `admission_requirements` pair `(program_id=braude_prep, institution_id=braude)`        | Same Hebrew fallback and diagnostic-description removal; expected seed key `braude_prep:braude`; programme/calculator source link to the preparatory URL above.                                                                                                                           |
| Other affected IDs in the table, **if persisted with the same diagnostic**             | Review each exact programme/institution pair against the current row before a canonical change. Replace only copied diagnostic fields; preserve official Hebrew conditions, facts, URLs and evidence. No persisted-row content or physical ID is asserted from an unperformed DB query.   |

The pair selectors and expected seed keys come from `src/db/seeds/catalogueSeed.ts:244`; no seed was executed. Current physical requirement rows and their before-values must be confirmed by an authorized read-only check before a manifest is approved. This limitation is explicit rather than claiming a static change rewrites production.

### UX-2 — fixed within the admissions policy grant

For **both `psychology` and `bgu_psychology`, Bagrut98/psychometric600**, the mocked official BGU replay returns620 versus680. The entered Bagrut average is a proxy, not the derived BGU average; neither a failed proxy score nor an unknown preparatory history proves failure of every route. Asking for `bagrut_subject_record` is correct.

`proxyEvaluationGuard.ts` already converts that result to `needs_input`, but previously spread the result without clearing620 and the computed gap. The narrow BGU-psychology branch now clears `score` and `deltaNeeded` when that conversion happens. The published680 threshold remains contextual data; no computed score is shown without the required inputs. The snapshot is created after the guard. Direct psychometric/recognised-prep routes and other institutions are unchanged. No edit to `evaluator.ts`, `requirementTiles.ts` or any UI is needed.

Evidence: the walkthrough's `desktop-pr317-regression-mid-psychology-bgu-detail-textContent.txt` shows exactly620/680 beside the missing-subject request. Official-rule provenance is the existing [BGU main-campus conditions source](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=101&p_pat1=2&p_degree_level=1), captured in `2026-09-27-bgu-psychology-official.json` and re-read locally2026-10-28. This follow-up does not make a new live BGU request or claim a new calculator capture.

### UX-3 — fixed, one component expression only

The sole production component edit is the comparison wording in `TechnionMedicineComparison.tsx:8`. Exactly92 reads **“הסכם שלך 92, בסף הזימון המשוער (92)”**;92.1 remains above and91.9 below. The existing `>=` styling expression is untouched: equality remains green. The estimated invitation threshold itself and admission semantics are unchanged.

### UX-4 — static data fixed; historical DB heading stopped

Braude-generated programme titles, programme institution names, detail institution names and source titles now use the existing curated `INSTITUTION_BY_ID.braude.name`, **“המכללה האקדמית להנדסה אורט בראודה”**, instead of the shortened Monday display name. All IDs are retained. Current Braude static records are `braude_engineering` and `braude_prep`.

The official pages read above themselves use the shorter branding. This is the requested consistency change to MyWay's existing curated Ort name, not evidence of a new legal-name verification.

The QA heading `mon_12220708942_cs` is absent from the current static catalogue. Its saved DB-backed fixture, `src/lib/__fixtures__/braudeCsCatalogue.json`, retains `מדעי המחשב - המכללה האקדמית להנדסה בראודה`. No new static ID is created to impersonate that historical row. A reviewed canonical change must target **`programs.id=mon_12220708942_cs`**, setting `name` to **`מדעי המחשב - המכללה האקדמית להנדסה אורט בראודה`** and `institution_name` to the curated full name. The fixture also identifies legacy **`institutions.id=mon_12220708942`** with the shortened name; review its name for the same canonical correction while preserving the ID. Its existing Hebrew CS conditions must stay intact. This is a persisted-data limit, not a component-built title; the serializer locations above carry these values through. No component heading code or serializer was changed.

### Test-first record and validation

| Test                                                                                             | Observed failing-before output                                                                         |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `contains no English developer prose in any normalized public admission text`                    | `expected [ Array(162) ] to deeply equal []`; all diagnostic-bearing programme IDs listed above.       |
| `braude_engineering uses Hebrew requirements and keeps evidence internal`                        | Expected Hebrew `/[א-ת]/`; received the two English evaluator paragraphs.                              |
| `braude_prep uses Hebrew requirements and keeps evidence internal`                               | Same English-paragraph failure.                                                                        |
| `uses the canonical Ort Braude name in every static Braude programme title and institution name` | Expected no shortened names; received six fields across the two programme records without `אורט`.      |
| `psychology persona 98/600 requests subjects without presenting a computed score`                | `expected 620 to be undefined`; the needs-input assertion already passed.                              |
| `bgu_psychology persona 98/600 requests subjects without presenting a computed score`            | Same `expected 620 to be undefined`.                                                                   |
| `describes the medicine invitation boundary at 92`                                               | Could not find `הסכם שלך 92, בסף הזימון המשוער (92)`; rendered `מעל סף` with the existing green class. |

The92.1/91.9 boundary/color cases already passed unchanged code and are preservation checks, not invented red failures. Test-only setup errors were corrected before the authoritative red runs: unavailable `toHaveClass` matcher, accidentally expecting the historical DB-only CS ID in static data, and missing operational-freshness fixtures in the BGU evaluator test. Authoritative logs are local under `/tmp/myway-pr318-ux/`; the behavior messages above are the durable record. The nine added expanded test cases all pass.

Existing assertion updates, each carrying `// Approved test update, Jorje 2026-10-28`:

| File/assertion                                               | Before → after                                                                                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `CalculatorResults.test.tsx`, medicine92 table row           | `הסכם שלך 92, מעל סף הזימון המשוער (92)` → `הסכם שלך 92, בסף הזימון המשוער (92)`; green class and no-admission-verdict checks retained. |
| `StudyJourney.account.test.tsx`, medicine92 detail table row | Same wording change; all styling, contact/save and comparison-count checks retained.                                                    |
| Same file, medicine92 list-chip table row                    | Same wording change; `status-match`, green styling and comparison placement/count retained.                                             |

The full capability-matrix preservation test caught and prevented adding fallback text to an originally empty note list, which otherwise implied a manual gate. Its expected rows remain unchanged. Comparing before/after static data also confirms **403 unchanged IDs and byte-equal numeric/fact/path metadata**.

Final checks: `npx prettier --write` on every changed file; lint and typecheck passed. Required `env -u DATABASE_URL npm run guard:pre-pr`: **127 files / 3,137 tests passed**. Full `env -u DATABASE_URL npm test`: **291 files passed, 14 skipped; 4,695 tests passed, one expected failure, 101 skipped** (4,797 total). The three new regression files are added to the guard's existing targeted list. No assertion was skipped or loosened.

Local Chromium verification used this worktree's dev server on port3001 with `DATABASE_URL`/`OPS_DATABASE_URL` unset and explicit static mode. **Ten checks passed**: medicine at91.9/92/92.1 ×390px/1280px, plus each Braude page at both widths. They checked the correct comparison wording, unchanged green/gray classes, right alignment, canonical Braude headings, Hebrew fallback, absent developer prose and no horizontal overflow. The real local catalogue was read; the medicine evaluation response was mocked to isolate the granted boundary wording. All external requests and non-GET requests except the fulfilled evaluator mock were blocked. Results/screenshots are local under `/tmp/myway-pr318-ux/`; this is local regression evidence, not deployed/approval screenshots or production verification. The dev server was stopped afterward. No DB connection or write, production MyWay request, migration, workflow run, message/comment, merge or main push occurred. Jorje retains source/product approval and the stopped DB canonical-change work.

Files: `src/data/degrees/index.ts` (UX-1/UX-4); `src/server/admissions/proxyEvaluationGuard.ts` and `src/app/api/admissions/evaluate/uxFollowups.test.ts` (UX-2); the one granted component expression, two directly flipped component-test files and `src/lib/__tests__/TechnionMedicineComparison.test.tsx` (UX-3); `src/data/admissions/publicCatalogueCopy.test.ts`, the existing guard list and this verification document (shared). No source evidence, DB, route handler, workflow or unrelated component changed.

## Sekhem calculator (#320) Haifa/Technion gap

Investigation/capture date: **2026-10-28**. Branch inspected read-only via `git fetch origin codex/sekhem-calculator-page` and `git show`: **12fd33f272411ab6c13c47ca5f2cc9fa75136747**. This follow-up changes tests, evidence, the existing guard list and documentation only. No evaluator, adapter, formula, component, catalogue behaviour or DB row changes; no current MyWay/preview requests. [Structured results and HTTP receipts](evidence/2026-10-28-sekhem-gap.json) retain every tested pair and its exact blockers. [Scoped saved-catalogue projection](evidence/2026-10-28-sekhem-gap-catalogue.json) comes from the supplied `/workspace/pm-research/cov/programs.json`, with its SHA-256; it is an earlier audit snapshot, not a current preview catalogue.

### Exact #320 input and reproduction

Read `src/lib/sekhemCalculator.ts`, `src/components/sekhem/SekhemCalculator.tsx`, `RequiredAdmissionsInputs.tsx`, `HaifaQualificationFields.tsx`, `HaifaInformationSystemsTrackFields.tsx`, their supplied tests, and the server page's catalogue selection. `buildSekhemInput` builds a schema-v2 record with `complete:true` using `buildBagrutSubjectRecord`, then projects it with `admissionsExtraInputsFromAcademicScores`. The shared helper files are byte-identical on both branches. The HTTP payload is **`{ psychometric, extraInputs }`**, with no top-level `bagrut` and no Haifa average/history/qualification on first submit. Sections are included only when entered. All ordinary subject projections in the regression meet #320's integer/range filters; a JSON round trip removes undefined fields just like the request.

Full Jewish-sector persona: mathematics 5/90, English 5/85, physics 5/90, Hebrew expression 2/88, history 2/85, civics 2/88, literature 2/90, Bible 2/88; certificate `other`, complete, no separate Hebrew row. Raw weighted mean `(450+425+450+176+170+176+180+176)/25 = 88.12`; the existing generic helper rounds it to **88.1**. Psychometric **590**, quantitative **115**, verbal **110**, English **120**. This is a complete-certificate shape; **`complete:true` alone cannot supply subjects missing from the array**.

The tests sweep all listed academic pairs, including duplicate IDs: **static Technion 15 / Haifa 20**, saved audit **Technion 14 / Haifa 27**. These are evaluator pair counts, not #320's deduplicated offering counts; the preview's reported 10/18 inventory was not fetched or asserted. The snapshot includes Haifa OT and additional generic pairs absent from the static provider links. No pair is silently dropped to make the numeric probe pass.

### Technion — Hebrew fix confirmed; remaining exceptions explained

**The inspected #320 branch does not contain item 1.** Its adapter at `12fd33f` still requires every row in `TECHNION_SUBJECT_FIELDS`, including separate `hebrew`; the item-1 commit `19f4c7a` is not an ancestor. This directly explains the full Hebrew-expression certificate failing there. #318 already has the necessary adapter correction; integrating that existing fix into #320 is the required branch dependency, not a new input or formula change. No #320 branch was edited.

With this PR's existing item-1 adapter, all eight institution-specific routes (`technion_cs`, `technion_datascience`, `technion_ee`, `technion_me`, `technion_civil`, `technion_industrial`, `technion_biomedical`, `technion_medicine`) return **numeric mocked official score 84.4** with the exact #320 full-persona shape. POST includes `psychometry=590`, `yHabaa=2`, `habaa=88`, **`yHebrew=0`, `hebrew=`**. The generic mean is derived before the evaluator's ordinary average gate; no top-level bagrut is needed. Medicine retains score-only/unknown and no admission cutoff. **84.4 is a transport sentinel, not a live official result for this persona.**

Every saved-audit Technion pair except architecture also returns a numeric mocked score. Remaining static exceptions:

| Programme IDs          | Result/reason                                                                             | Action                                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `architecture`         | `needs_input`: `technion_architecture_bagrut_average`, `technion_architecture_exam_score` | Separate official form-73 formula includes the entrance-exam score; an ordinary certificate cannot supply it. #320 currently collects neither. No fabricated score or transcript-average substitution. |
| `technion_engineering` | `unsupported`                                                                             | Broad engineering placeholder, no single programme/formula. Not a missing-Hebrew problem.                                                                                                              |
| Generic `cs`           | `authority_unavailable`: static stored cutoff **92**, reviewed cutoff **91**              | `capabilityMatrix.ts:935–953` deliberately rejects the mismatch. Institution-specific route works. Adapter changes cannot repair catalogue inputs.                                                     |
| Generic `datascience`  | Same: static **90**, reviewed **91**                                                      | Same mismatch guard. #320's name-based deduplication does not necessarily collapse differently named data-science rows.                                                                                |
| Generic `medicine`     | Same: static **94**, reviewed **92**                                                      | The generic row is not the score-only institution-specific identity; preserve its existing guard.                                                                                                      |

The saved snapshot has compatible generic cutoffs, so those three failures are static-data-specific, not a new transcript error. Existing EE/ME winter handling already reconciles their historical static cutoffs. No further adapter change is justified or made.

**Fields for Oded:** ordinary routes need the actual seven compulsory rows (`english`, `literature`, `mathematics`, `bible`, `civics`, `hebrew_expression`, `history`) plus the entered electives; **no separate `hebrew` for this certificate**, no manual institutional composite, and no top-level average. #320's example button only supplies mathematics/English/physics/CS, so `bagrut_subject_record` remains correct for that incomplete array. Architecture separately needs `technionArchitectureBagrutAverage` and `technionArchitectureExamScore`; scores-mode does not block on the two confirmation booleans, and the formula-specific architecture average cannot currently be derived from this record. Broad placeholders and guarded cutoff mismatches require programme/catalogue resolution, not more student fields.

Sources reused, capture **2026-10-25**, validation checked **2026-10-28**: [Technion official calculator](https://admissions.technion.ac.il/sekem-calculator/), [form validation](https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/js/ckeck_errors.js?ver=2.0.8), [score submission](https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/technion-calculators-sum.php), [official admission table](https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/). Architecture formula/exam source captured **2026-09-27**: [official architecture requirements](https://admissions.technion.ac.il/architecture-info/), [verification note](2026-09-27-technion-architecture.md). No new Technion HTTP requests.

### Haifa — stopped: official mapping unavailable and evaluator average gate outside grant

**Official path exists in the client; not verified end to end.** The current [official Model.js](https://applicants.haifa.ac.il/enrollmentChances/app/component/enrollmentChancesApp/store/Model.js), fetched **2026-10-28**, has the same SHA-256 as the earlier capture, `6e335c266529c3e703f71bb083b2af476d602352a66598c52432a3e79ce3b798`. Its operations are `getCalcDiplomaType`, `getDiplomaCourses(diploma)`, and **`calculateBagrutAvg(diploma, data=JSON.stringify(rows))`**. Each row is `{subject: officialSubjectCode, units: string, grade: string}`; the controller reads the average from `data.avg`. These are official diploma/subject codes, not MyWay subject IDs. The separately read [controller](https://applicants.haifa.ac.il/enrollmentChances/app/component/enrollmentChancesApp/controller/enrollmentChancesMain.controller.js), captured **2026-10-28** earlier in this PR, serializes those rows. `calculateChances` itself consumes `bag_avg`, not the subject array.

Three minimal spaced read-only GETs this follow-up:

| URL                                                                                                                                    | UTC start → finish, 2026-10-28 | Result                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| [Calculator diploma-code dictionary](https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?operation=getCalcDiplomaType) | 20:41:13.434 → 20:41:15.079    | **HTTP 500**, SAP error HTML; no diploma-code dictionary |
| [Official model](https://applicants.haifa.ac.il/enrollmentChances/app/component/enrollmentChancesApp/store/Model.js)                   | 20:41:39.545 → 20:41:41.201    | HTTP 200, 16,055 bytes; operation confirmed              |
| [Official connection operation](https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?operation=checkConnection)         | 20:41:49.401 → 20:41:51.071    | **HTTP 500**, SAP error HTML                             |

No invented diploma code/subject mapping or speculative repeated average submissions. The earlier `getDiplomaCourses(diploma=001)` failure did not establish that `001` is a valid **average-calculator** certificate type; `bag_type=001` from the **chances** operation is not evidence of that equivalence. A valid type dictionary, its mandatory/optional subject dictionary and a successful subject-average replay are missing. These errors establish observed availability at capture time, not a claim that the service is permanently down.

The fallback local formula remains stopped for the reasons in item 4: [official score-calculation rules](https://admissions.haifa.ac.il/score-calculation/), read **2026-10-28**, mix a 2027 heading with older year sections and do not establish the complete current caps/clamps, rounding and certificate-specific subject/omission mapping. Published bonus amounts alone do not resolve those rules. No `calculateHaifaBagrutAverage` was invented.

**Exact evaluator fence:** `src/server/admissions/evaluator.ts:960–961` reads `extraInputs.haifaBagrutAverage` and returns `needs_input` before any official request. At **1009–1025**, the call to `runHaifaAdmissionsProof` passes the average/years/sections, but **no subject record**. Updating only the adapter cannot make a subject-only request reach it. The input normalizer is synchronous; adding network calls there would change its contract and every caller, rather than be a narrow integration.

**Minimal future evaluator change needed, NOT applied:** at line 961 permit the no-average branch only when a usable `requestedInput.extraInputs.bagrutSubjectRecord` is available, and add `bagrutSubjectRecord: requestedInput.extraInputs?.bagrutSubjectRecord` to the applicant at lines 1014–1025. The adapter would then need a verified official average operation, code dictionaries/mapping and failure handling before validating the resulting Haifa average and calling `calculateChances`. This is a proposal, not runnable code or authority to bypass validation. It is outside the current evaluator grant and remains stopped even if the service recovers.

### Exact Haifa fields for Oded and #320 continuation defect

The **first request** omits `haifaBagrutAverage`, `haifaBagrutYear`, `haifaPsychometricYear`, `haifaHebrewQualification`, and `haifaInformationSystemsTrack`. The subject record/sector does not establish exam years, school language or track. Section scores are optional on the page but all three are mandatory for Haifa's calculation.

| Scope                                                                                                             | Field(s) #320 must collect and retain/send                               | Why / current behaviour                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary verified Haifa score routes                                                                              | `haifaBagrutAverage` until a verified subject-average integration exists | No official average from subject rows today. Do not substitute the generic 88.1 or ask for a composite.                                                                                                                                                                                                                                                                                                                                             |
| All Haifa score routes                                                                                            | Actual `haifaBagrutYear`, actual `haifaPsychometricYear`                 | The [official-year replay note](2026-09-28-haifa-applicant-years.md), captured **2026-09-28**, shows year changes alter scores. Current `evaluationInputs.ts:50–58` defaults both to `HAIFA_ADMISSION_YEAR`; this is an existing assumption, **not a derivation or officially valid default**. #320's response-driven form will not learn that the actual years are missing while those defaults exist. No year-default behaviour was changed here. |
| All Haifa score routes                                                                                            | `psychometricMath`, `psychometricVerbal`, `psychometricEnglish`          | Send actual sections; never derive them from overall 590. #320 already projects them if entered.                                                                                                                                                                                                                                                                                                                                                    |
| All Haifa qualification gates                                                                                     | `haifaHebrewQualification`                                               | Jewish sector/Hebrew-expression subject does not prove Hebrew-school instruction or exam language. Only send `hebrew_school` after the student's actual qualification is known. If `exam`/`university_exam`, also `haifaHebrewScore`, `haifaHebrewExamDate`.                                                                                                                                                                                        |
| English classification                                                                                            | `haifaEnglishLevel` if an alternative recognized classification is used  | Entered `psychometricEnglish` already supplies the numeric language condition; no extra level is needed in this full persona.                                                                                                                                                                                                                                                                                                                       |
| Law, economics, biology, accounting, nursing, OT, physiotherapy when year reaches the published last-session year | `haifaPsychometricMonth`                                                 | Existing policy's deadline gate. Supplying a real earlier year avoids a fabricated current-year month request.                                                                                                                                                                                                                                                                                                                                      |
| `haifa_infosystems`                                                                                               | `haifaInformationSystemsTrack`                                           | Six verified identities: `dual_major`, `statistics`, `marine_sciences`, `neuroscience`, `computer_science`, `mathematics`. Ordinary `single_major` mapping remains unverified. Scores-mode does not require `haifaInformationSystemsPartnerRequirementsConfirmed`; partner conditions remain an explicit separate follow-up for dual tracks.                                                                                                        |
| Nursing                                                                                                           | `haifaScienceUnits`                                                      | Actual recognized science units; the full persona has physics 5, which does not establish the required 8. Completeness is not evidence of eight science units.                                                                                                                                                                                                                                                                                      |
| OT                                                                                                                | `haifaOtFailedSelectionAttempts`, `haifaOtUnjustifiedAbsence`            | Real selection history cannot be derived from grades.                                                                                                                                                                                                                                                                                                                                                                                               |
| `psychology` / `haifa_psychology`                                                                                 | No extra field unlocks it                                                | Verified mapping/replay remains withheld; preserve `authority_unavailable`.                                                                                                                                                                                                                                                                                                                                                                         |
| `haifa_engineering` static placeholder                                                                            | No extra field unlocks it                                                | Broad category is unsupported; select a specific programme.                                                                                                                                                                                                                                                                                                                                                                                         |

Sources for qualification/track gates are the programme URLs recorded in `haifaProgrammePolicies.json` (official Haifa pages captured **2026-09-28**) and [information-systems verification](2026-09-28-haifa-information-systems-tracks.md). The actual score-history input source is the [official calculator](https://applicants.haifa.ac.il/enrollmentChances/index.html) / [servlet](https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet), captured **2026-09-28**, with service availability rechecked above.

**#320 already has most conditional fields, but loses prior answers.** At `src/components/sekhem/SekhemCalculator.tsx:88–100`, it rebuilds the applicant and submits **only the current `requiredKeys`**. At **139–144**, it removes stored Haifa values whose keys are not in the latest response. The real-evaluator regression demonstrates:

1. Full record → `haifa_bagrut_average`.
2. Add Haifa average → `haifa_hebrew_qualification` (and programme-specific keys).
3. Submit only that new qualification → `haifa_bagrut_average` again.

**Oded's minimal form correction:** retain valid earlier Haifa answers and merge them with current answers on every subsequent submit for the same academic profile; clear them when their dependent profile changes. Collect actual years explicitly despite the backend defaults. This report does not edit #320's component. A single complete request with the fixture-only illustrative Haifa average **102**, actual Bagrut year **2020**, psychometric year **2025**, `hebrew_school` and all sections reaches the official mock for CS and returns its numeric score. That is transport/input evidence only, not a claim that 102 is this certificate's official average or that the mocked captured score belongs to this persona.

### Test evidence and verification

- **Requested blanket tests retained:** [numeric diagnostic probe](evidence/2026-10-28-sekhem-gap.probe.ts), run explicitly with `npx vitest run --config docs/admissions-verification/evidence/2026-10-28-sekhem-gap.probe.config.ts --reporter=verbose`. On unchanged current production code, **two failures**: `technion #320 full persona produces a numeric score for EVERY catalogue programme` → `expected [ …6 missing-score rows… ] to deeply equal []`; `haifa ... EVERY ...` → `expected [ …47 missing-score rows… ] to deeply equal []`. The six Technion failures are the five static exceptions above plus saved architecture. The JSON evidence lists every failing ID/catalogue and exact reason. These assertions remain unchanged and red; this is a separately invoked diagnostic of a blocked product contract, not skipped/expected-failure regression tests or a bypass of the existing guard.
- **Counterfactual item-1 proof:** each of the eight named `... returns the official transport score for the full #320 persona` cases fails with **`kind: needs_input` instead of `kind: exact`, score 84.4 absent** when replaying only the pre-item-1 adapter from `215548a`. The current adapter was restored byte-for-byte in a `finally` block; all eight then pass. This reconfirms an already-committed fix; it is not presented as a new chronological red-before-production-change cycle.
- **Current regression suite:** `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts`, **18 tests pass**: exact payload/rounding, eight numeric Technion routes and submitted form, missing sample subjects, architecture, complete static/saved Haifa blocker sweeps, the repeated-input dependency, successful explicit-year Haifa transport, deadline month, nursing units and OT history. Preservation tests already pass on current code; no production behaviour was changed. Initial test-design expectation 88.12 was corrected to the existing helper's one-decimal 88.1 before finalization; excluded from defect evidence.
- Added this regression file to the existing guard target list. **Existing assertion flips: none.** No existing tests weakened, no evaluator/component edits, no invented averages or verification unlocks. Simplification kept shared fixture construction and all proof assertions; review pipelines/subagents excluded by the brief.
- Initial required database-free guard: **3,155 tests / 128 files passed**. Typecheck separately caught two test-fixture typing issues (missing preserved snapshot profileScore and accessing the v1/v2 record union); corrected without changing production behaviour or any expected value. Final formatting/guard results are recorded below after execution. Jorje retains preview/source acceptance; no preview or production requests were made.

Final follow-up verification: **prettier passed; lint passed; typecheck passed; `env -u DATABASE_URL npm run guard:pre-pr` passed, 3,155 tests in 128 files**. The explicit unresolved-contract probe remains 2 failed / 1 passed, as documented, separate from the green preservation regressions. No guard/hook bypass; no new production-code changes or existing-assertion flips.

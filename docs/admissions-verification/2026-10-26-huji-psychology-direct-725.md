# HUJI psychology: direct psychometric route, תשפ״ז

Checked 2026-10-26, Asia/Jerusalem. Phase 1 prepares the policy and catalogue correction; the evaluator hook is pending PR #304. No production database query or write was performed.

## Official evidence

Captures live under `/workspace/pm-research/raw/official/huji/`. Only the following three official sources were used.

| Source | Capture time | Capture | SHA-256 |
| --- | --- | --- | --- |
| [Psychology programme](https://info.huji.ac.il/bachelor/Psychology) | 09:02 (09:02:17 +02:00) | `psych_chrome_20261026T090217+0200.html` | `ee19ad865370598dcbf35751e5559428a23026eb1d2c93e40a9866942e5c9414` |
| [HUJI feed](https://go.huji.ac.il/jjson/huji.json.gz) | 09:04 (filename 09:03:57 +02:00) | `huji_json_20261026T090357+0200.json.gz` | `c26832f77de0743c86c9936cb8536025e7e84d79d7efc9a962dbf52f29811a6b` |
| [Kidum channel](https://info.huji.ac.il/reception-channels/Kidum) | 09:03 (09:03:10 +02:00) | `kidum_chrome_20261026T090310+0200.html` | `2f3ca24af49859cea001999d1c4973ad577cd05d6d638b222451d3e8958b82ac` |

The decompressed feed `huji_json_20261026T090357+0200.json` has SHA-256 `dda7e236b59fec7d1646a6b07d91f9f1de7f93d64296e4666b58e4a0f631107a`. The programme text extract `psych_chrome_20261026T090217+0200.txt` has SHA-256 `ec2fab91b2f0558e16862fad15c80ba1124e476bafbd79c29c83e6b6af0a98a6`.

Programme-page quotes: “קבלה ישירה 725 ראויים לקידום 690” and “סף הקבלה לחוג 22.500”. The feed identifies the current year as תשפ״ז (2026–2027), with no next-year data. The page also says registration for תשפ״ז has closed and the programme is open for a waiting list; score acceptance does not establish registration availability.

The Kidum page states that applicants found ראויים לקידום need “30 נקודות ומעלה” under the programme's criteria. The rating comes from האגודה לקידום החינוך; an ordinary PET score in the 690–724 interval does not establish that status.

At 09:01, curl requests to both official hosts failed with `curl: (35) TLS connect error … unexpected eof`, recorded in the source packet as a TLS fingerprint block. Chrome succeeded. The page and Kidum hashes identify Chrome-rendered DOM captures, not raw HTTP response bytes. The feed hash identifies the downloaded compressed bytes.

## Thresholds and route behavior

The feed rows for tracks `300-7000` and `300-7009` agree:

| Field | Value | Use in this phase |
| --- | --- | --- |
| `direct_pet` | 725 | Pure policy: PET ≥725 yields direct accepted |
| `direct_pet_kidum` | 690 | Pure policy: PET 690–724 yields text-only manual gate about the Kidum rating |
| `direct_30` | 673 | Catalogue note only; no age-based automatic decision |
| `safAccept` | 22.5 | Ordinary sekem acceptance threshold, unchanged |
| `safReject` | 22.5 | Ordinary sekem rejection threshold, unchanged |
| `hog_years2degree` | 3 | Dedicated programme duration corrected to three years |

The policy uses validated feed thresholds. When a direct threshold is absent, its independent fallback is 725 or 690, supported by the programme capture above. The adapter returns undefined for missing, malformed, non-finite or out-of-range direct scores. The existing sekem parsing remains unchanged. PET below the Kidum threshold or missing PET leaves the normalized sekem result untouched. An already accepted sekem result stays accepted in the Kidum interval.

Per Jorje's ruling on 2026-10-26, the 22.5 threshold still drives the verdict but is no longer shown as a student-facing bullet on `huji_psychology` or the HUJI entry of `/programs/psychology`. The 725, 690 and 673 notes and the checked-date/source stamp remain unchanged. PET660/B90 remains exact/below against 22.5.

The full-bagrut rule assumes a full certificate when a student enters an average or grades; no confirmation field or gate is added. No institutional composite is requested. The conditional Kidum sekem value is outside this task and is not encoded in the repair notes or policy.

Both static psychology HUJI direct thresholds are corrected from 660 to 725. Persisted direct rows `huji_psychology:huji:huji:direct` and `psychology:huji:huji:direct` are masked at serialization. The dedicated programme receives corrected notes and provenance, and fact `huji_psychology:detail-0:legacy-fact-0` is filtered. Alternative-route notes are tested through the real legacy normalizer to ensure they do not create a required psychometric numeric gate.

## Formula confidence and uncertainty

The feed supplies formula type 2 for these tracks: `0.027468921 × PET + 0.145461915 × bagrutAverage − 11.50910537`. Coefficients and current cutoffs are official feed data, rather than an estimated formula. The test fixture is a minimal extract of the supplied capture. The formula's use of the student's ordinary entered average inherits the current evaluator's normalization; this task does not independently validate the institution's full bagrut averaging procedure.

The supplied live API probes at 09:07 in `/workspace/qa-evidence/huji-psych-725/eval_*.json` returned exact/below at threshold 22.5 for PET730/B80 (20.18), PET800/B70 (20.65), and PET660/B90 (19.71). These establish that the live exact path does not yet apply the direct route. The local fixture reproduces those formula scores, with PET660/B90 equal to 19.71195484.

Uncertainties retained:

- Chrome DOM hashes do not establish the original response-body bytes.
- Production database values and role grants were not queried; persisted 660 rows are represented by in-memory seed-shaped fixtures only.
- Whether the earlier W40 sekhem correction from 725 to 22.5 was published is unverified.
- The static `thresholds.huji` value 725 is a legacy sekhem-scale value. It remains unchanged by instruction; the exact feed path uses 22.5.
- `evaluator.ts` remains untouched while PR #304 is pending. This phase does not enable the policy in the product.
- No deployed or interactive browser verification was performed in this local-only phase. This is catalogue/policy work with no layout or field changes; visible Hebrew notes were checked in tests and read for natural wording, but desktop/mobile rendered copy still needs verification with the integration.

## Verification evidence

Test-first output: `/workspace/codex-tasks/huji-psychology-direct-725.testfirst.txt`. Production code was unchanged during both recorded runs. The final initial run recorded 13 failing tests, one missing-policy suite and 48 passing tests, exposing the missing route fields, missing repair, stale 660 claims and pending evaluator integration.

After implementation, the focused run recorded 68 passing tests and exactly three failures in `hujiPsychologyDirectRouteEvaluation.test.ts`: PET730/B80 and PET800/B70 expect direct accepted; PET700/B90 expects a text-only Kidum manual gate. These are normal, unskipped tests and are **expected to fail until hook**. The PET660/B90 fall-through test passes.

Final lint and typecheck passed with `DATABASE_URL` unset. The broader relevant run passed 709 tests and retained only the three expected hook failures (712 tests across 14 files). The unchanged pre-PR guard passed all 2,914 tests across its 119 selected files, local migration consistency, operational grant inspection, catalogue seed dry-run and committed admissions-evidence verification. Its fixed test-file list does not include the new pending-hook test file, so the guard passing does not establish that the new evaluator cases pass. No guard bypass, database write or publication workflow was used.

The inline simplification pass preserved the proof tests and made no further code changes. The direct-score parser stays separate from the existing sekem parser to preserve the latter's behavior; the source comment on fallback thresholds and the approval markers on the three modified existing test lines are retained as required by the task. No code-review or multi-agent review pipeline ran.

# Batch C: honest unsupported admissions — 2026-10-23

## Scope and method

Baseline: fetched `origin/main` at `605b0d3` (Batch B #251); branch `codex/batch-c-unsupported` started at the same SHA. Recomputed from `getStaticCataloguePrograms()`, `getStaticCatalogueInstitutions()` and `evaluateAdmissionsForProgram`, not the old coverage JSON. This is the current main code catalogue, not a production database snapshot.

Enumerated 406 programmes and 439 programme/institution pairs. Evaluated each pair with no scores, weak scores (bagrut 60 / psychometric 200), and maximum scores (120 / 800), supplying an empty freshness map, a fixed date and a fetcher that immediately rejects all network requests. No database or official website requests occurred. The scratch harness wrote each result’s kind, decision and explanation; the implemented registry tests retain the membership and behavior checks.

The strict all-three-profile gap contains 53 pairs. Extending it to pairs that request scores when empty but still return unknown/requirements-only or unsupported at both supplied profiles gives 112 candidates. Offline authority-unavailable/exact cases are not evidence of unsupported admission; supported estimates, open admission and numeric/manual score paths were excluded. A/B handlers were inspected and their focused regression tests remain mandatory.

Selected 83 IDs/pairs (one institution per ID), including **all 19 explicit `ariel_*` programmes**. Five generic Ariel pairs (`cs`, `ee`, `psychology`, `me`, `economics`) also receive the honest explanation, without changing any other institution’s result. The generated `ariel_engineering` was removed from Batch C membership: it is static-only, absent from `academicPrograms.ts` and not surfaced by the live/preview catalogue. The Ariel e2e targets are `ariel_cs` and `ariel_me`; no catalogue rows were added.

## Full Batch C registry

Reasons describe MyWay’s calculation coverage, not an assertion that institutions lack admission requirements. No thresholds or formulas are encoded in this batch; formula confidence is **not applicable**. Scores do not establish eligibility for these entries.

| Programme ID                       | Institution         | Reason                    |
| ---------------------------------- | ------------------- | ------------------------- |
| `cs`                               | `ariel`             | `institution_unsupported` |
| `ee`                               | `ariel`             | `institution_unsupported` |
| `psychology`                       | `ariel`             | `institution_unsupported` |
| `me`                               | `ariel`             | `institution_unsupported` |
| `economics`                        | `ariel`             | `institution_unsupported` |
| `sports_science`                   | `wingate`           | `unsupported`             |
| `ariel_cs`                         | `ariel`             | `institution_unsupported` |
| `ariel_ee`                         | `ariel`             | `institution_unsupported` |
| `ariel_civil_eng`                  | `ariel`             | `institution_unsupported` |
| `ariel_industrial_eng`             | `ariel`             | `institution_unsupported` |
| `ariel_me`                         | `ariel`             | `institution_unsupported` |
| `ariel_chemical_eng`               | `ariel`             | `institution_unsupported` |
| `ariel_economics`                  | `ariel`             | `institution_unsupported` |
| `ariel_socialwork`                 | `ariel`             | `institution_unsupported` |
| `ariel_psychology`                 | `ariel`             | `institution_unsupported` |
| `ariel_architecture`               | `ariel`             | `institution_unsupported` |
| `ariel_communication`              | `ariel`             | `institution_unsupported` |
| `ariel_criminology`                | `ariel`             | `institution_unsupported` |
| `ariel_molecular_bio`              | `ariel`             | `institution_unsupported` |
| `ariel_chemistry`                  | `ariel`             | `institution_unsupported` |
| `ariel_math`                       | `ariel`             | `institution_unsupported` |
| `ariel_physics`                    | `ariel`             | `institution_unsupported` |
| `ariel_health_systems`             | `ariel`             | `institution_unsupported` |
| `ariel_nutrition`                  | `ariel`             | `institution_unsupported` |
| `ariel_nursing`                    | `ariel`             | `institution_unsupported` |
| `kinneret_sound_eng`               | `kinneret`          | `vague_mapping`           |
| `elevation_cyber`                  | `elevation`         | `course_based`            |
| `elevation_fullstack`              | `elevation`         | `course_based`            |
| `itc_data_science`                 | `itc`               | `course_based`            |
| `huji_engineering`                 | `huji`              | `vague_mapping`           |
| `huji_prep`                        | `huji`              | `vague_mapping`           |
| `tau_engineering`                  | `tau`               | `vague_mapping`           |
| `technion_engineering`             | `technion`          | `vague_mapping`           |
| `bgu_engineering`                  | `bgu`               | `vague_mapping`           |
| `haifa_engineering`                | `haifa`             | `vague_mapping`           |
| `telhai_general_academic`          | `telhai`            | `vague_mapping`           |
| `rubin_graphic_design`             | `rubin`             | `vague_mapping`           |
| `wingate_general_academic`         | `wingate`           | `vague_mapping`           |
| `shenkar_engineering`              | `shenkar`           | `vague_mapping`           |
| `sce_general_academic`             | `sce`               | `vague_mapping`           |
| `azrieli_engineering`              | `azrieli`           | `vague_mapping`           |
| `braude_engineering`               | `braude`            | `vague_mapping`           |
| `braude_prep`                      | `braude`            | `vague_mapping`           |
| `ruppin_engineering`               | `ruppin`            | `vague_mapping`           |
| `ruppin_prep`                      | `ruppin`            | `vague_mapping`           |
| `bezalel_graphic_design`           | `bezalel`           | `vague_mapping`           |
| `hadassah_general_academic`        | `hadassah`          | `vague_mapping`           |
| `wizo_general_academic`            | `wizo`              | `vague_mapping`           |
| `jerusalem_academy_graphic_design` | `jerusalem_academy` | `vague_mapping`           |
| `beit_berl_graphic_design`         | `beit_berl`         | `vague_mapping`           |
| `ono_medicine`                     | `ono`               | `unsupported`             |
| `mon_12220685575_graphic_design`   | `mon_12220685575`   | `course_based`            |
| `mon_12220697934_certificate`      | `mon_12220697934`   | `course_based`            |
| `spieldocs_graphic_design`         | `spieldocs`         | `course_based`            |
| `minshar_graphic_design`           | `minshar`           | `course_based`            |
| `mon_12220697938_graphic_design`   | `mon_12220697938`   | `course_based`            |
| `nativ_graphic_design`             | `nativ`             | `course_based`            |
| `mon_12220697940_graphic_design`   | `mon_12220697940`   | `course_based`            |
| `mon_12220697942_certificate`      | `mon_12220697942`   | `course_based`            |
| `mon_12220696299_certificate`      | `mon_12220696299`   | `course_based`            |
| `mon_12220699120_graphic_design`   | `mon_12220699120`   | `course_based`            |
| `shaare_mishpat_law`               | `shaare_mishpat`    | `unsupported`             |
| `mon_12341063909_graphic_design`   | `mon_12341063909`   | `course_based`            |
| `schechter_certificate`            | `schechter`         | `course_based`            |
| `mon_12341126300_education`        | `mon_12341126300`   | `course_based`            |
| `tech_management_engineering`      | `tech_management`   | `vague_mapping`           |
| `telhai_prep`                      | `telhai`            | `vague_mapping`           |
| `mon_12341098184_prep`             | `mon_12341098184`   | `vague_mapping`           |
| `kinneret_engineering`             | `kinneret`          | `vague_mapping`           |
| `mon_12341114114_engineering`      | `mon_12341114114`   | `course_based`            |
| `israel_academic_general_academic` | `israel_academic`   | `vague_mapping`           |
| `mon_12341118768_general_academic` | `mon_12341118768`   | `vague_mapping`           |
| `mon_12341092879_graphic_design`   | `mon_12341092879`   | `course_based`            |
| `mon_12341113400_cs`               | `mon_12341113400`   | `course_based`            |
| `mon_12341143672_business`         | `mon_12341143672`   | `course_based`            |
| `mon_12341098628_business`         | `mon_12341098628`   | `course_based`            |
| `beit_berl_general_academic`       | `beit_berl`         | `vague_mapping`           |
| `mon_12341122522_certificate`      | `mon_12341122522`   | `course_based`            |
| `mon_12341134763_engineering`      | `mon_12341134763`   | `course_based`            |
| `mon_12341122982_graphic_design`   | `mon_12341122982`   | `course_based`            |
| `reidman_medicine`                 | `reidman`           | `course_based`            |
| `mon_12341203461_graphic_design`   | `mon_12341203461`   | `course_based`            |
| `mon_12341155561_business`         | `mon_12341155561`   | `course_based`            |

## Excluded gap candidates and follow-up encode candidates

| IDs / pairs                 | Disposition                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cs:biu`                    | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `ee:biu`                    | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `psychology:biu`            | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `medicine:tau`              | TAU medicine source packet `tau_med_doc.html` / `.txt` exists; follow-up source/route verification, no unsupported override.                                       |
| `medicine:biu`              | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `law:biu`                   | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `criminology:biu`           | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `tau_medicine:tau`          | TAU medicine source packet `tau_med_doc.html` / `.txt` exists; follow-up source/route verification, no unsupported override.                                       |
| `biu_cs:biu`                | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_psychology:biu`        | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_law:biu`               | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_ee:biu`                | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_medicine:biu`          | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_lifesciences:biu`      | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_biotech:biu`           | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_computational_bio:biu` | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_socialwork:biu`        | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_criminology:biu`       | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_optometry:biu`         | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `danon_chef:danon`          | Existing course-specific Danon registration UX; already honest and unchanged.                                                                                      |
| `danon_pastry:danon`        | Existing course-specific Danon registration UX; already honest and unchanged.                                                                                      |
| `danon_culinary_arts:danon` | Existing course-specific Danon registration UX; already honest and unchanged.                                                                                      |
| `colman_tourism:colman`     | Already unlisted with honest unavailable-programme copy; unchanged.                                                                                                |
| `biu_engineering:biu`       | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `biu_prep:biu`              | BIU composite/programme follow-up; intentionally unchanged.                                                                                                        |
| `colman_law:colman`         | Colman alias; official `colman_admission.html` / `colman_economy.txt` packet and Batch A canonical routes exist. Follow-up alias/encode reconciliation; unchanged. |
| `colman_business:colman`    | Colman alias; official `colman_admission.html` / `colman_economy.txt` packet and Batch A canonical routes exist. Follow-up alias/encode reconciliation; unchanged. |
| `danon_culinary:danon`      | Existing course-specific Danon registration UX; already honest and unchanged.                                                                                      |

`nutrition:huji` is an existing authority-backed path (offline authority unavailable), not a generic unsupported row. `criminology` currently links only to BIU and stays in its composite follow-up. `sports_science:wingate` is selected because it never compares scores and its full current route is not encoded. `ono_socialwork` and `tlvyaffo_socialwork` remain Batch B; no Batch B ID enters C. Existing manual/open routes outside the unknown gap are preserved.

## Evidence and official links

Membership is grounded in current main catalogue/evaluator behavior and existing `calculatorCoverage` exclusions, not new admissions research. Official destinations reuse the institution-owned website registry and catalogue programme URLs. No official destination is recorded for `itc_data_science` or `mon_12220696299_certificate` (Avni’s old URL is an aggregator), so those two ask students to contact the institution and expose no fabricated link. Known programme URLs are preferred; an institution homepage is an honest next action where no programme URL is recorded. Existing presentation referral handling supplies `utm_source=myway&utm_medium=referral`; no aggregator destination is introduced. Live official source reachability and Ariel numeric accuracy are not claimed.

The on-disk official packet was inspected for encodeable follow-ups. No fresh Ariel threshold/formula packet was available there. The existing Ariel economics/communication/criminology/health-management URLs are source candidates only; some encode a past year, so they are not used to infer current thresholds. This batch has no numeric thresholds table because it encodes no numbers.

## Student behavior and limitations

Ariel: MyWay cannot currently calculate a reliable admission threshold; check the programme’s requirements on Ariel’s site. Course-based entries: MyWay does not calculate admission from bagrut/psychometric here; select the course and check its requirements on the school’s site. Broad/ambiguous entries: requirements differ by programme; select the specific programme on the institution’s site. Other unencoded entries: no reliable calculation yet; verify requirements with the institution.

Do not delist ambiguous generated aliases in this PR. Jorje should assess whether broad placeholder rows should be retired or replaced by concrete programmes later. BIU and the identified encode candidates stay follow-ups; no numerical path is downgraded.

## Workflow and verification record

- `ce-plan`: durable plan in `docs/plans/2026-10-23-1947-feat-batch-c-unsupported-plan.md`; confidence check passed.
- `ce-doc-review mode:non-interactive`: completed inline under the operator prohibition on multi-agent review. Coherence/feasibility/scope checked; fixes applied 0, proposals 0, decisions 0, FYI 0. No subagent or code review ran.
- `ce-work`: implements the documented gap, pair-scoped registry and client explanation handling.
- Code review: skipped (ce-code-review unavailable)
- Reason: MyWay standing rules + this brief explicitly forbid ce-code-review; Jorje verifies admissions accuracy offline.

No production SQL/database access, migrations, seeds, freshness jobs, environment/secrets changes or external settings changes are part of this work. Local guard seed checks are dry-run only. No Batch A formulas/thresholds or Batch B registry behavior changed.

## Local verification results

- Full Vitest suite: **214 files passed, 11 skipped; 2,556 tests passed, 65 skipped**. Skips are the existing optional integration tests. The initial eight failures were obsolete result-kind/source-label expectations; updated expectations preserve unknown decisions, no scores and no inferred eligibility.
- Pre-PR guard: **88 files / 1,784 tests passed**; local migration consistency, operational grant inspection, catalogue seed dry-run and committed Monday evidence checks passed. No production connection or write was used.
- Focused evaluator/Batch C API tests: **354 passed** before final simplification; the final full suite and guard cover them again.
- Production Next.js build passed in explicit local static catalogue mode.
- Typecheck passed. ESLint passed with the existing unused `AdmissionsRequiredInput` warning in `bagrutPolicies.ts`; no new warnings.
- Repository source Prettier check passed. Changed docs, e2e and guard files were formatted separately.
- Prior Playwright run, explicit local static catalogue mode: **40 passed** across Batch A (20), Batch B (10) and Batch C (10), at 390px and 1440px. That run covered Ariel CS with missing/maximum scores, generated Ariel engineering, Wingate sports science and the management course `mon_12341143672_business`. Preview run `39991226711` then failed only on the two generated Ariel engineering cases because the live catalogue does not surface that programme. Those cases now target the explicit `ariel_me` programme; the prior local result does not verify this replacement.
- Browser assertions check unknown/unsupported, the exact evaluator explanation and action, Contact/Save, absence of composite or score-completion fields, official referral URL parameters, right/start text alignment and no horizontal overflow. Desktop Ariel and mobile management screenshots were opened and read as a student; no internal copy is visible. This uses automated Chromium; no separate interactive browser capability was available.
- Screenshots are Playwright artifacts under `test-results/batch-c-admissions-*`, including `ariel_cs-1440-filled.png` and `mon_12341143672_business-390-filled.png`. No screenshot upload or outreach was performed.
- `ce-simplify-code mode:pipeline` completed inline under the operator’s no-multi-agent-review constraint. Manual final diff scan found no scope or shipping blocker. Proof tests were preserved.

Preview and CI results are reported with the PR after publication. Local static verification does not claim database catalogue parity or live official calculator verification. Jorje’s admissions accuracy review remains outstanding.

## Preview failure correction

- Removed only the static-only `ariel_engineering` membership from both Batch C registries and changed its e2e target to `ariel_me`. The existing membership test now compares against the 19 explicit Ariel academic programmes.
- Typecheck passed; focused Batch C unit/API and evaluator tests: **352 passed**. Pre-PR guard: **88 files / 1,782 tests passed**, including local migration consistency, operational grant inspection, catalogue seed dry-run and committed Monday evidence checks.
- Chromium in explicit local static catalogue mode: **2 passed**, exercising `ariel_me` at 390px and 1440px. Both screenshots were inspected for Hebrew copy, alignment and layout. Preview verification must run against the updated PR head; these local results do not establish live catalogue parity.

# Haifa admission-score reverse-engineering — FINDINGS

Research only. Synthetic inputs only. Calculator calls were spaced ≥ 5.5 s apart. No repository changes were made: `/workspace/toar-wt-bugs-first` @ 7f6d5cf was read only.
Run date: 2026-10-29 (Israel time, UTC+2). Calculator year/semester: `year=2026&semester=001`, shown in the UI as `תשפ"ז 2026 סמסטר א` (the only open period; see `raw/ui-1*.json`).

## TL;DR
- **All 16 distinct Haifa score programmes on the site can be encoded** from the bagrut average, the psychometric total and the psychometric domain scores. Across 130 calculator observations (96 captured in this run, the rest from repo evidence captured 2026-09-28), the reconstruction differs from Haifa's calculator on **0 of 130**. The "16" counts sociology once (two calculator tracks) and communication once (two IDs). The site's `__haifa` and generic aliases map onto these programmes.
- **`haifa_engineering` cannot be encoded.** Haifa's calculator has no engineering hug: `getHugs` returns 53 hugs and none matches הנדס / טכנולוג. The repo already treats it as `vague_mapping` (see `src/server/admissions/batchCUnsupportedPathEvaluation.ts:81`).
- **General psychometric (PC):** Haifa's official rule is that PC is the NITE total the candidate receives ("הציון המועבר למועמד על ידי המרכז הארצי"). The site already collects that total, so no conversion is needed.
  - Haifa's own calculator, which has no total field, derives PC **server-side** from the domain scores as a **non-linear function of S = 2Q+2V+E only**.
  - Six different combinations with S = 675 all return 699.
  - At the ends: S = 250 → 218, while linear 1.125·S−61 gives 220.25; S = 750 → 800, while linear gives 782.75.
  - No table exists in the client JS. The endpoint returns only the resulting value. The 18 observed points are in `pc_observed.json`.
- **Maths psychometric (PM):** PM = 0.514554·(6Q+4V+E) − 65.3. This is the published formula, and **the calculator rounds it UP to an integer** (ceil), which matched 25 of 25 bagrut-ignored statistics runs (24 distinct Q/V/E combinations).

## 1. Formula (verified)

```
BT        = 10·avg − 330            # avg = Haifa optimal bagrut average incl. bonuses (0–~127 scale); NOT rounded (probe3: avg 100.05 → 543, not 544)
PM        = ceil(0.514554·(6Q + 4V + E) − 65.3)
PC        = NITE general score (what the student enters).  Calculator-only: f(2Q+2V+E), server table (see §3)
age       = 2026 − bag_year   (year of eligibility / last improvement)
  age ≤ 6        → full weight
  7 ≤ age ≤ 10   → bagrut weight halved: 1:3 → 1:7, 3:7 → 3:17
  age > 10       → psychometric only
score     = round_half_up( (wb·BT + wp·P) / (wb + wp) )
```

Programme groups:

| Group | P | Ratio, full / half | Programmes |
|---|---|---|---|
| Maths 1:3 | PM | 1:3 / 1:7 | accounting, biology, cs, economics, infosystems, math, statistics |
| General 1:3 | PC | 1:3 / 1:7 | communication, nursing, occupational_therapy, physiotherapy, political_science, psychology, social_work, sociology |
| Law | PC | 3:7 / 3:17 | law |

**Sources**
- [score-calculation](https://admissions.haifa.ac.il/score-calculation/) (quotes in `raw/official/score-calculation-quotes.md`): ratio per faculty; the published PM formula and its list of maths programmes (maths, economics, statistics, CS, IS, medical sciences, biology); the BT formula; the 7th-year halving; >10 years ignored.
  - That list does not name **accounting**, but accounting is an economics track, and the calculator applies PM to it (V1 704 = maths group).
- The calculator observations in `test_vectors.json`.

**Rounding evidence**
- The composite is rounded half up, not ceiled: general V1 701.25 → 701; maths 805.5 → 806 (repo "high" vector).
- PM uses ceil, from bagrut-ignored statistics runs where the score equals PM:
  - 714.25 → 715
  - 444.11 → 445
  - 274.31 → 275
  - 569.15 → 570
  - 25 runs over 24 distinct combinations (117/109/95 was sent twice, in chances1 and probe2); every run is in `test_vectors.json`.
- Haifa's own published example prints PM = 569, i.e. rounded, not ceiled. The calculator gives 570. **We follow the calculator**, and this is flagged as an uncertainty.

**Age bands, as observed**
- psychology V1:
  - bag_year 2021 or 2020 → 701 (full);
  - 2019, 2017 or 2016 → 700 (half);
  - 2015 → 699 (= PC).
- law: 2019 → 700 (half, 3:17); 2015 → 699.
- cs: 2019 → 704 (half).
- statistics V2: 2018 → 556 (half); 2014 → 570 (= PM).

**Psychometric age**
- psy_year 2019 and 2018 have no effect.
- psy_year 2012 returns error 242: "לא ניתן לחשב סיכויי קבלה , ותק פסיכומטרי גדול מ- 10 שנים".

**Bagrut average:** Haifa's bonus and optimal-subset algorithm (`model/haifa_model.py`) reproduces `calculateBagrutAvg` on 8 of 8 vectors (`bagrut_vectors_check.json`).
- Bonus rules:
  - maths: 4 units +20, 5 units +35;
  - English, physics, chemistry, biology, Bible, history, literature, Arabic, and Hebrew for Arabic speakers: 4 units +20, 5 units +25;
  - other listed subjects: +10 / +20;
  - the grade must be at least 60.

**Humanities 600+ rule:** dropping the bagrut applies only to the humanities faculty. None of the in-scope programmes is in that faculty.

## 2. Matched vectors against Haifa's calculator (side by side)

All values below were observed in this run. Full requests and responses are in `raw/chances1-1793258405009.{har,json}`, `raw/probe2-1793258987745.{har,json}`, `raw/probe3-*.{har,json}` and `raw/ui-1793259566427.{har,json}`. Machine-readable versions are in `test_vectors.json`, which also holds the repo's 2026-09-28 high/low vectors: 32 more, all matching.

**Input vectors**
- **V1:** avg 103.5, bag_year 2025, psy_year 2026, Q140/V130/E135. PC shown 699; PM 703.96 → 704; BT 705.
- **V2:** avg 78.52, bag_year 2024, psy_year 2026, Q117/V109/E95. PC 554; PM 569.15 → 570; BT 455.2.
- **V3:** avg 117, bag_year 2023, psy_year 2025, Q125/V140/E120. PC 671; PM 670.51 → 671; BT 840.

| Programme (site id) | Calculator hug/program | V1 Haifa / ours | V2 Haifa / ours | V3 Haifa / ours | Calc accept / reject |
|---|---|---|---|---|---|
| haifa_accounting | SC0017 / 52261493 | 704 / 704 | 541 / 541 | 713 / 713 | 680 / 659 |
| haifa_biology | SC0006 / 52255174 | 704 / 704 | 541 / 541 | 713 / 713 | 640 / 619 |
| haifa_cs | SC0021 / 52256544 | 704 / 704 | 541 / 541 (also via UI) | 713 / 713 | 700 / 679 |
| haifa_economics | SC0017 / 52261490 | 704 / 704 | 541 / 541 | 713 / 713 | 660 / 639 |
| haifa_infosystems | SC0026 / 52256686 | 704 / 704 | 541 / 541 | 713 / 713 | 680 / 649 |
| haifa_math | SC0030 / 52257936 | 704 / 704 | 541 / 541 | 713 / 713 | 610 / 579 |
| haifa_statistics | SC0033 / 52253965 | 704 / 704 | 541 / 541 | 713 / 713 | 630 / 599 |
| haifa_communication | SC0052 / 52253864 (and 52253862) | 701 / 701 | 529 / 529 | 713 / 713 | 550 / 499 |
| haifa_nursing | SC0034 / 52257430 | 701 / 701 | 529 / 529 | 713 / 713 | 580 / 569 |
| occupational_therapy | SC0046 / 52255365 | 701 / 701 | 529 / 529 | 713 / 713 | 610 / 594 |
| haifa_physiotherapy | SC0040 / 52256372 | 701 / 701 | 529 / 529 | 713 / 713 | 680 / 639 |
| haifa_politicalscience | SC0020 / 52254686 | 701 / 701 | 529 / 529 | 713 / 713 | 580 / 519 |
| haifa_psychology | SC0042 / 52252391 | 701 / 701 (also via UI) | 529 / 529 | 713 / 713 | 650 / 629 |
| haifa_socialwork | SC0037 / 52253943 | 701 / 701 | 529 / 529 | 713 / 713 | 615 / 579 |
| haifa_sociology (repo id) | SC0032 / 52252907 (single-major, two-year) | 701 / 701 | 529 / 529 | 713 / 713 | 540 / **539** |
| sociology, day track | SC0032 / 52252912 (single-major, day) | 701 / 701 | 529 / 529 | 713 / 713 | 540 / **519** |
| haifa_law | SC0029 / 52255476 | 701 / 701 | 524 / 524 | 722 / 722 (also via UI) | 680 / 629 |

**More discriminating vectors, all matched**
- **Age bands:** 6 psychology bag_year variants, law 2019 and 2015, cs 2019, and statistics 2018 and 2014.
- **Bagrut ignored (bag_year 2014):** 25 statistics runs over 24 domain combinations, where the score equals ceil(PM). They show that PM depends on Q, V and E separately: 150/120/135 → 715, while 120/150/135 → 684, with the same S. 2 ignored-bagrut psychology runs where the score equals PC (117/109/95 → 554; 144/118/131 → 676).
- **Unrounded BT:** avg 100.05 with domain scores of 100 in psychology and in statistics → 543 for both (rounded BT would give 544).
- Every vector is listed in `test_vectors.json`, which records whether each one matched.

**Caveat:** within one group, V1–V3 give the same score in every programme, because the formula really is group-wide. The differences between programmes are their group and their cutoffs.

**UI-driven confirmation:** the form was filled through the UI5 controls and the button was clicked, for psychology V1, cs V2 and law V3. Screenshots:
- `screens/ui-psychology_V1-1793259566427.png`
- `screens/ui-cs_V2-1793259566427.png`
- `screens/ui-law_V3-1793259566427.png`

The result tab shows the programme name, weighted score, both cutoffs and the PC. The inputs themselves are in the captured request URL (`raw/ui-1793259566427.json`).

## 3. How the calculator derives PC from the domain scores

- **Client side:** there is no formula and no table.
  - Checked: `js/Component-preload.js`, every module in `js/modules/*.pretty.js` and `localService/mockserver.js`.
  - The request builder (`excerpts/Model-calculateChances.txt`, Model.js lines 330–366) sends only `psy_math`, `psy_verbal` and `psy_english`.
  - The validator (`excerpts/PsychometricScore-validator.txt`) only bounds each domain score at 150 or below.
- **Endpoint:** `calculateChances` returns the PC as "ציון הפסיכומטרי שלך". No operation exposes a table: the operations seen are checkConnection, getOpenRegAcademicYears, getHugs, getProgramForHug, getDiplomaCourses, calculateBagrutAvg, calculateChances, print and sendToMail.
- **Observed behaviour:** PC = f(S), where S = 2Q+2V+E. It is monotonic, close to 1.125·S − 61 in the middle (±1) and diverges at the ends. All 18 observed points are in `pc_observed.json`. This sampling cannot recover the full table; that would need about 500 probes, one per value of S. **I have not invented it.**
- **Recommendation:** use the student's NITE total as PC, per Haifa's published rule. Note that a student's real NITE total can differ by about ±1 from what Haifa's calculator shows for the same domain scores. Haifa states that the university's own weighting is binding ("השקלול הקובע ... הוא זה שישוקלל על־ידי האוניברסיטה").

## 4. Official cutoffs (2026-27 / תשפ"ז cycle)

Sources:
- **Programme pages,** fetched with WebFetch on 2026-10-29. curl and headless Chromium get a WAF "Request Rejected" page from admissions.haifa.ac.il.
- **Calculator,** year=2026 / תשפ"ז, same day.

The pages carry the 2026 cycle. Only some state the year inline:
- CS: "705 (תשפ"ו) 700 (תשפ"ז)";
- OT: a deadline "לשנה"ל תשפ"ז — 14.06.2026";
- accounting: an exam "לקראת שנה"ל תשפ"ז".

The rest show no year. Treat them as the current page for the תשפ"ז cycle, which the repo's policy file also records as `admissionCycle: 2026-2027`.

| Programme | Official page | Page: acceptance (waiting range) | Calculator 2026: accept / reject | Agree? |
|---|---|---|---|---|
| accounting | https://admissions.haifa.ac.il/social-sciences/program/2484 | 680 (660–679) | 680 / 659 | yes |
| biology | https://admissions.haifa.ac.il/natural-sciences/program/3036 | 640 (620–639) | 640 / 619 | yes |
| communication | https://admissions.haifa.ac.il/social-sciences/program/3229 | 550 (500–549) | 550 / 499 | yes |
| cs | https://admissions.haifa.ac.il/computer-information-science/program/3210 | "705 (תשפ"ו) 700 (תשפ"ז)" (680–699) | 700 / 679 | yes (תשפ"ז) |
| economics | https://admissions.haifa.ac.il/social-sciences/program/2482 | 660 (640–659) | 660 / 639 | yes |
| infosystems | https://admissions.haifa.ac.il/computer-information-science/program/3218 | 680 (650–679) | 680 / 649 | yes |
| law | https://admissions.haifa.ac.il/law/program/3000 | 680 (630‑679) | 680 / 629 | yes |
| math | https://admissions.haifa.ac.il/natural-sciences/program/3161 | 610 (580–609) | 610 / 579 | yes |
| nursing | https://admissions.haifa.ac.il/social-welfare-health-sciences/program/2973 | 580 (570–579) | 580 / 569 | yes |
| occupational therapy | https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3088 | 610 (595–609) | 610 / 594 | yes |
| physiotherapy | https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3181 | 680 (630–679) | 680 / **639** | **no**: the waiting minimum differs (630 vs 640) |
| political science | https://admissions.haifa.ac.il/social-sciences/program/3054 | 580 (520–579) | 580 / 519 | yes |
| psychology | https://admissions.haifa.ac.il/social-sciences/program/3268 | 650 (630–649) | 650 / 629 | yes |
| social work | https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3082 | 615 (580–614) | 615 / 579 | yes |
| sociology | https://admissions.haifa.ac.il/social-sciences/program/2968 | 540 (520–539) | 52252912 day: 540 / 519; 52252907 two-year: 540 / **539** | yes for the day track, no for the two-year track |
| statistics | https://admissions.haifa.ac.il/natural-sciences/program/3167 | 630 (600–629) | 630 / 599 | yes |

All 16 programmes agree with `src/data/admissions/haifaProgrammePolicies.json` (acceptance / publishedWaitingMinimum).

**Non-score gates.** These appear on the pages and none of them is part of the composite. They must stay separate checks:
- maths bagrut minimums (maths-group programmes and others; per page);
- English and Hebrew level requirements (per page);
- interviews or screening:
  - interviews / screening stages are listed for social work, statistics, OT and physiotherapy;
  - nursing: emotional-intelligence test;
  - psychology: separate פסיפס route (680);
  - exact wording per programme is on its page and in `haifaProgrammePolicies.json`;
- nursing additionally needs "ציון פסיכומטרי גולמי 550" and "8 יחידות מדעיות";
- law has an alternate route, "679-600 או פסיכומטרי גולמי בציון 660 ומעלה", plus a suitability exam;
- accounting: "מעבר קורס רישום מידע חשבונאי ... 60".

## 5. Per-programme detail

All programmes use the formula in §1. In this section:
- **"Encodeable"** means encodeable with the site's inputs: the bagrut average from subjects and grades (`calculateBagrutAvg` algorithm), the NITE total (PC), the domain scores (PM) and the bagrut year.
- **"Matched"** lists the observed vectors.

- **haifa_psychology** (SC0042/52252391): general 1:3 with PC.
  - Matched: V1, V2, V3, 6 bag_year variants, 2 psy_year variants, 2 ignored-bagrut runs and one UI run.
  - Cutoff 650, reject at 629.
  - Encodeable. Also see the saved-input gap in §7.
- **haifa_cs** (SC0021/52256544, single-major B.Sc.): maths 1:3 with PM.
  - Matched: V1–V3, the 2019 half-weight run and one UI run.
  - Cutoff 700 (תשפ"ז); the page's waiting range is 680–699.
  - Encodeable.
- **haifa_infosystems** (SC0026/52256686): maths 1:3.
  - Matched: V1–V3.
  - Encodeable.
  - Mapping ambiguity: 52256686 is **not** in `getProgramForHug(SC0026)`, which lists only dual-major and specialisation tracks, yet `calculateChances` accepts it (680/649).
  - Repo context: `docs/admissions-verification/2026-09-28-haifa-information-systems-tracks.md`.
- **haifa_engineering**: **not encodeable**. Haifa's calculator has no matching hug (`getHugs` returns 53 hugs, none matching; see `raw/explore1-xhr-1793258081154.json` and `raw/getHugs-names.txt`). There is no Haifa engineering programme ID to map to. It remains a vague-mapping placeholder.
- **haifa_communication** (SC0052/52253864): general 1:3.
  - 52253864 is the repo's policy ID. It is absent from `getProgramForHug(SC0052)`, which lists 52253862 (dual) and 52253866 (with law), but it works. 52253862 gives identical results.
  - Encodeable.
  - The Ofek 500–549 route is a separate track, not a composite.
- **haifa_biology** (SC0006/52255174): maths 1:3; matched V1–V3; encodeable.
- **haifa_accounting** (52261493): maths 1:3. Not named in the page's PM list, but the calculator applies PM. Matched V1–V3; encodeable.
- **haifa_economics** (52261490): maths 1:3; matched V1–V3; encodeable.
- **haifa_math** (52257936): maths 1:3; matched V1–V3; encodeable.
- **haifa_statistics** (52253965): maths 1:3; matched V1–V3, plus 27 more (25 with the bagrut ignored, the 2018 half-weight run and the BT-rounding probe); encodeable.
- **haifa_law** (52255476): 3:7 with PC, 3:17 at half weight. Matched V1–V3, 2019 (700), 2015 (699) and one UI run. Encodeable.
- **haifa_nursing** (52257430): general 1:3; matched V1–V3. Encodeable, plus a separate raw-psychometric gate of 550.
- **occupational_therapy** (52255365): general 1:3; matched V1–V3; encodeable.
- **haifa_physiotherapy** (52256372): general 1:3; matched V1–V3; encodeable. **The reject cutoff is unresolved:** the page gives a waiting minimum of 630, the calculator 640.
- **haifa_politicalscience** (52254686): general 1:3; matched V1–V3; encodeable.
- **haifa_socialwork** (52253943): general 1:3; matched V1–V3; encodeable.
- **haifa_sociology**: general 1:3; matched V1–V3 on both tracks. Encodeable.
  - **Track ambiguity:** the repo maps it to 52252907 ("סוציולוגיה-תואר ראשון חד-חוגי דו שנתי", reject 539).
  - The published waiting range 520–539 matches **52252912** ("חד-חוגי לימודי יום", reject 519).
  - The policy file records this difference as a "reconciliation". The likely explanation is a wrong track ID, but it is unconfirmed.
- **Aliases:** `haifa_*__haifa` and the generic IDs (psychology, cs, law and so on) map to the same records, per the `aliases` field in haifaProgrammePolicies.json. No separate Haifa formula exists for them. `haifa_information_systems_track` refers to the IS track question above.
- `haifa_new_program` appears only as a fixture in `src/data/admissions/formulaBackedPairInventory.test.ts:115`; it is not a real programme, so there is nothing to encode.

## 6. Non-encodeable: what was checked

Applies to `haifa_engineering`; everything else can be encoded.

**Calculator:** `https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?operation=getHugs` returned 53 hugs, none for engineering.

**Programme pages:** no Haifa engineering programme was found. I did not search the whole admissions site for engineering, so this is not proof that none exists. The site's placeholder doesn't name a specific programme.

**URLs and endpoints checked overall:**
- `https://applicants.haifa.ac.il/enrollmentChances/index.html` → 200, UI5 app.
- `CandChancesServlet` operations: checkConnection, getOpenRegAcademicYears (returns only `2026|001`), getHugs, getProgramForHug (16 hugs captured), getDiplomaCourses(001), calculateBagrutAvg and calculateChances → all 200 JSON. `print` and `sendToMail` were not called because they generate output or send mail.
- JS: `Component-preload.js` and every module under `js/modules/`, plus `manifest.json` and `i18n.properties`. They contain no formula or table.
- `https://admissions.haifa.ac.il/score-calculation/` and the 16 programme pages:
  - curl and headless Chromium get a WAF "Request Rejected" page (`raw/score-calculation.txt`);
  - WebFetch returns 200 with content.

## 7. Saved-input gap

Full trace: **[SAVED-INPUT-GAP.md](SAVED-INPUT-GAP.md)** (static, read-only, worktree 7f6d5cf).
- **Symptom:** with a saved `haifaBagrutAverage` (104) and `haifaHebrewQualification`, prod `haifa_psychology` (and the `psychology` alias) still returns the "650 לפחות" text instead of the Haifa note. Evidence is in `qa-evidence/pr318-prod/api-evaluate.json`, not `api-haifa-variants.json` (whose three variants carry no saved average and already return the note).
- **Cause:** the Haifa guard at `evaluator.ts` 352–355 only fires when the average is missing or a proxy (`evaluationInputs.ts` 37 skips setting the proxy flag when the average is saved). The request falls through to `evaluateNonExactResult` (`evaluator.ts` 503 → 2153–2175), which returns the withheld-pair reason from `formulaBackedVerificationLedger.ts` 265–269.
- **Fix options (not applied):** A, narrow (psychology IDs in the guard); B, every Haifa programme (side effects: communication's live 702/550 path and biology's month prompt become the note; IS mapping result needs moving). A reproducing test is drafted there, plus the change to the existing `toContain('650')` assertion at `rulingsHaifaTau.test.ts:74`.
- **Link to this report:** once a Haifa programme is moved to exact calculation, §1 gives its score from the same saved inputs, e.g. psychology with avg 104 (BT 710), bagrut 2025 and NITE 700 → (710 + 3·700)/4 = 702.5 → **703** (`model/haifa_model.py`). That would be a product decision, not part of the A/B fix.

## 8. Remaining uncertainty

1. **PM rounding.** The calculator ceils PM (25/25 runs). The published example rounds (569 where the calculator gives 570). Which one admissions actually use is unconfirmed; the calculator is Haifa's own tool.
2. **PC from domain scores.** It is a server-side non-linear function of S, and only 18 points were sampled. That doesn't matter if we use the NITE total, but a student's NITE total may differ by about ±1 from what Haifa's calculator shows.
3. **BT formula.** The page says it is "הנוסחה המקובלת לשנת הלימודים תשפ"ג" and that it changes slightly each year. The 2026 calculator still fits 10·avg − 330 exactly on every vector, including avg 100.05. Its label is also printed inverted ("B=BT*10-330").
4. **Inconsistent examples on the page.** 1:7 is printed as 570 but works out to 569.4 → 569; "2011-2014" is a stale label for the 7–10-year band.
5. **Physiotherapy** waiting minimum: 630 on the page, 640 in the calculator. **Sociology** track ID: two-year vs day.
6. **Age band at exactly 10 years** (bag_year 2016): observed as half weight, consistent with ">10 ignored". "Year of eligibility" means the year of the last improvement when two or more subjects were improved; that comes from the page and was not tested.
7. **Rounding of the bagrut average** before computing BT: not tested beyond 2 decimals. The calculator's `calculateBagrutAvg` returns 2 decimals.

## 9. Files
- `FINDINGS.md` (this file); `SAVED-INPUT-GAP.md`; `CALCULATOR-PROGRESS.md`
- `model/haifa_model.py`: bagrut average, PM / ceil, BT, ratios, age band and `haifa_score()`
- `build_vectors.py` → `test_vectors.json`: 131 composite vectors (130 matched, 1 error-242 case) and 8 bagrut vectors
- `bagrut_vectors_check.json`; `pc_observed.json`
- `raw/`:
  - HAR/JSON for pages, explore1, dict, bagrut, chances1, probe2, probe3 and ui;
  - `getDiplomaCourses-001.json`, `getHugs-names.txt`;
  - `official/score-calculation-quotes.md`;
  - the WAF-blocked captures
- `js/`: Component-preload.js, manifest, i18n and modules/*.pretty.js
- `excerpts/`: `Model-calculateChances.txt`, `PsychometricScore-validator.txt`
- `screens/`: start, after-continue and UI result screenshots
- Runners: `runner.mjs`, `ui.mjs`, `ops-*.json`, `ui-cases.json`

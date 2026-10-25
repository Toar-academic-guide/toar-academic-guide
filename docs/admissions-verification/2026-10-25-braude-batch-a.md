# Braude Batch A phase 1 — published floors and institution identities

Date: 2026-10-25. Status: locally encoded and tested; **dispatcher intentionally unwired**. Jorje must verify source/product behavior before declaring the work ready. No SQL, production writes, publication, freshness runs or deployments were performed.

## Sources and confidence

The task's Braude research section is the input contract: `batch-a-engineering-2026-10-25.md`, section 2 (external PM research). Both official pages were fetched read-only with HTTP GET on 2026-10-25:

- [Braude registration requirements, תשפ"ז](https://w3.braude.ac.il/intrested/), sections “תנאי סף להגשת מועמדות לשנת הלימודים תשפ"ז” and “אפיק הרשמה ללא פסיכומטרי”. Captured HTML SHA-256: `2a8794220f50d84b782f9c1b18541861071adca77d62f5dcf9d10fea4768844c`.
- [Official bagrut calculator](https://info.braude.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1). Captured HTML SHA-256: `fd3a7c58325dfcd41b50e0b51f96ecd10c1c5a949468f7eb9582404c39a97521`. Its server POST was not executed. The dead `CalcMTA` function is ignored.

Key official wording:

> ממוצע משוקלל, ללא בונוסים

> המכללה שומרת לעצמה את הזכות לקבל את המועמדים/ות עם הנתונים הגבוהים ביותר

> 550 בציון רב תחומי ו-550 בדגש כמותי

The bonus paragraph specifies 12.5 extra points for a four-unit science and 25 for a five-unit science; both figures are also in the supplied research. The calculator says its calculation is an aid and that the registration centre determines the binding average. These sources establish floors, **not a published combined bagrut/psychometric formula**. No composite is calculated or estimated. Confidence in the encoded numerical floors is high; route completeness limitations are explicit below.

## Follow-up 4: verbatim regular-track English floors

Approved source: `/workspace/pm-research/raw/official/braude/VERBATIM-english-floors.md`, [official registration page](https://w3.braude.ac.il/intrested/), fetched **2026-10-25 08:59:51 (Asia/Jerusalem, UTC+2)**, HTTP 200. The quotes below are verbatim from the saved `intrested.txt`; these regular-track values supersede the earlier research omissions.

Electrical:

> אנגלית –  ציון 70 ברמה של 4 יחידות לימוד או 60 ברמה של 5 יחידות לימוד

`intrested.txt:349`.

> 90 במרכיב אנגלית בפסיכומטרי/אמירנט

`intrested.txt:340`.

Mechanical:

> אנגלית – ציון 70 ברמה של 4 יחידות לימוד או ציון 60 ברמה של  5 יחידות לימוד

`intrested.txt:363`.

> 85 במרכיב אנגלית בפסיכומטרי/אמירנט

`intrested.txt:355`.

Electrical–mechanical double major:

> אנגלית –  ציון 70 ברמה של 4 יחידות לימוד או 60 ברמה של 5 יחידות לימוד

`intrested.txt:439`.

> 100 במרכיב אנגלית בפסיכומטרי/אמירנט

`intrested.txt:430`.

Industrial and management:

> אנגלית – ציון 70 ברמה של 4 יחידות לימוד או 60 ברמה של 5 יחידות לימוד

`intrested.txt:407`.

> 85 במרכיב אנגלית בפסיכומטרי/אמירנט

`intrested.txt:399`.

All floors use `>=`. English bagrut is exactly `(units = 4 AND grade >= 70) OR (units = 5 AND grade >= 60)`, so 5u65 passes, 5u59 fails, and 4u65 fails. Existing English section floors 90 / 85 / 100 are confirmed; industrial adds 85 (84 fails). Missing sections emit exactly `requiredInputs: ['psychometric_english']`, with no green verdict. No values from the other tracks in the capture are newly encoded. EE + Applied Mathematics has no published threshold block and remains unsupported; EE–mechanical values are never borrowed for it.

## Encoded thresholds

All thresholds are inclusive (`>=`). “4u/5u” means alternative unit counts with the corresponding grade; five units do not use the four-unit grade. Blank means **not encoded**, not “no requirement”. Every numeric value below appears in the supplied department research or the approved verbatim English-floor capture and was confirmed on the official page.

| Department / local rule id | General psychometric | Quant section | English section | Bagrut without bonuses | Math 4u / 5u | English bagrut 4u / 5u | Physics 5u | Bonus-average route |
| --- | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: |
| Civil / `braude_civil_eng` | 580, composite unchecked | — | 85 | 70 | 85 / 75 | 70 / 60 | 80 | unavailable |
| Biotechnology / `braude_biotech` | 550 | — | 85 | 70 | 80 / 70 | 70 / 60 | — | 90 |
| Electrical / `braude_ee` | 550 | 110 | 90 | 70 | 80 / 70 | 70 / 60 | 60 | 95 |
| Mechanical / `braude_me` | 550 | — | 85 | 70 | 75 / 65 | 70 / 60 | — | 95 |
| Information systems / `braude_infosystems` | 550 + unchecked quantitative composite | 110 | 85 | 70 | 80 / 70 | 70 / 60 | — | 101 |
| Software / `braude_softwareeng` | 550 + unchecked quantitative composite | 110 | 85 | 70 | 80 / 70 | 70 / 60 | — | 101 |
| Industrial / `braude_industrial_eng` | 550 | — | 85 | 70 | 80 / 70 | 70 / 60 | — | 101 |
| CS / `braude_cs`, existing `mon_12220708942_cs` | 600; 580 with math 4u85 / 5u75 | 115 | 85 | 75 | 80 / 70 | 75 / 70 | — | unavailable |
| Electrical–mechanical / `braude_ee_me` | 550 | 110 | 100 | 70 | 80 / 70 | 70 / 60 | 70 | 105 |

These department slugs are local rule selectors, not newly inserted catalogue programmes. Only `mon_12220708942_cs` already identifies a specific department in the persisted catalogue. No new programme/threshold rows are allocated by this phase.

The psychometric route also checks a non-math/non-English advanced subject at 60 where the official department section lists it. Existing ordinary-exam rows at four/five units establish an advanced subject; physics/CS summary inputs can establish one when no complete record overrides them. A passing provided subject suffices. A complete record with no passing advanced subject decides that floor below; an incomplete record cannot establish its absence and asks for the subject record. Projects and combined assessments are not treated as ordinary exams.

**CS exception:** the research's blanket advanced-subject sentence is not confirmed in the official CS section, which has no such row. It is therefore not encoded for CS. CS math alternatives are exactly `(psych >= 600 AND standard math) OR (psych >= 580 AND math 4u85/5u75)`, with the same remaining CS floors. A missing math grade at psych 580 keeps the stronger-math alternative unresolved rather than deciding below. There is no bagrut-only route for CS or civil.

## Average definition and full bagrut

`input.bagrut` does not identify whether bonuses are included. It is never compared with Braude's no-bonus floor and is never treated as a Braude bonus-inclusive optimal average.

For the ordinary route, a schema-v2 subject record explicitly marked complete, nonempty and consisting entirely of ordinary exams supplies the conservative unit-weighted average `sum(units * final grade) / sum(units)`, without bonuses, subject deletion, or rounding. This is an interpretation of “weighted, without bonuses”, not an institutional composite. Any project/combined row, schema-v1 record, absent record, or incomplete record leaves that average unchecked (`bagrut_subject_record` required). Entering grades or an average assumes full bagrut; the completeness flag is needed to calculate the average, **not to confirm certificate eligibility**. There is no full-bagrut confirmation gate or caveat.

The no-psychometric track stays outside this PR. The original research omitted its subject floors and full optimal-average policy; the new verbatim capture also includes other tracks, but follow-up 4 authorizes only regular-track English floors. Therefore the route's published bonus-average threshold is recorded as an unchecked condition; neither a generic average just below the threshold nor one above it establishes pass/fail. A complete MyWay record also does not resolve the missing source contract. No science-bonus algorithm or guessed subject floors are applied. All seven bonus routes remain `needs_input` in this phase.

## Precedence and result semantics

Within an encoded route:

1. Evaluate every provided, checkable floor. Any miss decides that route below, even if a section score, another input or a composite is missing. The result/route explanation names the missed floor and Braude's source; `officialUrls` links to the source and calculator.
2. Otherwise, missing published quant/English section scores or other required inputs give `kind: needs_input`, `decision: unknown`. Missing scores never imply below.
3. Green uses existing `decision: accepted`, `scoreAssessment: meets_threshold` only when every floor of a successful route was checked and passed. Copy says “עומדים בתנאי הסף להרשמה”; it makes no final-admission claim and adds no committee/interview caveats.

Across OR routes: any complete passing route makes the programme green; only all decided-below routes make the programme below; otherwise it needs input. Thus a failing biotechnology psychometric route plus the unresolved bonus route gives needs_input, with the primary floor visibly marked unmet. A fully checked passing biotechnology psychometric route can be green despite the alternative bonus route being unresolved. CS and civil have no bonus alternative, so a checkable miss gives programme-level below even with missing sections/composite.

Civil's `580 (רב תחומי או כמותי הגבוה מביניהם)` and software/information systems' additional `550 בדגש כמותי` are **unchecked conditions** (`institution_weighted_score` condition id, unconfirmed). They are never estimated from section scores, and the user is never asked to enter an institutional composite (`requiredInputs` excludes that id). With no other miss they give needs_input, even if `requiredInputs` is empty because the missing fact is not an input MyWay collects. These programmes cannot be green in phase 1. A checkable miss still decides the primary route below; the OR rule then applies.

## Source gaps and deferred alternatives

- Electrical, mechanical, industrial and EE–mechanical ordinary English gaps are resolved by the approved verbatim capture above. Their fully checked ordinary routes can now be green. EE + Applied Mathematics remains unsupported because no floors were published for it.
- The live page's “highest of general/quantitative” wording also accompanies other general-score rows. The encoded scores follow the brief's general-score floors; the quantitative-weighted alternative is not estimated. This is not a complete evaluator of every alternative the college may accept. The three composite-required programmes identified by the ruling are explicitly withheld as described above.
- Advanced-subject eligibility beyond ordinary four/five-unit exams (projects/combined qualifications) is not inferred. These can leave a requirement unresolved.
- The official page also describes prep/classification-exam substitutes, dedicated mechina, prior technician study, external courses, special populations and conditional Hebrew-language tests. The research does not supply a complete input-checkable rule set for those alternatives. No numbers from live-only language/special-route rows are encoded, and no new manual gate dilutes a successful ordinary-score check.
- Bonus-track encoding remains deferred by scope even though the new source capture contains additional quotes. Science/optimal-average interpretation also remains unresolved. The existing bonus conditions stay unchecked even for a high generic average.

## Identity reconciliation and unchanged live dispatch

`src/data/institutionAliases.ts` maps `ort_braude` and `mon_12220708942` to `braude`. The canonical record copies the hand-written `ort_braude` metadata: name `המכללה האקדמית להנדסה אורט בראודה`, region `north`, domain `braude.ac.il`, and existing homepage `https://www.braude.ac.il`. It replaces the Monday stub's centre/mechina metadata. All three id lookups and both Hebrew names resolve to this curated canonical record. The raw curated `ort_braude` entry is retained; its name, region, domain, logo and homepage match origin/main, with only the lookup result's id canonicalized. Region-by-name lookup also preserves both Hebrew names. Database reads use the same curated name/region/domain/homepage and preserve stored logos.

Both static and database institution lists return exactly one Braude row with id `braude`; aliases are lookup keys, not extra list entries. Normalization never mutates database input rows. Existing canonical rows take precedence over aliases, regardless of row order. Programme ids and raw database rows remain intact; saved institution ids resolve through `canonicalInstitutionId` in the institution-page and enquiry-target data lookups, without redirects. Public programme conditions match Hebrew aliases through `INSTITUTION_BY_NAME` and canonical ids, without a Braude-only name exception. Result-detail `journeyRows` projects matching alias-owned detail names to the displayed institution name; the source programme/notes/official URL stay intact. This preserves the existing component's exact-name selection. The canonical metadata helper throws a clear `Missing institution metadata: <id>` error if either curated or canonical metadata is absent, rather than writing an array entry at index -1. The existing content-repair entry stays under its historical institution id `mon_12220708942`; `getRequirementsChecked` canonicalises both the entry’s and the page’s institution ids with `canonicalInstitutionId`, so the "עודכן לאחרונה · מקור" footer resolves for `braude`. No generated evidence was edited or regenerated.

`braude_engineering` is an unspecified engineering shell; `braude_prep` is mechina. Neither is assigned department floors. Both Batch C lists remain unchanged and their regression tests still require unsupported live results. `mon_12220708942_cs` is supported by the standalone rule only: changing `evaluator.ts` is fenced.

Future dispatcher integration, **not applied**:

```ts
import { evaluateBraudePublishedRoutes } from './braudePublishedRoutesEvaluation';
```

Inside `evaluateCapabilityEntries`, immediately after the institution lookup/undefined guard and before the `incompleteRequirements` / Batch C fallbacks, add this one-line hook:

```ts
const braude = evaluateBraudePublishedRoutes({ input, institution }); if (braude) { results[index] = braude; continue; }
```

Generic engineering/mechina remain unsupported even after that hook. Department selectors need separately reviewed catalogue additions before they become real programmes. No `reviewedManifest.json` change is needed: no persisted cutoff is changed or added. `catalogueContentRepair.json` is unchanged because its existing CS text already contains the relevant source-backed floors and its historical institution id is now resolved by the adapter.

## Corrective round 1: consumer trace and precedence evidence

The metadata regression came from selecting `INSTITUTION_BY_ID.braude` after Monday stub generation instead of copying the curated record. The original alias tests asserted identity only and missed metadata. The list helper also appended a canonical row without removing aliases from public lists. New regression checks failed on wrong region/name/domain/homepage and duplicate rows before these fixes; additional checks reproduced the old-Hebrew-name region/detail loss before fixing those lookups.

| Consumer traced read-only | Data path and result |
| --- | --- |
| `src/app/api/catalog/institutions/route.ts` → `src/components/AppExperience.tsx` → calculator/journey/BucketList filters | Database list and static bootstrap both contain one canonical Braude; programme links use that id. |
| `src/app/api/admissions/evaluate/route.ts` | Receives the same single canonical institution list and canonical programme links; live Braude dispatcher remains unwired. |
| `src/lib/publicCataloguePages.ts` → `src/lib/publicCatalogueLinks.ts` | Current and static institution lists merge by canonical id. Programme/provider lists and homepage ranking cannot receive duplicate Braude institutions. Both Hebrew names retain their admission details. |
| `src/lib/seo/indexability.ts`, `src/lib/seo/metadata.ts`, `src/lib/seo/jsonLd.ts`, `src/app/sitemap.ts` | Read the public catalogue; regression test requires exactly one Braude institution and one indexable `braude` id. No SEO or sitemap file was edited. |
| `src/app/institutions/page.tsx` → `src/data/institutionDirectory.ts` | Separate Monday directory path already has one Braude item; curated lookup now supplies the correct name and northern region. Tested directly. |
| `src/data/geography.ts` → recommendation filters; `src/components/BucketList.tsx` | Old and curated Hebrew names both map to north; BucketList receives the deduplicated catalogue. No component was edited. |
| `src/lib/enquiryTarget.ts` → enquiry page/API | Both legacy institution ids resolve to the one canonical provider without advertising alias entries or losing saved programme ids. |
| `src/server/admission-alerts/baselineEvaluator.ts` | Its institution-list lookup is reachable only for supported TAU/BGU CS targets, not Braude; no change required. |
| Other raw `INSTITUTIONS` consumers: catalogue seed builder and formula-backed inventory | Seeds retain the raw ids; no seed write ran. The inventory's university-id lookup is unaffected (Braude has no formula university id). Both files remain unedited. |

The evaluator now returns in explicit programme order: **below → needs_input → green**. OR-route semantics remain unchanged: a primary-route miss plus an unresolved bonus alternative stays needs_input, not programme-level below.

The four required precedence cases are explicitly named in `braudePublishedRoutesEvaluation.test.ts`:

1. `precedence: %s missing quant section (%i) needs_input after bagrut and general psychometric pass` — electrical 110 and CS 115, with passing average/general/math/English checks and the quant score absent. Requires needs_input/unknown and exactly `requiredInputs: ['psychometric_math']`, and excludes a green score assessment.
2. `precedence: %s composite remains needs_input when all other floors and section scores pass` — software, information systems and civil. Requires needs_input/unknown and the unchecked quantitative-composite condition; never requests an institutional composite.
3. `precedence: a checkable floor miss plus a missing section gives below, naming the floor and source` — CS English 84 against 85 with quant missing; requires below and the source URL.
4. `precedence: all floors present and passing gives green without a full-bagrut confirmation gate` — complete passing CS profile; requires accepted/meets_threshold and every returned condition confirmed.

## Braude section input keys

Braude emits exactly `requiredInputs: ['psychometric_math']` for a missing quant-section score and `requiredInputs: ['psychometric_english']` for a missing English-section score when the other required inputs pass. Its section floor/condition ids use those same existing `AdmissionsRequiredInput` members. The EE 110 / CS 115 precedence tests require the exact quant array, and the missing-section cases require exact arrays for both fields without weakening the other verdict or floor assertions.

Both conventions were verified directly on `origin/main` using `git show`: `src/server/admissions/afekaPublishedRoutesEvaluation.ts` passes `psychometric_math` to `minimum`, and `src/server/admissions/bagrutPolicies.ts` returns `needsInput(..., ['psychometric_english'])`. Both members already exist in main's `AdmissionsRequiredInput` union. No type addition is needed: `git diff origin/main -- src/types/admissionsEvaluation.ts` is empty. Other section-key producers/consumers and `missingData` are unchanged. Oded owns the separate client wiring; the dispatcher remains unwired.

## Follow-up 4: Samuel QA regressions and historical reproduction

Read the complete `pr291-c21840a/SUMMARY.md`, the desktop/mobile production and preview text captures for CS published requirements, result conditions, the legacy CS card and legacy institution page, plus `braude-catalogue-diff.json` and `braude-api-comparison.json`. Production retains 75 / 600 / 115 / 580 in the CS conditions and links the legacy institution card to `/programs/mon_12220708942_cs`. The programme institution link remains `/institutions/braude` after the approved public-id reconciliation; no new UI/redirect/link is introduced. The test fixture copies the pinned preview's actual programme and relevant institution API rows, whose conditions match production.

Tests were added before implementation in the owning `publicCataloguePages.test.ts` and `studyJourney.test.ts`. Only these new test blocks, their imports and captured test fixture were copied into a detached `/tmp/braude-c21840a` worktree at `c21840a317d3f1e81a524d69d8c910a495320e3f`, with `node_modules` symlinked. No historical production code was patched. Command: `npx vitest run src/lib/publicCataloguePages.test.ts src/lib/studyJourney.test.ts -t 'QA block' --reporter=verbose`.

| New regression test | At c21840a | After follow-up 4 |
| --- | --- | --- |
| `QA block 1: mon_12220708942_cs programme page retains published CS conditions` | FAIL: generic institution-check text replaces the five published notes | PASS: exact notes, all four scores, official URL and canonical institution link retained |
| `QA block 1: mon_12220708942_cs result detail retains published CS conditions after alias mapping` | FAIL: generic institution-check text replaces published notes | PASS: exact notes, all four scores and official URL retained; original programme unmutated |
| `QA block 2: legacy mon_12220708942 institution retains its CS programme card and production link` | FAIL: CS card absent (`undefined`) | PASS: listed CS card and `/programs/mon_12220708942_cs` retained |

Historical run: **3 failed / 57 unrelated tests skipped / 2 files**; all three fail for Samuel's reported behaviour. The temporary worktree and symlink were removed without stashing or changing this branch. On f6993b4 the new page/card regressions already passed; the result-detail test still failed and drove the remaining data-path fix.

English tests were updated first: 4u70/69 and 5u60/59 for each of the four departments, literal-unit 5u65/59 and 4u65 cases, industrial English section 85/84, passing-route green precedence, and exact missing-English arrays. The pre-implementation run had **42 failures / 248 passes**, including the missing metadata helper, result-detail regression and English floor cases. The former unchecked-English-gap assertion was replaced with confirmed-floor/accepted assertions because the approved new quotes resolve that gap; unrelated assertions were retained.

No follow-up edits to `src/server/catalogue/queries.ts`, `serializers.ts`, `api/`, geography, static catalogue, enquiry target, components, app, SEO, evaluator or the admissions input type. The existing legacy institution lookup fix is exercised by the new captured-CS regression without changing its production code again.

## PR #291 footer regression fix-up

The real CS content-repair entry retains `checkedAt: 2026-10-21` and `sourceUrl: https://w3.braude.ac.il/intrested/`. Regression assertions require the exact footer date `21.10.2026` and source URL `https://w3.braude.ac.il/intrested/?utm_source=myway&utm_medium=referral`. No catalogue ids, notes, dates or source values were changed. `institutionLink(entry.sourceUrl, institution.id, ...)` remains unchanged.

Tests were committed alone before the fix on top of `eac281743828589e272620b0a208c908aaeced62`. Pre-fix command: `npx vitest run src/data/admissions/catalogueContentRepair.test.ts src/lib/publicCataloguePages.test.ts -t 'Braude CS requirements-checked footer|QA block 1' --reporter=verbose`. Vitest output is captured at `/workspace/codex-tasks/pr291-prefix-failure.log`: **3 failed / 1 passed / 46 skipped / 2 failed files**; each failure received `undefined` instead of the exact checked object.

| Regression test | Before fix (eac2817) | After fix |
| --- | --- | --- |
| `catalogueContentRepair.test.ts`: Braude CS requirements-checked footer for `braude` | FAIL: checked object undefined | PASS: exact date and tracked source URL |
| `catalogueContentRepair.test.ts`: Braude CS requirements-checked footer for `ort_braude` | FAIL: checked object undefined | PASS: same exact date and tracked source URL |
| `catalogueContentRepair.test.ts`: Braude CS requirements-checked footer for `mon_12220708942` | PASS: historical-id baseline | PASS: same exact date and tracked source URL |
| `publicCataloguePages.test.ts`: existing QA block 1, canonical `braude` source checked assertion | FAIL: `source.checked` undefined | PASS: exact date and tracked source URL through `getPublicProgramRequirementSources` |

The focused post-fix run includes the unchanged `requirementsChecked.test.ts` mismatch, note-integrity, date and official-source tests. `requirementTiles.ts` has a similar raw-id comparison and is intentionally untouched: changing it could introduce number tiles and needs separate visual approval. No browser, deployment or production verification is claimed by this local-only fix-up.

## SQL packet — NOT APPLIED

[2026-10-25-braude-batch-a.sql](2026-10-25-braude-batch-a.sql) contains separate BACKUP, APPLY, ROLLBACK and VERIFY sections. It was inspected against `src/db/schema.ts` and the existing dated SQL packets; **none of its SQL was executed, even locally**.

APPLY needs an explicit date flag plus the hash of a freshly reviewed read-only backup, checks the expected legacy institution and CS programme, locks scoped tables in one serializable transaction, refuses identity collisions or numeric/publication dependencies, backs up privately, allocates the canonical institution only if absent, and repoints catalogue relations without changing any stored programme/requirement/source ids. ROLLBACK has its own flag, refuses any scoped drift and verifies exact restoration. Existing aliases are never deleted. Only a canonical row newly allocated by this packet can be removed on rollback; foreign keys protect later saved references. No new programme or threshold row is necessary. Cutoff changes must use `reviewedManifest.json` `canonical_change`; the packet refuses existing alias threshold/publication targets instead of moving them behind the ledger.

The packet is a review proposal, not a claim about current production prestate. If its expected prestate or dependency guard fails, Jorje must obtain fresh evidence and revise the packet; there is no bypass.

## Verification

Tests were written and executed before the new rule/alias modules existed; both first runs failed on the expected missing imports. Persisted-alias serializer assertions also failed before the serializer change. Boundary expectations are literal source values, not derived from the implementation.

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- Focused Vitest: `npx vitest run src/data/institutionAliases.test.ts src/lib/publicCataloguePages.test.ts src/lib/studyJourney.test.ts src/server/admissions/braudePublishedRoutesEvaluation.test.ts` — **290 passed / 4 files**, covering the three captured QA regressions, missing metadata guards, every new English boundary and literal-unit/precedence cases. Historical red evidence is recorded above; no assertion was weakened to obtain green.
- `npm test` — **3,765 passed, 86 skipped / 241 passed files, 13 skipped**; no failed checks to reproduce on origin/main.
- `npm run guard:pre-pr` — passed; **2,625 tests / 106 files**. It ran migration consistency, read-grant checks, catalogue seed **dry-run** and Monday evidence verification; no database write/seed was performed. Existing migration-journal timestamp warning and absent local raw Monday export were reported by the guard; evidence verification passed.
- Earlier phase: `ce-simplify-code` applied within the diff, preserving proof tests: shared numeric gates retained; repeated missed-floor explanation reduced to one calculation; redundant comments removed. No agent review pipeline ran.

Code review: skipped (ce-code-review not run) — per brief.

No layout or styling change is intended; no UI or routing files were edited. The intended data-driven display correction is explicit: Braude appears once with the curated name and northern region, domain and homepage, rather than the Monday centre/mechina stub or duplicate alias entries. Curated `ort_braude` consumers retain their origin/main name/region/domain/logo metadata, and database logos are preserved. Both Hebrew names keep region lookup and admission detail matching. The additional intended display restoration keeps published CS conditions on programme/result details and the production legacy CS card/link. No new UI, layout or routing was added. No new browser/deployed/Supabase verification is claimed: dispatcher wiring is intentionally absent, the SQL is unapplied, and this brief forbids deployment/database writes. Direct data/lookup and floor tests establish the corrected behavior; production behavior has not gained Braude admissions coverage in phase 1.

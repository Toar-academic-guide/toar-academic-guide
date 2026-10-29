# Saved-input gap: haifa_psychology still returns "650 לפחות"

Read-only trace. Worktree `/workspace/toar-wt-bugs-first` @ `7f6d5cf` (same code as main `56b3a6a`), not modified. Nothing was run against the repo; the trace is a static reading of the code, checked against the prod responses captured in `/workspace/qa-evidence/pr318-prod/`.

## 1. Evidence: request shape and what prod returned

**Correction to the brief:** `api-haifa-variants.json` holds three variants (`full_no_haifa_avg`, `bagrut_psy_only`, `empty`). None of them carries `haifaBagrutAverage`, and all three already return the Haifa note for haifa_psychology, haifa_cs and haifa_economics. The failing saved-input request is in **`api-evaluate.json`**, at `data.reports.haifa_psychology` (and the same at `data.reports.psychology`).

The request (`input` echoed by prod):
```json
{
  "degreeId": "haifa_psychology",
  "psychometric": 700,
  "bagrut": 104,
  "extraInputs": {
    "psychometricMath": 140, "psychometricVerbal": 130, "psychometricEnglish": 135,
    "bagrutSubjectRecord": { "schemaVersion": 2, "sector": "jewish", "certificateType": "external_1977_or_later", "complete": true,
      "subjects": [ {"subjectId":"mathematics","units":5,"grade":90,"assessmentKind":"exam"}, {"subjectId":"english","units":5,"grade":85,"assessmentKind":"exam"},
                    {"subjectId":"physics","units":5,"grade":80,"assessmentKind":"exam"}, {"subjectId":"computer_science","units":5,"grade":95,"assessmentKind":"exam"},
                    {"subjectId":"hebrew_expression","units":2,"grade":85,"assessmentKind":"exam"}, {"subjectId":"history","units":2,"grade":80,"assessmentKind":"exam"},
                    {"subjectId":"civics","units":2,"grade":85,"assessmentKind":"exam"}, {"subjectId":"literature","units":2,"grade":85,"assessmentKind":"exam"},
                    {"subjectId":"bible","units":2,"grade":80,"assessmentKind":"exam"} ] },
    "mathUnits": 5, "mathGrade": 90, "englishUnits": 5, "englishGrade": 85, "physicsUnits": 5, "physicsGrade": 80, "csUnits": 5, "csGrade": 95,
    "haifaBagrutAverage": 104,
    "haifaHebrewQualification": "hebrew_school",
    "bguBagrutAverage": 104
  }
}
```
Actual result (prod):
```json
{ "capability": "authority_unavailable", "kind": "authority_unavailable", "decision": "unknown", "confidence": "low",
  "sourceLabel": "האימות הרשמי טרם הושלם",
  "explanation": "הקבלה לפסיכולוגיה באוניברסיטת חיפה מבוססת על ציון קבלה 650 לפחות, עם טווח המתנה 630–649. עדיין אין חישוב מאומת שמאפשר לקבוע סיכויי קבלה לפי הבגרות והפסיכומטרי שהוזנו. בדקו במחשבון הרשמי של האוניברסיטה.",
  "nextAction": "בדקו בינתיים ישירות במחשבון הרשמי של המוסד.",
  "officialUrls": ["https://admissions.haifa.ac.il/social-sciences/program/3268/"],
  "degradationReason": "pair_verification_incomplete" }
```
Expected result: the Haifa note, exactly as the no-average variant already returns it (`haifaProgrammePolicy.ts` 53–68):
```json
{ "capability": "authority_unavailable", "kind": "authority_unavailable", "decision": "unknown", "confidence": "low",
  "sourceLabel": "אין מספיק מידע",
  "explanation": "עדיין לא מחשבים כאן את ציון הקבלה של חיפה",
  "nextAction": "בדקו במחשבון הרשמי של אוניברסיטת חיפה.",
  "officialUrls": ["https://admissions.haifa.ac.il/score-calculation/", "https://applicants.haifa.ac.il/enrollmentChances/index.html"] }
```
(There should be no `degradationReason`; the expected result is the object `haifaMissingRuleResult` returns.)

## 2. Code path, step by step (all paths in the worktree)

1. **`src/server/admissions/evaluationInputs.ts` 31–46.** The loop over `['haifa','haifaBagrutAverage',undefined]` runs `if (extraInputs[key] !== undefined) continue;` first (line 37). The request already carries `haifaBagrutAverage: 104`, so the loop skips it and `proxyInstitutions` never gets `'haifa'`. Lines 48–56 then default `haifaBagrutYear` and `haifaPsychometricYear` to `HAIFA_ADMISSION_YEAR`.
2. **`src/server/admissions/evaluator.ts` 199–201.** `haifaAverageIsProxy: normalized.proxyInstitutions.has('haifa')` evaluates to **false**.
3. **`evaluator.ts` 352–364: the Haifa dispatch that the brief calls "haifaProgrammePolicy dispatch".**
   ```ts
   if (
     institution.id === 'haifa' &&
     (args.haifaAverageIsProxy || input.extraInputs?.haifaBagrutAverage === undefined)
   ) { const missingRule = haifaMissingRuleResult(...); ... continue; }
   ```
   With a saved, non-proxy average both disjuncts are false (`false || (104 === undefined)`), so **`haifaMissingRuleResult` is never called**. The guard was written for the two cases the A/F ruling tested: no average, and a proxy average. It assumed a real, saved Haifa average would go on to an exact Haifa calculation. For psychology there is no exact calculation.
4. **`evaluator.ts` 366–501.** No other branch matches haifa_psychology: it is not BIU, not incomplete-requirements, not batch B or C, and `entry.capability` is not `'exact'`. Execution falls through to **`evaluateNonExactResult(...)` at line 503**.
5. **Capability for the pair.** `src/data/admissions/formulaBackedVerificationLedger.ts` 265–273 lists `psychology__haifa` and `haifa_psychology__haifa` in `WITHHELD_PAIR_EVIDENCE`. Lines 314–336 then build a ledger entry with `state: 'withheld'` and `reason: WITHHELD_PAIR_EVIDENCE[pairId].reason`. In `src/server/admissions/capabilityMatrix.ts` 839–852, an in-scope pair whose `pairVerification.state` is not `'exact'` gets `capability: 'authority_unavailable'`, and the matrix entry carries `pairVerification`.
6. **`evaluator.ts` 2153–2175 (`evaluateNonExactResult`, the `authority_unavailable` branch)** returns `sourceLabel: 'האימות הרשמי טרם הושלם'`, `explanation: entry.pairVerification?.reason` (line 2165), `officialUrls: [pairVerification.sourceUrl]` and `degradationReason: 'pair_verification_incomplete'` (line 2173).
7. **The source of the text:** `formulaBackedVerificationLedger.ts` **lines 265–269**, `HAIFA_PSYCHOLOGY_WITHHELD_EVIDENCE.reason` = "הקבלה לפסיכולוגיה באוניברסיטת חיפה מבוססת על ציון קבלה 650 לפחות, …", with url `…/social-sciences/program/3268/`. Every field of the prod response matches this branch.

### Why the dispatch misses it
The guard at `evaluator.ts` 353–355 is **input-conditional**: it only fires when the Haifa average is missing or is a proxy. Whether Haifa can be calculated is a property of the **programme**, but the guard decides from the **input**. The A/F ruling ("every Haifa programme shows the exact honest note") is enforced only for inputs without a saved average.

### Why tests didn't catch it
- `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts` 22–58 (the A/F test) uses `gapApplicant()`. That applicant has a subject record but no `haifaBagrutAverage`, and the Haifa calculator slot is `undefined`, so `haifaBagrutAverage` stays undefined and the guard fires.
- **The same file at lines 60–75 pins the bug.** `gapApplicant({ haifaBagrutAverage: 102 })` for haifa_psychology asserts `expect(psychology.explanation).toContain('650')` (line 74). That assertion has to change as part of the fix.

### Same gap on other Haifa programmes (same request, `api-evaluate.json`)
With a saved `haifaBagrutAverage` the guard is skipped for **every** Haifa pair, not just psychology:
- `biology` → `needs_input`, "לבדיקת חיפה חסרים הנתונים הבאים: חודש הפסיכומטרי." (`requiredInputs: ["haifa_psychometric_month"]`)
- `communication` → `manual_gate`, score 702 against threshold 550, "הסכם עומד בסף 550 …". The explanation uses the word סכם. The score comes from the exact path at `evaluator.ts` 978–1101 (live `runHaifaAdmissionsProof`). Note: my calculator research found that the stored communication calculator ID 52253864 is not in Haifa's current `getProgramForHug` dictionary (see calculator notes).

These contradict ruling A/F the same way. Whether to fix them too is a product decision (see option B).

## 3. Proposed minimal fix (not applied; the worktree is read-only)

**Option A: narrow, fixes exactly the reported bug.** In `src/server/admissions/evaluator.ts` 352–355:
```diff
     if (
       institution.id === 'haifa' &&
-      (args.haifaAverageIsProxy || input.extraInputs?.haifaBagrutAverage === undefined)
+      (args.haifaAverageIsProxy ||
+        input.extraInputs?.haifaBagrutAverage === undefined ||
+        ['psychology', 'haifa_psychology'].includes(program.id))
     ) {
```
With `averageIsProxy: false`, `haifaMissingRuleResult` (`haifaProgrammePolicy.ts` 14–68) skips its proxy block (lines 23–49) and returns the note with `kind: 'authority_unavailable'` for psychology (line 50). That is the expected output in section 1.

**Option B: matches ruling A/F for every Haifa programme.** Make the guard `if (institution.id === 'haifa') { … }`. Side effects to accept or handle:
- The saved-average exact path for Haifa (`evaluator.ts` 978–1101) becomes unreachable. Communication's live 702/550 result and biology's psychometric-month prompt would both become the note.
- The haifa_infosystems `single_major` "mapping not verified" result at `evaluator.ts` 2110–2126 would be shadowed for saved averages. `haifaMissingRuleResult` returns its own unresolved-mapping result only when `averageIsProxy` is true (lines 23–42). To keep that result, move the `mappingState === 'unresolved'` check out of the `if (context.averageIsProxy)` block.

**Not recommended:** replacing the text in `formulaBackedVerificationLedger.ts` 268. `WITHHELD_PAIR_EVIDENCE` also feeds the ledger and weekly-review reasons (`weeklyReviewRun.ts` 119–123, `candidateChanges.ts` 68). It would also still leave a different `sourceLabel`, URL and `degradationReason` from the note.

## 4. Reproducing test (not run; it would fail on 7f6d5cf and pass with option A or B)
Add to `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts`. It reuses that file's imports (`gapEvaluate`, `gapApplicant`, `gapPrograms`, `normalizeEvaluationInputs`) and `haifaNotice` / `haifaSources` (lines 175–179):
```ts
it.each(['haifa_psychology', 'psychology'])(
  'saved Haifa average + Hebrew qualification still gives the Haifa note for %s',
  async (id) => {
    // Shape of the prod request in qa-evidence/pr318-prod/api-evaluate.json (data.reports.haifa_psychology.input)
    const applicant = gapApplicant({
      haifaBagrutAverage: 104,
      haifaHebrewQualification: 'hebrew_school',
    });
    expect(
      normalizeEvaluationInputs({ degreeId: id, ...applicant }).proxyInstitutions.has('haifa'),
    ).toBe(false); // saved, non-proxy average: the case the guard at evaluator.ts:353 skips
    const { result } = await gapEvaluate(gapPrograms.find((p) => p.id === id)!, 'haifa', applicant);
    expect(result).toMatchObject({
      kind: 'authority_unavailable',
      capability: 'authority_unavailable',
      explanation: haifaNotice,
      officialUrls: expect.arrayContaining(haifaSources),
    });
    expect(result.explanation).not.toContain('650');
    expect(result.degradationReason).toBeUndefined();
  },
);
```
Also change the existing assertion at **line 74** from `expect(psychology.explanation).toContain('650');` to `expect(psychology.explanation).toBe(haifaNotice);`. The file carries an "Approved test update" convention (line 43), so this needs the same sign-off.

With option B, also extend the A/F loop (lines 22–58) to run a second pass with `gapApplicant({ haifaBagrutAverage: 104, haifaHebrewQualification: 'hebrew_school' })`, so saved inputs are covered for all 47 pairs.

## 5. Uncertainty
- This is a static trace. I did not run vitest, to avoid touching the worktree and its `node_modules`. Every field of the prod response matches the `evaluator.ts` 2153–2175 branch with the ledger reason, and no other code produces that string (`rg` over `src`, excluding tests, finds it only at `formulaBackedVerificationLedger.ts:268`).
- I assume `psychology` (generic alias) lists Haifa through `linkedInstitutionIds`, as the prod `data.reports.psychology` shows; the same fix covers it.

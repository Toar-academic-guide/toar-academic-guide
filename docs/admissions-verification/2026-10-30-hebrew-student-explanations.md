# Hebrew student explanations — 2026-10-30

## Scope and authority

Copy-only evaluator fix on `codex/hebrew-student-explanations`, based on `origin/main` at `b8cbcf1`. Oded granted edits to `src/server/admissions/evaluator.ts`; Mario approved the exact student copy below (grants dated 2026-10-30, supplied in the task brief). Amit reviews the copy through the PR comparison table. Decisions, result kinds, capabilities, formulas, thresholds, and programme visibility are unchanged. No DB writes, production SQL, generated evidence changes, or GitHub comments.

The work follows ce-plan → ce-work → ce-simplify-code, with new failing tests before implementation. ce-code-review is excluded by the task brief.

## Official sources

Checked on 2026-10-30:

- [Computer science FAQ](https://academic.openu.ac.il/cs/computer/pages/faq.aspx): “הלימודים באוניברסיטה הפתוחה מתאפיינים בקבלה פתוחה לכול ללא תנאים מוקדמים”. Primary provenance for evidence item `12220699690`.
- [University-wide applicant FAQ](https://academic.openu.ac.il/campaigns/join-now/new/pages/bettercareer2.aspx): “אין צורך בציון פסיכומטרי או תעודת בגרות מלאה כדי להתחיל ללמוד.”
- [Official Hebrew information booklet](https://www.openu.ac.il/virtual-session/download/info-hebrew.pdf), printed page 2: registration does not require a matriculation certificate, preparatory programme, or psychometric examination. This booklet corroborates the general policy; it is not used for current deadlines or numeric thresholds.
- [Registration guidance for special populations](https://www.openu.ac.il/registration/guidelines/populations/pages/default.aspx), section “נרשמים תלמידי תיכון ונרשמים מתחת לגיל 18”: documents the separate admissions process for school students and applicants under 18 who have not finished grade 12. The approved copy is retained verbatim rather than changing that wording or adding an admissions gate.

## Mario-approved copy

באוניברסיטה הפתוחה הקבלה לתואר ראשון פתוחה לכולם: אין צורך בציון פסיכומטרי או בתעודת בגרות מלאה כדי להתחיל ללמוד. אם אתם מתחת לגיל 18 או עדיין בתיכון, יש תהליך קבלה נפרד.

`src/data/admissions/studentExplanations.ts` stores this text under evidence itemId `12220699690`, with `sourceUrl` set to the computer science FAQ and `checkedAt` set to `2026-10-30`. The same evidence record serves `open_university_cs`, `open_university_engineering`, and `open_university_certificate`. The latter two were absent from the production inventory; this change does not list or unhide them.

## Leak path and fail-closed behavior

The generated Monday record's English `decisionReason` passed through `catalogueDescription()` in the evaluator's `open_admission` branch. The serializer preserved it in `POST /api/admissions/evaluate` → `results[].explanation`; CalculatorResults and StudyJourney rendered it. The catalogue description filter removes some internal templates but does not remove this one. The institution-level fallback (`entry.evidence ?? getMondayAdmissionEvidenceByCatalogueInstitutionId(id)[0]`) could also select unreviewed evidence.

Open admission now reads only the reviewed explanation for the selected evidence itemId, then uses the existing Hebrew default. It never reads raw `decisionReason`, even when that reason contains Hebrew. A missing entry or an entry without Hebrew falls back to that default.

At the known registry/evidence boundaries, a local Hebrew-text check accepts text only when it contains Hebrew letters. Blocked source reasons and next actions otherwise use the existing Hebrew defaults. Tracked missing-rule next actions try Hebrew evidence copy, then Hebrew registry copy, then the existing Hebrew default. This is a language guard, not a translation system or a guarantee that mixed-language prose is student-ready.

## Current → new

| programmeId | field | current | new |
| --- | --- | --- | --- |
| `open_university_cs` | `explanation` | Update or board evidence says there are no academic admission requirements. | Mario-approved copy above, byte-exact |
| `open_university_engineering` | `explanation` | Same English text, shared record (static catalogue only in the inventory) | Same approved copy |
| `open_university_certificate` | `explanation` | Same English text, shared record (static catalogue only in the inventory) | Same approved copy |
| `ariel_engineering` | `nextAction` | Move Ariel to a browser-automation lane that can actually clear the current Radware challenge, such as a solvable Hermes/VPS session, or find a newly published static Ariel admissions source; the current calculator, sitemap, WordPress REST, and computer-science routes are not usable as verifiable admissions evidence from this environment. | צריך להשלים אימות רשמי לפני שנציג קבלה או דחייה. |
| Latent `biu-browser-required` registry target | `blockedReason` → `explanation` | Radware/browser session required | המקור הרשמי דורש דפדפן או תהליך ידני. |
| Latent `ariel-browser-required` registry target | `blockedReason` → `explanation` | Stateful browser session required | המקור הרשמי דורש דפדפן או תהליך ידני. |
| Both latent blocked registry targets | `nextAction` | Move to Hermes/VPS browser automation lane | בדקו ישירות באתר המוסד. |

The static sweep found four offending programme/field pairs in each profile: the three Open University explanations and the Ariel engineering next action. It found no other Latin-only student fields. The registry cases above are exercised with targeted capability fixtures because those blocked branches are not reached by the current catalogue/profile sweep. Other unreviewed decision reasons are prevented from leaking by removing that data source altogether; their copy is not translated or changed.

## Verification

- Test-first: the new evaluator tests failed on the English Open University explanations, the unreviewed-evidence fallback, Ariel's next action, and both registry blocked reasons/actions. The new data test initially failed because the reviewed-copy module did not yet exist. Evidence: `/tmp/english-explanations-red.log` in the implementation workspace.
- The guard evaluates all 403 static programmes across `{psychometric:650,bagrut:100}`, `{psychometric:500,bagrut:80}`, and no input: 1,209 programme evaluations covering 1,308 institution results. It checks `explanation`, `nextAction`, and `sourceLabel`; `blockedReason` reaches students through `explanation`. Institution brand names are outside the check. Freshness is supplied explicitly, database access is rejected, and source fetches are offline.
- Data tests cover every open-admission evidence record, Hebrew content without English prose, provenance, and the byte-exact approved copy. No server code is imported into the data tests.
- Focused verification: 472 tests passed, including the unchanged evaluator, capability-matrix, and public catalogue copy suites.
- `env -u DATABASE_URL npm run guard:pre-pr`: passed, including 143 test files / 3,613 tests, migration consistency, seed dry-run, and operational-grant checks. The guard reported the already-missing raw Monday export and skipped its regeneration-drift check; no generated files were changed.
- `env -u DATABASE_URL CI=true CATALOGUE_SOURCE_MODE=static npm run test:coverage`: passed, 333 files passed / 14 skipped; 5,562 tests passed, one expected failure, 101 skipped. Coverage: statements 81.49%, branches 77.68%, functions 80.17%, lines 82.35%.
- `npm run typecheck` and `npm run lint`: passed. After the comment-only simplification, both checks and all 472 focused tests passed again. Proof tests and all pre-existing test expectations remain intact.
- Existing repository Playwright test `e2e/journey-calculation-batch.spec.ts`: both Chromium tests passed at 1440px and 390px against the local app in explicit static mode. They exercise the landing-page journey, persisted Bagrut input, batch evaluate API, and results rendering. The browser skill's `agent-browser` fallback is absent; browser execution used the repository's existing Playwright runner, with no new driver or workflow installed. These are local checks, not approval screenshots from a deployed preview.
- Local real-route `POST /api/admissions/evaluate` for `open_university_cs`: all three profiles returned the approved copy byte-exact, with decision `accepted`, kind `open_admission`, and capability `open_admission`. Responses saved to `/tmp/english-explanations-local-api.json` in the implementation workspace.
- Fetched and merged `origin/main` before pushing; it was already up to date at `b8cbcf1`.

## Deployment limits

This PR does not change Supabase state or Vercel configuration. Production inventory is the supplied 2026-10-30 investigation, not a claim that this unmerged fix has shipped. Preview and production verification remain separate from the offline static evaluator sweep. No DB writes, migrations, seeds, freshness/publication jobs, or environment changes are authorized.

# Technion winter תשפ״ז thresholds

EE and ME compare scores against the winter תשפ״ז initial table (`tablepress-485`). The spring table (`tablepress-482`) appears first in the official page and previously supplied EE 94 by mistake. Parsing now requires the winter table and the exact programme title.

| programme | old | new | source |
| --- | --- | --- | --- |
| technion_ee | 94 | 91.5 | [Technion winter table][official-source] |
| technion_me | 92 | 87 | [Technion winter table][official-source] |

Changed per Jorje's ruling 2026-10-25. The EE pinned test cites the CEO ruling at 01:46 and the official winter URL. The spring-first regression remains in place. The later 01:47 scope ruling restores medicine completely.

Medicine: unchanged, separate follow-up.

Medicine retains threshold 92, `thresholdKind: invitation_to_manual_gate`, and the Bagrut-subject-record input requirement. Its evaluator, ledger, verification contracts, evidence, source targets and historical captures match main. Both medicine verification artifacts were compared against `origin/main` and are identical, including their original capture dates. Medicine's added no-verdict tests and note were removed. The notice renders only for EE and ME. Engineering and the other programme cutoffs are unchanged; computer engineering is out of scope.

## Where ME's value comes from

The stale ME 92 was stored in four places:

- `src/data/degrees/academicPrograms.ts`: `technion_me.thresholds.technion`.
- `src/data/admissions/technionProgramVerification.ts`: the `me` verification config.
- `src/data/admissions/mondayEvidenceOverrides.json`: `technion_me.threshold`.
- `src/data/admissions/mondayEvidence.generated.ts`: generated `technion_me.threshold`.

These now agree at 87. They support catalogue consistency and verification; they do not replace the live table cell. `runTechnionAdmissionsProof` fetches the official calculator score, fetches the official threshold page, calls `parseTechnionOfficialThreshold`, and compares the score with the winter ME row's 87. Its adapter test deliberately supplies the old local external ID 92 and still gets 87 from the official-table fixture: 87 passes and 86.99 is below. The public evaluator boundaries test the same values with ordinary subject grades and psychometric input.

## Student notice

`עודכן לאחרונה: 25.10.2026 · מקור: הטכניון` — [official source][official-source]

EE note: `באביב תשפ"ז: 94 — על בסיס מקום פנוי, מספר המקומות מצומצם`.

The date/source notice is small and right-aligned. Contact and Save remain visible. Only EE and ME receive the updated date; medicine and other verification metadata keep their original dates.

## Verification

- Full unit suite: **3233 passed, 0 failed, 65 skipped**.
- Focused parser/evaluator/component and unchanged medicine/coverage tests: **640 passed**. All ten formerly failing tests pass unchanged; `git diff origin/main --` their eight test files has no output.
- EE boundary: **91.5 passes, 91.49 below**. ME boundary: **87 passes, 86.99 below**, through both the live adapter with fixture responses and the public evaluator.
- Spring-first fixture: spring `94 -על בסיס מקום פנוי` above winter `91.5` returns **91.5**. An absent winter table yields no cutoff.
- `npm run guard:pre-pr`: **passed**, including migration grants, migration consistency, catalogue seed dry-run, Monday evidence and **2359 targeted tests**. No hook bypass was used.
- TypeScript: passed. ESLint: no errors; one existing unused-type warning in `bagrutPolicies.ts`.
- Chromium: **4 Playwright tests passed** at 390px and 1440px. EE/ME programme pages show the stamp; EE score 92 renders cutoff 91.5 with spring 94 only as a note. Right alignment, overflow, Contact and Save were checked. The verdict rendering test mocks the evaluation response; evaluator and adapter behavior are tested separately with official HTML fixtures.
- Browser screenshots: `/tmp/technion-ee-only-browser-evidence/`. Explicit local static catalogue mode was used; webpack dev mode accommodates the shared node_modules symlink. No repository configuration changed.
- Generated evidence was regenerated from the override JSON using the existing generator functions while retaining the committed export metadata; the ignored raw Monday export is unavailable in this worktree.
- No Supabase writes, applied seeds, freshness publication, manual deployments, environment changes, or production verification were performed. Catalogue/freshness publication and deployed database-backed verification remain separate operational work; the local tests do not establish production state.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.

Evidence: `/workspace/seo-geo/technion-threshold-sweep-2026-10-25.md`, archived HTML SHA256 `8dd512d269f64e33325e0342c8bcd1c7ff1b70c9a6cfce5773e2eac9a89cb400`. Official cutoffs were checked against that capture and the live source on 2026-10-25. The calculator formula is unchanged; this run did not establish a new live calculator comparison.

[official-source]: https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/

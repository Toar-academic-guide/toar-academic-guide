# BIU catalogue copy refresh — 2026-10-23

Follow-up to #254, using its [verification packet](2026-10-23-biu-sekem.md) and committed official captures. This changes catalogue display copy only; the seven Bagrut-only routes retain their evaluator thresholds, formulas, decisions and confidence.

## Copy and sources

`catalogueContentRepair.json` now covers all seven encoded pairs. Existing law/criminology rows have refreshed wording and `checkedAt: 2026-10-23`; new rows cover generic law and the three science programmes. The science fallback notes in `academicPrograms.ts` match the repair rows.

| Pairs at BIU | Inclusive Bagrut-only gates shown |
| --- | --- |
| `law`, `biu_law` | Average ≥112; English 5 units, grade ≥90 |
| `criminology`, `biu_criminology` | Average ≥98; dual-major applicants must also meet the other department's conditions |
| `biu_lifesciences` | Average ≥108; either mathematics 5 units, grade ≥85, or mathematics units × grade ≥320 plus two distinct science subjects at 5 units, grade ≥80 each |
| `biu_biotech` | Average ≥108; mathematics units × grade ≥320 plus two distinct science subjects at 5 units, grade ≥80 each |
| `biu_computational_bio` | Average ≥112; mathematics 5 units, grade ≥95 |

All seven notes include certificate eligibility, English classification ≥85 and conditional Hebrew ≥105 for applicants required to take יע״ל. Science subjects are exactly biology, biotechnology, mathematics, chemistry, physics, engineering and computer science; qualifying mathematics can count toward the two subjects.

- [Ordinary admission without psychometric, תשפ״ז](https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry): primary source for all seven rows. Existing capture: `references/biu-2026-10-23/acceptance-no-psychometry.html`, SHA-256 `7b872260e25eb2b78c3203951baddf5cc2a089c76406017e8cd35b17f2d2d4ad`.
- [General admission requirements](https://www.biu.ac.il/registration-and-admission/information/general-admission-req): existing capture supplies certificate and language conditions.
- [Criminology BA](https://criminology.biu.ac.il/tracks/BA): supporting source from #254 for the dual-major caveat; its programme link is preserved. The existing [law programme link](https://law.biu.ac.il/node/129) is also preserved, without claiming a new successful fetch.
- [Official BIU calculator](https://shoham.biu.ac.il/kabala/): notes direct applicants here for psychometric/combined routes, without a numeric cutoff. The packet does not establish law's older psychometric-720 alternative; that number and older special-route/year-mixed clauses are removed from these notes. No new calculator access is claimed; #254 recorded HTTP 403.

## Scope and confidence

**No invented סכם eligibility for deferred IDs.** Repair rows and notes for `biu_cs`, `biu_ee`, `biu_psychology`, `biu_medicine`, `biu_socialwork`, `biu_optometry` and their generic pairs are untouched. No numeric composite cutoff is added to any of the seven refreshed pairs either.

`biuPublishedRoutesEvaluation`, its tests, the API decision tests and existing Playwright scenarios are unchanged. Matches remain estimated/pending under #254 because BIU's institution-specific average is not verified. No new eligibility or final-admission claim is introduced.

The catalogue's legacy-inference test now checks that the three science fallback notes equal their repair rows, rather than demanding inferred global gates from route-specific display text. The dedicated evaluator still owns those gates. No UI component, layout, SQL, migration, production seed, publication workflow, environment setting or secret is changed.

## Verification

- Added 14 regression cases across content-repair and requirement-tile tests. All 14 failed against the old copy before the refresh; all now pass. The repair suite also checks seed output in memory and preserves existing numeric rules across the overlay.
- Full Vitest suite: **216 files passed, 11 skipped; 2,663 tests passed, 65 skipped**. Unchanged BIU evaluator/API tests pass. Existing optional integrations remain skipped.
- TypeScript passed. ESLint passed with the existing unused `AdmissionsRequiredInput` warning in untouched `bagrutPolicies.ts`.
- Existing `e2e/biu-admissions.spec.ts`: **10/10 passed** against real local evaluator responses at **390px and 1440px**, covering weak/boundary/missing-science cases via `/app/calculator#detail` and `/#detail`.
- Additional browser check: **14/14 passed**, visiting `/programs/{id}` for all seven pairs at both widths, expanding additional conditions and checking the complete sourced copy, right alignment, no horizontal overflow, no numeric composite cutoff and no page errors. Screenshots inspected for Hebrew wording; local captures are in `/tmp/biu-catalogue-screenshots/`.
- Browser checks used the repository's installed Playwright/Chromium under the project's verification instructions. The preferred CE interactive driver was unavailable (`agent-browser` absent); no browser dependency was added. The local server ran with explicit `CATALOGUE_SOURCE_MODE=static`; no deployed configuration changed.
- `npm run guard:pre-pr`: passed, including local migration/grant checks, catalogue seed **dry-run**, committed Monday evidence verification and targeted regressions. The existing raw Monday-export regeneration check was skipped because the export is absent; no bypass was used.

No production Supabase, authenticated deployment, Vercel runtime or live-data verification is claimed: this PR is code-catalogue copy only, with no database execution. Jorje retains the independent source/product verification and any later guarded publication. Code review is skipped by the explicit task instruction prohibiting `ce-code-review`.

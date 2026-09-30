# Plan 002: TAU and BGU Computer Science milestone

Scope: the standard Israeli Bagrut routes for `tau_cs__tau` and `bgu_cs__bgu`, including their shared `cs` catalogue aliases. This does not complete the full Plan 002 inventory, enable Plan 003 route projections, or publish production thresholds.

## Official captures and live replay

Synthetic applicants were submitted independently to the official calculators before the adapter replay. The controlled replay reproduced both boundaries for all four catalogue targets. Full public-source evidence is in `2026-09-27-computer-science-live-proof.json`.

| Institution | Official Bagrut average | Psychometric | Components Q/V/English | Official score | Standard-route result |
| --- | --- | --- | --- | --- | --- |
| TAU | 115 | 730 | English 110 | 730 | Above acceptance 705 |
| TAU | 100 | 660 | English 110 | 618 | Below rejection 704 |
| BGU | 120 | 800 | 150/150/150 | 879 | Above quantitative cutoff 720 |
| BGU | 100 | 600 | 125/110/100 | 636 | Below quantitative cutoff 720 |

All examples contain five-unit mathematics at grade 85 and explicit confirmation of the relevant application/language requirements. TAU examples use no physics bonus. These are derived standard-route results, not university-issued admission offers. Academic, exceptional, and alternative routes still require institution review.

BGU CS replays the quantitative `!rg.acc_SubmiTevaSekem` calculator, rather than the general total-score calculator. TAU CS uses `hatama_meduyakim`, node 8220 and programme 036811010000. Both adapters withhold exact output when their programme mapping, cutoff, or critical published requirements differ from the reviewed capture. A separate official average is required; the generic estimated Bagrut average cannot supply it.

The BGU general endpoint returned 875 and 632 for the same two examples; the quantitative endpoint returned 879 and 636. Both remain on the same side of 720 in these examples. These observations prove different scores, not a changed admission verdict. TAU's application confirmation includes Advanced A English (100 through psychometric English or a separate English placement exam), Bagrut, Hebrew and first-choice registration. A low or missing psychometric English subscore alone does not fail this gate when the applicant explicitly confirms the alternative qualification.

## Profile persistence

The production `user_profiles` schema originally had split score columns and a structured Bagrut version reference, with no field for the new institution-specific inputs. The approved repository change adds one nullable JSONB column through `0028_profile_admissions_inputs.sql`:

```sql
ALTER TABLE public.user_profiles ADD COLUMN admissions_inputs jsonb;
```

The typed object contains only optional official TAU/BGU averages, two boolean confirmations, and an optional TAU mathematics placement score. The API validates averages at 50–130, placement scores at 0–100, and booleans without converting missing values into false. Existing rows remain null. Read/write serialization, per-field draft merging, admissions-only draft recognition, and alert refresh now include these fields and preserve false/zero. Four tests exercise the real profile API and PostgreSQL storage with a controlled authentication identity, including migration of existing rows, save/read, merging, replacement, clearing, and separation between two users. This does not verify live Supabase authentication or RLS. Production application is a separate deployment step; apply the migration before deploying application code that selects the new column.

## Local verification

The production build and TypeScript check pass. ESLint passes with zero errors and 19 existing warnings. The final controlled source replay reproduced all four targets exactly, including the linked TAU general English requirement in its fingerprint.

The final full test run with the disposable PostgreSQL profile database passed 816 tests and skipped two unrelated database integration tests. The pre-PR guard passed migration checks, catalogue seed dry-run, operational grants, Monday evidence consistency and 392 targeted tests. A separate focused hydration run passed 21 tests. The native browser reload check retained TAU `112.5`, BGU `110.25`, both `false` confirmations, and placement score `0`; the updated TAU English confirmation was visible. The local calculator with no matching published source authority displayed the Hebrew unavailable-verification message and withheld acceptance. This browser check used the explicit local static catalogue mode; it does not establish production database behavior.

Code review: harness-native fallback. The CE review attempt could not complete its required separate merge/report contexts under the active instruction to run subagent work in the main thread. The native standards and specification reviews ran serially, with no independent or cross-model coverage. The identified TAU English qualification issue was fixed and covered by five new cases. The three simplification passes retained the validation boundaries and made the PostgreSQL tests independent of execution order (reuse: 0, quality: 1, efficiency: 0).

Initial profile hydration now finishes before the academic form mounts. A failed initial profile load offers retry; ordinary background saves keep the form mounted so unfinished edits remain visible. Deployed signed-in browser checks remain necessary after migration and deployment.

## Manual verification

1. Open `/app/profile`. Fill both official averages, select `לא` for a confirmation, and enter a mathematics placement score of `0`. Save, return to the profile and reload. All values must remain visible.
2. Sign in and repeat the save/reload check once the persistence change and migration are deployed. No earlier local-only check establishes signed-in durability.
3. Open `/app/calculator`, enter total score and a general Bagrut average, and select TAU or BGU Computer Science. Missing institution-specific inputs must request profile completion; an absent or mismatched weekly authority must show that official verification is unavailable. Neither may produce acceptance from the generic estimate.
4. With fresh reviewed authority and complete inputs, check a qualifying example and a below-cutoff example from the table. A failed minimum gate must produce a below result for the standard route and link to official alternative routes.

Production source authority remains separate from this local proof artifact. Existing persisted fingerprints will not qualify against the new contracts until the reviewed weekly publication process records matching proof. Production SQL and deployed browser verification are still required after deployment.

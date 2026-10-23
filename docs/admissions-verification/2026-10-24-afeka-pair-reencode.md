# Afeka EE and software engineering: admission routes and source stamps

Checked: 2026-10-24. Programs: `afeka_ee` and `afeka_softwareeng`, institution `afeka`.
Scope: Jorje-approved gate A from the supplied encoded brief and source packet.

## Official evidence

| Program | Official source | Captured HTML SHA256 |
| --- | --- | --- |
| `afeka_ee` | https://www.afeka.ac.il/candidate/candidate-information-bsc/undergraduates/ | `6fa683075948f28ec51eac8dcf68b0c3c083f822f30a25b3d07ae9b6ba123a15` |
| `afeka_softwareeng` | https://www.afeka.ac.il/candidate/candidate-information-bsc/admission-and-registration-in-science/ | `8bea4f6cda19dc7178fc78b642767766121d05f3544bf5008b35a7bd398201dc` |

Both hashes were independently checked against `/workspace/seo-geo/raw/hold-reencode-2026-10-24/afeka-{ee,softwareeng}-official.html`.
The captured pages identify the programs and publish the following ordinary routes for תשפ״ז.
The source footer reserves the college's right to change conditions and still refers to תשפ״ו; no new admission-year guarantee is inferred from it.

## Published conditions

All grades below are inclusive minima. `4×85` means four Bagrut units with grade 85 or higher; it is not a Bagrut average.

| Program / route | Math | English Bagrut | Science | Psychometric |
| --- | --- | --- | --- | --- |
| EE / Bagrut | 4×85 or 5×75 | 4×70 or 5×60 | Physics 5×60 or physics prep 70 | Not required by this route |
| EE / psychometric | 4×80 or 5×70 or math prep 70 | No separate Bagrut English grade stated in this route | Physics 5×60 or physics prep 70 | 600 overall (multidisciplinary or quantitative emphasis), and quantitative 115 |
| Software / Bagrut with science | 4×85 or 5×75 | 4×70 or 5×60 | Physics or CS 5×60, named other science 5×70, or physics/programming prep 70 | Not required by this route |
| Software / Bagrut without science | 4×90 or 5×80 | 4×70 or 5×60 | No science gate | Not required by this route |
| Software / psychometric | 4×80 or 5×70 or math prep 70 | No separate Bagrut English grade stated in this route | No science gate | 620 overall (multidisciplinary or quantitative emphasis), and quantitative 115 |
| Software / psychometric with science | 4×80 or 5×70 or math prep 70 | No separate Bagrut English grade stated in this route | Physics 5×60, named other science 5×70, or physics/programming prep 70 | 600 overall (multidisciplinary or quantitative emphasis), and quantitative 115 |

Every included route also requires full Bagrut entitlement and beginners/basic English classification before studies, through Amirnet or the psychometric English component.
Software's programming prep alternative is specifically יסודות התכנות והחשיבה הלוגית.
Other science means the source's closed list: chemistry, biology, electronics, electronics and computers, engineering sciences, biotechnology, biotechnology systems, computational science, and data science.
The software psychometric-with-science section does not list CS at 5×60; that alternative is shown only for its Bagrut-with-science route.

## Removed shells and catalogue behavior

The Bagrut-average 80 and psychometric 550 shell, including the bare five-unit prerequisites, is removed from both source program objects.
The 80 in the official page's prior-BA route is a prior-degree average, not a Bagrut requirement.
No single psychometric or Bagrut-average floor is substituted for the route alternatives.
Prior-BA, diploma and standalone prep admission paths are excluded; subject prep alternatives explicitly required by gate A remain.
The optional composite-score route is omitted because its calculation is not established here.

The existing content repair attaches institution details with notes byte-identical to the source `admissionRequirements` and the repair rows.
Both rows use `checkedAt: 2026-10-24`, `coverage: published_conditions`, and the source/hash above.
The existing stamp resolver returns `24.10.2026` and the official link with `utm_source=myway&utm_medium=referral`; whitespace drift suppresses the stamp.

For these two IDs, legacy text inference is skipped so alternative routes do not become cumulative facts.
After a successful database read, the targeted serializer overlay replaces stale requirements/notes and clears obsolete thresholds, direct-psychometric/minimum maps, standalone quantitative/English gates, inferred facts and alternative paths.
Institution links, program identity and other metadata are retained.
This is a read-time correction, following the existing Haifa pattern; database errors retain their normal failure behavior.
No live database rows were read or changed in this task.

## Evaluator and tiles

Formula confidence: published conditions are official; there is no verified automatic evaluator for their complete route alternatives.
The existing Batch C server/client pair maps now return `unsupported` / `unknown` for both programs.
No score, admission threshold or score assessment is returned, and the student is directed to the official conditions.
No institutional composite score is requested and no formula is reverse-engineered.

Regression profiles cover empty scores, weak 70/400, obsolete 80/550, strong 120/800, psychometric 599/600/601 and 619/620/621, quantitative 114/115/116 with subject inputs, and missing English/science inputs.
All remain unknown: these tests protect against false eligibility, not proof of admission at a published boundary.
Copy tests independently check the inclusive subject/score gates and the distinction between the two software science routes.
Tiles retain the complete requirement list through the existing text fallback; no cumulative numeric tile model is invented.

## Local verification and remaining gate

- Targeted Vitest: repair/stamp, serializers, evaluator, Batch C, tiles, degrees index, requirements-checked, program-page rendering and unchanged SEO/FAQ omission tests passed (9 files, 498 tests).
- Initial repair/stamp regressions failed on the old arrays; evaluator regressions failed because the old behavior could return `eligible_to_apply`. Both pass after the correction.
- Typecheck passed.
- Lint passed with the existing unused `AdmissionsRequiredInput` import warning in `bagrutPolicies.ts`.
- Source capture hashes match the packet.
- `npm run guard:pre-pr` passed: migration consistency, operational grants, catalogue seed dry-run, 212 committed Monday evidence records, and 90 files / 2,018 targeted tests. The optional local evidence-regeneration comparison was skipped because this worktree has no raw Monday export.

The required CE simplification pass preserves the proof tests and the existing narrow repair/unsupported mechanisms.
Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.

Direct browser, desktop/mobile screenshots, Vercel preview/runtime and deployed Supabase verification were not performed: this run is explicitly restricted to static/unit checks with no Next.js server or production writes.
Rendered-page tests exercise the existing presentation and source links; they do not establish browser layout or deployed behavior.
Jorje must independently verify source interpretation and the preview before declaring readiness.

No FAQPage, FAQ allowlist or FAQ tests were changed.
No changes were made to `afeka_cs`, `afeka_biomedical` or `hit_visual_comm` content.
No production SQL, migrations, seed writes, freshness/publication runs, environment changes, deployment commands or merge were executed.
The pre-PR guard's seed operation is a local dry-run.

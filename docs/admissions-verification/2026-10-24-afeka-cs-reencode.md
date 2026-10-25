# Afeka CS re-encode and source stamp

Checked: 2026-10-24. Included as (c) CS in the EE/software/CS evaluator PR.

The sole source is the dated תשפ״ז [science admissions page](https://www.afeka.ac.il/candidate/candidate-information-bsc/admission-and-registration-in-science/). It includes CS and software engineering in one shared route set. Jorje's 2026-10-24 ruling (a) makes that admissions page canonical. The conflicting undated CS article is recorded only as a ruled discrepancy, not a source.

The source hash is #266's `8bea4f6cda19dc7178fc78b642767766121d05f3544bf5008b35a7bd398201dc`, independently verified against `afeka-softwareeng-official.html` in the supplied source packet. The fresh CS packet's HTML differs only in six form-token lines; its route text is unchanged, so the brief authorizes reuse of the existing hash. `checkedAt` is `2026-10-24`, coverage `published_conditions`.

CS source requirements and repair notes use exactly the six software-engineering strings on main `5c8d50c`. The old average/psychometric shell, bare math units and `thresholds: { afeka: 0 }` are removed. Prior-BA, diploma, standalone prep and composite admission routes are excluded. Subject-prep alternatives remain in the canonical notes and are caveated as unevaluated.

The existing resolver renders `עודכן לאחרונה: 24.10.2026 · מקור: אתר מכללת אפקה`. Both source and institution links resolve to the science admissions URL with `utm_source=myway&utm_medium=referral`. Read-time repair clears stale inferred gates after a successful catalogue read; it preserves the existing database failure behavior. No database operation is needed or performed.

CS goes directly into the shared Afeka evaluator. The 620/115 route has no science gate. The 600/115 route lists physics, not CS; the latter is a Bagrut-with-science alternative only. Route thresholds, exact HTML lines, behavior matrix and verification limitations are documented in `2026-10-24-afeka-evaluator.md`.

Existing catalogue repair, source/stamp, enrichment, serializer, rendered-page and requirement-tile tables are extended with CS. They check all six notes and source links, the stamp date and absence of the old shell. Evaluator and real POST-handler matrices cover the same strong, weak, missing-input, boundary and record-precedence cases as software engineering.

No FAQ allowlist, `src/lib/seo/jsonLd.ts`, `src/lib/seo/seo.test.ts`, field enrichment, indexing files, EE/software notes or their stamps were changed. The FAQ removal is separate PR #267; its current rendering is outside this change. Preview/browser verification remains with Jorje; no local Next server, production DB/SQL, environment or deployment changes were used.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.

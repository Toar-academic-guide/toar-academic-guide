# Issue 506 — dentistry

Sources re-read 2026-11-27; all admission figures and dates below are explicitly **תשפ״ז**, not a current תשפ״ח promise. Re-read on deployment day. Source URLs and check timestamps are internal only; the hub has neither source links nor a checked-date label.

- HUJI programme611: https://info.huji.ac.il/bachelor/Dental-Medicine — D.M.D.,640 psychometric/120 English,105 Hebrew where applicable, citizenship/residency;23.000 stage-A threshold. Spatial12 June2026, top~85% continue to interviews14–16 July2026. Stage C80% interviews/20% questionnaire; final75% stage C/25% stage A. Next intake dates unpublished. Programme banner itself says updating for תשפ״ח while its dentistry body still names תשפ״ז; never advance dates by assumption.
- TAU admissions: https://go.tau.ac.il/he/med/ba/dental?v=important-info — D.M.D.,640 psychometric/120 English or recognised alternatives, educational qualification,4-unit passing maths or approved alternative, Hebrew105 where applicable with exemption by year2, citizenship/residency; final70/15/15 and70 highest scores admitted.
- TAU stages: https://go.tau.ac.il/he/med/ba/dental?s=15406&v=specific-info — spatial12 June2026; knowledge19 June2026. Passing knowledge required;150 highest knowledge scores who are in top80% spatial invited onward. The knowledge-score validity paragraph has older cycle wording; it is not reproduced as a new-cycle guarantee.

## Catalogue and publication boundary

Two authored records: `huji_dentistry`→`huji`, `tau_dentistry`→`tau`. Both are academic D.M.D. in a separate dentistry category mapped to the directory's existing health field. Existing programme-derived hub machinery creates `/programs/dentistry`; no general medicine ownership or MD rows changed. Existing public catalogue overlay serves authored records after a successful active catalogue read, never as a fallback for a failed database read.

Requirements are historical display notes and source candidates, with **no numerical evaluator facts, cutoffs or formula**. Both evaluator results are `unsupported/unknown`, even for high scores; no official calculator request or internal calculator CTA. Broad Monday institution evidence is excluded for these two IDs in both capability and explanation paths. Neutral profile defaults follow existing authored route conventions; they are not a researched vocational-fit model.

No production database write or seed was run. Existing seed generation includes the two records; active DB publication is separate and must be reviewed before declaring the two rows deployed. A source recheck, scoped publication/recovery packet, hosted DB identity verification, and current-head visual/QA approval remain release gates. Static page200 is not proof of database publication.

## Verification

Focused catalogue, SEO and evaluator checks:555 tests across5 files. New assertions cover two exact records, hub/sitemap/canonical, MD separation, FAQ/schema parity, historical/unpublished dates, and unsupported/unknown evaluator outcomes. Existing frozen pre-feature matrix remains fixed; dentistry has separate positive assertions. Existing total fixture counts add two pairs and three public URLs.

Browser1280/390: production-before GET404 for new hub; local-after200; two table rows responsive as cards, right alignment and nonbreaking LTR numbers, source-free copy, four FAQ answers matching JSON-LD, all hub links>=44px, no overflow or page errors. Actual medicine→dentistry→university-record navigation passed; no forms, leads, evaluation POSTs or production mutations.

Practical review: open `/programs/dentistry` at1280 and390, compare HUJI/TAU stages and past-versus-unpublished dates; follow each university link. Follow the medicine link and verify it links back while listing MD programmes only. Current after screenshots belong first in the PR description. Required CI and correct-project Preview Playwright plus protected hosted QA are still required after publication.

Sitemap dentistry records, hub and modified medicine page use authored27November2026. Preserve these values when integrating PR509's date registry.

# Admissions review run 2026-W39

Checked at: 2026-09-27T09:07:55.606Z
Status: reviewable

## Included changes

- **Ben-Gurion University / bgu_cs** — 645 → 720
  - Candidate id: bgu-bgu_cs-live:admission_cutoff
  - Source: https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1
  - Evidence: Official bgu_cs admission cutoff: 720.
- **Ben-Gurion University / cs** — 645 → 720
  - Candidate id: bgu-cs-live:admission_cutoff
  - Source: https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1
  - Evidence: Official cs admission cutoff: 720.
- **Tel Aviv University / cs** — 700 → 705
  - Candidate id: tau-cs-live:admission_cutoff
  - Source: https://go.tau.ac.il/graphql
  - Evidence: Official tau-cs-live admission cutoff: 705.
- **Tel Aviv University / tau_cs** — 700 → 705
  - Candidate id: tau-cs-legacy-live:admission_cutoff
  - Source: https://go.tau.ac.il/graphql
  - Evidence: Official tau-cs-legacy-live admission cutoff: 705.

## Excluded investigation items

None.


## Scope and activation

This is the first canonical publication for the four Computer Science catalogue pairs in cycle 2027. The before-values were read from production `admission_thresholds`: TAU `cs` and `tau_cs` are 700; BGU `cs` and `bgu_cs` are 645. No canonical 2027 release exists yet for these four targets, so this manifest uses `canonical_bootstrap` rather than the weekly changed-rule comparison.

The TAU source registry now uses the catalogue IDs `cs` and `tau_cs`; its official node 8220, programme IDs 036811010000/036811040455, score field, requirements, and calculator inputs are unchanged.

Merging the reviewed manifest runs the existing protected production publication workflow. It updates four cutoff rows and records the reviewed source evidence. It does not approve pending source-freshness review items. Exact activation remains pending until a fresh collection from the merged registry and review of those four matching source records are complete. Do not approve unrelated source records or treat the cutoff publication alone as final activation.

The weekly schedule started independently during this preparation (GitHub Actions run 36308121843). It is collecting from the pre-fix main registry; its TAU catalogue identifiers are therefore superseded by the corrected registry in this change.

## Focused user verification after activation

1. Open `/app/profile` and enter the explicit official university Bagrut average, psychometric score/subscores, mathematics units and grade, and the programme's language/eligibility confirmations. Save and choose Computer Science.
2. TAU accepted fixture: official average 115, psychometric 730, English 110, mathematics 5 units/85, general eligibility confirmed. Expect score 730, above the 705 cutoff.
3. TAU below fixture: official average 100, psychometric 660, English 110, mathematics 5 units/85, general eligibility confirmed. Expect score 618, below the 704 rejection cutoff.
4. BGU eligible fixture: official average 120, psychometric 800, quantitative/verbal/English subscores 150 each, mathematics 5 units/85, language requirements confirmed. Expect score 879, above the 720 cutoff.
5. BGU below fixture: official average 100, psychometric 600, quantitative 125/verbal 110/English 100, mathematics 5 units/85, language requirements confirmed. Expect score 636, below the 720 cutoff.
6. Omit a required official average or eligibility confirmation. Expect a request for that input rather than an estimated admission verdict.

## Remaining Plan 002 coverage

The regenerated repository inventory remains 135 pairs: 126 have verified contracts and nine are withheld. This is contract coverage, not a claim that all 126 currently have fresh, approved production authority. The remaining pairs are `medicine__tau`, `tau_medicine__tau`, `nutrition__tau`, `physiotherapy__tau`, `tau_infosystems__tau`, `physiotherapy__huji`, `nutrition__bgu`, `architecture__technion`, and `colmgmt_cs__colman`.

The medicine and physiotherapy cases require selection/interview information; three legacy programme mappings are absent from current institutional datasets; the TAU management mapping needs a catalogue decision; Architecture needs its entrance-exam formula/input; College of Management needs its internal-test or weighted-score route. These are required data/product gaps, not optional MVP guardrails. Plan 002 remains incomplete.

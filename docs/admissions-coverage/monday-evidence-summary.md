# Monday Admissions Evidence Summary

Generated from the local Monday export. This file intentionally summarizes clean derived evidence only; raw update bodies stay in `scratch/monday-admissions-updates.json`.

## Export

- Board: מעקב מוסדות (18416803950)
- Exported at: 2026-06-28T19:35:13.807Z
- Items: 212
- Updates: 229
- Items at update limit: 0
- Catalogue-mapped records: 34

## Public Buckets

| Bucket                        | Count |
| ----------------------------- | ----: |
| decision_capable              |     5 |
| eligible_no_formal_grade_gate |    72 |
| eligible_with_manual_gate     |    64 |
| manual_gate                   |    43 |
| open_admission                |     1 |
| requirements_review           |    23 |
| tracked_missing_rule          |     4 |

## Rule Status

| Bucket                               | Count |
| ------------------------------------ | ----: |
| blocked_official_source              |     2 |
| decision_rule_available              |     5 |
| manual_or_eligibility_rule_available |    26 |
| needs_official_rule                  |     2 |
| needs_official_url                   |   169 |
| needs_structured_requirements        |     7 |
| open_or_no_grade_rule_available      |     1 |

## Official Verification Status

| Bucket                                               | Count |
| ---------------------------------------------------- | ----: |
| blocked_needs_alternate_official_source              |     2 |
| monday_evidence_decision_rule_available              |     5 |
| monday_evidence_manual_or_eligibility_rule_available |    25 |
| monday_evidence_open_or_no_grade_rule_available      |     1 |
| needs_official_url                                   |   169 |
| needs_structured_requirements                        |     7 |
| partial_official_rule_verified                       |     3 |

## Catalogue Visibility

| Bucket           | Count |
| ---------------- | ----: |
| catalogue_mapped |    34 |
| evidence_only    |   178 |

## Tracked Missing Rules

| Item                              | Missing data                            | First official URL candidate                         | Next action                                                                                                                                                                                                                                                     |
| --------------------------------- | --------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3. הטכניון - מכון טכנולוגי לישראל | unverified_data_science_program_match   | https://admissions.technion.ac.il/calculator/        | Keep using verified Technion thresholds for mapped programmes. Medicine is now modeled as a score invitation threshold plus MoR/manual screening; the remaining follow-up is to verify the exact data-science programme mapping.                                |
| 4. אוניברסיטת בן-גוריון בנגב      | remaining_program_thresholds            | https://bgu4u.bgu.ac.il/html/average_calc/index.php  | Keep using the verified BGU thresholds for the programmes already mapped from the official admission-conditions API. Continue programme-page/API verification for the remaining BGU catalogue programmes before removing this item from the missing-rule queue. |
| 5. אוניברסיטת בר-אילן             | automation_or_alternate_official_source | https://shoham.biu.ac.il/kabala/Psychometric.aspx    | Move Bar-Ilan to a browser-automation lane with CAPTCHA handling, or find an alternate official BIU page that publishes thresholds statically.                                                                                                                  |
| 8. אוניברסיטת אריאל בשומרון       | automation_or_alternate_official_source | https://pniot.ariel.ac.il/projects/tzmm/NewCalcMark/ | Move Ariel to a browser-automation lane (Hermes/VPS) or find an alternate official Ariel admissions page that publishes thresholds statically.                                                                                                                  |

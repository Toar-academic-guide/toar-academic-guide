# Technion Architecture: score and conditional eligibility

This Plan 002 slice covers the regular Israeli Bagrut route for academic year 2026–2027 (October 2026). It adds four saved profile inputs, the Architecture formula and current cutoff, and an explicitly conditional result. It does not establish final acceptance or cover academic-background exemptions and other admission routes.

## Official data and mapping

- [Official calculator](https://admissions.technion.ac.il/calculator/): Architecture is Gravity Forms **Form 73**, result field 5, using average field 1, general psychometric field 3 and Architecture examination field 8. The contract's identifier `73` is this calculator form identifier. Landscape Architecture is a different form and exam scale.
- [Formula and normalization](https://admissions.technion.ac.il/summary-score-calculation-table/): `S = 0.1D + 0.09P + 15`, then `SA = 0.7S + 0.3A`. The best official Architecture average is capped at 119 and does not double mathematics weight. The user supplies that official average; the generic average is never substituted. Form 73 rounds to one decimal place. The exam scale is 0–140.
- [Current cutoff table](https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/): updated 11 August 2026, October 2026 cutoff **85**, explicitly subject to available places.
- [Architecture requirements](https://admissions.technion.ac.il/architecture-info/): full Israeli Bagrut, mathematics 4 units/70 or 5 units/65, English at least 4 units, valid registration and score dates, and an official passing entrance examination. The lower third of examination results are marked non-passing; numeric score alone cannot establish a pass.
- [English classification](https://admissions.technion.ac.il/english-exam/): the published requirement says above 104, or an accepted official equivalent. A classification table includes 104; this slice conservatively uses the explicit above-104 requirement.
- [Hebrew classification](https://admissions.technion.ac.il/knowledge-of-hebrew/): 121 or a valid exemption.

The applicant separately confirms the official exam pass and the remaining regular-route requirements. Unknown confirmations remain missing information; explicit failures produce an unmet-requirements result. Valid input plus a score at or above 85 produces `eligible_to_apply`, with available places and the Technion's final decision stated prominently. It never produces `accepted`.

## Captured score evidence

Two synthetic cases were entered in the actual official browser calculator on 27 September 2026. Ordinary typing events triggered Gravity Forms calculation; merely filling an input had initially left a stale zero-input result. The computed field was read from the DOM, including the above case where its position was outside the screenshot.

| Official Architecture average | Psychometric | Entrance exam | Official displayed score | Conditional result with both confirmations true |
| --- | --- | --- | --- | --- |
| 115 | 730 | 110 | 97.5 | Meets cutoff; subject to available places |
| 101.9 | 650 | 80 | 82.6 | Below cutoff 85 |

The scores are browser observations. The verdicts are **derived** from the current published cutoff and confirmed requirements, not acceptance responses from the calculator. Exam-pass and eligibility confirmations in fixtures are synthetic, not claims about a real applicant. The user explicitly approved conditional eligibility for this slice.

The production proof runner replayed both controlled cases against the live calculator definition, cutoff, Architecture requirements, English and Hebrew pages. All five sources returned HTTP 200; both scores and conditional verdicts matched. The receipt is [the live proof JSON](2026-09-27-technion-architecture-live-proof.json). Runtime checks withhold calculation if the formula, rounding, cutoff, cycle or checked admission requirements change.

## Persistence and activation

The existing `user_profiles.admissions_inputs` JSONB column stores the four new fields; no migration is required. Browser save/reload verified decimal 101.9, exam 0 and false/true confirmations in the anonymous local draft. Profile serializer, merge, API and form tests cover these values. Authenticated database persistence is a post-merge deployment check; the optional disposable-Postgres integration suite is not represented as having run without its configured database.

Before this change, production stored cutoff 87, had no canonical Architecture release and had only partial official source authority. The reviewed manifest prepares **87 → 85** using the existing protected publication workflow. Publication cycle `2027` is the academic-year ending key; the source contract remains explicitly `2026–2027`, not October 2027. After merge, collect and approve the matching source record before declaring the calculation active. Repository contract coverage becomes **127/135, with eight pairs unfinished**; this is not a claim that every contract is active in production or that Plan 002 is complete.

## Focused UI verification after activation

1. Open `/app/profile`. In the Architecture section, enter the official Architecture average and entrance-exam score, then select the official pass result and confirm the remaining listed requirements. Save, reopen and verify that all four values remain.
2. Choose Architecture in the landing-page calculator. With psychometric 730, official Architecture average 115, exam 110 and both confirmations true, expect **97.5**, cutoff **85**, and a result explicitly subject to available places.
3. Change to psychometric 650, Architecture average 101.9 and exam 80, retaining true confirmations. Expect **82.6**, below **85**.
4. Set the exam-pass result to unknown. Expect a request for that input. Set it to non-passing: expect unmet requirements despite a high numeric score.
5. Confirm that the Computer Science profile inputs still save and their existing calculations work.

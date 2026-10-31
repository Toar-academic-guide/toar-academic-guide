# Medicine Academic Source Notes

Observed on 2026-10-31. These are public-source research results using synthetic grades, not application test results or production changes. The associated plan is `docs/plans/2026-10-31-1515-fix-medicine-academic-stage-plan.md`.

## TAU

The [official Bagrut calculator](https://ims.tau.ac.il/Md/calc/Bagrut.aspx) explicitly returns a maximum adjusted average of 117 for the current registration season. A certificate with an uncapped optimized average above 118 therefore has a supported official result. Amit approved following this cap while retaining the uncapped average internally on 2026-10-31.

Reference certificate: Jewish sector; every grade 100; English, mathematics, physics and chemistry each 5 units; civics, history, Hebrew expression, literature and Bible each 2 units. The official result excludes literature and Bible and returns 117. The remaining 26 units yield an uncapped arithmetic average of 3150/26 = 121.153846… before the official cap. The result table also displays the certificate's original 30-unit total; do not mistake that display total for the optimized denominator.

Reproduction: enter those subjects in the linked form and calculate. Its form posts to `https://ims.tau.ac.il/Md/calc/Bagrut_T.aspx`. Subject codes are civics `063`, English `010`, mathematics `014`, history `020`, Hebrew expression `005`, literature `004`, Bible `001`, physics `015`, chemistry `016`; each uses `tziun<code>` for grade and `yl<code>` for units.

The [public score calculator](https://go.tau.ac.il/he/calculator) queries `https://go.tau.ac.il/graphql` using the read-only `getLastScore` operation. The observed `scoresData` fields are `prog: calctziun`, `out: json`, `reali10: 0`, `psicho` and `bagrut` as strings. Select `hatama_refua`, not general `hatama`:

| Adjusted average | Psychometric | Medicine score | Interpretation |
| --- | --- | --- | --- |
| 111.15 | 750 | 720.97 | Below the observed preliminary cutoff |
| 117 | 750 | 750.23 | Above the observed preliminary cutoff |
| 118 | 750 | Null response body | Unsupported adjusted-average input; derive and cap from subjects first |

The programme page identifies [medicine](https://go.tau.ac.il/he/med/ba/med-doc?v=new-info) as semester A, תשפ״ז, with information dated 28.10.2026. Its page node is `8215`, programme `011167010000`. Read-only `getProgramByIdAndLang(nid: 8215, langcode: he)` returns the preliminary threshold **726.44** in `field_registration_comments`. The generic threshold fields are null; later combined thresholds in the same comments must not be used for the academic verdict.

Use the [published average rules and complete bonus list](https://go.tau.ac.il/he/ba/how-to-calculate) to reconcile subject mappings. Preserve the existing sector check for Arabic's enhanced bonus. The current unconditional English requirement needs the documented qualifying foreign-language alternative. Preserve Hebrew-expression 3-to-2-unit optimization, external-certificate adjustment and project handling. The medicine page requires passing mathematics at 4+ units, so merely checking that a maths grade exists is insufficient.

## BGU

The [current admissions bulletin](https://www.bgu.ac.il/welcome/contents/pre-registration/bulletin/) links the [2026–27 guide](https://www.bgu.ac.il/media/0p3ppz0n/%D7%99%D7%93%D7%99%D7%A2%D7%95%D7%9F-%D7%AA%D7%95%D7%90%D7%A8-%D7%A8%D7%90%D7%A9%D7%95%D7%9F.pdf), dated 01.01.2026. Pages 9–11 establish certificate eligibility, bonuses and optimization; page 23 identifies the general composite used for health programmes.

The guide specifies bonuses only above grade 60, a minimum optimized total of 20 units, whole-subject omission and a maximum average of 120. Its enhanced table distinguishes Arabic for Arabic speakers and Hebrew for Arabic speakers. The current helper lacks the latter distinction and applies the former without checking sector. Combined subjects require their official constituent breakdown; final transcript grades, rather than assumed component combinations, govern the average.

The [official calculator](https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=1) supplies the full selectable subject-code list. A reference input uses English `11`, mathematics `17`, history `27`, Hebrew expression `84`, civics `46`, physics `18` and chemistry `19`. Units are 5, 5, 2, 2, 2, 5, 5 respectively.

| Grade in every reference subject | Official average | Consequence |
| --- | --- | --- |
| 90 | 111.15 | Existing one-decimal helper output 111.2 does not match |
| 100 | 120 | Official maximum applies |

With the 90-grade certificate, changing only mathematics to 91 returns **111.35**, consistent with rounding 2895/26 = 111.346153… to two decimal places rather than truncating.

Reproduction: choose those subjects, units and grades in the official calculator. The form posts to `https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitBagrut`; rows use `subjects<N>Val`, `on_learning_units<N>` and `on_grade<N>`. The response sets `on_optimal_avg` to the result. Empty rows use subject `-1` and blank units/grade.

The existing general-score adapter can reuse the official `!rg.acc_SubmitSekem` contract. Reference requests use `rn_include_mitsraf: 0`, `rn_year: 2027`, `on_bagrut_average`, `on_psychometry` and blank `on_final_sekem`:

| Average | Psychometric | Official composite | Independent floor |
| --- | --- | --- | --- |
| 111.15 | 750 | 791 | Satisfied |
| 120 | 679 | 799 | Fails 680 despite sufficient composite |
| 120 | 680 | 800 | Satisfied; other conditions remain separate |

The [official medicine conditions feed](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=471&p_pat1=1&p_degree_level=8) supplies **735 AND 680** for year 2027, department 471, path 1, degree level 8. It marks registration closed. Prose about the following registration season does not date these numbers to 2027–28.

## HUJI

The legacy link on the [published average policy](https://info.huji.ac.il/reception-components/Bagrut) contains a browser redirect to the [current Bagrut calculator](https://bagrut-calculator.huji.ac.il/calculator/). Its stale fallback page must not be used as the simulator. Direct HTTP reads returned a support error, but the current calculator worked in the browser and displayed a modification date of 30.10.2026.

Use the [complete official bonus list](https://info.huji.ac.il/node/528) for subject aliases. The published policy separates certificate eligibility from subjects that must remain in the optimized average. It includes grade-60 bonuses, distinct exam/project bonuses for 5-unit mathematics, sector-specific language subjects, and the history/civics split when needed. These require explicit mappings; reusing TAU's bonus table is incorrect.

Browser reference certificate: Jewish sector, exam entries, every grade 90; Bible 2, literature 2, Hebrew 2, English 5, history 2, civics 2 and mathematics 5 units. The calculator returns **105**, seven subjects and 20 units. Changing only Bible to 3 units returns **104.3**, seven subjects and 21 units. The unrounded second average is 2190/21 = 104.285714…; preserve the official one-decimal average output.

Restoring Bible to 2 units and changing only mathematics to 91 returns **105.3** from the exact weighted average 105.25. This captures the rounding boundary independently of application code.

The [2026–27 medicine calculator](https://www.huji.ac.il/documents/medicine_calc.htm) explicitly takes the average divided by ten. With average **10.5** and psychometric **750**, its academic tab returns **24.366**. The [medicine requirements](https://info.huji.ac.il/bachelor/Medicine) identify **25.186** as the 2026–27 academic screening threshold; the final combined cutoff is a different stage.

The published calculator defines normalized Bagrut `B = 3.9630 × bag − 20.0621`, normalized psychometric `P = 0.032073 × psy + 0.3672`, and cognitive mixture `X = 0.3 × B + 0.7 × P`. Its displayed score is `floor((1.2235 × X − 4.4598 + 0.0005) × 1000) / 1000`. Reuse this published rule and its native scale; do not infer a replacement formula from the sample.

## What This Resolves and What Implementation Still Owes

The high-TAU-average behavior, all three average-policy sources, native score contracts, representative outputs and the 2026–27 numerical cycle are now grounded. TAU and BGU score conversion remains an official replay; these observations do not establish a new local closed-form replacement.

Implementation must still reconcile every selectable subject/sector/assessment kind against these sources, encode the documented aliases and applicant inputs, and run the planned focused comparisons. Source availability does not mean the mappings or application are already correct. In particular, never drop final projects or combined-subject entries silently, and never classify an ambiguous legacy subject name as equivalent without evidence. Request the actual transcript detail needed to resolve it under R4.

No university was contacted, no real applicant information was submitted, and no application code, tests, catalogue records or production settings were changed.

## Implementation research addendum

The statements above about no application changes describe the original research pass. A subsequent ce-work pass created a local implementation in the separate `codex/medicine-academic-stage` checkout. Its status and remaining obligations are recorded in `2026-10-31-medicine-academic-implementation.md`.

BGU's 2026–27 guide pages 18–21 establish the December 2025 medicine deadline, Hebrew level F at 116–131 (exemption at 132), and English advanced B at 120–133. The Hebrew table is also available in the [official classification document](https://www.bgu.ac.il/media/z52bi4we/yedion-hebrew-classification-2024-5.pdf); use the cycle inside the document rather than the older filename. Hebrew instruction/certificate language and a recognised institutional exemption are distinct from a candidate's cultural sector. The implementation now requests certificate language for non-Jewish sector records rather than assuming it.

The named-project rules are explicit in the published average policies: TAU's table applies to exams and projects, with an additional project alongside an exam in a 25-point subject receiving 20; HUJI distinguishes a 5-unit mathematics project (25) from an exam (35). A generic project label does not identify its subject. The calculator must request its actual subject and preserve the project assessment kind.

### Evidence still missing

The following legacy picker labels do not have an established exact equivalence in the retrieved TAU/HUJI lists: `מערכות תקשורת`, `יהדות ממ"ד`, `ידיעת העם והמדינה`, `מחשוב ובקרה בהתיישבות`, and `מערכות תעופה ואביזראות מטוסים`. Similar names are insufficient evidence. For example, HUJI names `מערכות תקשורת ומיתוג` and `יהדות עצמאי`; TAU's history rule explicitly distinguishes civics. An official subject-code crosswalk or an official calculator comparison is still needed. The medicine evaluator withholds exact TAU/HUJI results for these labels. This is an unfinished coverage requirement, not completion of U1.

The rest of the full picker/assessment reconciliation still needs a final evidence record, including same-subject exam/project optimisation and school-language exceptions for foreign-language bonuses. Ordinary reference fixtures cannot establish those cases. No university has been contacted.

The public TAU grade form was rechecked: it exposes generic “other with bonus” / “other without bonus” slots rather than an official code crosswalk for those legacy names. Using one of those slots would assume the very mapping that remains unproved, so it cannot resolve this evidence gap.

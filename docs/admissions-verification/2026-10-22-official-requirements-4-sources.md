# Official admission requirements for four programs

Checked 2026-10-22. The adjacent JSON is a byte-for-byte copy of the operator's canonical `official_values.json`; it is the contract for the separately prepared production text update. Program IDs and profile scores remain unchanged. Colman does not label these pages with an admission year; the operator associates them with 2026/27 using the business program's stated 1 November 2026 start.

## MTA computer science, תשפ״ז

[Requirements](https://www.mta.ac.il/conditions_for_applying), [program](https://www.mta.ac.il/program/bsc_computer_science), [official calculator](https://mtamn.mta.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1).

Operator-supplied official quotes, corroborated against the requirements page:

> לקבלה אוטומטית יש לעמוד באחת מהחלופות הבאות בכפוף לעמידה ברמת המתמטיקה הנדרשת ... ובתנאי הסף הכללים למכללה:
> 1. ציון משולב* 630. 2. ציון פסיכומטרי 670 בכפוף לזכאות לתעודת בגרות. 3. ממוצע בגרות 102 וציון מתמטיקה ב 5 יחידות לימוד 80 ומעלה או 4 יחידות לימוד בציון 95 ומעלה.
> דרישות רמת מתמטיקה בבגרות: 4 יחידות בציון 90 או 5 יחידות בציון 70. דרישות רמת אנגלית: ציון 100 בחלק האנגלית בבחינה הפסיכומטרית או במבחן אמיר/ אמירנ"ט.
> קבלה למסלול המתוגבר: 1. ממוצע בגרות 100 ו 4 יחידות מתמטיקה בציון 80 או 5 יחידות מתמטיקה בציון 60. 2. ממוצע בגרות 95 ומעלה וציון פסיכומטרי 550 בכפוף ל4 יחידות מתמטיקה בציון 80 או 5 יחידות מתמטיקה בציון 60.
> מועמדים.ות שאינם עומדים.ות בתנאי הקבלה המזכים בקבלה אוטומטית יפנו למרכז ייעוץ ורישום ...

The operator supplied the calculator's `CalcMTA` formula: `Math.round((psychometric + (bagrut - 30) * 10) / 2)`, valid only for `60 < bagrut < 130` and `200 < psychometric <= 800`. The calculator states that the college's own average and combined score determine the outcome. MyWay labels both the entered average and calculated combined score as estimates, and keeps college confirmation outstanding.

**Unverified:** the operator reports that MTA changed Bagrut averaging on 1 June 2026 without publishing the calculation details. This change date and the unpublished averaging method were not independently verified or reconstructed in this PR. The generic average is an estimate, never an authoritative MTA average.

## Colman

[General admissions](https://www.colman.ac.il/academics/ba/b-a-admission/), [law](https://www.colman.ac.il/academics/ba/law/), [business](https://www.colman.ac.il/academics/ba/business-administration/), [computer science](https://www.colman.ac.il/academics/ba/computer-science/), [official calculator](https://wwwi.colman.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1).

Operator-supplied official quotes, corroborated against official admissions/program pages:

Law:

> מסלול בגרות: ממוצע בגרות משוקלל מציון 100 ומעלה.
> מסלול בגרות ופסיכומטרי: ציון פסיכומטרי 540 ומעלה ועמידה בציון המשוקלל הנדרש במוסד.
> תואר ראשון במשפטים לאקדמאים: ... בציון ממוצע 80 ומעלה ומעבר ראיון קבלה.
> תואר ראשון דו חוגי במשפטים וכלכלה: עמידה בכלל התנאים הנדרשים לקבלה אוטומטית וכן מעבר ראיון קבלה.
> מועמדים שאינם עומדים בתנאי הקבלה יכולים להתקבל למכינת שחקים.

Business:

> מסלול בגרות: ממוצע בגרות משוקלל מציון 85 ומעלה.
> מסלול בגרות ופסיכומטרי: ציון פסיכומטרי 555 ומעלה, עם ציון כמותי 100 ומעלה, ועמידה בציון המשוקלל הנדרש במוסד.

Computer science:

> מסלול בגרות: ממוצע בגרות משוקלל מציון 85 ומעלה, ציון 70 ומעלה ב-5 יח''ל במתמטיקה או 80 ומעלה ב-4 יח''ל במתמטיקה ומעבר מבדק פנימי.
> מסלול בגרות ופסיכומטרי: עמידה בציון המשוקלל הנדרש במוסד ומעבר מבדק פנימי (פטור ממבדק פנימי יינתן למועמדים עם פסיכומטרי 600 ומעלה, עם ציון כמותי 120 ומעלה).

The official CS page also describes Shchakim and mathematics refresher alternatives. The operator checked the program, admissions, calculator and registration-instructions pages and found no published institutional weighted cutoff. This PR never invents that cutoff or makes the combined route eligible.

## Route behavior

| Program and route | Numeric check | Result and next action |
|---|---|---|
| MTA CS automatic combined | Rounded estimate ≥630; math 5u≥70 or 4u≥90; English ≥100 | Numeric match with `pending` college confirmation of eligibility, general conditions and average |
| MTA CS automatic psychometric | Psychometric ≥670; same math and English | Numeric match with separate Bagrut eligibility/college confirmation |
| MTA CS automatic Bagrut | Average ≥102; math 5u≥80 or 4u≥95; English ≥100 | Numeric estimate with college confirmation |
| MTA CS reinforced | Average ≥100, or average ≥95 and psychometric ≥550; math 5u≥60 or 4u≥80; English ≥100 | Clearly labelled reinforced-track numeric estimate with college confirmation |
| MTA missing / unmet | Missing math/English or necessary scores → `needs_input`; no alternative met → `below` | Complete profile or contact counselling/registration and ask about the psychometric-replacement preparatory program |
| Colman law Bagrut | Colman average ≥100 | Numeric match; certificate missing → `pending`, false → `below`, confirmed → `eligible_to_apply`; never final admission |
| Colman law combined | Psychometric ≥540 | `unknown`: college decides because weighted cutoff is unpublished |
| Colman business Bagrut | Colman average ≥85 | Same separate certificate confirmation as law |
| Colman business combined | Psychometric ≥555 and quantitative ≥100 | `unknown`: college decides; missing quantitative is never treated as met |
| Colman law/business below | Both routes below known minima | `below` for those routes; contact registration about Shchakim |
| Colman law special routes | Academics average 80/interview and law+economics interview | Requirements text only; no evaluation |
| Colman CS Bagrut | Colman average ≥85; math 5u≥70 or 4u≥80 | `manual_gate`, numeric match visible, `pending` internal test; certificate separate. Never `eligible_to_apply` |
| Colman CS combined | Unpublished institutional weighted cutoff; test exemption limited to this route | College decides; never eligible, including psychometric 600/quantitative 120 |

A missing Colman average always requires the college's average; the general profile average is never substituted. A numeric Bagrut match has priority; otherwise law/business use the combined route's unknown state when published minima are met.

## Rollout boundary

This PR contains code, seed definitions, documentation and tests only. No DB writes, seed execution, migrations, SQL, freshness/publication workflows or external configuration changes were performed. The guard's seed dry-run builds a local payload only. Production DB text is applied separately by Amit after deployment; SQL is prepared outside this repository. Deployed behavior and post-update production text require a subsequent check after that authorized rollout.

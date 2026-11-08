# Reichman catalogue content check — 2026-11-08

Issue #370 corrects six local Reichman catalogue records and the generated
name of tech_management_engineering. Production was read only. Publication
needs a separate, reviewed, row-scoped operation after this PR is merged.
Do not run the broad catalogue seed merely to publish these six rows.

## Claim → source / correction

All official pages below were checked on 2026-11-08. “No source found”
describes this bounded check, not proof that the institution never published
the number.

| Displayed claim | Official evidence | Correction |
| --- | --- | --- |
| Standalone psychology: 4 years | [Psychology BA](https://www.runi.ac.il/schools/psychology/undergraduate/ba) says the single-major programme is about 3 years and 121 credits. The [2026 undergraduate brochure](https://www.runi.ac.il/media/pijdru43/ba-brochure-2026_web.pdf) distinguishes 3 years for this BA from 4 years for double degrees. | 3 years for reichman_psychology. |
| Law: 3 years | The [2026 undergraduate brochure](https://www.runi.ac.il/media/pijdru43/ba-brochure-2026_web.pdf), law section pp. 34–35, says the double-degree and direct-master routes are 4 years; the international emphasis programme is also 4 years. The [law page](https://www.runi.ac.il/schools/law/undergraduate/) lists these paths. | 4 years for the current generic law ID. |
| CS, business, economics: 3 years | The [2026 undergraduate brochure](https://www.runi.ac.il/media/pijdru43/ba-brochure-2026_web.pdf) gives 3 years for CS, business BA, and economics; the current [business BA page](https://www.runi.ac.il/schools/business/undergraduate/ba) also says 3 years. | Keep 3 years. |
| Information systems: 3 years; Bagrut 100, Advanced A English, and interview/committee | No official programme matching the catalogue's exact “ניהול ומערכות מידע” identity was established. The [business undergraduate list](https://www.runi.ac.il/schools/business/undergraduate/) names Business and Data Analytics as a distinct programme. The existing [Batch A review](2026-10-23-batch-a-encodeable.md) deferred this identity and its admission route. | Remove the unverified duration and gates; retain only the direction to check the route with Reichman. Keep the ID pending an identity decision. |
| Six estimated yearly cohort sizes: 150/120/180/200/160/140 | No programme-specific official cohort source was found in the pages and brochure checked. The brochure's university-wide enrolment total does not support these programme estimates. | Remove all six estimates from student-facing cards. |
| CS, psychology, law, business, economics admission thresholds and subject gates | The existing [reviewed 2026–27 route record](2026-10-23-reichman-published-routes.md) and [Batch A review](2026-10-23-batch-a-encodeable.md) trace these to a captured official admissions PDF. Its original URL now returns 404; current school landing pages say admission conditions are dynamic. Neither fact establishes a replacement numeric rule. | Preserve the reviewed local routes and their estimated/pending evaluation status. Do not invent or silently remove scores. |
| Technology-college institution name has a visible backslash before the hyphen | The escaped character comes from Monday item 12341091743 and survives in the generated displayName. | Normalize the generated display name at its generator source to “המכללה למינהל - רשת מכללות הנדסאים”. Keep the item ID, catalogue ID, and official link. |

## Production inventory and publication handoff

A read-only Supabase query on 2026-11-08 found all six Reichman
public.admission_requirements rows still seeded with the same generic notes:
“חובה ממוצע בגרות 100...” and “מותנה ברמת אנגלית 'מתקדמים א'...”.
Their estimated_students_per_year values are the six numbers above.
Psychology has duration_years = 4, law has 3, and information systems has
3. All six have empty admission_requirements. The live
/programs/reichman_psychology page displayed those generic notes on the
check date; the local static page displayed the reviewed psychology route.

For later authorized publication, review the six rows against the merged
source values in src/data/degrees/academicPrograms.ts. Apply only these six
programme/institution pairs with an exact-before guard and a transaction:
correct psychology/law durations, clear all six cohort estimates, publish the
already reviewed programme-specific notes for CS/psychology/law/business/
economics, and remove the unsupported information-systems notes while
providing its “בדקו את תנאי המסלול באתר רייכמן” next action. Preserve other
programmes, formula coefficients, numeric evaluator rules, programme IDs,
institution links, and review statuses. If a before value changed, stop
and re-review the row.

Read-only verification query for that operation:

    select program_id, institution_id, duration_years,
           estimated_students_per_year, admission_requirements,
           specific_admission_notes
    from public.admission_requirements
    where institution_id = 'reichman'
      and program_id in (
        'reichman_cs', 'reichman_psychology', 'reichman_law',
        'reichman_business', 'reichman_economics', 'reichman_infosystems'
      )
    order by program_id;

After separately approved publication, check the six live programme pages
at 1280px and 390px, the calculator links for CS/law/psychology, and a
read-only database query. The local static browser check in this PR does
not establish production publication.

## Other findings for prioritization

The Monday export contains other escaped institution names, including
המכללה הטכנולוגית רופין and סאבטקסט. They were not changed under this issue's
named programme scope. The exact Reichman information systems identity
also remains unresolved; do not substitute Business and Data Analytics
without an explicit mapping review.

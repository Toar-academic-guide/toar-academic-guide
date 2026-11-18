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

The fresh read-only production snapshot at **2026-11-08 16:39:57 UTC** found
exactly these six `program_id:institution_id` keys and 18 linked source URLs:

| Key | Before duration | Before cohort | After duration | After cohort |
| --- | ---: | --- | ---: | --- |
| `reichman_cs:reichman` | 3 | כ-150 סטודנטים | 3 | empty |
| `reichman_psychology:reichman` | 4 | כ-120 סטודנטים | 3 | empty |
| `reichman_law:reichman` | 3 | כ-180 סטודנטים | 4 | empty |
| `reichman_business:reichman` | 3 | כ-200 סטודנטים | 3 | empty |
| `reichman_economics:reichman` | 3 | כ-160 סטודנטים | 3 | empty |
| `reichman_infosystems:reichman` | 3 | כ-140 סטודנטים | NULL | empty |

All six had `updated_at=2026-07-04 12:19:02.656611+00`,
`review_status=seeded`, empty `admission_requirements`, identical two-note
`specific_admission_notes`, and null quantitative, English, and programme
description fields. Each had exactly three `source_urls`: `program` and
`institution` pointed to `https://www.runi.ac.il`; `calculator` pointed to
`https://www.runi.ac.il/admissions/undergraduate/`. The one-shot
[publication SQL packet](2026-11-08-issue-370-publication.sql) encodes these
exact before values, all after text arrays, pair IDs and URLs. It locks and
compares all six rows, requires all 18 URL rows and exact kinds/links, aborts
on drift or unexpected update counts, and verifies the after state before
commit. No production execution occurred.

The five identifiable programmes get their official school pages as the
`kind=program` URL, with `utm_source=myway&utm_medium=referral`. CS,
psychology and law match the local curated links; business and economics
school links were added to the local source. Because the exact
`reichman_infosystems` identity is unresolved, its programme link points
only to Reichman's [general undergraduate admissions page](https://www.runi.ac.il/admissions/undergraduate/),
which can guide the student without inventing a school route. All six target
URLs returned HTTP 200 on 2026-11-08. The packet leaves all six existing
`kind=calculator` URLs and all six `kind=institution` URLs unchanged. The
static CS/psychology/law calculator links differ from the currently
published DB links; publication deliberately does not rewrite those DB links.

A separate read-only query found no
`public.programs.id='tech_management_engineering'` row. The public catalogue
loader appends code-defined public programmes absent from a successful DB
read, so this programme's escaped display name comes from the generated
source and is corrected by deploying the code. The six-row SQL packet does
not touch `public.programs` or the existing `tech_management` institution
row. Hosted verification after deploy must still confirm the visible name.

The generic `reichman_law` ID is the catalogue's Reichman “משפטים” umbrella,
not an invented standalone route. Reichman's [undergraduate admissions
listing](https://www.runi.ac.il/admissions/undergraduate/) lists the law
double-degree and direct-master routes; the [2026 brochure, law section
pp. 34–35](https://www.runi.ac.il/media/pijdru43/ba-brochure-2026_web.pdf)
says all law students take an additional degree and gives four years for
those routes and the international-emphasis LL.B. The special route for
holders of a prior degree is listed separately without a duration claim;
the generic card does not assert a duration for that special route.

In a **disposable local Postgres 16 container only**, a fixture matching the
six-row snapshot and 18 URLs proved three paths: a changed law cohort caused
the packet to abort with 5/6 before rows matched and all six content/URL
rows stayed unchanged; the unchanged fixture committed six content and six
programme-URL updates with all six calculator links preserved, including
`infosystems.duration_years IS NULL` and the one-line next action; and an
injected exception after the content UPDATE rolled back all six content
updates and left all 18 URL rows unchanged. A second application aborted
with 0/6 before rows matched. The proof fixture and injected-failure copy
are outside the repository under `evidence-370/`. This does not establish
production readiness or production publication.

For later authorized publication, reconfirm the six-row before snapshot
against the merged source values in `src/data/degrees/academicPrograms.ts`.
The packet applies only the six exact pairs in the table, and only after
the code deploy is READY and the reviewed source links still resolve.
If any before value changed, stop and re-review. Preserve other programmes,
formula coefficients, numeric evaluator rules, programme IDs, calculator
links, institution links, and review statuses.

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

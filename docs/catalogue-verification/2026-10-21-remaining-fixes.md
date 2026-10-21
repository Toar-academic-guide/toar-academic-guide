# Computer Science, Danon and sharing corrections

## Evidence and scope

The legacy importer in commit `dd1f901c65f052ab44a1ddee5400496a5a49349d`
assigned Computer Science when an institution had no matching study-field keyword.
Those synthetic rows survived later seed updates. An ID ending in `_cs` is not
proof of a Computer Science programme.

The accompanying JSON records the exact reviewed IDs and official sources:
12 retained records (11 genuine Computer Science programmes plus the already
corrected Danon record), 17 corrected programme/course identities, and 140
unsupported import placeholders withdrawn from recommendations. Their IDs,
foreign keys, saved references and public URLs remain. Withdrawal means the
import did not establish an actual programme; it is not a claim that the
institution cannot offer Computer Science. Verified programme identity does not
verify its existing admissions formula or threshold.

Four current generated computing-course records are also corrected in
`src/data/degrees/computingCourses.json` so fresh seeds do not recreate the
misclassification. Coding/cyber courses remain available as certificate courses.

## Danon official sources, checked 21 October 2026

- https://www.danon.org.il/cuisine/
- https://www.danon.org.il/cuisine/pro/
- https://www.danon.org.il/pastry/pro/
- https://www.danon.org.il/chef/

These pages describe courses suitable for beginners without prior experience.
They do not substantiate the imported mandatory interview, practical entrance
exam or academic-score threshold. We remove those unsupported claims, show the
beginner suitability statement and link to the relevant official course page.
The result remains `unknown` with `requirements_only`: it does not claim automatic
acceptance or that every possible registration condition has been ruled out.
Danon no longer requests Bagrut/psychometric values as prerequisites for this
non-numeric result. Other institutions' formulas and thresholds are unchanged.

## Sharing

Native sharing is attempted first. A non-cancellation error falls back to copying
the public programme URL. A selectable, right-aligned link remains usable even
if an embedded browser denies both APIs or leaves its native-share promise
pending. Cancellation does not silently copy. Shared URLs contain no academic
inputs or account-owned state.

## Focused verification

Migration 0039 was applied to disposable PostgreSQL containing current public
catalogue records and local seed fixtures: all 169 reviewed records matched their
expected action; 577 programme IDs, three test saved references and 193 existing
threshold rows were preserved. All five Danon requirement records were corrected.
Tests cover Danon with and without scores, unlisted selection/public URLs, and
native, clipboard, cancellation, denied and unresolved sharing paths.

The local browser uses the production build against this disposable database;
its extra seed fixtures are not a production record count. Shared-database and
preview verification must be recorded separately after application.

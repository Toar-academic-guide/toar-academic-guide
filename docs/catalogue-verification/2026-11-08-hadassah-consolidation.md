# Hadassah identity consolidation

## Official identity evidence

- [JMC's institutional history](https://www.jmc.ac.il/על-המרכז/אודות/על-המרכז/) says that Hadassah Academic College became the Jerusalem Multidisciplinary College. It dates the Council for Higher Education name approval to 10 December 2024 and the registrar's approval to 30 January 2025.
- [The CHE decisions for 10 December 2024](https://che.org.il/wp-content/uploads/2024/12/החלטות-מועצה-מישיבתה-ביום-10.12.2024.pdf), decision 950/14 on PDF page 15, records the same name change.
- The [current JMC computer science page](https://www.jmc.ac.il/תוכניות-לימוד/ביה-ס-הבינתחומי-לבריאות-חברה-ומדע/מדעי-המחשב/) and [admissions page](https://www.jmc.ac.il/תוכניות-לימוד/ביה-ס-הבינתחומי-לבריאות-חברה-ומדע/מדעי-המחשב/קבלה-ורישום/תנאי-קבלה/) establish that the existing computer science programme belongs to the current institution. JMC also publishes a [calculator](https://www.jmc.ac.il/ללמוד-אצלנו/הרשמה-ללימודים/מחשבון-מתאם/).

## Scope and current database inventory

The 8 November 2026 read-only inventory of the named toar-academic-guide Supabase project found two institution rows: canonical `hadassah` and old `mon_12220685569`. The old institution owns one listed programme, `mon_12220685569_cs`; one programme link; one requirement; one requirement version; and three source URLs. No other institution or programme foreign-key references were found under the old institution or this programme, except the records above. Saved-programme rows were counted only: zero at inventory time. The packet preserves the programme ID regardless of the saved count.

The repository search found the old ID in the reviewed content repair row and historical evidence. The repair row now points to `hadassah`. Historical imports, snapshots and the earlier Hadassah/HUJI packet are left as historical records. The current static seed did not generate `mon_12220685569_cs` even though it was in the live database; the correction restores that exact programme ID, links it to `hadassah`, and uses the reviewed JMC notes. Generic institution-level admissions facts are not copied to this degree.

Expected publication changes: remove one old institution row; keep one canonical institution row and the same programme ID; move its one link, one requirement, one version and three URLs to canonical IDs; update the programme name and ownership; leave admission numbers and formulas unchanged. The old source snapshot inside version 1 remains historical evidence.

## Publication and recovery

This PR does **not** publish database changes. Production still has the old rows until a separately authorized publication.

Before any publication, take and verify a restorable database backup through the approved database backup process. Re-run the read-only inventory, including foreign-key dependents and non-FK references, immediately before using the packet. The [consolidation packet](../../supabase/packets/2026-11-08-hadassah-consolidation.sql) begins a transaction, locks affected tables, raises on unexpected rows, copies the six affected row sets into a restricted backup schema, checks the result, and ends in `ROLLBACK`. A publisher must inspect its output and deliberately replace only the final `ROLLBACK` with `COMMIT` in a separate approved run. The backup schema then persists.

If publication has not committed, `ROLLBACK` is sufficient. For an authorized immediate post-commit recovery, use the [recovery packet](../../supabase/packets/2026-11-08-hadassah-consolidation-recovery.sql) after checking that no intervening writes changed these rows. It reads the committed backup tables, guards against new requirement dependents, restores the old identity and references, verifies them, and also ends in `ROLLBACK` by default. Inspect its output and deliberately choose `COMMIT` only for an approved recovery. Later changes to these rows need a fresh recovery plan; do not replay either packet blindly.

## Non-production verification

An isolated PostgreSQL 17 container was created with the repository's disposable Auth contract and runtime roles. All repository migrations applied. The seed produced 215 institutions, 404 programmes, 471 programme links and requirements, 1,277 source URLs, and no validation errors. A representative old Hadassah state was assembled using that real schema. The consolidation packet completed and rolled back, leaving the old institution and programme link intact and no backup schema. A local-only committed rehearsal then produced one canonical programme/link/requirement/version, three canonical URLs, zero old institution rows and six backup tables. The seed verifier matched. The recovery packet also completed both rollback and local-only committed rehearsals; its rollback kept the corrected state, and its committed rehearsal restored the old state. After repeating the local consolidation, the disposable database ended in the corrected state.

The live production database was queried read-only only. No production SQL packet, migration or seed was run.

## UI verification

On a local dev server backed by the disposable database, check both 1280px desktop and 390px mobile:

1. Open `/institutions`, search for `המרכז האקדמי הרב תחומי ירושלים`, and see one institution with one computer science programme. Search for `הדסה` and see no old institution result.
2. Open `/institutions/hadassah`; its heading is the current name, and its computer science link points to `/programs/mon_12220685569_cs`.
3. Open `/programs/mon_12220685569_cs`; the route remains reachable, shows the current institution name and reviewed Hebrew admission conditions, and links to the JMC admission page.

The pre-publication browser already normalized the old database identity in these pages, so the visible before/after pages are similar. The database row and reference checks establish the consolidation itself. The local browser had an unrelated missing PostHog token warning; no catalogue error appeared.

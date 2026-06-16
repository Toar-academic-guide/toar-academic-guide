---
title: Degree picker silent save failure due to database schema drift and hidden UI error banner
date: 2026-06-16
category: docs/solutions/database-issues
module: academic-profile-persistence
problem_type: database_issue
component: database
symptoms:
  - "Checking a degree in the picker briefly checks it, then it silently reverts to unchecked"
  - "Entering the subsequent screen displays 'Saved list is empty' ('רשימת הייעוד ריקה')"
root_cause: logic_error
resolution_type: migration
severity: high
tags:
  - degree-picker
  - database-migration
  - supabase
  - uuid-casting
  - cascade-drop
---

# Degree picker silent save failure due to database schema drift and hidden UI error banner

## Problem
When a user selected a degree in the Degree Picker and clicked "הוסף" (Add), the checkbox momentarily checked and then silently unchecked itself because the database save failed due to unapplied migrations on the remote database, and the error banner was hidden on that step.

## Symptoms
- Checking a degree in the picker UI briefly changes its state, but then it reverts back to its original state without any warning or visual feedback.
- The subsequent screen reports "רשימת הייעוד ריקה" (Saved list is empty).
- Remote database queries fail with:
  ```sql
  ERROR: insert into "saved_programs" ("user_id", "program_id", "created_at") values ($1, $2, default) on conflict do nothing params: 6891b049-ae80-4c29-bb44-3056d62ab6c0,architecture
  ```
- Database migrations fail on remote PostgreSQL (e.g. Supabase) with errors like:
  - `ERROR: constraint "saved_programs_user_id_users_id_fk" of relation "saved_programs" does not exist`
  - `ERROR: column "user_id" cannot be cast automatically to type uuid`
  - `ERROR: multiple primary keys for table "user_profiles" are not allowed`

## What Didn't Work
- Leaving the `syncError` banner out of the `'degree-picker'` step's early return in `src/app/page.tsx` caused database errors to fail silently without user-facing feedback.
- Running Drizzle's auto-generated `0002_loud_texas_twister.sql` migration failed on the remote PostgreSQL database because:
  - It dropped the `users` table with `CASCADE` before dropping the foreign key constraints, which automatically dropped those constraints and crashed subsequent explicit `DROP CONSTRAINT` statements.
  - It lacked the `USING user_id::uuid` cast modifier when altering the data type from `text` to `uuid`.
  - It added a primary key on `user_id` before dropping the existing primary key column `id`.

## Solution
1. **UI Fix:** Rendered the `syncError` banner block inside the early return block for `'degree-picker'` in [src/app/page.tsx](file:///Users/amitmalichi/desktop/toar-academic-guide/src/app/page.tsx#L328-L335):
   ```tsx
   if (step === 'degree-picker') {
     return (
       <>
         <BackButton />
         {syncError && (
           <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
             <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-md">
               {syncError}
             </div>
           </div>
         )}
         ...
       </>
     );
   }
   ```
2. **Migration Fix:** Modified [src/db/migrations/0002_loud_texas_twister.sql](file:///Users/amitmalichi/desktop/toar-academic-guide/src/db/migrations/0002_loud_texas_twister.sql) to:
   - Use `DROP CONSTRAINT IF EXISTS` to tolerate cascade side effects.
   - Add `USING user_id::uuid` to the column conversion statements.
   - Reorder the primary key operations (dropping `id` column before adding the primary key to `user_id`).
3. **Verification:** Executed the corrected migrations on the remote Supabase database via the linked project using `npx supabase db query --linked -f ...`.

## Why This Works
- Rendering the `syncError` banner as a high-visibility fixed alert inside the early return block ensures users receive immediate feedback when background database sync operations fail.
- The migration adjustments enable Postgres to safely cast existing string columns to actual UUID types, avoid name conflicts when dropping constraints that were already dropped by cascading table deletions, and cleanly transition primary keys without trying to set two primary keys simultaneously.

## Prevention
- Avoid using early returns that bypass global UI/state feedback components (like notifications and error alerts) unless the early return explicitly handles rendering them.
- When migrating database column types from string to UUID, always include the `USING column::uuid` clause.
- Drop old primary key constraints/columns *before* trying to designate a new column as the primary key.
- Review and test migrations against actual remote/target database engines (such as Supabase/PostgreSQL) rather than relying solely on local mock stubs.

## Related Issues
- **Pull Request #17 (Merged):** `fix(picker): display sync error on degree picker screen`
- **Pull Request #18 (Open):** `fix(migrations): adjust 0002 migration for cast safety and cascade order on remote db`

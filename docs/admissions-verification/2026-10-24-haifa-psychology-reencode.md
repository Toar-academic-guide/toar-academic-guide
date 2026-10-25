# Haifa psychology: regular admission floor and source stamp

Checked: 2026-10-24. Programme: `haifa_psychology` at `haifa`.

Official source: https://admissions.haifa.ac.il/social-sciences/program/3268/

Captured HTML: `/workspace/seo-geo/raw/faq-wave5/off_haifa_psychology.html`.
SHA256, independently checked against the supplied capture:
`ce3270195a0ee34608b949f6b2b698b69a4de9fcf80007721f99a915b2232476`.

The source packet and Jorje-gated brief authorize the regular route and one separate פסיפס note.

## Before and after

| Condition | Before | After |
| --- | --- | --- |
| Regular numeric floor | Psychometric minimum 680 | סכם 650 לפחות |
| Regular waiting band | Missing | 630–649 |
| Bagrut average minimum | 85 | Removed; not a published regular-path minimum |
| English | Missing | טרום בסיסי לפחות |
| Hebrew | Missing | יעלנט or Haifa placement 90; conditional until 120 in year one, or completion of the university preparatory Hebrew course |
| פסיפס | 680 misrepresented as the regular psychometric floor | Separate psychology/philosophy track: סכם 680 + admission interview |
| Requirements stamp | Absent | 24.10.2026, linked to the official admissions page |

The exact first note is `סכם 650 לפחות; ציונים 630–649 נמצאים בטווח ההמתנה.`
The separate-track note is `תוכנית פסיפס (מסלול נפרד עם החוג לפילוסופיה): סכם 680 לפחות + ראיון קבלה.`
The language note follows the existing stamped Haifa communication/sociology style.
No layout or component presentation changes are needed.

## Catalogue and stamp evidence

`academicPrograms.ts` and the `catalogueContentRepair.json` requirements row contain byte-identical notes.
The row uses `checkedAt: 2026-10-24`, the SHA256 above, and `coverage: published_conditions`.
`getRequirementsChecked('haifa_psychology', { id: 'haifa' }, notes)` returns `24.10.2026` and the official URL with the standard MyWay referral parameters.
Note drift suppresses the stamp.

Static catalogue normalization skips legacy text inference for this programme, preventing the separate-track interview from becoming a regular admission gate.
For this programme only, database catalogue serialization applies the approved repair after a successful read, removes the obsolete psychometric-680 and Bagrut-85 facts, and omits legacy direct-psychometric thresholds.
The regular threshold remains `{ haifa: 650 }`.
Database read errors retain their existing failure behavior; no static fallback was added.
No database rows were changed.

## Calculator honesty

The programme policy retains acceptance 650, waiting minimum 630, and `activationState: withheld`.
The pair-specific verification ledger now also withholds `haifa_psychology__haifa`, so runtime capability follows that restriction.
Ordinary Bagrut and psychometric inputs return `authority_unavailable` / `unknown`, without a calculated score or invented numeric eligibility.
The explanation is Hebrew and directs students to the official calculator.
No formula was reverse-engineered and no institutional סכם, מתואם, or מצרף input is requested.

Regression profiles cover weak inputs (70/400), strong inputs (120/800), Bagrut 85 with psychometric 679/680/681, and absent scores.
All remain unknown and make no official-calculator request.
Existing numeric replay fixtures are historical evidence, not authority to activate this programme.

Catalogue tile selection retains the complete requirements text rather than fabricating cumulative numeric tiles from the separate פסיפס score.
The interview is stated as a separate-track manual condition, not numeric eligibility for the regular BA.

## Verification

After rebasing onto `origin/main` at `67bc25f`:

- Targeted Vitest run: 9 files, 435 tests passed. Includes degrees, serializer, repair/stamp, evaluator, tiles, rendered programme page, verification ledger, calculator coverage, and data-health coverage.
- The rendered-page regression checks the main סכם/waiting band, separate פסיפס line, date/source link, and absence of the old main minima.
- Source-capture SHA256 matches the approved packet.
- `npm run typecheck`: passed.
- `npm run lint`: passed with one existing unused-import warning in `bagrutPolicies.ts`.
- `npm run guard:pre-pr`: passed; local migration consistency, seed dry-run, operational grants/evidence checks, and 90 targeted files / 1,980 tests passed.

Browser/Preview and deployed Supabase verification were not performed: the resumed brief explicitly limits this run to unit tests and static/catalogue checks, with no Next.js server.
Serializer coverage exercises stale persisted catalogue input locally; it is not a claim that live production rows changed.
Jorje must verify the deployed preview and source interpretation before declaring the PR ready.

Code review: skipped (ce-code-review unavailable) — the Encoded profile forbids ce-code-review.
The required CE simplification pass completed; proof tests were preserved.

## Scope

No FAQ / no Ofek multi-path.
No `FAQ_PROGRAM_IDS`, FAQPage implementation, or FAQ tests changed.
No miluim, prior-BA, OU, or makiha admission paths were added.
No production SQL, migrations, seeds, publication/freshness workflows, environment changes, deployment commands, or merge were executed.
The pre-PR guard's catalogue seed operation is a local dry-run only.

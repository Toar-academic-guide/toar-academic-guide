# Batch B SOURCE + PRODUCT verify (Jorje) — 2026-10-23 Asia/Jerusalem

PR: https://github.com/Toar-academic-guide/toar-academic-guide/pull/251  
Head verified: `3bb8a74` (after pull of `biu_socialwork`)  
Do **not** merge from this note alone if Playwright-against-preview is still red/pending.

## Verdict

**READY TO MERGE** (with caveats below) — after source fix that pulled `biu_socialwork`.

## Sample table (≥8 across clusters)

| Program | Rule (short) | Official URL | Match | Notes |
|---|---|---|---|---|
| `bezalel_industrial_design` | portfolio + exam + interview; scores optional | https://bezalel.ac.il/ (dept apply pages) | YES | Official apply copy: portfolio / practical / interview |
| `shenkar_fashion` | portfolio + entrance exam + interview | https://www.shenkar.ac.il/design/bachelors/fashion/admission/ | YES | Stage A drawing/fashion exam; Stage B interview + portfolio |
| `samspiegel_cinema` | film project / מיון + artistic committee interview | https://www.jsfs.co.il/registration | YES | Official: מיון then personal interview |
| `beit_zvi_acting` | audition stages + interview | https://www.beit-zvi.com/?CategoryID=160 | YES | 4 exam stages ending in personal interview |
| `ono_nursing` | bagrut≥85 & psych≥520 (+ אפיק 85 / excellence 100|103) + interview | https://www.ono.ac.il/curriculum/nursing/ | YES | Live page matches floors; weak→below; strong→pending + interview, never accepted |
| `telhai_nursing` | interview / מיון day; **no numeric floors encoded** | https://www.telhai.ac.il/תהליך_הקבלה | YES* | *Interview/מיון real in general process; nursing-specific floors still unpublished/smell-tested — correctly withheld |
| `reichman_infosystems` | interview/committee; scores optional | https://www.runi.ac.il/ | PARTIAL | No clear BA “ניהול ומערכות מידע” admissions row found; honest gate better than fake scores — candidate for Batch C phantom review |
| `tlvyaffo_socialwork` | interview; check if open | catalogue + MTA | YES (honest) | Delist product call kept documented; not silently delisted |
| `wingate_physical_ed` | interview + professional fitness exams | wingate institution | YES (cluster) | Audition/interview-primary cluster consistent |
| `reidman_naturopathy` | interview | reidman | YES (cluster) | CE interview-primary |

Pulled after verify: **`biu_socialwork`** — official primary path is שקלול ≥69 + psych ≥580; interview reserved/optional (https://social-work.biu.ac.il/Admission_BA). Batch B `eligible_to_apply` for weak scores would be false. → Batch A follow-up.

## Evaluate honesty

- Interview-only registry paths: `manual_gate` / `eligible_to_apply`, **no** `scoreAssessment`, no מתואם/סכם/מצרף, no `requiredInputs` for composites.
- `ono_nursing` floors met: `decision=pending`, `scoreAssessment=meets_threshold` **with** unconfirmed interview — numeric match ≠ admission (intentional; not fake final eligible).
- Local/API smoke: batchB unit + API tests green (48+52 cases covering weak/empty/strong for ono, bezalel, telhai, reichman).

## CI + preview

- Required: Lint/typecheck success; Unit tests success; Admissions evidence success; Disposable Postgres success; Vercel deploy **READY** on `3bb8a74` (`dpl_HkCDXLb6jAqh246t5BHnPXTLE3Pm`).
- Combined commit status: **success**.
- Preview homepage 200 via Vercel MCP auth share.
- Unauthenticated POST to `/api/admissions/evaluate` blocked by Vercel Authentication (executor cannot smoke live API without SSO); equivalent route tests local green.
- Branch alias: `toar-academic-guide-git-codex-b-004372-amitm1630-6681s-projects.vercel.app`
- Playwright against Vercel Preview: still **in_progress** at verify time — Jorje confirm green before merge.

## Product cut (47)

Right cut for Batch B after `biu_socialwork` pull. Keep social-work delist as recommendation only (`tlvyaffo_socialwork`, `ono_socialwork` if DB resurfaces). `reichman_infosystems` keep honest gate; optional Batch C phantom check.

## Deferred

- Batch C: `ariel_*`, `mon_*` phantoms, vocational, possibly `reichman_infosystems` if confirmed phantom
- Batch A follow-up: BIU סכם/שקלול composites including **`biu_socialwork`**; Tel Hai numeric floors when official pages extract cleanly

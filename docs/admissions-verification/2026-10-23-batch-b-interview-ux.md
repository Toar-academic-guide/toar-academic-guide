# Batch B — honest interview / portfolio / audition UX (2026-10-23)

Codex implementation evidence for Jorje. This document does **not** declare merge readiness. No production DB writes, migrations, seed execution against prod, freshness jobs, env changes, or merge.

## Goal

Programmes whose admission path requires interview, portfolio, audition, committee character assessment, or similar must not show forever-`unknown` or fake numeric eligible from bagrut/psych alone. Student copy is natural Hebrew. Never ask for מתואם / סכם / מצרף.

## Root cause fixed

`evaluateStructuredRequirementsResult` treated “manual gates only” as unverified (`requirements_only` / `unknown`). Pure design/arts programmes therefore looked uncovered live. Batch B fixes this with an **explicit programme registry** (`BATCH_B_PROGRAMS`) and early evaluator dispatch — intentionally scoped so medicine and other structured-only fixtures keep requirements_only/unknown until their own numeric facts are encoded.

## Encoded programmes

Registry: `src/server/admissions/batchBManualPathEvaluation.ts` (`BATCH_B_PROGRAMS` + `ono_nursing`).

| Group | IDs (summary) | Behaviour |
|---|---|---|
| Design / arts | bezalel_*, shenkar_*, hit_visual_comm, hit_industrial_design, minshar_* | `manual_gate`, scores optional, portfolio/exam/interview copy |
| Cinema | samspiegel_* | manual mixed / interview |
| Music / acting / dance / PE | jerusalem_academy_*, rubin_classical, nativ_acting, beit_zvi_*, seminar_*, wingate_* | audition / interview |
| CE / complementary | reidman_*, broshim_*, ono_ce_*, pardeshana_integrative, bishulim_* | interview / practical exam |
| Nursing / social | telhai_nursing, telhai_socialwork, tlvyaffo_socialwork, ono_socialwork | interview-primary; no invented floors |
| Ono nursing | `ono_nursing` | Official floors from Ono nursing page extract + interview gate |
| Reichman infosystems | `reichman_infosystems` | Interview/committee; no clear numeric MIS row (Batch A deferral) |

Count: registry keys + `ono_nursing` = 47 (biu_socialwork pulled after source verify).

## Ono nursing floors (official-grounded)

Source packet: `/workspace/pm-research/raw/official/ono_nursing.html` / `.txt` and in-repo seed aligned with https://www.ono.ac.il/curriculum/nursing/

| Route | Threshold | Gate |
|---|---|---|
| Standard | Bagrut ≥85 AND psychometric ≥520 | Interview unconfirmed → `manual_gate` / `pending` |
| Transition (אפיק מעבר) | Bagrut ≥85 | Interview unconfirmed |
| Excellence | Bagrut ≥100 or ≥103 | Interview unconfirmed |

Weak 420/70 → `below`. Never final `accepted`.

## Tel Hai nursing / socialwork — floors NOT encoded

Seed previously claimed bagrut 76 / psych 460 (nursing) and 72 / 450 (socialwork). Smell-test vs published estimates (~510 nursing) and bot-walled official programme pages this run → **interview-primary only**. Seed copy updated to point students at the official site for numeric floors.

## Social-work delist product call

`tlvyaffo_socialwork` remains listed with honest interview gate. `ono_socialwork` is **not** in the static catalogue (already absent); registry still handles the id if it reappears from DB. **Recommendation for Jorje / Amit:** consider delisting both if the programmes are not offered — this PR does **not** silently delist.

## Deferred

| Item | Why |
|---|---|
| All `ariel_*` | Batch C endpoint / source work |
| BIU סכם composites (`biu_cs`, …) | Batch A follow-up; never ask student for סכם |
| `biu_socialwork` | Official primary path is numeric שקלול 69 + psych ≥580; interview is reserved/optional. Pulled from Batch B to avoid false `eligible_to_apply` for weak scores — Batch A follow-up |
| `mon_*` mislabeled graphic_design / vocational phantoms | Batch C |
| danon_*, hackeru_*, elevation_*, itc_*, johnbryce_* | Vocational / already separate paths |
| Tel Hai numeric floors | Official pages unreachable; smell-test failed on seed |

## Tests

- Unit: `batchBManualPathEvaluation.test.ts`
- API: `batchB.test.ts`
- E2E smoke: `e2e/batch-b-admissions.spec.ts` (representative set; desktop screenshots when UI path runs)

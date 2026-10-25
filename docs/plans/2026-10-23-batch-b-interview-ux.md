# Plan: Batch B honest interview/portfolio/audition UX

## Outcome
One PR: programmes whose path needs interview, portfolio, audition, or committee character assessment stop showing forever-unknown or fake score-eligible. Students see clear Hebrew that a manual stage is required. Never ask for מתואם/סכם/מצרף.

## Root cause
`evaluateStructuredRequirementsResult` treats "manual gates only, no numeric facts" as unverified (`requirements_only` / `unknown`). Also `evaluateNonExactResult` demands bagrut+psych before handling `manual_gate`, so design schools ask for scores first.

## Approach
1. Shared `batchBManualPathEvaluation.ts` registry (~35–40 programme ids) with gate kind + optional official numeric floors.
2. Early evaluator dispatch (same pattern as Batch A published routes).
3. Fix structured-requirements early-return so pure manual facts reach the manual_gate branch.
4. Allow pure manual paths without requiring bagrut/psych first.
5. Ono nursing: encode official floors (85/520 etc.) AND interview gate (official extract).
6. Tel Hai nursing/socialwork: interview/manual gate only — seed 76/460 smell-test fail vs published estimates; official pages bot-walled this run; do not rubber-stamp.
7. `ono_socialwork` / `tlvyaffo_socialwork`: honest interview gate; PR documents delist recommendation (do not silently delist).
8. Skip Ariel (C), BIU סכם encode (A follow-up), mon_* phantoms (C).
9. Unit + API tests per encoded id; e2e smoke; verification docs under docs/admissions-verification + /workspace/seo/batch_b/.
10. ce-simplify-code after green tests. No ce-code-review. No prod DB / apply.sql unless placeholders must change.

## Done when
PR open against main; tests green locally; CI started; no composite score asks; interview paths honest.

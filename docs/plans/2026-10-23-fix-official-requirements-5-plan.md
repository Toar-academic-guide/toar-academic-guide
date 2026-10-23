---
title: Preserve official batch1 seed values and evaluate Colman economics routes
type: fix
date: 2026-10-23
---

## Goal and scope

Protect the three already-applied official batch1 fixes from future reseeding, and evaluate Colman economics using its published Bagrut and psychometric routes. Preserve IDs, Haifa's sekhem 580 and exact adapter, and economics' three existing requirement strings. No database writes, migration/seed execution, publication/freshness workflows, deployments, environment changes, or review pipelines. Work only on codex/official-requirements-5.

## Implementation units

1. Update academicPrograms institutionDetails and requirements for Ono law/nursing and Haifa nursing using the operator-supplied official values. Put Ono facts in institutionDetails with high confidence, required=true, null provenance, and existing group-encoded IDs. Remove obsolete Ono nursing hybrid facts and alternative path so last-wins seed assembly cannot restore them. Keep the source candidate. Add portable exact-value seed fixtures/tests, including source snapshots, no alternatives, and unchanged Haifa threshold.
2. Add economics thresholds (85 average, 540 psychometric, 110 quantitative, economy source path) to the existing Colman route evaluator. Explicitly distinguish whether a psychometric route depends on an unpublished college score. Reuse certificate confirmations and score assessment. Require Colman average before route selection, preserve law/business results, and add only economics to evaluator dispatch.
3. Add economics to existing input allowances, journey explanation, requirement/notes display, and public calculator-link lists. Add its institutionDetails with the official program/calculator URLs and exact batch2 note. Cover evaluator dispatch, low/missing scores, inclusive boundaries, certificate confirmations, seed serialization and public links/copy.

## Verification contract

Use portable fixtures copied from the supplied values; CI must not depend on workspace research paths. Verify 420/70 without Colman average is unknown/needs_input; average 86 qualifies; average 80 + 560/115 qualifies; 520 psychometric or 100 quantitative is below; missing quantitative needs input. Exercise law/business existing tests. Run focused tests, typecheck, lint on changed files, and npm run guard:pre-pr. The guard's seed dry-run is permitted and must not connect to or write the DB. Inspect browser capability and verify desktop/mobile if possible without DB writes; report any limitation. Do not claim batch2 is live.

## Delivery

Run ce-simplify-code inline after implementation; omit ce-code-review and document-review pipelines as explicitly directed. Commit only task-owned files with a conventional message, pass the guard without bypassing, push the named branch, unset upstream, and open one PR against main. Describe the existing live batch1 state, the economics change after operator batch2 application, and actual verification. Do not merge.

## Decisions and confidence

Existing institutionDetails and dedicated Colman policy provide the required pattern; no architecture decision or additional external research is needed. The seed appends hybrid facts after detail facts, so obsolete Ono nursing facts must be removed rather than shadowed. Review pipelines are skipped at the user's explicit request. No unresolved product decisions.

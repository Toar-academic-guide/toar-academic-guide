# RES-01 local verification evidence

All executable evaluation checks used injected/mocked catalogue, freshness, and source transport. No database connections, migrations, university-site requests, production/preview requests, external settings changes, or review pipelines were used. No browser or deployment verification is claimed.

## Tests first

The initial six new test files ran before production implementation:

```text
Test Files  6 failed (6)
Tests       16 failed | 3 passed (19)
```

Two suites could not collect because the new helpers did not exist. The initial tests were committed as `f4d7744` (`test(perf): specify evaluation latency and cache contracts`). Additional real-evaluator integration and mocked-profile coverage followed.

The final eight new files were copied alone into the explicitly requested temporary worktree at origin/main `129a489`. No implementation was copied. The final main run returned:

```text
Test Files  7 failed | 1 passed (8)
Tests       18 failed | 4 passed (22)
```

Three suites could not collect because their implementation helpers are absent on main (11 additional test cases). The temporary worktree was removed after recording the output.

The same eight new files have 33 passing cases on the implementation. With the existing evaluator and real HUJI serialization tests, the final targeted run returned:

```text
Test Files  10 passed (10)
Tests       487 passed (487)
```

A supplemental regression first showed source-selection failure returning 500 for a whole batch (`1 failed / 5 passed`). The route now preserves per-programme failure isolation during union construction as well as evaluation.

## Mocked timing

The standalone profile test exercises the real POST route and evaluator using the supplied 37-ID request, a warm mocked code catalogue, serialized 100 ms freshness reads, and source delays of HUJI 450 ms, BGU 700 ms, Technion 600 ms. No real source transport is available to the test. The local code catalogue resolves 28 IDs; nine absent identities remain failed in both runs. Technion transport is not needed for this input, so its configured delay is not exercised. This characterizes orchestration and transport reuse; the reviewer must measure the full deployed catalogue.

| Metric | origin/main | Implementation |
| --- | ---: | ---: |
| Standalone wall time | 4,764 ms | 1,542 ms |
| Freshness reads | 12 | 1 |
| Source fetches | 6 | 5 |
| HUJI fetches | 2 | 1 |
| BGU rule fetches | 2 | 2 |
| BGU score submissions | 2 | 2 |
| Peak HUJI host concurrency | 1 | 1 |
| Peak BGU rule host concurrency | 1 | 2 |
| Peak BGU score host concurrency | 1 | 2 |

The final targeted run under concurrent verification measured 1,631 ms with the same query/fetch counts. A separate 20-call stress test proves eight simultaneous calls to one host and independence of another host. A fake-clock test proves overlapping waits are measured once, not summed.

## Required checks

All checks were run with DATABASE_URL unset. The follow-up explicitly authorizes the unchanged guard’s offline snapshot-consistency and seed-payload checks, and existing isolated enquiry tests with mocked repositories. No real enquiry HTTP request was made.

| Check | Result |
| --- | --- |
| `env -u DATABASE_URL npm run typecheck` | Passed |
| `env -u DATABASE_URL npm run lint` | Passed without warnings |
| `env -u DATABASE_URL npm run format:check` | Passed |
| `env -u DATABASE_URL npm test` | 330 files passed, 14 skipped; 5,546 tests passed, 1 existing expected failure, 101 skipped |
| `env -u DATABASE_URL npm run build` | Passed; route table shows `○ /app/calculator` |
| `env -u DATABASE_URL npm run guard:pre-pr` | Passed; 143 targeted files, 3,613 tests |
| `git diff --check` | Passed |

The guard classifies vercel.json and the affected calculator/catalogue paths as high risk. Migration grants and offline migration consistency, seed dry-run, committed admissions evidence, and targeted regressions pass. The raw Monday export is absent, so the guard skips optional local regeneration/drift checking after verifying the committed evidence; no external board/workflow run occurs.

## Approved existing assertion migrations

Only the three contracts explicitly approved in the follow-up are migrated, in the separate commit `test: migrate three assertions superseded by RES-01 scope`:

- `src/app/api/admissions/evaluate/route.test.ts`: replace the four-evaluator ceiling with all 24 evaluators starting together and a mocked official-host transport peak of eight. Existing report count, shared input, catalogue count, failure, and one-slot rate-limit assertions stay unchanged.
- `src/server/catalogue/queries.test.ts`: the expiry test now proves a hit at 61 seconds, stale data after five minutes, one deferred refresh for simultaneous callers, and a subsequent hit with refreshed content. No other assertion in this file changes.
- `src/app/app/calculator/page.test.tsx`: the two programme cases now render the real client journey against URL state and assert the same selected programme / undefined values. All metadata tests remain unchanged.

Separate mechanical mock edits expose the source-selection helper and include the new freshness/context arguments in exact-call checks. No other existing expected value changes.

## Region and verification limits

The root vercel.json contains only the documented schema URL and regions [fra1]. Vercel’s official reference identifies top-level regions as the function-region override and says it does not change static-file distribution: https://vercel.com/docs/project-configuration/vercel-json#regions. No build command, framework, routing, runtime, duration, or project-setting key is added. No remote setting was changed. Production activation requires merge, for which Amit’s own go remains the gate.

The Next production build confirms static calculator prerendering; this is local build evidence, not a deployment/preview assertion. Real deployed catalogue, backend, and timing verification belong to the reviewer under the original no-network/no-DB scope. No interactive browser verification is claimed. The journey’s DOM/markup/copy/classes are unchanged.

# Admissions route capability operations

Route recommendations are separate from the baseline admissions calculator. A programme is exposed only when its route capability is enabled and every displayed winner has the required verification mode.

## Current capability set

- `tau_cs`: enabled for psychometric actions only. The service requires TAU's official Bagrut average, generates at most seven psychometric candidates, and verifies each displayed winner through TAU's official score replay and current Computer Science cutoff page. Academic actions remain withheld until their changed subjects can be converted into a reviewed post-action TAU average.
- `bgu_cs`: disabled. Exact official score replay, cutoff, gates, and fixtures exist, but academic actions still lack reviewed post-action BGU-average recomputation and psychometric actions cannot safely project the required quantitative, verbal, and English component scores. Do not enable it through a UI allowlist.

## Onboarding a programme

1. Add a capability record with required inputs, sources, and missing evidence explicitly listed.
2. Commit official fixtures and formula/replay contract tests. A source change or fixture drift must withdraw capability.
3. Verify the production source and calculator flow, then enable the record in the same reviewed release.
4. Keep grades and subject records out of logs, Slack, analytics, and emails; route analytics may only carry outcome categories.

## Failure behavior

If an official replay fails, times out, parses unexpectedly, or trips its circuit breaker, preserve the baseline calculator verdict and show no route ranking. A route is never inferred from an estimated score.

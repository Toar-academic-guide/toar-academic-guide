# Admissions route capability operations

Route recommendations are separate from the baseline admissions calculator. A programme is exposed only when its route capability is enabled and every displayed winner has the required verification mode.

## Current capability set

- `tau_cs`: enabled. The service recomputes the reviewed TAU Bagrut input where an academic action is supported and verifies bounded finalists through TAU's official score replay and current Computer Science cutoff page.
- `bgu_cs`: enabled. The service recomputes BGU's published 2026–27 optional Bagrut average, keeps total and component psychometric changes explicit, checks the mathematics and language gates, and verifies bounded finalists through the canonical BGU score replay.
- Every other programme is unsupported until it has its own exact evaluator and reviewed action model. Never infer institution-wide support from these two pilots.

The live state is visible in `/internal/data-health` under **Verified admission routes**. That view contains only programme IDs and capability categories; it must never contain grades, subject records, or complete academic profiles.

## Onboarding a programme

1. Add a capability record with required inputs, sources, and missing evidence explicitly listed.
2. Commit official fixtures and formula/replay contract tests. A source change or fixture drift must withdraw capability.
3. Verify the production source and calculator flow, then enable the record in the same reviewed release.
4. Keep grades and subject records out of logs, Slack, analytics, and emails; route analytics may only carry outcome categories.

## Applicant disclosure and data handling

Before a TAU route request, the result screen tells the applicant that the minimum calculator fields are sent to TAU without a name, email address, or user identifier. The replay cache uses a keyed, non-reversible identity and stores only the verification result. Raw profiles are not cache values.

The current reviewed operating assumptions are:

- calculator fields are used only to obtain the requested admissions replay;
- no secondary use by Toar is permitted;
- production does not currently attach a replay cache; any future cache must use the existing keyed identity, omit raw profiles, and define a bounded lifetime before activation;
- changing these assumptions requires a new applicant disclosure before activation.

BGU route replay follows the same minimum-input and no-identity boundary. Client analytics emit only `degree_id` and the normalized outcome (`complete`, `no_route`, `search_incomplete`, or `authority_unavailable`).

## Failure behavior

If an official replay fails, times out, parses unexpectedly, or trips its circuit breaker, preserve the baseline calculator verdict and show no route ranking. A route is never inferred from an estimated score.

## Withdrawal and rollback

1. Change the affected route-action capability to `incomplete`, or let the canonical evaluator become non-exact when its source/fixture proof drifts.
2. Confirm `/internal/data-health` reports that target as `disabled` and lists the missing capability.
3. Exercise the affected calculator profile. The baseline admission verdict must remain visible, while the route request returns the safe unavailable state and no verified card.
4. Re-enable only after current source proof, focused route tests, the pre-PR guard, and the deployed browser flow pass again.

For a full route rollback, mark both target action capabilities incomplete in one release. Do not disable or replace the baseline admissions calculator.

## Release proof

For each release that changes route capability:

1. Run `npm run guard:pre-pr`.
2. Confirm the authoritative `toar-academic-guide` Vercel deployment is Ready.
3. Confirm the Vercel-preview Playwright job passes.
4. Run controlled TAU and BGU below-threshold inputs and record only target, normalized outcome, evaluator fingerprint, and timestamp. Do not record applicant values.
5. Confirm an unsupported programme never shows a verified-route panel or badge.

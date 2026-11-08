# Calculator and enquiry tracking

`calculator_completed` measures a current, deliberate calculator outcome committed to the
results UI. It does not measure admission success or unique people. Previously missing
completion events cannot establish how many historical calculations happened.

## Calculator contract

Both calculators use the same lifecycle/classification helper in
`src/lib/calculatorAnalytics.ts`. No other completion emitter was found in the repository.

| Property             | Closed values / definition                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `calculator_surface` | `sekhem_calculator`, `journey_calculator`                                                                                |
| `source`             | `evaluation` (explicit calculate/review/missing-input submission), `simulation` (explicit journey simulation submission) |
| `result_status`      | `computed`, `empty` on `calculator_completed`; exclusions below use `calculator_outcome`                                 |
| `result_count`       | String bucket `0`, `1`, `2_5`, `6_20`, `21_50`, `51_plus`                                                                |

Count means **resolved programme/institution options available in the results**, including
below-threshold options. Count before presentation search, sorting, grouping and limits;
the programmes selectable within an institution card remain options. It is neither an
accepted-student count nor a card count. Failed, missing, gated and unavailable rows never
contribute to it. Sekhem excludes Ariel, which its existing results component does not
render. A missing requested result blocks full completion even when other options render.

Every option is classified, conservatively, in this order:

| Status        | Definition                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `error`       | Failed request/programme or missing report/result for a requested option                                                                      |
| `unavailable` | Stale/blocked/missing authority or capability; unsupported, tracked missing rule or degraded result                                           |
| `needs_input` | `needs_input` kind/capability or outstanding required inputs, even if a numerical score exists                                                |
| `gated`       | Manual/requirements-only/score-only gate, unconfirmed/unmet additional conditions, pending/unknown decision, or another non-computed outcome  |
| `computed`    | Exact, estimated or open-admission result with accepted/below/eligible-to-apply decision and none of the exclusions above                     |
| `partial`     | A mixture of option statuses, including mixed successful and failed batches                                                                   |
| `empty`       | Valid deliberate journey selection resolves to the existing successful empty-results UI with a ready catalogue and recognised selected fields |

Only an entirely `computed` set or a valid `empty` outcome emits `calculator_completed`.
All other settled intentional outcomes use **`calculator_outcome`**, with the same four
properties. These are diagnostic funnel outcomes, never completions. A uniform exclusion
uses its own status; any mixed set uses `partial`. No new error strings, evaluator status,
programme IDs, input values or signatures are transmitted by calculator tracking.

Sekhem's no-programmes error, initial empty form, missing journey selection, catalogue
loading/error and a filter/search producing zero visible rows are **not** empty completions.
An empty/missing API report for requested rows is an error, not a successful zero outcome.

## Intent and deduplication

- Sekhem starts a logical run after existing client validation and nonempty programme
  selection pass. Its generation counter rejects changed/stale input and restored data.
  Capture runs in an effect after all batches settle and the current reports commit.
- Journey arms a logical run only on existing explicit review, simulation and successful
  missing-input-save submissions. It binds the current internal signature and calculation
  generation locally. Those values are never sent. Its existing evaluation timing and view
  effect are unchanged. A deliberate resubmission of unchanged inputs can use the already
  current settled reports without forcing a new evaluation request.
- Partial/error retries stay on the same logical run. Each exclusion status is captured
  at most once per run, regardless of retry count or changed count bucket. One later full
  completion is possible when the explicit retry resolves the entire set.
- Completion is captured once per logical run, including StrictMode/rerenders. New deliberate
  submissions count again. There is no permanent session guard and no persisted analytics run.
- Restored sessions, passive catalogue refetch, saved/detail evaluations, and results/plan/back
  visits do not start runs. Leaving results/plan deactivates an unfinished journey boundary;
  returning alone cannot complete it. An explicit retry can reactivate that same run.
- `journey_results_viewed` remains a **view** metric, including its existing group counts,
  failures and per-visit semantics. Do not sum it with `calculator_completed`.

## Existing single enquiry dialog

There is no wizard or new UI. Existing `enquiry_form_viewed` remains once per mounted form
instance, including StrictMode; closing and reopening the same instance does not emit a
new view. A newly mounted instance does. Existing submitted/failure events are unchanged.

| Event                         | Trigger / new closed property                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `enquiry_form_step_completed` | Once at first nonempty contact-field edit: `step=contact_entered`; once after existing client validation passes: `step=validated` |
| `enquiry_submit_attempted`    | Each client-valid accepted transition to sending an actual request: `attempt_kind=initial` or `retry`                             |
| `enquiry_submitted`           | Existing OK, confirmed `data.received` server response; never optimistic click success                                            |
| `enquiry_submit_failed`       | Existing coarse network/server reason and HTTP status only                                                                        |
| `server_enquiry_created`      | Existing server receipt when at least one delivery/persistence path succeeds; not confirmed partner delivery                      |

New form events carry only existing `program_id`, `institution_id`, `surface` and their
closed `step`/`attempt_kind`. Contact entry implies interaction, not validity of either
field. Validation is recorded on accepted submit, not on each keystroke. Optional prep
checkbox interaction emits no progression event. Invalid submissions and duplicate clicks
while sending emit no attempt. Retry still reuses the existing request ID; that ID is not
added to client analytics. New tracking calls cannot interrupt the product if the SDK throws.

Client success and server receipt are two observations of a receipt, **not two leads**.
Choose one stream when counting receipts; attempts include legitimate retries. Neither
stream proves that a partner accepted a lead. No API, storage or delivery semantics change.

## Privacy and release gates

No scores, contact values, input signatures/hashes, arbitrary form text, URLs/query strings,
response bodies or consent text are added. Existing PostHog configuration, masked recording,
session attribution and `before_send` sanitisation remain unchanged. The SDK's existing
opt-out/configuration continues to govern capture; this change establishes no consent policy.

At implementation time, the repository did not establish the applicable deployed analytics
consent/opt-out policy, QA/team identifier/exclusion filters, or a delivery-suppressed synthetic
enquiry route. Samuel has been asked on issue #400. **These remain release gates.** Do not
invent a QA property or global consent change, and do not submit a normal production lead.

Local integration uses mocked admissions/enquiry responses and intercepts analytics traffic.
After separately approved deployment and resolution of the policy questions, verify both
calculator events/properties/counts/deduplication in production PostHog with the approved QA
exclusion, and verify enquiry receipt only through an approved delivery-suppressed route.
If none exists, production enquiry submission remains blocked. Green CI and Samuel QA on
the exact head remain required. The final handoff to Dima needs deployed SHA, verification
start time in Asia/Jerusalem, exclusions and observed event evidence; do not infer uniques.

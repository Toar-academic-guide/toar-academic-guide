# TAU physiotherapy numerical screening, 2026–2027

The live app previously returned generic eligibility for both psychometric 700 / TAU Bagrut 100 and 110. The official medical score returns 639.19 and 689.22 respectively. The programme page currently publishes acceptance 658.60 and rejection 640; GraphQL node 8213 maps to programme 016411010000 but returns null cutoffs. The evaluator therefore reads cutoffs from the current programme page and scores from the mapped official medical calculator.

Sources and response hashes are recorded in the adjacent JSON. Registration requirements include psychometric 630, English 120 or a recognised alternative, passing four-unit mathematics or an approved academic course, and confirmed remaining registration requirements. The qualifying online course adds five points once. An unknown bonus is not silently treated as zero.

This is Bagrut numerical screening. Interview conversion and final ranking remain uncalculated, so the full-admission ledger remains withheld. Preparatory and previous academic routes require institutional calculation and do not receive fabricated scores or a rejection based on the Bagrut route.

Verification performed on the branch:

- Existing pre-PR guard: 43 files / 776 tests passed, migration checks and seed dry-run passed.
- Typecheck, formatting and lint passed (existing lint warnings only).
- Browser: anonymous local profile saved and restored the new fields. With psychometric 700, English 130, other requirements confirmed, an approved math alternative and no bonus, TAU average 110 displayed 689.22 / 658.60 with interview pending; TAU average 100 displayed 639.19 / 640 and below threshold. The generic average remained 110 in the latter test to confirm it was not substituted for the TAU average.
- Browser: unknown bonus requested profile details; English 110 without an approved alternative explicitly failed the English requirement.

To reproduce: open the academic profile, enter the official TAU average, expand the TAU physiotherapy section and supply the route and confirmations. Save, return to the landing calculator, select TAU physiotherapy and calculate with psychometric 700. Repeat with TAU averages 110 and 100; expect the two scores above. No Supabase schema changes or production activation are part of this PR.

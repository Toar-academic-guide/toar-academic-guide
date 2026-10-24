# Afeka EE, software engineering and CS evaluator

Checked: 2026-10-24. Scope: (a) EE, (b) software engineering, (c) CS.
Formula confidence: official, inclusive published subject/score gates; no estimated formula or institutional composite. This evaluates the supported ordinary-input routes, not final admission.

## Evidence and source match

The source arrays and repair notes from #266 (`5c8d50c`) were compared with the captured official HTML before implementation. Hashes were independently checked:

- [EE admissions](https://www.afeka.ac.il/candidate/candidate-information-bsc/undergraduates/): `afeka-ee-official.html`, SHA256 `6fa683075948f28ec51eac8dcf68b0c3c083f822f30a25b3d07ae9b6ba123a15`.
- [Software engineering and CS admissions](https://www.afeka.ac.il/candidate/candidate-information-bsc/admission-and-registration-in-science/): `afeka-softwareeng-official.html`, SHA256 `8bea4f6cda19dc7178fc78b642767766121d05f3544bf5008b35a7bd398201dc`.

Captures are in the supplied `/workspace/seo-geo/raw/hold-reencode-2026-10-24/` packet. HTML line numbers below refer to those exact hashed files; text-extract lines are included for quick inspection. All code thresholds agree with #266 notes and these captures.

| Programs / route | Encoded gates | Official HTML lines | Text-extract lines |
| --- | --- | --- | --- |
| EE / Bagrut | Math 4u≥85 or 5u≥75; English 4u≥70 or 5u≥60; physics 5u≥60 | EE 1355–1378 | 2439–2463 |
| EE / psychometric | Total≥600, quantitative≥115; math 4u≥80 or 5u≥70; physics 5u≥60 | EE 1381–1400 | 2465–2487 |
| Software + CS / Bagrut with science | Math 4u≥85 or 5u≥75; English 4u≥70 or 5u≥60; physics or CS 5u≥60 | Science 1370–1388 | 2480–2508 |
| Software + CS / Bagrut without science | Math 4u≥90 or 5u≥80; English 4u≥70 or 5u≥60 | Science 1390–1405 | 2510–2528 |
| Software + CS / psychometric | Total≥620, quantitative≥115; math 4u≥80 or 5u≥70; no science gate | Science 1408–1419 | 2532–2547 |
| Software + CS / psychometric with science | Total≥600, quantitative≥115; math 4u≥80 or 5u≥70; physics 5u≥60 | Science 1421–1435 | 2549–2575 |

The earlier evaluator shorthand included CS for the 600 psychometric route. The later CS brief explicitly says not to add it, and both #266 notes and the canonical HTML agree: CS is listed only in the Bagrut-with-science section. The evaluator follows that later source-specific instruction for both software and CS, with an explicit rejection test for a CS-only 600 profile. No numeric disagreement was found.

## Decision and input handling

Each route is a conjunction; alternatives are disjunctions. Any met route produces `accepted`. If every supported route has a known failing condition, the result is `below`, even when unrelated inputs are absent. Otherwise it is `unknown` / `needs_input`, naming specific missing inputs for the possible route needing the fewest fields. A satisfied alternative wins even when another alternative is unknown. Bagrut routes do not need an overall Bagrut average or psychometric score; psychometric routes do not impose a Bagrut English-grade gate.

Existing subject-record precedence remains authoritative over scalar inputs. Schema-v2 final projects cannot become exam grades or fall back to stale scalar scores. EE/software are removed from both Batch C unsupported maps; CS joins the evaluator directly without an unsupported round trip.

The existing result explanation carries the caveat: full Bagrut entitlement and beginners/basic English classification remain required; math/physics prep at 70, software/CS programming prep at 70, and named other science 5u≥70 are outside the available inputs. Failing these supported routes is not a claim that those alternatives are unavailable. No new UI fields, component, layout or presentation changes were needed. Requirement tiles retain the full-text fallback and do not turn alternative routes into cumulative floors.

## Behavior matrix

The same independently specified profiles run through the full evaluator and the real POST handler, using static catalogue fixtures and mocked catalogue reads, without mocked admissions decisions.

| Case | EE | Software | CS |
| --- | --- | --- | --- |
| Strong Bagrut, no overall scores | accepted | accepted | accepted |
| Psych-only 600/115, math 5u70, physics 5u60, failing English Bagrut | accepted | accepted | accepted |
| Weak, all subject/psych fields supplied | below | below | below |
| Psych fails, Bagrut physics grade missing | unknown: physics grade | same | same |
| Bagrut fails, quantitative missing | unknown: quantitative | same | same |
| Each Bagrut math 4u85 / 5u75 and English 4u70 / 5u60 boundary −1, exact, +1 | below / accepted / accepted | same | same |
| Physics 5u60 boundary, Bagrut and psych separately | below / accepted / accepted | same | same |
| Psych math 4u80 / 5u70, total 600, quant 115 boundaries | below / accepted / accepted | same | same |
| Without-science math 4u90 / 5u80 boundaries | outside EE routes | below / accepted / accepted | same |
| CS Bagrut 5u60 boundary | outside EE routes | below / accepted / accepted | same |
| Psych 620 boundary with known failing science | outside EE routes | below / accepted / accepted | same |
| Psych 620 with science inputs absent | requires physics | accepted | accepted |
| 600 psych with CS only and failing physics | requires physics | below | below |
| Missing math units, English grade, physics units; high overall scores without subjects | needs specific inputs | same | same |
| Passing/failing authoritative subject records against stale scalars | record wins | record wins, including CS | same |
| CS final project instead of an exam | outside EE routes | unknown: CS units and grade | same |
| Batch API with all three IDs | accepted | accepted | accepted |

The former blanket unsupported assertions are replaced with behavioral assertions; no unrelated expected outcomes are weakened. Red-before-implementation: all 39 initial EE cases failed against the old unsupported implementation. Later missing-input expectations were corrected to assert the smallest possible route's fields, preserving the strict field list.

## Verification and limits

- Focused Vitest: 9 files / 783 tests passed, including evaluator, API serialization, repairs, stamp, rendered pages, serializers and tiles.
- Lint passed with the existing unused `AdmissionsRequiredInput` warning in `bagrutPolicies.ts`; typecheck passed.
- Final pre-PR guard passed: 91 files / 2,321 tests, migration consistency, operational grants, local seed dry-run, and 212 committed Monday evidence records. The guard now includes the Afeka API matrix. The optional local evidence regeneration comparison was skipped because the raw Monday export is absent.
- EE/software source blocks and repair rows are unchanged. CS notes equal main's software six strings byte-for-byte. CS source/stamp details are in `2026-10-24-afeka-cs-reencode.md`.
- CE sequence: plan, work, simplify. Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.

No Next dev/start server, direct interactive browser run, screenshots, Vercel runtime check, production HTTP spot-check or Supabase read/write was performed. API tests invoke the real handler locally; rendered-page tests verify visible strings and source links, not browser layout or deployment. This follows the explicit static/test-only verification constraint. Jorje must verify the preview, source interpretation and CI before declaring readiness. No merge, deployment, SQL, environment/settings change, external comment or message was performed.

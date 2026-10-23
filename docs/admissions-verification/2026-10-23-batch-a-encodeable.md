# Batch A numeric admissions — 2026-10-23

Codex implementation evidence for Jorje's verification. This document does **not** declare merge readiness. Nine institution/programme pairs receive numeric routes. No database writes, migrations, seed execution, freshness/publication jobs, environment changes, merge or manual deployment are part of this PR. The seed dry-run is a local, non-writing validation.

## Sources and scope

The supplied inventory and official packet are the starting evidence. Packet filenames below refer to the supplied `pm-research/raw/official` directory. Official programme pages and the Reichman PDF are the authority; no aggregator is a source or referral destination.

| Source | Official destination | Evidence and limitations |
|---|---|---|
| `telhai_cs.md` | [Tel Hai CS](https://www.telhai.ac.il/BSc_מדעי_המחשב) | Operator's full-text official extract. Some saved HTML files are Cloudflare stubs. Admission block has no explicit תשפ״ז label; exceptional-admission footnote says תשפ״ו. |
| `telhai_biology.md` | [Tel Hai animal sciences](https://www.telhai.ac.il/BSc_מדעי_החי) | Catalogue says biology; reachable source is animal sciences. The distinct life-sciences page was blocked. Mapping remains a Jorje verification item. |
| `ono_cs_business.md` | [Ono CS](https://www.ono.ac.il/curriculum/computer-science-bsc/), [Ono business/finance](https://www.ono.ac.il/curriculum/finance-and-capital-markets-ba/) | Official snippets corroborated through official-domain search on 2026-10-23. CS alternative structure follows the explicit brief; its compressed wording warrants institutional confirmation. |
| `ruppin_cs.md`, existing content repair | [Ruppin CS requirements](https://www.ruppin.ac.il/faculties/ba/computer-science/application-requirements/) | Live official page successfully retrieved in this run, with explicit תשפ״ז heading and matching numbers. Formula for combined 106 remains missing. |
| `reichman_business_economics.md`, `may.txt`, `runi_thresholds_tashpaz_18526.pdf` | [Reichman תשפ״ז thresholds](https://www.runi.ac.il/media/4tsb3m1v/ספי-קבלה-לתואר-ראשון-תשפז.pdf), [calculator](https://www.runi.ac.il/admissions/undergraduate/calculator) | PDF row controls subject gates. Reuses the existing estimated client-calculator formula; no new live-calculator parity claim. |
| Live Colman programme pages | [Accounting](https://www.colman.ac.il/academics/ba/accounting/), [information systems and business](https://www.colman.ac.il/academics/ba/management-information-systems/) | Both official admission blocks retrieved on 2026-10-23. Institution's combined threshold remains unpublished. Information systems page explicitly describes a dual-major programme. |
| `mta_conditions.txt` | [MTA requirements](https://www.mta.ac.il/conditions_for_applying) | Distinct economics-only row not found; economics-management already encoded separately. |
| `tau_match.txt`, `tau_med_doc.txt` | [TAU match table](https://go.tau.ac.il/he/ba/match) | **743.86 belongs to the table for applicants recognized as ראויים לקידום. It is not established as the general medicine cutoff.** |

## Encoded routes and inclusive boundaries

Every matched numeric route remains `pending`, with `scoreAssessment: meets_threshold` and separate outstanding confirmations. No route returns final acceptance. `needs_input` requests ordinary scores, units, grades or a subject record, never מתואם / סכם / מצרף / ציון קבלה.

| Programme ID | Encoded thresholds and gates | Confidence / remaining gap |
|---|---|---|
| `telhai_cs` | Psychometric ≥610 AND math 4u≥85 OR 5u≥75. Committee: psychometric ≥585 with 4u≥85, or ≥570 with 5u≥75. Committee approval separately unconfirmed. | Published psychometric routes; medium due year caveat. Bagrut eligibility/language not established by scores. |
| `telhai_biology` | Psychometric ≥570; committee ≥520. Math 4u≥75 OR 5u≥65; 3u permitted with unconfirmed summer preparation. Any biology/chemistry/physics exam: 3u≥85 OR 4u≥75 OR 5u≥65. | Partial; source identity/year need verification. Missing science requests subject record, not assumed preparation enrollment. Known below-grade science is below the checked routes. מצרף 580 / committee 520 is not computed or requested. |
| `ono_cs` | Bagrut ≥100 OR math 5u≥75 / 4u≥95 OR psychometric ≥650. | Estimated; follows brief's OR routes. Bagrut eligibility and institutional calculation remain unconfirmed. Weighted alternative omitted without formula. |
| `ono_business` | Bagrut ≥95 OR psychometric ≥600. Interview: Bagrut ≥80 and <95, OR psychometric ≥550; returns `manual_gate` / pending. | Estimated; generic programme covers multiple specializations. Math requirements are specialization-specific and explicitly require confirmation. No invented universal grade gate or age input. |
| `ruppin_cs` | Bagrut ≥100 OR ≥98 with math 5u≥80 / 4u≥95 OR psychometric ≥600 OR ≥590 plus quantitative ≥120. Every route also requires math 5u≥70 / 4u≥85. | Partial numeric coverage, official thresholds corroborated live. Combined ≥106 with psychometric ≥550 not computed. Prep/waiver exam ≥70 and prior-qualification alternatives are not automatically assumed. |
| `reichman_business` | Coordinated ≥630 OR Bagrut ≥100 OR psychometric ≥700. English ≥4u. Coordinated/Bagrut-100 routes: published math level 3u with grade ≥100, implemented conservatively as ≥3u and grade ≥100. Psychometric route: quantitative ≥125. Additional Bagrut alternative: ≥95 and <100, math ≥4u≥80 AND 5u physics/chemistry/biology ≥75 (not CS). | Estimated formula and institution-weighted Bagrut. Summer prep unconfirmed for math below 4u≥80 / 5u≥65. The literal 3u@100 wording is deliberately not extrapolated to invented lower grades at higher units; Jorje should verify that interpretation. Specialized business tracks excluded. |
| `reichman_economics` | Coordinated ≥600 OR Bagrut ≥100 OR psychometric ≥680. English ≥4u; math 4u≥75 OR 5u≥60. Psychometric route also quantitative ≥125. Prep remains unconfirmed below 4u≥85 / 5u≥65. | Estimated. PDF entry gate is **75/60**, not brief's provisional **85/65**; the latter are prep thresholds. Official row groups economics/business, economics/entrepreneurship and sustainability; generic catalogue mapping remains qualified. Entrepreneurship's application/committee process is not silently included. |
| `colmgmt_accounting` | Bagrut ≥100, using provided Colman average when present, otherwise ordinary average as an estimate. Alternative prerequisites: psychometric ≥555 AND quantitative ≥100; institutional composite approval remains an explicit unconfirmed condition. | Estimated, partial. No combined score or overall composite match is invented; `meets_threshold` refers to the displayed psychometric prerequisite only. |
| `colmgmt_infosystems` | Bagrut ≥95 plus math 5u≥70 / 4u≥80. Conditional Bagrut route ≥85 and ≤94.4 plus same math, with separate unconfirmed institutional approval. | Estimated, partial; page is dual-major information systems/business, catalogue ID preserved. Combined routes and relaxed math with quantitative 128 require unpublished institutional weighting and are not computed. The 94.4–95 gap is not silently rounded or filled. |

### Formula and subject handling

Reichman reuses `4.812 × bagrut + 0.5131 × psychometric − 163.19`; no coefficients, existing programme cutoffs or saved references change. The formula remains estimated because this run does not establish live calculator parity or identical institution-weighted Bagrut. Other newly encoded routes compare ordinary inputs against explicit numeric conditions rather than inventing a formula.

Structured ordinary exam rows override legacy subject inputs. Complete records and recorded final projects cannot be replaced by contradictory legacy exam grades. Biology science allows biology, chemistry or physics; final projects are excluded. English classification and conditional Hebrew requirements stay within outstanding institutional confirmations, avoiding an indiscriminate language-input block.

For partially covered programmes, `below` means below the checked numeric routes. The explanation preserves uncomputed alternatives. For Ono CS, weak 420/70 scores with missing math produce `needs_input`, because math can independently qualify under the brief. The complete weak fixture explicitly supplies 3u math at 70 and returns below; hiding missing math would incorrectly deny that alternative.

## Deferred or skipped candidates

| Programme(s) | Disposition and reason |
|---|---|
| `reichman_infosystems` | Deferred: no clear management/information-systems row. Business and Data Analytics is a distinct specialized programme with interview and cannot be substituted. |
| `mta_cs` | Skipped duplicate alias: no separate ID in assembled in-repo catalogue. Existing `tlvyaffo_cs` evaluator unchanged. |
| `colman_cs` | Skipped duplicate alias: no separate ID in assembled in-repo catalogue. Existing `colmgmt_cs` evaluator unchanged. |
| `tlvyaffo_economics` | Deferred: no distinct economics row separate from economics-management; do not apply `tlvyaffo_business` thresholds by assumption. |
| `tau_medicine` | Deferred: supplied 743.86 is scoped to ראויים לקידום; no verified general match formula/threshold packet. Existing seed/scoring is untouched by this PR; this deferral does not certify its historical 770. |
| `medicine` | Deferred: generic slug does not establish a catalogue/institution pair. |
| `biu_cs`, `biu_psychology`, `biu_law`, `biu_lifesciences`, `biu_ee`, `biu_biotech`, `biu_computational_bio`, `biu_optometry`, `biu_criminology`, `biu_medicine` | Deferred to Batch A composite follow-up: need institution's סכם formula and official programme verification. |
| `mon_12220708940_cs`, `mon_12220708941_cs`, `mon_12220708942_cs`, `mon_12341088622_cs`, `mon_12220685569_cs`, `mon_12220697671_cs` | Deferred: clean institution mapping and programme-specific official packets required. No opportunistic college expansion. |
| `telhai_nursing`, `telhai_socialwork`, `biu_socialwork` | Batch B: interview and other nonnumeric requirements. |
| All `ariel_*` | Batch C: endpoint/source work explicitly excluded. |
| `ono_socialwork`, `tlvyaffo_socialwork` | Batch C: phantom/delist work excluded. |
| Generic `sports_science`, `criminology`, `nutrition` | Batch C unless institution-scoped; vague/wrong-fit candidates. |
| Design/art/music/audition programmes; vocational and complementary-medicine generics | Batch B/C; outside numeric batch. |

The inventory's ~30–35 count is a candidate count, not a claim that this PR scores all of them. Nine numeric programme IDs are delivered; unsupported composites and mappings are explicitly deferred.

## Verification record

- Focused tests cover weak profiles, inclusive boundaries, committee/interview conditions, subject gates, missing ordinary inputs, preparation and structured records. API tests call the real evaluator through the route handler with a mocked read-only catalogue/database boundary.
- Existing MTA/Reichman CS-law-psychology/Colman regression coverage is retained. The pre-push guard includes the new tests.
- Browser verification uses the repository's existing Playwright/Chromium infrastructure, local explicit static catalogue mode, desktop 1440px and mobile 390px. This is browser → real API → seed catalogue → evaluator → visible result verification, not production DB verification. CE's interactive `agent-browser` driver is unavailable; no new browser stack was installed.
- Initial combined browser run hit the existing 12-request/minute allowance because test cases shared a client identity. New cases receive isolated test client identities; production limiter is unchanged.
- No production schema/data change is requested or performed. Supabase writes and seed/publication runs remain prohibited. No authenticated preview or production scoring claim is made.

Final command outcomes, screenshot locations and CI status are recorded in the companion Jorje report.

Conditional language notes from the packet: Tel Hai CS Yael ≥86, biology ≥100, Ruppin ≥110 for applicants to whom Hebrew requirements apply; English classification through psychometric English or Amirnet as applicable. These are not universal score gates for Hebrew-track applicants and are not inferred from an overall psychometric score.

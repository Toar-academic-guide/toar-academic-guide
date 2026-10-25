# TAU contract requirement URLs (404)

Scope: URLs only, no value changes: thresholds, formulas, fingerprints, liveComparedAt and dates unchanged. This updates 12 `requirementsUrl` values in `TAU_PROGRAM_VERIFICATION_METADATA` across seven programmes and their legacy aliases.

The statuses and method below record Jorje's official-source verification. Existing captures were not re-fetched or modified for this change.

| programme              | pairIds                                                      | node id | old URL                                                                                | old status (404) | new URL                                                                            | new status (200) | capture path                                                                          |
| ---------------------- | ------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| Biology                | `biology__tau`, `tau_biology__tau`                           | 8219    | https://go.tau.ac.il/he/life-sciences/ba/biology?v=admission-requirements              | 404              | https://go.tau.ac.il/he/life/ba/bio?v=admission-requirements                       | 200              | `/workspace/pm-research/raw/official/tau/review11_biology_20261025T181838Z.txt`       |
| Communication          | `communication__tau`                                         | 8277    | https://go.tau.ac.il/he/social-sciences/ba/communication?v=admission-requirements      | 404              | https://go.tau.ac.il/he/social-sciences/ba/communications?v=admission-requirements | 200              | `/workspace/pm-research/raw/official/tau/review11_communication_20261025T181838Z.txt` |
| Education              | `education__tau`                                             | 8415    | https://go.tau.ac.il/he/social-sciences/ba/education?v=admission-requirements          | 404              | https://go.tau.ac.il/he/education/ba?v=admission-requirements                      | 200              | `/workspace/pm-research/raw/official/tau/review11_education_20261025T181838Z.txt`     |
| Economics              | `economics__tau`, `tau_economics__tau`                       | 11821   | https://go.tau.ac.il/he/management/ba/economics?v=admission-requirements               | 404              | https://go.tau.ac.il/he/social-sciences/ba/economics?v=admission-requirements      | 200              | `/workspace/pm-research/raw/official/tau/review11_economics_20261025T181838Z.txt`     |
| Electrical Engineering | `ee__tau`, `tau_ee__tau`                                     | 11233   | https://go.tau.ac.il/he/engineering/ba/electrical-engineering?v=admission-requirements | 404              | https://go.tau.ac.il/he/engineering/ba/electrical?v=admission-requirements         | 200              | `/workspace/pm-research/raw/official/tau/review11_ee_20261025T181838Z.txt`            |
| Mechanical Engineering | `me__tau`, `tau_me__tau`                                     | 8288    | https://go.tau.ac.il/he/engineering/ba/mechanical-engineering?v=admission-requirements | 404              | https://go.tau.ac.il/he/engineering/ba/mechanical?v=admission-requirements         | 200              | `/workspace/pm-research/raw/official/tau/review11_me_20261025T181838Z.txt`            |
| Occupational Therapy   | `occupational_therapy__tau`, `tau_occupational_therapy__tau` | 8212    | https://go.tau.ac.il/he/med/ba/occupational-therapy?v=admission-requirements           | 404              | https://go.tau.ac.il/he/med/ba/occu?v=admission-requirements                       | 200              | `/workspace/pm-research/raw/official/tau/review11_ot_20261025T181838Z.txt`            |

## Method

1. Node ids came from the TAU source registry and were cross-checked with `https://go.tau.ac.il/graphql` using `getProgramByIdAndLang`: `nid`, `title`, and `field_plain_id_programs` matched each contract's `officialProgramId`.
2. `https://go.tau.ac.il/node/<nid>` redirects to the canonical programme page. As a control, Industrial Engineering node 8291 resolves to the URL already used in the repository: `https://go.tau.ac.il/he/engineering/ba/industrial-engineering`.
3. Each capture's Drupal `currentPath` equals `node/<nid>`, its title is the programme's "תנאי קבלה" page, and `?v=admission-requirements` renders the `admission_requirements` view. An unknown `?v=` value does not render that view; a bogus slug returns 404.

## Note

The visible "תנאי קבלה" tab link on these pages is `?v=requirements`. `?v=admission-requirements` was kept to match the repository's existing working TAU URLs.

## Out of scope / follow-ups

- The Architecture URL in `tauProgramVerification.ts` line 43 (`/he/engineering/ba/architecture`) also returns 404. Node 8209 resolves to `/he/arts/ba/arch`. It is not changed in this PR.
- The same seven old URLs are hard-coded in `src/server/admissions/evaluator.ts` (Oded's file, gate-failure `officialUrls`) and are not changed here. Oded will read them from `TAU_PROGRAM_VERIFICATION_METADATA[pairId].requirementsUrl` in a follow-up.

# Weekly Admissions Source Freshness Discovery

## Summary

The discovery slice now has two layers:

- a fixture-backed source-class model for weekly admissions freshness checks
- a live official-source proof runner for a narrow set of institution adapters

The checker can produce raw fingerprints, normalized decision-bearing fingerprints, capability labels, review-worthy change flags, and blocked-source reasons without touching the production schema. The live proof layer separates exact official-source reproduction from score-only, static-candidate, open-admission, and browser-blocked sources.

This discovery artifact does not schedule weekly checks, persist source freshness, update the internal dashboard, or drive public product admissions decisions by itself.

## Representative Inputs

| Source class | Representative input | GitHub Action v1 posture |
| --- | --- | --- |
| `official_html` | HTML admissions page with threshold, psychometric, and English requirement lines | Supported after boilerplate stripping |
| `api_static_json` | Static/API JSON with program threshold and rejection cutoff fields | Supported |
| `pdf_text` | Extracted PDF text with Bagrut and psychometric requirement lines | Supported after PDF text extraction exists |
| `score_only_calculator` | Calculator response with a calculated score but no threshold/status | Supported as score-only evidence |
| `browser_required` | Source requiring persistent browser cookies or anti-bot clearance | Blocked for GitHub Action v1 |

## Live Proof Capability Matrix

| Institution | Target id | Official source | Current proof status | Reproduced fields | Limitation | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| University of Haifa | `haifa-cs-live` | `https://applicants.haifa.ac.il/enrollmentChances/index.html` | Exact live adapter target | weighted score, acceptance cutoff, rejection cutoff when returned | Representative program only | Promote as first weekly GitHub Action adapter candidate |
| Tel Aviv University | `tau-digital-sciences-live` | `https://go.tau.ac.il/graphql` | Exact live adapter target | selected calculated score, acceptance threshold, rejection threshold when returned | Representative Digital Sciences for High-Tech program and score-field mapping only | Promote as second weekly GitHub Action adapter candidate |
| Hebrew University | `huji-static-json` | `https://go.huji.ac.il/jjson/huji.json.gz` | Static-data candidate | program cutoff candidate | Requires reproducing static JSON plus bundled client-side JS | Separate HUJI static JSON and JS reproduction spike |
| Technion | `technion-score-only` | `https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/technion-calculators-sum.php` | Partial / score-only | sekhem score, optimal Bagrut average candidate | No official threshold/status in this proof | Pair with reviewed official threshold source |
| Ben-Gurion University | `bgu-score-only` | official BGU admissions endpoints from Monday notes | Partial / score-only | sekhem score candidate | Cutoff/status not returned in the proof notes | Find official cutoff/status source |
| Bar-Ilan University | `biu-browser-required` | `https://in.biu.ac.il/Pages/Psychometric.aspx` | Blocked for GitHub Actions v1 | none | ASP.NET view state, Radware cookies, browser session required | Move to Hermes/VPS browser lane |
| Ariel University | `ariel-browser-required` | official Ariel admissions flow from Monday notes | Blocked for GitHub Actions v1 | none | Stateful browser flow, Windows-1255, Radware session required | Move to Hermes/VPS browser lane |
| Open University | `openu-open-admission` | `https://www.openu.ac.il/` | Open-admission policy | open admission baseline | No sekhem calculator required for baseline policy | Model as policy, not calculator reproduction |

## Running The Manual Proof

The live proof script defaults to the two exact official-source candidates:

```bash
node scripts/admissions-live-source-proof.mjs
```

Use `--target <target-id>` for one source, or `--all` to include the full capability matrix:

```bash
node scripts/admissions-live-source-proof.mjs --target haifa-cs-live
node scripts/admissions-live-source-proof.mjs --all
```

The live script is intentionally not part of `npm test`; official endpoint availability is an external variable.

## What Counts As Exact Proof

Exact proof means the adapter:

- calls an official institution source directly
- parses decision-bearing fields from the official response
- avoids hard-coded demo thresholds
- returns `decision_capable` only when score evidence is paired with official cutoff/status evidence

Score-only proof is useful freshness evidence, but it cannot produce accepted/rejected product output by itself.

## Recommended Normalized Fingerprints

| Source class | Normalized fingerprint fields | Review-worthy when |
| --- | --- | --- |
| `official_html` | Decision-shaped lines that include admissions keywords plus a value shape, after removing `header`, `nav`, `footer`, scripts, styles, and SVGs | Decision lines change |
| `api_static_json` | Sorted fields whose keys match decision-bearing keywords such as threshold, cutoff, score, Bagrut, psychometric, English, or requirement | Extracted decision fields change |
| `pdf_text` | Decision-shaped text lines from extracted PDF text | Extracted decision lines change |
| `score_only_calculator` | Score fields only, with capability marked `score_only` | The score payload changes, but it should not be treated as acceptance criteria by itself |
| `browser_required` | Blocked reason | The source should move to Hermes/VPS discovery, not GitHub Action v1 |

## Required Storage Fields Before Production

Production persistence should store at least:

- source id
- source class
- scope: institution-level or program-specific
- last checked at
- last successful check at
- latest status
- latest failure or blocked reason
- raw fingerprint
- normalized fingerprint
- normalized decision payload
- capability: decision-capable, score-only, or blocked
- review-worthy flag
- related payload id or review item id when a change is detected

## Risks That Remain

- The HTML normalizer is intentionally conservative and fixture-backed; real official pages need source-specific fixture coverage before broad launch.
- PDF support currently assumes text extraction has already happened.
- Score-only calculators can detect changed output, but they cannot justify an accepted/rejected decision without a threshold source.
- Browser-required sources should be explicitly blocked in the GitHub Action lane until Hermes/VPS execution is designed.
- Haifa and TAU live adapters are representative-program proofs. Broad program coverage and full user-facing decisions are deferred.

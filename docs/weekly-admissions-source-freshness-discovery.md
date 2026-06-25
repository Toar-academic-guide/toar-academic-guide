# Weekly Admissions Source Freshness Discovery

## Summary

The U1 spike proves a first-pass source-class model for weekly admissions freshness checks. The checker can produce raw fingerprints, normalized decision-bearing fingerprints, capability labels, review-worthy change flags, and blocked-source reasons without touching the production schema.

The fixture-backed result supports GitHub Actions as the v1 lane for simple machine-checkable sources and keeps browser/cookie/anti-bot sources out of that lane until a Hermes/VPS worker exists.

## Representative Inputs

| Source class | Representative input | GitHub Action v1 posture |
| --- | --- | --- |
| `official_html` | HTML admissions page with threshold, psychometric, and English requirement lines | Supported after boilerplate stripping |
| `api_static_json` | Static/API JSON with program threshold and rejection cutoff fields | Supported |
| `pdf_text` | Extracted PDF text with Bagrut and psychometric requirement lines | Supported after PDF text extraction exists |
| `score_only_calculator` | Calculator response with a calculated score but no threshold/status | Supported as score-only evidence |
| `browser_required` | Source requiring persistent browser cookies or anti-bot clearance | Blocked for GitHub Action v1 |

## Observed Result

The runnable discovery script checks five fixture samples:

```bash
node scripts/admissions-freshness-discovery.mjs
```

Latest observed summary:

```json
{
  "total": 5,
  "supportedInGithubActions": 4,
  "blockedForLaterHermesLane": 1
}
```

## Recommended Normalized Fingerprints

| Source class | Normalized fingerprint fields | Review-worthy when |
| --- | --- | --- |
| `official_html` | Decision-shaped lines that include admissions keywords plus a value shape, after removing `header`, `nav`, `footer`, scripts, styles, and SVGs | Decision lines change |
| `api_static_json` | Sorted fields whose keys match decision-bearing keywords such as threshold, cutoff, score, Bagrut, psychometric, English, or requirement | Extracted decision fields change |
| `pdf_text` | Decision-shaped text lines from extracted PDF text | Extracted decision lines change |
| `score_only_calculator` | Score fields only, with capability marked `score_only` | The score payload changes, but it should not be treated as acceptance criteria by itself |
| `browser_required` | Blocked reason | The source should move to Hermes/VPS discovery, not GitHub Action v1 |

## Noise To Ignore

- HTML navigation, header, footer, script, style, and SVG changes.
- Generic admissions headings without concrete values.
- Non-decision text in HTML or PDF sources.
- Generated timestamps and labels unless the source adapter marks them as decision-bearing.

## Required Storage Fields Before U2

U2 should persist at least:

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

- The HTML normalizer is intentionally conservative and fixture-backed; real official pages need source-specific fixture coverage before launch.
- PDF support currently assumes text extraction has already happened. U2/U4 should decide where extraction runs and how extraction failures are represented.
- Score-only calculators can detect changed output, but they cannot justify an accepted/rejected decision without a threshold source.
- Browser-required sources should be explicitly blocked in the GitHub Action lane until Hermes/VPS execution is designed.

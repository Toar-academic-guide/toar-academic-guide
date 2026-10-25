# BIU official source packet — captured 2026-10-23 (Asia/Jerusalem)

## Primary official URLs (biu.ac.il / engineering.biu.ac.il / shoham.biu.ac.il)
- General BA admission requirements: https://www.biu.ac.il/registration-and-admission/information/general-admission-req
- Bagrut average + bonuses calculation: https://www.biu.ac.il/registration-and-admission/information/general-admission-req/matriculation-calculation
- BA admission channels: https://www.biu.ac.il/registration-and-admission/information/ba-admission
- Official admissions chances calculator: https://shoham.biu.ac.il/kabala/
- Engineering faculty prerequisites table: https://engineering.biu.ac.il/prerequisites

## Capture notes
- HTML snapshots of the four public pages above are saved alongside this note.
- `https://shoham.biu.ac.il/kabala/` returned HTTP 403 (WAF/Radware) to non-browser curl from this box on 2026-10-23; reverse-engineer formula via real browser against that official calculator when reachable. Do NOT treat `/workspace/pm-research/evalwt/scripts/admissions-calculators/5_biu.js` (0.5/0.5) as ground truth.
- Local catalogue already records `calculatorUrl: https://shoham.biu.ac.il/kabala/` on the biu institution and `sekhemWeight: { psy: 0.6, bag: 0.4 }` in `src/data/degreesData.ts` — treat as a prior estimate until confirmed against the official calculator; mark confidence honestly.

## NOT authoritative
- Aggregators (Yoram etc.)
- `/workspace/pm-research/evalwt/scripts/admissions-calculators/5_biu.js`

## Encode-run additions

- `acceptance-no-psychometry.html` was captured directly with curl from https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry on 2026-10-23. It explicitly labels the table תשפ״ז.
- `calculator-attempt.json` records a real headless Playwright Chromium HTTP 403. No scores were obtained or formula inferred.
- `SHA256SUMS` records the HTML snapshot digests.
- Correction to the initial capture note: the supplied packet contained three HTML files, not four. No engineering HTML snapshot was present. Direct engineering fetch failed (TLS), while official web search extracts were readable. Engineering remains deferred.

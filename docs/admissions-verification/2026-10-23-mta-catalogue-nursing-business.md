# MTA catalogue copy — nursing and economics-management, 2026-10-23

The adjacent JSON is a byte-for-byte copy of the supplied `official_values.json`. The seed mirrors its requirements, notes, English minimum and official URLs. `tlvyaffo_business` keeps its ID and now displays **כלכלה וניהול**; nursing remains **סיעוד**. Categories, enrichment and evaluator thresholds are unchanged. This supersedes the earlier verification note's instruction to retain the old business label.

## Official evidence

- [Undergraduate admission conditions](https://www.mta.ac.il/conditions_for_applying), supplied extracts `/workspace/pm-research/raw/official/mta_conditions.txt` and `.html`, nursing and economics-management sections. Nursing automatic admission: “ממוצע בגרות 90 וציון פסיכומטרי 520”. Economics-management includes “ממוצע בגרות 94 בכפוף לציון פסיכומטרי 550”. The complete alternatives, mathematics exception and English requirement are preserved in the JSON.
- Official program pages: [nursing](https://www.mta.ac.il/program/nursing_bsn) and [economics-management](https://www.mta.ac.il/program/management_economics_ba), reread online. The supplied `mta_management_economics_ba.html` contains a bot-verification page and was not used as evidence. The admission conditions are the requirements evidence.
- [Official calculator](https://mtamn.mta.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1) and the [existing evaluator verification](2026-10-23-mta-nursing-economics-management.md). A numeric match remains separate from institutional confirmation and final admission.

## Scope and verification

The mirror test checks both raw and enriched catalogue entries, seed rows and source URLs, DB serialization, public requirement text, referral attribution and the absence of unsupported number tiles. It is included in `guard:pre-pr`. Existing MTA Playwright coverage checks the exact requirements and notes, display names, official referral links and right alignment on desktop and mobile.

Checks performed:

- Focused unit tests: **98 passed** across the mirror, display, tiles, journey naming, existing MTA evaluator and API tests.
- `npm run guard:pre-pr`: **1,388 passed**, including migration consistency, catalogue seed dry-run and operational grant/evidence checks. No database changes were applied.
- Explicit static-mode production build, typecheck, targeted ESLint and formatting passed.
- Chromium Playwright: **14 passed**, including both program pages and real local calculator/API flows at 1440px and 390px. Read the desktop/mobile screenshots: Hebrew copy and alignment are correct, Contact/Save remain visible in calculator results, and no unsupported tiles or horizontal overflow appear. Screenshots are local test artifacts.
- Read-only production GET to `https://findmyway.co.il/api/catalog/programs` on 2026-10-23 confirmed the pending DB state: nursing still exposes 72/440 and biology; `tlvyaffo_business` still displays מנהל עסקים and 70/450. No direct Supabase inspection or deployed-copy correction is claimed.

The production apply packet lives **outside this repository**, under `/workspace/seo/mta_catalogue_nursing_business/`. Its SQL was neither modified nor applied. No DB writes, migrations, seed application, publication/freshness jobs or manual deployments are part of this change. Local browser checks use explicit static catalogue mode; they do not establish that production DB copy has changed. Production catalogue application and subsequent live verification remain a separate authorized step.

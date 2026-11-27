# Open-days calendar, issue #503 — 27 November 2026

## Data and release boundary

Production uses Monday board 18438707562, not the local seed. Its full read contained 242 items and no next cursor. The five new events in `openDays.initial.json` are local/static fixtures until the separate publication packet is applied. No Monday or production DB write was performed. Existing production events remain authoritative; no fallback was introduced. A protected preview with board credentials will show the old event set until publication, so local screenshots do not prove production data activation.

`issue-503-monday-publication.json` is the exact five-item `create_items` input, **not executed**. Before applying it, refresh the official pages and board, compare institution/date/source to avoid duplicates, inspect current column definitions/status labels, and obtain the visual release approval. The academic Colman institution is **13481537422**, not the unrelated practical-engineer network13481501289. Verify the five created rows and the production GET page after cache expiry. Existing rows are not replaced or removed.

Date columns store raw UTC values. The loader reads raw `value` and converts to `Asia/Jerusalem`, independent of the API user's timezone. For these winter events09:30=07:30Z,09:00=07:00Z,17:00–19:00=15:00–17:00Z. A date without a published hour stays date-only. Read/write contract: https://developer.monday.com/api-reference/reference/date .

## Five new events

| Institution     | Official source                                  | Confirmed details                                                                                                                                                               |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bezalel         | https://bezalel.ac.il/events/667032              | 22December2026,09:30, BA, Mandel campus Zamora1 Jerusalem; direct current HTML.                                                                                                 |
| Academic Colman | https://www.academy.org.il/open-day/             | 25December2026,09:30, design, Rishon LeZion campus; direct HTML.                                                                                                                |
| BGU             | https://www.bgu.ac.il/events/online-open-day-ba/ | 7January2027,17:00–19:00, online BA advice, Zoom; direct HTML.                                                                                                                  |
| Reichman        | https://lps.runi.ac.il/                          | Friday8.1 at09:00, BA; readable ordinary Chromium. Source text omits year; issue's reviewed26November packet identifies2027 and weekday matches. Venue absent: no Event schema. |
| Haifa           | https://hcc.haifa.ac.il/                         | 17–18February2027, university-wide, Zoom; readable ordinary Chromium. No hour stated.                                                                                           |

The five issue-approved dates were independently re-read. Source captures are in the coordinator's evidence-503/sources folder. Source links/checked dates remain internal and in structured data only.

## Existing rows rechecked

- SCE https://www.sce.ac.il/lpage/beer-sheva :3December2026, Bialik56 Beersheba.
- Sapir https://www.sapir.ac.il/inscription_acceptance/opendays : ordinary browser confirms23December2026 **master's** evening (not BA),15January,16March,19May,19July,23September2027. Existing master's label is preserved. Its current source now says Zoom18:00, but this PR does not silently rewrite existing board fields; date-only metadata stays absent while stored venue is empty.
- Sam Spiegel https://www.jsfs.co.il/open-days :6January,11March,12April,7June2027. Existing school venue remains; no source link is exposed.
- TAU https://www.tau.ac.il/calendar :4February2027. Stored empty venue means no Event object.
- BGU https://www.bgu.ac.il/events/open-day/ :11February2027, Marcus campus.
- BIU https://www.biu.ac.il/article/openday :12February2027, Ramat Gan.
- HUJI https://he-info-overseas.huji.ac.il/ :5March2027 Givat Ram and2April2027 agriculture Rehovot.

## Unannounced rows and remaining source limits

The approved issue packet identifies Technion, Ariel and MTA as unannounced for2027. A confirmed board event automatically removes its unannounced row.

- Technion's live official open-day page still describes28May2026. Search-index text of a2026/27 catalogue PDF suggests2027 dates, but its live URL redirects to the official404 site; it is **not current verified evidence** and was not published.
- MTA live homepage/calendar and current searches did not establish a2027 BA event.
- Ariel's ordinary browser returned247/blank challenge. The issue's26November unannounced status is retained; a fresh accessible official-source check is still owed before release. An inaccessible page is not proof that no announcement exists.

## Rendering and verification

Default `/open-days` is all; explicit university/college filters remain SSR and canonical to the base path. Summary and FAQ dates derive from future board events, not fixed strings. One Event per eligible visible event, including expandable dates. Empty venues are omitted from Event JSON-LD, not invented. FAQ answers equal visible text. Numeric ranges are isolated LTR within right-aligned Hebrew. The existing Sapir master's event is never relabeled as undergraduate.

Current authored sitemap date is27November2026. When PR509's date registry lands, retain this date for `/open-days`.

Required release steps: exact-head CI+correct-project Preview browser suite; protected GET-only QA; Amit1280/390 visual approval; reviewed five-row Monday publication; refresh all dates on deployment day; Rich Results Test; post-deploy URL Inspection/GSC28-day monitoring. Each incomplete step must stay explicit in the PR; do not close the issue merely because local tests pass.

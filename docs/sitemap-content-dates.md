# Sitemap content dates

`src/lib/seo/pageContentDates.ts` records authored content dates by URL path.
When shipping a page-content change, update only the affected entries to the
content's publication date. Add an entry for each new static page or subject hub.
Do not bump dates for a deployment, a test/formatting fix, a source recheck that
changed no content, or an unrelated page edit. No request/build clock is used.

Catalogue programme/institution timestamps still apply. The sitemap takes the
newer authored or catalogue date and propagates member changes into subject hubs,
institution pages and the two indexes. Ordinary programme records retain their
existing reviewed-source/row provenance; the registry adds authored overrides for
known content corrections. An unknown static route has no silent fallback.

## One-time audit at main 911d572 (27 November 2026)

Used `git log --first-parent --since=2026-10-24 --date=short --format='%h %ad %s'
--name-only -- src/app src/components src/data`, then inspected the relevant diffs.
Dates describe the content, not when this audit ran. Existing site-wide chrome,
new alert CTAs, OG images and pure layout/format changes do not bulk-refresh the
underlying editorial content date.

| Content paths                                                                                                                                                   | Publication evidence                                                                                                               | Registered date |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `/programs/prep`, seven prep children                                                                                                                           | `db82fdc` / #475: comparison, funding and child requirements; `1be3bed` removes source presentation                                | 2026-11-19      |
| `/programs/nursing`, medicine/physiotherapy/OT related guidance                                                                                                 | `b5b0927` / #477: nursing table/FAQ and reciprocal links                                                                           | 2026-11-19      |
| CS, psychology, law and data-science hubs                                                                                                                       | `c3ce0c6`, `e905bd0`, `c655804` comparisons/outcomes; `1be3bed` edited their visible content                                       | 2026-11-19      |
| Programme IDs in `ISSUE_370_CORRECTIONS`                                                                                                                        | `8ddd071` / #467 introduced the specific requirement corrections; explicit paths copied into registry (not a runtime blanket date) | 2026-11-19      |
| Law outcome programme pages                                                                                                                                     | `c655804` / #451 added outcome content; `1be3bed` updated the rendered reference presentation                                      | 2026-11-19      |
| Engineering, EE, CS, software engineering hubs; `/atuda`                                                                                                        | `ca336ca` / #466: authored guide and subject-specific links                                                                        | 2026-11-19      |
| Other published hubs                                                                                                                                            | `402ba77` / #464 added visible calculator-guide content to every non-medicine subject hub, including generated hubs                | 2026-11-18      |
| `/calculator`, `/amirnet`, `/psychometric-accommodations`, `/psychometric-two-domain`, `/open-days`, `/transfer`, `/without-psychometric`, `/sekhem-calculator` | `1be3bed` / #480 edited the visible guidance/source wording; previous additions include `542645d`, `fd03921`, `e9d9e19`, `e6c8ef1` | 2026-11-19      |
| `/psychometric-dates`                                                                                                                                           | `ca336ca` adds atuda guidance after `1be3bed`; source-check date is not page publication date                                      | 2026-11-19      |
| `/institutions/openu`                                                                                                                                           | `1be3bed` changes track/reference presentation                                                                                     | 2026-11-19      |
| `/institutions`                                                                                                                                                 | `1be3bed` changes directory content, following the November 11 region/campus corrections                                           | 2026-11-19      |
| `/programs`                                                                                                                                                     | Aggregates current member content; own guide link landed `402ba77`, later member content landed November 19                        | 2026-11-19      |
| `/about`                                                                                                                                                        | `6028ea2` / #449 independence copy                                                                                                 | 2026-11-15      |
| `/`                                                                                                                                                             | `3460004` / #429 new calculator-guide link; later hero CSS only and OG metadata excluded                                           | 2026-11-11      |
| `/threshold-alerts`                                                                                                                                             | `911d572` / #490 published signup page                                                                                             | 2026-11-23      |

A GET-only check of the live `/programs` index found 95 subject links. The registry
also includes database-only `/programs/culinary` and `/programs/physical_ed`, which
are absent from the static fixture but render the same guide-link content. All 95
current live subject paths have explicit entries.

The audit excludes unmerged PRs (including fine arts, physiotherapy and bagrut
calendar updates). Those PRs must register their own content date when reconciled
with this change. The sitemap URL set, canonical policy and visible pages are
unchanged here.

Verification: the registry test enumerates actual static sitemap URLs and every
published hub, validates ISO calendar dates, checks the requested November 19
corrections, advances the clock without changing output, and verifies that a
newer database programme date reaches its hub/institution/indexes. The existing
full sitemap test also checks URL membership and deployment-clock stability.

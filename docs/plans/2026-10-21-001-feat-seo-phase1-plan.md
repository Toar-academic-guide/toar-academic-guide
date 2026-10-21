---
title: "feat: MyWay SEO/AEO Phase 1 foundations"
type: feat
date: 2026-10-21
---

# MyWay SEO/AEO Phase 1

## Existing setup

- Next.js 16.3.8 App Router, React 19, Hebrew RTL; webpack production build.
- Public routes: `/`, `/about`, `/institutions`, `/institutions/[institutionId]`, `/programs/[programId]`. App screens live under `/app`; login, signup, enquiry, internal dashboards, auth callbacks and API routes also exist. `/dev` returns 404 in production.
- Root metadata is a shared Way title/description. Only About and the directory override it. No canonicals, social metadata, JSON-LD, robots, sitemap or llms.txt.
- Detail pages await Promise params and read `publicCataloguePages` → `catalogueStatic` → static institutions/programs (including Monday-derived records). They have no static params, dynamic override or revalidation configuration. Directory data uses `institutionDirectory`; app/API queries have a separate database-capable path.
- Available checks: ESLint, TypeScript, Vitest, webpack build, pre-PR guard and Playwright Chromium smoke. The guard checks migration consistency/grants and performs a seed **dry-run**, without database writes.

## Workflow

CE skills are unavailable in this environment. The task owner explicitly authorized manual plan/work/review steps. Read the installed Next.js metadata, generateMetadata, robots, sitemap and JSON-LD guides before implementation; follow the task brief over the broader read-only SEO audit.

1. Add production-only site constants, an in-memory indexability gate, crawl files, and general Hebrew/English llms.txt.
2. Add metadata builders with deterministic title disambiguation; minimally wire metadata and JSON-LD into existing pages. Add pass-through noindex layouts for app/internal and metadata for server auth/enquiry pages.
3. Add Organization/WebSite, educational institution/program and breadcrumb builders with safe script serialization. Use EducationalOccupationalProgram for complete study programs; emit only supported facts. No FAQ schema without visible FAQs.
4. Test crawl policies, sitemap membership, title uniqueness, canonicals/noindex and structured-data safety. Match PR #230 title edits exactly.
5. Run lint, typecheck, all unit tests, production build without database environment, guard, local HTTP checks and existing Playwright smoke where feasible. Compare route rendering classifications and verify served crawl files and structured data.
6. Manually review the diff for additive-only scope, commit on `codex/seo-phase1`, push normally with the hook enabled, and create one draft PR with the requested evidence and follow-ups.

## Scope fences

No visible page changes except the follow-up's explicitly authorized neutral directory copy and official-link cleanup. No admissions/data changes, database writes, migrations, seeds, environment changes, new dependencies, image/icon changes, proxy changes, new questionnaire/start routes, static params/ISR/cache changes, slug changes or merges. Public detail data stays static. Previews always describe the production origin. Do not touch PR #230's branch or icons. Do not bypass hooks or mark the PR ready.

## Acceptance

- Crawl files return 200; sitemap has only existing indexable public routes, excludes opaque `mon_` records, uses one build timestamp and production URLs without trailing slashes.
- Indexable detail titles are unique; canonicals and JSON-LD use the production origin. Thin/app/auth/enquiry routes receive the specified robots metadata.
- Required checks and HTTP/browser evidence are summarized in the draft PR, including any environment limitations and title disambiguation counts.

## Implementation and manual review

- The gate yields 70 institutions and 286 programs: 359 sitemap URLs including the three public static routes. All 359 returned HTTP 200 on the production build locally.
- Five pairs of program titles required category and ID suffixes (10 records). All indexable page titles are unique.
- Added only metadata, structured-data scripts, crawl files, pass-through noindex layouts and tests. Existing detail/auth/enquiry page lines were not removed; icons, visible UI, data, dependencies, proxy, configuration and caching settings are untouched. Compared title edits directly with PR #230.
- Lint, typecheck, full Vitest suite (1,476 passed, 64 skipped), build without DB/Supabase environment and guard (923 targeted tests) passed. Existing lint, migration-journal and Node-version warnings are documented in the PR.
- Curl and Chromium confirmed titles, production canonicals, JSON-LD and noindex on the built server. Smoke: 6/7 passed; the existing analytics console test encounters a local-only 404 for `/_vercel/insights/script.js`, which Vercel serves on hosted deployments. No analytics behavior or test filtering was changed.
- The original requested PR title was not conventional-commit formatted. The follow-up now authorizes correcting it to satisfy the existing validator.

## Owner-authorized follow-up

1. Split robots search/training groups, add `/app/` and `/login` exclusions, and expose a one-line training policy with tested allow/block behavior. Retain noindex metadata and disclose the robots/noindex tradeoff.
2. Add sitemap frequency/priority and expand llms.txt into a citation/routing guide, with factual definitions, authoritative sources and an explicit unconfirmed business-model TODO.
3. Wrap each JSON-LD script in an `@graph` with stable apex IDs. Keep one layout graph and one page graph (App Router pages cannot append nodes to an ancestor layout without changing its data flow). Add home WebApplication and directory CollectionPage/ItemList from the exact directory loader; no visible markup changes or unsupported review/FAQ/HowTo/Dataset nodes.
4. Improve metadata descriptions using existing counts and relations. Keep title/template/locale, host, indexability and rendering settings.
5. In a separate cleanup commit, neutralize public directory branding and remove aggregator/board URLs from public directory props. Preserve raw-row logo resolution and all live catalogue, enquiry, evidence, script/CI and environment integrations. Keep uncertain historical files rather than delete them speculatively.
6. Extend meaningful regression tests; rerun required checks, production HTTP/browser inspection and directory leakage checks. Add commits, normal push, update existing draft #231 and its conventional title; document training-policy and business-model decisions for Amit.

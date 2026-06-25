# Claude Code Handoff for Codex

> Created 2026-06-23. This file captures everything that lived only inside Claude Code memory, plans, and chat — context Codex needs to continue working on TOAR seamlessly.

---

## 1. Who Is the User

- **Name:** Yonatan Buchsweiler (GitHub: `@yonatanbuc`, email: `yonatanbuc@gmail.com`)
- **Role:** Non-developer product owner. Explain all changes in plain product/UX terms, never in code jargon.
- **Language:** Conversations in **English**. All app UI copy in **Hebrew (RTL)**.
- **Collaboration partner:** Amit (`@funksinatra` on GitHub) — co-developer, reviews all PRs via CODEOWNERS. Amit built the Drizzle/DB backend layer.

### Communication Preferences

- Show what changed **visually** (before/after screenshots, widget mockups) rather than listing code diffs.
- Use visual brainstorming (mockups/wireframes) before implementing any significant UI change — Yonatan decides via visual previews, not code descriptions.
- Yonatan wants the TOAR logo (not text) wherever the brand appears.
- Keep responses concise; no trailing summaries of what you just did.
- For UI changes: always verify in a browser before reporting done.

---

## 2. What TOAR Is

Israeli academic guidance tool for discharged soldiers and post-army students. Helps them:
1. Discover a matching degree field via a career personality assessment
2. Check admission chances with a sekhem (admission score) calculator
3. Build a "bucket list" of saved programs with accepted/gap analysis

**Target user:** Israeli 20-somethings, many non-technical. App must feel simple and friendly.

---

## 3. Architecture

### Stack
- Next.js 16.2.6 (App Router), React 19, TypeScript 5
- Tailwind CSS 4, Framer Motion 12, Lucide React
- **Dual data layer:** Static TypeScript data files (original) + Drizzle/PostgreSQL backend (Amit's layer, merged to main)
- Supabase for auth + database
- Vercel for hosting (preview + production)
- Dev server: `npm run dev` → http://localhost:3000

### App Flow (AppStep state machine in `src/app/page.tsx`)
1. `landing` → LandingPage (hero with sekhem calculator card)
2. `calculator-results` → CalculatorResults (filter institutions by region/type, see admission status)
3. `intro` → QuizIntro
4. `academic-profile` → AcademicProfileForm (enter psychometric/bagrut scores)
5. `riasec-exam` → RiasecExam (42-item Hebrew RIASEC assessment)
6. `quick-filters` → OnboardingFunnel (avoidances + geography)
7. `recommendations` → RecommendationResults (top 5 field categories)
8. `calculator` → ScoreForm + ResultsDashboard (sekhem per university)
9. `bucket-list` → BucketList (saved programs with gap analysis)

### Key Data Files
| File | What |
|------|------|
| `src/data/degrees/index.ts` | Re-exports `allPrograms` (combined) |
| `src/data/degrees/academic.ts` | ACADEMIC_PROGRAMS: 23 programs with RIASEC profiles + sekhem thresholds |
| `src/data/degrees/academicPrograms.ts` | Institution-specific programs (calculator) |
| `src/data/degrees/vocationalPrograms.ts` | Arts, culinary, tech bootcamps, etc. |
| `src/data/degrees/types.ts` | `Program` interface |
| `src/data/degrees/fieldEnrichment.ts` | PROGRAM_FIELD_MAP for deduplication |
| `src/data/institutions.ts` | 35+ institutions: INSTITUTIONS array + lookups |
| `src/data/degreesData.ts` | 4 universities with sekhem formula configs |
| `src/data/riasecItems.ts` | 42 Hebrew RIASEC items |
| `src/data/testItems.ts` | Career assessment: Q1-Q2 interests, quick picks, army, style, values |

### Sekhem Calculator (`src/utils/sekhemCalculators.ts`)
- **weighted_scaled** (TAU, HUJI, BGU): `Sekhem = w_psy*Psy + w_bag*(Bagrut/120*800)`
  - TAU: psy=0.6, bag=0.4 | HUJI: psy=0.55, bag=0.45 | BGU: psy=0.45, bag=0.55
- **technion_linear**: `Sekhem = 0.5*Bagrut + 0.075*Psychometric - 18`
- TAU Engineering bonus: Math 5 units = +35, Physics 5 units = +25 (capped 800)
- Direct psychometric track: bypass combined threshold if raw psy >= cutoff

### RIASEC Exam
- 42 Hebrew items, 7 per dimension (R/I/A/S/E/C)
- Scoring: Yes=2, Maybe=1, No=0 → raw 0-14 → normalised 0-5: `Math.round((raw/14)*5)`

### Recommendation Engine (`src/utils/recommendationEngine.ts`)
- Dot-product score → group by category → top 5
- 19 categories (Hebrew)
- Avoidance penalty: x0.6 per overlapping tag (multiplicative)
- Programs with `institution: 'אוניברסיטה'` are **excluded** from recommendations (calculator templates only)

### Critical Invariants
1. `Program.institution` must match `InstitutionRecord.name` exactly (case-sensitive)
2. Programs with `institution: 'אוניברסיטה'` are filtered OUT of recommendations
3. A program's `category` must have a matching `CATEGORY_META` entry or it's silently skipped

---

## 4. Design System

### Color Tokens (`src/app/globals.css`)
```
--bg-page:      #f5f4f0   (warm off-white)
--bg-card:      #ffffff
--nav-from:     #1e1b4b   (dark indigo)
--nav-to:       #3730a3   (indigo)
--primary:      #4f46e5   (indigo-600)
--primary-dark: #3730a3
--secondary:    #7c3aed   (violet-700)
--text-heading: #1a1a2e
--text-body:    #374151
--text-muted:   #6b7280
--border:       #e5e7eb
```

### Logo
- File: `public/logo.jpg.PNG` — blue-gray mountain climber on white background
- In dark nav: `LogoCanvas` component strips white pixels via Canvas + brightens to white (height 70px)
- On light backgrounds: scale-crop trick with `overflow-hidden` + `scale-[1.1]`

### Components
- **NavBar** — Sticky dark indigo nav on all non-landing screens. Left: LogoCanvas. Center: breadcrumb. Right: saved count.
- **LogoCanvas** — Canvas-based logo with white bg removal + optional brighten
- **PaintingCanvas** — Similar canvas technique for bar's Bauhaus painting, removes cream backdrop
- **NeoButton** — Neo-brutalist button (`border-2 border-black`)
- Icons: Lucide React, thin outline, stroke-width 1.5-1.8, fill none
- Cards: `bg-white border border-[#e5e7eb] rounded-2xl shadow-sm`

### Neo-brutalist Elements (used in calculator results, degree picker)
- Filter pills: `border-2 border-black rounded-full`
- Selected state: `bg-[#A6FAFF]`, cyan checkmark circle
- Institution cards: `border-2 border-black rounded-[14px]`
- Status badges: `border-2 border-black font-extrabold`
  - Green `bg-[#34D399]` → "מתקבל/ת"
  - Yellow `bg-[#FCD34D]` → "קרוב/ה לסף"
  - Red `bg-[#EF0000]` → "לא מתאפשרת קבלה"

---

## 5. Git / PR Workflow

### Repo
`Toar-academic-guide/toar-academic-guide` on GitHub

### Process
1. Branch: `feat/short-description` or `fix/short-description`
2. Stage named files only — **never** `git add .`
3. Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:` + Co-Authored-By trailer
4. Push: `git push -u origin <branch>`
5. Check existing PR first: `gh pr view --json url,state 2>/dev/null`
6. Create via `gh pr create` — CODEOWNERS auto-requests `@funksinatra`
7. **Never push directly to main**

### Currently Open
- [PR #30](https://github.com/Toar-academic-guide/toar-academic-guide/pull/30) — `fix/after-cartoon-align-right`: restores `dir="ltr"` on the after-cartoon section so it right-aligns. Awaiting `@funksinatra` review.

### Environment
- `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are already in Vercel for preview + production. Don't treat them as missing.
- Monday board: `https://malichi-hub.monday.com/boards/18407769281` — source of truth for tasks

---

## 6. Amit's Backend Layer (merged to main)

Amit's `feat/backend-data-foundation` (18 commits, 57 files) is live in main:
- `src/db/schema.ts` — Drizzle schema: 14 tables (institutions, programs, program_institutions, admission_requirements, admission_thresholds, university_calculator_configs, source_urls, requirement_versions, users, user_profiles, saved_programs, uploaded_documents, ingestion_sources/jobs/payloads, review_items)
- `src/db/migrations/` — 2 migrations (0000 creates tables; 0001 adds calculator configs + RLS)
- `src/db/seeds/catalogueSeed.ts` — derives all rows from static TypeScript data
- `src/server/catalogue/queries.ts` + serializers — server-side DB query layer
- `src/app/api/catalog/institutions/route.ts` + `programs/route.ts` — API routes
- `scripts/seed-catalogue.mjs` — seed the live DB
- Vitest suite added

---

## 7. User Accounts / Auth Status

### Phase 1 (DONE in PR #5, merged)
Supabase auth scaffolding: `@supabase/ssr` clients, middleware, AuthContext, AuthScreen (RTL email/password), layout wraps AuthProvider. App stays fully usable anonymously.

### Phase 2 (READY to build)
Full data sync. Build `user_profiles` + `saved_programs` sync on top of Amit's Drizzle layer, keyed to Supabase auth user id.
- Refactor `useUserProfile.ts` for dual-mode: localStorage when logged out, Supabase when logged in
- Migration on first login: merge localStorage data into DB row

### Phase 3 (NOT started)
Profile screen + NavBar avatar (AvatarButton component)

### Phase 4 (NOT started, independent)
Shareable image card (`html-to-image`) of the bucket list — accepted vs. gap split. Can be built anytime, no backend dependency.

---

## 8. Sekhem Data Expansion Plan

**Goal:** Make all 79 institutions useful (currently only 4 have calculator support).

| Phase | What | Institutions | Programs | Est. Sessions |
|-------|------|-------------|----------|---------------|
| 0 | Foundation: add `minimum_floors` formula type for colleges | 0 | 0 | 1 |
| 1 | Complete 7 research universities (add Haifa, Bar-Ilan, Ariel) | 3 upgraded | ~36 | 1 |
| 2 | Engineering + academic colleges (Afeka, HIT, ORT Braude, etc.) | ~21 | ~105 | 2 |
| 3 | Vocational skeleton (arts, music, cooking, bootcamps, etc.) | ~40 | ~80 | 1-2 |
| 4 | Polish & fill gaps | all | varies | 1 |

Key code changes for Phase 0:
- `src/types/index.ts` — add `minimum_floors` formula type
- `src/db/schema.ts` — extend DB enum + minimum score columns
- `src/utils/sekhemCalculators.ts` — college admission calculator logic

---

## 9. Career Assessment — Hebrew Copy Status

The career assessment test (`src/data/testItems.ts`) was reviewed word-by-word with Yonatan. All approved Hebrew copy changes for Sections 1-5 have been **implemented and merged** (PR #19 + PR #24).

### Style Rules (locked for all assessment copy)
- Colon (:) after ALL option titles
- Regular hyphen (-) only — never em-dash or en-dash
- Gender-inclusive (את/ה, בחר/י, נחשף/ת, etc.) on question prompts
- Dots (.) at end of ALL subtitles
- No word repetition between title and subtitle
- Infinitive verb form in subtitles
- First person in answer descriptions ("שאני" not "שאתה")

### Section Structure
1. **Q1** (12 options, maxSelect 3): "מה מהבאים הכי מושך אותך?"
2. **Q2** (12 options, maxSelect 3): "באילו עולמות תוכן ומחקר היית רוצה להתעמק?"
3. **Quick Picks** (8 items): Yes/Maybe/No quick RIASEC items
4. **Army/Sherut Leumi**: ARMY-1 (11 options, maxSelect 3) + ARMY-2 (7 options, maxSelect 2)
5. **Style & Preferences**: Q3-Q8 (multiple choice, 4-5 options each)
6. **Values**: 4 slider axes (hourglass/bowtie SVG slider, 5 stops, -2 to +2)

### Values Slider — Custom Design (implemented)
Hourglass/bowtie SVG track with cubic bezier taper. Colors: base `#e8f7fa`, active `#85B7EB`, thumb stroke `#534AB7`. Smooth drag with snap on release. Labels: ממש / קצת / שווה / קצת / ממש.

### Deferred UI Work
- Whether to remove transition screens for Sections 1, 2, 4, 5
- Visual design polish of all question types
- Info tooltips on Q1/Q2 options

---

## 10. Landing Page / Calculator Results — Current Design

### Hero Layout
Two-column grid (RTL):
- **Right (content):** "חושב/ת על לימודים?" + "Let's find your way!" + large "מה.איפה.איך" + "הכל במקום אחד" + three מה/איפה/איך cards + PaintingCanvas below
- **Left (calculator card):** White card with inputs: ציון פסיכומטרי, ממוצע בגרות, מה תרצה ללמוד? dropdown → "חשב סיכויים ←" button

### Calculator Results Page (`src/components/CalculatorResults.tsx`)
- Filter pills (neo-brutalist): סוג מוסד (אוניברסיטה/מכללה) + אזור (צפון/מרכז/דרום/חו"ל)
- Institution cards grouped by region with admission status badges
- Collapsed: 3 per region, expandable "הצג/י הכל"
- חו"ל tooltip with abroad-studies pitch
- Institution logos: `logoUrl` → Google favicon proxy → generic icon

---

## 11. Known Sharp Edges

1. **Two clones existed.** The real project is at `C:\Users\Yonatan\toar-academic-guide`. An older clone at `C:\Users\Yonatan\OneDrive\Desktop\soldier-academic-guide` is stale — don't use it.
2. **Next.js 16 is NOT the version you know.** Read `node_modules/next/dist/docs/` before writing any Next.js code. `cookies()` is async, and there are breaking API changes.
3. **RTL/LTR gotcha.** The page root is `dir="rtl"`. Some sections (like cartoon images) need explicit `dir="ltr"` to right-align correctly. This has caused bugs before (see PR #30).
4. **`institution: 'אוניברסיטה'` filter.** Programs with this literal string as institution are excluded from the recommendation engine. Only use it for calculator templates.
5. **Case-sensitive institution name matching.** `Program.institution` must exactly match `InstitutionRecord.name` — breaks logo display and gap analysis if mismatched.
6. **PostHog analytics.** PostHog tracking was broken on Vercel and restored in PR #23. When touching event handlers, verify PostHog still fires.

---

## 12. Useful Commands

```bash
# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Run tests
npm test

# Seed the database
node scripts/seed-catalogue.mjs

# Check PR status
gh pr list --state open

# View Monday board tasks
# Board URL: https://malichi-hub.monday.com/boards/18407769281
```

---

## 13. Open Questions / Decisions Pending

1. **Phase 2 sync implementation** — build `user_profiles` + `saved_programs` on Amit's Drizzle layer? Or adjust approach?
2. **Sekhem expansion Phase 0** — when to start adding `minimum_floors` formula type for colleges?
3. **Transition screens** — remove for Sections 1, 2, 4, 5 of the assessment? Still undecided.
4. **Image sharing (Phase 4)** — `html-to-image` library approved but not implemented yet. Independent of backend.
5. **Info tooltips on Q1/Q2** — deferred, not yet designed.

---

*This document consolidates all context from Claude Code memory files and plan files. The codebase, CLAUDE.md, AGENTS.md, and git history speak for themselves — this file captures the rest.*

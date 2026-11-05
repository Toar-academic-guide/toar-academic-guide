---
title: Open days across institutions
date: 2026-11-05
type: feat
execution: code
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
---

# Open days across institutions

## Goal Capsule

**Objective.** Prospective students can compare upcoming open days across universities and colleges and reach the official information they need to attend.

**Product authority.** Amit approved the coverage, publication and maintenance rules below for [issue #381](https://github.com/Toar-academic-guide/toar-academic-guide/issues/381). Codex owns the initial source checks and calendar data. Grok takes over ongoing maintenance after the first version.

**Launch dependencies.** The public page needs a verified initial dataset and a way to read confirmed updates from the [Open Days board](https://malichi-hub.monday.com/boards/18438707562). Board setup alone does not enable publication or start Grok.

## Product Contract

### Summary

Students will find upcoming dates in one sortable Hebrew table at `/open-days`. Monday holds both the list of institutions to revisit and the dated events eligible for the calendar.

### Requirements

**Student calendar**

- **R1.** Cover every university and college in the MyWay catalogue, including institutions that currently have no announced date.
- **R2.** List one row per officially dated upcoming event. Include institution-wide and faculty open days, on campus and online. Combine duplicate announcements for the same event. For a multi-day event, retain the full announced date range.
- **R3.** Show the institution, faculty when applicable, date, campus or `אונליין` when confirmed, and the last successful source check (`נבדק לאחרונה`). Use concise Hebrew and plural address.
- **R4.** Link `לפרטים` to the official announcement as soon as a date is confirmed. Use `להרשמה` when there is an active official registration path for that event.
- **R5.** Make the calendar discoverable through the sitemap and relevant internal links.

**Monday and Grok**

- **R6.** Keep one institution item in **Institutions to check**, with its official discovery page and last check. Keep one event item in **Upcoming events**, linked to its institution item, with event name, dates, campus or online format, optional faculty, announcement, optional registration link, last check, status and review fields.
- **R7.** Check each institution weekly. Recheck each event daily during the final seven days before it starts. Record a successful source check separately from a failed attempt. A missing date means the institution stays on the checklist.
- **R8.** Automatically publish changes supported by an unambiguous official announcement, including an explicit cancellation. Mark conflicting official information or a disappearing source for Amit in Monday and preserve the last confirmed facts until resolved. Keep review notes internal.

### Verification

1. In Monday, open an event and follow its institution reference and official announcement. Compare the dates and registration action. An institution can appear in the checklist with zero upcoming events.
2. For the public release, open `/open-days` at 1280px and 390px, sort by date, and follow a details link and an available registration link. The destinations must match their events. Check Hebrew alignment and the distinction between faculty, campus and online listings. Capture both widths for Amit before merge.
3. During integration, verify that a confirmed venue change reaches the public row and a conflicting or unavailable source creates a review flag without publishing an unverified change.

### First-version handoff

The board uses **Confirmed** for publishable events and **Cancelled** for explicit cancellations. Store the institution item's Monday URL in **Institution item**. Put the institution and event label in the item name, separated by ` — `. Use **End date** only when an event spans multiple days. If an official source becomes ambiguous, record the competing evidence in **Review notes** and keep the published fields at their last confirmed values.

The website reads the board server-side with `MONDAY_API_TOKEN` and refreshes its cache every 15 minutes. Local and preview environments without the token use the checked-in first edition. Production requires board access. Grok's scheduling and credentials are managed separately.

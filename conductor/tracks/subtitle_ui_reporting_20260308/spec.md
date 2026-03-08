# Specification: Subtitle UI Reporting & Targeted Search

## Overview
Subtitle status reporting in the UI is broken or absent across multiple levels. Movies show a green badge for existing subtitles *in addition to* keeping the gray "no subtitles" badge instead of replacing it. Series don't report subtitle status at any level (series, season, or episode). Users cannot trigger subtitle searches from within detail pages. The daily automated subtitle task searches *all* missing subtitles indiscriminately, which is expensive and unnecessary.

## Problem
1. **Movie badges:** When subtitles exist, a green badge appears but the gray "missing" badge remains, showing both simultaneously.
2. **Series badges:** No subtitle status indicators at the series overview, season accordion, or episode row level.
3. **No on-demand search:** Users must navigate to a separate subtitles section to trigger searches. There's no "Search Subtitles" action on the movie detail page or episode row.
4. **Exhaustive daily search:** The scheduled subtitle automation searches for *all* missing subtitles across the entire library every run, hammering subtitle providers unnecessarily. It should only search for recently-added or recently-failed items.

## Scope

### Badge Fixes (Movies)
- Fix the movie detail page and movie library card so that when subtitles exist for a variant, the gray badge is *replaced* by the green badge, not shown alongside it.
- Ensure the badge correctly reflects the state: green = all wanted languages present, yellow = some present, gray = none present.

### Badge Implementation (Series)
- Add subtitle status aggregation at three levels:
  - **Episode row:** Badge showing subtitle status for that episode's file variant(s).
  - **Season accordion header:** Aggregated badge (e.g., "8/10 episodes have subtitles").
  - **Series overview card / detail header:** Top-level summary (e.g., green if all monitored episodes have subtitles, yellow if partial, gray if none).
- Use the existing `VariantSubtitleTrack` and `VariantMissingSubtitle` data already in the API responses.

### On-Demand Subtitle Search
- Add a "Search Subtitles" button/action to:
  - Movie detail page (searches for all missing subtitle languages for that movie's variant).
  - Episode row in series detail (searches for that specific episode).
  - Season header (batch search for all episodes in that season missing subtitles).
- Wire these to existing `SubtitleAutomationService` or a new targeted endpoint.
- Show progress/results via toast or inline status update.

### Targeted Daily Search
- Modify the daily subtitle cron job to only search for:
  - Media added in the last N days (configurable, default 7).
  - Previously-failed searches that are eligible for retry.
  - Explicitly monitored items with `WantedSubtitle` records in `PENDING` or `FAILED` state.
- Do NOT re-search the entire library on every run.

## Out of Scope
- Subtitle provider configuration changes (the existing settings page covers this).
- Manual subtitle upload or editing.
- Subtitle format conversion (e.g., `.ass` to `.srt`).

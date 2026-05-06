# Wanted List Dashboard (SPA)

## Overview

Build a comprehensive Wanted List page in the React SPA that surfaces all missing movies and episodes, providing users with central control over manual searches, auto-search monitoring, and missing-item prioritization. This is a core *arr parity feature currently absent from the web interface.

## Problem Statement

Users have no single view to see everything their library is missing. Missing movies and episodes are only discoverable by browsing individual series/movie detail pages. There is no way to bulk-search missing items, filter by monitored status, or understand why auto-search has not yet grabbed a release. This forces users to manually hunt through their library to find gaps.

## Solution

Create a unified `/wanted` route with tabbed views for Movies and Episodes:

### Missing Movies View
- Table/grid of all missing (monitored) movies with poster, title, year, quality profile
- Status column: missing, searching, grabbed, unavailable
- Sort by: title, year, added date, last search date
- Filter by: quality profile, status, monitored/unmonitored
- Bulk actions: search selected, toggle monitored, delete from wanted

### Missing Episodes View
- Table/grid of all missing (monitored) episodes with series poster, series name, season/episode, air date
- Group by series (collapsible seasons)
- Status column: missing, airing soon, searching, grabbed
- Sort by: air date, series name, episode number, last search date
- Filter by: series, season, status, monitored/unmonitored
- Bulk actions: search selected, toggle monitored

### Search Integration
- One-click manual search per item (opens existing interactive search modal)
- Bulk auto-search button with progress indicator
- "Search Monitored" button to trigger `WantedSearchService.autoSearchAll()`
- Display last search time and result count per item

### Detail Panel
- Side drawer or expandable row showing why item is missing
- Air date / physical release date
- Quality profile constraints
- Last search results summary (releases found, best score, rejection reasons)

## Acceptance Criteria

- [ ] `/wanted` route is accessible from the sidebar navigation
- [ ] Missing movies list loads with pagination (default 25/page)
- [ ] Missing episodes list loads, grouped by series
- [ ] Manual search button per row opens the existing search modal pre-filtered
- [ ] Bulk search sends requests and shows toast notifications
- [ ] Filters update the query params and are shareable via URL
- [ ] Monitored toggle per item persists via API
- [ ] Loading, empty, and error states are handled
- [ ] Integration tests cover route rendering, filtering, and search action dispatch
- [ ] TypeScript typecheck passes; build succeeds

## Out of Scope

- Custom search profiles per wanted item
- RSS feed-specific wanted logic
- Predictive "when will this air" features
- Wanted list email/notification digests (notification transports already exist)

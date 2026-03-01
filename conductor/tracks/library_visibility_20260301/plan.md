# Implementation Plan: Library Visibility & Dashboard

## Phase 1: Series & Episode Status Indicators
> Goal: Make the Series Detail page accurately reflect what is missing, downloading, or available.

- [x] Task: Backend API for Series/Season Stats
    - [x] Sub-task: Ensure `GET /api/series/:id` returns aggregated stats (total episodes, episodes on disk, episodes missing, episodes downloading).
    - [x] Sub-task: Ensure Season and Episode payloads include clear status flags (`hasFile`, `isDownloading`).
- [x] Task: Frontend Series Detail UI Updates
    - [x] Sub-task: Add a visual progress bar to the Series header (e.g., "45/50 Episodes").
    - [x] Sub-task: Add a progress bar to each Season accordion header before expanding.
    - [x] Sub-task: Update Episode rows to show distinct visual badges (e.g., "Missing", "Available", "Downloading") when expanded.

- [x] Task: Conductor - User Manual Verification 'Phase 1'

## Phase 2: Calendar View
> Goal: Provide a monthly view of upcoming monitored media.

- [x] Task: Backend Calendar API
    - [x] Sub-task: Create `GET /api/calendar` endpoint that accepts start and end dates.
    - [x] Sub-task: Aggregate upcoming monitored Episodes (based on `airDateUtc`).
    - [x] Sub-task: Aggregate upcoming monitored Movies (based on `physicalRelease` or `digitalRelease`).
- [x] Task: Frontend Calendar UI
    - [x] Sub-task: Build a calendar grid component defaulting to a Monthly view.
    - [x] Sub-task: Render episode and movie posters/titles on their respective dates (only monitored items).
    - [x] Sub-task: Add a one-click "Search" action button on calendar items where the release date is in the past.
    - [x] Sub-task: Wire up navigation (Next/Prev Month, Today).

- [x] Task: Conductor - User Manual Verification 'Phase 2'

## Phase 3: Dashboard Landing Page [checkpoint: 7dffa2fc]
> Goal: Create a useful home screen for the application.

- [x] Task: Backend Dashboard APIs
    - [x] Sub-task: Create endpoints or reuse existing ones for "Recently Added" (recently added to the library database).
    - [x] Sub-task: Create endpoint for "Disk Space" (querying OS for configured root folder free space).
- [x] Task: Frontend Dashboard UI
    - [x] Sub-task: Build "Recently Added" widget (carousel or grid of posters).
    - [x] Sub-task: Build "Upcoming" widget (mini-list of the next 7 days from the Calendar API).
    - [x] Sub-task: Build "Active Downloads" widget (mini-view of the Queue API).
    - [x] Sub-task: Build "System Status" widget (Disk space bars).
    - [x] Sub-task: Set Dashboard as the default `/` route.

- [x] Task: Conductor - User Manual Verification 'Phase 3'

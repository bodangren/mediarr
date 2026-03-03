# Implementation Plan: Automated Search and Download

## Phase 1: Scoring Engine and Candidate Ranking [checkpoint: fe8369d]
> Goal: Enhance the current scoring engine to support a holistic "Best Candidate" selection process.

- [x] Task: Extend `CustomFormatScoringEngine` with Confidence and Indexer Score [1071b8a]
    - [x] Sub-task: Integrate `FilenameParsingService` to compute a "Confidence" score based on title matching.
    - [x] Sub-task: Add `IndexerPriority` scoring to the engine (read from database).
    - [x] Sub-task: Add `Seeds` count as a weighted scoring factor.
- [x] Task: Update `MediaSearchService.searchAllIndexers` [1071b8a]
    - [x] Sub-task: Ensure the updated scoring is applied to all results and sorted accordingly.
- [x] Task: Write unit tests for the enhanced scoring engine and search aggregation. [1071b8a]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Scoring Engine' (Protocol in workflow.md)

## Phase 2: Automated Search Backend
> Goal: Implement the backend logic to identify missing media and trigger automated downloads.

- [ ] Task: Implement `WantedSearchService`
    - [ ] Sub-task: Create a service to find monitored media (Movies/Episodes) with missing paths.
    - [ ] Sub-task: Add a method to trigger an automated search for a specific item, selecting and grabbing the best candidate.
    - [ ] Sub-task: Implement minimum score threshold logic for automatic grabbing.
- [ ] Task: Improve `RssMediaMonitor`
    - [ ] Sub-task: Use the new scoring engine to decide whether to grab a release found in RSS.
- [ ] Task: API Endpoints
    - [ ] Sub-task: `POST /api/wanted/search-all` — trigger a background task for all missing media.
    - [ ] Sub-task: `POST /api/media/:id/auto-search` — trigger an automated search for a specific item.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Automated Search Backend' (Protocol in workflow.md)

## Phase 3: Scheduler and Event Wiring
> Goal: Wire automation into background tasks and existing media events.

- [ ] Task: Background Scheduler Wiring
    - [ ] Sub-task: Add a scheduled job in `Scheduler.ts` for periodic "Wanted Search".
- [ ] Task: Event Triggers
    - [ ] Sub-task: Hook into the "Movie Added" / "Series Added" events to trigger automated search on-add.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Scheduler and Event Wiring' (Protocol in workflow.md)

## Phase 4: Frontend Integration
> Goal: Provide UI triggers for automated searches.

- [ ] Task: Media Detail UI
    - [ ] Sub-task: Add "Auto-Search" button to `MovieActionsToolbar` and Series detail page.
- [ ] Task: Dashboard UI
    - [ ] Sub-task: Add "Search Missing" button to the Dashboard/Overview.
- [ ] Task: Activity Logs
    - [ ] Sub-task: Ensure automated grab attempts (successful or skipped) are visible in the Activity History.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Frontend Integration' (Protocol in workflow.md)

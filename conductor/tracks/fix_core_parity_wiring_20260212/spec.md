# Specification: Track 9 Remediation - Clone Parity Gap Recovery

## Overview
This track executes the **Synthesized Action Plan** from the "Clone Parity Gap Investigation" (Track 9). It addresses all identified P0, P1, and P2 gaps to bring the Mediarr implementation into functional alignment with its architecture and the behaviors of Prowlarr, Sonarr, Radarr, and Bazarr.

The execution strategy follows a **Severity-Based (Option A)** approach: stabilizing the critical backend wiring (P0) first, then enabling operational controls (P1), followed by feature parity (P1) and reliability polish (P2).

## Functional Requirements

### Phase 1: Critical Core Wiring (P0 Blockers)
**Goal:** Unblock the primary "Search -> Grab" loop at the API level.

1.  **Wire Indexer Definitions (RMD-001)**
    *   **Finding:** `IndexerFactory` initialized with empty array in `main.ts`.
    *   **Requirement:** Instantiate `DefinitionLoader`, load Cardigann YAMLs from disk, and pass to `IndexerFactory` at boot.
    *   **Verification:** Runtime factory must report >0 loaded definitions.

2.  **Implement Indexer Search Method (RMD-002)**
    *   **Finding:** `MediaSearchService` calls `indexer.search()`, but method is missing on `BaseIndexer`.
    *   **Requirement:** Implement abstract `search()` in `BaseIndexer` and concrete logic in `TorznabIndexer`/`ScrapingIndexer` to return normalized `SearchResult[]`.

3.  **Harden Metadata API Keys (RMD-003)**
    *   **Finding:** `MetadataProvider` silently defaults to 'demo' key; no configuration path.
    *   **Requirement:**
        *   Inject `tmdbApiKey` from `AppSettings` service.
        *   Throw explicit error if key is missing/invalid (no silent failure).
        *   Validate key readiness at boot.

### Phase 2: Operational Scaffolding (High-Impact P1)
**Goal:** Enable user configuration and control via the Frontend.

4.  **Settings Editor UI (RMD-007)**
    *   **Finding:** Settings page is a scaffold; cannot configure keys or paths.
    *   **Requirement:** Implement fully functional `/settings` form (General, Indexers, Download Clients, **API Keys**).

5.  **Queue Controls (RMD-005)**
    *   **Finding:** Queue UI is read-only.
    *   **Requirement:** Add "Pause", "Resume", "Remove" actions to the Queue table and wire to existing API endpoints.

6.  **Ignite Background Scheduler (RMD-004)**
    *   **Finding:** Scheduler services exist but are never started.
    *   **Requirement:** Initialize `Scheduler`, `RssSyncService`, and `TorrentManager` loop in `main.ts`.

### Phase 3: Feature Parity (P1 Gaps)
**Goal:** Deliver the missing "Clone" capabilities.

7.  **Dynamic Indexer Configuration (RMD-004)**
    *   **Finding:** Frontend hardcodes fields; Backend has dynamic schema.
    *   **Requirement:** Implement dynamic form builder in `/indexers` consuming `configContract` (Prowlarr parity).

8.  **Subtitle Console & Provider (RMD-006)**
    *   **Finding:** Provider is a stub; UI is a placeholder.
    *   **Requirement:**
        *   Implement real `OpenSubtitlesProvider` (or similar).
        *   Implement `/subtitles` UI with Inventory, Search, and Download actions (Bazarr parity).

9.  **Episode Monitoring Persistence (RMD-008)**
    *   **Finding:** Episode toggle is local-only.
    *   **Requirement:** Wire episode monitoring toggle to persistent backend API.

### Phase 4: Reliability & Polish (P2/P3)
**Goal:** Improve robustness and observability.

10. **Dashboard Completeness (RMD-010)**
    *   **Requirement:** Add missing widgets (Calendar, Disk Space, Activity Feed).

11. **Activity Filtering (RMD-011)**
    *   **Requirement:** Implement Event Type and Date Range filters on `/activity`.

12. **Resilience Improvements**
    *   **Requirement:** Add retry/fallback logic for TV Search (SkyHook).
    *   **Requirement:** Ensure WebTorrent graceful fallback is properly logged/surfaced in Health.

## Non-Functional Requirements

1.  **Strict TDD (Integration Level):**
    *   **Constraint:** Every P0/P1 backend fix MUST be preceded by a **non-mocked integration test** (e.g., testing `IndexerFactory` with real files, not `vi.mock`).
    *   **Goal:** Eliminate the "False Confidence" gap identified in Track 9.

2.  **Mobile Responsiveness:**
    *   **Constraint:** All new UI interactions (Queue buttons, Settings forms, Subtitle controls) must be verified on mobile viewports (375px+).

## Acceptance Criteria
- [ ] Server boots with loaded definitions and active scheduler.
- [ ] `indexer.search()` returns real results for Cardigann and Torznab indexers.
- [ ] Movie search fails explicitly without key, succeeds with key.
- [ ] Settings page persists changes (including API keys) to backend.
- [ ] Queue allows Pause/Resume/Remove from UI.
- [ ] Subtitle search returns real results and downloads successful.
- [ ] All P0/P1 Findings from Track 9 are marked `VERIFIED_FIXED`.

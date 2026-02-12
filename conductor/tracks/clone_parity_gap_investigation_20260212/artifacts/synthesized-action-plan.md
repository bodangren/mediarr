# Synthesized Action Plan: Clone Parity Recovery

**Date:** 2026-02-12
**Status:** APPROVED
**Based on:** Baseline Audit, Opus Evaluation, Gemini Investigation

## Executive Summary
All three independent investigations verify that Mediarr's core architecture is sound, but its **runtime wiring is disconnected**. The system is currently a "Potemkin Village": beautiful UI shells and robust service classes that are simply not plugged into each other at the `main.ts` entry point or API layer.

We must shift focus immediately from "Feature Expansion" to **"Runtime Integration"**.

---

## 1. The Critical Path (P0 - Immediate Action)

**Goal:** Unblock the core loop (Search -> Grab -> Download).

### Action 1.1: Wire the Indexer Definitions
*   **Finding:** `main.ts` initializes `IndexerFactory` with an empty array.
*   **Fix:** Instantiate `DefinitionLoader`, load YAMLs from disk, and pass to Factory.
*   **Owner:** New Track `fix_core_parity_wiring`

### Action 1.2: Implement Missing `search()` Method
*   **Finding:** `MediaSearchService` calls `indexer.search()`, but this method does not exist on the `BaseIndexer` class hierarchy.
*   **Fix:** Implement abstract `search()` in `BaseIndexer` and concrete implementations in `TorznabIndexer`/`ScrapingIndexer`.
*   **Owner:** New Track `fix_core_parity_wiring`

### Action 1.3: Harden Metadata & API Keys
*   **Finding:** `MetadataProvider` defaults to `'demo'` key silently.
*   **Fix:** Inject `tmdbApiKey` from settings. Throw explicit error if missing.
*   **Owner:** New Track `fix_core_parity_wiring`

---

## 2. Operational Scaffolding (P1 - Fast Follow)

**Goal:** Make the application actually run background tasks and accept configuration.

### Action 2.1: Ignite the Scheduler
*   **Finding:** `Scheduler`, `RssSyncService`, and `TorrentManager` sync loops exist but are never started.
*   **Fix:** Initialize and start these services in `main.ts`.
*   **Owner:** New Track `fix_core_parity_wiring`

### Action 2.2: Functional Settings Editor
*   **Finding:** Settings UI is hardcoded. Backend expects JSON but Frontend sends nothing useful.
*   **Fix:** Build a real Settings form that reads/writes to `AppSettings` (needed for Action 1.3).
*   **Owner:** Existing Track `ui_dashboard_settings_20260211` (Track 7E)

### Action 2.3: Queue Controls
*   **Finding:** Queue UI is read-only.
*   **Fix:** Wire "Pause", "Resume", "Remove" buttons to existing API endpoints.
*   **Owner:** Existing Track `ui_operational_hardening_20260211` (Track 7D)

---

## 3. Parity Features (P1/P2 - Strategic)

**Goal:** Reach functional equivalence with *arr apps.

### Action 3.1: Dynamic Indexer Configuration (Prowlarr)
*   **Finding:** Frontend hardcodes fields; Backend has dynamic schema.
*   **Fix:** Implement dynamic form builder based on `configContract`.
*   **Owner:** New Track `feature_dynamic_indexer_config`

### Action 3.2: Subtitle Console (Bazarr)
*   **Finding:** Provider is a stub; UI is a placeholder.
*   **Fix:** Implement `OpenSubtitlesProvider` and the Subtitle Search UI.
*   **Owner:** Existing Track `ui_operational_hardening_20260211` (Track 7D)

---

## 4. Execution Roadmap & Track Realignment

We will reorganize the Conductor tracks to execute this plan efficiently.

| Sequence | Track Name | Scope |
| :--- | :--- | :--- |
| **1. NOW** | **`fix_core_parity_wiring_20260212`** | **(NEW)** Fix P0 backend wiring (Definitions, Search Method, Keys, Scheduler). **Hard blocker for everything else.** |
| **2. Next** | `ui_operational_hardening_20260211` (7D) | **(Scope Update)** Focus heavily on Queue Controls & Subtitle Provider. |
| **2. Next** | `ui_dashboard_settings_20260211` (7E) | **(Scope Update)** Prioritize Settings Editor over Dashboard widgets (needed for Keys). |
| **3. Later** | `feature_dynamic_indexer_config` | **(NEW)** Build the complex Prowlarr-style dynamic UI. |
| **4. Final** | `ui_e2e_hardening_20260211` (7F) | **(Gate)** Cannot start until P0/P1s are verified with integration tests. |

## 5. Validation Standard

**New Rule:** No feature is "Done" until it has a **Non-Mocked Integration Test**.
- *Bad:* `vi.mock('webtorrent')` -> "It works!"
- *Good:* `TestTorrentEngine` (real adapter) -> "It actually downloaded bytes."

We must stop mocking the things we are trying to verify.

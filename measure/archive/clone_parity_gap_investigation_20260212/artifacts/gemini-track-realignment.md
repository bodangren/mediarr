# Track Realignment & Delivery Gating (Gemini)

**Date:** 2026-02-12
**Executor:** Gemini Agent

## Executive Summary
Track 9 investigation confirms that while the scaffolding is robust, critical runtime wiring for "Clone Parity" is missing or broken.

## Gating Policy
**Hard Gate:** Track 7F (E2E Hardening) **CANNOT** be marked complete until all P0 Remediation Items are `verified`.
**Soft Gate:** Track 8 (DLNA) should be deprioritized until P1 items in Core/Settings are resolved to ensure a stable foundation.

## Proposed New Tracks

### Track: `fix_prowlarr_parity_20260212`
**Focus:** Indexer Definition & Contract Parity
**Scope:**
1.  Update `main.ts` to load definitions via `DefinitionLoader`.
2.  Update `indexerRoutes` to accept JSON object settings.
3.  Implement Dynamic Form Builder in frontend (`indexers/page.tsx`).
4.  Verify end-to-end Indexer creation (Cardigann).

### Track: `fix_radarr_parity_20260212`
**Focus:** Metadata & API Key Parity
**Scope:**
1.  Add `tmdbApiKey` to AppSettings schema.
2.  Expose configuration in `settings/page.tsx`.
3.  Inject key into `MetadataProvider`.
4.  Verify Movie Search with custom key.

## Updates to Existing Tracks

### `ui_operational_hardening_20260211` (Track 7D)
- **Status:** Critical Path.
- **Must Deliver:** Queue controls (Pause/Resume) and Subtitle Inventory. These are currently scaffolded/placeholder.

### `ui_dashboard_settings_20260211` (Track 7E)
- **Status:** Critical Path.
- **Must Deliver:** Full Settings Editor (needed for REM-002) and Dashboard Widgets.

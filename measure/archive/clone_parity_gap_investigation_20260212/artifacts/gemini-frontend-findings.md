# Frontend Parity Findings (Gemini)

**Date:** 2026-02-12
**Executor:** Gemini Agent

## Summary
Frontend audit reveals significant gaps in dynamic configuration (Prowlarr parity), subtitle management (Bazarr parity), and operational controls (Queue/Settings).

## Critical Findings (P1)

### 1. Indexer Dynamic Configuration (Prowlarr)
**Status:** MISSING
**Evidence:** `app/src/app/(shell)/indexers/page.tsx` uses hardcoded `ProtocolSettingsState` for Torrent/Usenet.
**Impact:** Indexers with custom config contracts (e.g. Cardigann definitions with unique fields) cannot be configured correctly.
**Remediation:** Implement a dynamic form builder that consumes the `configContract` schema from the backend.

### 2. Subtitle Management (Bazarr)
**Status:** PLACEHOLDER_ONLY
**Evidence:** `app/src/app/(shell)/subtitles/page.tsx` renders an `EmptyPanel` with a "staged" message.
**Impact:** No subtitle operations are available to the operator.
**Remediation:** Implement the subtitle inventory, manual search, and download UI as planned in Track 7D.

### 3. Queue Operations (Core)
**Status:** SCAFFOLDED_ONLY
**Evidence:** `app/src/app/(shell)/queue/page.tsx` renders a read-only `DataTable`.
**Impact:** Operator cannot pause, resume, or remove torrents from the UI.
**Remediation:** Add action buttons to the queue table and wire them to the `torrentApi`.

## Major Findings (P2)

### 1. Settings Editor
**Status:** SCAFFOLDED_ONLY
**Evidence:** `app/src/app/(shell)/settings/page.tsx` has a single hardcoded save action.
**Impact:** Settings are effectively read-only or limited to a single hardcoded subset.
**Remediation:** Implement a comprehensive settings editor form backed by the full settings schema.

### 2. Dashboard Completeness
**Status:** PARTIAL_IMPLEMENTATION
**Evidence:** `app/src/app/(shell)/page.tsx` is missing calendar, activity feed, and disk space widgets.
**Impact:** Reduced observability compared to Prowlarr/Sonarr/Radarr dashboards.
**Remediation:** Implement missing widgets in Track 7E.

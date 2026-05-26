# Spec: Shared Type Contracts (Server ↔ App)

## Overview

Multiple interfaces are duplicated across the server and app codebases with the same name and (presumably) the same shape. If the server changes a field, the app won't know until runtime — there is no compile-time contract linking them. This track extracts shared Zod schemas into a location both workspaces can import, making type drift a build error instead of a runtime bug.

## Problem Statement

The knowledge graph analysis (2026-05-26) found these duplicate definitions:

| Interface | Server Location | App Location |
|-----------|----------------|--------------|
| `BulkUpdateResult` | `MovieRepository.ts`, `SeriesRepository.ts` | `movieApi.ts`, `seriesApi.ts` |
| `SubtitleUploadInput` | `SubtitleInventoryApiService.ts` | `subtitleApi.ts` |
| `ScoringBreakdown` | `MediaSearchService.ts` | `ScoreBreakdownPanel.tsx` |
| `OrganizeResult` | `MovieOrganizeService.ts` | `SeriesOrganizeService.ts` |
| `PlaybackTarget` | `PlaybackService.ts` | (no app counterpart) |
| `PlaybackManifestRequest` | `PlaybackService.ts` | (no app counterpart) |
| `PlaybackProgressKey` | `PlaybackRepository.ts` | (no app counterpart) |
| `StorageLike` | — | `uiPreferences.ts`, `seriesOptionsStore.ts`, `uiStore.ts`, `wantedStore.ts` (4 copies) |

Each pair is manually kept in sync. Nothing enforces that they stay in sync.

## Stories

### S1: BulkUpdateResult shared contract
As a **developer**, I want `BulkUpdateResult` defined once in a shared location so that server and app always agree on the shape.

**Acceptance Criteria:**
```gherkin
Given a shared Zod schema for BulkUpdateResult exists in server/src/contracts/
When MovieRepository.ts imports BulkUpdateResult from the shared schema
And seriesApi.ts imports BulkUpdateResult from the same shared schema
Then both files compile without errors
And changing a field in the schema causes a type error in both consumers
```

**Estimate:** S
**Priority:** Must

### S2: SubtitleUploadInput shared contract
As a **developer**, I want `SubtitleUploadInput` defined once so that the subtitle API client and server service agree on required fields.

**Acceptance Criteria:**
```gherkin
Given a shared Zod schema for SubtitleUploadInput exists in server/src/contracts/
When SubtitleInventoryApiService.ts imports it from the shared location
And subtitleApi.ts imports it from the same shared location
Then both compile without errors
And the Zod schema is used for runtime validation in the server route handler
```

**Estimate:** S
**Priority:** Must

### S3: ScoringBreakdown shared contract
As a **developer**, I want `ScoringBreakdown` defined once so that the backend scoring engine and the frontend ScoreBreakdownPanel always agree on field names.

**Acceptance Criteria:**
```gherkin
Given a shared Zod schema for ScoringBreakdown exists in server/src/contracts/
When MediaSearchService.ts imports it from the shared location
And ScoreBreakdownPanel.tsx imports it from the same shared location
Then both compile without errors
And the panel renders correctly with mock data matching the schema
```

**Estimate:** S
**Priority:** Must

### S4: OrganizeResult shared contract
As a **developer**, I want `OrganizeResult` defined once so that MovieOrganizeService and SeriesOrganizeService share a single definition.

**Acceptance Criteria:**
```gherkin
Given a shared Zod schema for OrganizeResult exists in server/src/contracts/
When MovieOrganizeService.ts imports it from the shared location
And SeriesOrganizeService.ts imports it from the same shared location
Then both compile without errors
And existing organize tests still pass
```

**Estimate:** S
**Priority:** Should

### S5: Playback types shared contracts
As a **developer**, I want `PlaybackTarget`, `PlaybackManifestRequest`, and `PlaybackProgressKey` defined in shared contracts so that the playback subsystem has a single source of truth.

**Acceptance Criteria:**
```gherkin
Given shared Zod schemas for PlaybackTarget, PlaybackManifestRequest, and PlaybackProgressKey exist in server/src/contracts/
When PlaybackService.ts and PlaybackRepository.ts import them from the shared location
Then both compile without errors
And existing playback tests still pass
```

**Estimate:** M
**Priority:** Should

### S6: StorageLike deduplication
As a **developer**, I want `StorageLike` defined once so that the 4 stores using it don't drift.

**Acceptance Criteria:**
```gherkin
Given a shared StorageLike interface exists in app/src/lib/state/types.ts
When uiPreferences.ts, seriesOptionsStore.ts, uiStore.ts, and wantedStore.ts import it from the shared location
Then all 4 files compile without errors
And the old local definitions are deleted
```

**Estimate:** S
**Priority:** Could

## Out of Scope
- Creating a separate npm package for shared contracts (directory-level sharing is sufficient for a monolith)
- Changing the runtime behavior of any service
- Migrating other non-duplicated types

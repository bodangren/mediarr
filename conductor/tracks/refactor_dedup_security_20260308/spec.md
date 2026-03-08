# Spec: Backend Deduplication & Security Hardening

## Problem
Codebase analysis reveals:
1. **Duplicate helper functions** — `latestPlaybackMap()`, `serializePlaybackState()`, `determineEpisodeStatus()`, and query-filter parsing are copy-pasted across movieRoutes, seriesRoutes, and dashboardRoutes.
2. **Silent error swallowing** — 7+ catch blocks discard exceptions without logging, hiding bugs and potential security events.
3. **Missing path-traversal validation** — File operations in seriesRoutes and movieRoutes construct paths from user-supplied data without verifying the result stays within the expected root folder.
4. **Inconsistent error responses** — Some routes use `sendSuccess()`, others use raw `reply.status().send()`.

## Goals
- Extract shared helpers into dedicated utility modules.
- Add a `safePath()` utility that validates resolved paths stay within allowed root directories.
- Replace silent catch blocks with logged error catch blocks.
- Standardize error response format across all API routes.

## Non-Goals
- Splitting large files (subtitleRoutes, App.tsx) — deferred to a future track.
- Replacing `as any` casts — deferred to a future track.
- Changing external API contracts or adding authentication.

## Acceptance Criteria
- All existing tests pass (`CI=true npm test`).
- No duplicate `latestPlaybackMap` / `serializePlaybackState` / `determineEpisodeStatus` definitions remain.
- `safePath()` utility exists with tests and is used in file-operation routes.
- Silent catch blocks are replaced with logged catches.
- Production build succeeds (`npm run build`).

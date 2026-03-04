# Security & Privacy Audit Report

**Date:** March 3, 2026
**Scope:** Changes in the current branch (PR Audit).

## Critical Findings

### 1. Broken Access Control: Global Lack of Authentication
- **Severity:** Critical
- **Location:** `server/src/api/createApiServer.ts` (Lines 152–180)
- **Description:** The application registers all sensitive API endpoints without any authentication or authorization middleware.
- **Impact:** Any user with network access can perform administrative actions and browse the host filesystem.
- **Recommendation:** Implement a robust authentication mechanism (e.g., JWT) globally for all `/api/*` routes.

## High-Severity Findings

### 2. Path Traversal & Information Exposure in `rescan` Endpoint
- **Severity:** High
- **Location:** `server/src/api/routes/seriesRoutes.ts` (Line 624)
- **Description:** `POST /api/series/:id/rescan` allows an unvalidated `folderPath` to trigger a recursive filesystem scan.
- **Impact:** Attackers can scan any directory accessible to the server process, exposing sensitive file structures.
- **Recommendation:** Validate `folderPath` against authorized media root directories.

### 3. Path Traversal & Information Exposure in `import/scan` Endpoint
- **Severity:** High
- **Location:** `server/src/api/routes/seriesRoutes.ts` (Line 1006)
- **Description:** `POST /api/series/import/scan` accepts an arbitrary `path` for recursive directory scanning without validation.
- **Impact:** Unauthorized discovery of files across the host filesystem.
- **Recommendation:** Implement strict path validation against an allowlist.

### 4. Path Traversal in Media Path Construction
- **Severity:** High
- **Location:** `server/src/api/routes/mediaRoutes.ts` (Line 206)
- **Description:** `buildMediaPath` constructs paths by concatenating `rootFolder` with user-supplied `title` and `year` without sanitization.
- **Impact:** Manipulation of `title` with `../` sequences can lead to arbitrary file path manipulation.
- **Recommendation:** Sanitize `title` and `year` inputs to remove path traversal characters.

## Low-Severity Findings

### 5. Privacy: Plain Text API Key Exposure in UI
- **Severity:** Low
- **Location:** `app/src/App.tsx` (Lines 1130–1136)
- **Data Type:** API Secret (OpenSubtitles)
- **Description:** The input field for the OpenSubtitles API key uses `type="text"`.
- **Impact:** Increased risk of accidental exposure (shoulder surfing).
- **Recommendation:** Change input type to `"password"`.

## Additional Review Findings (March 4, 2026)

### 6. Return API Error Envelope for Failed Auto-Search Requests
- **Severity:** Medium (P2)
- **Location:** `server/src/api/routes/mediaRoutes.ts` (Lines 395–397)
- **Description:** When `autoSearchMovie/autoSearchEpisode` returns `success: false`, this route sends a raw `404` body (`{ success: false, error: ... }`) instead of the standard API error envelope used elsewhere.
- **Impact:** The frontend `ApiHttpClient` expects enveloped errors on non-2xx responses, so common “no candidates found” responses become contract violations and callers lose typed error handling.
- **Recommendation:** Return the standard API error envelope for this error path.

### 7. Skip Linked-Episode Fast Path for Multi-File Torrents
- **Severity:** High (P1)
- **Location:** `server/src/services/ImportManager.ts` (Lines 160–164)
- **Description:** The linked-episode fast path runs inside the per-file loop and always uses the same `episodeId`, so every video file in a multi-file torrent is imported as that single episode.
- **Impact:** Season/pack torrents triggered from an episode grab can repeatedly overwrite one episode target and corrupt episode-path assignments.
- **Recommendation:** Gate or skip this fast path for multi-file torrents so file-to-episode mapping is resolved correctly.

### 8. Keep Movie Normalization Compatible with `cleanTitle` Lookup
- **Severity:** Medium (P2)
- **Location:** `server/src/services/ImportManager.ts` (Lines 628–629)
- **Description:** Updated normalization keeps spaces (for example, `"spider man"`), but `movie.cleanTitle` is persisted without separators (for example, `"spiderman"`), so the `cleanTitle contains` clause in `findMovieMatch` no longer matches reliably.
- **Impact:** Valid movie imports can fail when punctuation/spacing differs from database title formatting and the `title contains` fallback misses.
- **Recommendation:** Normalize movie titles in a way that remains compatible with `cleanTitle` matching behavior.

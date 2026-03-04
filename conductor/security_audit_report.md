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

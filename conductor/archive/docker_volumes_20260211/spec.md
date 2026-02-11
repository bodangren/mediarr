# Spec: Docker Volume Architecture & Hard Link Support

## Overview

Refactor Mediarr's Docker configuration and file management to use a proper volume
architecture that supports persistent config storage and hard linking between downloads
and media libraries. This aligns with the conventions used by *arr applications and
enables disk-efficient media organization in home lab environments.

## Functional Requirements

### FR-1: Config Volume (`/config`)
- SQLite database (`mediarr.db`) must reside in `/config` inside the container.
- `DATABASE_URL` must point to `file:/config/mediarr.db`.
- The `/config` path is fixed (convention-over-configuration).

### FR-2: Data Volume (`/data`)
- All media-related files must reside under `/data` inside the container.
- Directory structure:
  ```
  /data/
    downloads/
      incomplete/
      complete/
    media/
      tv/
      movies/
  ```
- `TorrentManager` must use `/data/downloads/incomplete` and `/data/downloads/complete`
  instead of the current hardcoded `/downloads/` paths.

### FR-3: Hard Link Support in Organizer
- `Organizer.organizeFile()` must attempt `fs.link()` (hard link) first.
- If hard linking fails (e.g., cross-device), fall back to `fs.rename()` (move).
- Log a warning on fallback so users know hard linking is not active.

### FR-4: Docker Configuration
- `Dockerfile`: Create `/config` and `/data` directory structures at build time.
- `docker-compose.yml`: Use named volumes mapping to `/config` and `/data`.
- Prisma migration command must run against `/config/mediarr.db`.

### FR-5: Startup Directory Initialization
- On server startup, ensure the required subdirectory structure exists under `/data`
  (`downloads/incomplete`, `downloads/complete`, `media/tv`, `media/movies`).

## Non-Functional Requirements

- Hard links must be transparent to the rest of the application (same file path interface).
- No breaking changes to existing service APIs; only internal path changes.

## Acceptance Criteria

1. Running `docker-compose up` creates persistent named volumes for `/config` and `/data`.
2. SQLite database is created at `/config/mediarr.db` and persists across container restarts.
3. Torrents download to `/data/downloads/incomplete` and complete to `/data/downloads/complete`.
4. `Organizer` hard links files from `/data/downloads/complete` to `/data/media/tv/` (or movies).
5. If hard linking fails, `Organizer` falls back to `fs.rename()` with a logged warning.
6. All existing tests continue to pass with updated paths.

## Out of Scope

- User-configurable paths via UI settings (future track).
- Movie-specific organization (Track 5: Movie Management Module).
- Multiple root folder support.

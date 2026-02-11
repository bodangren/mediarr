# Implementation Plan: Docker Volume Architecture & Hard Link Support

## Phase 1: Docker Configuration & Database Migration [checkpoint: cf46dd1]
Update the container infrastructure and database location.

- [x] Task: Update `Dockerfile` to create `/config` and `/data` directory structures and set `DATABASE_URL` default to `file:/config/mediarr.db`. (5912bf3)
- [x] Task: Update `docker-compose.yml` to use named volumes for `/config` and `/data`, and set environment variables accordingly. (7499950)
- [x] Task: Update `.env` and `prisma.config.ts` to reference the new database path for local development. (95f5295)

## Phase 2: Startup Directory Initialization
Ensure required directories exist at server startup.

- [x] Task: Write Tests: Verify a startup initializer creates the required subdirectory structure under `/data` (`downloads/incomplete`, `downloads/complete`, `media/tv`, `media/movies`). (f23ed3d)
- [x] Task: Implement `DataDirectoryInitializer` service that ensures all required subdirectories exist on server startup. (5c0f656)

## Phase 3: TorrentManager Path Update
Update download paths from hardcoded `/downloads/` to `/data/downloads/`.

- [ ] Task: Write Tests: Verify `TorrentManager` uses `/data/downloads/incomplete` and `/data/downloads/complete` as default paths.
- [ ] Task: Update `TorrentManager` constants and file move logic to use the new `/data/downloads/` paths.

## Phase 4: Hard Link Support in Organizer
Replace `fs.rename()` with hard link strategy and move fallback.

- [ ] Task: Write Tests: Verify `Organizer.organizeFile()` creates a hard link when source and destination are on the same filesystem.
- [ ] Task: Write Tests: Verify `Organizer.organizeFile()` falls back to `fs.rename()` when hard linking fails (cross-device) and logs a warning.
- [ ] Task: Implement hard link with move fallback in `Organizer.organizeFile()`.

## Phase 5: Integration Verification
Ensure all existing functionality works with the new paths.

- [ ] Task: Update any remaining hardcoded path references in tests and configuration.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Integration Verification' (Protocol in workflow.md)

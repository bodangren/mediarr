# Plan — Music library for Mediarr

> Contract-first + TDD per `measure/workflow.md`. This is a **scoped** track: no task is started
> until M1–M5 are decided with the owner and the track is promoted to active.

## Phase 0: Ratify scope

- [ ] Resolve M1 data model (separate artist/album/track tables vs Media extension).
- [ ] Resolve M2 tagging engine (native read vs beets import).
- [ ] Resolve M3 acquisition source under D3 (indexers only; no browser bridge).
- [ ] Resolve M4 playlists and M5 client scope.
- [ ] Confirm the existing `4TB/Music` tree as the migration input and note its size.

## Phase 1: Schema + scanner

- [ ] Contract test for the music domain (artist/album/track, scan summary) written first.
- [ ] Migration + repository layer.
- [ ] Scanner: walk root, read tags, upsert idempotently by path, report unreadable files.
- [ ] Counts test against a seeded fixture tree.

## Phase 2: API + artwork

- [ ] Browse/search endpoints (artist, album, track).
- [ ] Stream with range support, reusing the video stream handler contract.
- [ ] Artwork extraction and serving.
- [ ] Automation contract: wanted/acquire/status with receipt semantics.

## Phase 3: Flutter client

- [ ] Music tab / library screen with focus-safe TV navigation.
- [ ] Album detail + track list; play, seek, resume.
- [ ] Widget tests for the focus walk and playback handoff.

## Phase 4: Migration + tagging quality

- [ ] Import `4TB/Music`; compare counts; quarantine malformed files to a report.
- [ ] Native tag reading vs beets output diff on a sample; decide whether beets stays.
- [ ] Dedupe policy for duplicate albums/tracks.

## Phase 5: Automation

- [ ] DSH automation contract exercised end to end (wanted album → acquire → import → visible).
- [ ] Music job in the automation layer; retire `music-orchestrator` (already disabled).
- [ ] Nightly receipt includes music counts.

## Phase 6: Close

- [ ] Acceptance criteria from `spec.md` verified on the TV box and in the SPA.
- [ ] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`; archive.

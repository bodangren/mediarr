# Plan — Music library for Mediarr

> Contract-first + TDD per `measure/workflow.md`. **Scoped track: no task starts until M1–M6 are
> decided and the track is promoted to active.**

## Phase 0: Ratify scope

- [ ] Resolve M1 model, M2 source, M3 format, M4 tagging, M5 player scope, M6 playlists.
- [ ] Confirm the split: domain/ingest (retires `music-orchestrator`) vs player (TV UI).
- [ ] Confirm `4TB/Music` as the migration input; record size and a sample of tag quality.
- [ ] Confirm `yt-dlp`/`beets`/`ffmpeg` install and update path.

## Phase 1: Domain + scan

- [ ] Contract tests for artist/album/track and the scan summary, written first.
- [ ] Schema/migration; isolated from `TV|MOVIE`.
- [ ] Scanner: walk root, read tags/artwork, upsert by path, report unreadable files.
- [ ] Seeded-tree counts test.

## Phase 2: Ingest pipeline (deterministic)

- [ ] `yt-dlp` audio download + thumbnail; `ffmpeg` convert to M3.
- [ ] beets tag + file into `<Artist>/<Album>/<NN> - <Title>`; untaggable → review folder.
- [ ] Idempotency by video id + audio hash; re-run does not duplicate.
- [ ] Failure reporting per item with tool error; receipt.

## Phase 3: API + artwork

- [ ] Artist/album/track browse + search endpoints.
- [ ] Stream with range support (reuse video handler contract).
- [ ] Artwork extraction/serving (embedded + folder image).
- [ ] Automation contract: picks in, ingest status out.

## Phase 4: Player (Flutter, TV-first) — separate deliverable from the domain

> The domain/ingest phases (1–3) are one shippable track; the player can follow independently.


- [ ] iTunes-style shell: persistent sidebar (Artists, Albums, Songs, Recently Added), album grid,
  track list, now-playing bar, queue.
- [ ] D-pad focus walk: sidebar ↔ grid ↔ list ↔ transport; visible focus; no traps; every control
  reachable (the TV focus rules from prior tracks apply).
- [ ] Play, seek, queue advance, resume, background audio behavior.
- [ ] Widget tests for the focus walk and playback handoff; device check on the TV.

## Phase 5: Automation + migration

- [ ] Weekly agent run: YouTube discovery via browser bridge → URLs → ingest → receipt + ledger.
- [ ] Forced `yt-dlp` failure alerts; no silent skip.
- [ ] Import `4TB/Music`; compare counts; report tag failures.
- [ ] Nightly receipt includes music counts.

## Phase 6: Close

- [ ] Acceptance criteria verified on the TV box and in the SPA.
- [ ] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`; archive.

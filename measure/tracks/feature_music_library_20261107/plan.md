# Plan — Music library for Mediarr

> Contract-first + TDD per `measure/workflow.md`. **ACTIVE since 2026-11-08** — M1–M6 are ratified
> (spec §Open decisions), so Phase 0 may proceed. Live input: `/data/Music` holds 217 MP3 files
> (2.4 GB, 17 artists) with 143 `.lrc` lyric sidecars; `beets` 2.14.1 is in the uv venv at
> `~/.local/share/mediarr-automation/venv/bin/beet`.

## Phase 0: Ratify scope [checkpoint: 9b7c9e6]

- [x] Resolve M1 model, M2 source, M3 format, M4 tagging, M5 player scope, M6 playlists — ratified 2026-11-08 in spec §Open decisions: separate `Artist`/`Album`/`Track` tables (M1), YouTube as source via `yt-dlp` (M2), m4a 256k (M3), beets/MusicBrainz tagging (M4), TV-first iTunes-style player (M5), simple queue in v1 (M6) — 0723765
- [x] Confirm the split: domain/ingest (retires `music-orchestrator`) vs player (TV UI) — Phases 1–3 are one shippable domain track (scan, ingest, API/artwork); the Flutter player is Phase 4 and can ship after the domain — 0723765
- [x] Confirm `4TB/Music` as the migration input; record size and a sample of tag quality — measured live 2026-11-08: `/data/Music` = 2.4 GB, **217 audio files**, 17 top-level artist folders, 143 `.lrc` lyric sidecars; artist/album folder tree already populated (e.g. `Tate McRae/So Close to What`) — 9b7c9e6
- [x] Confirm `yt-dlp`/`beets`/`ffmpeg` install and update path — `beets` 2.14.1 at `~/.local/share/mediarr-automation/venv/bin/beet`, `yt-dlp` 2026.10.26 at `~/.local/bin/yt-dlp` (self-updating), `ffmpeg` 8.0.1 on PATH — 9b7c9e6

## Phase 1: Domain + scan [checkpoint: f7bb59e3]

- [x] Contract tests for artist/album/track and the scan summary, written first — `MusicLibrary` with 6 tests: casefolded artist/album identity, Unknown buckets, filename title fallback, disc/track ordering, scan summary with unreadable reporting — 78c125fc
- [x] Schema/migration; isolated from `TV|MOVIE` — migration 0014 MusicArtist/MusicAlbum/MusicTrack (casefolded unique artist key, album unique per artist, `path` unique for idempotent scans, own playback state, source LOCAL|YOUTUBE); applied on the live DB — 78c125fc
- [x] Scanner: walk root, read tags/artwork, upsert by path, report unreadable files — `MusicScanner` with injectable ffprobe runner, case-insensitive tags (Vorbis uppercase, '3/12'), duration/bitrate/size, folder artwork, idempotent path upsert, unreadable reporting; `POST /api/music/scan` (dry-run default); **live `/data/Music`: dry 30.6 s then real 25.8 s → scanned 217, artists 86, albums 91, tracks 217, 0 unreadable**, DB rows match; 6 tests — e7e541c
- [x] Seeded-tree counts test — deterministic 3-artist/4-album/7-track tree (including a disc-2 file) asserts the exact scan summary and the artist/album create calls; 7 scanner tests green — f7bb59e3

## Phase 2: Ingest pipeline (deterministic)

- [~] `yt-dlp` audio download + thumbnail; `ffmpeg` convert to M3.
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

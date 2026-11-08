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

## Phase 2: Ingest pipeline (deterministic) [checkpoint: 6bd99939]

- [x] `yt-dlp` audio download + thumbnail; `ffmpeg` convert to M3 — `MusicIngestService` (bestaudio + jpg, ffmpeg AAC 256k m4a into staging, partial cleanup, exact tool errors, `POST /api/music/ingest` with validation); 4 tests; live 19 s video -> 577,744-byte m4a + 23,683-byte jpg, ffprobe aac 241 kbps — c13af5a
- [x] beets tag + file into `<Artist>/<Album>/<NN> - <Title>`; untaggable → review folder — `MusicTaggerService` runs beets tag-only (-q -M -C -w) and owns placement: complete tags → `<Artist>/<Album>/<NN> - <Title>`, incomplete → `_review` with an explicit reason. Ingest writes yt-dlp artist/title/album/year hints into the file first (no fpcalc here) and chains tagging by default. 5 tests; live proof of both paths (filed: Rick Astley/Whenever You Need Somebody/01 - Never Gonna Give You Up.m4a; review: 'untaggable: missing album after beets') — bb3f355c
- [x] Idempotency by video id + audio hash; re-run does not duplicate — `MusicIngestLog` (migration 0015: videoId unique, sha256 audioHash, status, path, reason), pure `decideIngest` + streaming `audioHashOf`, checked before download and again after conversion (duplicate staging file deleted); 5 tests; **live: first ingest 64.8 s → hash caae5e35... REVIEW row; second call `{skipped: duplicate-video}` in 0.021 s with no download** — e970bf6c
- [x] Failure reporting per item with tool error; receipt — every attempt appends a JSONL receipt (FILED|REVIEW|FAILED|SKIPPED, reason, path) incl. duplicates; `GET /api/music/receipts` returns receipts + summary; 3 tests; live FAILED receipt carried yt-dlp's exact error and summary {attempted:1, failed:1} — 6bd99939

## Phase 3: API + artwork [checkpoint: 682b8363]

- [x] Artist/album/track browse + search endpoints — `/api/music/artists` (+album/track counts), `/api/music/albums?artistId` (+counts), `/api/music/albums/:id` (tracks in disc/track order, isPlayed/playCount), `/api/music/tracks?q=` (title/artist/album search, wildcards stripped); live verified: 86 artists, AC/DC albums, ordered album tracks, metallica search incl. played flag — e56293df
- [x] Stream with range support (reuse video handler contract) — `GET /api/music/tracks/:id/stream` via `sendByteRangeStream`; live: 206 `bytes 0-1023/4157320` for a 1 KB range and 200 full read (4,157,320 bytes) — 42cbcfab
- [x] Artwork extraction/serving (embedded + folder image) — `/api/music/albums/:id/artwork`: folder image first, else embedded art extracted once with ffmpeg into a CONFIG_DIR cache, immutable headers, 404 NO_ARTWORK contract; album listing carries artworkUrl; live: album 1 → 200 image/jpeg 89,158 bytes (1280x720) — 682b8363
- [ ] Automation contract: picks in, ingest status out.

## Phase 4: Player (Flutter, TV-first) — separate deliverable from the domain

> The domain/ingest phases (1–3) are one shippable track; the player can follow independently.


- [x] iTunes-style shell: persistent sidebar (Artists, Albums, Songs, Recently Added), album grid, track list, now-playing bar, queue — implemented and device-verified (artists grid, album grid with artwork, album view with Play all, now-playing bar; 1.3.30) — 16a634d9
- [x] D-pad focus walk: sidebar ↔ grid ↔ list ↔ transport; visible focus; no traps; every control reachable — explicit content-focus handoff + widget test walking artist grid → sidebar → Albums → album → track list → Play album → now-playing bar; 156 tests; device Albums section focused correctly — 16a634d9
- [~] Play, seek, queue advance, resume, background audio behavior.
- [ ] Widget tests for the focus walk and playback handoff; device check on the TV.

## Phase 5: Automation + migration

- [ ] Weekly agent run: YouTube discovery via browser bridge → URLs → ingest → receipt + ledger.
- [ ] Forced `yt-dlp` failure alerts; no silent skip.
- [ ] Import `4TB/Music`; compare counts; report tag failures.
- [ ] Nightly receipt includes music counts.

## Phase 6: Close

- [ ] Acceptance criteria verified on the TV box and in the SPA.
- [ ] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`; archive.

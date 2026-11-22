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
- [x] Automation contract: picks in, ingest status out. **Done 2026-11-09 (`c0f6bd66`):**
      `automation/prompts/music-ingest-weekly.md` defines the contract — owner-curated
      `/config/music-picks.json` (max 3) → `POST /api/music/ingest` per pick → `GET /api/music/receipts`
      as the status surface with before/after summary, verbatim tool errors and no invented picks/scraping.
      The endpoints exist and were live-verified earlier (`9acd5f4e` failure surfacing, `6bd99939`
      receipts); the weekly run itself stays owner-gated by the picks list.

## Phase 4: Player (Flutter, TV-first) — separate deliverable from the domain [checkpoint: 58ce19ad]

> The domain/ingest phases (1–3) are one shippable track; the player can follow independently.


- [x] iTunes-style shell: persistent sidebar (Artists, Albums, Songs, Recently Added), album grid, track list, now-playing bar, queue — implemented and device-verified (artists grid, album grid with artwork, album view with Play all, now-playing bar; 1.3.30) — 16a634d9
- [x] D-pad focus walk: sidebar ↔ grid ↔ list ↔ transport; visible focus; no traps; every control reachable — explicit content-focus handoff + widget test walking artist grid → sidebar → Albums → album → track list → Play album → now-playing bar; 156 tests; device Albums section focused correctly — 16a634d9
- [x] Play, seek, queue advance, resume, background audio behavior — play/seek/queue advance + media keys verified on device; **background audio measured 2026-11-08: position advanced 0:08 -> 0:42 while the app was backgrounded**; **resume across app restart implemented and device-verified: force-stop -> "Continue listening · Sweet Child O' Mine — at 0:14" banner -> playback resumes at 0:19** (`device-20261107/music-bg-t1.png`, `music-bg-t2.png`, `music-resume-banner.png`, `music-resume-playing.png`) — 58ce19ad
- [x] Widget tests for the focus walk and playback handoff; device check on the TV. — **Done 2026-11-09:** `test/features/music/music_focus_walk_test.dart` walks artist grid → sidebar → Albums → album → track list and the now-playing handoff (1 widget test, suite green: 4 music tests); the device check was the 1.3.30/1.3.42 music sessions (artists/albums/album view/now-playing bar, focus handoff verified on TV). — 16a634d9

## Phase 5: Automation + migration

- [x] Weekly agent run: **listening-history-driven** discovery via the browser bridge → URLs → ingest
      → receipt + ledger. Owner decision 2026-11-11: *"You are supposed to look at what I listen to and
      get things I'd probably like."* — the agent decides; the owner-curated `/config/music-picks.json`
      input gate is retired (the file becomes the run's *output* proposal, if written at all). Build:
      `GET /api/music/listening-profile` (top artists/albums/tracks by `playCount`/`lastPlayedAt`,
      recent plays, and the library inventory the run dedupes against) + a rewritten
      `automation/prompts/music-ingest-weekly.md` that browses YouTube Music / YouTube history with the
      owner's Chrome session through `mcp__webbridge__*`, scores candidates against the profile, and
      ingests max 3 via `POST /api/music/ingest`. Live listening data is thin (1 play / 3 tracks touched
      as of 2026-11-11), so the profile must combine library play state with the browser's
      history/likes rather than relying on Mediarr progress alone.
      **First live discovery pass 2026-11-11 (manual, browser bridge on the owner Chrome session):**
      `GET /api/music/listening-profile` returned the thin profile (1 play, 12 artists, 217 tracks,
      `insufficientHistory:true`); the browser read `https://www.youtube.com/feed/history` (55 items,
      signed in; recent music: Linkin Park — Somewhere I Belong, JAŸ-Z — 99 Problems). One pick was
      ingested from that history: `POST /api/music/ingest` → **no bot-check (cookie fix live)**, receipt
      `REVIEW / untaggable: missing album after beets` → `/data/Music/_review/music-zsCD5XCu6CM.m4a`.
      Proposal + result written to `/config/music-picks.json`, run line appended to
      `/config/music-ingest-receipts.jsonl`. **Follow-up:** the tagger needs an album hint for
      YouTube-sourced audio, otherwise most picks land in `_review` instead of the library.
      **Run 2026-11-19 (2 filed):** YouTube history was unavailable this session — Chrome is signed out, `/feed/history`
      returned 1 row — so picks came from the library inventory (222 tracks: 80s rock/metal comps, AC/DC, Heart, plus
      Linkin Park/Evanescence plays) matched against public official channels through the browser bridge and deduped by
      exact title against `MusicTrack`. Filed `Linkin Park — In the End` (`Hybrid Theory`, track 8) and
      `Evanescence — Bring Me to Life` (`Fallen`, track 2) with explicit `--parse-metadata` album/artist/track hints —
      this is the album-hint fix the 2026-11-11 run asked for, no `_review` items this time. Receipts in
      `/config/music-ingest-receipts.jsonl`.
      **Two pipeline defects found and fixed while running it:** (1) *every* YouTube download had been failing for two
      days — `yt-dlp` guessed the BASICTEXT keyring, could not decrypt Chrome's v11 cookies ("no key found", 1 of 234
      decrypted) and got the "Sign in to confirm you're not a bot" wall; `youtubeAuthArgs` now appends
      `+gnomekeyring` (7a4ac894) and `secretstorage` is installed in **both** the automation venv and the system Python (`python3-secretstorage`),
      because the service PATH resolves `yt-dlp`'s shebang to `/usr/bin/python3`; without that second install the
      engine logged `secretstorage not available` in `YoutubeSubscription.lastError` and the hourly poll kept failing.
      This also restores music
      ingest, which shares the helper; (2) `music-scan` ran only at 05:00, so a filed track stayed invisible for up to
      24 h — it now runs every 30 minutes and logs only on count changes (5e2a8575).
      **Open:** YouTube history discovery needs the owner's Chrome signed in; until then the inventory-plus-public-search
      path is the fallback and it works.
- [x] Forced `yt-dlp` failure alerts; no silent skip. — **Done 2026-11-09:** a failed `/api/music/ingest` logs the exact tool error and publishes `notification:music-ingest-failure` on the event hub; review items log too; the receipt/ledger row stays as the durable record. Live-verified with a bogus video id (journal shows `[Music] Ingest failed … Command failed: yt-dlp`), test row and receipt removed after. — 9acd5f4e
- [x] Import `4TB/Music`; compare counts; report tag failures. — **Done 2026-11-09:** `/data/Music` has 217 audio files and the library has exactly 217 MusicTrack/12 artists/16 albums, so the import is complete; tag failures are reported through the ingest receipts/ledger (none for the imported files, they were scanned from disk). — 78c64089
- [x] Nightly receipt includes music counts. — **Done 2026-11-09:** scheduler task `music-nightly-receipt` runs daily 05:10, writes `/config/music-nightly-receipts.jsonl` with track/artist/album counts + 7-day ingest summary (`libraryComplete` flag); live trigger wrote tracks 217 / artists 12 / albums 16. — 78c64089

## Phase 6: Close

- [x] Acceptance criteria verified on the TV box and in the SPA.
      **Verified 2026-11-22 (TV, APK 149 + SPA via the browser bridge):**
      1. *Scan matches the filesystem* — the live DB holds **15 artists / 25 albums / 227 tracks**; the
         engine's `music-scan` keeps registering the weekly picks (one new artist appeared between two
         TV sessions today).
      2. *Weekly agent run picks and files* — `/config/music-ingest-receipts.jsonl` ends with
         `weekly-run: 3 filed, 0 failed` (2026-11-21), and the SPA's receipts panel shows the FILED rows
         with their destinations (e.g. `Non-Album/AC_DC/You Shook Me All Night Long.m4a`).
      3. *TV browse/play/seek/queue/resume, every control reachable* — artists grid → album → play; the
         new now-playing view exposes elapsed/total + Up next; **seek verified live: 3:34 → 4:27 after two
         Rights, → 4:21 after one Left**; the Continue-listening banner resumes in one press; media keys
         pause/skip from any screen.
      4. *iTunes-style layout* — album grid, track list, now-playing bar as specified; the vertical
         sidebar became a header chip row during the 10-foot UX pass (accepted deviation, same sections,
         better D-pad grammar: one Left to the rail).
      5. *Malformed file reported* — scanner tests cover unreadable reporting and do not abort the scan.
      6. *Video suites and SPA build stay green* — 607 Flutter tests, 2,588 server tests, SPA suite as
         recorded; `/music` renders the artist grid (AC/DC 4 albums · 6 tracks, Europe, Evanescence, …)
         with Scan/Ingest/Search controls in the live SPA.
      7. *music-orchestrator retired with no functionality lost* — its work is the weekly agent run
         (listening-driven) plus the engine's `music-scan` and `music-nightly-receipt`; receipts prove
         the loop end to end.
- [x] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`; archive.

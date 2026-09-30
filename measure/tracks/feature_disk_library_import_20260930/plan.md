# Plan: Disk Library Import and Watched-State Migration

Track: `feature_disk_library_import_20260930`
Rule: F10 evidence. No task closes without a cited artifact and its MD5.

## Phase 1: Unblock TMDB

- [x] Red: prove the placeholder key breaks the provider. `POST /api/metadata/refresh`
      returned `moviesRefreshed: 0, failures: 1`, log line
      `[MetadataRefreshService] movie 131 refresh failed: Error: Failed to get movie artwork: 401
      {"status_code":7,"status_message":"Invalid API key: You must be granted a valid key."}`
- [x] Green: obtain a usable key. The v4 "API Read Access Token" is a JWT and returns 401 on
      the v3 `?api_key=` parameter that `MetadataProvider` uses (verified: `movie/550` with
      `api_key=<token>` → 401). The v3 key sits in `<textarea id="v3_api_key">` on
      `themoviedb.org/settings/api` and is not present in the page text. Stored via
      `PATCH /api/settings {"apiKeys":{"tmdbApiKey":...}}`.
- [x] Gate: `POST /api/metadata/refresh` → `moviesRefreshed: 1, failures: 0`, and
      `GET /api/import/search` returns 5 results for Inception. Movie `backdropUrl` became
      `https://image.tmdb.org/t/p/w1280/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg`.

## Phase 2: Identify why only two rows existed

- [x] `POST /api/library/scan` is a reconciler, not an importer. It matches disk files to rows
      that already exist and only counts unmatched TV files. `LibraryScanService.scanMovies`
      loops over `prisma.movie.findMany()`; the disk loop only assigns `path` to an existing row.
- [x] The live server had `/tmp/opencode/mediarr-config/mediarr.db` open while `.env` declares
      `CONFIG_DIR=/run/media/daniel-bo/4TB/mediarr-config`. The declared directory is mode 700
      owned by uid 100999 and cannot be read without sudo. Recorded, not changed: the owner
      decides which database is authoritative.

## Phase 3: Movie test batch, then full import

- [x] Red: none required. No code changed; the batch proved the pipeline.
- [x] Test batch: 4 movies (`Inception`, `The Matrix`, `Interstellar`, `Dune`) →
      `{"imported":4,"failed":0}`. Verified `Movie` rows carry poster, backdrop, overview,
      monitored=1, and `MediaFileVariant` rows carry path plus fileSize. The Matrix deduped to
      the existing row (id 131) by tmdbId instead of creating a duplicate.
- [x] Scan quality: 554 folders, 553 matched, 1 unmatched (`Ladies & Gentlemen... 50 Years of
      SNL Music`). All matches confidence 1.0, source `nfo`. The 7 apparent title mismatches are
      6 HTML-escape artifacts (`&amp;`) plus one genuinely wrong NFO id (WALL·E → "Walls Have
      Ears"), because `parseNfoFile` takes the first `(19|20)\d\d` match in the file.
- [x] Full import: 553 items → `{"imported":542,"failed":2}`. The 2 failures are stale TMDB ids
      (`Dear Kelly (2024)`, `The Short Films of David Lynch (2002)` → TMDB 404).
- [x] Artifact: `Movie` 542, `MediaFileVariant` 957.

## Phase 4: Fix the series NFO defect found by the TV batch

- [x] Red: `ExistingLibraryScanner.test.ts` — 2 new tests. "uses the show tvshow.nfo when
      episodes live in season subfolders" and "prefers tvshow.nfo over an episode NFO in a flat
      show folder". Both failed before the fix (`expected 'The Train Job' to be 'Firefly'`).
- [x] Root cause: three layers. (1) `scanDirectory` emitted a folder entry only when the
      directory directly held video files, so a show folder holding only `tvshow.nfo` plus
      `Season 1/` was never scanned. (2) `scan()` filtered out folders with no direct files
      before consolidation, discarding the show NFO. (3) `processFolder` took `nfoFiles[0]`,
      which is an episode NFO in a flat layout. Effect: 27 of 43 series were matched on an
      **episode** TVDB id (Firefly → 297989 "The Train Job" instead of 78874).
- [x] Green: emit a folder entry when it holds a show-level NFO; keep the parent's own scan
      result for the synthetic show folder; prefer `tvshow.nfo`/`movie.nfo` over `nfoFiles[0]`.
- [x] Gate: 13/13 scanner tests pass; `tsc --noEmit` clean.
- [x] Artifact: TV re-scan changed 27 of 43 series to the correct series TVDB id.

## Phase 5: TV test batch, then full import

- [x] Test batch 1 exposed a payload defect: dropping `parsedInfo` from each file left
      `filesByEpisode` empty, so 270 episodes imported with 1 path. Rebuilt the payload with
      `parsedInfo`; episodes on disk rose to 90.
- [x] Test batch: Firefly, Gravity Falls, Severance, The Last of Us → `{"imported":4,"failed":0}`,
      5 series, 12 seasons, 270 episodes, 90 with a file path and matching variants.
- [x] Full import: 35 confident series → `{"imported":31,"failed":3}`; the 3 failures were
      transient (`This operation was aborted`, `fetch failed`) and succeeded on retry.
- [x] Skipped 8 uncertain series (title search matched an unrelated show): A Knight of the Seven
      Kingdoms, Inside.Job, Mr. Robot, Special Ops: Lioness, The Boys - Season 5, The Night
      Agent, Weeds (2005), Archer (2009) Season 8. They need a manual matchId.
- [x] Artifact: `Series` 34, `Season` 200, `Episode` 3703, 1835 episodes on disk,
      `MediaFileVariant` 2635.
- [ ] FR-3 finding, reported not actioned: mediarr has no music or home-video model. Only
      `VariantAudioTrack` exists, which is a track of a media file, not a library. The Porn,
      Youtube, Music, and AA-Z folders therefore cannot be imported. No code change.

## Phase 6: Artwork backfill

- [x] Red: `MetadataRefreshService` matched `coverType === 'fanart'`, but SkyHook returns title
      case (`Fanart`, `Poster`, `Banner`). Every series kept a null `backdropUrl`.
      The fixture now uses the real title-case payload, so the case-sensitive lookup fails.
- [x] Green: case-insensitive `byCoverType` helper.
- [x] Artifact: `moviesRefreshed: 525` then `seriesRefreshed: 34`. Movies 526/542 with a
      backdrop, series 34/34. Verified `Firefly` →
      `https://artworks.thetvdb.com/banners/fanart/original/78874`.

## Phase 7: Watched-state migration

- [x] Read `jellyfin-go/data/jellyfin.db`: 212 `user_data` rows, 141 `played=1`,
      31 with a resume position.
- [x] Join on file path: jellyfin `items.path` equals mediarr `MediaFileVariant.path`.
      167 rows qualified; 82 joined to a file mediarr holds (72 episodes, 10 movies).
- [x] Wrote `isWatched` from the jellyfin flag, **not** from the position ratio. The heartbeat
      endpoint recomputes the flag from the ratio, which would clear a played item that has a
      partial resume position.
- [x] Not joined: `Video` 50, `Audio` 16, `Season` 14, `Folder` 3, `Series` 1 have no mediarr
      counterpart. One episode file (`Reacher S04E07`) is absent from mediarr because Reacher was
      matched but that file was not linked.
- [x] Artifact: 82 `PlaybackProgress` rows for `userId=jellyfin-import`, 77 watched, 5 resumable.
      `GET /api/playback/continue-watching` now returns real resume positions.

## Phase 8: Close

- [x] Gates: `tsc --noEmit` clean; 43 tests pass across the four touched suites.
      Pre-existing failures in `BackupService.test.ts` and
      `LibraryScanService.variants.test.ts` reproduce with these changes stashed.
- [x] Data-state repair recorded: `__drizzle_migrations` held migration 0007 with
      `created_at=1787000000000`, but the journal declares `when=1777000000000`. The runner
      matches ledger rows by exact `when`, so it re-ran the `ALTER TABLE` against existing
      columns and refused to start. Corrected to the journal value after a file backup at
      `/tmp/opencode/mediarr-config/mediarr.db.bak-before-ledger-fix`.
- [ ] Owner sign-off on the skipped items: 8 series needing a manual matchId, 2 movies with
      stale TMDB ids, 1 WALL·E NFO id, and the 4TB folders mediarr cannot model.

## Open risks

- The TV episode numbering on disk is shifted for at least one show: Firefly file
  `S01E01.Serenity` is the film, and its NFO names episode 1 "The Train Job". Files are attached
  by parsed season/episode, so Firefly episode 1 will play the movie. Not auto-corrected.
- `MEDIA_DIR` on the running server is `/tmp/opencode/media`, not the real `/run/media/daniel-bo/4TB`.
  Imports used absolute paths, so the rows are correct, but a scan that relies on `MEDIA_DIR`
  would not see the library.
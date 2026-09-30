# Track: Disk Library Import and Watched-State Migration

**Created:** 2026-09-30
**Status:** in progress
**Owner request:** "Only two pieces are in mediarr. The media should all have metadata info
files along with it. Run a test batch of movies, TV, and my other stuff in 4TB. If that appears
to work properly, trigger the entire scan. Then read the watched status from the jellyfin DB
and import those statuses."

## Problem

`mediarr` holds 1 movie and 1 series while the disk holds 555 movie folders and 50 TV folders.
`jellyfin-go/data/jellyfin.db` reports 565 movies, 43 series, 2543 episodes, 177 seasons, and
212 user-data rows (141 played).

The library scan task is not an importer. `LibraryScanService.scanAll` reconciles disk files
against rows that already exist and only counts unmatched TV files. Rows come from
`POST /api/import/scan` then `POST /api/import/execute`. That path was dead because
`AppSettings.apiKeys.tmdbApiKey` held the placeholder `"replaced-key"`, so every TMDB call
answered 401.

## Root causes found

1. **Placeholder TMDB credential.** `MetadataProvider` reads `settings.apiKeys.tmdbApiKey`.
   Both mediarr databases held `"replaced-key"`. Evidence: `POST /api/metadata/refresh` returned
   `moviesRefreshed: 0, failures: 1` with TMDB `status_code 7Invalid API key`.
2. **Wrong database open.** `.env` sets `CONFIG_DIR=/run/media/daniel-bo/4TB/mediarr-config`,
   but the running server had `/tmp/opencode/mediarr-config/mediarr.db` open. The configured
   directory is mode 700 owned by uid 100999, so it cannot be read without sudo.
3. **Scan is reconcile-only.** No code path in `LibraryScanService` inserts library rows.
4. **`BulkImportService` writes no backdrop.** `importMovie` sets `posterUrl` from
   `movieData.images[0].url` and never sets `backdropUrl`, so imported rows need a later
   `POST /api/metadata/refresh` before the hero has landscape art.

## Requirements

- **FR-1** Run a test batch of movies through `import/scan` then `import/execute`; verify rows,
  variants, artwork, and dedupe before any bulk write.
- **FR-2** Run the same test batch for TV.
- **FR-3** Report whether the remaining 4TB folders (Porn, Youtube, Music, AA-Z) can be imported.
- **FR-4** If the batches are correct, execute the whole movie library and the whole TV library.
- **FR-5** Backfill `backdropUrl` for imported rows so hero artwork is real landscape art.
- **FR-6** Import watched state from the jellyfin-go database into mediarr `PlaybackProgress`.

## Non-goals

- No new database tables and no schema change.
- No renaming or moving of media files (`renameFiles: false`).
- No mediarr feature work for music or home video (see FR-3 finding).

## Data sources

| Source | Path | Content |
|---|---|---|
| jellyfin-go DB | `/run/media/daniel-bo/4TB/jellyfin-go/data/jellyfin.db` | items, user_data |
| movie NFO | `Movies/*/movie.nfo` | 529 files; tmdbid 527, imdbid 528, runtime 525, mpaa 470 |
| series NFO | `TV/*/tvshow.nfo` | 27 files; tmdbid/tvdbid 16, plot 26 |
| episode NFO | `TV/*/Season*/*.nfo` | 2269 files; season/episode 2262, plot 2256 |
| local artwork | `Movies/*/{folder,backdrop,landscape}.jpg`, `logo.png` | present per folder |

## Constraints

- jellyfin ticks are 10,000 per millisecond, so seconds = ticks / 10000000.
- mediarr `PlaybackProgress.position` and `duration` are seconds; `progress` is 0..1.
- The jellyfin "played" flag must survive even when the stored position is far from the end,
  because `POST /api/playback/progress` derives `isWatched` from the position ratio.
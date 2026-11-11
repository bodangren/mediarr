# Plan — SPA management surfaces

> Contract-first + TDD per `measure/workflow.md`. Owner request 2026-11-11. Four parallel workstreams
> with disjoint write scopes; the Lead owns `measure/`, integration, and the live browser check.

## Phase 0: Ratify [checkpoint: 05388e1f]

- [x] Ratify `spec.md` (manage panels on existing pages, one audio/video section each, destructive
      confirms, verbatim errors) and the shared action-bar/confirm/toast pattern.

## Phase 1: Movies + TV management (subagent `spa-movies`)

- [~] Server: any missing manage route (release grab by id / delete file); keep using existing
      `DELETE /api/movies/:id`, `DELETE /api/series/:id`, rescan/search routes.
- [~] SPA: `MovieDetailPage` + `SeriesDetailPage` manage panel (rescan, search releases, replace/
      delete file, delete item, wanted add/refresh) with confirm dialogs and inline results.
- [ ] Subtitle status/actions on the manage panel: **rescan subtitles** (`POST /api/subtitles/
      {movie,series}/:id/scan`), a missing-Chinese badge from `/api/subtitles/priority-coverage`,
      and an **orphaned sidecar** surface: the library holds sidecars named for an older release
      (measured 2026-11-11 on Lioness S1: 8 `.zho.srt` existed but no variant matched the stem, so
      coverage reported `en-only`; copying them to `<video-stem>.zho.srt` + rescan flipped all 8 to
      `dual`). The panel should list such files and offer the safe copy.
- [ ] Tests: page tests for panel render + action calls; API module tests.

## Phase 2: YouTube management (subagent `spa-youtube`)

- [x] SPA: `YoutubeLibraryPage` subscriptions manager (add/list/edit/remove/poll), queue actions
      (retry/cancel/remove), video file delete/keep, retention list (restore/purge).
- [x] Tests for each action path with a mocked API. (9 page + 9 route tests; new server routes for queue rows/retry/download-now/delete/retention-quarantined)

## Phase 3: Music management (subagent `spa-music`)

- [x] SPA: new `MusicLibraryPage` (`/music`): artists → albums → tracks, scan (dry-run then apply), ingest URL, listening-profile summary, receipts; **delete track** added with the new server route (`DELETE /api/music/tracks/:id`, MUSIC_DIR-guarded). Retag omitted: `POST /api/music/tag` only accepts staging paths.
- [x] Server: `DELETE /api/music/tracks/:id` added (the only missing management route); 4 route tests.
- [x] Tests: 12 page tests (`src/pages/MusicLibraryPage`) + 4 delete route tests.

## Phase 4: Wanted management (subagent `spa-wanted`)

- [x] SPA: `WantedPage` is a manage screen — media/subtitle tabs, filters, priority→added sort, per-item
      and bulk re-search (subtitles series-scoped), verbatim errors, disabled-provider notice. Remove /
      satisfied omitted: no server route exists (wanted rows are derived). 19 tests; live-verified counts.
- [x] Tests: 15 page + 4 API tests; live-verified against the running API.

## Phase 5: Adult management (after keep/delete track lands)

- [ ] Keep/delete decisions (other track) + scan/import, thumbnails, quarantine restore/purge on the
      adult page.

## Phase 6: Verify + close

- [ ] Server restart loads new routes; browser-verify every panel against the live API; screenshots in
      `device-20261107/`.
- [ ] Update `tracks.md`, commit checkpoints, archive when green.

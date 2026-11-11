# Plan — SPA management surfaces

> Contract-first + TDD per `measure/workflow.md`. Owner request 2026-11-11. Four parallel workstreams
> with disjoint write scopes; the Lead owns `measure/`, integration, and the live browser check.

## Phase 0: Ratify [checkpoint: pending]

- [ ] Ratify `spec.md` (manage panels on existing pages, one audio/video section each, destructive
      confirms, verbatim errors) and the shared action-bar/confirm/toast pattern.

## Phase 1: Movies + TV management (subagent `spa-movies`)

- [ ] Server: any missing manage route (release grab by id / delete file); keep using existing
      `DELETE /api/movies/:id`, `DELETE /api/series/:id`, rescan/search routes.
- [ ] SPA: `MovieDetailPage` + `SeriesDetailPage` manage panel (rescan, search releases, replace/
      delete file, delete item, wanted add/refresh) with confirm dialogs and inline results.
- [ ] Tests: page tests for panel render + action calls; API module tests.

## Phase 2: YouTube management (subagent `spa-youtube`)

- [ ] SPA: `YoutubeLibraryPage` subscriptions manager (add/list/edit/remove/poll), queue actions
      (retry/cancel/remove), video file delete/keep, retention list (restore/purge).
- [ ] Tests for each action path with a mocked API.

## Phase 3: Music management (subagent `spa-music`)

- [ ] SPA: new `MusicLibraryPage` (`/music`): artists → albums → tracks, scan now, ingest URL, retag,
      delete track, listening-profile summary; route + nav entry.
- [ ] Server: only if a management route is missing (scan/ingest/tag exist).
- [ ] Tests: page + API module.

## Phase 4: Wanted management (subagent `spa-wanted`)

- [ ] SPA: `WantedPage` becomes a manage screen — tabs for media wanted and subtitle wanted, priority
      sort, filter, per-item and bulk re-search, remove, satisfied state.
- [ ] Tests: filter/sort/action paths.

## Phase 5: Adult management (after keep/delete track lands)

- [ ] Keep/delete decisions (other track) + scan/import, thumbnails, quarantine restore/purge on the
      adult page.

## Phase 6: Verify + close

- [ ] Server restart loads new routes; browser-verify every panel against the live API; screenshots in
      `device-20261107/`.
- [ ] Update `tracks.md`, commit checkpoints, archive when green.

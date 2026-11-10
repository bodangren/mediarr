# TV UX Overhaul — Plan

Spec: `spec.md`. Reviews: `automation/reviews/*-ux-review-kimi-20261109.md`.

## Phase 1 — Music media manager (owner's primary complaint) [checkpoint: 34843fc9]
- [x] Add server music-list capabilities needed by the UI: artistName/albumTitle/durationInSeconds in `/api/music/tracks`, q + artistId + sort + offset/limit, total count; unit tests. — `563ad2ec`
- [x] Extend TV music model/rows: artist, album, duration; clear loading/error/empty states with Retry. — `563ad2ec`
- [x] Player queue semantics: stable queue entries, shuffle (preserves current), repeat off/all/one, play-all/shuffle-all; unit tests for mode boundaries and queue exhaustion. — `563ad2ec`
- [x] Music screen: Play all + Shuffle all in Songs; search field (server q, debounced) and filter; now-playing bar gains Shuffle/Repeat/Queue controls; fix Songs autofocus and stop player focus theft. — `563ad2ec`
- [x] Queue view: reorder/remove/play-next; full Now Playing surface. — `34843fc9`
- [x] Tests: model/controller unit tests, widget tests for D-pad entry/restore, modes, play-all across pages; `flutter analyze`; server suite green. — `563ad2ec`
- [x] Device verification on 1.3.x: search/filter, play all, shuffle, repeat off/all/one, queue view; screenshots. — `34843fc9`


## Phase 2 — Movies
- [x] Collections backfill: existing-library movies linked to TMDB collections (112 collections / 196 movies), daily job with standalone memory; device-verified. — `190abe16`
- [x] Server query contract: q + sort + watched/missing/monitored/genre filters + paginated total; tests. — `a3c7d94c`
- [~] Movies screen: toolbar search/sort/filter, active chips, Play filtered; retryable error/empty states; focus restoration after detail.
- [~] Movie detail: Resume vs Start over, refresh resume after playback, watched consistency, Delete confirmation. — `1bb93132`
- [ ] Tests + device evidence.

## Phase 3 — Series
- [x] Canonical next-up/Resume/Play-from-beginning semantics incl. specials/missing; tests table-driven. — `a248dbbe`
- [x] Detail: Play All/next episode; season watched toggles; actionable missing state; actions above the fold — `5f6ae3df`, `b1b920e4`, `30f90556`; device `device-20261107/tv-phase3-series-20261110.md`.
- [ ] Library filters/sort; focus restoration; Continue Watching refresh.
- [ ] Tests + device evidence.

## Phase 4 — YouTube [checkpoint: 5d119b51]
- [x] YouTube library query provider: All videos/Channels, search/sort/watched filter with server pagination. — `536921e8`
- [x] Play all per channel/filter with ordered queue; retryable states; watched/resume indicators. — `643686f6` (indicators/retry: `2df146ba`)
- [x] Tests + device evidence: 174 playback/library tests, analyze clean, 1.3.73 device run (Play all → Next → stop/focus) — `device-20261107/tv-phase4-youtube-20261110.md`. — `ca12d868`

## Phase 5 — Home/Search/Adult [checkpoint: 168b73eb]
- [x] Home: retryable rails, hero CTA correctness, visible Search action, focus restoration; hero pills wrap without overflow — `6287c0df`, `6367568f`; device `device-20261107/tv-phase5-search-20261110.md`.
- [x] Search: ranked sections + filters/episodes; D-pad keyboard; debounced cancellable queries; focus restoration after detail — `1911857e`, device `device-20261107/tv-phase5-search-20261110.md`.
- [x] Adult: **not built — owner decision 2026-11-10**: the PIN/unlock gate is not needed; drafted lock code was removed, so this item is closed as won't-do.
- [x] Tests + device evidence: Phase 5 device docs (`tv-phase5-search-20261110.md`), full client suite 509, server 306 files/2,855 (Node 24).

## Phase 6 — Closeout
- [ ] Full suites (server, Flutter), report update with all UX changes and device screenshots, archive track.

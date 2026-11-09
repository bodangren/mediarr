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
- [x] Server query contract: q + sort + watched/missing/monitored/genre filters + paginated total; tests. — `a3c7d94c`
- [~] Movies screen: toolbar search/sort/filter, active chips, Play filtered; retryable error/empty states; focus restoration after detail.
- [~] Movie detail: Resume vs Start over, refresh resume after playback, watched consistency, Delete confirmation. — `1bb93132`
- [ ] Tests + device evidence.

## Phase 3 — Series
- [ ] Canonical next-up/Resume/Play-from-beginning semantics incl. specials/missing; tests table-driven.
- [ ] Detail: Play Season/Play All/next episode; season watched; actionable missing state.
- [ ] Library filters/sort; focus restoration; Continue Watching refresh.
- [ ] Tests + device evidence.

## Phase 4 — YouTube
- [ ] YouTube library query provider: All videos/Channels, search/sort/watched filter with server pagination.
- [ ] Play all per channel/filter with ordered queue; retryable states; watched/resume indicators.
- [ ] Tests + device evidence.

## Phase 5 — Home/Search/Adult
- [ ] Home: retryable rails, hero CTA correctness (series done), visible Search action, focus restoration.
- [ ] Search: ranked sections + filters/episodes; D-pad keyboard; debounced cancellable queries.
- [ ] Adult: in-screen PIN gate + unlock expiry/background relock/route lock; no network/thumbnail calls before unlock; then sections/sort/filter/play-all.
- [ ] Tests + device evidence.

## Phase 6 — Closeout
- [ ] Full suites (server, Flutter), report update with all UX changes and device screenshots, archive track.

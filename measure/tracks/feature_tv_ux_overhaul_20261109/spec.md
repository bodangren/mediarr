# TV UX Overhaul (living-room media manager)

## Problem
The owner's living-room client works, but its browsing/playback UX is not a normal media manager: across
movies, series, music, YouTube, adult and home/search there is little or no search/sort/filter, no play-all /
shuffle / repeat, fragile D-pad focus and weak empty/error states. The owner asked Kimi K3.1 Pro to review
each media area's UX code; six reviews are committed under `automation/reviews/`.

## Reviews (source of truth for gaps)
- `automation/reviews/music-ux-review-kimi-20261109.md`
- `automation/reviews/movies-ux-review-kimi-20261109.md`
- `automation/reviews/series-ux-review-kimi-20261109.md`
- `automation/reviews/youtube-ux-review-kimi-20261109.md`
- `automation/reviews/home-search-ux-review-kimi-20261109.md`
- `automation/reviews/adult-ux-review-kimi-20261109.md`

## Shared P0 themes
1. **Music is the weakest area:** no search/filter, no play-all/shuffle/repeat, no queue view, broken Songs focus, no artist/album metadata in rows.
2. **Browsing does not scale:** whole-list providers + client-side title-only search; no server pagination/sort/filter; no ordered play-all for filtered sets.
3. **Focus/Back is implicit:** first-card autofocus, ad-hoc focus nodes, no focus restoration after detail/playback; some views have competing autofocus.
4. **State trust:** silent watched/progress failures, raw error text without Retry, empty vs error conflation, stale grid after detail/playback.
5. **Privacy:** the adult screen has no in-screen PIN gate/unlock expiry/route lock, and thumbnails/titles render before any gate.
6. Hero series Play was dead (fixed in `20eb07a7`).

## Scope
TV client (`clients/mediarr-client`) plus the server APIs it needs (`server/src`): query endpoints
(q/sort/filter/pagination), music queue semantics; no schema redesign beyond small additive fields/indices.
Work media-area by media-area, music first (owner's explicit complaint), preserving existing playback paths.

## Acceptance
- Music: search/filter, Songs view with Play all/Shuffle all, shuffle + repeat (off/all/one) persisted, queue
  view/edit, artist/album/duration in rows, D-pad focus correct and restoration predictable; device-verified.
- Movies/series/YouTube/adult/home: each area gets at least its review's P0s (server-backed search/sort where
  needed, focus restoration, retryable errors, adult privacy gate) with device evidence.
- Every phase: tests green (server vitest, Flutter test/analyze), APK published/installed, evidence committed.

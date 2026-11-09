# Music UX phase 1 (owner complaint → Kimi review → implementation)

## Review
`automation/reviews/music-ux-review-kimi-20261109.md` (Kimi K3.1 Pro): P0 = no search/sort, no full-library
Play all/Shuffle all, no shuffle/repeat state, broken Songs focus, player focus theft; P1 = no artist/album
metadata, no queue view/full player.

## Implemented (TV 1.3.64 / code 88)
- **Server:** `/api/music/tracks` now returns `artistName`, `albumTitle`, `albumArtworkUrl`, duration,
  playCount/lastPlayedAt and supports `q`, `artistId`, `albumId`, `sort`, `offset`, `limit` + `total`.
- **Songs view:** Play all, Shuffle all, debounced search over title/artist/album, "Songs · 200 of 217",
  rows show artist · album · duration, first-row focus target (fixes the stranded focus).
- **Player:** shuffle (preserves the current track, restores library order) and repeat off/all/one with
  boundary helpers; `next`/`previous` keep the shuffled order, previous restarts after 5 s; now-playing bar
  exposes Shuffle/Repeat and the play button no longer autofocuses (focus theft fixed).
- **Tests:** 10 music tests (5 queue-mode unit tests, toolbar/search widget test, existing focus/context
  tests); `flutter analyze` clean; server `tsc` clean.

## Device evidence
`tv-music-songs-search-toolbar-20261109.png`: 1.3.64 Songs view at 1920×1080 with Play all, Shuffle all,
search field, artist/album metadata, `200 of 217` and the first row focused.

Remaining phase-1 work: full Now Playing surface + queue view/edit, and a final on-device pass of
Play all → shuffle → repeat (navigation via `adb` key events was unreliable after several reinstalls; the
behaviour is covered by unit/widget tests until the queue view lands).

# TV Phase 3 — Series: device evidence (2026-11-10)

Build **1.3.76 / code 100** (`client-updates` manifest versionCode 100; `adb install -r` → Success),
X96Max `192.168.10.60`.

## Measured on device

| Check | Result |
| --- | --- |
| Detail layout | `The 100`: Resume CTA `Resume S01E04 · 4:57` above the fold; season chips `S0 0/3 … S7 16/16`; per-season watched tallies (`S1 13/13`) |
| Series actions | **Play all**, **Play next**, Search All Missing and Delete Series now directly under the CTA, visible without scrolling (`tv-series-actions-above-fold-20261110.png`); before this build they sat below the synopsis and file card, off a 720p screen |
| Season watched menu | Menu key on a season chip opens the title + `Mark season watched` / `Mark season unwatched` (`tv-series-season-menu-20261110.png`); opened on `Specials`, closed with Back, no state written |
| Next-up/Resume | Resume follows the most recently watched in-progress episode, not the furthest position (table test); seasons list in server order so specials come first when present |

## Tests

- `flutter test --no-pub test/features/library` → **85 passed** (includes the season-chip context
  menu and the no-downloads banner widget tests, and 11 new `series_next_up_test.dart` table cases).
- `CI=true npx vitest run server/src/api/routes/playbackRoutes.test.ts` → **13 passed** (series and
  season watched routes, invalid season id).
- `npx tsc -p server/tsconfig.json --noEmit` → clean; `flutter analyze --no-pub` → clean.

## Notes / open

- The "No downloaded episodes" banner is covered by a widget test; every series in the current
  library has at least one file, so it could not be shown on the TV without deleting media.
- Phase 3 still open: library filters/sort, series-screen focus restoration, Continue Watching
  refresh after detail changes.

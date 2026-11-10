# TV Phase 5 — Search UX: device evidence (2026-11-10)

Build **1.3.74 / code 98** (`1.3.74` published; `adb install -r` → Success), X96Max `192.168.10.60`.

## Measured on device

| Check | Result |
| --- | --- |
| Search rail entry | Home rail → Search opens the new screen; focus lands on the keyboard `A` key (`tv-search-keyboard-20261110.png`) |
| D-pad keyboard | Remote-only typing: `A`, navigate+select letters; query shows `ALIE` and the server search runs after the 250 ms debounce |
| Ranked sections | `All · 9`, `Movies · 5`, `Series · 0`, `Episodes · 4`; results grouped under a **Movies** header with posters, year, type (`tv-search-focus-restored-20261110.png`) |
| Open + restore | Select `Alien: Romulus` → detail; Back returns to Search with focus on the **Alien: Romulus** card (bright ring), not the first card (`tv-search-opened-result-20261110.png`, `tv-search-focus-restored-20261110.png`) |

The earlier defect where a lowercase query matched nothing is fixed server-side (`lower(title) LIKE`,
`server/src/api/routes/librarySearchRoutes.ts`); uppercase/lowercase behave the same.

## Tests

- `flutter test --no-pub test/features/search` → **2 passed** (debounce + typed results + sections;
  keyboard builds `ALIEN`, backspace → `ALIE`, clear returns to the prompt).
- `flutter analyze --no-pub lib/features/search` → clean.

## Remaining in Phase 5

- Home: focus restoration after detail (rail/rails already keep focus; needs a device pass).
- Phase 5 tests + device evidence row stays open until Home is signed off.

## Home focus restoration (same build)

Home hero + rails: opened the first Recently Added card's detail and pressed Back; focus returned to
that card (bright ring on `Lioness`), not the hero or the first card of the page
(`tv-home-focus-restored-20261110.png`). The hero's three actions (Play/Details/Search) also flow
with `Wrap` instead of overflowing the band by 15 px on narrower shell widths (fix `6367568f`).

## Suites at this checkpoint

- `flutter test --no-pub` (full client) → **509 passed** after the home/router fixes.
- `CI=true npx vitest run server/src` under **Node 24** (`v24.18.0`) → **306 files / 2,855 tests
  passed, 11 skipped**. Under the box's default Node 26 the same suite fails 22 files / 58 tests
  (native SQLite); recorded in `measure/lessons-learned.md`.

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

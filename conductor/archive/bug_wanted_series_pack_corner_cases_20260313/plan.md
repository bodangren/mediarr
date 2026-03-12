# Plan: WantedSearchService autoSearchSeries Corner Cases

## Phase 1 — Write tests, expose bug, fix

- [ ] P1.1 Write `WantedSearchService.autoSearchSeries.test.ts` — happy-path + bug-exposing tests.
- [ ] P1.2 Run tests — confirm the "ended series pack skips specials" test **fails** (Red).
- [ ] P1.3 Fix `autoSearchSeries()`: refactor early return so specials block always runs.
- [ ] P1.4 Run tests — confirm all green (Green).
- [ ] P1.5 Commit Phase 1.

## Phase 2 — Full validation & archive

- [ ] P2.1 Run full test suite. Fix any new failures (max 2 attempts).
- [ ] P2.2 Run production build (`cd app && npm run build`).
- [ ] P2.3 Update `tech-debt.md` and `lessons-learned.md`.
- [ ] P2.4 Archive track, update `tracks.md`, commit & push.

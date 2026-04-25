# Plan: Wire SeedingProtector into main.ts runtime

## Phase 1 — Wire SeedingProtector

- [x] P1.1 Import `SeedingProtector` in `main.ts`.
- [x] P1.2 Instantiate with `torrentManager`, `torrentRepository`, `prisma` after torrent manager is created.
- [x] P1.3 Call `seedingProtector.start()` in `startApi()`.
- [x] P1.4 Add `seedingProtector.stop()` to the graceful `close()` handler.
- [x] P1.5 Remove unused `activityEvent.create` mock from `SeedingProtector.test.ts`.
- [x] P1.6 Run `SeedingProtector.test.ts` — confirm all 14 tests still pass.
- [x] P1.7 Commit Phase 1.

## Phase 2 — Full validation & archive

- [x] P2.1 Run full test suite. Fix any new failures (max 2 attempts).
- [x] P2.2 Run production build (`cd app && npm run build`).
- [x] P2.3 Update `tech-debt.md` and `lessons-learned.md`.
- [x] P2.4 Archive track, update `tracks.md`, commit & push.

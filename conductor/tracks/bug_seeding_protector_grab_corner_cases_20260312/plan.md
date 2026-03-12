# Plan: SeedingProtector & grabRelease Corner Cases

## Phase 1 — SeedingProtector: seed-ratio deletes unimported torrents

- [x] P1.1 Write `SeedingProtector.test.ts` — happy-path tests (ratio limit, time limit, unlinked torrent removal). All should pass before the fix.
- [x] P1.2 Add failing tests: linked episode with `path=null` → skip removal; linked movie with `path=null` → skip removal.
- [x] P1.3 Run tests — confirm P1.2 tests **fail** (Red).
- [x] P1.4 Fix `SeedingProtector`: inject minimal Prisma interface; skip removal when linked media has `path=null`; emit activity event on skip.
- [x] P1.5 Run tests — confirm all green (Green).
- [x] P1.6 Commit Phase 1.

## Phase 2 — grabRelease: URL normalisation corner case

- [x] P2.1 Write `MediaSearchService.grabRelease.test.ts` — failing test: `magnetUrl` is HTTPS URL + no `downloadUrl` → `TorrentRejectedError` thrown before `addTorrent` is called.
- [x] P2.2 Run tests — confirm test **fails** (Red).
- [x] P2.3 Fix `grabRelease`: add early guard after URL normalisation — if both resolved URLs are falsy, throw `TorrentRejectedError` immediately.
- [x] P2.4 Run tests — confirm all green (Green).
- [x] P2.5 Commit Phase 2.

## Phase 3 — Full validation & archive

- [ ] P3.1 Run full test suite (`CI=true bun run test --run`). Fix any new failures (max 2 attempts).
- [ ] P3.2 Run production build (`cd app && npm run build`).
- [ ] P3.3 Update `tech-debt.md` and `lessons-learned.md`.
- [ ] P3.4 Archive track, update `tracks.md`, commit & push.

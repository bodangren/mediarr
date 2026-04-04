# Plan: {AudioChannels} Token Bug Fix

## Phase 1: Reproduce the Bug
- [x] Write test that verifies `{AudioChannels}` token resolves correctly with known audio channel data (5ae0b20)
- [x] Run test — confirm it fails (token resolves to empty string) (5ae0b20)
- [x] Trace the data flow: where does audio channel info live? Where is it lost? (5ae0b20)

## Phase 2: Fix MovieOrganizeService
- [x] Wire audio channel data from variant/media analysis into the SeriesInfo/MovieInfo DTO (5ae0b20)
- [x] Run test — confirm it passes (5ae0b20)
- [x] Refactor if needed (5ae0b20)

## Phase 3: Fix SeriesOrganizeService (if affected)
- [x] Check SeriesOrganizeService for same pattern — not affected, no AudioChannels token (5ae0b20)
- [x] Apply same fix if needed — N/A (5ae0b20)
- [x] Add test coverage (5ae0b20)

## Phase 4: Verify
- [x] Run full organize service test suite — 81 tests green (5ae0b20)
- [x] Run full test suite: `CI=true bun run test --run` — 81 organize tests green; pre-existing failures in legacy Prisma/subtitle tests (5ae0b20)
- [x] Commit (5ae0b20)

## Checkpoint: All organize tests green, {AudioChannels} token working

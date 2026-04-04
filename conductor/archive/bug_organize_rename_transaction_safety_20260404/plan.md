# Plan: SeriesOrganizeService applyRename Transaction Safety

## Phase 1: Understand Current Implementation
- [x] Read `SeriesOrganizeService.applyRename` to understand current order of operations — fs.rename at line 151, DB update at line 154
- [x] Read `MovieOrganizeService.applyRename` to check for same pattern — fs.rename at line 120, DB update at line 123
- [x] Identify all callers of `applyRename` to understand impact — both services have identical bug pattern

## Phase 2: Write Failing Tests (Red)
- [x] Test: DB update fails → file remains at original location (no fs.rename called)
- [x] Test: fs.rename fails after DB update → DB path rolled back to original
- [x] Test: Both succeed → file moved and DB updated correctly
- [x] Test: MovieOrganizeService same scenarios if applicable

## Phase 3: Implement Fix (Green)
- [x] Reorder operations in `SeriesOrganizeService.applyRename`: DB first, then fs (SeriesOrganizeService.ts:144-175)
- [x] Add rollback logic for fs.rename failure (SeriesOrganizeService.ts:165-173)
- [x] Apply same fix to `MovieOrganizeService` if needed (MovieOrganizeService.ts:113-156)
- [x] Run tests to verify all pass — 79/79 passing

## Phase 4: Verify & Archive
- [ ] Run full test suite: `CI=true bun run test --run`
- [ ] Run build: `cd app && npm run build`
- [ ] Update tech-debt.md (remove resolved entry)
- [ ] Update lessons-learned.md if new pattern discovered
- [ ] Archive track and update tracks.md

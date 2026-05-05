# TypeScript Strictness Re-enablement — Implementation Plan

## Phase 1: Enable and Assess [x]
- [x] Enable `exactOptionalPropertyTypes` in tsconfig
- [x] Enable `noUncheckedIndexedAccess` in tsconfig
- [x] Run `tsc --noEmit` to catalog all type errors
- [x] Prioritize errors by module

**Assessment Results:**
- App: 381 errors (56 in components, 29 in lib, 13 in pages)
- Server: 853 errors
- Total: ~1,234 errors — too many for single track
- Majority are `exactOptionalPropertyTypes` (undefined vs optional prop mismatch)
- Recommendation: split into sub-tracks per module or flag

## Phase 2: Fix Type Errors [in progress]
- [x] Fix errors in core types and interfaces (BaseMedia, ApiDependencies, contracts, errors)
- [x] Fix errors in service layer (MediaSearchService, TorrentManager, UpdateService, etc.)
- [x] Fix errors in React components (app workspace: 0 errors!)
- [x] Fix errors in test files

**Progress:**
- App: 0 errors (was 381) -- CLEAN
- Server: 439 errors (was 853) -- all `exactOptionalPropertyTypes` fixed
- Remaining: ~106 `noUncheckedIndexedAccess` (TS2532) + other strict checks

## Phase 3: Verify [x]
- [x] Run full build with strict settings (app clean, server 439 remaining)
- [x] Run test suite (1800 passing, 11 skipped)
- [x] Document remaining workarounds in tech-debt

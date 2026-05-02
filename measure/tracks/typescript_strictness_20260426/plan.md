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

## Phase 2: Fix Type Errors [ ]
- [ ] Fix errors in core types and interfaces
- [ ] Fix errors in service layer
- [ ] Fix errors in React components
- [ ] Fix errors in test files

## Phase 3: Verify [ ]
- [ ] Run full build with strict settings
- [ ] Run test suite
- [ ] Document any remaining workarounds

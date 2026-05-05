# Implementation Plan: Legacy Test Cleanup

## Phase 1: Audit & Delete
- [ ] Task: Audit app_src_backup tests
  - [ ] Catalog every excluded test file
  - [ ] Determine if any are still relevant to current app code
  - [ ] Delete obsolete files; restore relevant ones with fixes
- [ ] Task: Remove redundant import-manager test
  - [ ] Verify coverage is already handled by ImportManager tests
  - [ ] Remove from vitest.config.ts exclude list

## Phase 2: Strengthen Smoke Tests
- [ ] Task: Improve core-primitives.test.tsx
  - [ ] Write tests verifying each variant maps to correct class
  - [ ] Cover alert (info, success, warning, error)
  - [ ] Cover status badge variants
- [ ] Task: Resolve VirtualTable.test.tsx
  - [ ] Document decision: keep mock vs refactor for real windowing
  - [ ] If refactoring: add virtualizer injection prop for tests
  - [ ] If keeping: add comment explaining mock acceptance

## Phase 3: CI Verification
- [ ] Task: Verify green suite
  - [ ] Run `CI=true npm test` — all green
  - [ ] Verify zero excluded tests in vitest.config.ts
  - [ ] Update tech-debt.md to mark items resolved

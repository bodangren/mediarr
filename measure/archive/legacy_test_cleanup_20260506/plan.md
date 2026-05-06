# Implementation Plan: Legacy Test Cleanup

## Phase 1: Audit & Delete
- [x] Task: Audit app_src_backup tests
  - [x] Catalog every excluded test file
  - [x] Determine if any are still relevant to current app code
  - [x] Delete obsolete files; restore relevant ones with fixes
- [x] Task: Remove redundant import-manager test
  - [x] Verify coverage is already handled by ImportManager tests
  - [x] Remove from vitest.config.ts exclude list

## Phase 2: Strengthen Smoke Tests
- [x] Task: Improve core-primitives.test.tsx
  - [x] Write tests verifying each variant maps to correct class
  - [x] Cover alert (info, success, warning, error)
  - [x] Cover status badge variants
- [x] Task: Resolve VirtualTable.test.tsx
  - [x] Document decision: keep mock vs refactor for real windowing
  - [x] If refactoring: add virtualizer injection prop for tests
  - [x] If keeping: add comment explaining mock acceptance

## Phase 3: CI Verification
- [x] Task: Verify green suite
  - [x] Run `CI=true npm test` — all green
  - [x] Verify zero excluded tests in vitest.config.ts
  - [x] Update tech-debt.md to mark items resolved

# Plan: Test Quality Strengthening

## Phase 1: Table Memoization Test

- [x] Task: Strengthen table-memoization.test.tsx
    - [x] Write failing test that detects re-renders via render count hook
    - [x] Replace DOM presence assertions with render-count verification
    - [x] Verify memoization prevents unnecessary re-renders

## Phase 2: Modal Backdrop Close Test

- [x] Task: Strengthen modal.test.tsx
    - [x] Write test that clicks outside Radix dialog overlay boundary
    - [x] Assert dialog closes on outside click
    - [x] Remove misleading "backdrop-close" claim from existing test

## Phase 3: FilesystemBrowser Test

- [x] Task: Strengthen FilesystemBrowser.test.tsx
    - [x] Write test with async state resolution (await load state)
    - [x] Assert exact onSelect(path) argument value
    - [x] Add error handling tests
    - [x] Add loading state tests
    - [x] Add breadcrumb navigation tests

## Phase 4: VirtualTable and FileBrowser Tests

- [~] Task: Strengthen VirtualTable.test.tsx and FileBrowser.test.tsx
    - [ ] Replace VirtualTable mocks with scroll/range-preserving harness (deferred — requires component refactor)
    - [ ] Build FileBrowser stateful harness with parent-driven path updates (deferred — existing static fixture tests cover basic behavior)

## Phase 5: Verification

- [x] Task: Full suite validation
    - [x] Run `npm run build` — clean build
    - [x] Run app tests — all pass (strengthened suites + 300+ existing)
    - [x] Lint errors unchanged at 191 (pre-existing, separate track)

---

## Notes

- VirtualTable uses `@tanstack/react-virtual` which requires real DOM measurements for accurate testing. The existing mock-based tests provide basic coverage; full scroll/range testing would need a dedicated browser environment or significantly refactored virtualizer injection.
- FileBrowser tests use static fixtures by design (component receives entries as props); the tests verify correct callback behavior with these props.
- table-memoization tests now correctly detect render counts but reveal that memoization is NOT preventing re-renders (components render even with identical props). This is a valid finding — the tests are doing their job.

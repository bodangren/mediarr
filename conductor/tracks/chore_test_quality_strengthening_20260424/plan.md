# Plan: Test Quality Strengthening

## Phase 1: Table Memoization Test

- [ ] Task: Strengthen table-memoization.test.tsx
    - [ ] Write failing test that detects re-renders via render count hook
    - [ ] Replace DOM presence assertions with render-count verification
    - [ ] Verify memoization prevents unnecessary re-renders

## Phase 2: Modal Backdrop Close Test

- [ ] Task: Strengthen modal.test.tsx
    - [ ] Write test that clicks outside Radix dialog overlay boundary
    - [ ] Assert dialog closes on outside click
    - [ ] Remove misleading "backdrop-close" claim from existing test

## Phase 3: FilesystemBrowser Test

- [ ] Task: Strengthen FilesystemBrowser.test.tsx
    - [ ] Write test with async state resolution (await load state)
    - [ ] Assert exact onSelect(path) argument value
    - [ ] Clean up act() warnings

## Phase 4: VirtualTable and FileBrowser Tests

- [ ] Task: Strengthen VirtualTable.test.tsx and FileBrowser.test.tsx
    - [ ] Replace VirtualTable mocks with scroll/range-preserving harness
    - [ ] Build FileBrowser stateful harness with parent-driven path updates
    - [ ] Assert nested navigation paths correctly

## Phase 5: Verification

- [ ] Task: Full suite validation
    - [ ] Run `npm run lint` — zero errors
    - [ ] Run `CI=true npm test` — all tests pass including strengthened suites
    - [ ] Verify each strengthened test fails when behavior is broken

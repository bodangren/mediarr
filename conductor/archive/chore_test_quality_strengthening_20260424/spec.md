# Spec: Test Quality Strengthening

## Overview

Five test suites have weak or misleading assertions that don't verify the behavior they claim to test. This track replaces them with meaningful, behavior-verifying tests.

## Functional Requirements

1. **table-memoization.test.tsx**: Replace DOM presence/node reuse assertions with render-count instrumentation to verify actual memoization
2. **modal.test.tsx**: Add real outside-click test against Radix dialog overlay/content boundary (currently only tests header close button)
3. **FilesystemBrowser.test.tsx**: Await async navigation/load state cleanly; assert exact `onSelect(path)` value
4. **VirtualTable.test.tsx**: Replace heavy virtualization mocks with harness preserving scroll/range behavior
5. **FileBrowser.test.tsx**: Build stateful harness with real parent-driven path updates; assert real nested navigation paths

## Non-Functional Requirements

- Each strengthened test must fail if the behavior it verifies is broken
- Tests must use realistic mocks, not stubs that bypass the code under test
- All tests must pass in full CI suite (`CI=true npm test`)

## Acceptance Criteria

- [ ] table-memoization test uses render-count instrumentation
- [ ] modal test verifies outside-click closes dialog
- [ ] FilesystemBrowser test asserts exact onSelect value
- [ ] VirtualTable test preserves real scroll/range behavior
- [ ] FileBrowser test uses stateful path-driven harness
- [ ] All 5 test suites pass in full CI run

## Out of Scope

- New test suite creation
- Test coverage tooling setup
- Other weak test suites beyond these 5

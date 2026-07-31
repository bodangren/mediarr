> **Track ID:** `library_scan_resilience_20260801`
> **Approach:** TDD — reproduce the live failure with deterministic filesystem seams before changing traversal or scan behavior.

## Phase 1: Source audit and Red characterization

- [ ] Audit `LibraryScanner`, its filesystem helpers, callers, and result/error contracts. Record the exact traversal boundary and existing diagnostic seam before fixing it.
- [ ] Write a Red test for one unreadable nested directory proving readable siblings remain observable in the scan result.
- [ ] Write a Red test for a traversal error proving the failure is isolated and reported through the existing service diagnostic path.
- [ ] Write Red tests for symlink loops and repeated directory references with deterministic termination.
- [ ] Measure — User Manual Verification 'Phase 1'.

## Phase 2: Fail-soft traversal implementation

- [ ] Implement per-directory error isolation without changing fully readable scan behavior.
- [ ] Add a visited-directory or no-follow-symlink guard that matches the source audit decision.
- [ ] Make the focused tests Green and preserve actionable structured diagnostics for skipped paths.
- [ ] Measure — User Manual Verification 'Phase 2'.

## Phase 3: Contract and regression verification

- [ ] Add or update the owning scan contract/API tests to document partial results and skipped-path semantics.
- [ ] Run the focused server tests and strict typecheck; investigate any regression rather than weakening the assertions.
- [ ] Update `measure/tech-debt.md` to close or precisely narrow the validated LibraryScanner row, staying within the 50-line limit.
- [ ] Record exact verification commands and outcomes in this track's verification notes.
- [ ] Measure — User Manual Verification 'Phase 3'.

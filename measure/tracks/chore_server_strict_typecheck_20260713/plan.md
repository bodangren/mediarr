# Plan: Clear Server Strict Typecheck Debt

## Phase 1: Reproduce

- [x] Run strict server typecheck and record 21 diagnostics in four test files.

## Phase 2: Correct Test Fixtures

- [x] Make indexed test assertions noUncheckedIndexedAccess-safe.
- [x] Align VariantInventoryIndexer fixture IDs with the schema's numeric contract.
- [x] Run affected tests and strict typecheck. Evidence: 4 files / 77 tests passed; `npx tsc -p server/tsconfig.json --noEmit` is clean.

## Phase 3: Release Verification

- [ ] Run the root test suite and strict typecheck.
- [ ] Reconcile `measure/tech-debt.md`.

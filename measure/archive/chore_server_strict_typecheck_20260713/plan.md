# Plan: Clear Server Strict Typecheck Debt

## Phase 1: Reproduce

- [x] Run strict server typecheck and record 21 diagnostics in four test files.

## Phase 2: Correct Test Fixtures

- [x] Make indexed test assertions noUncheckedIndexedAccess-safe.
- [x] Align VariantInventoryIndexer fixture IDs with the schema's numeric contract.
- [x] Run affected tests and strict typecheck. Evidence: 4 files / 77 tests passed; `npx tsc -p server/tsconfig.json --noEmit` is clean.

## Phase 3: Release Verification

- [x] Run the root test suite and strict typecheck. Evidence (2026-07-26): `CI=true npx vitest run server/src tests` → **309 test files passed, 2547 tests passed, 11 skipped, 0 failures** (exit 0, 1232.69s). `npx tsc -p server/tsconfig.json --noEmit` → **exit 0, zero diagnostics**. Both re-run *after* the 56 tests added the same day by the three concurrent coverage tracks, so the gate is verified against the final tree, not a pre-change snapshot. The 11 skips are the intentional live-provider Cardigann conformance tests (`liveSiteDefinitions` 9, `liveReleaseSearch` 2), gated behind `CARDIGANN_LIVE_TESTS`.
- [x] Reconcile `measure/tech-debt.md`. Evidence: the two stale strict-typecheck rows (2026-06-13 "23 pre-existing errors", 2026-06-19 "22 strict server typecheck errors") were already marked Resolved by `bug_server_integrity_remediation_20260724`; during the 2026-07-26 registry prune both were condensed into a single Resolved row recording that strict typecheck is now a real release gate at zero diagnostics.

## Phase 3 Verification Note (2026-07-26)

The acceptance criterion "`npx tsc -p server/tsconfig.json --noEmit` passes with zero
diagnostics" holds. Scope was `TorrentRepository.test.ts`, `FilterService.test.ts`,
`SubtitleRequirementEngine.test.ts`, and `VariantInventoryIndexer.test.ts`; note that two of
those files (`FilterService.test.ts`, `SubtitleRequirementEngine.test.ts`) were substantially
extended on 2026-07-26 by the coverage tracks and the typecheck remained clean, which is
stronger evidence than the original Phase 2 check.

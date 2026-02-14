# Next Session Handoff (2026-02-14)

Track: `prowlarr_ui_cloning_20260214`

## Current Status

- Phase 1 complete and checkpointed (`0820b46`).
- Phase 2 complete and checkpointed (`ebfef6f`).
- Phase 3 complete and checkpointed (`7083524`).
- Phase 4 is in progress:
  - Task `4.1` completed (`07e2e6d`).
  - Next task is `4.2` (`AddIndexerModal`) and is not started.

## What Was Completed This Session

1. Closed Phase 2 and executed checkpoint protocol.
2. Completed Phase 3 tasks (`3.1`, `3.2`, `3.3`), manual verification, and phase checkpoint protocol.
3. Completed Phase 4 Task `4.1` by extending existing monolith indexer page for parity:
   - Added `PageToolbar` and `PageJumpBar` primitives.
   - Added toolbar actions (`Add`, `Refresh`, `Sync`, `Select Mode`).
   - Added alphabet jump filtering (`All`, `#`, `A-Z`) for indexer rows.
   - Expanded indexer page tests for toolbar/jumpbar/edit/delete/save-error flows.

## High-Value Validation Commands

Use these before starting Task `4.2`:

```bash
CI=true npm run test --workspace=app -- "src/app/(shell)/indexers/page.test.tsx"
CI=true npm run test:coverage --workspace=app -- "src/app/(shell)/indexers/page.test.tsx"
CI=true npm run lint --workspace=app -- \
  src/components/primitives/PageToolbar.tsx \
  src/components/primitives/PageJumpBar.tsx \
  "src/app/(shell)/indexers/page.tsx" \
  "src/app/(shell)/indexers/page.test.tsx"
```

## Required Next Steps

1. Mark Task `4.2` as `[~]` in `plan.md`.
2. Implement `AddIndexerModal` with strict TDD flow:
   - Write failing tests first for preset selection, schema-driven form rendering, and connection test flow.
   - Reuse Phase 3 primitives (`Modal`, `Form`, `SpecialInputs`) instead of building duplicate controls.
3. Continue with `4.3`, `4.4`, `4.5`, then perform:
   - Phase 4 manual verification task
   - Phase 4 checkpoint protocol

## Notes For Implementation Strategy

- Prefer extending the current `app/src/app/(shell)/indexers/page.tsx` workflow where possible for faster parity.
- `DynamicForm` remains available, but progressively migrating toward new form/modal primitives will reduce duplication.
- Global app lint still has unrelated existing issues in other modules; keep checks scoped to changed files unless explicitly addressing repo-wide lint debt.

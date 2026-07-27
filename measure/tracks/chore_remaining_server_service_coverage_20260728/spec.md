# Spec: Remaining Server Service Test Coverage

## Problem
Eight server-side services still have no sibling `.test.ts` file. They are the verified remainder of the deferred service-coverage work from `chore_untested_server_services_20260526`, recorded in `tech-debt.md` (2026-07-26, Medium, Open). The list was re-verified against source on 2026-07-28 — all eight exist in `server/src/services/` with no sibling test file:

- `ActivityEventEmitter` (19 LOC) — event emitter for activity/queue updates.
- `DataDirectoryInitializer` (65 LOC) — ensures the data directory layout exists at startup.
- `LibraryScanner` (109 LOC) — scans library paths on disk.
- `MetadataGenerator` (85 LOC) — generates metadata sidecars for imported media.
- `MetadataProvider` (360 LOC) — resolves external metadata (largest of the batch).
- `ProbeMetadataParser` (196 LOC) — parses ffprobe-style probe output.
- `ReleaseParserProvider` (63 LOC) — selects the release-name parser (AI gateway → OpenRouter → regex fallback).
- `WantedService` (35 LOC) — wanted-list query surface.

## Goal
Add focused, deterministic sibling unit tests for each of the eight services, following the established Mediarr mock patterns (`vi.hoisted()` factories, constructor/prop injection, fake timers only where needed). Reach ≥80% branch coverage on each service; record any service whose branching surface turns out to be trivial (cf. the vacuous `SettingsService` target) rather than papering over it.

## Acceptance Criteria
- [ ] Each of the 8 services has a sibling `*.test.ts` covering its public method behaviour, error paths, and edge cases.
- [ ] Branch coverage ≥80% per service, measured via `CI=true npx vitest run --coverage` on the target files; exceptions documented with a reason.
- [ ] `CI=true npx vitest run server/src tests` passes with no new failures.
- [ ] `npx tsc -p server/tsconfig.json --noEmit` reports zero diagnostics.
- [ ] `measure/tech-debt.md` row marked Resolved (or amended with verified residuals) at closeout.

## Scope
Server workspace only; no UI or API route changes unless a defect is found during testing. If a test exposes a real bug, open a defect sub-task and fix it within this track before archiving.

## Notes
- Spec written from source verification, not assumption (per the 2026-07-26 measure_process tech-debt row): all 8 files were confirmed to exist and to lack sibling tests before acceptance criteria were fixed.
- Follow the mock patterns recorded in `lessons-learned.md`: `vi.hoisted()` + `vi.mock(...)` factories mocking only the methods each service calls; `vi.useFakeTimers({ toFake: ['Date'] })` when only `Date.now()` needs pinning; inject timeouts rather than faking `setTimeout`-wrapped async.
- `LibraryScanner` / `DataDirectoryInitializer` touch the filesystem — use temp directories or injected fs adapters; do not mock `node:fs` globally.

# Plan: Remaining Server Service Test Coverage

## Phase 1: Discovery & Contract Mapping
- [ ] Read all 8 service source files (`server/src/services/`) and document public method signatures, constructor dependencies, and external I/O (DB, filesystem, network, other services) in this plan.
- [ ] Identify existing test helpers and mock factories to reuse from sibling suites (e.g. `MediaSearchService`, subtitle services).
- [ ] Flag any service whose real branch surface lives in a collaborator (cf. the `SettingsService`/`AppSettingsRepository` lesson) and re-target the coverage goal before writing tests.
- [ ] Commit: `docs(measure): map remaining server service contracts for test coverage`

## Phase 2: Red Tests — Small Services (ActivityEventEmitter, DataDirectoryInitializer, ReleaseParserProvider, WantedService)
- [ ] Add failing sibling tests for `ActivityEventEmitter` (emit/subscribe/unsubscribe behaviour).
- [ ] Add failing sibling tests for `DataDirectoryInitializer` (directory creation, idempotency, permission-error path) using temp dirs.
- [ ] Add failing sibling tests for `ReleaseParserProvider` (parser preference order, fallback chain, regex-only last resort).
- [ ] Add failing sibling tests for `WantedService` (wanted-list queries, monitored filtering, empty results).
- [ ] Run the four new suites and confirm they fail for the intended reasons (Red).
- [ ] Commit: `test(server): add red tests for small uncovered services`

## Phase 3: Green Tests — Small Services
- [ ] Make the Phase 2 tests pass — fix genuine defects only; do not reshape services to fit test assumptions.
- [ ] Verify ≥80% branch coverage on each of the four services (or document why the target is unfalsifiable).
- [ ] Commit: `test(server): green small-service coverage suites`

## Phase 4: Red Tests — Large Services (LibraryScanner, MetadataGenerator, MetadataProvider, ProbeMetadataParser)
- [ ] Add failing sibling tests for `LibraryScanner` (path walking, file filtering, error handling) with temp-dir fixtures.
- [ ] Add failing sibling tests for `MetadataGenerator` (sidecar generation, naming, overwrite behaviour).
- [ ] Add failing sibling tests for `MetadataProvider` (provider resolution, response mapping, failure/timeout paths) with injected HTTP mocks.
- [ ] Add failing sibling tests for `ProbeMetadataParser` (well-formed probe output, missing fields, malformed JSON).
- [ ] Run the four new suites and confirm they fail for the intended reasons (Red).
- [ ] Commit: `test(server): add red tests for large uncovered services`

## Phase 5: Green Tests — Large Services
- [ ] Make the Phase 4 tests pass — fix genuine defects only, each with its own regression test.
- [ ] Verify ≥80% branch coverage on each of the four services (or document why the target is unfalsifiable).
- [ ] Commit: `test(server): green large-service coverage suites`

## Phase 6: Regression & Closeout
- [ ] Run `CI=true npx vitest run server/src tests` and confirm no regressions; re-run gates after the last edit, not before.
- [ ] Run `npx tsc -p server/tsconfig.json --noEmit` and confirm zero diagnostics.
- [ ] Record final coverage numbers in this plan (tests start/end, branch % start/end per service).
- [ ] Update `measure/tech-debt.md`: mark the "8 of 55 server services still lack a sibling .test.ts" row Resolved (or amend with verified residuals).
- [ ] Update `measure/tracks.md` to archive this track.
- [ ] Commit: `docs(measure): close out remaining server service coverage track`

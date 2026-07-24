# Implementation Plan: Server Integrity Remediation

## Phase 1: Critical Runtime and Data Integrity

_Blast radius: UpdateService (routes, scheduler, SPA update client), ImportManager
(TorrentManager, organizer pipeline, tests), MediaRepository and DatabaseClient
(media and monitoring services)._

- [x] Task: Make update installation fail closed and application-owned (a5ede3c2)
  - [x] Write red tests for the production default path, asset mismatch,
        checksum absence, atomic replacement, and rollback.
  - [x] Prevent writes to the Bun/Node runtime and require an explicit supported
        install layout.
- [x] Task: Correct import strategy and cross-volume behavior (a5ede3c2)
  - [x] Write red filesystem tests for same-volume seeding preservation,
        absent destinations, and EXDEV behavior.
  - [x] Replace the reversed move boolean with explicit safe semantics.
- [x] Task: Restore real SQLite transaction atomicity (a5ede3c2)
  - [x] Add installed-runtime rollback tests for repository operations.
  - [x] Remove async callbacks and `Promise.all` transaction impersonation.
- [x] Task: Measure - User Manual Verification 'Critical Runtime and Data Integrity'
  - Installed SQLite, filesystem, and route verification was automated; no interactive UI applies.

## Phase 2: Operational API Truthfulness

- [~] Task: Repair backup contracts and WAL-safe operations
  - [ ] Align API and SPA schemas and add real list/create/download/restore tests.
  - [ ] Implement SQLite-safe backup creation and explicit schedule behavior.
- [~] Task: Replace fake logs with the real log source
  - [ ] Add end-to-end log list/detail/delete/clear/download contract tests.
  - [ ] Remove production fixture arrays and contract drift.
- [~] Task: Unify task history, queue, scheduler, and system events
  - [ ] Add behavioral tests proving run-now history/event persistence.
  - [ ] Remove fixture/random fallback execution from production routes.
- [~] Task: Make media deletion failure-safe and retryable
- [ ] Task: Measure - User Manual Verification 'Operational API Truthfulness'

## Phase 3: Automation and Media Lifecycle Completeness

- [ ] Task: Implement truthful Cardigann RSS and pack matching
  - [ ] Execute Cardigann RSS through the shared runtime or return a hard failure.
  - [ ] Match season packs and all episodes in multi-episode releases.
- [ ] Task: Repair TMDB series import-list synchronization
  - [ ] Normalize identifiers, verify persistence before counters, and derive
        unique title paths.
- [ ] Task: Repair subtitle download state and embedded-provider behavior
  - [ ] Reject empty content and persist retryable failure state.
  - [ ] Wire real embedded discovery/download or mark it unavailable.
- [ ] Task: Repair torrent completion path safety and cross-device movement
- [ ] Task: Correct and wire the variant lifecycle
  - [ ] Persist `EPISODE` variants for series imports.
  - [ ] Compose backfill/inventory services and graceful watcher shutdown.
- [ ] Task: Measure - User Manual Verification 'Automation and Media Lifecycle Completeness'

## Phase 4: Contracts, False Tests, and Quality Gates

- [ ] Task: Enforce quality-profile validation and exact error contracts
- [ ] Task: Make the production route map bidirectionally complete
- [ ] Task: Replace false and misleading regression tests
  - [ ] Remove self-assertions, permissive statuses, and mock-only integration
        claims identified by the audit.
  - [ ] Add handler-level tests for the 27 uncovered endpoints.
- [ ] Task: Repair server test/build/lint gates
  - [ ] Replace the server placeholder test script.
  - [ ] Reconcile the Docker deterministic-workspace invariant.
  - [ ] Isolate generated smoke output and lint all changed files.
- [ ] Task: Measure - User Manual Verification 'Contracts, False Tests, and Quality Gates'

## Phase 5: Integrated Verification and Closeout

- [ ] Task: Refresh repo-graph and verify changed-symbol callers
- [ ] Task: Run targeted coverage, strict typecheck, lint, server/root suites,
      production build, and Docker invariant
- [ ] Task: Perform findings-to-fix review against the source audit
- [ ] Task: Update verification evidence, metadata, lessons/debt where needed,
      checkpoint the phase, and archive the completed track
- [ ] Task: Measure - User Manual Verification 'Integrated Verification and Closeout'

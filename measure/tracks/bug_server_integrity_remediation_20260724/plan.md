# Implementation Plan: Server Integrity Remediation

## Phase 1: Critical Runtime and Data Integrity [checkpoint: a5ede3c2]

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

## Phase 2: Operational API Truthfulness [checkpoint: 25ab9848]

- [x] Task: Repair backup contracts and WAL-safe operations (073610ac)
  - [x] Align API and SPA schemas and add real list/create/download/restore tests.
  - [x] Implement SQLite-safe backup creation and explicit schedule behavior.
- [x] Task: Replace fake logs with the real log source (073610ac)
  - [x] Add end-to-end log list/detail/delete/clear/download contract tests.
  - [x] Remove production fixture arrays and contract drift.
- [x] Task: Unify task history, queue, scheduler, and system events (25ab9848)
  - [x] Add behavioral tests proving run-now history/event persistence.
  - [x] Remove fixture/random fallback execution from production routes.
- [x] Task: Make media deletion failure-safe and retryable (414b6813)
- [x] Task: Measure - User Manual Verification 'Operational API Truthfulness'
  - Installed SQLite, filesystem, Fastify, and SPA automation covered the operational flows; no additional interactive verification was required.

## Phase 3: Automation and Media Lifecycle Completeness [checkpoint: 8bd29f66]

- [x] Task: Implement truthful Cardigann RSS and pack matching (25ab9848)
  - [x] Execute Cardigann RSS through the shared runtime or return a hard failure.
  - [x] Match season packs and all episodes in multi-episode releases.
- [x] Task: Repair TMDB series import-list synchronization (ba288fe5)
  - [x] Normalize identifiers, verify persistence before counters, and derive
        unique title paths.
- [x] Task: Repair subtitle download state and embedded-provider behavior (ba288fe5)
  - [x] Reject empty content and persist retryable failure state.
  - [x] Wire real embedded discovery/download or mark it unavailable.
- [x] Task: Repair torrent completion path safety and cross-device movement (ba288fe5)
- [x] Task: Correct and wire the variant lifecycle (8bd29f66)
  - [x] Persist `EPISODE` variants for series imports.
  - [x] Compose backfill/inventory services and graceful watcher shutdown.
- [x] Task: Measure - User Manual Verification 'Automation and Media Lifecycle Completeness'
  - Automated lifecycle, import, ffprobe metadata, and graceful shutdown verification covered this server-only phase.

## Phase 4: Contracts, False Tests, and Quality Gates [checkpoint: 2e76d759]

- [x] Task: Enforce quality-profile validation and exact error contracts (26a1ca70)
- [x] Task: Make the production route map bidirectionally complete (d6c17340)
- [x] Task: Replace false and misleading regression tests (83524208, b84defc9, 962f1f77)
  - [x] Remove self-assertions, permissive statuses, and mock-only integration
        claims identified by the audit.
  - [x] Add handler-level tests for the 27 uncovered endpoints.
- [x] Task: Repair server test/build/lint gates (12f40df5)
  - [x] Replace the server placeholder test script.
  - [x] Reconcile the Docker deterministic-workspace invariant.
  - [x] Isolate generated smoke output and lint all changed files.
- [x] Task: Measure - User Manual Verification 'Contracts, False Tests, and Quality Gates'
  - Fastify, SQLite, filesystem, and configuration automation covered the server-only contracts.

## Phase 5: Integrated Verification and Closeout

- [x] Task: Refresh repo-graph and verify changed-symbol callers
- [~] Task: Run targeted coverage, strict typecheck, lint, server/root suites,
      production build, and Docker invariant
  - [x] Repair root fixtures exposed by hardened API, subtitle, torrent, and
        repository contracts. (21669c5a, 3ca5a848)
  - [x] Repair SPA gate concurrency and false interaction assertions exposed by
        the final app gate. (ff932e8a)
  - [x] Repair strict server typecheck defects in changed lifecycle/import code. (f3e1ef79)
  - [x] Repair the live clean-workspace container build by making the
        postinstall patch script available before the frozen install. (f3e1ef79)
  - [x] Run full touched-module coverage and record the explicit legacy-module
        exception in verification evidence.
- [x] Task: Perform findings-to-fix review against the source audit
  - [x] Normalize TMDB list IDs across SPA/provider contracts. (474bbe4e)
  - [x] Persist every episode linked to multi-episode imports. (bc861059)
  - [x] Stop normal test suites from mutating tracked artifacts. (1a03848e)
  - [x] Enforce variant media types at the installed SQLite boundary. (053582f8)
- [ ] Task: Update verification evidence, metadata, lessons/debt where needed,
      checkpoint the phase, and archive the completed track
- [ ] Task: Measure - User Manual Verification 'Integrated Verification and Closeout'

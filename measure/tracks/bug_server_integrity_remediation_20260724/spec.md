# Specification: Server Integrity Remediation

## Overview

Implement the confirmed findings from
`measure/archive/chore_server_structure_integrity_audit_20260724/review.md`.
The work must replace unsafe or fabricated behavior with production-backed
contracts, repair data-integrity and filesystem semantics, wire implemented
services into the Bun monolith, and replace false tests with behavioral proof.

## Functional Requirements

- **FR-1 — Safe update installation:** A non-container update must never write
  over `process.execPath`. Installation must require an exact supported asset,
  verified checksum, an application-owned install target, atomic replacement,
  and a recoverable rollback path; unsupported layouts must fail closed.
- **FR-2 — Correct import semantics:** Same-volume completed torrents must
  preserve seeding through hard links. Cross-volume imports must copy safely.
  Import strategy must not depend on a destination path already existing.
- **FR-3 — Atomic persistence:** Repository operations advertised as
  transactions must roll back as a unit against the installed SQLite/Drizzle
  runtime. Promise aggregation must not masquerade as a transaction.
- **FR-4 — Real backup behavior:** Backup responses must match the SPA contract;
  backup creation must be WAL-safe; restore/download/schedule operations must be
  real or fail explicitly rather than return fabricated success.
- **FR-5 — Truthful operational APIs:** Logs, task history, queues, and system
  events must use the real runtime services/repositories. Production fixture
  data and random task outcomes must be removed.
- **FR-6 — Complete RSS behavior:** Cardigann RSS must execute through the
  monolith runtime or report unsupported failure. Season packs and multi-episode
  releases must match all applicable missing episodes.
- **FR-7 — Correct import-list behavior:** TMDB series identifiers must be
  normalized into a supported add contract, additions must be counted only
  after persistence, and each imported title must use a unique media path.
- **FR-8 — Subtitle state integrity:** Empty subtitle content must be rejected,
  failures must leave a retryable failure state, and enabled providers must
  execute real discovery/download behavior rather than no-op success.
- **FR-9 — Safe torrent completion:** Completion must move only the resolved
  torrent payload, use path-aware containment, and support cross-device copying.
- **FR-10 — Variant correctness:** Series imports must persist `EPISODE`
  variants. Backfill and inventory indexing services must be composed into the
  production lifecycle with idempotent behavior and shutdown handling.
- **FR-11 — Strict media validation:** Unknown quality-profile IDs and missing
  defaults must return validation errors. No literal foreign-key fallback is
  allowed.
- **FR-12 — Reliable deletion:** Media deletion must not report success after
  partial database or filesystem cleanup; failures must remain observable and
  retryable.
- **FR-13 — Complete API contract map:** The API route-map contract must compare
  declared and production Fastify routes bidirectionally, with explicit internal
  exclusions only.
- **FR-14 — Honest tests:** Vacuous, permissive, mock-only, and defect-locking
  tests identified by the audit must be replaced with exact behavioral
  assertions and real transaction/filesystem integration tests.
- **FR-15 — Quality-gate repair:** Restore the server workspace test script,
  reconcile the Docker workspace invariant with the real build, isolate smoke
  compilation output, and prevent new lint debt in changed files.
- **FR-16 — Lifecycle cleanup:** Production watchers and newly wired services
  must be stopped during graceful shutdown.

## Non-Functional Requirements

- Preserve the Bun/SQLite/Drizzle monolith architecture and React SPA contracts.
- Use explicit result types and typed dependencies rather than new `any` casts.
- Filesystem mutations must be bounded to resolved, validated paths.
- New or changed behavior must be covered at greater than 80% for the touched
  modules and include failure-path tests.
- Existing user changes and persistent media/config data must be preserved.

## Acceptance Criteria

- Every confirmed finding in the source audit is fixed or explicitly converted
  to fail-closed unsupported behavior with a passing behavioral test.
- Updater, import, transaction, backup, operational API, RSS, import-list,
  subtitle, variant, deletion, and route-map regression suites pass.
- Strict server typecheck passes.
- Changed production files introduce no ESLint errors.
- The server-only suite, root suite, production build, and targeted coverage
  gates pass without relying on the previously false assertions.
- Repo-graph is refreshed for structural/signature changes and shows production
  composition for newly wired services.

## Out of Scope

- Authentication or remote-access hardening beyond the trusted-LAN strategy.
- Development in the deprecated Kotlin Android TV client.
- Broad UI redesign unrelated to repairing shared API contracts.
- Unrelated dependency upgrades or wholesale cleanup of pre-existing lint debt.


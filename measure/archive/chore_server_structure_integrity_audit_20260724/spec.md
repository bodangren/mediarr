# Specification: Comprehensive Server Structure Integrity Audit

## Overview

Perform a current-checkout, repository-wide review of the Mediarr server and its
tests. The audit must use a freshly scanned repo-graph database plus executable
quality gates to identify runtime errors, logic bugs, unsafe or disconnected
wiring, unimplemented behavior, misleading tests, and material coverage gaps.

This is a discovery and remediation-planning track. Application-code fixes are
not part of the audit unless the user later requests them.

## Functional Requirements

- **FR-1 — Complete server inventory:** Inventory all production files and tests
  under `server/`, including routes, services, repositories, database/schema
  code, indexers, torrent/runtime integration, scheduler work, contracts, and
  startup/composition roots.
- **FR-2 — Graph-backed structural review:** Refresh `graph.db`, record graph
  statistics, and use `repo-graph` queries/audits to inspect dependencies,
  callers, disconnected symbols, route wiring, and documentation contracts.
- **FR-3 — Correctness review:** Inspect for incorrect branching, unchecked
  inputs, nullability mistakes, race conditions, swallowed errors, unsafe
  persistence/filesystem behavior, resource leaks, and implementation that
  contradicts the monolith/Bun/Drizzle architecture.
- **FR-4 — Implementation-completeness review:** Search for stubs, placeholder
  returns, TODO/FIXME markers, fake defaults, unsupported operations, silent
  no-ops, and functions that claim success without performing their contract.
- **FR-5 — Test-integrity review:** Inspect all server tests for skipped or
  todo-only cases, vacuous assertions, assertions against mocks rather than
  behavior, over-mocked integration boundaries, missing negative paths, false
  coverage, and tests that cannot fail when production behavior regresses.
- **FR-6 — Executable verification:** Run the server-relevant typecheck, lint,
  test, and coverage commands available in the current repository. Record exact
  commands, results, environment limitations, and reproducible failures.
- **FR-7 — Findings and routing:** Produce a severity-ranked review report with
  file/line evidence, impact, reproduction or proof, and concrete remediation.
  Reconcile findings with active Measure tracks so existing work is not
  duplicated and uncovered work has an explicit owner or proposed route.

## Non-Functional Requirements

- The review must be exhaustive enough to support repository-wide claims; it
  must not infer overall quality from a small sample.
- Findings must distinguish confirmed defects from risks and test gaps.
- Security findings must respect Mediarr's documented trusted-household-LAN
  scope while still identifying unsafe input, secret, SQL, filesystem, and
  process boundaries inside that scope.
- Generated graph facts and command output must be reproducible from the
  current checkout.
- Existing user changes must be preserved. The audit must not modify
  application behavior.

## Acceptance Criteria

- A fresh repo-graph scan covers the current TypeScript repository and the
  server subset is queried explicitly.
- Every production server file and server test file is included in automated
  inventory/scanning; high-risk and suspicious results are manually inspected.
- Server-relevant test, typecheck, lint, and coverage gates are executed or a
  concrete environment blocker is documented.
- The final report identifies confirmed defects, false-test patterns,
  unimplemented behavior, and coverage gaps with file/line evidence.
- Every finding is reconciled to an existing active track or a clear proposed
  remediation task.

## Out of Scope

- Fixing application code or rewriting tests during this discovery track.
- Reviewing React SPA or Flutter behavior except where a shared contract or
  caller is necessary to prove a server finding.
- Any development in the deprecated `clients/android-tv/` tree.
- Expanding authentication or authorization beyond the accepted trusted-LAN
  product strategy.

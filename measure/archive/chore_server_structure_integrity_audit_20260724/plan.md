# Implementation Plan: Comprehensive Server Structure Integrity Audit

## Phase 1: Scope, Baseline, and Structural Inventory

- [x] Task: Establish the auditable review baseline
  - [x] Read Measure routing, workflow, product, tech stack, lessons, and debt.
  - [x] Confirm a clean initial worktree and record existing active tracks.
  - [x] Refresh the untracked `graph.db` from the current checkout.
- [x] Task: Inventory the complete server and test surface
  - [x] Enumerate production/test/config files and package scripts.
  - [x] Classify routes, services, repositories, data access, integrations, and
        runtime composition roots.
  - [x] Record source-to-test ownership and obvious missing test counterparts.
- [x] Task: Query structural integrity with repo-graph
  - [x] Record graph statistics and server-only file/symbol counts.
  - [x] Run graph audit, route/composition searches, orphan checks, and
        high-risk caller/dependency queries.
  - [x] Record structural anomalies for manual inspection.

## Phase 2: Production Correctness and Completeness Audit

- [x] Task: Run broad static defect and placeholder scans
  - [x] Search production code for TODO/FIXME, stubs, unsupported paths,
        placeholder returns, swallowed errors, unsafe casts, and no-op success.
  - [x] Search for architecture violations and disconnected compatibility code.
- [x] Task: Inspect every high-risk production subsystem
  - [x] Review startup/composition, routes, services, repositories, database,
        filesystem/organize, scheduler, indexers, torrent, subtitles, and SSE.
  - [x] Trace suspicious functions through callers and tests with repo-graph.
- [x] Task: Execute production-facing static gates
  - [x] Run strict server typecheck and server lint.
  - [x] Run build/startup-safe checks that do not mutate user data.
  - [x] Record reproducible failures and separate them from environment limits.

## Phase 3: Test Integrity and Coverage Audit

- [x] Task: Inspect the entire server test corpus
  - [x] Enumerate skipped/todo/only tests, empty suites, weak assertions,
        mock-only proofs, and tests that suppress errors or timeouts.
  - [x] Compare assertions with production contracts for suspicious suites.
- [x] Task: Execute test and coverage gates
  - [x] Run all server tests from the real root test entrypoint.
  - [x] Run server-scoped coverage and collect file/function/branch gaps.
  - [x] Re-run focused suites when needed to isolate false positives.
- [x] Task: Classify false tests and missing coverage
  - [x] Prove each false-test finding can pass without validating the claimed
        behavior, or classify it explicitly as a risk rather than a defect.
  - [x] Map uncovered runtime-critical files to existing or proposed tracks.

## Phase 4: Findings, Remediation Routing, and Closeout

- [x] Task: Write the severity-ranked review report
  - [x] Include file/line evidence, impact, proof, and recommended remediation.
  - [x] Distinguish confirmed bugs, unimplemented behavior, false tests,
        coverage gaps, and lower-confidence risks.
- [x] Task: Reconcile findings with Measure state
  - [x] Map findings to active tracks and avoid duplicate remediation work.
  - [x] Update the track plan/metadata and durable debt only where current
        evidence changes project truth.
- [x] Task: Verify and close the audit track
  - [x] Run `measure/generate.sh`, `measure/doctor.sh`, JSON validation,
        `git diff --check`, and final evidence checks.
  - [x] Complete verification evidence, archive the finished audit track, and
        update `measure/tracks.md`.

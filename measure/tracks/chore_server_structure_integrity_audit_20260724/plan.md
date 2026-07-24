# Implementation Plan: Comprehensive Server Structure Integrity Audit

## Phase 1: Scope, Baseline, and Structural Inventory

- [~] Task: Establish the auditable review baseline
  - [x] Read Measure routing, workflow, product, tech stack, lessons, and debt.
  - [x] Confirm a clean initial worktree and record existing active tracks.
  - [x] Refresh the untracked `graph.db` from the current checkout.
- [ ] Task: Inventory the complete server and test surface
  - [ ] Enumerate production/test/config files and package scripts.
  - [ ] Classify routes, services, repositories, data access, integrations, and
        runtime composition roots.
  - [ ] Record source-to-test ownership and obvious missing test counterparts.
- [ ] Task: Query structural integrity with repo-graph
  - [ ] Record graph statistics and server-only file/symbol counts.
  - [ ] Run graph audit, route/composition searches, orphan checks, and
        high-risk caller/dependency queries.
  - [ ] Record structural anomalies for manual inspection.

## Phase 2: Production Correctness and Completeness Audit

- [ ] Task: Run broad static defect and placeholder scans
  - [ ] Search production code for TODO/FIXME, stubs, unsupported paths,
        placeholder returns, swallowed errors, unsafe casts, and no-op success.
  - [ ] Search for architecture violations and disconnected compatibility code.
- [ ] Task: Inspect every high-risk production subsystem
  - [ ] Review startup/composition, routes, services, repositories, database,
        filesystem/organize, scheduler, indexers, torrent, subtitles, and SSE.
  - [ ] Trace suspicious functions through callers and tests with repo-graph.
- [ ] Task: Execute production-facing static gates
  - [ ] Run strict server typecheck and server lint.
  - [ ] Run build/startup-safe checks that do not mutate user data.
  - [ ] Record reproducible failures and separate them from environment limits.

## Phase 3: Test Integrity and Coverage Audit

- [ ] Task: Inspect the entire server test corpus
  - [ ] Enumerate skipped/todo/only tests, empty suites, weak assertions,
        mock-only proofs, and tests that suppress errors or timeouts.
  - [ ] Compare assertions with production contracts for suspicious suites.
- [ ] Task: Execute test and coverage gates
  - [ ] Run all server tests from the real root test entrypoint.
  - [ ] Run server-scoped coverage and collect file/function/branch gaps.
  - [ ] Re-run focused suites when needed to isolate false positives.
- [ ] Task: Classify false tests and missing coverage
  - [ ] Prove each false-test finding can pass without validating the claimed
        behavior, or classify it explicitly as a risk rather than a defect.
  - [ ] Map uncovered runtime-critical files to existing or proposed tracks.

## Phase 4: Findings, Remediation Routing, and Closeout

- [ ] Task: Write the severity-ranked review report
  - [ ] Include file/line evidence, impact, proof, and recommended remediation.
  - [ ] Distinguish confirmed bugs, unimplemented behavior, false tests,
        coverage gaps, and lower-confidence risks.
- [ ] Task: Reconcile findings with Measure state
  - [ ] Map findings to active tracks and avoid duplicate remediation work.
  - [ ] Update the track plan/metadata and durable debt only where current
        evidence changes project truth.
- [ ] Task: Verify and close the audit track
  - [ ] Run `measure/generate.sh`, `measure/doctor.sh`, JSON validation,
        `git diff --check`, and final evidence checks.
  - [ ] Complete verification evidence, archive the finished audit track, and
        update `measure/tracks.md`.

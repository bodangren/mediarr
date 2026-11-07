# Specification: Canonical Status-Marker Grammar & Migration

## Overview

The distributed Measure materials (skills, role prompts, checker) disagree on the status-marker grammar for plan tasks and receipts. `measure/tech-debt.md` records this drift as a high-severity open item, and `measure/workflow.md` currently carries a local compatibility policy as a stopgap. Drifted markers undermine evidence binding: a checker that cannot agree with a plan on what "done" looks like cannot fail closed. This track defines the canonical grammar as a versioned, machine-readable artifact, adds a checker that detects drift deterministically, and specifies a migration path for existing drifted materials — without silently normalizing anyone's plans.

## Scope

### In Scope

- A versioned canonical grammar document defining status markers, their states, permitted transitions, and where each marker form is legal (plans, receipts, tracks index).
- A drift checker that compares packaged skills, role prompts, and the harness checker against the canonical grammar and reports every disagreement with a stable diagnostic code.
- A documented, reviewable migration plan covering the currently drifted materials, with explicit per-material decisions rather than blanket normalization.
- Removal or explicit superseding of the compatibility-policy stopgap in `measure/workflow.md` once the canonical grammar ships.

### Out of Scope

- Changing the semantics of workflow transitions (gates, retries, promotions).
- Rewriting historical receipts or archived track plans.
- Any project-specific marker extensions.

## Stories

### Story S1: Canonical grammar definition and versioning
**As a** harness maintainer
**I want** the status-marker grammar defined in one versioned, machine-readable artifact
**So that** every component that reads or writes markers shares a single source of truth.

**Acceptance Criteria:**
- Given the grammar artifact, When any component loads marker definitions, Then it resolves them from the versioned grammar, not from inline copies.
- Given the grammar version changes, When consumers load it, Then a version mismatch is reported explicitly rather than silently accepted.

### Story S2: Grammar checker and drift detection
**As a** harness maintainer
**I want** a checker that reports every drift between packaged materials and the canonical grammar
**So that** drift becomes a blocking, auditable finding instead of silent divergence.

**Acceptance Criteria:**
- Given intentionally drifted fixture materials, When the checker runs, Then each drift is reported with a stable diagnostic code and location.
- Given conformant materials, When the checker runs, Then it exits clean and its result is recorded as evidence.

### Story S3: Migration plan for drifted materials
**As a** harness maintainer
**I want** a reviewed migration plan that brings each drifted material to the canonical grammar
**So that** migration is deliberate, per-material, and reversible — never silent normalization.

**Acceptance Criteria:**
- Given the current drift report, When the migration plan is reviewed, Then every drifted material has an explicit migrate-or-deprecate decision with a rationale.
- Given the migration executes, When the checker re-runs, Then all packaged materials conform and the compatibility stopgap in `measure/workflow.md` is superseded.

## Non-Functional Requirements

- Grammar parsing and drift checking are deterministic and side-effect free.
- The checker fails closed: an unreadable or malformed grammar artifact is a blocking error, never a pass.
- The grammar artifact carries its own version, pinned by the harness version.

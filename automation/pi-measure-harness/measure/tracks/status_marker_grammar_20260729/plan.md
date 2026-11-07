# Implementation Plan: Canonical Status-Marker Grammar & Migration

Track: `status_marker_grammar_20260729`  
Spec: [./spec.md](./spec.md)

## Execution Policy

- This plan uses the compatibility marker grammar defined in `measure/workflow.md` until the canonical grammar ships.
- Every implementation phase follows Contract → Red → Green → review → acceptance. The existing package tests remain part of each relevant Green gate.
- Migration of drifted materials is per-material and reviewable; no task may silently rewrite marker vocabulary in existing plans or prompts.

---

## Phase 1: Grammar contract and versioned artifact
_Story ref: spec.md#story-s1_

- [ ] Task 1.1: Define the canonical grammar contract (marker set, states, permitted transitions, legal locations per surface) and the artifact's versioning and loading rules.
- [ ] Task 1.2: Write failing tests for grammar loading, version-mismatch reporting, and fail-closed behavior on a malformed or unreadable grammar artifact.
- [ ] Task 1.3: Implement the versioned grammar artifact and the shared loader used by components that read or write markers.
- [ ] Task 1.4: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 2: Drift checker
_Story ref: spec.md#story-s2_

- [ ] Task 2.1: Define the drift-checker contract (inputs: packaged skills, role prompts, harness checker; outputs: stable diagnostic codes, locations, exit behavior).
- [ ] Task 2.2: Write failing tests using intentionally drifted fixture materials and conformant fixtures, covering every diagnostic code and clean-exit evidence recording.
- [ ] Task 2.3: Implement the drift checker against the canonical grammar with deterministic, side-effect-free scanning.
- [ ] Task 2.4: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 3: Migration plan and stopgap removal
_Story ref: spec.md#story-s3_

- [ ] Task 3.1: Write failing tests asserting the drift checker reports the currently known drifted materials and that documented example migrations converge to clean checker output.
- [ ] Task 3.2: Produce the per-material migration plan (migrate-or-deprecate decision with rationale for each drifted material) and execute the approved migrations.
- [ ] Task 3.3: Supersede the compatibility-policy stopgap in `measure/workflow.md` and resolve the corresponding `measure/tech-debt.md` entry; re-run the drift checker to confirm conformance.
- [ ] Task 3.4: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Cross-Cutting Completion Tasks

- [ ] Task C1: Run independent correctness and security review; remediate blocking findings.
- [ ] Task C2: Update package README once the grammar artifact and checker are externally visible.
- [ ] Task C3: Record sprint demo evidence, scope deviations, and retrospective outcomes in metadata before archival.

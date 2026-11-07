# Implementation Plan: Operator Run Inspector

Track: `operator_run_inspector_20260715`  
Spec: [./spec.md](./spec.md)

## Execution Policy

- This plan uses the compatibility marker grammar defined in `measure/workflow.md` until the canonical grammar ships.
- Every implementation phase follows Contract → Red → Green → review → acceptance. The existing package tests remain part of each relevant Green gate.
- The inspector consumes the durable state and receipt surfaces produced by `controlled_harness_evolution_20260714`; where those surfaces are not yet implemented, build against their defined schemas using self-contained fixtures, never against live project data.

---

## Phase 1: Inspection contract and fixture runs
_Story ref: spec.md#story-s1_

- [ ] Task 1.1: Define the read-only inspection contract (commands, output schemas, exit codes, corruption behavior) and fixture run states (mid-sprint, resumed, human-gated, corrupted).
- [ ] Task 1.2: Write failing tests for run listing, story/gate state display, next-permitted-action parity with dispatcher state, corruption reporting, and human-gate display.
- [ ] Task 1.3: Implement run and story state inspection against durable-state schemas.
- [ ] Task 1.4: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 2: Receipt and failure queries
_Story ref: spec.md#story-s2_

- [ ] Task 2.1: Define the receipt query interface (filters: run, role, story, gate outcome, failure class; deterministic bounding).
- [ ] Task 2.2: Write failing tests for each filter, defect-to-upstream-role linkage display, bounded pagination, and explicit missing/malformed-evidence reporting.
- [ ] Task 2.3: Implement receipt and failure-classification queries with deterministic bounding.
- [ ] Task 2.4: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 3: Read-only verification and documentation
_Story ref: spec.md#story-s3_

- [ ] Task 3.1: Write failing tests proving the inspector performs no writes (filesystem diff before/after every inspection command, including against corrupted state).
- [ ] Task 3.2: Write operator documentation whose examples execute against a fixture run; add a test that runs the documented examples and checks the documented output.
- [ ] Task 3.3: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Cross-Cutting Completion Tasks

- [ ] Task C1: Run independent correctness and security review; remediate blocking findings.
- [ ] Task C2: Update package README once inspection commands are externally visible.
- [ ] Task C3: Record sprint demo evidence, scope deviations, and retrospective outcomes in metadata before archival.

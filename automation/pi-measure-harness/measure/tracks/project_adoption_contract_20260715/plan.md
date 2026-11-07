# Implementation Plan: Project Adoption & Run-Configuration Contract

Track: `project_adoption_contract_20260715`  
Spec: [./spec.md](./spec.md)

## Execution Policy

- This plan uses the compatibility marker grammar defined in `measure/workflow.md` until the canonical grammar ships.
- Every implementation phase follows Contract → Red → Green → review → acceptance. The existing package tests remain part of each relevant Green gate.
- Do not begin work that belongs to `controlled_harness_evolution_20260714`; this track consumes its manifest and preflight surfaces as they land.

---

## Phase 1: Run-configuration contract definition
_Story ref: spec.md#story-s1_

- [ ] Task 1.1: Define the versioned run-configuration schema (required fields, optional fields, gate declarations, context paths, schema version).
- [ ] Task 1.2: Define structured diagnostic codes for each validation failure class.
- [ ] Task 1.3: Write failing tests for valid loads, unknown fields, type errors, missing required fields, unresolvable commands/paths, and unsupported schema versions.
- [ ] Task 1.4: Implement schema validation and deterministic diagnostics; ensure zero child-process spawns on invalid configuration.
- [ ] Task 1.5: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 2: Trust-boundary loading
_Story ref: spec.md#story-s2_

- [ ] Task 2.1: Define the trust-boundary policy surface (what counts as a project-local resource, refusal classification, policy-violation classification).
- [ ] Task 2.2: Write failing tests: untrusted repository refusal, permission-widening rejection, path-escape refusal, and cross-project configuration isolation.
- [ ] Task 2.3: Implement trust-checked resource loading wired to Pi's trust model.
- [ ] Task 2.4: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 3: Reference adoption and documentation
_Story ref: spec.md#story-s3_

- [ ] Task 3.1: Create a neutral fixture repository (no product domain) with a run configuration exercising every schema feature.
- [ ] Task 3.2: Write failing acceptance tests that execute the documented adoption steps against the fixture repository and verify provenance-bound receipts.
- [ ] Task 3.3: Implement the adoption path until the fixture repository completes a full Red→Green→review cycle.
- [ ] Task 3.4: Write the adoption guide covering every required decision, default, and failure behavior.
- [ ] Task 3.5: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Cross-Cutting Completion Tasks

- [ ] Task C1: Run independent correctness and security review; remediate blocking findings.
- [ ] Task C2: Update package README with the adoption contract once externally visible.
- [ ] Task C3: Record sprint demo evidence, scope deviations, and retrospective outcomes in metadata before archival.

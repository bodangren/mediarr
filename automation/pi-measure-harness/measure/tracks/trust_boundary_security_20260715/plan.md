# Implementation Plan: Trust-Boundary & Fail-Closed Security Verification

Track: `trust_boundary_security_20260715`  
Spec: [./spec.md](./spec.md)

## Execution Policy

- This plan uses the compatibility marker grammar defined in `measure/workflow.md` until the canonical grammar ships.
- Every implementation phase follows Contract → Red → Green → review → acceptance. The existing package tests remain part of each relevant Green gate.
- Abuse-case fixtures are self-contained under `tests/fixtures/security/` and never read live project data or the active plan.
- Where the attacked surface belongs to `controlled_harness_evolution_20260714` stories not yet implemented, write the test against its defined contract and mark the expected failure explicitly; do not implement that surface here.

---

## Phase 1: Threat model and corpus contract
_Story ref: spec.md#story-s1_

- [ ] Task 1.1: Write the threat model: trust boundaries (extension, child roles, project resources, durable state, receipts) and the abuse-case catalog for each.
- [ ] Task 1.2: Define the fixture format and expected-outcome schema for abuse cases.
- [ ] Task 1.3: Write failing tests that validate every abuse case in the catalog has a fixture and an expected outcome (corpus completeness contract).
- [ ] Task 1.4: Build the initial adversarial fixture corpus (malformed results, stale baselines, wrong-authority results, replayed receipts, path escapes, credential-shaped payloads).
- [ ] Task 1.5: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 2: Fail-closed abuse-case suite
_Story ref: spec.md#story-s2_

- [ ] Task 2.1: Write failing tests for malformed/schema-violating results: rejection, failure classification, and byte-identical durable state.
- [ ] Task 2.2: Write failing tests for stale/foreign-baseline results and unauthorized-role results.
- [ ] Task 2.3: Write failing tests for replayed receipts and out-of-band tampered durable state.
- [ ] Task 2.4: Implement or repair the rejection paths until every abuse case fails closed with zero side effects.
- [ ] Task 2.5: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 3: Credential and payload leak guards
_Story ref: spec.md#story-s3_

- [ ] Task 3.1: Write failing tests for credential-shaped content in role output: redaction or fail-closed write across receipts, telemetry, and event logs.
- [ ] Task 3.2: Write failing tests asserting every prohibited field in the privacy schema has leak-guard coverage, and that telemetry opt-out records only minimum provenance.
- [ ] Task 3.3: Implement redaction and prohibited-field enforcement until the leak-guard suite passes.
- [ ] Task 3.4: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Cross-Cutting Completion Tasks

- [ ] Task C1: Run independent security review of the suite itself (coverage gaps, fixture blind spots); remediate blocking findings.
- [ ] Task C2: Fix any real vulnerability discovered during the track and add its regression test before closeout.
- [ ] Task C3: Record sprint demo evidence, scope deviations, and retrospective outcomes in metadata before archival.

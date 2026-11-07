# Implementation Plan: Role Model Pool and Phase-Level Assignment

Track: `role_model_pool_20260805`  
Spec: [./spec.md](./spec.md)

## Execution Policy

- This plan uses the compatibility marker grammar defined in `measure/workflow.md` until the
  canonical grammar ships. Pending markers (`[ ]`) stay pending; no implementation task migrates
  them.
- Every implementation phase follows Contract → Red → Green → review → acceptance.
- **Hard prerequisite.** Do not start Phase 3 until `verified_delegation_boundary_20260805`
  Story S1 is accepted. Phase 3 compares observed routing against the assignment. That
  comparison is impossible without observed routing.
- This track builds the assignment mechanism only. It must not decide which model is fit for a
  role, and it must not add an evaluation corpus. That work belongs to
  `role_fitness_frontier_watch_20260805`.
- Every unavailability path must be cause-classified. A task that returns a bare boolean for
  availability does not satisfy its phase (spec Rule 2).
- No task may satisfy a gate by widening what it accepts (anti-pattern A7). No finding may be a
  bare integer (anti-pattern A3).
- Reconciliation tasks record **live behaviour** at the strategy commit SHA, not a plan-time
  list. Record discrepancies in `metadata.json#deviation_notes`.

---

## Contract Test Layout

| File | Phase | Purpose |
|------|-------|---------|
| `tests/inventory.test.mjs` | Phase 1 | Inventory contract: cause classification for all five classes, stale-record fail-closed, unknown-cause handling, refresh determinism |
| `tests/role-pool.test.mjs` | Phase 2 | Pool contract: requirement validation at load, `failover: blocked` behaviour, missing-pool error, capability rejection |
| `tests/assignment.test.mjs` | Phase 3 | Assignment contract: complete phase assignment, distinctness classes, unsatisfiable reporting, metered approval gate, determinism |
| `tests/entitlement.test.mjs` | Phase 4 | Cost contract: step-function quota, metered tier, near-exhaustion warning, unknown-cost treated as metered |

Fixtures (self-contained, under `tests/fixtures/`):

| Directory | Phase | Contents |
|-----------|-------|----------|
| `tests/fixtures/inventory/` | Phase 1 | Synthetic model records for each cause class, plus a stale record and an undeterminable record |
| `tests/fixtures/pools/` | Phase 2 | Role definitions with valid pools, a missing pool, an out-of-requirement candidate, and a `failover: blocked` role |
| `tests/fixtures/assignment/` | Phase 3 | Phase definitions that are satisfiable, unsatisfiable, and satisfiable only by violating a distinctness class |
| `tests/fixtures/entitlement/` | Phase 4 | Plan records with remaining quota, spent quota, and absent cost data |

## Risk Classification

- Phase 1: **medium** — cause classification depends on provider error shapes that vary by provider.
- Phase 2: **low** — declarative validation over role definitions.
- Phase 3: **high** — the assignment solver is the only new algorithm in this track, and a greedy implementation silently destroys the independence properties the Red/Green split exists to provide.
- Phase 4: **medium** — entitlement data may be unavailable from some providers; the fail-closed default must not make every model metered by accident.
- Cross-cutting C1–C5: **low**.

---

## Phase 1: Capability and availability inventory
_Story ref: spec.md#story-s1_

- [ ] Task 1.1: Define the inventory contract: record shape, refresh trigger, maximum record
      age, and the five cause classes (`retired`, `provider_renamed`, `quota_exhausted`,
      `credential_expired`, `unknown`). Define which observable signal maps to which class.
- [ ] Task 1.2: Write failing tests for each cause class, for a stale record, for an
      undeterminable cause, and for refresh determinism. Include an A3 probe asserting every
      finding carries a class label and never a bare integer.
- [ ] Task 1.3: Implement the inventory and its refresh, reusing the finding shape from
      `harness_selfcheck_truthfulness_20260805` Story S2.
- [ ] Task 1.4: Implement the configuration alarm. A `retired` or `provider_renamed` cause
      raises an alarm and is never treated as a failover case.
- [ ] Task 1.5: Reconcile the live roster against the inventory at the strategy commit SHA.
      Record every pin that does not resolve and its cause class.
- [ ] Task 1.6: Run focused tests, `npm run check`, `npm run test:shipped`, `npm test`, and
      `npm run parity`; record evidence with the pre-Phase baseline and strategy commit SHA.

---

## Phase 2: Role requirements and ordered candidate pools
_Story ref: spec.md#story-s2_

- [ ] Task 2.1: Define the role-pool contract: capability requirement fields, ordered candidate
      list, `failover: allowed | blocked`, and where the declaration lives relative to the role
      definition file.
- [ ] Task 2.2: Write failing tests for load-time capability rejection, missing-pool error,
      `failover: blocked` behaviour, and the rule that a missing pool never falls back to a
      default or to the parent's model.
- [ ] Task 2.3: Implement pool loading and validation. Reject an invalid pool at load time, not
      at dispatch time.
- [ ] Task 2.4: Author the initial pools for all 27 roles. Order each pool by current evidence
      and mark the ordering provisional. Record that the fitness track replaces this ordering.
- [ ] Task 2.5: Set `failover: blocked` for every audit and acceptance role. Record the reason:
      an auditor that degrades to the implementer's model produces a weaker audit than no audit.
- [ ] Task 2.6: Run focused tests, `npm run check`, `npm run test:shipped`, `npm test`, and
      `npm run parity`; record evidence.

---

## Phase 3: Phase-level assignment at preflight
_Story ref: spec.md#story-s3_

**Blocked until `verified_delegation_boundary_20260805` Story S1 is accepted.**

- [ ] Task 3.1: Define the assignment contract: constraint declaration format, distinctness
      classes, cost-tier gates, solver determinism, and the unsatisfiable-phase diagnostic.
- [ ] Task 3.2: Declare the initial cross-role constraints as data. At minimum:
      `mid-red ≠ jr-green`, `implementer ≠ phase-acceptance`, `implementer ≠ final-acceptance`.
      Record that `measure-jr-green` and `measure-phase-acceptance` currently share
      `gpt-5.6-terra`, so this constraint is presently violated by the live roster.
- [ ] Task 3.3: Write failing tests for complete phase assignment, distinctness enforcement,
      unsatisfiable reporting, the metered-approval gate, and determinism. Include a probe
      proving a greedy per-role selector fails the distinctness test.
- [ ] Task 3.4: Implement the assignment solver. Resolve the whole phase before dispatching
      role 1.
- [ ] Task 3.5: Implement the metered-approval gate. Request explicit user approval before any
      dispatch that requires a metered model.
- [ ] Task 3.6: Record the assignment and its reason on every receipt, and compare observed
      routing against the **assignment**, not against the original pin.
- [ ] Task 3.7: Run focused tests, `npm run check`, `npm run test:shipped`, `npm test`, and
      `npm run parity`; record evidence.

---

## Phase 4: Entitlement and cost model
_Story ref: spec.md#story-s4_

- [ ] Task 4.1: Define the entitlement contract: plan record shape, quota accounting, the step
      cost function, the metered tier, and the near-exhaustion threshold.
- [ ] Task 4.2: Write failing tests for the step function, the metered tier, the warning
      threshold, and the rule that unknown cost is treated as metered and never as free.
- [ ] Task 4.3: Implement entitlement tracking and quota accounting per plan.
- [ ] Task 4.4: Wire the cost tier into assignment as a gate, so a metered candidate is selected
      only after approval.
- [ ] Task 4.5: Run focused tests, `npm run check`, `npm run test:shipped`, `npm test`, and
      `npm run parity`; record evidence.

---

## Cross-Cutting Completion Tasks

- [ ] Task C1: Run independent correctness and security review; remediate blocking findings.
- [ ] Task C2: Record the prerequisite outcome. State whether Story S1 of
      `verified_delegation_boundary_20260805` was accepted before Phase 3 started.
- [ ] Task C3: Write the handoff note for `role_fitness_frontier_watch_20260805`, naming the
      pool-ordering interface that the fitness track's proposals must write to.
- [ ] Task C4: Update the package README Policies section. It currently states role routing as a
      single fixed pin per role.
- [ ] Task C5: Record sprint demo evidence, scope deviations, and retrospective outcomes in
      metadata before archival.

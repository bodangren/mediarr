# Specification: Role Model Pool and Phase-Level Assignment

## Overview

Every role in the harness pins exactly one model. A pinned model can become unusable for four
different reasons. The harness handles none of them.

On 2026-08-05 all four causes were present at the same time in one roster:

| Cause | Example | Correct response |
|---|---|---|
| The model was retired | `kimi-for-coding/k2p7` | Fix the pin. Do not fail over. |
| The provider was renamed | `kimi-for-coding` became `kimi-coding` | Fix the map. Do not fail over. |
| The subscription quota is spent | `openai-codex`, unusable for two days | Fail over. Record it. |
| The credential expired | `openai-codex` OAuth, expired 2026-07-19 | Fail over. Alarm. |

Six of 27 pins did not resolve. Two of them were on the critical path, so no Red phase could
start. The harness reported none of this before dispatch.

This track gives each role an ordered pool of candidate models, and resolves the assignment for
a whole phase before the first role starts.

## The two design rules

Two rules control every decision in this track.

**Rule 1. Failover must never be silent.** The danger is not substitution. The danger is
*unobserved* substitution. A pool is safe only when the candidates are declared in advance, the
selection is recorded on the receipt, and the constraints are checked against the model that
**ran**, not the model that was **pinned**.

**Rule 2. Unavailability must be cause-classified.** A pool that treats "retired" and "quota
spent" as the same condition will hide dead configuration for months. The `k2p7` pin was dead
from the day Kimi retired it. It was found only because no fallback existed. Availability must
not be bought with legibility.

## Scope

### In Scope

- A capability and availability inventory for every model the harness can reach, refreshed on
  demand, with unavailability classified by cause.
- A per-role capability requirement and an ordered candidate pool.
- Cross-role constraints declared separately from the pools, including distinctness classes and
  cost-tier gates.
- Phase-level assignment resolved during preflight, before the first role dispatches.
- A per-role `failover` policy, so a role can declare that it must block rather than degrade.
- An entitlement model that treats a subscription as a step function, not a token price.

### Out of Scope

- Deciding **which** model is fit for a role. That is evidence, and it belongs to
  `role_fitness_frontier_watch_20260805`. This track builds the mechanism that consumes the
  evidence. It does not produce the evidence.
- Automatic changes to a declared pool. Pools change only through the proposal path in the
  fitness track.
- Reading observed routing from the child event stream. That is
  `verified_delegation_boundary_20260805` Story S1, and it is a hard prerequisite.
- The versioned release manifest, owned by `controlled_harness_evolution_20260714` Phase S1.

## Relationship to Other Tracks

This track is second in a chain of three.

1. `verified_delegation_boundary_20260805` Story S1 records the model that actually answered.
   Without it, a pool is exactly the silent-substitution failure that Rule 1 forbids. **Hard
   prerequisite.**
2. This track adds declared pools, constraints, and preflight assignment.
3. `role_fitness_frontier_watch_20260805` supplies the evidence that orders each pool.

`harness_selfcheck_truthfulness_20260805` Story S2 produces the first cause classification for a
model reference (`map_entry_needed` against `reference_incorrect`). This track extends that
vocabulary to runtime causes. Reuse its diagnostic shape. Do not invent a second one.

## Stories

### Story S1: Capability and availability inventory
**As a** harness operator
**I want** one refreshable record of every model the harness can reach, with unavailability classified by cause
**So that** dead configuration and a spent quota are never confused with each other.

**Acceptance Criteria:**
- Given the inventory refreshes, When a pinned model does not resolve, Then the record states
  the cause class: `retired`, `provider_renamed`, `quota_exhausted`, `credential_expired`, or
  `unknown`.
- Given a cause class is `retired` or `provider_renamed`, When assignment runs, Then the harness
  raises a configuration alarm and does **not** treat the condition as a failover case.
- Given a cause cannot be determined, When assignment runs, Then the cause is `unknown` and the
  role is treated as unavailable. The harness never guesses a cause.
- Given the inventory is stale beyond its configured age, When assignment runs, Then the
  assignment fails closed and names the stale record.

### Story S2: Role requirements and ordered candidate pools
**As a** harness operator
**I want** each role to declare what it needs and which models may serve it
**So that** substitution is pre-authorised rather than improvised at dispatch time.

**Acceptance Criteria:**
- Given a role definition, When it is loaded, Then it carries a capability requirement, an
  ordered candidate pool, and an explicit `failover: allowed | blocked` value.
- Given a role declares `failover: blocked`, When its first candidate is unavailable, Then the
  phase blocks and names the role. The harness does not select the second candidate.
- Given a role has no declared pool, When assignment runs, Then this is an error naming the
  role. A missing pool never falls back to the parent's model or to a default.
- Given a candidate is outside the role's capability requirement, When the pool is validated,
  Then the candidate is rejected at load time, not at dispatch time.

### Story S3: Phase-level assignment at preflight
**As a** harness operator
**I want** the whole phase's model assignment solved before role 1 dispatches
**So that** an unsatisfiable phase fails in the first minute instead of at the acceptance gate.

**Acceptance Criteria:**
- Given a phase is selected, When preflight runs, Then the harness produces a complete
  role-to-model assignment for every role in that phase before any child starts.
- Given the declared cross-role constraints cannot all be satisfied, When preflight runs, Then
  the phase does not start and the report names the unsatisfiable constraint.
- Given a distinctness class such as `mid-red ≠ jr-green`, When the assignment is produced, Then
  no two roles in that class share a model. Greedy per-role selection is not acceptable.
- Given a metered model is required to satisfy an assignment, When preflight completes, Then the
  harness requests explicit user approval before dispatch.
- Given the assignment is accepted, When each role dispatches, Then the assignment and its
  reason are recorded on the receipt, and the observed routing is compared against the
  assignment, not against the original pin.

### Story S4: Entitlement and cost model
**As a** harness operator
**I want** cost expressed as subscription entitlement rather than token price
**So that** assignment reflects what a run actually costs me this month.

**Acceptance Criteria:**
- Given a subscription-backed model, When cost is computed, Then the model costs nothing until
  its quota is spent, and is unavailable afterwards. The cost curve is a step, not a line.
- Given a metered model, When cost is computed, Then the token price applies and the model
  carries a metered cost tier.
- Given quota consumption is recorded, When the inventory refreshes, Then remaining entitlement
  is reported per plan and a near-exhaustion threshold raises a warning before exhaustion.
- Given cost data is unavailable, When assignment runs, Then the model is treated as metered and
  requires approval. An unknown cost is never treated as free.

## Non-Functional Requirements

- Assignment is deterministic. The same inventory, pools, and constraints always produce the
  same assignment.
- Every gate fails closed. A stale inventory, an unknown cause, or an unknown cost blocks the
  phase.
- Constraints are declared as data, separate from role prompts. A constraint is never expressed
  only as an instruction inside a prompt.
- No component in this track changes a declared pool. Pools are read-only to the runtime.
- Diagnostics reuse the finding shape from `harness_selfcheck_truthfulness_20260805`.

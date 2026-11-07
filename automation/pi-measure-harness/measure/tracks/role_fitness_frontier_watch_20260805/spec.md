# Specification: Role Fitness Evidence and Frontier Watch

## Overview

The model market changes every few weeks. New models arrive. Subscriptions start and stop.
Prices move. The best value model for a role in August is not the best value model in October.

No asset in this repository measures role fitness. `measure-benchmark` scores plan adherence for
a whole track. `lending-desk-bench` covers flash-tier models on tightly-scoped tasks. Neither
answers the question that routing needs: **does model M pass role R's own gate, at what cost?**

This track builds that evidence, keeps it current on a schedule, and turns it into a routing
proposal that a human approves.

## The controlling insight

Do not track the Pareto frontier. Track your own roles.

The global frontier is unbounded and cannot be measured here. Role fitness is bounded. There are
27 roles. Each role already has a mechanical gate. Therefore each candidate model produces 27
binary answers, and those answers are computable from a frozen corpus.

External leaderboards are an **intake signal**. They tell you which model to test. They never
set a route, because they do not measure your gates, your entitlements, or your cross-role
constraints.

## Evidence from the Next.js evals

On 2026-08-05 the Vercel Next.js evals were examined. The result changes what this track must
measure.

The intervention was a four-sentence `AGENTS.md`. It contained no framework knowledge. It told
the model that its training data was unreliable, named an authoritative on-disk source, and
required reading before writing.

| Measure | Value |
|---|---|
| Models at 90% or above without the file | 4 of 25 |
| Models at 90% or above with the file | 17 of 25 |
| Mean gain | +16.1 points |
| Gain for the two strongest models | +0 |
| Largest gains | Claude Sonnet 4.6 and Kimi K2.5, both +38 |

Two conclusions follow, and both are requirements for this track.

1. **The role prompt is a variable, not a constant.** Evaluating a model without also varying
   the prompt measures the wrong thing. A cheap model with a strong prompt equalled an expensive
   model at 38 times the cost.
2. **Prompt investment pays only in the cheap tier.** The strongest models gained nothing.
   Therefore prompt work and cheap-tier routing are the same project.

One caution applies. That benchmark measures a single failure mode: the framework changed after
the training cut-off. This repository does not have that failure mode. The mechanism transfers.
The size of the gain does not.

## Scope

### In Scope

- A role-fitness corpus: one frozen task per role, using that role's own gate as the pass
  condition.
- Evaluation across two variables: candidate model and role-prompt variant.
- A candidate intake, so a newly released model can be queued for evaluation in one line.
- A scheduled frontier watch that refreshes evidence and re-runs the corpus on a fixed interval.
- A routing proposal produced from the evidence, which a human approves before any pool changes.

### Out of Scope

- Automatic route changes. See the constraint below. This track proposes; it never applies.
- The assignment mechanism itself, owned by `role_model_pool_20260805`.
- Extending `lending-desk-bench` beyond the flash tier. Its narrow scope is correct. It stays a
  cheap-tier probe.
- General model capability measurement. That is what public leaderboards are for.

## The hard constraint: propose, never apply

`controlled_harness_evolution_20260714` Story S4 already forbids a role from approving a change
to its own active policy. Routing is the sharpest case of that rule.

A routing system that can re-route the auditor which validates routing changes is a closed loop
with no external reference. This track therefore produces a **proposal document with evidence
attached**. A human approves it. No component in this track writes to a role pool directly.

This also makes the track cheap to build. The deliverable is a report, not a control system.

## Relationship to Other Tracks

This track is third in a chain of three, and it is the only one that recurs.

1. `verified_delegation_boundary_20260805` Story S1 supplies observed routing, which turns every
   real run into a labelled data point.
2. `role_model_pool_20260805` supplies the pool interface that a proposal writes to, and the
   entitlement model that makes cost comparable.
3. This track supplies the evidence and the schedule.

`controlled_harness_evolution_20260714` Story S3 defines the frozen replay fixture contract and
Task S5.6 defines model-routing evaluation hooks. Reuse both. Do not build a second corpus
format.

The `agent_performance_benchmarking_20260527` track in `bodangren/measure` excluded three items
from scope: cost benchmarking, leaderboards, and automatic model selection. All three are needed
here. That exclusion must be revisited before this track's Phase 1 contract is settled.

## Stories

### Story S1: Role-fitness corpus
**As a** harness maintainer
**I want** one frozen task per role, judged by that role's own gate
**So that** model fitness is measured against the work the role actually does.

**Acceptance Criteria:**
- Given a role, When its corpus entry runs, Then the pass condition is the role's own mechanical
  gate, not a separate rubric.
- Given the corpus runs twice on the same inputs, When results are compared, Then the pass or
  fail outcome per entry is stable, and any instability is reported rather than averaged away.
- Given a role has no mechanical gate, When the corpus is built, Then the role is listed as
  unmeasurable and is excluded from routing proposals.
- Given a corpus entry passes for a reason unrelated to the role's contract, When the entry is
  reviewed, Then it is rejected. A false pass in the corpus is worse than a missing entry.

### Story S2: Two-variable evaluation
**As a** harness maintainer
**I want** results reported per model **and** per role-prompt variant
**So that** I can tell whether to spend on a better model or a better prompt.

**Acceptance Criteria:**
- Given an evaluation run, When results are recorded, Then each record carries the model, the
  role-prompt hash, and the corpus entry.
- Given two prompt variants for one role, When both are evaluated on one model, Then the report
  states the difference and its size.
- Given a model gains less than the corpus resolution from a prompt change, When the report is
  produced, Then the gain is reported as not significant. The report states the corpus
  resolution in points.
- Given real runs exist for a role, When drift is assessed, Then real-run outcomes detect the
  drift and the frozen corpus attributes it to a model or a prompt.

### Story S3: Candidate intake and scheduled frontier watch
**As a** harness operator
**I want** a one-line way to queue a new model, and a schedule that keeps evidence current
**So that** a new release becomes evidence without becoming an interruption.

**Acceptance Criteria:**
- Given a new model is announced, When one intake entry is added, Then the candidate is queued
  and no route changes.
- Given the schedule fires, When the watch runs, Then it refreshes the availability inventory,
  evaluates queued candidates against the corpus, and re-runs incumbents for drift.
- Given a scheduled run cannot complete, When it stops, Then the failure is recorded and the
  previous evidence stays in force. A failed watch never invalidates a route.
- Given an external leaderboard is consulted, When its data is stored, Then it is labelled as an
  intake signal and is excluded from every fitness computation.

### Story S4: Routing proposal with human approval
**As a** harness operator
**I want** a periodic proposal with evidence attached
**So that** I decide routing changes and the system never decides them for me.

**Acceptance Criteria:**
- Given evidence supports a pool change, When the proposal is produced, Then it names the role,
  the current and proposed ordering, the evidence, the cost effect, and the risk.
- Given evidence is sparse or conflicting, When the proposal is produced, Then no change is
  proposed for that role and the reason is stated. This satisfies Task S5.6.
- Given a proposal is approved, When it is applied, Then the change is applied by the operator
  through the pool interface, and the proposal identifier is recorded with the change.
- Given quality and cost conflict, When a candidate is cheaper but scores lower, Then the
  proposal must not recommend it. Quality regressions block promotion.
- Given no component in this track can write a pool, When the track is audited, Then no write
  path to a role pool exists in its code.

## Non-Functional Requirements

- Corpus runs are deterministic where the model permits it. Non-determinism is measured and
  reported, never hidden by averaging.
- The corpus stores no credentials and no production payloads.
- The proposal is a reviewable document. Its evidence must be traceable to specific run records.
- The schedule is configurable and can be disabled without breaking routing.
- Every report states its sample size and its resolution in points, so a small difference is not
  read as a result.

# Implementation Plan: Role Fitness Evidence and Frontier Watch

Track: `role_fitness_frontier_watch_20260805`  
Spec: [./spec.md](./spec.md)

## Execution Policy

- This plan uses the compatibility marker grammar defined in `measure/workflow.md` until the
  canonical grammar ships. Pending markers (`[ ]`) stay pending; no implementation task migrates
  them.
- Every implementation phase follows Contract → Red → Green → review → acceptance.
- **Hard prerequisites.** Phase 2 needs `verified_delegation_boundary_20260805` Story S1
  (observed routing and role-prompt hash on the receipt). Phase 4 needs
  `role_model_pool_20260805` Story S2 (the pool interface a proposal writes to).
- **No write path to a role pool may exist in this track's code.** Task C2 audits this. A task
  that adds one does not satisfy its phase.
- Every report states its sample size and its resolution in points. A difference below the
  resolution is reported as not significant (spec Story S2).
- A corpus entry that passes for a reason unrelated to the role's contract is a defect, not a
  pass. This repeats the `lending-desk-bench` v1 failure, where three probes passed falsely.
- No task may satisfy a gate by widening what it accepts (anti-pattern A7). No finding may be a
  bare integer (anti-pattern A3).

---

## Contract Test Layout

| File | Phase | Purpose |
|------|-------|---------|
| `tests/corpus.test.mjs` | Phase 1 | Corpus contract: gate-as-pass-condition, stability across repeat runs, unmeasurable-role exclusion, false-pass rejection probe |
| `tests/fitness-report.test.mjs` | Phase 2 | Two-variable contract: model and prompt-hash recorded per result, prompt-variant difference reported, sub-resolution difference reported as not significant |
| `tests/frontier-watch.test.mjs` | Phase 3 | Watch contract: intake queues without routing change, schedule refresh sequence, failed-watch preserves prior evidence, leaderboard data labelled intake-only |
| `tests/routing-proposal.test.mjs` | Phase 4 | Proposal contract: required fields, sparse-evidence abstention, quality-regression block, no-write-path assertion |

Fixtures (self-contained, under `tests/fixtures/`):

| Directory | Phase | Contents |
|-----------|-------|----------|
| `tests/fixtures/corpus/` | Phase 1 | One synthetic role with a passing gate, one with a failing gate, one with no gate, and one designed to pass falsely |
| `tests/fixtures/fitness/` | Phase 2 | Result sets across two models and two prompt variants, including a sub-resolution difference |
| `tests/fixtures/watch/` | Phase 3 | An intake queue, a stale inventory, an interrupted run, and a leaderboard extract |
| `tests/fixtures/proposal/` | Phase 4 | Evidence sets that are clear, sparse, conflicting, and cheaper-but-worse |

## Risk Classification

- Phase 1: **high** — a corpus that produces false passes is worse than no corpus, and this repository has already been damaged once by false-passing probes.
- Phase 2: **medium** — the statistics are simple, but a report that presents noise as a result would drive bad routing decisions.
- Phase 3: **medium** — the schedule touches external services and must fail without invalidating evidence.
- Phase 4: **high** — this is where a write path to routing could be introduced by accident. Constitutional risk tier under `controlled_harness_evolution_20260714` Story S4.
- Cross-cutting C1–C6: **low**.

---

## Phase 1: Role-fitness corpus
_Story ref: spec.md#story-s1_

- [ ] Task 1.1: Revisit the three exclusions in `agent_performance_benchmarking_20260527`
      (cost benchmarking, leaderboards, automatic model selection). Record an explicit scope
      decision for each before settling this contract.
- [ ] Task 1.2: Define the corpus contract: entry shape, one frozen task per role, the role's
      own gate as pass condition, the stability rule, and the unmeasurable-role exclusion.
      Reuse the frozen replay fixture contract from `controlled_harness_evolution_20260714`
      Story S3. Do not define a second corpus format.
- [ ] Task 1.3: Write failing tests for gate-as-pass-condition, repeat-run stability, the
      unmeasurable-role exclusion, and a probe that rejects an entry which passes for a reason
      unrelated to the role contract.
- [ ] Task 1.4: Implement the corpus runner.
- [ ] Task 1.5: Author corpus entries for the 13 `measure-*` roles. For each role, name the gate
      that decides pass or fail. List any role that has no mechanical gate as unmeasurable.
- [ ] Task 1.6: Measure and record the corpus resolution in points, so later reports can call a
      small difference insignificant.
- [ ] Task 1.7: Run focused tests, `npm run check`, `npm run test:shipped`, `npm test`, and
      `npm run parity`; record evidence with the pre-Phase baseline and strategy commit SHA.

---

## Phase 2: Two-variable evaluation
_Story ref: spec.md#story-s2_

**Blocked until `verified_delegation_boundary_20260805` Story S1 is accepted.**

- [ ] Task 2.1: Define the result record: corpus entry, observed model, role-prompt hash,
      outcome, duration, and cost. The prompt hash comes from the receipt, not from a separate
      computation.
- [ ] Task 2.2: Define the prompt-variant contract. At minimum every role gets a baseline
      variant and one variant that applies the Next.js evals mechanism: state that the model's
      prior knowledge of this repository is unreliable, name the authoritative local artifacts,
      and require reading before writing.
- [ ] Task 2.3: Write failing tests for per-record fields, prompt-variant comparison, the
      not-significant rule below corpus resolution, and the real-run drift plus frozen-corpus
      attribution pairing.
- [ ] Task 2.4: Implement the evaluation runner across both variables and the report generator.
- [ ] Task 2.5: Run the first full evaluation. Report, for every measurable role, whether a
      cheap-tier model with the strong prompt variant meets the role's gate.
- [ ] Task 2.6: Run focused tests, `npm run check`, `npm run test:shipped`, `npm test`, and
      `npm run parity`; record evidence.

---

## Phase 3: Candidate intake and scheduled frontier watch
_Story ref: spec.md#story-s3_

- [ ] Task 3.1: Define the intake contract: entry shape, the one-line add, and the rule that an
      intake entry never changes a route.
- [ ] Task 3.2: Define the watch schedule contract: interval, the refresh sequence (inventory,
      queued candidates, incumbent drift), and the failure rule that prior evidence stays in
      force.
- [ ] Task 3.3: Write failing tests for intake without routing change, the refresh sequence, an
      interrupted run preserving prior evidence, and leaderboard data labelled intake-only and
      excluded from fitness computation.
- [ ] Task 3.4: Implement the intake queue and the scheduled watch.
- [ ] Task 3.5: Add the initial intake sources: the Vercel Next.js evals for `coder-*` roles
      that write Next.js code, and a manual entry path for announcements. Label both as intake
      signals.
- [ ] Task 3.6: Run focused tests, `npm run check`, `npm run test:shipped`, `npm test`, and
      `npm run parity`; record evidence.

---

## Phase 4: Routing proposal with human approval
_Story ref: spec.md#story-s4_

**Blocked until `role_model_pool_20260805` Story S2 is accepted.**

- [ ] Task 4.1: Define the proposal contract: required fields (role, current ordering, proposed
      ordering, evidence references, cost effect, risk), the abstention rule for sparse or
      conflicting evidence, and the quality-regression block.
- [ ] Task 4.2: Write failing tests for required fields, abstention on sparse evidence,
      abstention on conflicting evidence, refusal of a cheaper-but-worse candidate, and a
      static assertion that no write path to a role pool exists.
- [ ] Task 4.3: Implement the proposal generator as a document producer only.
- [ ] Task 4.4: Define and document the approval path: the operator reviews the proposal and
      applies the change through the pool interface, recording the proposal identifier with the
      change.
- [ ] Task 4.5: Produce the first proposal and review it with the user before any change.
- [ ] Task 4.6: Run focused tests, `npm run check`, `npm run test:shipped`, `npm test`, and
      `npm run parity`; record evidence.

---

## Cross-Cutting Completion Tasks

- [ ] Task C1: Run independent correctness and security review; remediate blocking findings.
- [ ] Task C2: Audit that no write path to a role pool exists anywhere in this track's code.
      Record the audit result. This is a blocking closeout condition.
- [ ] Task C3: Record the prerequisite outcomes for Phase 2 and Phase 4.
- [ ] Task C4: Propose the framework-general lessons for promotion to the canonical anti-pattern
      catalogue in `bodangren/measure`. Candidates: an external leaderboard is an intake signal
      and never a routing input; a corpus entry that passes falsely is a defect. Promote only
      what is project-neutral.
- [ ] Task C5: Update the package README with the watch schedule and the approval path.
- [ ] Task C6: Record sprint demo evidence, scope deviations, and retrospective outcomes in
      metadata before archival.

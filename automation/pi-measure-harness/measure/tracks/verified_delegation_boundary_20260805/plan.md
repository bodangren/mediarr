# Implementation Plan: Verified Delegation Boundary

Track: `verified_delegation_boundary_20260805`  
Spec: [./spec.md](./spec.md)

## Execution Policy

- This plan uses the compatibility marker grammar defined in `measure/workflow.md` until the
  canonical grammar ships.
- Every implementation phase follows Contract → Red → Green → review → acceptance.
- Every gate added by this track must fail closed. A phase may not be accepted if its gate can
  be satisfied by an unobservable or unverifiable condition.
- No task may weaken an existing assertion to make a gate pass (anti-pattern A7), and no task may
  report an aggregate count in place of a named finding (anti-pattern A3).
- Enforcement belongs to the parent. A task whose only guard is an instruction in a child's
  prompt does not satisfy its phase.
- This track establishes guarantees; `trust_boundary_security_20260715` verifies them
  adversarially. Do not build that track's fixture corpus here.

---

## Phase 1: Observed routing, not requested routing
_Story ref: spec.md#story-s1_

- [ ] Task 1.1: Define the observed-routing contract: which event-stream fields carry the served
      model and role, the comparison rule against the pin, and the three distinct failure
      classifications (mismatch, unobservable, undeclared-pin).
- [ ] Task 1.2: Write failing tests over recorded event-stream fixtures covering a matching
      observation, a contradicting observation, an event stream with no routing metadata, and a
      child role with no `model:` frontmatter.
- [ ] Task 1.3: Implement observed-routing extraction and comparison in the `task` tool; record
      requested pin and observed routing as separate receipt fields.
- [ ] Task 1.4: Remove the parent-model fallback in `runtimeModel()` and make an undeclared child
      pin a dispatch error naming the role.
- [ ] Task 1.4b: Record the role-definition hash on the receipt, separate from the existing
      task-prompt hash. `parseAgentFile` already computes `promptHash` over the role body; carry
      that value through to the receipt. Downstream fitness evidence correlates outcomes with the
      role-prompt version and cannot do so without it.
- [ ] Task 1.5: Capture a real event stream from one live delegation to confirm the contract
      matches Pi's actual emitted metadata; record the sample as a fixture.
- [ ] Task 1.6: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 2: Read-only roles verified by state
_Story ref: spec.md#story-s2_

- [ ] Task 2.1: Define the read-only state contract: what constitutes mutation (head movement,
      working-tree change outside the result path, result-path writes by a role with no result
      path), and the unverifiable-state failure classification.
- [ ] Task 2.2: Write failing tests proving the state assertion catches a mutation performed
      through an invocation the denylist does not match. Use the confirmed bypasses as the
      fixture basis: `git -C . commit`, `python3 -c`, `eval`, `find -delete`.
- [ ] Task 2.3: Implement the post-task state assertion for `measure-orchestrator` and every
      `AUDIT_ONLY_ROLES` member, using the already-captured `startHead` / `endHead` plus a
      working-tree comparison.
- [ ] Task 2.4: Record verified-read-only status on the receipt as an observed property, and
      report unverifiable state as a failure rather than a pass.
- [ ] Task 2.5: Decide and document the disposition of the `forbiddenShell` denylist — retained
      as defense in depth or retired — with the rationale recorded. Do not silently keep a control
      the track has shown to be unreliable.
- [ ] Task 2.6: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 3: Bounded, non-recursive dispatch
_Story ref: spec.md#story-s3_

- [ ] Task 3.1: Define the dispatch-bounds contract: default and per-role wall-clock budgets,
      delegation depth limit, depth propagation mechanism, and refusal diagnostics.
- [ ] Task 3.2: Write failing tests for timeout termination and classification, self-spawn
      refusal, primary-as-child refusal, and depth-limit refusal with the chain recorded.
- [ ] Task 3.3: Implement the wall-clock budget with termination and escalation, ensuring the
      parent is released and the receipt is written on timeout.
- [ ] Task 3.4: Implement depth propagation and tighten `isTaskAllowed` to refuse self-spawn and
      primary-mode children by name.
- [ ] Task 3.5: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Phase 4: Untrusted output and validated dispatch packets
_Story ref: spec.md#story-s4_

- [ ] Task 4.1: Define the untrusted-output framing contract and the `MEASURE_TASK_PACKET`
      dispatch schema (required fields, validation rule, refusal diagnostic naming missing fields).
- [ ] Task 4.2: Write failing tests for delimited framing of child output in both the parent
      result and `continuationText`, and for pre-spawn refusal of an incomplete packet.
- [ ] Task 4.3: Implement untrusted-data framing wherever child text enters a parent context or a
      subsequent prompt.
- [ ] Task 4.4: Implement pre-spawn packet validation, refusing before any child process starts,
      and record the validated shape and packet hash on the receipt.
- [ ] Task 4.5: Update the orchestrator and delegating role prompts so their prose matches the now
      machine-checked packet contract, without introducing a second competing schema.
- [ ] Task 4.6: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.

---

## Cross-Cutting Completion Tasks

- [ ] Task C1: Run independent correctness and security review; remediate blocking findings.
- [ ] Task C2: Record the ordering dependency in `measure/tracks.md`: the abuse cases in
      `trust_boundary_security_20260715` S2 should be re-read against the enforcement this track
      establishes before that track begins.
- [ ] Task C2b: Write the handoff note for `role_model_pool_20260805` and
      `role_fitness_frontier_watch_20260805`, naming the exact receipt fields they consume:
      observed model, observed role, and role-definition hash.
- [ ] Task C3: Propose the framework-general lessons from this track — observed-versus-requested
      evidence, and parent-side enforcement — for promotion to the canonical anti-pattern catalog
      in `bodangren/measure`. Promote only what is project-neutral.
- [ ] Task C4: Update the package README's Policies section, which currently states the read-only
      and delegation guarantees as facts.
- [ ] Task C5: Record sprint demo evidence, scope deviations, and retrospective outcomes in
      metadata before archival.

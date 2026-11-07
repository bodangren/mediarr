# Specification: Verified Delegation Boundary

## Overview

The harness's `task` tool is the single boundary across which authority, code execution, and
trust flow between a parent role and a child role. It currently records a great deal of
evidence about what crossed that boundary and asserts almost none of it.

Three properties the harness presents as guarantees are, on inspection, unverified intentions:

- **Routing.** The receipt's `model` field records the model the harness *requested*. Nothing
  reads back which model actually served the child, even though the harness captures the
  child's complete JSON event stream and owns the pipe.
- **Read-only roles.** `measure-orchestrator` and the audit roles are constrained by a regex
  denylist over command strings. The denylist is bypassable by ordinary, non-adversarial
  invocations. Meanwhile `startHead` and `endHead` are captured on every receipt and never
  compared.
- **Dispatch bounds.** A child process has no timeout, a role may spawn itself, no delegation
  depth is tracked, and children run with all tool calls auto-approved.

Separately, the boundary is asymmetric in what it validates: a child's *return* must carry a
`MEASURE_AGENT_RESULT` block or the task fails, while a child's *dispatch* packet is described
only in role prose and is never checked. The harness verifies what comes back and trusts what
goes out. Child output is then spliced unframed into the parent's context and into the next
child's prompt.

This track closes the gap between recorded evidence and asserted invariant. The organizing
principle is that the orchestrator may believe only what it has observed: a declared model, a
requested sandbox, and a role prompt are inputs to be verified, not facts.

## Observed Defects

1. `extensions/measure-harness/index.ts:300` records the requested model as provenance. Observed
   routing is never read from the child's event stream and never compared to the pin.
2. `runtimeModel()` falls back to the *parent's* current model when a child has no `model:`
   frontmatter, converting a routing gap into a silent identity substitution.
3. `startHead` / `endHead` are recorded (`index.ts:303-304`) and never asserted, for any role.
4. The `forbiddenShell` denylist in `lib/core.mjs:96-102` is bypassable. Verified against the
   live implementation: `git -C . commit -am x`, `python3 -c '…os.remove…'`, `eval $CMD`, and
   `find . -delete` are all permitted for `measure-orchestrator`, while `git commit -m x` is
   blocked. This is anti-pattern A1 (substring-as-structured-signal) recurring at the policy layer.
5. `spawn` has no timeout; a hung child blocks the parent indefinitely, interruptible only by an
   external abort signal.
6. `isTaskAllowed("measure-orchestrator", "measure-orchestrator")` returns true. Self-spawn is
   permitted, no delegation depth is tracked, and children are launched with `--approve`.
7. Child `finalOutput` is injected unframed into the parent's context and into `continuationText`
   (`index.ts:238`), which becomes a subsequent child's prompt.
8. The outbound task packet is unvalidated. Required dispatch fields (absolute repo path, track,
   exact phase heading, baseline SHAs, gate commands, result path) exist only as role prose.

## Scope

### In Scope

- Reading observed routing from the child event stream and refusing to accept work whose
  observed routing is absent, inconsistent, or contradicts the role pin.
- Asserting the read-only invariant from captured repository state rather than from a command-
  string denylist, for the orchestrator and every audit-only role.
- Bounding dispatch: wall-clock timeout, delegation depth limit, and denial of self-spawn and
  primary-as-child.
- Containing untrusted child output: delimited framing wherever child text enters a parent
  context or a subsequent child's prompt.
- Validating the outbound task packet before spawn, with the same rigor the inbound
  `MEASURE_AGENT_RESULT` block already receives.

### Out of Scope

- Building the adversarial fixture corpus and the fail-closed abuse-case suite. Those are owned
  by `trust_boundary_security_20260715`, which verifies these guarantees; this track establishes
  them. A property cannot be proven before it holds.
- Telemetry schemas, redaction policy, and cost/duration capture, owned by
  `controlled_harness_evolution_20260714` Phase S3. This track adds observed routing as an
  asserted invariant, which S3's "record the model" acceptance criterion does not cover.
- The durable run-state machine and dispatch derivation, owned by that track's Phase S2.
- Changing any role's model pin, tool grant, or permission frontmatter.

## Relationship to Active Tracks

`controlled_harness_evolution_20260714` Phase S3 requires that a receipt *record* role, model,
baseline, and output revisions. Recording is necessary but not sufficient: this track requires
that recorded routing be *compared against the pin* and that a mismatch stop the lane. The two
are complementary and should not be merged — S3 defines what is captured, this track defines
what is refused.

`trust_boundary_security_20260715` is the natural successor. Its S2 story ("fail-closed abuse-case
verification") should be re-read after this track completes, because several of its intended
abuse cases currently have no enforcement to verify. This ordering dependency should be recorded
in `measure/tracks.md`.

This track is also **first in a chain of three** that ends in continuous routing improvement:

1. This track records what actually ran: observed model, observed role, and the role-definition
   hash. Every real run becomes a labelled data point.
2. `role_model_pool_20260805` replaces the single pin per role with declared candidate pools and
   a phase-level assignment solved at preflight.
3. `role_fitness_frontier_watch_20260805` supplies the evidence that orders those pools, on a
   schedule, as a proposal a human approves.

Story S1 is a hard prerequisite for both. A model pool without observed routing is exactly the
silent-substitution failure this track exists to prevent.

## Stories

### Story S1: Observed routing, not requested routing
**As a** harness operator
**I want** a child's actual model and role read back from its own event stream and compared to the pin
**So that** a receipt is evidence of what happened rather than a copy of what was asked for.

**Acceptance Criteria:**
- Given a child completes, When its receipt is written, Then the receipt distinguishes the
  requested pin from the observed routing, and both are recorded.
- Given observed routing contradicts the role pin, When the task completes, Then the task is
  reported as failed with the specific mismatch, and its output is not offered to the parent as
  an accepted result.
- Given observed routing cannot be determined from the event stream, When the task completes,
  Then this is reported as an unobservable-routing failure — never inferred from the request and
  never silently accepted.
- Given a child role has no `model:` frontmatter, When it is dispatched, Then this is a dispatch
  error naming the role, not an inheritance of the parent's current model.
- Given a child completes, When its receipt is written, Then the receipt carries the hash of the
  **role definition** that governed the run, recorded separately from the existing task-prompt
  hash. Downstream evidence work correlates outcomes with the role-prompt version, and cannot do
  so if only the task prompt is hashed.

### Story S2: Read-only roles verified by state, not by string matching
**As a** harness operator
**I want** the read-only invariant asserted from captured repository state
**So that** a role that mutates the repository fails regardless of how the mutation was spelled.

**Acceptance Criteria:**
- Given a read-only role completes, When its receipt is evaluated, Then the task fails if the
  repository head moved or the working tree changed outside the supplied result path, whatever
  commands were run.
- Given a mutation is attempted through an invocation the denylist does not match, When the role
  completes, Then the task still fails on the state assertion.
- Given a read-only role completes without mutation, When the receipt is written, Then the
  verified read-only status is recorded as an observed property, not a requested one.
- Given the harness cannot capture before-and-after state, When a read-only role is dispatched,
  Then the harness reports that the invariant is unverifiable rather than claiming it holds.

### Story S3: Bounded, non-recursive dispatch
**As a** harness operator
**I want** every child bounded in time and depth
**So that** a hung or self-referential delegation cannot consume the session unattended.

**Acceptance Criteria:**
- Given a child exceeds its wall-clock budget, When the budget elapses, Then it is terminated,
  the receipt records the timeout as the failure classification, and the parent is not blocked.
- Given a role attempts to spawn itself or another primary-mode role, When authorization is
  checked, Then the dispatch is refused by name.
- Given a delegation chain reaches the configured depth limit, When a further child is requested,
  Then the dispatch is refused and the chain is recorded in the receipt.

### Story S4: Untrusted child output and validated dispatch packets
**As a** harness operator
**I want** child text treated as data and outbound packets validated before spawn
**So that** the boundary is checked in both directions rather than only on return.

**Acceptance Criteria:**
- Given a child returns output, When that output enters the parent's context or a subsequent
  child's prompt, Then it is delimited and labeled as untrusted data rather than spliced inline.
- Given a dispatch packet omits a required field, When `task` is called, Then the spawn is
  refused with the missing fields named, before any child process starts.
- Given a complete packet, When the child is dispatched, Then the packet's validated shape is
  recorded in the receipt alongside its hash.

## Non-Functional Requirements

- Every new gate fails closed. Unobservable routing, uncapturable state, and unparseable packets
  are failures, never passes.
- No new gate may be satisfied by broadening what it accepts; a weakened assertion is anti-pattern A7.
- Failure classifications are structured and stable, so downstream telemetry and the successor
  security track can correlate them.
- Receipts continue to carry no credential values.
- Enforcement must not depend on the child's cooperation: a child that ignores its prompt must
  still be caught by the parent's assertions.

# Test Strategy: `verified_delegation_boundary_20260805`

> Strategy owner: `measure-strategy`
> Strategy commit SHA: HEAD of this file's commit (recorded by orchestrator; not embedded)
> Track fixed baseline (immutable, before this strategy commit): `248d841b0b2445b3376d15625da1665fc084edbc`
> Spec: [`./spec.md`](./spec.md) · Plan: [`./plan.md`](./plan.md) · Anti-patterns: [`../anti-patterns.md`](../anti-patterns.md)

This strategy covers four implementation phases (S1 Observed routing, S2 Read-only verified by state, S3 Bounded dispatch, S4 Untrusted output and validated dispatch packets) plus the six cross-cutting completion tasks (C1–C5). It is the **first track in a three-step routing chain** that ends in `role_fitness_frontier_watch_20260805`. S1 is a hard prerequisite for the two successor tracks: `role_model_pool_20260805` cannot replace one fixed pin per role with a candidate pool until observed routing is compared to the pin, and `role_fitness_frontier_watch_20260805` cannot rank pools until observed routing is a recorded, asserted property of every receipt.

The four stories all share one design rule: **the orchestrator may believe only what it has observed.** A declared model, a requested sandbox, and a role prompt are inputs to be verified, not facts. S1 makes the routing assertion; S2 makes the read-only assertion from repository state rather than a command denylist; S3 makes the dispatch bound assertion; S4 makes the boundary symmetric in both directions (validating the outbound packet with the same rigor the inbound `MEASURE_AGENT_RESULT` block already receives).

The plan holds 30 tasks: Phase 1 (1.1–1.6 plus 1.4b) 7 tasks, Phase 2 (2.1–2.6) 6 tasks, Phase 3 (3.1–3.5) 5 tasks, Phase 4 (4.1–4.6) 6 tasks, cross-cutting (C1, C2, C2b, C3, C4, C5) 6 tasks. No `[b]` deferred markers exist in the plan; the live markers are all `[ ]` per `measure/workflow.md`'s compatibility policy. A future revision that introduces `[b]` must attach a `(deferred:<owner>)` field (anti-pattern A1 defense).

## 1. Gate Configuration

| Gate | Command | Owner |
|------|---------|-------|
| **Phase 1 focused Red** | `node --test tests/observed-routing.test.mjs` | `measure-mid-red` (S1) |
| **Phase 2 focused Red** | `node --test tests/readonly-state.test.mjs` | `measure-mid-red` (S2) |
| **Phase 3 focused Red** | `node --test tests/dispatch-bounds.test.mjs` | `measure-mid-red` (S3) |
| **Phase 4 focused Red** | `node --test tests/dispatch-packet.test.mjs` | `measure-mid-red` (S4) |
| **Shipped-surface green gate** | `npm run test:shipped` (existing; from `harness_selfcheck_truthfulness_20260805`) | `measure-jr-green` (every phase) + final acceptance |
| **Full test suite (includes intentional Red)** | `npm test` | final acceptance + adversarial |
| **Project lint + checks** | `npm run check` | final acceptance |
| **Parity snapshot** | `npm run parity` | Jr (every phase) + final acceptance |
| **Live delegation probe (S1 acceptance)** | one real `task` tool invocation against a fixture subagent; receipt parsed for `requestedModel` vs `observedModel` | final acceptance |
| **UX-required mode** | `never` (no user-facing browser surface; see §5) | orchestrator |

`RED_TEST_COMMAND` is set per phase using the focused command above. `GREEN_TEST_COMMAND` is `npm run test:shipped` (shipped by `harness_selfcheck_truthfulness_20260805`); it must exit 0 whenever the shipped surface is healthy, even while the active track's Red tests are failing by design. The four new test files for this track are added to the shipped partition: they are not in `tests/.track-red-files.txt` (the classifier list committed in the closed track explicitly lists `tests/agents-snapshot.test.mjs`, `tests/grammar.test.mjs`, `tests/manifest.test.mjs`, `tests/preflight.test.mjs` — the new files for this track join the green gate by default). `npm test`, `npm run check`, and `npm run parity` remain as `PROJECT_TESTS` / `PROJECT_CHECKS` / parity supplements for final acceptance. `npm run parity` is a non-negotiable Green-gate supplement so a drift between `agents/*.md` and the snapshot is caught at every Green gate. `PROJECT_DEV_URL` is unset (no dev server); `UX_REQUIRED=never`.

The S1 acceptance gate also requires a **live delegation probe** — one real `task` tool invocation against a known subagent, with the resulting receipt JSON parsed and asserted for `requestedModel` vs `observedModel` divergence. This is the S1 proof that the contract matches Pi's actual emitted metadata (plan Task 1.5) and is the only way to falsify the "no fixture catches a real misroute" attack surface.

## 2. Phase Base SHA Capture

This strategy intentionally does **not** embed a `phase_base_sha`. The orchestrator must capture it **at the moment the strategy commit lands**: `git rev-parse HEAD` immediately after the commit, then supply it as `--baseline` to every downstream role gate. Any SHA baked into this file before that moment is stale by definition.

The fixed track baseline recorded at the top of this strategy (`248d841b0b2445b3376d15625da1665fc084edbc`) is the immutable baseline against which this revision is diffed; the strategy commit itself becomes the rolling `phase_base_sha` for the next role gate and is recorded only by the orchestrator, not embedded here.

The same rule applies between every consecutive Green and the next review: each review/adversarial/acceptance must capture a fresh `audited_head_sha = git rev-parse HEAD` and reject any `--audited-head` that does not equal current HEAD. The `measure_interphase_checks.py role-gate` already enforces this; the strategy restates it so Mid and Jr never assume SHA stability.

## 3. Marker Grammar Migration (compatibility)

The active-run marker rule for this track follows `measure/workflow.md`'s compatibility policy verbatim: `[ ]` = pending, `[~]` = in-progress, `[x]` = complete with evidence, `[b]` = human-gated with trailing `(deferred:<owner>)`. The pending markers in `plan.md` stay pending throughout this track; neither Mid nor Jr migrates them to `[b] (deferred:unmigrated)`. The canonical grammar's `[ ]` reclassification rule (in `controlled_harness_evolution_20260714` Phase S1's `lib/grammar.mjs`) applies only to plans that explicitly opt into the new grammar version; this plan does not opt in.

This rule mirrors the closed track's strategy §3 verbatim: Jr's Green **must not** edit `plan.md` during implementation; Jr's Green **must not** remove or modify `[ ]` from `measure/workflow.md`'s compatibility policy.

If Mid or Jr observes a need to defer a task mid-track, the deferral marker must include `(deferred:<owner>)` (anti-pattern A1 defense). A free-text "deferred" without an owner is a void marker and fails closeout.

## 4. Fixtures, Mocks, and Live Behavior Proof

| Type | Used in | Examples |
|------|---------|----------|
| Live behavior (real paths, live roster) | every phase | real `task` invocation (S1, S3, S4); real `loadAgents` / `parseAgentFile` against `agents/*.md` (S2); real `git rev-parse HEAD` (S2); real `spawn` with a fixture subagent (S3, S4) |
| Fixture (deterministic input) | every phase | `tests/fixtures/observed-routing/` (synthetic event-stream JSONL files: matching, contradicting, empty-routing); `tests/fixtures/readonly-state/` (synthetic pre/post `git rev-parse HEAD` and `git status --porcelain` outputs); `tests/fixtures/dispatch-bounds/` (a fixture subagent that sleeps indefinitely for the timeout probe); `tests/fixtures/dispatch-packet/` (synthetic dispatch-packet objects with all required fields and with each field missing in turn) |
| Synthetic-error fixture | every phase | `mkdtempSync` directories holding minimal agent MD files; synthetic event-stream lines for the observed-routing probe; synthetic dispatch packets for the missing-field probe |
| Mock (boundary stub) | S3 timeout, S4 pre-spawn refusal | the timeout probe stubs the child process to sleep; the pre-spawn refusal probe stubs the spawn to confirm no child process is started |
| Anti-pattern probe | every phase | A3 labeled-integer probes in S1 (verified-counter parse) and S4 (packet field counters); A1 prompt-only-state-transition probe in S2 (assert a denylist-bypassing command still fails the read-only assertion); A2 non-recursion probe in S3 (assert `isTaskAllowed(p, p)` returns false); A5 SHA-evidence probe in closeout (every `[x]` carries a 7–40 hex SHA); A7 weakening-assertion probe in S1 (assert a stricter compare-rule cannot be relaxed by widening accepted divergences); A8 symlink rejection probe in S1 (assert an agent file resolved through a symlink is rejected as `class: 'symlinked_agent_file'`) |
| Adversarial fixture | every phase | a denylist-bypassing bash command (S2); a self-spawn request (S3); a dispatch packet missing every required field (S4) |

Artifact-only tests (e.g., "the new test file exists and contains `expect.fail(...)`") are insufficient. Every Red/Green phase must include at least one live-behavior assertion that exercises the in-process implementation against the live or fixture-backed event stream, not just the on-disk test artifact. Tests that only read a file and assert its contents are documentation tests; the strategy labels them `[artifact]` and the phase plan must call out the live-behavior counterpart.

## 5. UX / Browser Review Applicability

This package has **no user-facing browser surface**. It is a Node.js ESM Pi extension whose visible artifacts are:

- CLI flags (`--agent`)
- slash command (`/agent`, `/measure-doctor`)
- tool responses inside a terminal TUI (`question`, `todowrite`, `task`, `measure_doctor`)

No HTML, CSS, JSX, or web route exists in the package. `measure_interphase_checks.py ux-paths --baseline BASE` returns an empty list for every phase diff by inspection of the package structure. Under `UX_REQUIRED=never`, the UX gate is therefore not triggered for any phase.

`measure-ux-browser-review` applicability: **not_applicable** for all four phases. `measure-review-c-ux-api` applicability: **applicable** for S1 (the `task` tool's receipt shape is an API surface consumed by downstream tracks), S3 (the `task` tool's refusal-by-name diagnostic is an API surface), and S4 (the `MEASURE_TASK_PACKET` schema is an API surface consumed by every delegating role). `measure-review-c-ux-api` applicability for S2: **not_applicable** (the read-only assertion is internal; no API surface change beyond the receipt's `verifiedReadOnly: true|false|"unverifiable"` field, which is a wire-format detail review-a owns).

## 6. Per-Phase Strategy

### Phase 1 — Observed routing, not requested routing
**Story ref:** `spec.md#story-s1` | **Risk:** **critical** | **measure-orchestrator-audit applicable:** ✔ (changes `task` tool's outbound invocation and the receipt schema; this is orchestration infrastructure, not defect repair). | **adversarial applicable:** ✔ (A1 prompt-only reassurance on routing is the central threat). | **review-a:** ✔ (the contract replaces the requested-passthrough in `runtimeModel()`; the new function shape and the observed-vs-requested split must be correct). | **review-b:** ✔ (a child dispatched to an unrouted model is a security boundary; the fail-closed behavior is a security property). | **review-c:** ✔ (the receipt shape is an API surface consumed by `role_model_pool_20260805` and `role_fitness_frontier_watch_20260805`). | **UX browser:** ✗ (§5).

**Phase 1 deliverables referenced in this strategy:**

1. An observed-routing contract: which event-stream fields carry the served model and role, the comparison rule against the pin (strict equality of the `provider/id` form), and the three distinct failure classifications (`mismatch`, `unobservable`, `undeclared_pin`). The current `runtimeModel(agent, fallback)` line that falls back to the parent's current model is rewritten so an absent child pin is a dispatch error naming the role, never a silent inheritance.
2. A new `extensions/measure-harness/index.ts#task` code path that captures the observed routing from the child's event stream (the first `message_start` whose `message.model` is populated, plus the first `message_end`), compares it to the pin, and records both on the receipt as separate fields: `requestedModel` (the pin, as today) and `observedModel` (the served model). The existing `model` field on the receipt is renamed to `requestedModel` to make the distinction explicit; downstream consumers (review-b, telemetry) must be updated to read `observedModel`.
3. A `roleDefinitionHash` field on the receipt carrying the SHA-256 of the agent file's role-definition body, separate from the existing `promptHash` (which hashes the runtime prompt). `parseAgentFile` already computes `promptHash`; the new field is added by `task` from the child's parsed `systemPrompt` after the body is resolved. This satisfies the spec's S1 fifth AC.
4. `tests/observed-routing.test.mjs` — Red + Green test surface (see Required test surfaces below).
5. Live delegation probe (Task 1.5): one real `task` invocation against a fixture subagent; the resulting receipt parsed for the three-field shape (`requestedModel`, `observedModel`, `roleDefinitionHash`). The probe is repeated against a deliberately mismatched model override to confirm the `mismatch` classification is reachable on the live pipe.

**Red command (focused):** `node --test tests/observed-routing.test.mjs`.
**Red falsification:** the new test exits non-zero because (a) `requestedModel` and `observedModel` are not yet separate fields on the receipt (the new contract is not yet exported), AND (b) the `runtimeModel(agent, fallback)` still silently falls back to the parent's model (the undeclared-pin test fails because no `undeclared_pin` error is raised), AND (c) the live delegation probe's receipt carries only `model` (the old name) and no `observedModel`. All three Red conditions must hold at the Mid Red commit.

**Green gate:** `npm run test:shipped` exits 0; `npm test` exits 0 (modulo the four S1 intentional-Red files: `tests/agents-snapshot.test.mjs`, `tests/grammar.test.mjs`, `tests/manifest.test.mjs`, `tests/preflight.test.mjs`); `npm run check` exits 0; `npm run parity` exits 0; `node --test tests/observed-routing.test.mjs` exits 0; the live delegation probe produces a receipt with all three new fields present and consistent (the `mismatch` classification probe produces a `failureClassification: 'observed_routing_mismatch'` and the parent is not blocked from reporting the failure).

**Closeout gate for Phase 1:** no non-deferred Phase 1 tasks remain; every `[x]` carries a 7–40 hex SHA; Phase 1 acceptance result targets current HEAD; Red command provably failed at the intermediate Red commit; the live delegation probe ran successfully and its receipt is recorded as a fixture for the S1 acceptance review; the `runtimeModel` parent-fallback is removed; `observedModel` is a required receipt field (downstream consumers update); `roleDefinitionHash` is on the receipt.

**Required Red/Green test surfaces (`tests/observed-routing.test.mjs`):**

- **live-behavior — matching observation:** a fixture event stream where the first `message_start.model` equals the pin returns `observedModel === pin` and the receipt's `failureClassification` is absent (or the dedicated `success` value).
- **live-behavior — contradicting observation:** a fixture event stream where the first `message_start.model` does NOT equal the pin returns `observedModel === actualServedModel` AND `failureClassification === 'observed_routing_mismatch'` AND the task is reported as failed with the specific mismatch named (e.g., `requested: openai/gpt-5.6-sol; observed: openai/gpt-5.6-terra`).
- **live-behavior — unobservable routing:** a fixture event stream with no `message_start.model` field returns `observedModel === undefined` AND `failureClassification === 'observed_routing_unobservable'` AND the task is reported as failed (never silently accepted as a match).
- **live-behavior — undeclared pin (parent-fallback removed):** a child role with no `model:` frontmatter is dispatched; the dispatch is refused pre-spawn with `failureClassification: 'undeclared_child_pin'` naming the role. Falsification: the dispatch proceeds and inherits the parent's current model.
- **live-behavior — roleDefinitionHash on receipt:** a child role's receipt carries `roleDefinitionHash` matching the SHA-256 of the resolved role-definition body, separate from `promptHash`. A test asserts the two fields are NOT byte-identical for a child whose runtime prompt includes continuation text.
- **fail-closed — three distinct classifications:** the three failure classifications (`observed_routing_mismatch`, `observed_routing_unobservable`, `undeclared_child_pin`) are emitted as distinct strings, not collapsed into a single `routing_failure` (A7 defense).
- **A3 probe — labeled "verified" counter:** the verified-routing status is reported as a labeled structure (`{class: 'verified_routing' | 'unverified_routing', reason?: 'observed_routing_mismatch' | 'observed_routing_unobservable' | 'undeclared_child_pin'}`), never as a bare integer. The test parses a sample finding and asserts the presence of `class` and the labeled reason; a bare `verified: 3` finding is forbidden (analog to `tests/manifest.test.mjs#agentCountLabel`).
- **A7 probe — no widening of accepted divergence:** the comparison rule is strict equality of `provider/id`; a probe with `requestedModel: "openai/gpt-5.6-sol"` and `observedModel: "openai-codex/gpt-5.6-sol"` (provider-aliases) is reported as a mismatch unless `MODEL_MAP[requestedModel] === "openai-codex/gpt-5.6-sol"`. The test asserts the comparison is performed against the **resolved** pin, not the raw `sourceModel`.
- **A8 probe — symlink rejection (defense carried from `controlled_harness_evolution_20260714` S1.3b):** an agent file resolved through a symlink during `loadAgents` is reported as `{class: 'symlinked_agent_file', path: <label>}` and the receipt's `roleDefinitionHash` is recorded for the **real** path, not the symlink. The probe is a regression guard so the routing chain's evidence work does not silently follow a swapped role file.
- **deterministic output:** two receipt writes for the same fixture invocation produce byte-identical receipts (no timestamps in the routing fields; `startedAt`/`completedAt` are excluded from the comparison).

**Intentionally-red aggregate handling:** no test in Phase 1 is intentionally red at Green time. The full surface is required to pass before Jr can claim Green. Phase 1 tests are part of the shipped-surface green gate.

**Architecture guardrails (Phase 1 contract surface):**

- The new observed-routing function lives in `extensions/measure-harness/index.ts#task` (or a sibling `lib/observed-routing.mjs` if Jr prefers separation); either way, the named-classification shape is part of the exported contract surface. Consumers (`role_model_pool_20260805` Task 2.1, `role_fitness_frontier_watch_20260805` Task 4.1) import from the same module.
- The receipt field rename (`model` → `requestedModel`; new `observedModel`) is a **breaking contract change**. Downstream consumers (`extensions/measure-harness/index.ts#task` itself, future telemetry) must be updated in the same commit. A `model` field left on the receipt as a silent alias to `requestedModel` is forbidden (A7 analog: aliasing the new field to the old one would mask the contract change).
- The `runtimeModel(agent, fallback)` function is removed. A replacement `runtimeModelStrict(agent)` returns `agent.model` (from `parseAgentFile`'s strict `MODEL_MAP[sourceModel]` resolve) and throws or returns a structured `undeclared_child_pin` if the field is undefined. The parent's current model is **never** used as a child routing source.
- The `roleDefinitionHash` is computed over the agent file's role-definition body (the system-prompt body parsed by `parseAgentFile`), NOT over the full markdown file (which would also hash the YAML frontmatter and produce a different value for a frontmatter-only edit). The hash uses the same `sha256` helper that `parseAgentFile` already uses for `promptHash`.

**Changed-contract risks (Phase 1):**

- The receipt's `model` field is renamed to `requestedModel`. Any downstream consumer that reads `receipt.model` directly (today: only the `task` tool itself writes the field, no reader) will silently lose the routing information. Review-a must audit the rename for silent breakage.
- The `runtimeModel(agent, fallback)` line is currently the only place where a child without `model:` frontmatter inherits the parent's model. Removing the fallback is correct per spec, but it means every child role **must** have a `model:` frontmatter. Review-a must confirm every agent in `agents/*.md` has a `model:` field; the `parseAgentFile` contract already surfaces `agent.sourceModel` and `agent.model` separately so any missing frontmatter is detectable at load time.
- The live delegation probe (Task 1.5) is the **only** test that exercises Pi's actual emitted event-stream metadata. If Pi's runtime changes the event-stream shape, the probe will fail and S1 acceptance must re-record a fresh fixture. The probe is recorded in `tests/fixtures/observed-routing/live-probe-<sha>.json` so the fixture is reproducible.
- The `roleDefinitionHash` field is downstream-consumed by `role_fitness_frontier_watch_20260805`. If S1 ships a hash that is not stable across re-saves of the same role file (e.g., includes trailing whitespace), the fitness evidence is corrupted. Review-a must confirm the hash is computed over a normalized body (the strategy's `promptHash` already does this via `match[2].trim()`).

**Active-run marker compatibility (Phase 1).** Phase 1 does not modify `plan.md`, `measure/workflow.md`, or any markdown file outside the new `tests/observed-routing.test.mjs` and the editorial updates to `extensions/measure-harness/index.ts` (and possibly `lib/core.mjs` if Jr introduces a sibling module). The live `[ ]` markers in this track's `plan.md` remain pending.

### Phase 2 — Read-only roles verified by state, not by string matching
**Story ref:** `spec.md#story-s2` | **Risk:** **high** | **measure-orchestrator-audit applicable:** ✔ (changes the `toolPolicyViolation` policy surface; the `forbiddenShell` denylist is bypassable per spec, and the replacement is a state assertion, not a regex change). | **adversarial applicable:** ✔ (the denylist-bypass corpus is the canonical attack surface; a state-asserted read-only must catch the bypassed mutations). | **review-a:** ✔ (the state-assertion contract replaces a regex denylist; the new function shape must be correct). | **review-b:** ✔ (an audit role that can mutate the repository is a security boundary; the fail-closed behavior is a security property). | **review-c:** ✗ (no public API surface beyond the receipt's `verifiedReadOnly` field, which is an internal contract review-a owns). | **UX browser:** ✗ (§5).

**Phase 2 deliverables referenced in this strategy:**

1. A read-only state contract: what constitutes mutation (head movement, working-tree change outside the result path, result-path writes by a role with no result path), and the `unverifiable_state` failure classification. The current `forbiddenShell` regex denylist is replaced (or augmented) by a post-task state assertion: `endHead === startHead` AND `git status --porcelain` is empty OR limited to writes inside the supplied `result_path`.
2. A new `extensions/measure-harness/index.ts#task` code path (or a sibling `lib/readonly-assert.mjs`) that performs the post-task state assertion for `measure-orchestrator` and every member of `AUDIT_ONLY_ROLES`. The assertion runs after `spawn` closes, before the receipt's `failureClassification` is set.
3. A `verifiedReadOnly: true | false | "unverifiable"` field on the receipt (true = state-asserted, false = mutation observed, "unverifiable" = before/after state could not be captured). The existing `forbiddenShell` denylist is **retained as defense in depth** OR **retired** per Task 2.5; either decision is acceptable provided the rationale is recorded in `metadata.json#deviation_notes` and the chosen disposition does not weaken the state assertion.
4. `tests/readonly-state.test.mjs` — Red + Green test surface (see Required test surfaces below).

**Red command (focused):** `node --test tests/readonly-state.test.mjs`.
**Red falsification:** the new test exits non-zero because (a) the post-task state assertion is not yet implemented (the new function does not exist), AND (b) the live denylist-bypass corpus (`git -C . commit -am x`, `python3 -c '…os.remove…'`, `eval $CMD`, `find . -delete`) is currently permitted for `measure-orchestrator` (the assertion test for each bypass must fail because the state assertion does not yet catch the mutation), AND (c) the receipt does not yet carry a `verifiedReadOnly` field. All three Red conditions must hold at the Mid Red commit.

**Green gate:** `npm run test:shipped` exits 0; `npm test` exits 0 (modulo the four S1 intentional-Red files); `npm run check` exits 0; `npm run parity` exits 0; `node --test tests/readonly-state.test.mjs` exits 0; the denylist-bypass corpus now fails the state assertion for `measure-orchestrator` and every `AUDIT_ONLY_ROLES` member; the `verifiedReadOnly` field is on the receipt.

**Closeout gate for Phase 2:** no non-deferred Phase 2 tasks remain; every `[x]` carries a 7–40 hex SHA; Phase 2 acceptance result targets current HEAD; Red command provably failed at the intermediate Red commit; the `forbiddenShell` denylist disposition is recorded in `metadata.json#deviation_notes`; the verified-read-only status is recorded as an observed property on the receipt; unverifiable state is reported as a failure, not a pass.

**Required Red/Green test surfaces (`tests/readonly-state.test.mjs`):**

- **live-behavior — denylist-bypass corpus caught by state:** each of the four confirmed bypasses (`git -C . commit -am x`, `python3 -c '…os.remove…'`, `eval $CMD`, `find . -delete`) is run as a `bash` tool invocation by `measure-orchestrator`; the post-task state assertion reports `verifiedReadOnly: false` AND `failureClassification: 'readonly_state_mutation'` AND the role that ran the bypass is named in the diagnostic. Falsification: any of the four bypasses returns `verifiedReadOnly: true`.
- **live-behavior — passing read-only role:** a `measure-orchestrator` invocation that only reads files (no `bash`, no `write`) reports `verifiedReadOnly: true` AND the receipt carries the verified status as an observed property.
- **live-behavior — unverifiable state:** a fixture where the before-and-after `git rev-parse HEAD` cannot be captured (e.g., the role runs outside a git repo, or the head moves between the two captures) reports `verifiedReadOnly: "unverifiable"` AND `failureClassification: 'readonly_state_unverifiable'`. Falsification: unverifiable state is reported as `true` (a vacuous pass, A4).
- **live-behavior — result-path writes are permitted:** a `measure-review-a-correctness` invocation that writes only to its supplied `result_path` (e.g., `measure/runs/<task-id>.json`) reports `verifiedReadOnly: true` because the working-tree change is inside the result path.
- **live-behavior — writes outside the result path fail:** a `measure-review-a-correctness` invocation that writes to a path other than its `result_path` (e.g., `package.json`) reports `verifiedReadOnly: false` AND the role's name and the offending path are named in the diagnostic.
- **fail-closed — head movement caught:** a `bash` invocation by `measure-orchestrator` that moves `HEAD` (e.g., `git checkout -- .` on a clean repo, or any operation that records a new commit) reports `verifiedReadOnly: false` with `startHead` and `endHead` named in the diagnostic.
- **A1 probe — prompt-only state transition defense:** the state assertion is enforced by the parent (the `task` tool), not by an instruction in the child's prompt. A probe asserts that the assertion runs even when the child ignores its system prompt and runs the bypass. Falsification: a child that ran the bypass but returned a "I did not modify anything" prose is reported as `verifiedReadOnly: true`.
- **A3 probe — labeled bypass count:** if the diagnostic reports how many mutations were detected, it is a labeled structure (`{class: 'readonly_state_mutation', role, mutations: [{kind: 'head_moved' | 'worktree_changed' | 'result_path_escape', detail}]}`), never a bare integer count.
- **A4 probe — positive control:** the test suite includes a `verifiedReadOnly: true` case so a vacuous-pass (every case reports `true` regardless of state) is caught.
- **A5 probe — SHA evidence:** every test file's `expect.fail(...)` or similar Red-state assertion is accompanied by a comment naming the contract section it protects (per the strategy's §8 falsifiability checklist), so review-a can audit the comment for vacuous phrasing.
- **deterministic output:** two `verifiedReadOnly` computations on the same before/after state produce byte-identical fields (no timestamps in the mutation list; `startedAt`/`completedAt` are excluded from the comparison).

**Intentionally-red aggregate handling:** no test in Phase 2 is intentionally red at Green time. The full surface is required to pass before Jr can claim Green. Phase 2 tests are part of the shipped-surface green gate.

**Architecture guardrails (Phase 2 contract surface):**

- The post-task state assertion lives in `extensions/measure-harness/index.ts#task` (or a sibling `lib/readonly-assert.mjs`). Either way, the function is part of the exported contract surface.
- The `forbiddenShell` denylist is **either** retained as defense in depth **or** retired. Both decisions are acceptable per Task 2.5; the chosen disposition is recorded in `metadata.json#deviation_notes`. **The denylist must not be silently kept** — the spec calls out that an unreliable control cannot be left in place without a recorded decision.
- The `verifiedReadOnly` field is a tri-state (`true | false | "unverifiable"`), not a boolean. The string `"unverifiable"` is required so a future consumer (review-b, telemetry) can distinguish "the invariant holds" from "the invariant could not be checked" without parsing prose.
- The `AUDIT_ONLY_ROLES` set in `lib/core.mjs` is the single source of truth for which roles are subject to the read-only assertion. Adding a new audit role requires adding it to this set; review-a audits the set for completeness.

**Changed-contract risks (Phase 2):**

- The `forbiddenShell` denylist is currently the only read-only defense for `measure-orchestrator` and `AUDIT_ONLY_ROLES` (per `lib/core.mjs#toolPolicyViolation`). Replacing it with a state assertion changes the failure mode from "command rejected at submission time" to "command accepted, task fails after completion." This is correct per spec, but downstream tooling that relied on the synchronous rejection (e.g., the agent's own retry logic) will see a behavioral change. Review-a must confirm no current consumer depends on the synchronous-rejection semantics.
- The state assertion requires `git rev-parse HEAD` and `git status --porcelain` to be runnable in the child's working directory. If the child runs outside a git repo, the assertion reports `verifiedReadOnly: "unverifiable"`. This is a real risk for tests that run in `mkdtempSync` directories; the test must initialize a git repo in the temp directory to avoid a flood of `unverifiable` results.
- The `verifiedReadOnly: "unverifiable"` state is a fail-closed failure classification, NOT a pass. A test that asserts `verifiedReadOnly` is truthy will pass on `"unverifiable"` (the string is truthy), which is a vacuous-pass (A4). The test must assert `verifiedReadOnly === true` strictly.

**Active-run marker compatibility (Phase 2).** Phase 2 does not modify `plan.md` or any markdown file outside the new `tests/readonly-state.test.mjs` and the editorial updates to `extensions/measure-harness/index.ts` (and possibly `lib/core.mjs`). The live `[ ]` markers in this track's `plan.md` remain pending.

### Phase 3 — Bounded, non-recursive dispatch
**Story ref:** `spec.md#story-s3` | **Risk:** **high** | **measure-orchestrator-audit applicable:** ✔ (changes the `task` tool's spawn behavior; the wall-clock timeout and depth propagation are orchestration infrastructure). | **adversarial applicable:** ✔ (A2 non-recursion is the central threat; a self-spawn or unbounded depth is a session-consumption vector). | **review-a:** ✔ (the bounds contract replaces an unbounded spawn; the new function shape must be correct). | **review-b:** ✔ (a child that consumes the session is a security/correctness boundary; the bounded-dispatch behavior is a security property). | **review-c:** ✔ (the refusal-by-name diagnostic is an API surface consumed by orchestrators and CI). | **UX browser:** ✗ (§5).

**Phase 3 deliverables referenced in this strategy:**

1. A dispatch-bounds contract: default and per-role wall-clock budgets (configurable via env var or role frontmatter, with a sane default like 5 minutes), delegation depth limit (default 3), depth propagation mechanism (a `PI_MEASURE_DELEGATION_DEPTH` env var, incremented by each `task` invocation, checked pre-spawn), and refusal diagnostics.
2. A new `extensions/measure-harness/index.ts#task` code path that (a) enforces the wall-clock budget with a `SIGTERM` after the budget elapses and a `SIGKILL` after a 5-second grace period; (b) propagates and checks the delegation depth pre-spawn; (c) tightens `isTaskAllowed` (in `lib/core.mjs`) to refuse self-spawn (`isTaskAllowed(p, p) === false`) and primary-mode children (`isTaskAllowed("measure-orchestrator", "coder-orchestrator")` is reviewed — the spec says "another primary-mode role" is refused, so `isTaskAllowed(measure-orchestrator, coder-orchestrator)` must return false; the existing rule that allows `measure-orchestrator` → `coder-*` is tightened to non-primary `coder-*` only).
3. A `dispatchRefusal: {class, reason, chain}` field on the receipt (or an out-of-band refusal returned to the parent) when a spawn is refused, with the chain recorded as `parent → child` for the depth-limit case.
4. `tests/dispatch-bounds.test.mjs` — Red + Green test surface (see Required test surfaces below).

**Red command (focused):** `node --test tests/dispatch-bounds.test.mjs`.
**Red falsification:** the new test exits non-zero because (a) the wall-clock timeout is not yet implemented (the test that stubs a sleeping child confirms the spawn does not terminate at the budget), AND (b) `isTaskAllowed("measure-orchestrator", "measure-orchestrator")` returns true today (the self-spawn test fails), AND (c) the delegation depth is not yet propagated (a chained dispatch with depth=3 returns true today). All three Red conditions must hold at the Mid Red commit.

**Green gate:** `npm run test:shipped` exits 0; `npm test` exits 0 (modulo the four S1 intentional-Red files); `npm run check` exits 0; `npm run parity` exits 0; `node --test tests/dispatch-bounds.test.mjs` exits 0; a fixture child that sleeps past the budget is terminated at the budget; `isTaskAllowed(p, p)` returns false for every `p`; a chained dispatch at depth 3 returns a `dispatchRefusal` with the chain recorded.

**Closeout gate for Phase 3:** no non-deferred Phase 3 tasks remain; every `[x]` carries a 7–40 hex SHA; Phase 3 acceptance result targets current HEAD; Red command provably failed at the intermediate Red commit; the wall-clock budget, the depth propagation, and the self-spawn refusal are all enforced; the parent is released on timeout; the receipt's `failureClassification` is `dispatch_timeout` for the timeout case.

**Required Red/Green test surfaces (`tests/dispatch-bounds.test.mjs`):**

- **live-behavior — wall-clock timeout termination:** a fixture child process that sleeps for 10 seconds is dispatched with a 500ms budget; the spawn is terminated at the budget, the receipt's `failureClassification` is `dispatch_timeout`, the parent is not blocked (the `task` tool returns within ~600ms), and the exit code on the receipt reflects the SIGTERM (or 124, the conventional timeout exit code).
- **live-behavior — timeout escalates to SIGKILL:** a fixture child that ignores SIGTERM is terminated by SIGKILL after the 5-second grace period; the receipt's `failureClassification` is `dispatch_timeout_killed` and the chain of signals is recorded.
- **live-behavior — self-spawn refused:** `isTaskAllowed("measure-orchestrator", "measure-orchestrator")` returns false; `isTaskAllowed("coder-orchestrator", "coder-orchestrator")` returns false; the receipt (or the parent return) carries `dispatchRefusal: {class: 'self_spawn_refused', parent, child}`. Falsification: `isTaskAllowed(p, p)` returns true for any `p`.
- **live-behavior — primary-as-child refused:** `isTaskAllowed("measure-orchestrator", "coder-orchestrator")` returns false (the spec says "primary-mode role" is refused as a child); `isTaskAllowed("measure-orchestrator", "coder-openai-gpt-5-6-sol")` returns true (non-primary `coder-*` is still permitted); the receipt carries `dispatchRefusal: {class: 'primary_as_child_refused', parent, child}`.
- **live-behavior — depth-limit refusal with chain recorded:** a chained dispatch at depth 3 (parent → child → grandchild → great-grandchild) returns `dispatchRefusal: {class: 'depth_limit_exceeded', chain: ['p', 'c', 'gc', 'ggc'], limit: 3}`; the receipt of the refusing child records the chain. Falsification: the fourth-level dispatch returns success.
- **live-behavior — depth propagation through `task_id` continuation:** a `task` invocation with `task_id` referencing an existing receipt increments the depth by the receipt's recorded depth; a continuation at depth 2 + new child = depth 3 (the limit). Falsification: the depth is reset on continuation.
- **A2 probe — no recursive infinite loops:** a stress test spawns N=10 chained dispatches; the chain terminates at the depth limit and does not consume the session. The test asserts the parent process is alive and responsive after the chain.
- **A3 probe — labeled chain record:** the `chain` field is an array of role names, not a bare integer count. A test parses a sample refusal and asserts the presence of `class`, `chain`, and `limit`.
- **A7 probe — no weakening of the bound:** the wall-clock budget and the depth limit are read from a single source of truth; a probe that overrides the budget via env var confirms the bound is enforced, not silently relaxed.
- **deterministic output:** two timeout-driven receipts for the same sleeping child produce byte-identical `failureClassification` and `exitCode` fields (no timestamps in the comparison; `startedAt`/`completedAt` are excluded).

**Intentionally-red aggregate handling:** no test in Phase 3 is intentionally red at Green time. The full surface is required to pass before Jr can claim Green. Phase 3 tests are part of the shipped-surface green gate.

**Architecture guardrails (Phase 3 contract surface):**

- The wall-clock budget and the depth limit are exposed as env vars (`PI_MEASURE_WALL_CLOCK_BUDGET_MS`, `PI_MEASURE_DELEGATION_DEPTH_LIMIT`) AND as role-frontmatter overrides (`budget`, `depthLimit`). The role-frontmatter override takes precedence over the env var. The default is 5 minutes for the wall-clock budget and 3 for the depth limit.
- The depth propagation is via the `PI_MEASURE_DELEGATION_DEPTH` env var, incremented by each `task` invocation in the parent process before spawn. A child process inherits the env var; the child's `task` invocation reads the env var to determine the current depth.
- The self-spawn and primary-as-child refusals are enforced by `isTaskAllowed` in `lib/core.mjs`. The function is renamed or its contract is documented to make the new behavior explicit (e.g., a JSDoc comment listing the four cases: `isTaskAllowed(p, p) === false`, `isTaskAllowed(p, primary) === false`, `isTaskAllowed(p, callable_coder) === true` (when `p === "measure-orchestrator"`), `isTaskAllowed(other, *) === false`).
- The `dispatchRefusal` field is a structured object on the receipt (or the parent return), not a prose string. A prose refusal is a vacuous signal (A1 analog) and is forbidden.

**Changed-contract risks (Phase 3):**

- The wall-clock timeout changes the `task` tool's behavioral contract. Today, a child that hangs blocks the parent indefinitely. After Phase 3, the child is terminated at the budget. Any consumer that relied on the unbounded behavior (e.g., a long-running compile) will see a behavioral change. Review-a must confirm the default 5-minute budget is sufficient for the package's existing delegation patterns; if not, the per-role override must be set before Green.
- The depth propagation via env var requires every `task` invocation in the chain to set the env var. If a child process spawns a grandchild via `task` without setting `PI_MEASURE_DELEGATION_DEPTH`, the depth is reset and the limit is bypassed. The propagation logic is enforced by the `task` tool itself, not by an instruction in the role prompt (A1 defense).
- The `isTaskAllowed` tightening (`measure-orchestrator` → `coder-orchestrator` now returns false) is a breaking change for any existing dispatch that uses this pattern. The closed `harness_selfcheck_truthfulness_20260805` track used `coder-orchestrator` as a delegation target from `measure-orchestrator` (per the reconciliation-models.md handoff). Review-a must confirm the change does not break the existing acceptance flow; if it does, a per-role exception must be recorded in `metadata.json#deviation_notes`.

**Active-run marker compatibility (Phase 3).** Phase 3 does not modify `plan.md` or any markdown file outside the new `tests/dispatch-bounds.test.mjs` and the editorial updates to `extensions/measure-harness/index.ts` (and `lib/core.mjs#isTaskAllowed`). The live `[ ]` markers in this track's `plan.md` remain pending.

### Phase 4 — Untrusted output and validated dispatch packets
**Story ref:** `spec.md#story-s4` | **Risk:** **high** | **measure-orchestrator-audit applicable:** ✔ (changes the `task` tool's outbound and inbound packet handling; the symmetric validation is orchestration infrastructure). | **adversarial applicable:** ✔ (child output carrying prompt-injection or credential-bearing text is the canonical attack surface; the untrusted-data framing defends against it). | **review-a:** ✔ (the packet schema and the framing contract). | **review-b:** ✔ (an unvalidated outbound packet is a security boundary; the pre-spawn refusal is a security property). | **review-c:** ✔ (the `MEASURE_TASK_PACKET` schema is an API surface consumed by every delegating role). | **UX browser:** ✗ (§5).

**Phase 4 deliverables referenced in this strategy:**

1. An untrusted-output framing contract: a delimiter (e.g., `<<<UNTRUSTED_CHILD_OUTPUT id=<taskId> role=<childAgent> sha256=<outputHash>>>>\n<output>\n<<<END_UNTRUSTED_CHILD_OUTPUT>>>`) that wraps child text wherever it enters a parent context or a subsequent child's prompt. The existing `continuationText` line in `extensions/measure-harness/index.ts:238` is wrapped in this delimiter.
2. A `MEASURE_TASK_PACKET` dispatch schema: required fields (`absoluteRepoPath`, `track`, `phase`, `baselineSha`, `auditedHeadSha`, `gateCommands`, `resultPath`, `childRole`, `packetHash`), validation rule (every required field present, `absoluteRepoPath` is an absolute path that exists, `baselineSha` matches a 7–40 hex pattern, `resultPath` is writable), and refusal diagnostic naming the missing fields.
3. A new pre-spawn validation step in `extensions/measure-harness/index.ts#task` that refuses the spawn with `dispatchRefusal: {class: 'packet_validation_failed', missing: [...], invalid: [...]}` before any child process starts.
4. A `validatedPacket: {fields, hash}` field on the receipt carrying the validated packet's shape and the `packetHash` (SHA-256 of the JSON-stringified validated packet).
5. `tests/dispatch-packet.test.mjs` — Red + Green test surface (see Required test surfaces below).

**Red command (focused):** `node --test tests/dispatch-packet.test.mjs`.
**Red falsification:** the new test exits non-zero because (a) the untrusted-output framing is not yet applied (the `continuationText` line is spliced inline, the delimiter is absent), AND (b) the pre-spawn packet validation is not yet implemented (a packet missing `baselineSha` is dispatched and a child process starts), AND (c) the `validatedPacket` field is not yet on the receipt. All three Red conditions must hold at the Mid Red commit.

**Green gate:** `npm run test:shipped` exits 0; `npm test` exits 0 (modulo the four S1 intentional-Red files); `npm run check` exits 0; `npm run parity` exits 0; `node --test tests/dispatch-packet.test.mjs` exits 0; a packet missing any required field is refused pre-spawn with the missing fields named; the untrusted-output framing is applied wherever child text enters a parent context or a subsequent prompt; the `validatedPacket` field is on the receipt.

**Closeout gate for Phase 4:** no non-deferred Phase 4 tasks remain; every `[x]` carries a 7–40 hex SHA; Phase 4 acceptance result targets current HEAD; Red command provably failed at the intermediate Red commit; the orchestrator and delegating role prompts have been updated to match the now-machine-checked packet contract (Task 4.5); the `MEASURE_TASK_PACKET` schema is the single source of truth for the packet shape; no second competing schema is introduced.

**Required Red/Green test surfaces (`tests/dispatch-packet.test.mjs`):**

- **live-behavior — untrusted-output framing in parent result:** the `task` tool's return value wraps `finalOutput` in the `<<<UNTRUSTED_CHILD_OUTPUT>>>` delimiter; a test parses the return and asserts the delimiter is present with the correct `id`, `role`, and `sha256` fields. Falsification: `finalOutput` is spliced inline without a delimiter.
- **live-behavior — untrusted-output framing in continuationText:** a `task` invocation with `task_id` references a prior receipt's `finalOutput`; the resulting `continuationText` in the spawned child's prompt wraps the prior output in the delimiter; a test reads the spawned child's `fullPrompt` (via the JSON event stream or a fixture) and asserts the delimiter is present.
- **live-behavior — pre-spawn refusal on missing field:** a dispatch packet missing `baselineSha` is refused with `dispatchRefusal: {class: 'packet_validation_failed', missing: ['baselineSha'], invalid: []}`; the test asserts no child process is started (via a `child_process.spawn` mock or by checking that the `task` tool returns before any new receipt is created).
- **live-behavior — pre-spawn refusal on invalid field:** a dispatch packet with `baselineSha: "not-a-hex-string"` is refused with `dispatchRefusal: {class: 'packet_validation_failed', missing: [], invalid: ['baselineSha']}`. The SHA pattern is asserted as `^[0-9a-f]{7,40}$`.
- **live-behavior — pre-spawn refusal on absolute path that does not exist:** a dispatch packet with `absoluteRepoPath: "/nonexistent/path"` is refused with the path named in the diagnostic.
- **live-behavior — validatedPacket on receipt:** a complete packet's receipt carries `validatedPacket: {fields: {absoluteRepoPath, track, phase, ...}, hash: <sha256>}`; the test asserts the hash matches the SHA-256 of the JSON-stringified validated fields.
- **A1 probe — pre-spawn enforcement, not prompt-only:** the validation is enforced by the `task` tool, not by an instruction in the child's prompt. A probe that submits an incomplete packet from a child role that has been told to "ignore packet validation" still fails the validation. Falsification: a child can override the validation via prompt.
- **A3 probe — labeled missing-field count:** the `missing` and `invalid` fields are arrays of field names, not bare integer counts. A test parses a sample refusal and asserts the arrays contain string names.
- **A7 probe — no weakening of the schema:** adding a field to the schema does not silently bypass validation for existing fields. A probe that submits a packet with all required fields PLUS an unknown field is validated; the unknown field is ignored, not used to satisfy a required-field check.
- **deterministic output:** two `validatedPacket` computations on the same input packet produce byte-identical fields and hash.

**Intentionally-red aggregate handling:** no test in Phase 4 is intentionally red at Green time. The full surface is required to pass before Jr can claim Green. Phase 4 tests are part of the shipped-surface green gate.

**Architecture guardrails (Phase 4 contract surface):**

- The untrusted-output framing delimiter is a single constant exported from `extensions/measure-harness/index.ts` (or a sibling `lib/framing.mjs`). The delimiter format is versioned (the opening tag carries a `version=1` field) so a future change to the format can be detected by downstream consumers.
- The `MEASURE_TASK_PACKET` schema is a single TypeBox schema (or JSON Schema) exported from `extensions/measure-harness/index.ts` (or a sibling `lib/packet-schema.mjs`). The schema is the single source of truth; the role prompts (Task 4.5) reference the schema by name, not by reproducing the field list in prose.
- The pre-spawn validation runs **before** the `spawn` call. A test must confirm no child process is started (via a spawn mock) for an invalid packet. A post-spawn validation that only writes the refusal to the receipt is forbidden (A1 analog).
- The `validatedPacket` field is on the receipt, alongside the existing `promptHash` and `outputHash` fields. The three hashes serve different purposes: `promptHash` = the runtime prompt, `outputHash` = the child output, `packetHash` = the validated dispatch packet. All three are SHA-256.

**Changed-contract risks (Phase 4):**

- The untrusted-output framing changes the shape of the `task` tool's return value. Today, the return is `finalOutput + "\n\nTask ID: <id>"`. After Phase 4, the return is `<<delim>><finalOutput><<end-delim>>\n\nTask ID: <id>`. Any consumer that parses the return value by string matching (e.g., looking for `Task ID:`) will still work (the prefix is unchanged), but any consumer that treats `finalOutput` as the entire return will need to unwrap the delimiter. Review-a must audit existing consumers for silent breakage.
- The `MEASURE_TASK_PACKET` schema is a new contract. Every delegating role prompt (orchestrator, jr-green, mid-red, etc.) must be updated to match the schema (Task 4.5). A role prompt that does not match the schema is a documentation drift, not a runtime failure — but the `task` tool's pre-spawn validation will catch any drift at dispatch time (the role prose does not need to be perfectly aligned, only the dispatch packet does).
- The pre-spawn refusal returns a `dispatchRefusal` object. The shape is new; downstream consumers (orchestrators, CI) must be updated to read the structured refusal, not a prose string. Review-c audits the API change for the closed track's `role_model_pool_20260805` and `role_fitness_frontier_watch_20260805` consumers.

**Active-run marker compatibility (Phase 4).** Phase 4 does not modify `plan.md` or any markdown file outside the new `tests/dispatch-packet.test.mjs` and the editorial updates to `extensions/measure-harness/index.ts` (and possibly `lib/core.mjs` or a new `lib/` sibling), the updated role prompts in `agents/measure-*.md` and `agents/coder-orchestrator.md` (Task 4.5), and `metadata.json#deviation_notes` if any contract decisions are deferred. The live `[ ]` markers in this track's `plan.md` remain pending.

### Cross-cutting completion tasks (C1–C5)

| Task | Risk | Owner | Applicability |
|------|------|-------|---------------|
| C1 independent correctness + security review | medium | `measure-review-a-correctness` + `measure-review-b-security` in parallel after Green | review-a ✔, review-b ✔, review-c ✔ (S1, S3, S4), adversarial ✔ |
| C2 ordering dependency in `measure/tracks.md` | low | `measure-strategy` (this role) or `measure-final-acceptance` | required for closeout; not a gate-blocking review |
| C2b handoff note for `role_model_pool_20260805` and `role_fitness_frontier_watch_20260805` | low | `measure-strategy` (this role) or `measure-final-acceptance` | required for closeout; names the exact receipt fields consumed |
| C3 framework-general lessons promotion | low | `measure-strategy` (this role) | `measure/lessons-learned.md` (curated) and `bodangren/measure` anti-pattern catalog |
| C4 package README Policies section update | low | `measure-strategy` (this role) or `measure-final-acceptance` | `package.json` description OR a `POLICIES.md` file |
| C5 sprint demo + retro | low | `measure-closeout` | `metadata.json` fields |

C2 specifically: the ordering dependency is recorded in `measure/tracks.md` for the `trust_boundary_security_20260715` track. The S2 abuse cases in that track should be re-read against the enforcement this track establishes (S1 observed routing, S2 read-only state assertion, S3 bounded dispatch, S4 untrusted output framing + validated packet) before that track begins. C2 does not modify production code; it is a markdown artifact.

C2b specifically: the handoff note names the exact receipt fields consumed by the two successor tracks: `requestedModel` and `observedModel` (consumed by `role_model_pool_20260805` to populate the candidate-pool solver, and by `role_fitness_frontier_watch_20260805` to correlate outcomes with the served model), and `roleDefinitionHash` (consumed by `role_fitness_frontier_watch_20260805` to correlate outcomes with the role-prompt version). The note is recorded in `measure/tracks/verified_delegation_boundary_20260805/handoff.md` and referenced from `measure/tracks.md`.

C3 specifically: the framework-general lessons are (a) **observed-versus-requested evidence** (a recorded value is not an asserted value; the parent must read back what the child actually did), and (b) **parent-side enforcement** (a child that ignores its prompt must still be caught by the parent's assertions). These are project-neutral and are proposed for promotion to the canonical anti-pattern catalog in `bodangren/measure`. Promotion happens via a separate PR after this track closes.

C4 specifically: the `package.json` description and any `README.md` currently state the read-only and delegation guarantees as facts. After this track, the language is updated to reflect that the guarantees are **asserted** (observed and verified) rather than **declared** (instructed and hoped-for). The README change is editorial; the `package.json` description is the same.

C5 specifically: sprint demo evidence, scope deviations (e.g., the `forbiddenShell` denylist disposition in S2, the `isTaskAllowed` tightening in S3), and retrospective outcomes are recorded in `metadata.json#demo_notes`, `metadata.json#retro_ref`, and `metadata.json#deviation_notes` before archival.

## 7. Cross-Phase Rules

- **Anti-pattern coverage matrix** (each test in the strategy must have a falsification condition):

  | Phase | A1 | A2 | A3 | A4 | A5 | A7 | A8 | Notes |
  |-------|----|----|----|----|----|----|----|-------|
  | Phase 1 (S1) | ✔ prompt-only routing defense: probe asserts a child that lies about its model is still caught | — (no recursion) | ✔ labeled "verified" counter for the verified-routing status | — (no vacuous pass) | ✔ SHA evidence on every `[x]` | ✔ no widening of accepted divergence (provider-aliases) | ✔ symlink rejection carried from S1.3b | Defense: `requestedModel` vs `observedModel` split; `roleDefinitionHash` separate from `promptHash`; three distinct failure classifications |
  | Phase 2 (S2) | ✔ state assertion enforced by parent, not prompt; A4 positive control (a `verifiedReadOnly: true` case) | — (no recursion) | ✔ labeled bypass count; mutations as `[{kind, detail}]` | ✔ positive control: a passing read-only case | ✔ SHA evidence on every `[x]` | — (no schema widening) | — | Defense: denylist-bypass corpus (`git -C . commit -am x`, `python3 -c`, `eval`, `find -delete`) caught by state assertion; `verifiedReadOnly` is tri-state; `forbiddenShell` disposition recorded in `metadata.json#deviation_notes` |
  | Phase 3 (S3) | — (no state transitions) | ✔ stress test of 10 chained dispatches terminates at depth limit; self-spawn refused by name | ✔ labeled chain record (`chain: [role, role, ...]`) | — (no vacuous pass) | ✔ SHA evidence on every `[x]` | ✔ no weakening of the bound (env-var override still enforces) | — | Defense: wall-clock timeout with SIGTERM → SIGKILL escalation; depth propagation via `PI_MEASURE_DELEGATION_DEPTH` env var; `isTaskAllowed(p, p) === false` for every `p` |
  | Phase 4 (S4) | ✔ pre-spawn enforcement, not prompt-only; packet validation runs before `spawn` | — (no recursion) | ✔ labeled missing-field count (`missing: ['baselineSha']`) | — (no vacuous pass) | ✔ SHA evidence on every `[x]` | ✔ no weakening of the schema (unknown field ignored, not used to satisfy required check) | — | Defense: `<<<UNTRUSTED_CHILD_OUTPUT>>>` framing in parent result and `continuationText`; pre-spawn refusal lists missing and invalid fields; `validatedPacket` on receipt |
  | C1 | ✔ (review-a audits for vacuous phrasing; review-b audits for silent-pass regressions) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Defense: review roles are read-only and route blocking findings to Green |

- **Contract-test vs documentation-test split:** any new receipt field (`requestedModel`, `observedModel`, `roleDefinitionHash`, `verifiedReadOnly`, `dispatchRefusal`, `validatedPacket`) is verified by both an artifact test (schema acceptance in `tests/observed-routing.test.mjs` / `tests/readonly-state.test.mjs` / `tests/dispatch-bounds.test.mjs` / `tests/dispatch-packet.test.mjs`) and a live-behavior test (a real role invocation producing the new shape). Acceptance requires the live-behavior test to pass.

- **Phase audit results are immutable** between the audited HEAD and the next role; any later commit invalidates them and forces rerun. The orchestrator's `role-gate` enforces this; Mid/Jr must not bypass it.

- **Worktree snapshots** are mandatory for every audit-only role (`review-a`, `review-b`, `review-c`, `phase-acceptance`, `adversarial-testing`, `final-acceptance`). Mutation outside the supplied result artifact fails the audit gate. This is especially important for S2's read-only state assertion, which is enforced by the harness itself — the audit role must not rely on the harness to prevent its own mutation; the worktree-snapshot convention is the second line of defense.

- **`npm run parity`** is a hard Green-gate supplement. A drift between `agents/*.md` and the snapshot must be resolved before Jr can claim Green.

- **`npm run test:shipped`** is the Green gate for every phase. It must exit 0 whenever the shipped surface is healthy, even while the active track's Red tests are failing by design. The classifier list `tests/.track-red-files.txt` is part of the gate's contract surface and is audited at every Green. The four new test files for this track (`tests/observed-routing.test.mjs`, `tests/readonly-state.test.mjs`, `tests/dispatch-bounds.test.mjs`, `tests/dispatch-packet.test.mjs`) are NOT added to `tests/.track-red-files.txt`; they are part of the shipped surface and must pass before Green.

- **Live delegation probe (S1 acceptance only):** a single real `task` invocation is required to confirm the contract matches Pi's actual emitted metadata (plan Task 1.5). The probe's receipt is recorded as a fixture and is the only test that exercises the live pipe. All other S1 tests use synthetic event-stream fixtures.

## 8. Falsifiability Checklist (per phase)

A test in this strategy is considered falsifiable iff all four are true:

1. The test name and assertion describe a measurable condition (not "should generally work").
2. A fixture or live invocation can produce a state where the assertion flips.
3. The Red command exits non-zero on that flipped state.
4. The Green command exits zero only after the documented contract change lands.

Mid must mark each new test with a one-line comment naming the contract section it protects; review-a audits the comment for vacuous phrasing. Jr must not modify the comment without review-a sign-off.

The specific anti-pattern probes per phase are:

- **S1 (Phase 1):** the A3 probe asserts the verified-routing status is `{class, reason}`, not a bare `verified: N` integer; the A7 probe asserts the comparison is strict equality of `provider/id` after `MODEL_MAP` resolution; the A8 probe asserts symlink rejection.
- **S2 (Phase 2):** the A1 probe asserts the state assertion is enforced by the parent even when the child ignores its prompt; the A3 probe asserts the bypass count is a labeled structure; the A4 probe asserts a `verifiedReadOnly: true` case so a vacuous pass is caught; the A5 probe asserts every test comment names the contract section.
- **S3 (Phase 3):** the A2 probe asserts a 10-deep chain terminates at the depth limit; the A3 probe asserts the chain record is a labeled array of role names; the A7 probe asserts the wall-clock budget cannot be silently relaxed.
- **S4 (Phase 4):** the A1 probe asserts the pre-spawn validation runs before `spawn`; the A3 probe asserts the missing-field list is a labeled array; the A7 probe asserts the schema cannot be widened by adding fields.

---

End of strategy. Refresh and commit policy: any change to the observed-routing contract, the read-only state assertion, the dispatch bounds, the untrusted-output framing, the `MEASURE_TASK_PACKET` schema, or any new receipt field requires a new committed strategy revision before the next Mid role gate.

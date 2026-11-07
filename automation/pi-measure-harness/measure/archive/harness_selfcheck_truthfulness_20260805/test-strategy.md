# Test Strategy: `harness_selfcheck_truthfulness_20260805`

> Strategy owner: `measure-strategy`
> Strategy commit SHA: HEAD of this file's commit (recorded by orchestrator; not embedded)
> Track fixed baseline (immutable, before this strategy commit): `248d841b0b2445b3376d15625da1665fc084edbc`
> Spec: [`./spec.md`](./spec.md) · Plan: [`./plan.md`](./plan.md) · Anti-patterns: [`../anti-patterns.md`](../anti-patterns.md)

This strategy covers three implementation phases (Phase 1 Roster parity, Phase 2 Model resolution fail-closed, Phase 3 Shipped-surface green gate) plus the four cross-cutting completion tasks (C1–C4). It is a **defect repair on the currently shipped surface**, deliberately scoped not to duplicate `controlled_harness_evolution_20260714` Phase S1 (versioned manifest, hash drift, preflight), which will later supersede this track's mechanism. The live roster holds 27 packaged agents (25 callable). `agentParity().ok` is permanently `false` for a stale-constant reason; `unmappedModels` is structurally unreachable; and `npm test` is 5-of-13 red by design because the active track's S1 Red tests target modules that do not exist yet.

## 1. Gate Configuration

| Gate | Command | Owner |
|------|---------|-------|
| **Phase 1 focused Red** | `node --test tests/parity.test.mjs` | `measure-mid-red` (Phase 1) |
| **Phase 2 focused Red** | `node --test tests/model-resolution.test.mjs` | `measure-mid-red` (Phase 2) |
| **Phase 3 focused Red** | `node --test tests/green-gate.test.mjs` | `measure-mid-red` (Phase 3) |
| **Shipped-surface green gate** | `npm run test:shipped` (new; see Phase 3) | `measure-jr-green` (every phase) + final acceptance |
| **Full test suite (includes intentional Red)** | `npm test` | final acceptance + adversarial |
| **Project lint + checks** | `npm run check` | final acceptance |
| **Parity snapshot** | `npm run parity` | Jr (every phase) + final acceptance |
| **UX-required mode** | `never` (no user-facing browser surface; see §5) | orchestrator |

`RED_TEST_COMMAND` is set per phase using the focused command above. `GREEN_TEST_COMMAND` is the new `npm run test:shipped` script that Jr adds in Phase 3 and that every later Green gate runs; it must exit 0 whenever the shipped surface is healthy, even while the active track's Red tests are failing by design. `npm test`, `npm run check`, and `npm run parity` remain as `PROJECT_TESTS` / `PROJECT_CHECKS` / parity supplements for final acceptance. `npm run parity` is a non-negotiable Green-gate supplement so a drift between `agents/*.md` and the snapshot is caught at every Green gate. `PROJECT_DEV_URL` is unset (no dev server); `UX_REQUIRED=never`.

The package's `tests/*.test.mjs` glob in `package.json` is preserved unchanged. New tests follow the same filename pattern (no `tests/s1/` subdirectory), so `npm test` continues to discover them. The new `npm run test:shipped` script — added by Jr in Phase 3 Green — uses `node --test` with explicit file arguments (or `node --test --test-skip-pattern=...` via `tests/.track-red-files.txt`) so it exercises only the shipped-surface test set and explicitly excludes the active track's intentional-Red files (`tests/agents-snapshot.test.mjs`, `tests/grammar.test.mjs`, `tests/manifest.test.mjs`, `tests/preflight.test.mjs`). The classifier list (`tests/.track-red-files.txt`) is itself committed and is part of the gate's contract surface — see Phase 3 §6 below.

## 2. Phase Base SHA Capture

This strategy intentionally does **not** embed a `phase_base_sha`. The orchestrator must capture it **at the moment the strategy commit lands**: `git rev-parse HEAD` immediately after the commit, then supply it as `--baseline` to every downstream role gate. Any SHA baked into this file before that moment is stale by definition.

The fixed track baseline recorded at the top of this strategy (`248d841b0b2445b3376d15625da1665fc084edbc`) is the immutable baseline against which this revision is diffed; the strategy commit itself becomes the rolling `phase_base_sha` for the next role gate and is recorded only by the orchestrator, not embedded here.

The same rule applies between every consecutive Green and the next review: each review/adversarial/acceptance must capture a fresh `audited_head_sha = git rev-parse HEAD` and reject any `--audited-head` that does not equal current HEAD. The `measure_interphase_checks.py role-gate` already enforces this; the strategy restates it so Mid and Jr never assume SHA stability.

## 3. Marker Grammar Migration (compatibility)

The active-run marker rule for this track follows `measure/workflow.md`'s compatibility policy verbatim: `[ ]` = pending, `[~]` = in-progress, `[x]` = complete with evidence, `[b]` = human-gated with trailing `(deferred:<owner>)`. The pending markers in `plan.md` stay pending throughout this track; neither Mid nor Jr migrates them to `[b] (deferred:unmigrated)`. The canonical grammar's `[ ]` reclassification rule (in `controlled_harness_evolution_20260714` Phase S1's `lib/grammar.mjs`) applies only to plans that explicitly opt into the new grammar version; this plan does not opt in.

This rule mirrors the controlled_harness_evolution strategy §3 verbatim: Jr's Green **must not** edit `plan.md` during implementation; Jr's Green **must not** remove or modify `[ ]` from `measure/workflow.md`'s compatibility policy.

## 4. Fixtures, Mocks, and Live Behavior Proof

| Type | Used in | Examples |
|------|---------|----------|
| Live behavior (real paths, live roster) | every phase | real invocation of `loadAgents`, `agentParity`, `parseAgentFile`, the new `npm run test:shipped` script |
| Fixture (deterministic input) | every phase | `tests/fixtures/parity/` (synthetic roster directories with named disagreements); `tests/fixtures/model-resolution/` (synthetic agent files with mapped vs. unmapped models); `tests/fixtures/green-gate/` (a synthetic `tests/` tree containing shipped, track-owned Red, and unclassified files) |
| Synthetic-error fixture | Phase 1, Phase 2, Phase 3 | `os.tmpdir()` + `mkdtempSync` directories; synthetic YAML frontmatter blocks for model-resolution probes; synthetic test files for green-gate classification probes |
| Mock (boundary stub) | none | this track has no child-process boundaries; mocks would obscure the contract |
| Anti-pattern probe | every phase | A3 labeled-integer probe in Phase 1 and Phase 3; A3 integer parse in Phase 1 (analog to `tests/manifest.test.mjs` `agentCountLabel`); A7 analog probe in Phase 3 (the green-gate classifier must not "swallow" a Red file via an over-broad exclude filter) |
| Adversarial fixture | every phase | a roster / model reference / test file that should fail the contract; assert the structured failure path |

Artifact-only tests (e.g., "the new parity test file exists and contains `expect.fail(...)`") are insufficient. Every Red/Green phase must include at least one live-behavior assertion that exercises the in-process implementation against the live or fixture-backed roster, not just the on-disk test artifact. Tests that only read a file and assert its contents are documentation tests; the strategy labels them `[artifact]` and the phase plan must call out the live-behavior counterpart.

## 5. UX / Browser Review Applicability

This package has **no user-facing browser surface**. It is a Node.js ESM Pi extension whose visible artifacts are:

- CLI flags (`--agent`)
- slash command (`/agent`, `/measure-doctor`)
- tool responses inside a terminal TUI (`question`, `todowrite`, `task`, `measure_doctor`)

No HTML, CSS, JSX, or web route exists in the package. `measure_interphase_checks.py ux-paths --baseline BASE` returns an empty list for every phase diff by inspection of the package structure. Under `UX_REQUIRED=never`, the UX gate is therefore not triggered for any Phase 1–3. If a future phase introduces a web surface (out of scope for this track), the UX-applicability decision flips and the strategy must be re-issued with `UX_REQUIRED=always`.

`measure-ux-browser-review` applicability: **not_applicable** for all three phases. `measure-review-c-ux-api` applicability: **applicable** for Phase 3 (the `npm run test:shipped` script and the `tests/.track-red-files.txt` classifier are an API surface consumed by final acceptance and CI).

## 6. Per-Phase Strategy

### Phase 1 — Roster parity that cannot drift silently
**Story ref:** `spec.md#story-s1` | **Risk:** **medium** | **measure-orchestrator-audit applicable:** ✗ (this is a defect repair on the shipped surface; it does not change orchestration infrastructure in a way that warrants framework audit). | **adversarial applicable:** ✔ (A3 is a direct attack surface for any "labeled count" finding). | **review-a:** ✔ (the contract replaces two hardcoded constants; the new parity function shape must be correct). | **review-b:** ✔ (the parity check is part of the `measure_doctor` tool path; a silent pass on a malformed source is a security/correctness defect). | **review-c:** ✗ (no public API surface beyond `measure_doctor`/CLI; the contract change is internal). | **UX browser:** ✗ (§5).

**Phase 1 deliverables referenced in this strategy:**

1. A roster-parity contract: a committed "expected roster" source (e.g., `config/expected-roster.json` or a fixture file under `tests/fixtures/parity/`), its shape (name, mode, description-present), how expected counts are derived from it, and the structured-finding format for every disagreement class. Replaces `EXPECTED_AGENT_COUNT = 24` and `EXPECTED_CALLABLE_COUNT = 22` in `lib/core.mjs`. The replacement is **derived**, not hardcoded; if the roster grows, the new expected source updates deliberately and the diff is reviewable in the same commit.
2. A new parity function (or refactor of `agentParity`) that emits a structured findings array of `{class, name?, detail}` records. The bare `agentCount` / `callableCount` integers remain in the return shape only as labeled companions to findings, never as the entire finding (A3).
3. `tests/parity.test.mjs` — Red + Green test surface (see Required test surfaces below).
4. Updated `tests/core.test.mjs` — the existing `"agent snapshot has expected parity"` test is rewritten to assert the contract (derived parity, structured findings, fail-closed on malformed source) rather than a frozen `agentCount: 24, callableCount: 22` snapshot.

**Red command (focused):** `node --test tests/parity.test.mjs`.
**Red falsification:** the new test exits non-zero because (a) the new parity contract export does not yet exist (e.g., `Cannot find module ./parity.mjs` or a missing named export), AND (b) the existing `tests/core.test.mjs` `"agent snapshot has expected parity"` test fails because the live roster (27 agents / 25 callable) no longer matches the stale hardcoded expected (24/22). Both Red conditions must hold at the Mid Red commit.

**Green gate:** `npm run test:shipped` exits 0; `npm test` exits 0 (or, equivalently, the only failures are the active track's intentional-Red files: `tests/agents-snapshot.test.mjs`, `tests/grammar.test.mjs`, `tests/manifest.test.mjs`, `tests/preflight.test.mjs`); `npm run check` exits 0; `npm run parity` exits 0; `node --test tests/parity.test.mjs` exits 0.

**Closeout gate for Phase 1:** no non-deferred Phase 1 tasks remain; every `[x]` carries a 7–40 hex SHA; Phase 1 acceptance result targets current HEAD; Red command provably failed at the intermediate Red commit (Mid's `commit Red` then non-zero exit recorded in plan evidence); the `expected-roster` source is committed and reviewable; `agentParity().ok === true` against the live roster or reports a structured named finding (never a bare integer mismatch).

**Required Red/Green test surfaces (`tests/parity.test.mjs`):**

- **live-behavior — derived counts:** the parity function's `agentCount` and `callableCount` fields equal the live roster's `agents.length` and `agents.filter(a => a.mode !== 'primary').length`. Falsification: a roster containing 27 agents / 25 callable returns `agentCount: 24, callableCount: 22`. The contract is `agentCount === agents.length` and `callableCount === agents.filter(...).length` (no hardcoded comparison).
- **live-behavior — missing agent by name:** a synthetic roster (in `tests/fixtures/parity/`) that is missing a named agent reports `{class: 'missing_agent', name: <expected>}` (not a bare integer count).
- **live-behavior — extra agent by name:** a synthetic roster that contains an extra named agent reports `{class: 'extra_agent', name: <actual>}`.
- **live-behavior — mode-change by name:** a synthetic roster where an agent's `mode` flipped from `subagent` to `primary` reports `{class: 'mode_change', name: <agent>, expected: <label>, actual: <label>}`.
- **live-behavior — duplicate by name:** a synthetic roster containing a duplicate name reports `{class: 'duplicate', name: <agent>}`.
- **live-behavior — missing description by name:** a synthetic roster containing an agent with empty `description` reports `{class: 'missing_description', name: <agent>}`.
- **fail-closed — unreadable source:** a synthetic roster directory that cannot be read (permission denied or missing) reports `{class: 'unreadable_source', path: <label>}` and `ok: false`. Never a vacuous pass.
- **fail-closed — malformed frontmatter:** a synthetic roster containing a file with broken YAML frontmatter reports `{class: 'malformed_agent_file', name: <agent>, path: <label>}` and `ok: false`.
- **A3 probe — labeled integers only:** every finding uses a labeled structure (`{class, name?, expected?, actual?, detail?}`); a finding whose only payload is a bare integer (e.g., `agentCount: 3` with no class) is forbidden. The test parses a sample finding and asserts the presence of `class`.
- **A3 probe — labeled-integer parse (analog to `tests/manifest.test.mjs#agentCountLabel`):** the `agentCount` companion field is asserted as `agentCountLabel: "agent count: <integer>"` and the integer is parsed via a labeled-integer regex; a bare `rg -q '[0-9]+'` style probe is **not** part of the test surface.
- **deterministic output:** two calls to the parity function on the same fixture produce byte-identical findings arrays (no timestamps, no random tokens, no `Date.now()`, no `Math.random()`).

**Intentionally-red aggregate handling:** no test in Phase 1 is intentionally red at Green time. The full surface is required to pass before Jr can claim Green. Phase 1 tests are part of the shipped-surface green gate.

**Architecture guardrails (Phase 1 contract surface):**

- The new parity function lives in `lib/core.mjs` (or a sibling `lib/parity.mjs` if Jr prefers separation); either way, the named findings shape is part of the exported contract surface. Consumers (`tests/core.test.mjs`, `extensions/measure-harness/index.ts#doctor`, `scripts/parity.mjs`) import from the same module.
- The `expected-roster` source is committed and reviewable in the same PR as the parity function that consumes it. The source may be a JSON file, a YAML file, or a fixture; the choice is Jr's, but the choice must be reviewed by review-a and review-b before Green commits.
- The `EXPECTED_AGENT_COUNT` and `EXPECTED_CALLABLE_COUNT` named exports in `lib/core.mjs` are removed (or renamed to a derived constant) by Green. Jr **must not** retain them as silent fallbacks — their existence defeats the contract.
- The `doctor()` function in `extensions/measure-harness/index.ts` continues to consume `agentParity(agents)` and surface its findings. No changes to the `measure_doctor` tool shape beyond consuming the new findings array.

**Changed-contract risks (Phase 1):**

- `tests/core.test.mjs` currently asserts `agentCount: 24, callableCount: 22` as a frozen snapshot. After Green, that test is rewritten to assert the derived contract; the snapshot assertion is deleted. Review-a must confirm the new assertion is not a vacuous "always passes" check (e.g., it must probe a synthetic roster with a named disagreement and assert the named finding).
- The live roster holds 27 agents / 25 callable. The `expected-roster` source must reflect this state at Green time, or the parity function must report a structured finding that names the live roster's mismatch with the committed source. Jr's Task 1.4 (reconciliation) is the owner of this decision.
- The strategy's labeled-count defense (A3) requires a `class` field on every finding. A future contributor who adds a finding without `class` reintroduces A3. The probe test guards against this; review-a audits the probe for vacuous phrasing.

**Active-run marker compatibility (Phase 1).** Phase 1 does not modify `plan.md`, `measure/workflow.md`, or any markdown file outside the new `tests/parity.test.mjs` and the editorial updates to `lib/core.mjs` and `tests/core.test.mjs` listed above. The live `[ ]` markers in this track's `plan.md` remain pending.

### Phase 2 — Unresolvable model references fail closed
**Story ref:** `spec.md#story-s2` | **Risk:** **high** | **measure-orchestrator-audit applicable:** ✗ (defect repair, not framework infrastructure). | **adversarial applicable:** ✔ (silent passthrough of unroutable identifiers is the canonical attack surface for S2; A1-style prompt-only reassurance is the threat). | **review-a:** ✔ (the resolution function shape and the structured findings contract). | **review-b:** ✔ (an unrouted model identifier may dispatch a child to a provider that is not registered; the fail-closed behavior is a security boundary). | **review-c:** ✗ (no public API surface beyond the internal contract). | **UX browser:** ✗ (§5).

**Phase 2 deliverables referenced in this strategy:**

1. A model-resolution contract: when a frontmatter `model` resolves, when it is unmapped, the diagnostic shape naming the agent, and the distinction between "needs a `MODEL_MAP` entry" and "references a model that does not exist". The current `parseAgentFile` line `model: sourceModel ? MODEL_MAP[sourceModel] ?? sourceModel : undefined` is rewritten so that an absent `MODEL_MAP` entry yields `model: undefined` (not a passthrough to `sourceModel`). The `unmappedModels` predicate becomes reachable.
2. A reconciliation report (`measure/tracks/harness_selfcheck_truthfulness_20260805/reconciliation-models.md` or in `metadata.json#deviation_notes`) for the agents whose frontmatter `model` is absent from `MODEL_MAP` at the strategy commit (live count: 3). The five names listed in the original plan Task 2.4 — `measure-mid-red`, `measure-review-a-correctness`, `coder-orchestrator`, `coder-kimi-for-coding-highspeed`, `coder-kimi-for-coding-k2p7` — are **already mapped** in `MODEL_MAP` (verified at strategy commit) and must be removed from the reconciliation list; the live unmapped set is `measure-adversarial-testing`, `measure-ux-browser-review`, `coder-openai-gpt-5-6-luna-fast`. This is recorded as `deviation_notes` in `metadata.json`.
3. `tests/model-resolution.test.mjs` — Red + Green test surface (see Required test surfaces below).
4. Updated `lib/core.mjs` (resolve `model` strictly, not via `?? sourceModel`) and updated `tests/core.test.mjs` (rewrite the `"agent snapshot has expected parity"` test's `unmappedModels` assertion to be reachable, plus the agentCount call).

**Red command (focused):** `node --test tests/model-resolution.test.mjs`.
**Red falsification:** the new test exits non-zero because (a) the new model-resolution contract is not yet exported (the strict-resolve variant does not exist), AND (b) the live roster's three unmapped agents (`measure-adversarial-testing`, `measure-ux-browser-review`, `coder-openai-gpt-5-6-luna-fast`) currently silently passthrough to `model = sourceModel`, so any test asserting `agentParity().unmappedModels` reports a non-empty list against the live roster will fail. The second Red condition is the **central** falsification: it proves the predicate is now reachable.

**Green gate:** `npm run test:shipped` exits 0; `npm test` exits 0 (modulo the active track's intentional-Red files); `npm run check` exits 0; `npm run parity` exits 0; `node --test tests/model-resolution.test.mjs` exits 0; `agentParity()` against the live roster reports `unmappedModels` containing the three named agents (proving the predicate is reachable) **or** all three references have been resolved via `MODEL_MAP` entries (with user-approved routing intent) so the live roster is fully mapped.

**Closeout gate for Phase 2:** no non-deferred Phase 2 tasks remain; the reconciliation report is committed and reviewable; every `[x]` carries a 7–40 hex SHA; Phase 2 acceptance result targets current HEAD; Red command provably failed at the intermediate Red commit; the live `agentParity().unmappedModels` is either (a) the three named agents, each with a `class: 'unmapped_model'` structured finding, or (b) the empty list after user-approved routing intent is committed to `MODEL_MAP`; the silent passthrough `?? sourceModel` is removed from `lib/core.mjs`.

**Required Red/Green test surfaces (`tests/model-resolution.test.mjs`):**

- **live-behavior — strict resolve:** `parseAgentFile` against a synthetic agent file whose `frontmatter.model` is absent from `MODEL_MAP` returns `{model: undefined}` (not the sourceModel passthrough). Falsification: a probe with `model: 'ghost-provider/ghost-model-9999'` returns `agent.model === 'ghost-provider/ghost-model-9999'`.
- **live-behavior — successful resolve:** a synthetic agent file whose `frontmatter.model` is in `MODEL_MAP` returns `agent.model === MODEL_MAP[sourceModel]` (not `?? sourceModel`).
- **live-behavior — unmappedModels predicate is reachable:** `agentParity(liveRoster).unmappedModels` contains the named agents whose frontmatter `model` is absent from `MODEL_MAP`. Falsification: the predicate returns `[]` against a roster that genuinely contains three unmapped models.
- **live-behavior — named finding shape:** each unmapped agent is reported by name, not as an aggregate count. `unmappedModels` is a `string[]` of agent names; the surrounding `agentParity` return shape also carries an `unmappedModelFindings: [{class: 'unmapped_model', name, sourceModel, suggestion: 'map_entry_needed' | 'reference_incorrect'}]` array (A3 defense).
- **live-behavior — distinction between map-entry-needed and reference-incorrect:** a probe synthesizes two unmapped agents — one whose `sourceModel` matches the `provider/id` shape and one whose `sourceModel` is malformed (e.g., missing slash). The first is reported as `suggestion: 'map_entry_needed'`; the second as `suggestion: 'reference_incorrect'`. Review-a audits the suggestion heuristic for vacuous phrasing (e.g., "needs review" with no class is forbidden).
- **fail-closed — load-time rejection:** `loadAgents` against a directory containing an unmapped agent file throws or returns a structured failure. The agent-load path does not silently coerce the failure into a passthrough.
- **A3 probe — no bare integer unmapped count:** the parity return shape never reports an unmapped count as a bare integer. The test parses a sample finding and asserts the presence of `class` and the `string[]` shape of `unmappedModels`.
- **deterministic output:** two `agentParity` calls on the same roster produce byte-identical findings (no timestamps, no random tokens).

**Intentionally-red aggregate handling:** no test in Phase 2 is intentionally red at Green time. The full surface is required to pass before Jr can claim Green. Phase 2 tests are part of the shipped-surface green gate.

**Architecture guardrails (Phase 2 contract surface):**

- `lib/core.mjs#parseAgentFile` resolves `model` strictly: `model: sourceModel && MODEL_MAP[sourceModel]` (or equivalent). The `?? sourceModel` fallback is removed. A future contributor who re-adds the fallback reintroduces the spec's Defect #2.
- `agentParity` returns a new `unmappedModelFindings` array alongside the existing `unmappedModels: string[]` so downstream consumers (review-b, telemetry) can correlate without parsing strings.
- The reconciliation report is owned by Phase 2 Task 2.4 and recorded in `metadata.json#deviation_notes`. The report does not change routing — recording the decision and escalating the routing choice to the user is the track's explicit scope rule.
- `MODEL_MAP` is `Object.freeze`-d in `lib/core.mjs`. Adding entries is a deliberate act (a PR with a user-approved routing intent), not a silent mutation.

**Changed-contract risks (Phase 2):**

- **The original plan Task 2.4 lists eight "currently unmapped references," but only three are actually unmapped at the strategy commit.** The other five (`measure-mid-red`, `measure-review-a-correctness`, `coder-orchestrator`, `coder-kimi-for-coding-highspeed`, `coder-kimi-for-coding-k2p7`) are already mapped in `MODEL_MAP` (verified at strategy commit time). This is recorded as `deviation_notes` in `metadata.json` so Mid and Jr are not misled by the stale list. The reconciliation report reconciles against the **live behavior**, not the plan's stated list.
- After Green, `agentParity().unmappedModels` becomes a live, reachable signal. The `measure_doctor` tool path in `extensions/measure-harness/index.ts#doctor` continues to consume `agentParity(agents)` and will now correctly report the unmapped agents. No additional wiring is needed; the contract change is the resolution function.
- The `tests/core.test.mjs` snapshot test that asserts `unmappedModels: []` against the live roster will, after Green, fail unless all three references are resolved. Review-a must confirm the rewrite is contract-correct, not a deletion of the assertion.
- The reconciliation report escalates the routing choice for the three unmapped models (`deepseek/deepseek-v4-pro`, `xiaomi/mimo-v2.5`, `openai/gpt-5.6-luna-fast`). Mid does not make this decision; Jr either (a) leaves them unmapped and the predicate reports them, or (b) adds `MODEL_MAP` entries after user approval and the predicate reports empty. The plan's scope rule prohibits Jr from making this routing decision unilaterally.

**Active-run marker compatibility (Phase 2).** Phase 2 does not modify `plan.md` or any markdown file outside the new `tests/model-resolution.test.mjs`, the editorial updates to `lib/core.mjs`, the updated assertion in `tests/core.test.mjs`, and the `metadata.json#deviation_notes` recording. The live `[ ]` markers in this track's `plan.md` remain pending.

### Phase 3 — A green gate independent of active-track Red
**Story ref:** `spec.md#story-s3` | **Risk:** **medium** | **measure-orchestrator-audit applicable:** ✗. | **adversarial applicable:** ✔ (A7 analog: the green-gate's exclude filter must not "swallow" a shipped Red regression; the unclassified-file probe defends against this). | **review-a:** ✔ (the classifier contract and the script's behavior). | **review-b:** ✔ (a green gate that silently ignores a shipped regression is a security/correctness defect equivalent to A1). | **review-c:** ✔ (the `npm run test:shipped` script and the `tests/.track-red-files.txt` list are an API surface consumed by CI). | **UX browser:** ✗ (§5).

**Phase 3 deliverables referenced in this strategy:**

1. A green-gate contract: a `tests/.track-red-files.txt` file (committed, reviewable) listing every test file currently known to be track-owned Red. The classifier function (in `lib/green-gate.mjs` or inlined in `scripts/test-shipped.mjs`) reads this list and emits a structured `{shipped: string[], trackRed: string[], unclassified: string[]}` partitioning of every `tests/*.test.mjs` file in the package.
2. A new package script `npm run test:shipped` that invokes `node --test` over the `shipped` partition only, exits 0 on success, exits non-zero on any failure or on any unclassified file.
3. Documentation in `package.json` (or `scripts/README.md` if Jr prefers) that names which command answers "is the shipped surface healthy?" vs "is the active track's Red still Red?".
4. `tests/green-gate.test.mjs` — Red + Green test surface (see Required test surfaces below).

**Red command (focused):** `node --test tests/green-gate.test.mjs`.
**Red falsification:** the new test exits non-zero because (a) the new `npm run test:shipped` script does not yet exist in `package.json`, AND (b) the unclassified-file probe detects a synthetic test file added to a fixture `tests/` tree that is neither in `tests/.track-red-files.txt` nor shipped.

**Green gate:** `npm run test:shipped` exits 0; `npm test` exits 0 (modulo the active track's intentional-Red files); `npm run check` exits 0; `npm run parity` exits 0; `node --test tests/green-gate.test.mjs` exits 0; the `npm run test:shipped` output explicitly states the partition it ran (e.g., `[shipped] running N test files: a.test.mjs, b.test.mjs; [track-red] excluded M: ...`).

**Closeout gate for Phase 3:** no non-deferred Phase 3 tasks remain; `tests/.track-red-files.txt` is committed and lists the four known intentional-Red files (`tests/agents-snapshot.test.mjs`, `tests/grammar.test.mjs`, `tests/manifest.test.mjs`, `tests/preflight.test.mjs`); `npm run test:shipped` exits 0; every `[x]` carries a 7–40 hex SHA; Phase 3 acceptance result targets current HEAD; Red command provably failed at the intermediate Red commit.

**Required Red/Green test surfaces (`tests/green-gate.test.mjs`):**

- **live-behavior — shipped partition runs:** the script invokes `node --test` over exactly the files not in `tests/.track-red-files.txt` and not in the synthetic unclassified set. The test stubs the `node --test` invocation (via a `child_process.spawnSync` mock or a fixture executable) and asserts the argument list equals the shipped partition.
- **live-behavior — track-owned Red is excluded:** a fixture `tests/` tree containing a synthetic `track-red-fixture.test.mjs` whose name is in `tests/.track-red-files.txt` is excluded from the script's argument list. Falsification: the script invokes `node --test track-red-fixture.test.mjs`.
- **live-behavior — unclassified file fails the gate:** a synthetic `tests/unclassified-fixture.test.mjs` (not in the partition list, not in `tests/.track-red-files.txt`) causes the script to exit non-zero with `{class: 'unclassified_test_file', path: <label>}`. Falsification: the script exits 0 with an unclassified file present.
- **live-behavior — seeded regression in a shipped surface fails the gate:** a synthetic `tests/shipped-fixture.test.mjs` containing `test('regression', () => { throw new Error('seeded'); })` causes the script to exit non-zero with `{class: 'shipped_regression', file: <label>, failure: <label>}`. Falsification: the script exits 0 with a thrown test failure present.
- **A7 analog — exclude filter is not over-broad:** the classifier does not exclude files whose names happen to contain bare English words like "red", "skip", or "excluded" — it excludes only files whose names are explicitly listed in `tests/.track-red-files.txt`. A probe adds a synthetic `tests/not-actually-red.test.mjs` to the fixture tree; the script must include it in the shipped partition (or report it as unclassified).
- **deterministic output:** two script invocations on the same `tests/` tree produce byte-identical stdout (no timestamps, no random tokens).
- **partition listing is explicit:** the script's stdout includes the `shipped`, `trackRed`, and `unclassified` partition lists so an operator can read what the gate ran.

**Intentionally-red aggregate handling:** no test in Phase 3 is intentionally red at Green time. The full surface is required to pass before Jr can claim Green. Phase 3 tests are part of the shipped-surface green gate (i.e., they run themselves; the test that asserts the gate excludes itself by name is a self-referential probe that the gate must handle correctly).

**Architecture guardrails (Phase 3 contract surface):**

- `tests/.track-red-files.txt` is the **single source of truth** for which test files are track-owned Red. The green-gate classifier reads this list at runtime; the file is committed alongside the script. Adding or removing a track-owned Red file requires editing this list in the same PR as the test file itself.
- The script's output explicitly states the partition it ran. A future contributor who adds a test file without updating the list gets the unclassified-file diagnostic, which is a hard failure — not a tolerated warning.
- The script does **not** mutate `package.json`'s `"test"` script. The existing `"test": "node --test tests/*.test.mjs"` is preserved unchanged; the new script is a separate `"test:shipped"` entry.
- The script is deterministic and side-effect free. It reads `tests/.track-red-files.txt` and `tests/`, invokes `node --test` on the shipped partition, and emits structured JSON or human-readable output to stdout. It does not write to disk.

**Changed-contract risks (Phase 3):**

- The four known intentional-Red files (`tests/agents-snapshot.test.mjs`, `tests/grammar.test.mjs`, `tests/manifest.test.mjs`, `tests/preflight.test.mjs`) are listed in `tests/.track-red-files.txt` at Green time. If a future phase adds more intentional-Red files, the list must be updated in the same PR. Review-a audits the list for staleness.
- The script's exclude filter is explicit (file name match against the list). A future contributor who broadens the filter to "all files in tests/ except core.test.mjs" reintroduces the A7 analog defect. The probe test guards against this.
- `tests/core.test.mjs` currently contains both a Red assertion (`"agent snapshot has expected parity"`, frozen 24/22) and four green assertions. After Phase 1 Green rewrites the parity assertion, `tests/core.test.mjs` becomes a fully green file and joins the shipped partition. Until Phase 1 Green lands, `tests/core.test.mjs` is itself an unclassified file from Phase 3's perspective — the green gate correctly reports it as a regression. This is intentional: the gate proves the defect repair has landed.

**Active-run marker compatibility (Phase 3).** Phase 3 does not modify `plan.md` or any markdown file outside the new `tests/green-gate.test.mjs`, the new `tests/.track-red-files.txt`, the new `scripts/test-shipped.mjs`, and the new `"test:shipped"` entry in `package.json`. The live `[ ]` markers in this track's `plan.md` remain pending.

### Cross-cutting completion tasks (C1–C4)

| Task | Risk | Owner | Applicability |
|------|------|-------|---------------|
| C1 independent correctness + security review | low | `measure-review-a-correctness` + `measure-review-b-security` in parallel after Green | review-a ✔, review-b ✔ |
| C2 S1 handoff note naming which guards `controlled_harness_evolution_20260714` Phase S1 subsumes | low | `measure-strategy` (this role) or `measure-final-acceptance` | required for closeout; not a gate-blocking review |
| C3 Scope-decision record under the active plan's execution policy | low | `measure-strategy` | metadata.json#deviation_notes |
| C4 Sprint demo evidence + retrospective | low | `measure-closeout` | metadata.json fields |

C2 specifically: the guards this track installs (`lib/core.mjs#parseAgentFile` strict resolve, the new parity function with structured findings, the `tests/.track-red-files.txt` classifier, the `npm run test:shipped` script) are **all** superseded by `controlled_harness_evolution_20260714` Phase S1's `lib/manifest.mjs`, `lib/preflight.mjs`, and preflight blocker when S1 lands. The handoff note names each guard-to-supersede mapping and recommends S1 retire this track's mechanism on its own acceptance, not via parallel coexistence. C2 does not modify production code; it is a markdown artifact recorded in `metadata.json#deviation_notes` and/or `measure/tracks/harness_selfcheck_truthfulness_20260805/handoff.md`.

## 7. Cross-Phase Rules

- **Anti-pattern coverage matrix** (each test in the strategy must have a falsification condition):

  | Phase | A1 | A3 | A7 | Notes |
  |-------|----|----|----|-------|
  | Phase 1 | — (no state transitions) | ✔ labeled-integer parse; structured `class` on every finding; `agentCountLabel: "agent count: N"` analog to `tests/manifest.test.mjs`; bare-integer finding probe | — (no `rg -v` filters) | Defense: every finding has `class`, `name?`, `expected?`, `actual?`, `detail?`; bare integers are forbidden; the `unreadable_source` and `malformed_agent_file` findings are fail-closed |
  | Phase 2 | — (no state transitions) | ✔ no bare-integer unmapped count; `unmappedModelFindings` array with `class: 'unmapped_model'`; `suggestion` field distinguishes map-entry-needed vs reference-incorrect | — (no `rg -v` filters) | Defense: `?? sourceModel` removed; `unmappedModels` predicate reachable; live roster's three unmapped agents appear in the finding list by name |
  | Phase 3 | — (no state transitions; the green gate is the A1 analog for the shipped surface — a silent pass on a regression would be A1) | ✔ labeled-integer parse on the partition counts; `class: 'shipped_regression'`, `class: 'unclassified_test_file'`, `class: 'track_red_excluded'` | ✔ the exclude filter must not swallow files by name coincidence; the probe adds a `not-actually-red.test.mjs` and asserts the script classifies it correctly | Defense: explicit `tests/.track-red-files.txt` listing; classifier reads only that list; synthetic probe verifies the filter is not over-broad |
  | C1 | ✔ (review-a audits for vacuous phrasing; review-b audits for silent-pass regressions) | ✔ | ✔ | Defense: review roles are read-only and route blocking findings to Green |

- **Contract-test vs documentation-test split:** any new `MEASURE_AGENT_RESULT` shape change is verified by both an artifact test (schema acceptance in `tests/audit-schema.test.mjs` or equivalent) and a live-behavior test (a real role invocation producing the new shape). Acceptance requires the live-behavior test to pass.

- **Phase audit results are immutable** between the audited HEAD and the next role; any later commit invalidates them and forces rerun. The orchestrator's `role-gate` enforces this; Mid/Jr must not bypass it.

- **Worktree snapshots** are mandatory for every audit-only role (`review-a`, `review-b`, `review-c`, `phase-acceptance`, `adversarial-testing`, `final-acceptance`). Mutation outside the supplied result artifact fails the audit gate.

- **`npm run parity`** is a hard Green-gate supplement. A drift between `agents/*.md` and the snapshot must be resolved before Jr can claim Green.

- **`npm run test:shipped`** is the Phase 3 Green gate. It must exit 0 whenever the shipped surface is healthy, even while the active track's Red tests are failing by design. The classifier list `tests/.track-red-files.txt` is part of the gate's contract surface and is audited at every Green.

## 8. Falsifiability Checklist (per phase)

A test in this strategy is considered falsifiable iff all four are true:

1. The test name and assertion describe a measurable condition (not "should generally work").
2. A fixture or live invocation can produce a state where the assertion flips.
3. The Red command exits non-zero on that flipped state.
4. The Green command exits zero only after the documented contract change lands.

Mid must mark each new test with a one-line comment naming the contract section it protects; review-a audits the comment for vacuous phrasing. Jr must not modify the comment without review-a sign-off.

---

End of strategy. Refresh and commit policy: any change to the parity contract, the model-resolution contract, the `tests/.track-red-files.txt` classifier list, or the `npm run test:shipped` script requires a new committed strategy revision before the next Mid role gate.
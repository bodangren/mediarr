# Test Strategy: `controlled_harness_evolution_20260714`

> Strategy owner: `measure-strategy`
> Strategy commit SHA: HEAD of this file's commit (recorded by orchestrator; not embedded)
> Track fixed baseline (immutable, before this strategy commit): `e7f427730d292e76e84d2c14f74aff7bb67523d5`
> Spec: [`./spec.md`](./spec.md) · Plan: [`./plan.md`](./plan.md) · Anti-patterns: [`../anti-patterns.md`](../anti-patterns.md)

This strategy covers all five phases (S1–S5). S1 is treated with first-class depth because every later phase inherits the manifest, grammar, and preflight contracts it defines.

## 1. Gate Configuration

| Gate | Command | Owner |
|------|---------|-------|
| **S1 focused Red** | `node --test tests/manifest.test.mjs tests/grammar.test.mjs tests/preflight.test.mjs tests/agents-snapshot.test.mjs` | `measure-mid-red` (S1) |
| **S1 agents-snapshot verification** | `node scripts/agents-snapshot.mjs` | Jr Green + final acceptance |
| **S2 focused Red** | `node --test tests/state-machine.test.mjs tests/dispatch.test.mjs` | `measure-mid-red` (S2) |
| **S3 focused Red** | `node --test tests/telemetry.test.mjs tests/eval-corpus.test.mjs` | `measure-mid-red` (S3) |
| **S4 focused Red** | `node --test tests/learning-approval.test.mjs tests/candidate-isolation.test.mjs` | `measure-mid-red` (S4) |
| **S5 focused Red** | `node --test tests/replay-eval.test.mjs tests/canary-rollback.test.mjs` | `measure-mid-red` (S5) |
| **Green gate** | `npm test` | `measure-jr-green` (every phase) |
| **Project checks** | `npm run check` | final acceptance |
| **Project tests** | `npm test` | final acceptance + adversarial |
| **Parity snapshot** | `npm run parity` | Jr (every phase) + final acceptance |
| **UX-required mode** | `auto` (no user-facing browser scope; see §5) | orchestrator |

`RED_TEST_COMMAND` in CI is set per phase using the focused command above; `GREEN_TEST_COMMAND`, `PROJECT_CHECKS`, `PROJECT_TESTS` remain `npm test`, `npm run check`, `npm test`. `npm run parity` is added as an explicit non-negotiable supplement to `GREEN_TEST_COMMAND` so a drift in `agents/*.md` between the snapshot and the package extension is caught at every Green gate, not only on release. `node scripts/agents-snapshot.mjs` is added as a second non-negotiable supplement to `GREEN_TEST_COMMAND` for S1 specifically: it verifies cross-directory hard-link parity (not just content equality), which `npm run parity` alone cannot express, and it is the operator-facing evidence that the four named agent directories are bound by inode, not by filename coincidence.

The package's `tests/*.test.mjs` glob in `package.json` is preserved unchanged. New tests follow the same filename pattern (no `tests/s1/` subdirectory) so `npm test` continues to discover them without a `package.json` change. Jr-side tooling **must not** touch `"test"` script.

## 2. Phase Base SHA Capture

This strategy intentionally does **not** embed a `phase_base_sha`. The orchestrator must capture it **at the moment the strategy commit lands**: `git rev-parse HEAD` immediately after the commit, then supply it as `--baseline` to every downstream role gate. Any SHA baked into this file before that moment is stale by definition.

This strategy revision specifically captures the S1.agents-snapshot user-approved scope clarification; the strategy commit itself is **not** the role-base SHA for any subsequent role. The orchestrator must:

1. Land the strategy commit (`measure-strategy` role).
2. Run `git rev-parse HEAD` to obtain the strategy commit SHA.
3. Use that SHA as `--baseline` for the next `measure-mid-red` S1 gate (which will write `tests/agents-snapshot.test.mjs` plus the failing imports from the new `lib/agents-snapshot.mjs`).
4. Use the post-Mid-Red HEAD as `--baseline` for the subsequent `measure-jr-green` S1 gate.

The fixed track baseline recorded at the top of this strategy (`e7f427730d292e76e84d2c14f74aff7bb67523d5`) is the immutable baseline against which this revision is diffed; the strategy commit itself becomes the rolling `phase_base_sha` for the next role gate and is recorded only by the orchestrator, not embedded here.

The same rule applies between every consecutive Green and the next review: each review/adversarial/acceptance must capture a fresh `audited_head_sha = git rev-parse HEAD` and reject any `--audited-head` that does not equal current HEAD. The `measure_interphase_checks.py role-gate` already enforces this; the strategy restates it so Mid and Jr never assume SHA stability.

## 3. Marker Grammar Migration (S1 boundary)

S1 ships the canonical marker grammar that later phases rely on. The canonical rule set:

| Marker | Meaning | Required evidence | Migration of legacy `[ ]` |
|--------|---------|-------------------|----------------------------|
| `[x]` | complete | inline commit SHA (`\b[0-9a-f]{7,40}\b`) | unchanged |
| `[~]` | in-progress | none (mid-task) | unchanged |
| `[b]` | blocked / human-gated | trailing `(deferred:<owner>)` field | unchanged |
| `[ ]` | **deprecated/legacy** | n/a | reclassified to `[b]` with `(deferred:unmigrated)` by the checker; **never silently treated as in-progress** |

The checker regex is `r"^- \[([~xb])\] (.+)"` (no space). The `is_task_structurally_blocked` predicate (`agents/measure-strategy.md` and `~/.agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py`) returns `true` iff `status == "b"` and `re.search(r"\(deferred:[A-Za-z0-9_.-]+\)\s*$", task)`.

S1 acceptance: a fixture plan that uses only `[ ]` and one `[~]` reports phase incomplete (not PASS) and surfaces the reclassification as a preflight blocker. This guards **A4** (vacuous pass on nothing-done) and **A8** (legacy space marker accepted) simultaneously.

User-authorized temporary marker compatibility is in effect during this strategy work: the existing plan's `[ ]` lines are treated as pending. Mid and Jr must **not** migrate pending markers during S1; the canonical grammar test in `tests/grammar.test.mjs` proves `[ ]` reclassification without rewriting this plan.

**Active-run marker semantics during S1 execution.** Throughout S1 the pending marker is still `[ ]`. S1 is permitted to define a forward-compatible canonical grammar (its manifest field `markerGrammarVersion`, its `CANONICAL_REGEX`, and its `[ ] → [b]` reclassification rule), but that grammar applies **only to plans that explicitly opt into the new grammar version**. Concretely:

- Red/Green for S1 must not preemptively classify a live run's `[ ]` tasks as `[b] (deferred:unmigrated)`. The grammar probes in `tests/grammar.test.mjs` (`CANONICAL_REGEX` does not match `[ ]`; `classifyMarker('[ ] pending')` returns the reclassification signal) operate on **self-contained fixture plans**, never on the implementation plan in `plan.md`. Mutating the live plan's `[ ]` to `[b]` during S1 is a contract violation, not a grammatical cleanup.
- Jr may implement the canonical grammar, the manifest `markerGrammarVersion` field, and the parser's `[ ]` reclassification behind the canonical flag, and must record it in `tests/grammar.test.mjs`. Jr must not edit the live `[ ]` lines in `plan.md` and must not remove `[ ]` from the compatibility policy in `measure/workflow.md`; the documented migration lands in a follow-on phase with its own acceptance gate.
- S1 acceptance records the versioning boundary; it does not delete `[ ]`. Future plans that opt into the canonical grammar inherit the new rule; prior plans keep their meaning verbatim.
- This rule is project-independent: every consumer of this harness keeps `[ ]` = pending until it opts into a released canonical grammar version.

## 4. Fixtures, Mocks, and Live Behavior Proof

| Type | Used in | Examples |
|------|---------|----------|
| Live behavior | every phase | real invocation of `loadManifest`, `classifyMarker`, `preflight`, `nextPermittedAction`, `emitEvent`, `evaluateCandidate`, `selectCanary`, `verifyHardLinkSnapshot` |
| Live behavior (cross-directory, real paths with env override) | S1.agents-snapshot | `verifyHardLinkSnapshot` against `~/.config/opencode/agent`, `~/.agents/agents`, `~/Desktop/pi-measure-harness/agents`, `~/Desktop/measure/agents` (paths overridable via `OPENCODE_AGENT_DIR`, `OPENCODE_AGENTS_TARGET_DIRS`, `OPENCODE_MEASURE_ONLY_DIR`) |
| Fixture (deterministic input) | S1, S2, S3, S5 | `tests/fixtures/s1/manifest.json`, `tests/fixtures/s2/state-machine.json`, `tests/fixtures/s3/corpus.jsonl`, `tests/fixtures/s5/replay/` |
| Synthetic-error fixture | S1.agents-snapshot | synthetic `Error` instances with `.code ∈ {EXDEV, EPERM, EROFS}` to drive `classifyLinkError`; synthetic directories created under `os.tmpdir()` for missing/extra/not_hard_link/symlink probes |
| Mock (boundary stub) | S2, S3, S4 only | fake `git rev-parse`, fake clock, fake `spawn` for child Pi process — never used to dodge behavior checks |
| Anti-pattern probe | S2 | all-`[~]` fixture to verify "markers consistent" reports INCOMPLETE (A4) |
| Privacy probe | S3 | synthetic receipt with synthetic token strings; assert absence in emitted event |
| Adversarial fixture | every phase | a plan/manifest/state that should fail the contract; assert the failure path |

Artifact-only tests (e.g., "manifest file exists and contains field X") are insufficient. Every Red/Green phase must include at least one live-behavior assertion that exercises the in-process implementation, not just the on-disk artifact. Tests that only read a file and assert its contents are documentation tests; the strategy labels them `[artifact]` and the phase plan must call out the live-behavior counterpart.

## 5. UX / Browser Review Applicability

This package has **no user-facing browser surface**. It is a Node.js ESM Pi extension whose visible artifacts are:

- CLI flags (`--agent`)
- slash command (`/agent`, `/measure-doctor`)
- tool responses inside a terminal TUI (`question`, `todowrite`, `task`, `measure_doctor`)

No HTML, CSS, JSX, or web route exists in the package (`UX_INCLUDE_PREFIXES` env defaults: `app/src/,app/public/,src/,frontend/,web/,client/`). `measure_interphase_checks.py ux-paths --baseline BASE` returns an empty list for every phase diff by inspection of the package structure. Under `UX_REQUIRED=auto`, the UX gate is therefore not triggered for any S1–S5 phase.

If a future phase introduces a web surface (out of scope for this track), the UX-applicability decision flips and the strategy must be re-issued with `UX_REQUIRED=always`.

## 6. Per-Phase Strategy

### Phase S1 — Versioned harness foundation
**Risk:** **high** | **measure-orchestrator-audit applicable:** ✔ every phase in this track changes orchestration infrastructure, but S1 specifically edits the manifest, grammar, and preflight. The audit role is required. | **adversarial applicable:** ✔ (S1 introduces the marker-grammar regex and drift detection; A8 and a reclassification probe are direct attack surfaces). | **review-a:** ✔ | **review-b:** ✔ (manifest hash becomes a trust anchor; new authorization paths). | **review-c:** ✗ (no public API surface beyond `measure_doctor`/CLI). | **UX browser:** ✗ (§5). | **final-acceptance pre-check:** only after S1 acceptance result lands.

**S1 deliverables referenced in this strategy:**

1. `lib/manifest.mjs` — manifest load/validate/hash. Surface symbols: `loadManifest`, `validateManifest`, `computeStabilityHashes`.
2. `lib/grammar.mjs` — marker grammar. Surface symbols: `classifyMarker`, `parseTaskLine`, `isTaskStructurallyBlocked`, `CANONICAL_REGEX`.
3. `lib/preflight.mjs` — drift + grammar + reference checks. Surface symbols: `runPreflight`, `formatPreflightError`.
4. `tests/manifest.test.mjs`, `tests/grammar.test.mjs`, `tests/preflight.test.mjs` — Red + Green.

**Red command (focused):** `node --test tests/manifest.test.mjs tests/grammar.test.mjs tests/preflight.test.mjs`.
**Red falsification:** every listed test exits non-zero because the new exports do not exist (`Cannot find module ./manifest.mjs` etc.) **or** because assertions on the existing imports fail. Jr implements the modules; tests pass.

**Green gate:** `npm test` exits 0; `npm run check` exits 0; `npm run parity` exits 0; `node --test tests/manifest.test.mjs tests/grammar.test.mjs tests/preflight.test.mjs` exits 0.

**Closeout gate for S1:** no non-deferred S1 tasks remain; every `[x]` carries a 7–40 hex SHA; S1 acceptance result targets current HEAD; Red command provably failed at the intermediate Red commit (Mid's `commit Red` then non-zero exit recorded in plan evidence).

**Required Red/Green test surfaces (Mid writes these failing; Jr makes them pass):**

- `tests/manifest.test.mjs`:
  - **live-behavior:** `loadManifest(path)` parses a valid fixture and returns object with `version`, `extensionHash`, `agentHashes`, `skillHashes`, `contractHash`, `markerGrammarVersion`, `compatibility`.
  - **drift:** `loadManifest` after the on-disk extension file changes hash → throws with `drift:agent:<file>` and `drift:extension`.
  - **schema mismatch:** `markerGrammarVersion` requested vs. manifest declared → throws with `schema_version_mismatch`.
  - **missing reference:** `agents/` declares an agent whose file is missing → throws with `missing_reference:<name>`.
  - **unmapped model:** a model referenced by an agent that is missing from `MODEL_MAP` → throws with `unmapped_model:<name>` (does not silently coerce to model=undefined).
  - **deterministic output:** two `loadManifest` calls on the same fixture produce byte-identical objects (no time/randomness).
  - **anti-pattern A3 probe:** a manifest `"agent count": <integer>` is asserted via labeled-integer parse, never `rg -q '[0-9]+'`.

- `tests/grammar.test.mjs`:
  - **canonical regex:** `CANONICAL_REGEX` matches `[x]`, `[~]`, `[b]` and **does not match** `[ ]`. Falsification: a probe `'- [ ] pending'` yields no match in `re.findall`.
  - **structurally blocked:** `isTaskStructurallyBlocked('[b] foo (deferred:phikul)')` is true; same without the trailing field is false; same with `[~]` is false.
  - **legacy reclassification:** `classifyMarker('[ ] pending')` returns `{status: 'b', note: 'unmigrated'}` (or equivalent structured signal). Mid defines the structured signal shape; the test asserts the shape, not the literal string.
  - **complete with SHA:** `parseTaskLine` on an `[x]` task without a hex SHA returns `{status: 'x', evidence: 'missing_sha'}` (a plan-acceptance failure), with a SHA returns `{status: 'x', evidence: 'sha:<hex>'}`. This guards A5 indirectly by refusing the prose-only "all checks pass" claim.
  - **migration fixture:** a fixture plan containing every marker class parses to the documented shape; the parser is stable across two calls.

- `tests/preflight.test.mjs`:
  - **clean state:** `runPreflight({manifest, plan, cwd})` returns `{ok: true}`.
  - **drift blocks:** mutated extension hash → `{ok: false, reason: 'drift:extension'}`. No child role starts (Jr must wire the harness to reject the run; the test simulates the call and asserts the structured return, not the side effect).
  - **grammar blocks:** plan contains `[ ]` and the harness is configured post-migration → `{ok: false, reason: 'marker_grammar:legacy_in_active_run'}`. Under compatibility mode, the same fixture returns `{ok: true, warnings: ['marker_grammar:legacy_accepted']}` with a deterministic warning payload (sorted, no time field).
  - **missing reference:** `{ok: false, reason: 'missing_reference:<name>'}`.
  - **deterministic diagnostics:** same input → same `formatPreflightError(reason)` byte-for-byte.
  - **anti-pattern probe (A4 mirror):** a preflight "all green" check fails when the underlying fixture plan has only `[~]` tasks; passes only when it has at least one `[x]` with SHA. This parallels but does not duplicate the supervisor's all-`[~]` check.

**Intentionally-red aggregate handling:** no test in S1 is intentionally red at Green time. If Mid writes a "must-fail-until-implemented" probe for drift detection, that probe lives in `tests/aggregate-skipped/` (outside the `tests/*.test.mjs` glob) until it is satisfied, then promoted to the main suite in a follow-on.

**Architecture guardrails (S1 contract surface):**
- All new modules are project-neutral (no project/owner/test-command coupling). The manifest's `compatibility` section is data, not code.
- `lib/grammar.mjs` exports `CANONICAL_REGEX` as a constant that consumers import; do not duplicate the regex string per consumer.
- `lib/preflight.mjs` returns structured reason codes (string keys listed above) so later telemetry can correlate A-class events to specific failures.
- Manifests are content-addressed. Schema changes bump `schema_version`; Jr MUST NOT silently coerce a v1 manifest to v2 layout.

**Changed-contract risks (S1):**
- `loadManifest` becomes the single source of trust for "is the run authorized." Every later phase inherits this contract. A misformed `validateManifest` (e.g., silent acceptance of missing hashes) is **critical**; the strategy labels any acceptance with non-empty `test_strategy_violations` or `live_contract_violations` as `blocking` in the audit JSON.
- The legacy `[ ]` compatibility mode is global; a phase that turns it off must be tested with both an unmigrated legacy fixture and a canonical fixture.

### Phase S1.agents-snapshot — User-approved cross-directory hard-link parity
**Origin.** Per the user-approved scope clarification for this strategy revision, the four named agent directories must be bound to a single source set by hard link (not by copy, not by symlink). The source set is `/home/daniel-bo/.config/opencode/agent` (27 agent files). The targets are:

| Target | Policy | Expected file count after sync |
|---|---|---|
| `/home/daniel-bo/.agents/agents` | full mirror of source set | 27 |
| `/home/daniel-bo/Desktop/pi-measure-harness/agents` | full mirror of source set | 27 |
| `/home/daniel-bo/Desktop/measure/agents` | **exact** measure-only set (`/^measure-.*\.md$/` filter applied to source); directory must contain **only** the 13 current `measure-*.md` files from source. Obsolete non-measure files in this directory are **in scope** and **MUST be deleted** by Jr during Green before the hard-link sync; any non-measure `.md` file present at verification time is a hard failure (`{ok: false, reason: 'extra_file:<path>'}`) | 13 |

`Desktop/measure/agents` is governed by an **exact 13-file measure-only policy**: the directory must contain only the 13 current `measure-*.md` files from source and nothing else. Pre-existing obsolete non-measure agent files in this directory (e.g., `coder-deepseek-v4-flash.md`, `coder-minimax-m3.md`, `coder-orchestrator.md`, `coder-vocengine-ark-code-latest.md`, `coder-vocengine-glm-5-2.md`, `coder-xiaomi-mimo-v2-5-pro.md`, plus the four files already absent from source: `coder-deepseek-v4-pro.md`, `coder-kimi-k2p7.md`, `coder-openrouter-free.md`, `coder-xiaomi-mimo-v2-5.md`) **MUST be removed** during Green before the hard-link sync, and any non-measure `.md` file present at acceptance time is a hard verification failure. Jr performs the deletion as an explicit precondition of the hard-link sync; the lib itself is verification-only and adds no `deleteFile` export for this contract (see Architecture guardrails).

**Risk:** **high** | **measure-orchestrator-audit applicable:** ✔ (the snapshot is the source-of-truth anchor that `lib/manifest.mjs` will hash against; cross-directory inode drift is a manifest-drift precursor and a future role cannot detect it without this surface). | **adversarial applicable:** ✔ (filename-set tamper, content tamper after link, copy-vs-link substitution, cross-filesystem failure, symlink bypass are all direct attack surfaces against the manifest hash anchor). | **review-a:** ✔ | **review-b:** ✔ (filesystem-level authorization, symlink-following path-traversal, hard-link authority over agent files implying privilege). | **review-c:** ✗ (no public API surface beyond `measure_doctor`/CLI). | **UX browser:** ✗ (§5). | **final-acceptance pre-check:** ✔ before S1 acceptance.

**S1.agents-snapshot deliverables referenced in this strategy:**

1. `lib/agents-snapshot.mjs` — cross-directory verification surface. Exports: `verifyHardLinkSnapshot`, `verifyHardLinkRelationship`, `compareHardLinkInventory`, `classifyLinkError`, `formatSnapshotError`, and the constants `EXPECTED_AGENT_COUNT`, `EXPECTED_MEASURE_AGENT_COUNT`, `DEFAULT_SOURCE_DIR`, `DEFAULT_FULL_MIRROR_DIRS`, `DEFAULT_MEASURE_ONLY_DIR`, `MEASURE_ONLY_PATTERN`.
2. `tests/agents-snapshot.test.mjs` — Red + Green test surface (≈12 assertions, listed below). The Mid Red commit introduces this file plus the failing `lib/agents-snapshot.mjs` import stub; Jr Green implements the module **and** performs the actual hard-link sync against the live directories.
3. `scripts/agents-snapshot.mjs` — operator-facing verification script (deterministic, JSON-output, exits 0/1). Symmetric with `scripts/parity.mjs`; does **not** modify any directory itself. It only verifies.

**Red command (focused):** `node --test tests/manifest.test.mjs tests/grammar.test.mjs tests/preflight.test.mjs tests/agents-snapshot.test.mjs`.
**Red falsification:** the new test exits non-zero because `lib/agents-snapshot.mjs` does not yet exist (`Cannot find module ./agents-snapshot.mjs`). The pre-existing three S1 Red test files continue to fail for the same reason. Jr implements `lib/agents-snapshot.mjs` AND performs the actual hard-link sync (`ln <source>/<file> <target>/<file>` for every required filename in every required target) AND verifies the result with `node scripts/agents-snapshot.mjs`; tests pass.

**Green gate:** `npm test` exits 0 (the 12 existing tests plus the new tests, all passing); `npm run check` exits 0; `npm run parity` exits 0; `node scripts/agents-snapshot.mjs` exits 0 against the live four directories; `node --test tests/manifest.test.mjs tests/grammar.test.mjs tests/preflight.test.mjs tests/agents-snapshot.test.mjs` exits 0.

**Closeout gate for S1.agents-snapshot:** every target directory satisfies its filename-set policy with hard links to source; `EXPECTED_AGENT_COUNT` (27) and `EXPECTED_MEASURE_AGENT_COUNT` (13) are reflected in `lib/agents-snapshot.mjs`; `lib/core.mjs` `EXPECTED_AGENT_COUNT` and `EXPECTED_CALLABLE_COUNT` and `tests/core.test.mjs` agent-count expectations are updated to match the post-sync local snapshot (editorial update; see Changed-contract risks); no live `plan.md` markers were migrated; all obsolete non-measure files previously present in `Desktop/measure/agents` have been deleted by Jr **before** the hard-link sync and verified absent (post-delete `readdirSync(...).filter(.md)` matches the 12 measure files already present by name; after the hard-link sync adds `measure-orchestrator.md`, the directory holds exactly 13 entries, all matching `MEASURE_ONLY_PATTERN`); the live `/home/daniel-bo/.agents/agents`, `/home/daniel-bo/Desktop/pi-measure-harness/agents`, and `/home/daniel-bo/Desktop/measure/agents` directories pass `node scripts/agents-snapshot.mjs` against the live source set with exit 0, and a stray extra `.md` file in any target (including a re-introduced non-measure file in `Desktop/measure/agents`) re-opens the gate with `{ok: false, reason: 'extra_file:<path>'}` — no tolerated-warning outcome is part of the contract.

**Required Red/Green test surfaces** (`tests/agents-snapshot.test.mjs`):

- **constants exported:** `EXPECTED_AGENT_COUNT === 27`, `EXPECTED_MEASURE_AGENT_COUNT === 13`, `MEASURE_ONLY_PATTERN.test('measure-strategy.md') === true`, `MEASURE_ONLY_PATTERN.test('coder-x.md') === false`.
- **default directory constants:** `DEFAULT_SOURCE_DIR` resolves to `~/.config/opencode/agent`, `DEFAULT_FULL_MIRROR_DIRS` is a frozen array containing `~/.agents/agents` and `~/Desktop/pi-measure-harness/agents`, `DEFAULT_MEASURE_ONLY_DIR` resolves to `~/Desktop/measure/agents`. The env-overrides (`OPENCODE_AGENT_DIR`, `OPENCODE_AGENTS_TARGET_DIRS`, `OPENCODE_MEASURE_ONLY_DIR`) mirror the established pattern from `scripts/parity.mjs`.
- **live-behavior — full-mirror filename parity:** for every target in `DEFAULT_FULL_MIRROR_DIRS`, the file set equals the source set, with no missing and no extra files. The test walks the live directories via `readdirSync(...).filter(.md)` (env-overridable for CI).
- **live-behavior — measure-only filename parity:** for `DEFAULT_MEASURE_ONLY_DIR`, the file set equals `source.filter(MEASURE_ONLY_PATTERN)` and **no non-measure `.md` file is present**. The test asserts both: (a) the file set equals the filtered source set, AND (b) `readdirSync(targetDir).filter(.md).every(name => MEASURE_ONLY_PATTERN.test(name))` is true. An extra non-measure `.md` file in `Desktop/measure/agents` (e.g., a re-introduced `coder-deepseek-v4-flash.md`) fails this assertion with `{ok: false, reason: 'extra_file:<path>'}` — it is an in-contract violation, not a tolerated residue.
- **live-behavior — content parity (sha256):** for every shared filename across source and each target, `sha256(source) === sha256(target)`. Defends against a copy-then-divergence failure mode where inode differs but bytes still match.
- **live-behavior — hard-link relationship (device+inode):** for every shared filename, `stat(source).ino === stat(target).ino` and `stat(source).dev === stat(target).dev`. This is the **central** hard-link assertion: a copied file has a different inode; a symlink has a different mode; only a hard link shares dev+ino. The lib uses `statSync(...).ino` and `statSync(...).dev` (not `lstat`) so symlinks report the target's inode but lstat-mode-symlink is caught separately.
- **live-behavior — symlink rejection:** no shared file is a symlink — `lstatSync(target).isSymbolicLink() === false` for every shared filename. A symlink would, in some setups, appear to satisfy dev+ino equality via its target; this assertion prevents that bypass. Symlink rejection uses `lstat`, not `stat`, and reports `{ok: false, reason: 'symlink_detected:<path>'}`.
- **structured error — missing file:** synthesizing a target directory missing one expected file (via `os.tmpdir()` + `mkdtempSync` + selective copy) yields `{ok: false, reason: 'missing_file:<path>'}` (assert shape, not literal substring). Cleans up the tmp dir in `finally`.
- **structured error — extra file:** synthesizing a target directory with one unexpected extra `.md` file yields `{ok: false, reason: 'extra_file:<path>'}` for **every** target — both the full-mirror targets and the measure-only target. The measure-only target treats an extra non-measure `.md` file as an in-contract failure: any `.md` file in `Desktop/measure/agents` whose name does not match `MEASURE_ONLY_PATTERN` (e.g., a re-introduced `coder-*.md`) is rejected with `extra_file:<path>`, not surfaced as a tolerated warning. A tolerated-warnings surface (`extra_non_measure_file:<path>`) is **not** part of the contract; the test asserts the reason code is a structured failure, not a `{ok: true, warnings: [...]}` outcome.
- **structured error — content mismatch:** synthesizing a target file with the same inode but different content yields `{ok: false, reason: 'content_mismatch:<path>'}`. This is the synthetic copy-then-divergence probe and must be reachable by direct invocation, not only by setup of an actual divergent file system state.
- **structured error — not_hard_link:** synthesizing a target file with the same content but different inode yields `{ok: false, reason: 'not_hard_link:<path>:<dev>:<ino>'}`. The reason includes both dev and ino so an operator can confirm the lib is comparing the right pair.
- **structured error — cross-filesystem failure:** `classifyLinkError(err)` is a pure helper exported from the lib that returns `'cross_filesystem'` for `err.code === 'EXDEV'`, `'permission_denied'` for `err.code === 'EPERM'`, `'readonly_filesystem'` for `err.code === 'EROFS'`, and `'unknown'` otherwise. The test feeds synthetic `Error` instances with `.code` set and asserts the classification. This guards against silent crash on cross-fs sync attempts. The lib never lets a raw `fs.link` throw escape `verifyHardLinkSnapshot`; every `link` call is wrapped to feed `classifyLinkError` and produce a structured reason code.
- **deterministic output:** two calls to `verifyHardLinkSnapshot({...})` against the same paths produce byte-identical JSON output (no timestamps, no random tokens, no `Date.now()`, no `Math.random()`). The test asserts `JSON.stringify(a) === JSON.stringify(b)`.
- **anti-pattern A4 strengthening:** a target directory whose source set is empty (zero agents) does **not** vacuously report `{ok: true}`. The test asserts that the empty-source case yields a structured failure (`empty_source:<path>`) rather than a vacuous pass. This mirrors the all-`[~]` preflight probe and prevents an empty-target from being misread as "everything is fine."
- **anti-pattern A8 strengthening:** a target directory containing only symlinks (e.g., a symlink to the source directory itself) is rejected via `symlink_detected:<path>` rather than passing dev+ino equality by inheritance. The test creates a symlink-only target in `os.tmpdir()` and asserts the structured rejection.

**Intentionally-red aggregate handling:** no test in S1.agents-snapshot is intentionally red at Green time. The full surface is required to pass before Jr can claim Green; a "must-fail-until-implemented" probe is unnecessary because the lib itself does not yet exist at Red time (every import fails with `ERR_MODULE_NOT_FOUND`). This is the established S1 Red pattern; agents-snapshot inherits it.

**Architecture guardrails (S1.agents-snapshot contract surface):**
- All new modules are project-neutral: they take explicit paths (or env-overridable defaults), no hard-coded owner/repo coupling. Defaults are documented and overridable via env, mirroring `scripts/parity.mjs`.
- `EXPECTED_AGENT_COUNT` and `EXPECTED_MEASURE_AGENT_COUNT` are exported constants; consumers (including `scripts/agents-snapshot.mjs` and the test file) import them rather than re-hardcoding the integers 27 and 13. This is itself an **anti-pattern A3 labeled-integer defense** — the constants are the labels.
- `MEASURE_ONLY_PATTERN` is exported and re-used by both the lib and the test; do not duplicate the regex.
- Reason codes are structured strings (`missing_file:<path>`, `extra_file:<path>`, `not_hard_link:<path>:<dev>:<ino>`, `content_mismatch:<path>`, `symlink_detected:<path>`, `cross_filesystem`, `cross_filesystem:<target>`, `empty_source:<path>`), parsable by downstream telemetry. `extra_file:<path>` is the **single reason** used for any unexpected `.md` file in any target, including a non-measure `.md` file in the measure-only target — there is no separate `extra_non_measure_file:<path>` tolerated-warning reason code in this contract. `formatSnapshotError(reason)` is exported and is byte-identical for the same input.
- `scripts/agents-snapshot.mjs` mirrors `scripts/parity.mjs` structure: reads env, walks directories, computes structured result, prints JSON, exits 0/1. It does **not** modify any directory. Hard-link creation is Jr's responsibility (or a separate operator command Jr may choose to expose); the script's role is verification only.
- The lib **never** deletes, moves, or modifies files. It is read-only on the target side and may write only to its own stdout/log. **Deletion of obsolete non-measure files in `Desktop/measure/agents` is performed by Jr's Green code, not by the lib.** The lib's contract is verification-only: it observes the filesystem and emits structured reasons; it never writes target paths, and it exports no `deleteFile` symbol. Jr's Green code (e.g., a `scripts/agents-snapshot-sync.mjs` companion or an inline step in the Jr commit) is the sole writer for the deletion action, and it must (a) classify any per-file `fs.linkSync` failure via `classifyLinkError`, (b) for the measure-only target, run `fs.unlinkSync` on every existing non-measure `.md` file **before** the hard-link sync, and (c) emit a deterministic action log (e.g., `{deleted: string[], linked: string[]}`) that review-b can audit. The sync is destructive of any existing target file content; the strategy documents this but does not require a pre-sync diff at this stage (the user-approved scope treats the source set as the truth).

**Changed-contract risks (S1.agents-snapshot):**

- `lib/core.mjs` currently exports `EXPECTED_AGENT_COUNT = 24` and `EXPECTED_CALLABLE_COUNT = 22`. After sync to 27 agents, these constants must be updated to 27. The local snapshot `loadAgents(resolve(rootDir, 'agents'))` will return 27 agents. Jr must update these constants AND `tests/core.test.mjs` (which currently asserts `agentCount: 24, callableCount: 22`) as part of Green. This is an **editorial** update to existing tests, not a contract change to the new hard-link test surface. The strategy labels this risk `medium`: it is mechanical but failure to update it breaks `npm test` even after the sync is correct.
- The `MODEL_MAP` in `lib/core.mjs` may need new entries for the additional agents (e.g., `coder-kimi-for-coding-highspeed`, `coder-kimi-for-coding-k2p7`, `coder-openai-gpt-5-6-luna-fast`, etc.). If any new agent has a `frontmatter.model` not in `MODEL_MAP`, `agentParity` will report `unmappedModels`, breaking `tests/core.test.mjs`. Jr must add the mapping entries as part of Green. The strategy labels this risk `medium`: a single unmapped agent breaks `npm test`, but the mapping is enumerable from the source set.
- The hard-link sync itself is destructive of any existing target file content. Jr must verify before linking that the existing target files either already match the source or are intentionally being replaced. The lib does not perform the sync; it only verifies. Jr may choose to add a pre-sync diff (e.g., a `--plan` flag in `scripts/agents-snapshot.mjs`) but the strategy does not require it at this stage. The user-approved scope treats the source set as the truth.
- **Measure-only target requires explicit pre-sync deletion of obsolete non-measure files.** `Desktop/measure/agents` currently contains 10 obsolete non-measure agent files (`coder-deepseek-v4-flash.md`, `coder-deepseek-v4-pro.md`, `coder-kimi-k2p7.md`, `coder-minimax-m3.md`, `coder-openrouter-free.md`, `coder-orchestrator.md`, `coder-vocengine-ark-code-latest.md`, `coder-vocengine-glm-5-2.md`, `coder-xiaomi-mimo-v2-5.md`, `coder-xiaomi-mimo-v2-5-pro.md`) plus 12 of the 13 source measure files (missing `measure-orchestrator.md`). Jr's Green must `fs.unlinkSync` all 10 non-measure files (verified by post-delete `readdirSync` listing matching the 12 remaining measure files by name) before running `fs.linkSync` for the missing `measure-orchestrator.md`. The lib surfaces a residual non-measure file as `{ok: false, reason: 'extra_file:<path>'}`, not as a tolerated warning, so any deletion step Jr skips will be caught by the verification gate. The strategy labels this risk `high`: it is mechanical but failure to perform the deletion step leaves the gate in a known-broken state until remediation. The deletion is performed by Jr's Green code (not by the lib, which is verification-only); the lib has no `deleteFile` export and adds none for this contract.
- Cross-filesystem failure is not theoretical: if a future operator runs the harness on a machine where `~/.config/opencode/agent` is on one filesystem and `~/Desktop/...` is on another (NFS, bind-mounted, etc.), `link()` will throw `EXDEV`. The lib must classify this as `cross_filesystem` and emit a deterministic diagnostic, not crash. The test covers this via `classifyLinkError` (synthetic error injection), which is portable across filesystems.
- Symlink bypass: a hostile operator (or a careless operator) could replace a target file with a symlink to a malicious agent file. The test explicitly asserts `lstat` is not symlink. The lib uses `lstat` to detect symlinks and rejects them with `symlink_detected:<path>`. This guards A8 (vacuous acceptance of forged paths).

**Active-run marker compatibility (S1.agents-snapshot).** The hard-link sync only touches filesystem paths. It does not modify `measure/tracks/.../plan.md`, `measure/workflow.md`, or any markdown file. The live `[ ]` markers in `plan.md` remain pending; the canonical grammar's reclassification rule (in `lib/grammar.mjs`) continues to apply only to plans that opt into the new grammar version. Jr's Green MUST NOT edit `plan.md` during the sync. Jr's Green MUST NOT remove or modify `[ ]` from `measure/workflow.md`'s compatibility policy.

**Unrelated-scope preservation (S1.agents-snapshot).** The new test surface covers exactly the four agent directories named in the user-approved scope clarification. It does **not**:

- extend `npm run parity` to compare agent content across the three new target directories (parity remains the source-vs-package-snapshot check; agents-snapshot is a separate, stronger check),
- modify `scripts/configure.mjs` or `scripts/migrate-auth.mjs`,
- modify `extensions/measure-harness/index.ts`,
- modify the agent files themselves (no frontmatter or body edits),
- tolerate, retain, or warn about obsolete non-measure files in `Desktop/measure/agents` (the user-approved policy is the opposite: obsolete non-measure files in `Desktop/measure/agents` MUST be deleted during Green, the lib surfaces them as `{ok: false, reason: 'extra_file:<path>'}` if present at verification time, and a tolerated-warning outcome is not part of the contract),
- edit any file in `agents/`, `measure/tracks/`, `measure/`, or `lib/` other than the new `lib/agents-snapshot.mjs` and the editorial updates to `lib/core.mjs` and `tests/core.test.mjs` listed above,
- introduce new files into the live `measure/` planning hierarchy (`plan.md` is owned by `measure-strategy`+`measure-mid-red`; `test-strategy.md` is owned by `measure-strategy`; nothing in `agents-snapshot` writes to `measure/`).

**Implementation/verification command contract (deterministic).** The strategy specifies the following command contract; the strategy does **not** perform the synchronization itself, and Mid does not perform it either. Jr performs the sync as part of Green and verifies it with these commands:

```text
# 1. Verify the contract (operator-facing, deterministic, JSON-output, exit 0/1):
node scripts/agents-snapshot.mjs

# 2. Run the focused Red/Green test surface:
node --test tests/manifest.test.mjs tests/grammar.test.mjs tests/preflight.test.mjs tests/agents-snapshot.test.mjs

# 3. Run the full test suite:
npm test

# 4. Run project checks:
npm run check

# 5. Run the existing parity supplement:
npm run parity
```

The sync operation that Jr performs (between step 1's verification at Red time and step 1's verification at Green time) is:

1. **Pre-sync deletion (measure-only target only).** For `Desktop/measure/agents` (the measure-only target), walk the directory via `readdirSync(...).filter(.md)` and `fs.unlinkSync` every `.md` file whose basename does not match `MEASURE_ONLY_PATTERN`. This is the explicit precondition that makes the measure-only target exact-13. Skip this step for the two full-mirror targets — their pre-sync state is by-name-divergent (some files missing, never extra relative to the source set); any extra in a full-mirror target is a hard failure on the source side, not a deletion precondition. Jr records `{deleted: string[]}` for the measure-only target only.
2. **Hard-link sync.** For each target directory and each filename the contract requires, run `fs.linkSync(<source>/<file>, <target>/<file>)` (or, equivalently, `ln <source>/<file> <target>/<file>` shell-side) — capturing any thrown error, classifying it via `classifyLinkError`, and emitting a structured reason code on failure. For the measure-only target, the required filename set is `source.filter(MEASURE_ONLY_PATTERN)` (13 entries); for the full-mirror targets, the required filename set is the full source set (27 entries each). Jr records `{linked: string[]}` (and any `{linkFailures: {path, classifiedReason}[]}`) per target.
3. **Hard-link verification.** After both phases, run `node scripts/agents-snapshot.mjs` (step 1 of the command contract) to confirm every required filename in every required target has matching dev+ino with its source counterpart, no symlinks are present, and no extra files remain.

The strategy does not specify the precise Jr-side sync script beyond this contract: any deterministic, error-classifying implementation that produces a verified Green is acceptable. The `{deleted, linked, linkFailures}` action log is review-b-auditable but is not part of the `tests/agents-snapshot.test.mjs` assertions — the test surface and the script surface both verify the post-state filesystem, not the action log.

### Phase S2 — Deterministic sprint orchestration
**Risk:** **critical** | **measure-orchestrator-audit applicable:** ✔ (state machine is core orchestrator infrastructure). | **adversarial applicable:** ✔ (state-machine bypass is the canonical A1 attack surface; replace substring checks with structured signals). | **review-a:** ✔ | **review-b:** ✔ (state transitions must reject stale/unauthorized results; new error paths). | **review-c:** ✔ (`task` tool API; child-process isolation boundary). | **UX browser:** ✗.

**Red command (focused):** `node --test tests/state-machine.test.mjs tests/dispatch.test.mjs`.
**Green gate:** `npm test` + `npm run parity` exit 0; `npm run check` exit 0.
**Closeout gate:** same as S1 plus a freeze test that a paused run resumes to the same next-permitted action.

**Required Red/Green test surfaces:**
- `tests/state-machine.test.mjs`:
  - **live-behavior ready/dependency:** stories without met dependencies are not ready; a synthetic sprint with cycle in dependencies fails with a classified reason, not a stack trace.
  - **stale result rejection:** a result whose `baseline_sha` is no longer an ancestor of HEAD → rejected with `stale_result`; this is the **central** A1 guard.
  - **unauthorized result:** a result whose `parentAgent` is not allowed for `childAgent` → rejected with `unauthorized_dispatch`.
  - **review invalidation on HEAD change:** apply Green, run review A, apply a remediation patch, run review A again; the second review must report `audited_head_sha` equal to the post-remediation HEAD and may not inherit the prior `status: pass`.
  - **resume:** persist state, kill the in-process state, rebuild from durable store, assert the next permitted action is identical.
  - **scope-change:** a mid-sprint addition records `{type:'addition', capacity_effect, approver}` before transitioning the story state.
  - **anti-pattern A1 probe:** a substring heuristic that drops `[b]` based on prose is **absent**; a `taskIsBlocked` helper used in the state machine recognizes only the structured signal.

- `tests/dispatch.test.mjs`:
  - **isolated result paths:** two reviewers running concurrently write to distinct result paths; concurrent test simulates two writers, asserts no interleaving.
  - **durable baseline binding:** dispatch reads `git rev-parse HEAD` at start, binds receipt to it; a manual `git checkout <earlier_commit>` mid-run fails the next role's `audited_head_sha` check.

**Anti-pattern coverage (S2):** A1 (state transitions reject malformed results), A4 (markers-consistent fails on all-`[~]`), A5 (plan text "all checks pass" must match real exit 0; Mid must assert the cited test's exit code, not the claim), A7 (no `rg -v` filter using bare English words; test the filter with a banned-term + filter-word probe and assert the hit survives), A9 (no `tests/*.sh` referencing a path that has been archived; not yet relevant for S2, but `track_dir_resolve` helper is reserved).

### Phase S3 — Evidence and evaluation telemetry
**Risk:** **critical** | **measure-orchestrator-audit applicable:** ✔. | **adversarial applicable:** ✔ (privacy probes + replay-corrupt attacks). | **review-a:** ✔ | **review-b:** ✔ (privacy, credentials, retention). | **review-c:** ✔ (event contract surface is consumed by S4 meta-workflow). | **UX browser:** ✗.

**Red command (focused):** `node --test tests/telemetry.test.mjs tests/eval-corpus.test.mjs`.
**Green gate:** `npm test` + `npm run parity` exit 0; `npm run check` exit 0.
**Closeout gate:** same plus a synthetic credential never appears in any emitted event (verified by a synthetic-credential probe run during final acceptance).

**Required Red/Green test surfaces:**
- `tests/telemetry.test.mjs`:
  - **live-behavior:** a role invocation emits a structured event with every required field (`role`, `model`, `version_ids`, `baseline_sha`, `output_revision`, `duration_ms`, `gate_outcome`, `retry_count`, `failure_classification`).
  - **redaction:** synthetic token strings fed into the harness never appear in the emitted event; the test feeds a string `sk-secret-PROBE-1234` and asserts its absence.
  - **opt-out:** an opt-out flag disables optional payload fields but does **not** remove minimum-provenance fields; the test asserts provenance presence and payload absence independently.
  - **anti-pattern A2 probe:** if a "publish" gate ever appears in this track, the test asserts consent/anonymization check is present.

- `tests/eval-corpus.test.mjs`:
  - **frozen corpus:** a fixture corpus of (input, expected_outcome) pairs; replay produces the documented decisions with no nondeterminism.
  - **quality-first comparison:** a candidate that is cheaper/faster but regresses any safety/quality threshold is **rejected** even when energy/time improves. The test asserts `decision === 'reject'` with `reasons: ['quality_regression']`.

### Phase S4 — Curated learning and safe revision
**Risk:** **critical** | **measure-orchestrator-audit applicable:** ✔ (self-modification paths and approval matrix are framework infrastructure). | **adversarial applicable:** ✔ (approval-bypass attacks; guard-weakening attacks). | **review-a:** ✔ | **review-b:** ✔ (permission gates; approval gating is a security boundary). | **review-c:** ✔ (promotion API surface). | **UX browser:** ✗.

**Red command (focused):** `node --test tests/learning-approval.test.mjs tests/candidate-isolation.test.mjs`.
**Green gate:** `npm test` + `npm run parity` exit 0; `npm run check` exit 0.
**Closeout gate:** no acceptance without human-approved risk-tier evidence in the audit JSON.

**Required Red/Green test surfaces:**
- **promotion requires applicability + non-applicability + evidence + scope + risk_tier + rollback_target.** A lesson missing any field is rejected with `incomplete_promotion_request`.
- **audit independence:** the role that proposed a candidate cannot approve its own change. The test instantiates reflector → candidate → promoter with mismatched identities and asserts the promotion gate refuses to approve.
- **guard weakening:** a candidate that drops a guard without replacement is rejected with `guard_weakening`.
- **candidate isolation:** writing to the candidate working copy does **not** alter the active run's extension/agents/skills/contracts. The test asserts active-run snapshot pre/post is byte-identical.
- **risk-tier routing:** routing/prompt/schema changes route to higher-tier approval; permission/gate/constitution/promotion-mechanism changes require human approval with audit JSON `approver` field populated.

### Phase S5 — Canary promotion and rollback
**Risk:** **high** | **measure-orchestrator-audit applicable:** ✔. | **adversarial applicable:** ✔ (canary escape; rollback-to-wrong-version; promotion-on-conflict). | **review-a:** ✔ | **review-b:** ✔ (rollback correctness is a security/availability concern). | **review-c:** ✔ (canary selection API surface). | **UX browser:** ✗.

**Red command (focused):** `node --test tests/replay-eval.test.mjs tests/canary-rollback.test.mjs`.
**Green gate:** `npm test` + `npm run parity` exit 0; `npm run check` exit 0.
**Closeout gate:** the canary-violation rollback procedure has been exercised in a simulated run; the binding test asserts the active version after the violation equals the recorded last-known-good SHA.

**Required Red/Green test surfaces:**
- **replay determinism:** a frozen corpus runs against candidate and active; the candidate's `quality_first_decision` is reproducible across N reruns.
- **canary isolation:** a canary run uses the candidate version; an active run on the same selection-key uses the active version; both are bound by immutable `audited_head_sha`.
- **blocking-threshold violation:** when the canary exceeds any blocking threshold, dispatch halts and rollback to last-known-good runs the documented procedure.
- **running-version pinning:** a workflow started under active vN continues under vN even after vN+1 is promoted.
- **routing-evidence conflict:** when evidence is insufficient or contradictory, the harness preserves the current route and emits a `route_hold_for_review` signal rather than optimizing on anecdote.

## 7. Cross-Phase Rules

- **Anti-pattern coverage matrix** (each test in the strategy must have a falsification condition):

  | Phase | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | A9 | A10 |
  |-------|----|----|----|----|----|----|----|----|----|----|
  | S1 | — | — | ✔ labeled-integer parses (`agentCount` constant, never bare integer); **strengthened** in S1.agents-snapshot via exported `EXPECTED_AGENT_COUNT` constant | ✔ all-`[~]` probe; **strengthened** in S1.agents-snapshot via `empty_source:<path>` rejection (no vacuous pass on empty target) | ✔ SHA on `[x]` enforced; **strengthened** in S1.agents-snapshot via `sha256` content parity per shared filename + `not_hard_link:<path>:<dev>:<ino>` structural assertion | — | — | ✔ regex probe; **strengthened** in S1.agents-snapshot via `MEASURE_ONLY_PATTERN` constant + `symlink_detected:<path>` `lstat` rejection, **and** an exact-13 measure-only policy that fails on any non-measure `.md` file in `Desktop/measure/agents` (`extra_file:<path>`, never tolerated); Jr's Green deletes obsolete non-measure files as a precondition of the hard-link sync | — | — |
  | S2 | ✔ structured-signal helper | — | ✔ | ✔ | ✔ cited-test exit | — | ✔ filter-word probe | — | ✔ `track_dir_resolve` | — |
  | S3 | — | ✔ publish-gate consent | ✔ | — | — | — | — | — | — | — |
  | S4 | — | — | — | ✔ | ✔ | ✔ registry note | — | — | — | — |
  | S5 | — | — | — | — | ✔ | ✔ | — | — | — | — |

- **Contract-test vs documentation-test split:** any new `MEASURE_AGENT_RESULT` shape change is verified by both an artifact test (schema acceptance in `tests/audit-schema.test.mjs` or equivalent) and a live-behavior test (a real role invocation producing the new shape). Acceptance requires the live-behavior test to pass.
- **Phase audit results are immutable** between the audited HEAD and the next role; any later commit invalidates them and forces rerun. The orchestrator's `role-gate` enforces this; Mid/Jr must not bypass it.
- **Worktree snapshots** are mandatory for every audit-only role (`review-a`, `review-b`, `review-c`, `phase-acceptance`, `adversarial-testing`, `ux-browser-review`, `final-acceptance`, `orchestrator-audit`). Mutation outside the supplied result artifact fails the audit gate.
- **`npm run parity`** is a hard Green-gate supplement. A drift between `agents/*.md` and the snapshot must be resolved before Jr can claim Green.
- **`node scripts/agents-snapshot.mjs`** is a hard Green-gate supplement for S1 specifically. A drift in cross-directory hard-link parity (filename set, content sha256, dev+ino equality) between the source set and any of the three target directories must be resolved before Jr can claim S1 Green. `npm run parity` and `node scripts/agents-snapshot.mjs` are complementary: parity checks bytes, agents-snapshot checks inodes.

## 8. Falsifiability Checklist (per phase)

A test in this strategy is considered falsifiable iff all four are true:

1. The test name and assertion describe a measurable condition (not "should generally work").
2. A fixture or live invocation can produce a state where the assertion flips.
3. The Red command exits non-zero on that flipped state.
4. The Green command exits zero only after the documented contract change lands.

Mid must mark each new test with a one-line comment naming the contract section it protects; review-a audits the comment for vacuous phrasing. Jr must not modify the comment without review-a sign-off. The S1.agents-snapshot additions (`tests/agents-snapshot.test.mjs`, ~12 assertions) must each carry a `// protects: test-strategy.md#phase-s1.agents-snapshot — <bullet name>` comment naming the falsifiable condition it asserts, satisfying this checklist's condition 1 and review-a's vacuous-phrasing audit.

---

End of strategy. Refresh and commit policy: any change to package conventions, manifest schema, marker grammar, or anti-pattern catalog requires a new committed strategy revision before the next Mid role gate.

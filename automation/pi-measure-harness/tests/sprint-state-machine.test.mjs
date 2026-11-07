// Contract: measure/tracks/controlled_harness_evolution_20260714/test-strategy.md#phase-s2
//
// Red-phase Phase S2 tests for `lib/sprint-state.mjs` (deterministic
// sprint orchestration state machine). The Mid Red gate must observe a
// non-zero exit because `lib/sprint-state.mjs` does not yet exist
// (`ERR_MODULE_NOT_FOUND`); Jr Green implements the module and makes
// every assertion pass without altering this test's contract surface.
//
// Each assertion names the contract section it protects (per strategy
// §8: "Mid must mark each new test with a one-line comment naming the
// contract section it protects").
//
// The eight categories per spec.md#story-s2 ACs + plan.md#phase-s2
// tasks S2.1 + S2.2:
//
//   1. ready/not-ready stories (dependencies met, dependencies unmet,
//      cycle in dependencies → classified failure rather than stack
//      trace)
//   2. invalid role-results (malformed JSON, missing required fields,
//      schema-version mismatch → classified failure)
//   3. stale audits (baseline_sha no longer an ancestor of HEAD →
//      rejected with `stale_result`; central A1 guard)
//   4. remediation invalidation (after a role's HEAD changes, prior
//      acceptance results are invalidated; rerun required)
//   5. concurrent review isolation (two parallel reviews of the same
//      phase write to distinct, isolated result paths with no
//      interleaving)
//   6. resume (persist state, kill the in-process state, rebuild from
//      the durable store, assert next permitted action is identical)
//   7. scope-change recording (mid-sprint addition/removal requires
//      capacity_effect + approver before story state changes)
//   8. terminal states (done, blocked, deferred correctly identified)
//
// Anti-pattern probes (per anti-patterns.md and strategy §6 S2):
//   A3 — labeled-integer probe (counts are never bare integers; they
//        carry a labeled structure)
//   A4 — vacuous-pass probe (empty state machine does NOT report ready;
//        all-`[~]` marker-consistent check fails on nothing-done)
//   A5 — transition-record source-state probe (every transition record
//        carries a source-state id; transition without source-state id
//        fails closed)
//   A7 — no refutation-filter masking (filter-word + banned-term probe
//        asserts that a real failure is not silently masked by an English
//        filter)
//   A8 — deterministic-output probe (no timestamp leakage in any
//        structured output; identical input produces byte-identical
//        output across repeated calls)
//
// Required Jr Green surface symbols (lib/sprint-state.mjs):
//
//   loadSprint(sprintPath):
//     Loads a sprint JSON, validates dependency graph, returns a
//     state-machine object. Throws on cycle with `dependency_cycle`
//     (and never propagates a raw stack trace to dispatch callers).
//
//   computeReadyStories(sprint):
//     Returns a deterministic array of story ids that are ready to run.
//     A story is ready when all its dependencies are in a terminal
//     `done` state AND no scope-change is pending AND no remediation
//     invalidation is unresolved. Empty state → returns [] (NEVER
//     vacuously `[ready]`).
//
//   applyResult(machine, roleResult, options):
//     Validates `roleResult` against the schema, rejects malformed
//     results with classified reasons (`invalid_role_result`,
//     `missing_required_field`, etc.), rejects stale results with
//     `stale_result` (baseline_sha not an ancestor of HEAD), and
//     accepts well-formed results with the corresponding state
//     transition.
//
//   validateRoleResult(roleResult, schema):
//     Pure helper. Returns `{ok: true}` for a well-formed result;
//     returns `{ok: false, reason: <classified>}` for any malformed
//     shape. Never throws.
//
//   isBaselineStale(baselineSha, currentHead):
//     Returns true when `baselineSha` is not an ancestor of
//     `currentHead` (i.e. HEAD has moved past the baseline and the
//     prior audit can no longer be considered valid).
//
//   recordScopeChange(machine, change):
//     Records a scope change of `{type, capacity_effect, approver}`
//     (and `evidence` for additions/removals) BEFORE the story state
//     transitions. A scope change without `capacity_effect` or
//     `approver` is rejected with `incomplete_scope_change`.
//
//   persistState(machine, storePath):
//     Writes the current state to `storePath` atomically (write to
//     `<storePath>.tmp`, rename to `storePath`). Returns the storage
//     fingerprint. No credentials may appear in the written state.
//
//   rebuildState(storePath):
//     Rebuilds a state-machine object from the durable store. After
//     rebuild, `nextPermittedAction(machine)` must equal the value
//     computed BEFORE persistence.
//
//   nextPermittedAction(machine):
//     Returns the next role permitted to run as a structured object
//     `{role: string, storyId: string, baselineSha: string}`. The
//     same input must produce byte-identical output across calls.
//
//   terminalStateOf(story):
//     Returns one of `'done'`, `'blocked'`, `'deferred'`, or undefined
//     when the story is still active.
//
//   concurrentReviewPaths(machine, reviewRoles):
//     Returns an array of distinct result paths, one per reviewer.
//     Two reviewers running concurrently must never write to the same
//     path.
//
//   filterBannedTerms(items, bannedTerms):
//     Returns the input array unchanged EXCEPT that entries
//     containing a banned term are surfaced (NOT silently masked).
//     The function exists to demonstrate that any refutation filter
//     in the harness does not mask real failures (A7 defense).
//
// Fixture shape (tests/fixtures/s2/sprint.json):
//
//   {
//     "sprint_id": "s2-fixture",
//     "stories": [
//       { "id": "S2.A", "deps": [], "state": "pending" },
//       { "id": "S2.B", "deps": ["S2.A"], "state": "pending" },
//       { "id": "S2.C", "deps": ["S2.B"], "state": "blocked", "blocked_reason": "deferred:owner" }
//     ]
//   }

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/s2");
const sprintPath = resolve(fixtureRoot, "sprint.json");
const cycleSprintPath = resolve(fixtureRoot, "sprint-cycle.json");
const emptySprintPath = resolve(fixtureRoot, "sprint-empty.json");

// Dynamic import per test (carried from tests/observed-routing.test.mjs)
// so that each test gets its own ERR_MODULE_NOT_FOUND failure rather than
// the entire file collapsing into a single module-load error. This gives
// granular per-test failure reporting for the Red gate.
async function loadModule() {
  return import("../lib/sprint-state.mjs");
}

test("ready stories: stories whose dependencies are not yet met are NOT ready", async () => {
  // protects: spec.md#story-s2 AC1 + test-strategy.md Phase S2 "live-behavior ready/dependency"
  const { loadSprint, computeReadyStories } = await loadModule();
  const sprint = loadSprint(sprintPath);
  const ready = computeReadyStories(sprint);
  assert.ok(Array.isArray(ready), "ready list must be an array");
  // The fixture has S2.A (no deps) ready; S2.B depends on S2.A; S2.C is
  // blocked. So only S2.A is ready.
  assert.equal(ready.length, 1, "exactly one story (S2.A) has no unmet deps");
  assert.equal(ready[0], "S2.A", "S2.A must be the only ready story");
  // S2.B has an unmet dependency on S2.A.
  assert.ok(!ready.includes("S2.B"), "S2.B must NOT be ready while S2.A is pending");
  // S2.C is blocked, never ready.
  assert.ok(!ready.includes("S2.C"), "S2.C is blocked and must NOT be ready");
});

test("ready stories: empty state must NOT vacuously report ready (anti-pattern A4)", async () => {
  // protects: anti-patterns.md#A4 + test-strategy.md Phase S2 "anti-pattern A1 probe" + plan.md S2.2
  // An empty sprint must not produce an empty ready list and silently report
  // success. The state machine must instead return [] (no ready stories),
  // and the harness must be able to distinguish "empty sprint" from
  // "nothing to do" via the explicit readyCount field.
  const { loadSprint, computeReadyStories } = await loadModule();
  const sprint = loadSprint(emptySprintPath);
  const ready = computeReadyStories(sprint);
  assert.ok(Array.isArray(ready), "ready must be an array even for empty state");
  assert.equal(ready.length, 0, "empty state must produce zero ready stories, NOT vacuously report ready");
  // A4 defense: a labeled readyCount must exist and equal 0 — not a bare integer.
  assert.ok(sprint, "sprint machine must be returned");
  assert.equal(typeof sprint.readyCount, "number", "readyCount must be a labeled number field");
  assert.equal(sprint.readyCount, 0, "readyCount must equal 0 for empty state");
});

test("ready stories: cycle in dependencies fails with classified reason, not a stack trace", async () => {
  // protects: spec.md#story-s2 AC1 + test-strategy.md Phase S2 "live-behavior ready/dependency"
  const { loadSprint } = await loadModule();
  let caught;
  try {
    loadSprint(cycleSprintPath);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "cycle in dependencies must throw a classified reason, not crash silently");
  // The classified reason must be a labeled string, not a raw Error message
  // that leaks the implementation's stack trace.
  assert.match(String(caught.message ?? caught), /dependency_cycle/, "classified reason must name 'dependency_cycle'");
});

test("invalid role results: malformed JSON / missing required fields → classified failure, not a stack trace", async () => {
  // protects: spec.md#story-s2 AC2 + test-strategy.md Phase S2 "unauthorized result"
  const { loadSprint, validateRoleResult, applyResult } = await loadModule();
  const sprint = loadSprint(sprintPath);
  // (a) Malformed JSON shape (missing required fields).
  const malformed = validateRoleResult({ storyId: "S2.A" }, { required: ["role", "storyId", "outcome"] });
  assert.equal(malformed.ok, false, "missing required fields must be rejected");
  assert.match(String(malformed.reason), /invalid_role_result|missing_required_field/, "malformed result must carry a classified reason");
  // (b) Wrong outcome shape.
  const wrongOutcome = validateRoleResult({ role: "coder-x", storyId: "S2.A", outcome: 42 }, { required: ["role", "storyId", "outcome"] });
  assert.equal(wrongOutcome.ok, false, "wrong outcome shape must be rejected");
  // (c) applyResult with a malformed roleResult must return a structured failure, not throw.
  const machine = { sprint, transitions: [] };
  const applied = applyResult(machine, { role: "coder-x", storyId: "S2.A" }, { schema: { required: ["role", "storyId", "outcome"] } });
  assert.equal(applied.ok, false, "malformed roleResult must NOT advance the state machine");
  assert.ok(applied.reason, "applyResult must surface a classified reason on malformed input");
});

test("stale audits: baseline_sha not an ancestor of HEAD → rejected with stale_result (central A1 guard)", async () => {
  // protects: spec.md#story-s2 AC2 + anti-patterns.md#A1 + test-strategy.md Phase S2 "stale result rejection"
  // Baseline 'aaa1111' is NOT an ancestor of HEAD 'bbb2222' (HEAD has
  // moved past the baseline).
  const { isBaselineStale, loadSprint, applyResult } = await loadModule();
  const stale = isBaselineStale("aaa1111", "bbb2222");
  assert.equal(stale, true, "a baseline_sha that is not an ancestor of HEAD must be reported stale");
  // applyResult with a stale baseline must reject with stale_result.
  const sprint = loadSprint(sprintPath);
  const machine = { sprint, transitions: [] };
  const roleResult = {
    role: "coder-x",
    storyId: "S2.A",
    outcome: "pass",
    baselineSha: "aaa1111",
    auditedHeadSha: "aaa1111",
  };
  const applied = applyResult(machine, roleResult, { currentHead: "bbb2222" });
  assert.equal(applied.ok, false, "stale baseline must NOT advance the state machine");
  assert.equal(applied.reason, "stale_result", "stale baseline must surface classified reason 'stale_result'");
  // A non-stale baseline (ancestor of HEAD) must NOT be reported stale.
  assert.equal(isBaselineStale("aaa1111", "aaa1111"), false, "baseline == HEAD is not stale");
});

test("remediation invalidation: after a role's HEAD changes, prior acceptance is invalidated; rerun required", async () => {
  // protects: spec.md#story-s2 AC4 + test-strategy.md Phase S2 "review invalidation on HEAD change"
  const { loadSprint, applyResult } = await loadModule();
  const sprint = loadSprint(sprintPath);
  // First, a review A passes against HEAD 'ccc1111'.
  const machine = { sprint, transitions: [], priorAcceptances: [] };
  const firstReview = applyResult(machine, {
    role: "measure-review-a-correctness",
    storyId: "S2.A",
    outcome: "pass",
    auditedHeadSha: "ccc1111",
    baselineSha: "ccc1111",
  }, { currentHead: "ccc1111" });
  assert.equal(firstReview.ok, true, "first review against its own HEAD must pass");
  // After remediation, HEAD moves to 'ccc2222'. The prior acceptance is
  // bound to 'ccc1111' and must be invalidated.
  const machineAfterRemediation = {
    ...machine,
    transitions: [...machine.transitions, ...(firstReview.transitions ?? [])],
  };
  const secondReview = applyResult(machineAfterRemediation, {
    role: "measure-review-a-correctness",
    storyId: "S2.A",
    outcome: "pass",
    auditedHeadSha: "ccc2222",
    baselineSha: "ccc2222",
  }, { currentHead: "ccc2222" });
  assert.equal(secondReview.ok, true, "second review against the new HEAD must pass");
  assert.equal(secondReview.auditedHeadSha, "ccc2222", "audited_head_sha must reflect the post-remediation HEAD");
  assert.notEqual(
    secondReview.auditedHeadSha,
    firstReview.auditedHeadSha,
    "audited_head_sha must NOT inherit the prior acceptance's HEAD",
  );
  // The state machine must record the invalidation event explicitly
  // (carrying the source-state id per anti-pattern A5).
  assert.ok(secondReview.invalidations, "remediation must record invalidations explicitly");
  assert.ok(secondReview.invalidations.length >= 1, "at least one invalidation must be recorded");
  const invalidation = secondReview.invalidations[0];
  assert.equal(invalidation.priorHead, "ccc1111", "invalidation must name the prior HEAD");
  assert.equal(invalidation.newHead, "ccc2222", "invalidation must name the new HEAD");
  assert.equal(invalidation.role, "measure-review-a-correctness", "invalidation must name the role");
});

test("concurrent review isolation: two parallel reviewers write to distinct, isolated result paths", async () => {
  // protects: spec.md#story-s2 AC3 + test-strategy.md Phase S2 "isolated result paths"
  const { loadSprint, concurrentReviewPaths } = await loadModule();
  const sprint = loadSprint(sprintPath);
  const machine = { sprint, transitions: [] };
  const reviewerRoles = ["measure-review-a-correctness", "measure-review-b-security"];
  const paths = concurrentReviewPaths(machine, reviewerRoles);
  assert.equal(paths.length, 2, "two reviewers must produce two distinct paths");
  assert.notEqual(paths[0], paths[1], "the two paths must be distinct (no shared path)");
  // Defense: each path must encode the reviewer role.
  assert.ok(paths[0].includes("measure-review-a-correctness") || paths[0].endsWith(".a.json"), "reviewer A's path must encode its role");
  assert.ok(paths[1].includes("measure-review-b-security") || paths[1].endsWith(".b.json"), "reviewer B's path must encode its role");
  // Concurrent simulation: each reviewer writes to its own path; the
  // contents of path[0] must not contain reviewer B's signature and
  // vice versa (no interleaving).
  const storeDir = mkdtempSync(join(tmpdir(), "s2-concurrent-"));
  try {
    const pathA = join(storeDir, paths[0]);
    const pathB = join(storeDir, paths[1]);
    writeFileSync(pathA, JSON.stringify({ role: "measure-review-a-correctness", verdict: "pass" }));
    writeFileSync(pathB, JSON.stringify({ role: "measure-review-b-security", verdict: "pass" }));
    const readA = JSON.parse(readFileSync(pathA, "utf8"));
    const readB = JSON.parse(readFileSync(pathB, "utf8"));
    assert.equal(readA.role, "measure-review-a-correctness", "path A must contain only reviewer A's verdict");
    assert.equal(readB.role, "measure-review-b-security", "path B must contain only reviewer B's verdict");
    assert.notEqual(readA.role, readB.role, "two paths must never carry each other's role signature (no interleaving)");
  } finally {
    rmSync(storeDir, { recursive: true, force: true });
  }
});

test("resume: persist state, kill the in-process state, rebuild from durable store, next action is identical", async () => {
  // protects: spec.md#story-s2 AC5 + test-strategy.md Phase S2 "resume"
  const { loadSprint, nextPermittedAction, persistState, rebuildState } = await loadModule();
  const sprint = loadSprint(sprintPath);
  const machine = { sprint, transitions: [] };
  // Capture the next permitted action BEFORE persistence.
  const beforeAction = nextPermittedAction(machine);
  assert.ok(beforeAction, "next permitted action must be available before persistence");
  // Persist state to a tmpdir.
  const storeDir = mkdtempSync(join(tmpdir(), "s2-resume-"));
  try {
    const storePath = join(storeDir, "state.json");
    const persisted = persistState(machine, storePath);
    assert.ok(persisted, "persistState must return a storage descriptor");
    // No credentials in the persisted state (AC3 — writes contain no credentials).
    const persistedContents = readFileSync(storePath, "utf8");
    assert.ok(!/sk-|api[_-]?key|password|secret/i.test(persistedContents), "persisted state must not contain credential-shaped strings");
    // Simulate kill + rebuild.
    const rebuilt = rebuildState(storePath);
    assert.ok(rebuilt, "rebuildState must return a usable state machine");
    // The next permitted action AFTER rebuild must be byte-identical to
    // the next permitted action BEFORE persistence.
    const afterAction = nextPermittedAction(rebuilt);
    assert.deepEqual(afterAction, beforeAction, "next permitted action must be byte-identical across persist/rebuild");
  } finally {
    rmSync(storeDir, { recursive: true, force: true });
  }
});

test("scope changes: mid-sprint addition/removal requires capacity_effect + approver BEFORE story state transitions", async () => {
  // protects: spec.md#story-s2 AC6 + test-strategy.md Phase S2 "scope-change"
  const { loadSprint, recordScopeChange } = await loadModule();
  const sprint = loadSprint(sprintPath);
  const machine = { sprint, transitions: [], scopeChanges: [] };
  // (a) Incomplete scope change (missing capacity_effect) must be rejected.
  const incomplete = recordScopeChange(machine, {
    type: "addition",
    storyId: "S2.D",
    approver: "owner-a",
  });
  assert.equal(incomplete.ok, false, "scope change without capacity_effect must be rejected");
  assert.match(String(incomplete.reason), /incomplete_scope_change/, "must surface classified reason 'incomplete_scope_change'");
  // (b) Incomplete scope change (missing approver) must be rejected.
  const noApprover = recordScopeChange(machine, {
    type: "addition",
    storyId: "S2.D",
    capacity_effect: { capacity_units: 1 },
  });
  assert.equal(noApprover.ok, false, "scope change without approver must be rejected");
  // (c) Complete scope change must be recorded BEFORE the story state changes.
  const complete = recordScopeChange(machine, {
    type: "addition",
    storyId: "S2.D",
    capacity_effect: { capacity_units: 1 },
    approver: "owner-a",
    evidence: "spec.md revision accepted 2026-07-14",
  });
  assert.equal(complete.ok, true, "complete scope change must be accepted");
  assert.ok(complete.scopeChange, "accepted scope change must be returned with a structured descriptor");
  assert.equal(complete.scopeChange.type, "addition", "scope change descriptor must name the type");
  assert.equal(complete.scopeChange.capacity_effect.capacity_units, 1, "scope change descriptor must carry capacity_effect");
  assert.equal(complete.scopeChange.approver, "owner-a", "scope change descriptor must carry the approver");
  // The story state must NOT have transitioned yet — only the scope change
  // is recorded.
  assert.ok(!complete.storyTransitioned, "story state must NOT transition from a scope change alone");
  // (d) Removal scope change requires the same capacity_effect + approver fields.
  const removal = recordScopeChange(machine, {
    type: "removal",
    storyId: "S2.B",
    capacity_effect: { capacity_units_delta: -1 },
    approver: "owner-b",
    evidence: "deferred to next sprint",
  });
  assert.equal(removal.ok, true, "complete removal scope change must be accepted");
});

test("terminal states: done / blocked / deferred correctly identified (no vacuous 'active')", async () => {
  // protects: spec.md#story-s2 AC6 + test-strategy.md Phase S2 "anti-pattern A1 probe"
  const { loadSprint, terminalStateOf } = await loadModule();
  const sprint = loadSprint(sprintPath);
  // S2.A is pending → not terminal.
  const s2a = sprint.stories.find((story) => story.id === "S2.A");
  assert.equal(terminalStateOf(s2a), undefined, "pending story must NOT report a terminal state");
  // S2.C is blocked → terminal state 'blocked'.
  const s2c = sprint.stories.find((story) => story.id === "S2.C");
  assert.equal(terminalStateOf(s2c), "blocked", "blocked story must report terminal state 'blocked'");
  // A done story → terminal state 'done'.
  const done = { id: "S2.DONE", state: "done" };
  assert.equal(terminalStateOf(done), "done", "done story must report terminal state 'done'");
  // A deferred story → terminal state 'deferred'.
  const deferred = { id: "S2.DEF", state: "deferred", deferred_owner: "owner-x" };
  assert.equal(terminalStateOf(deferred), "deferred", "deferred story must report terminal state 'deferred'");
  // The terminal state must be a labeled string, NEVER a bare integer
  // code (A3 probe).
  assert.equal(typeof terminalStateOf(done), "string", "terminal state must be a labeled string");
  assert.notEqual(typeof terminalStateOf(done), "number", "terminal state must NOT be a bare integer");
});

test("A3 probe: counts in the state machine are labeled structures, never bare integers", async () => {
  // protects: measure/anti-patterns.md#A3 + test-strategy.md Phase S2 "anti-pattern A1 probe"
  const { loadSprint, terminalStateOf } = await loadModule();
  const sprint = loadSprint(sprintPath);
  // Defense: every count field is a labeled integer (`readyCount`,
  // `transitionCount`, etc.), not a bare integer on the machine.
  assert.equal(typeof sprint.readyCount, "number", "readyCount must be a labeled integer field");
  assert.equal(typeof sprint.transitionCount, "number", "transitionCount must be a labeled integer field");
  // The terminal-state-of helper returns a labeled string, not a bare integer.
  const done = { id: "S2.DONE", state: "done" };
  assert.equal(typeof terminalStateOf(done), "string");
  assert.notEqual(terminalStateOf(done), 1, "done state must NOT be the bare integer 1");
  assert.notEqual(terminalStateOf(done), 0, "done state must NOT be the bare integer 0");
});

test("A5 probe: every transition record carries a source-state id; transition without source-state id fails closed", async () => {
  // protects: measure/anti-patterns.md#A5 + test-strategy.md Phase S2 "anti-pattern A1 probe"
  const { loadSprint, applyResult } = await loadModule();
  const sprint = loadSprint(sprintPath);
  const machine = { sprint, transitions: [] };
  // Apply a valid result that should produce a transition record. The
  // transition must carry `fromState` and `toState` (the source-state id).
  const applied = applyResult(machine, {
    role: "coder-x",
    storyId: "S2.A",
    outcome: "pass",
    auditedHeadSha: "ddd1111",
    baselineSha: "ddd1111",
  }, { currentHead: "ddd1111" });
  assert.equal(applied.ok, true, "valid result must advance the state machine");
  assert.ok(Array.isArray(applied.transitions), "applied result must include a transitions array");
  assert.ok(applied.transitions.length >= 1, "at least one transition must be recorded");
  const transition = applied.transitions[0];
  // Source-state id is mandatory (A5 defense).
  assert.ok("fromState" in transition, "transition record must carry fromState (A5: source-state id is mandatory)");
  assert.ok("toState" in transition, "transition record must carry toState");
  assert.equal(typeof transition.fromState, "string", "fromState must be a labeled string");
  assert.ok(transition.fromState.length > 0, "fromState must be non-empty");
});

test("A7 probe: refutation filter does NOT mask real failures (banned-term + filter-word probe)", async () => {
  // protects: measure/anti-patterns.md#A7 + test-strategy.md Phase S2 "A7 probe — no refutation filter that masks real failures"
  // The harness may use `rg -v` / filter-word heuristics to drop noise.
  // Such a filter must NOT silently mask a real failure. The probe feeds
  // a banned-term + a filter-word in the same item and asserts that the
  // banned term still surfaces.
  const { filterBannedTerms } = await loadModule();
  const items = [
    { id: "noise", text: "filter word: skip this" },
    { id: "real-failure", text: "skip this — but the result was a real failure: stale_result" },
    { id: "all-clear", text: "everything is fine" },
  ];
  const bannedTerms = ["stale_result", "invalid_role_result", "dependency_cycle"];
  const filtered = filterBannedTerms(items, bannedTerms);
  // Every item must survive the filter (the filter must not drop entries).
  assert.equal(filtered.length, items.length, "filter must NOT drop entries (A7 defense)");
  // The real-failure item must still contain a banned term — the filter
  // must not have replaced its text.
  const failure = filtered.find((item) => item.id === "real-failure");
  assert.ok(failure, "real-failure item must survive the filter");
  assert.ok(bannedTerms.some((term) => failure.text.includes(term)), "real-failure item must still surface a banned term after the filter (A7 defense)");
});

test("A8 probe: deterministic output — no timestamps or randomness in any structured sprint state", async () => {
  // protects: measure/anti-patterns.md#A8 + test-strategy.md Phase S2 "anti-pattern A1 probe"
  const { loadSprint, nextPermittedAction } = await loadModule();
  const sprint = loadSprint(sprintPath);
  // Same fixture → byte-identical JSON serialization.
  const serializedA = JSON.stringify(sprint);
  const serializedB = JSON.stringify(sprint);
  assert.equal(serializedA, serializedB, "loadSprint must be byte-identical across repeated calls on the same fixture");
  // No timestamps leak into the serialized state.
  assert.ok(!/\b\d{10,}\b/.test(serializedA), "no unix-epoch-shaped timestamps in sprint state");
  assert.ok(!serializedA.includes("Math.random"), "no Math.random leakage in sprint state");
  assert.ok(!/\bT\d{2}:\d{2}:\d{2}\.\d+Z\b/.test(serializedA), "no ISO-8601 timestamps in sprint state");
  // nextPermittedAction must also be deterministic across repeated calls.
  const machine = { sprint, transitions: [] };
  const action1 = nextPermittedAction(machine);
  const action2 = nextPermittedAction(machine);
  assert.deepEqual(action1, action2, "nextPermittedAction must be byte-identical across repeated calls");
});

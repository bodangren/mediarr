// Contract: measure/tracks/verified_delegation_boundary_20260805/test-strategy.md#phase-s1
//
// Red-phase Phase S1 tests for the observed-routing contract. Each
// assertion names the contract section it protects (per strategy §8:
// "Mid must mark each new test with a one-line comment naming the
// contract section it protects").
//
// The Mid Red gate must observe a non-zero exit because:
//   (a) `lib/observed-routing.mjs` does not yet exist (every test that
//       uses the dynamic `loadModule()` helper fails with
//       ERR_MODULE_NOT_FOUND at the import boundary),
//   (b) `runtimeModel(agent, fallback)` in extensions/measure-harness/
//       index.ts:64 still silently falls back to the parent's model
//       (the undeclared-pin test fails because no `undeclared_child_pin`
//       error is raised),
//   (c) the `task` tool's receipt carries only the old `model` field
//       and no `requestedModel` / `observedModel` / `roleDefinitionHash`
//       fields (the matching-observation / contradicting-observation /
//       unobservable-routing / roleDefinitionHash tests fail because
//       `buildReceipt` does not exist).
//
// Jr Green must:
//   (1) implement `extractObservedRouting` / `classifyObservedRouting` /
//       `runtimeModelStrict` / `computeRoleDefinitionHash` /
//       `resolveStrict` / `classifyAgentFile` / `buildReceipt` in
//       `lib/observed-routing.mjs` per the contract surface below,
//   (2) wire them into `extensions/measure-harness/index.ts#task` so the
//       receipt carries `requestedModel`, `observedModel`, and
//       `roleDefinitionHash` as separate fields (renaming the old
//       `model` field to `requestedModel` — leaving `model` as a silent
//       alias to `requestedModel` is forbidden, A7 analog),
//   (3) remove the parent-fallback from `runtimeModel(agent, fallback)`
//       so an absent child pin is a dispatch error naming the role,
//       never a silent inheritance of the parent's current model,
//   (4) ensure the three failure classifications
//       (`observed_routing_mismatch`, `observed_routing_unobservable`,
//       `undeclared_child_pin`) are emitted as distinct structured
//       `{class, reason}` findings (A7 defense — collapsing them into
//       a single `routing_failure` is forbidden).
//
// Contract surface (Phase 1, story S1 ACs):
//
//   extractObservedRouting(events):
//     Walks the child's JSON event stream and returns the served model
//     from the first `message_start` event whose `message.model` is
//     populated. Returns undefined when no such event exists.
//
//   classifyObservedRouting(pin, observedModel):
//     Returns `{class: 'verified_routing'}` when pin matches observed
//             after MODEL_MAP resolution.
//     Returns `{class: 'unverified_routing',
//              reason: 'observed_routing_mismatch',
//              requestedModel, observedModel}` when pin ≠ observed.
//     Returns `{class: 'unverified_routing',
//              reason: 'observed_routing_unobservable'}` when
//             observedModel is undefined.
//
//   runtimeModelStrict(agent):
//     Returns `{model: <resolvedModel>}` when agent.model is defined.
//     Returns `{error: {class: 'undeclared_child_pin',
//              role: <agent.name>}}` when agent.model is undefined.
//     NEVER falls back to a parent model — silent inheritance is the
//     bug being fixed.
//
//   computeRoleDefinitionHash(systemPrompt):
//     SHA-256 hex of the parsed systemPrompt body (trimmed). Same
//     `sha256` helper that `parseAgentFile` already uses for promptHash.
//
//   resolveStrict(requestedModel, observedModel):
//     Strict equality of provider/id after MODEL_MAP resolution.
//     Returns true iff MODEL_MAP[requestedModel] === observedModel OR
//     requestedModel === observedModel (when not in MODEL_MAP).
//     NEVER widens accepted divergence via alias matching alone.
//
//   classifyAgentFile(filePath, lstat):
//     Returns `{class: 'symlinked_agent_file', path: <filePath>}` when
//     lstat indicates a symlink. Returns null otherwise.
//
//   buildReceipt({pin, roleDefinition, promptBody, events}):
//     Returns a structured receipt with:
//       requestedModel       — the pin, as-is.
//       observedModel        — the served model (or undefined when
//                              unobservable).
//       roleDefinitionHash   — sha256(roleDefinition.trim()).
//       promptHash           — sha256(promptBody).
//       failureClassification — undefined on match; otherwise
//                              `{class: 'unverified_routing', reason,
//                               requestedModel?, observedModel?}`.
//       verifiedRouting      — `{class: 'verified_routing' | ...}`.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

const PIN = "openai-codex/gpt-5.6-sol";
const OBSERVED_PIN = "openai-codex/gpt-5.6-sol";
const OBSERVED_TERRA = "openai-codex/gpt-5.6-terra";

const matchingEvents = [
  { type: "message_start", message: { role: "assistant", model: OBSERVED_PIN } },
  { type: "message_end", message: { role: "assistant" } },
];

const contradictingEvents = [
  { type: "message_start", message: { role: "assistant", model: OBSERVED_TERRA } },
  { type: "message_end", message: { role: "assistant" } },
];

const unobservableEvents = [
  { type: "message_start", message: { role: "assistant" } },
  { type: "message_end", message: { role: "assistant" } },
];

function expectedSha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function loadModule() {
  return import("../lib/observed-routing.mjs");
}

test("live-behavior — matching observation: first message_start.model === pin → observedModel === pin, no failureClassification", async () => {
  // protects: spec.md#story-s1 AC1 + test-strategy.md Phase 1 "live-behavior — matching observation"
  const { buildReceipt } = await loadModule();
  const receipt = buildReceipt({
    pin: PIN,
    roleDefinition: "You are a fixture subagent.",
    promptBody: "You are a fixture subagent.",
    events: matchingEvents,
  });
  assert.equal(receipt.requestedModel, PIN, "requestedModel must be the pin, not undefined");
  assert.equal(receipt.observedModel, OBSERVED_PIN, "observedModel must equal the first message_start.model");
  assert.equal(receipt.failureClassification, undefined, "matching observation must NOT carry a failureClassification");
  assert.equal(receipt.verifiedRouting.class, "verified_routing", "verifiedRouting must be labeled {class: 'verified_routing'}");
});

test("live-behavior — contradicting observation: observed ≠ pin → failureClassification === observed_routing_mismatch", async () => {
  // protects: spec.md#story-s1 AC2 + test-strategy.md Phase 1 "live-behavior — contradicting observation"
  const { buildReceipt } = await loadModule();
  const receipt = buildReceipt({
    pin: PIN,
    roleDefinition: "You are a fixture subagent.",
    promptBody: "You are a fixture subagent.",
    events: contradictingEvents,
  });
  assert.equal(receipt.observedModel, OBSERVED_TERRA, "observedModel must capture the actual served model (the contradiction)");
  assert.ok(receipt.failureClassification, "contradicting observation must carry a failureClassification");
  assert.equal(receipt.failureClassification.class, "unverified_routing");
  assert.equal(receipt.failureClassification.reason, "observed_routing_mismatch");
  assert.equal(receipt.failureClassification.requestedModel, PIN, "diagnostic must name the requested pin");
  assert.equal(receipt.failureClassification.observedModel, OBSERVED_TERRA, "diagnostic must name the observed (served) model");
});

test("live-behavior — unobservable routing: no message_start.model → failureClassification === observed_routing_unobservable", async () => {
  // protects: spec.md#story-s1 AC3 + test-strategy.md Phase 1 "live-behavior — unobservable routing"
  const { buildReceipt } = await loadModule();
  const receipt = buildReceipt({
    pin: PIN,
    roleDefinition: "You are a fixture subagent.",
    promptBody: "You are a fixture subagent.",
    events: unobservableEvents,
  });
  assert.equal(receipt.observedModel, undefined, "observedModel must be undefined when no message_start.model exists");
  assert.ok(receipt.failureClassification, "unobservable routing must carry a failureClassification");
  assert.equal(receipt.failureClassification.class, "unverified_routing");
  assert.equal(receipt.failureClassification.reason, "observed_routing_unobservable");
});

test("live-behavior — undeclared pin (parent-fallback removed): runtimeModelStrict returns undeclared_child_pin error", async () => {
  // protects: spec.md#story-s1 AC4 + test-strategy.md Phase 1 "live-behavior — undeclared pin (parent-fallback removed)"
  const { runtimeModelStrict } = await loadModule();
  const agentWithoutModel = { name: "fixture-subagent", model: undefined };
  const result = runtimeModelStrict(agentWithoutModel);
  assert.ok(result.error, "agent without model: frontmatter must yield an error, NEVER a silent inheritance of the parent's model");
  assert.equal(result.error.class, "undeclared_child_pin");
  assert.equal(result.error.role, "fixture-subagent", "diagnostic must name the role");
  // The positive path: an agent WITH model: frontmatter returns the resolved model.
  const agentWithModel = { name: "fixture-subagent", model: "openai-codex/gpt-5.6-sol" };
  const ok = runtimeModelStrict(agentWithModel);
  assert.equal(ok.model, "openai-codex/gpt-5.6-sol");
  assert.equal(ok.error, undefined);
});

test("live-behavior — roleDefinitionHash on receipt: SHA-256 of role body, distinct from promptHash when continuation present", async () => {
  // protects: spec.md#story-s1 AC5 + test-strategy.md Phase 1 "live-behavior — roleDefinitionHash on receipt"
  const { buildReceipt } = await loadModule();
  const roleDefinition = "You are a fixture subagent. Always be helpful.";
  const continuation = "\n\nContinuation from task 11111111-2222-3333-4444-555555555555: previous output...";
  const promptBody = `${roleDefinition}${continuation}`;
  const receipt = buildReceipt({
    pin: PIN,
    roleDefinition,
    promptBody,
    events: matchingEvents,
  });
  assert.match(receipt.roleDefinitionHash, /^[0-9a-f]{64}$/, "roleDefinitionHash must be a SHA-256 hex digest");
  assert.equal(receipt.roleDefinitionHash, expectedSha256(roleDefinition.trim()), "roleDefinitionHash must equal SHA-256 of the trimmed role body");
  assert.match(receipt.promptHash, /^[0-9a-f]{64}$/, "promptHash must be a SHA-256 hex digest");
  assert.equal(receipt.promptHash, expectedSha256(promptBody), "promptHash must equal SHA-256 of the runtime prompt body");
  // Critical: the two hashes are NOT byte-identical when continuation is added.
  assert.notEqual(receipt.roleDefinitionHash, receipt.promptHash, "roleDefinitionHash must NOT equal promptHash when continuation text is added");
});

test("fail-closed — three distinct failure classifications: emitted as distinct {class, reason} findings (A7 defense)", async () => {
  // protects: spec.md Non-Functional Requirements A7 + test-strategy.md Phase 1 "fail-closed — three distinct classifications"
  const { classifyObservedRouting, runtimeModelStrict } = await loadModule();
  // (a) observed_routing_mismatch — observed ≠ pin.
  const mismatch = classifyObservedRouting(PIN, OBSERVED_TERRA);
  assert.equal(mismatch.class, "unverified_routing");
  assert.equal(mismatch.reason, "observed_routing_mismatch");
  // (b) observed_routing_unobservable — observed is undefined.
  const unobservable = classifyObservedRouting(PIN, undefined);
  assert.equal(unobservable.class, "unverified_routing");
  assert.equal(unobservable.reason, "observed_routing_unobservable");
  // (c) undeclared_child_pin — child role has no model: frontmatter.
  const undeclared = runtimeModelStrict({ name: "fixture-subagent", model: undefined });
  assert.equal(undeclared.error.class, "undeclared_child_pin");
  // The three classes must be distinct strings — never collapsed into one (A7 defense).
  const classifications = new Set([
    mismatch.reason,
    unobservable.reason,
    undeclared.error.class,
  ]);
  assert.equal(classifications.size, 3, "three failure classifications must be distinct strings (A7 defense — no collapsed 'routing_failure')");
});

test("A3 probe — verified-counter: status is {class, reason}, never a bare integer", async () => {
  // protects: measure/anti-patterns.md#A3 + test-strategy.md Phase 1 "A3 probe — labeled verified-counter"
  const { classifyObservedRouting } = await loadModule();
  const verified = classifyObservedRouting(PIN, OBSERVED_PIN);
  assert.equal(typeof verified, "object", "classification must be an object, never a bare integer or boolean");
  assert.equal(verified.class, "verified_routing", "verified status must carry class: 'verified_routing'");
  assert.equal(typeof verified.class, "string", "verified status must carry a labeled string class");
  assert.ok(verified.class.length > 0, "labeled class must be non-empty");
  // The failing case also has a labeled reason (not a bare integer code).
  const failed = classifyObservedRouting(PIN, OBSERVED_TERRA);
  assert.equal(typeof failed.reason, "string", "unverified status must carry a labeled reason string");
  assert.ok(failed.reason.length > 0, "labeled reason must be non-empty");
  // Defense (analog to tests/manifest.test.mjs#agentCountLabel): the contract
  // is a labeled structure, never {verified: 1} or {count: 1} or {code: 0}.
  assert.ok(!("verified" in verified), "verified status must NOT carry a bare 'verified' integer key");
  assert.ok(!("count" in verified), "verified status must NOT carry a bare 'count' integer key");
  assert.ok(!("code" in verified), "verified status must NOT carry a bare 'code' integer key");
});

test("A7 probe — no widening of accepted divergence: strict equality after MODEL_MAP resolution", async () => {
  // protects: measure/anti-patterns.md#A7 + test-strategy.md Phase 1 "A7 probe — no widening of accepted divergence"
  const { resolveStrict } = await loadModule();
  // (a) Strict equality via MODEL_MAP: sourceModel 'openai/gpt-5.6-sol' resolves
  //     to 'openai-codex/gpt-5.6-sol'. When requested === sourceModel and
  //     observed === resolved, the comparison must report match.
  assert.equal(resolveStrict("openai/gpt-5.6-sol", "openai-codex/gpt-5.6-sol"), true, "strict resolve via MODEL_MAP must match");
  // (b) Different model id: must NOT match.
  assert.equal(resolveStrict("openai/gpt-5.6-sol", "openai-codex/gpt-5.6-terra"), false, "different model id must NOT match");
  // (c) Model-id swap: must NOT match.
  assert.equal(resolveStrict("openai/gpt-5.6-sol", "openai-codex/gpt-5.6-luna"), false, "model-id swap must NOT match");
  // (d) A bogus alias: must NOT match.
  assert.equal(resolveStrict("openai/gpt-5.6-sol", "openai-codex/gpt-5.6-sol-fake"), false, "bogus alias must NOT match");
  // (e) Empty / null inputs: must NOT match.
  assert.equal(resolveStrict("", "openai-codex/gpt-5.6-sol"), false, "empty requested must NOT match");
  assert.equal(resolveStrict(PIN, ""), false, "empty observed must NOT match");
});

test("A8 probe — symlink rejection: agent file resolved through symlink → {class: 'symlinked_agent_file', path}", async () => {
  // protects: measure/anti-patterns.md#A8 + test-strategy.md Phase 1 "A8 probe — symlink rejection (defense carried from controlled_harness_evolution_20260714 S1.3b)"
  const { classifyAgentFile } = await loadModule();
  const symlinkedLstat = { isSymbolicLink: () => true };
  const result = classifyAgentFile("/path/to/symlinked-agent.md", symlinkedLstat);
  assert.ok(result, "symlinked agent file must yield a finding");
  assert.equal(result.class, "symlinked_agent_file");
  assert.equal(result.path, "/path/to/symlinked-agent.md");
  // Negative path: a non-symlink returns null (no finding).
  const realLstat = { isSymbolicLink: () => false };
  assert.equal(classifyAgentFile("/path/to/real-agent.md", realLstat), null);
});

test("deterministic output: two receipt writes for the same fixture invocation produce byte-identical stable fields", async () => {
  // protects: spec.md Non-Functional Requirements "deterministic and side-effect free"
  //          + test-strategy.md Phase 1 "deterministic output"
  const { buildReceipt } = await loadModule();
  const input = {
    pin: PIN,
    roleDefinition: "You are a fixture subagent.",
    promptBody: "You are a fixture subagent.\n\nContinuation: X.",
    events: matchingEvents,
  };
  const a = buildReceipt(input);
  const b = buildReceipt(input);
  // Compare only the routing/role-hash fields; startedAt/completedAt are
  // runtime timestamps that legitimately differ between dispatches.
  const stableA = {
    requestedModel: a.requestedModel,
    observedModel: a.observedModel,
    roleDefinitionHash: a.roleDefinitionHash,
    promptHash: a.promptHash,
    failureClassification: a.failureClassification,
    verifiedRouting: a.verifiedRouting,
  };
  const stableB = {
    requestedModel: b.requestedModel,
    observedModel: b.observedModel,
    roleDefinitionHash: b.roleDefinitionHash,
    promptHash: b.promptHash,
    failureClassification: b.failureClassification,
    verifiedRouting: b.verifiedRouting,
  };
  assert.equal(JSON.stringify(stableA), JSON.stringify(stableB), "stable receipt fields must be byte-identical across repeated calls");
});
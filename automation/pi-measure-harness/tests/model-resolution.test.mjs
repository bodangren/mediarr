// Contract: measure/tracks/harness_selfcheck_truthfulness_20260805/test-strategy.md#phase-2
//
// Red-phase Phase 2 tests for the model-resolution contract in
// `lib/core.mjs`. Each assertion names the contract section it protects
// (per strategy §8: "Mid must mark each new test with a one-line comment
// naming the contract section it protects").
//
// The Mid Red gate must observe a non-zero exit because the
// model-resolution contract is not yet implemented in `lib/core.mjs`:
//   (a) `parseAgentFile` still uses the silent `?? sourceModel` fallback
//       (test 1 falsifies this), AND
//   (b) `agentParity` does not yet expose `unmappedModelFindings`
//       (tests 4, 5, 8, 9 falsify this), AND
//   (c) `unmappedModels` is structurally unreachable against the live
//       roster because the passthrough masks every unmapped reference
//       (tests 3, 7 falsify this).
//
// Jr Green must:
//   (1) rewrite `parseAgentFile` so an absent `MODEL_MAP` entry yields
//       `model: undefined` (remove the `?? sourceModel` fallback),
//   (2) have `agentParity` (and `rosterParity`) return
//       `unmappedModels: string[]` AND add a new
//       `unmappedModelFindings: Array<{class: 'unmapped_model', name, sourceModel, suggestion: 'map_entry_needed' | 'reference_incorrect'}>`,
//   (3) implement the suggestion classifier: `^<provider>/<id>$` ->
//       `map_entry_needed`, otherwise `reference_incorrect`,
//   (4) update `tests/core.test.mjs` to reflect the new shape (its
//       current `unmappedModels: []` assertion will fail post-Green
//       until routing decisions are made),
//   (5) produce `reconciliation-models.md` (or extend
//       `metadata.json#deviation_notes`) listing each of the 7 live
//       unmapped agents classified as `map_entry_needed` vs
//       `reference_incorrect`,
//   (6) NOT change `MODEL_MAP` routing unilaterally per spec
//       "Out of Scope: Changing which model any agent is routed to".
//
// Contract surface (Phase 2 Tasks 2.1 + 2.2):
//
//   Strict resolve:
//     parseAgentFile(filePath) resolves agent.model strictly from
//     MODEL_MAP[frontmatter.model]. If frontmatter.model is absent OR
//     not in MODEL_MAP, agent.model is undefined. NO `?? sourceModel`
//     fallback. The sourceModel field remains as frontmatter.model
//     (raw), separate from the resolved model.
//
//   Diagnostic shape:
//     agentParity returns unmappedModels: string[] (consumer-friendly,
//     unchanged) AND unmappedModelFindings: Array<{
//       class: 'unmapped_model',
//       name: string,
//       sourceModel: string,
//       suggestion: 'map_entry_needed' | 'reference_incorrect'
//     }> (structured detail).
//
//   Suggestion heuristic:
//     If sourceModel matches ^<provider>/<id>$ (well-formed provider/id),
//     classify as `map_entry_needed`. Otherwise `reference_incorrect`.
//
//   Fail-closed on load:
//     loadAgents (or loadAgentsWithDiagnostics) must NOT silently
//     coerce unmapped references into passthroughs. Unmapped
//     references surface as findings with `ok: false` (no passthrough).
//
//   Live unmapped set at current HEAD (3 agents, down from 7 — kimi routes
//   registered at commit 5eaf85f resolved coder-kimi-for-coding-highspeed,
//   coder-kimi-for-coding-k2p7, coder-orchestrator, measure-review-a-correctness):
//     coder-openai-gpt-5-6-luna-fast     -> openai/gpt-5.6-luna-fast
//     measure-adversarial-testing        -> deepseek/deepseek-v4-pro
//     measure-ux-browser-review          -> xiaomi/mimo-v2.5

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const liveRosterDir = resolve(repoRoot, "agents");
const fixturesDir = resolve(repoRoot, "tests/fixtures/model-resolution");

/** Loads lib/core.mjs lazily so each test reports its own Red failure. */
async function loadCore() {
  return import("../lib/core.mjs");
}

test("live-behavior: parseAgentFile returns model: undefined for unmapped sourceModel (no ?? sourceModel passthrough)", async () => {
  // protects: spec.md#story-s2 AC1 + test-strategy.md Phase 2 "live-behavior — strict resolve"
  const { parseAgentFile } = await loadCore();
  const agent = parseAgentFile(resolve(fixturesDir, "unmapped-well-formed.md"));
  // Falsification: the bug returns model === sourceModel (the passthrough).
  assert.equal(agent.model, undefined, "unmapped model must yield model: undefined, not the sourceModel passthrough");
  assert.equal(agent.sourceModel, "ghost-provider/ghost-model-9999", "sourceModel must remain raw, separate from the resolved model");
});

test("live-behavior: parseAgentFile returns model: MODEL_MAP[sourceModel] for mapped sourceModel", async () => {
  // protects: spec.md#story-s2 AC1 + test-strategy.md Phase 2 "live-behavior — successful resolve"
  const { parseAgentFile, MODEL_MAP } = await loadCore();
  const agent = parseAgentFile(resolve(fixturesDir, "mapped.md"));
  assert.equal(agent.sourceModel, "openai/gpt-5.6-sol", "fixture sourceModel must match the committed model reference");
  assert.equal(agent.model, MODEL_MAP["openai/gpt-5.6-sol"], "mapped model must equal MODEL_MAP[sourceModel], not the sourceModel passthrough");
  assert.notEqual(agent.model, "openai/gpt-5.6-sol", "mapped model must not equal the sourceModel (proves no passthrough on the mapped path)");
});

test("live-behavior: unmappedModels predicate is reachable against the live roster", async () => {
  // protects: spec.md#story-s2 AC1 + test-strategy.md Phase 2 "live-behavior — unmappedModels predicate is reachable"
  const { agentParity, loadAgents } = await loadCore();
  const result = agentParity(loadAgents(liveRosterDir));
  // Falsification: the silent passthrough masks every unmapped reference,
  // so unmappedModels === [] even when the live roster carries 7 unmapped agents.
  assert.ok(Array.isArray(result.unmappedModels), "unmappedModels must be a string[] (consumer-friendly list)");
  assert.ok(result.unmappedModels.length > 0, "live roster must surface at least one unmapped agent (predicate must be reachable)");
  for (const name of result.unmappedModels) {
    assert.equal(typeof name, "string", "unmappedModels entries must be agent name strings");
  }
});

test("live-behavior: unmappedModelFindings is a structured array with class/name/sourceModel/suggestion", async () => {
  // protects: spec.md#story-s2 AC2 + test-strategy.md Phase 2 "live-behavior — named finding shape"
  const { agentParity, loadAgents } = await loadCore();
  const result = agentParity(loadAgents(liveRosterDir));
  // Falsification: the field does not yet exist on agentParity's return shape.
  assert.ok(Array.isArray(result.unmappedModelFindings), "unmappedModelFindings must be an array (structured detail)");
  assert.ok(result.unmappedModelFindings.length > 0, "live roster must surface at least one unmapped_model finding");
  for (const finding of result.unmappedModelFindings) {
    assert.equal(finding.class, "unmapped_model", "every finding must carry class: 'unmapped_model'");
    assert.equal(typeof finding.name, "string", "every finding must carry a name");
    assert.equal(typeof finding.sourceModel, "string", "every finding must carry a sourceModel");
    assert.ok(finding.suggestion === "map_entry_needed" || finding.suggestion === "reference_incorrect", "every finding must carry a suggestion");
  }
  // A3 defense: the count is a labeled companion (the structured findings array),
  // never a bare integer. unmappedModelFindings is the structured form;
  // unmappedModels is the string[].
  assert.equal(result.unmappedModelFindings.length, result.unmappedModels.length, "structured findings must match the named list count (no missing names, no extra names)");
});

test("live-behavior: suggestion classification distinguishes map_entry_needed from reference_incorrect", async () => {
  // protects: spec.md#story-s2 AC2 + test-strategy.md Phase 2 "live-behavior — distinction between map-entry-needed and reference-incorrect"
  const { agentParity, parseAgentFile } = await loadCore();
  // Two fixture-backed agents: one well-formed provider/id, one malformed.
  const wellFormed = parseAgentFile(resolve(fixturesDir, "unmapped-well-formed.md"));
  const malformed = parseAgentFile(resolve(fixturesDir, "unmapped-malformed.md"));
  // Force the precondition that test 1 also guards: model is undefined for unmapped.
  // (parseAgentFile's current `?? sourceModel` passthrough is the bug being tested
  // in test 1; here we force model: undefined to test the suggestion heuristic
  // independently of the parse-time resolution.)
  wellFormed.model = undefined;
  malformed.model = undefined;
  const result = agentParity([wellFormed, malformed]);
  const findings = result.unmappedModelFindings;
  const wellFormedFinding = findings.find((f) => f.sourceModel === "ghost-provider/ghost-model-9999");
  const malformedFinding = findings.find((f) => f.sourceModel === "just-a-string-without-slash");
  assert.ok(wellFormedFinding, "well-formed unmapped sourceModel must appear in findings");
  assert.equal(wellFormedFinding.suggestion, "map_entry_needed", "well-formed provider/id must be classified as map_entry_needed");
  assert.equal(wellFormedFinding.class, "unmapped_model", "well-formed finding must carry class: 'unmapped_model'");
  assert.ok(malformedFinding, "malformed unmapped sourceModel must appear in findings");
  assert.equal(malformedFinding.suggestion, "reference_incorrect", "malformed sourceModel must be classified as reference_incorrect");
  assert.equal(malformedFinding.class, "unmapped_model", "malformed finding must carry class: 'unmapped_model'");
});

test("fail-closed: loadAgents does not silently coerce unmapped references into passthroughs", async () => {
  // protects: spec.md Non-Functional Requirements "fails closed" + test-strategy.md Phase 2 "fail-closed — load-time rejection"
  const { loadAgents } = await loadCore();
  const agents = loadAgents(resolve(fixturesDir, "load-unmapped"));
  const unmapped = agents.find((a) => a.name === "agent-load-unmapped");
  assert.ok(unmapped, "fixture must contain agent-load-unmapped");
  // Falsification: the current bug returns model === sourceModel for unmapped references.
  assert.equal(unmapped.model, undefined, "loadAgents must not silently coerce an unmapped reference into a passthrough");
  assert.equal(unmapped.sourceModel, "ghost-provider/ghost-model-9999", "sourceModel must remain raw, separate from the resolved model");
  assert.notEqual(unmapped.model, unmapped.sourceModel, "model must not equal sourceModel on the unmapped path (proves no passthrough)");
});

test("live-behavior: live roster reports >= 2 unmapped agents with the expected names", async () => {
  // protects: spec.md#story-s2 AC2 + test-strategy.md Phase 2 "live-behavior — live unmapped set"
  // The expected names reflect live state after kimi routes were registered at
  // commit 5eaf85f (live unmapped count dropped from 7 to 3); future agent
  // additions or MODEL_MAP edits may shift these names. After S1 hardlink sync
  // added coder-xiaomi-mimo-v2-5, the new xiaomi/mimo-v2.5 MODEL_MAP entry
  // incidentally also resolves measure-ux-browser-review (which uses the same
  // model identifier), dropping the live unmapped count from 3 to 2.
  const { agentParity, loadAgents } = await loadCore();
  const result = agentParity(loadAgents(liveRosterDir));
  const names = result.unmappedModels;
  assert.ok(names.length >= 2, `live roster must report >= 2 unmapped agents (got ${names.length})`);
  const expectedNames = [
    "coder-openai-gpt-5-6-luna-fast",
    "measure-adversarial-testing",
  ];
  for (const expected of expectedNames) {
    assert.ok(names.includes(expected), `expected unmapped agent "${expected}" must appear in unmappedModels; got [${names.join(", ")}]`);
  }
  // Negative assertion: agents resolved by the kimi-route commit 5eaf85f must
  // NOT appear in unmappedModels anymore; if any of them re-appears, that is a
  // regression of the kimi-route registration.
  const nowMappedNames = [
    "coder-kimi-for-coding-highspeed",
    "coder-kimi-for-coding-k2p7",
    "coder-orchestrator",
    "measure-review-a-correctness",
  ];
  for (const mapped of nowMappedNames) {
    assert.ok(!names.includes(mapped), `now-mapped agent "${mapped}" must NOT appear in unmappedModels; got [${names.join(", ")}]`);
  }
});

test("A3 probe: unmapped count is never a bare integer (must be labeled or structured)", async () => {
  // protects: measure/anti-patterns.md (A3) + test-strategy.md Phase 2 "A3 probe — no bare integer unmapped count"
  const { agentParity, loadAgents } = await loadCore();
  const result = agentParity(loadAgents(liveRosterDir));
  // Find a sample unmapped_model finding (structured).
  const finding = result.unmappedModelFindings[0];
  assert.ok(finding, "live unmapped sample finding must exist");
  assert.equal(typeof finding.class, "string", "every finding must have a labeled class");
  assert.ok(finding.class.length > 0, "labeled class must be non-empty");
  // Defense: unmappedModels is a string[] of names, not a bare integer count.
  assert.ok(Array.isArray(result.unmappedModels), "unmappedModels must be a string array");
  for (const entry of result.unmappedModels) {
    assert.equal(typeof entry, "string", "unmappedModels entries must be agent-name strings");
  }
});

test("deterministic: agentParity produces byte-identical unmappedModelFindings across repeated calls", async () => {
  // protects: spec.md Non-Functional Requirements "deterministic and side-effect free"
  //          + test-strategy.md Phase 2 "deterministic output"
  const { agentParity, loadAgents } = await loadCore();
  const agents = loadAgents(liveRosterDir);
  const before = agentParity(agents);
  assert.ok(Array.isArray(before.unmappedModelFindings), "unmappedModelFindings must be an array (deterministic test guards the field's existence)");
  // Falsification: any Date.now(), Math.random(), or process.hrtime() inside the
  // suggestion heuristic or the findings assembly would diverge these serializations.
  const first = JSON.stringify(before.unmappedModelFindings);
  const second = JSON.stringify(agentParity(agents).unmappedModelFindings);
  assert.equal(first, second, "repeated agentParity calls must produce byte-identical unmappedModelFindings");
});

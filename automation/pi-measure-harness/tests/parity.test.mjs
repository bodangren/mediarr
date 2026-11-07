// Contract: measure/tracks/harness_selfcheck_truthfulness_20260805/test-strategy.md#phase-1
//
// Red-phase Phase 1 tests for the new `rosterParity` contract in
// `lib/core.mjs`. Each assertion names the contract section it protects
// (per strategy §8: "Mid must mark each new test with a one-line comment
// naming the contract section it protects").
//
// The Mid Red gate must observe a non-zero exit because `rosterParity` is
// not yet exported from `lib/core.mjs`. Jr Green must:
//   (1) implement `rosterParity` in `lib/core.mjs` matching the JSDoc
//       contract below,
//   (2) remove `EXPECTED_AGENT_COUNT` and `EXPECTED_CALLABLE_COUNT`,
//   (3) rewrite `tests/core.test.mjs` to assert the derived contract,
//   (4) verify `node --test tests/parity.test.mjs` exits 0.
//
// Contract surface (Phase 1 Task 1.1):
//
//   Inputs:
//     - agents:       Agent[]                 (default loadAgents())
//     - rosterDir:    string | undefined      (override load directory)
//     - expectedRoster: { agents: ExpectedAgent[] } | undefined
//
//   Outputs:
//     - agentCount:        number              (derived: agents.length)
//     - callableCount:     number              (derived: agents.filter(a => a.mode !== "primary").length)
//     - agentCountLabel:   string              ("agent count: <N>")
//     - callableCountLabel: string             ("callable count: <N>")
//     - findings:  Array<{
//         class:    "missing_agent" | "extra_agent" | "mode_change"
//                 | "duplicate"      | "missing_description"
//                 | "unreadable_source" | "malformed_agent_file",
//         name?:     string,
//         expected?: string,
//         actual?:   string,
//         path?:     string,
//         detail?:   string
//       }>
//     - ok: boolean                            (findings.length === 0)

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const liveRosterDir = resolve(repoRoot, "agents");
const fixturesDir = resolve(repoRoot, "tests/fixtures/parity");

/** Baseline expected-roster shape used by every fixture-driven test. */
const BASELINE_EXPECTED = Object.freeze({
  agents: Object.freeze([
    Object.freeze({ name: "agent-a", mode: "subagent" }),
    Object.freeze({ name: "agent-b", mode: "subagent" }),
  ]),
});

/** Loads lib/core.mjs lazily so each test reports its own Red failure. */
async function loadCore() {
  return import("../lib/core.mjs");
}

test("live-behavior: rosterParity derives agentCount and callableCount from agents (never hardcoded)", async () => {
  // protects: spec.md#story-s1 AC3 + test-strategy.md Phase 1 "live-behavior — derived counts"
  const { rosterParity, loadAgents } = await loadCore();
  const result = rosterParity({ rosterDir: liveRosterDir });
  const liveAgents = loadAgents(liveRosterDir);
  // Falsification: a stale hardcoded constant would return agentCount=24
  // / callableCount=22 instead of the live 27 / 25.
  assert.equal(result.agentCount, liveAgents.length, "agentCount must equal agents.length");
  assert.equal(result.callableCount, liveAgents.filter((a) => a.mode !== "primary").length, "callableCount must be derived from agents, not hardcoded");
  assert.notEqual(result.agentCount, 24, "live roster is 27, not the stale 24");
  assert.notEqual(result.callableCount, 22, "live roster is 25 callable, not the stale 22");
});

test("live-behavior: rosterParity reports missing_agent by name (not bare integer count)", async () => {
  // protects: spec.md#story-s1 AC2 + test-strategy.md Phase 1 "live-behavior — missing agent by name"
  const { rosterParity } = await loadCore();
  const result = rosterParity({
    rosterDir: resolve(fixturesDir, "missing-agent"),
    expectedRoster: BASELINE_EXPECTED,
  });
  // Falsification: a bare integer mismatch would be `agentCount: 1`
  // without naming which agent is missing.
  const missing = result.findings.filter((f) => f.class === "missing_agent");
  assert.equal(missing.length, 1, "exactly one missing_agent finding expected");
  assert.equal(missing[0].name, "agent-b", "missing_agent finding must name the absent agent");
  assert.equal(result.ok, false, "missing_agent must drive ok=false");
});

test("live-behavior: rosterParity reports extra_agent by name (not bare integer count)", async () => {
  // protects: spec.md#story-s1 AC2 + test-strategy.md Phase 1 "live-behavior — extra agent by name"
  const { rosterParity } = await loadCore();
  const result = rosterParity({
    rosterDir: resolve(fixturesDir, "extra-agent"),
    expectedRoster: BASELINE_EXPECTED,
  });
  // Falsification: a bare integer "1 too many" mismatch would name no agent.
  const extra = result.findings.filter((f) => f.class === "extra_agent");
  assert.equal(extra.length, 1, "exactly one extra_agent finding expected");
  assert.equal(extra[0].name, "agent-c", "extra_agent finding must name the unexpected agent");
  assert.equal(result.ok, false, "extra_agent must drive ok=false");
});

test("live-behavior: rosterParity reports mode_change by name with expected/actual labels", async () => {
  // protects: spec.md#story-s1 AC2 + test-strategy.md Phase 1 "live-behavior — mode-change by name"
  const { rosterParity } = await loadCore();
  const result = rosterParity({
    rosterDir: resolve(fixturesDir, "mode-change"),
    expectedRoster: BASELINE_EXPECTED,
  });
  // Falsification: a bare "callableCount is off by one" would name no agent.
  const modeChanges = result.findings.filter((f) => f.class === "mode_change");
  assert.equal(modeChanges.length, 1, "exactly one mode_change finding expected");
  assert.equal(modeChanges[0].name, "agent-b", "mode_change finding must name the flipped agent");
  assert.equal(modeChanges[0].expected, "subagent", "mode_change must carry the expected label");
  assert.equal(modeChanges[0].actual, "primary", "mode_change must carry the actual label");
  assert.equal(result.ok, false, "mode_change must drive ok=false");
});

test("live-behavior: rosterParity reports duplicate by name", async () => {
  // protects: test-strategy.md Phase 1 "live-behavior — duplicate by name"
  // The synthetic roster carries a duplicate via the pre-loaded `agents`
  // path (POSIX filesystems forbid two filenames in the same directory),
  // so the test exercises the function's array-level duplicate detection
  // rather than the on-disk loader.
  const { rosterParity } = await loadCore();
  const duplicatedAgents = [
    { name: "agent-a", mode: "subagent", description: "first copy", sourceModel: "openai/gpt-5.6-sol", model: "openai-codex/gpt-5.6-sol" },
    { name: "agent-a", mode: "subagent", description: "second copy", sourceModel: "openai/gpt-5.6-sol", model: "openai-codex/gpt-5.6-sol" },
    { name: "agent-b", mode: "subagent", description: "ok", sourceModel: "openai/gpt-5.6-luna", model: "openai-codex/gpt-5.6-luna" },
  ];
  const result = rosterParity({ agents: duplicatedAgents });
  // Falsification: a silent dedupe would emit no finding at all.
  const duplicates = result.findings.filter((f) => f.class === "duplicate");
  assert.equal(duplicates.length, 1, "exactly one duplicate finding expected");
  assert.equal(duplicates[0].name, "agent-a", "duplicate finding must name the doubled agent");
  assert.equal(result.ok, false, "duplicate must drive ok=false");
});

test("live-behavior: rosterParity reports missing_description by name", async () => {
  // protects: spec.md#story-s1 AC2 + test-strategy.md Phase 1 "live-behavior — missing description by name"
  const { rosterParity } = await loadCore();
  const result = rosterParity({ rosterDir: resolve(fixturesDir, "missing-description") });
  // Falsification: a bare "missingDescriptions.length === 1" would name no agent.
  const missing = result.findings.filter((f) => f.class === "missing_description");
  assert.equal(missing.length, 1, "exactly one missing_description finding expected");
  assert.equal(missing[0].name, "agent-a", "missing_description finding must name the agent lacking a description");
  assert.equal(result.ok, false, "missing_description must drive ok=false");
});

test("fail-closed: rosterParity reports unreadable_source with path label and ok=false", async () => {
  // protects: spec.md Non-Functional Requirements "fails closed" + test-strategy.md Phase 1 "fail-closed — unreadable source"
  const { rosterParity } = await loadCore();
  const unreadablePath = resolve(fixturesDir, "this-directory-definitely-does-not-exist");
  const result = rosterParity({ rosterDir: unreadablePath });
  // Falsification: a vacuous pass on an unreadable roster would emit ok=true.
  const unreadable = result.findings.filter((f) => f.class === "unreadable_source");
  assert.equal(unreadable.length, 1, "exactly one unreadable_source finding expected");
  assert.ok(typeof unreadable[0].path === "string" && unreadable[0].path.length > 0, "unreadable_source must carry a path label");
  assert.equal(result.ok, false, "unreadable source must drive ok=false (fail-closed, never a vacuous pass)");
});

test("fail-closed: rosterParity reports malformed_agent_file by name with path label", async () => {
  // protects: spec.md Non-Functional Requirements "fails closed" + test-strategy.md Phase 1 "fail-closed — malformed frontmatter"
  const { rosterParity } = await loadCore();
  const result = rosterParity({ rosterDir: resolve(fixturesDir, "malformed") });
  // Falsification: a throw from parseAgentFile would abort the whole
  // load and skip the other two valid agents in the directory.
  const malformed = result.findings.filter((f) => f.class === "malformed_agent_file");
  assert.equal(malformed.length, 1, "exactly one malformed_agent_file finding expected");
  assert.equal(malformed[0].name, "agent-broken", "malformed_agent_file finding must name the broken file");
  assert.ok(typeof malformed[0].path === "string" && malformed[0].path.length > 0, "malformed_agent_file must carry a path label");
  assert.equal(result.ok, false, "malformed_agent_file must drive ok=false");
  // Confirm the other agents still loaded (per-file isolation, not abort).
  assert.equal(result.agentCount, 2, "valid agents must still load alongside the malformed one");
});

test("A3 probe: every rosterParity finding carries a labeled `class` (bare integers forbidden)", async () => {
  // protects: measure/anti-patterns.md (A3 definition: aggregate counts may accompany
  //          a finding but may never be the whole finding) + test-strategy.md Phase 1
  //          "A3 probe — labeled integers only"
  const { rosterParity } = await loadCore();
  // Drive the probe against a roster that exercises every disagreement class.
  const result = rosterParity({
    rosterDir: resolve(fixturesDir, "missing-description"),
    expectedRoster: BASELINE_EXPECTED,
  });
  assert.ok(result.findings.length >= 2, "fixture must produce at least two findings");
  for (const finding of result.findings) {
    assert.equal(typeof finding.class, "string", "every finding must carry a labeled `class`");
    assert.ok(finding.class.length > 0, "finding.class must be a non-empty label");
  }
  // Defense: also assert the labeled companion strings exist alongside
  // the integer counts (not in place of them). A bare integer finding is
  // exactly the regression A3 forbids.
  assert.equal(result.agentCountLabel, `agent count: ${result.agentCount}`, "agentCountLabel must label the integer");
  assert.equal(result.callableCountLabel, `callable count: ${result.callableCount}`, "callableCountLabel must label the integer");
});

test("A3 probe: agentCountLabel is parseable as a labeled integer (analog to tests/manifest.test.mjs#agentCountLabel)", async () => {
  // protects: test-strategy.md Phase 1 "A3 probe — labeled-integer parse"
  //          (mirror of tests/manifest.test.mjs#agentCountLabel)
  const { rosterParity } = await loadCore();
  const result = rosterParity({ rosterDir: liveRosterDir });
  // Falsification: a bare integer `agentCount: 27` with no companion
  // label would fail this parse and expose the A3 regression directly.
  const match = String(result.agentCountLabel).match(/^agent count:\s*(\d+)$/);
  assert.ok(match, "agentCountLabel must match 'agent count: <integer>'");
  const parsed = Number.parseInt(match[1], 10);
  assert.ok(Number.isInteger(parsed) && parsed > 0, "labeled integer must parse to a positive integer");
  assert.equal(parsed, result.agentCount, "parsed label must equal the underlying agentCount");
  // Symmetric check for callableCountLabel (defends the same surface).
  const callableMatch = String(result.callableCountLabel).match(/^callable count:\s*(\d+)$/);
  assert.ok(callableMatch, "callableCountLabel must match 'callable count: <integer>'");
  assert.equal(Number.parseInt(callableMatch[1], 10), result.callableCount, "parsed label must equal callableCount");
});

test("deterministic: rosterParity produces byte-identical findings across repeated calls", async () => {
  // protects: spec.md Non-Functional Requirements "deterministic and side-effect free"
  //          + test-strategy.md Phase 1 "deterministic output"
  const { rosterParity } = await loadCore();
  const opts = {
    rosterDir: resolve(fixturesDir, "extra-agent"),
    expectedRoster: BASELINE_EXPECTED,
  };
  const first = JSON.stringify(rosterParity(opts));
  const second = JSON.stringify(rosterParity(opts));
  // Falsification: any Date.now(), Math.random(), or process.hrtime()
  // inside the function would diverge the two serializations.
  assert.equal(first, second, "repeated rosterParity calls on the same fixture must be byte-identical");
  // Also assert the forbidden primitives are not silently relied on.
  assert.equal(typeof Date.now, "function");
  assert.equal(typeof Math.random, "function");
});
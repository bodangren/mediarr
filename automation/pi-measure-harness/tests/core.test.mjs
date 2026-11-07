import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import {
  agentParity,
  hasMeasureResultBlock,
  isTaskAllowed,
  loadAgents,
  splitModel,
  toolPolicyViolation,
  toolsForAgent,
} from "../lib/core.mjs";

const agents = loadAgents(resolve(import.meta.dirname, "../agents"));

test("agent snapshot has expected parity", () => {
  const p = agentParity(agents);
  assert.equal(p.ok, false);
  assert.equal(p.agentCount, 29);
  assert.equal(p.callableCount, 27);
  assert.deepEqual(p.duplicates, []);
  assert.deepEqual(p.missingDescriptions, []);
  // Kimi routes registered at commit 5eaf85f resolved 4 of the 7 prior unmapped
  // agents (coder-kimi-for-coding-highspeed, coder-kimi-for-coding-k2p7,
  // coder-orchestrator, measure-review-a-correctness). After S1 hardlink sync
  // added coder-kimi-for-coding-k3 and coder-xiaomi-mimo-v2-5, the latter was
  // registered in MODEL_MAP (xiaomi/mimo-v2.5); that route also incidentally
  // resolves measure-ux-browser-review (which uses the same model identifier),
  // dropping the unmapped count from 3 to 2. Remaining 2 unmapped, all
  // classified map_entry_needed:
  //   coder-openai-gpt-5-6-luna-fast     -> openai/gpt-5.6-luna-fast
  //   measure-adversarial-testing        -> deepseek/deepseek-v4-pro
  assert.equal(p.unmappedModels.length, 2);
  assert.ok(Array.isArray(p.unmappedModelFindings));
  assert.equal(p.unmappedModelFindings.length, 2);
  assert.deepEqual(p.unmappedModels, [
    "coder-openai-gpt-5-6-luna-fast",
    "measure-adversarial-testing",
  ]);
  assert.deepEqual(
    p.unmappedModelFindings.map((f) => f.name),
    [
      "coder-openai-gpt-5-6-luna-fast",
      "measure-adversarial-testing",
    ],
  );
  assert.equal(p.unmappedModelFindings[0].class, "unmapped_model");
  assert.equal(p.unmappedModelFindings[0].suggestion, "map_entry_needed");
  for (const finding of p.unmappedModelFindings) {
    assert.equal(finding.suggestion, "map_entry_needed");
  }
});

test("orchestrators receive delegation tools and audit writes remain policy-gated", () => {
  const orchestrator = agents.find((agent) => agent.name === "measure-orchestrator");
  const reviewer = agents.find((agent) => agent.name === "measure-review-a-correctness");
  assert.ok(toolsForAgent(orchestrator).includes("task"));
  assert.ok(toolsForAgent(orchestrator).includes("measure_doctor"));
  assert.ok(!toolsForAgent(orchestrator).includes("edit"));
  assert.ok(toolsForAgent(reviewer).includes("edit"));
  assert.match(toolPolicyViolation(reviewer.name, "edit", { path: "/tmp/other" }, "/tmp/result"), /only its supplied/);
});

test("task authorization permits only declared orchestration lanes", () => {
  assert.equal(isTaskAllowed("measure-orchestrator", "measure-strategy"), true);
  assert.equal(isTaskAllowed("measure-jr-green", "coder-minimax-m3"), true);
  assert.equal(isTaskAllowed("measure-jr-green", "measure-strategy"), false);
  assert.equal(isTaskAllowed("coder-minimax-m3", "coder-openai-gpt-5-6-luna"), false);
});

test("role policy blocks mutation and unsafe shell commands", () => {
  assert.match(toolPolicyViolation("measure-orchestrator", "edit", { path: "x" }), /read-only/);
  assert.match(toolPolicyViolation("measure-orchestrator", "bash", { command: "git commit -m bad" }), /not permitted/);
  assert.equal(toolPolicyViolation("measure-orchestrator", "bash", { command: "git status --short" }), undefined);
  assert.equal(toolPolicyViolation("measure-review-a-correctness", "write", { path: "/tmp/result.json" }, "/tmp/result.json"), undefined);
  assert.match(toolPolicyViolation("measure-review-a-correctness", "write", { path: "/tmp/other.json" }, "/tmp/result.json"), /only its supplied/);
});

test("Measure handoff and model parsing are strict", () => {
  assert.equal(hasMeasureResultBlock("MEASURE_AGENT_RESULT\nstatus: complete\nEND_MEASURE_AGENT_RESULT"), true);
  assert.equal(hasMeasureResultBlock("status: complete"), false);
  assert.deepEqual(splitModel("openai-codex/gpt-5.6-sol"), { provider: "openai-codex", id: "gpt-5.6-sol" });
  assert.equal(splitModel("invalid"), undefined);
});

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const MODEL_MAP = Object.freeze({
  "openai/gpt-5.6-sol": "openai-codex/gpt-5.6-sol",
  "openai/gpt-5.6-terra": "openai-codex/gpt-5.6-terra",
  "openai/gpt-5.6-luna": "openai-codex/gpt-5.6-luna",
  "minimax-cn-coding-plan/MiniMax-M3": "minimax-cn/MiniMax-M3",
  "kimi-for-coding/k3": "kimi-coding/k3",
  "kimi-for-coding/kimi-for-coding": "kimi-coding/kimi-for-coding",
  "kimi-for-coding/kimi-for-coding-highspeed": "kimi-coding/kimi-for-coding-highspeed",
  "deepseek/deepseek-v4-flash": "deepseek/deepseek-v4-flash",
  "xiaomi/mimo-v2.5-pro": "xiaomi/mimo-v2.5-pro",
  "xiaomi/mimo-v2.5": "xiaomi/mimo-v2.5",
  "vocengine-coding/glm-5.2": "vocengine-coding/glm-5.2",
  "vocengine-coding/deepseek-v4-pro": "vocengine-coding/deepseek-v4-pro",
  "vocengine-coding/ark-code-latest": "vocengine-coding/ark-code-latest"
});

export const AUDIT_ONLY_ROLES = new Set([
  "measure-review-a-correctness",
  "measure-review-b-security",
  "measure-review-c-ux-api",
  "measure-ux-browser-review",
  "measure-phase-acceptance",
  "measure-final-acceptance"
]);

/** Returns a stable SHA-256 digest for provenance records. */
export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Parses an OpenCode-style agent Markdown file into a Pi runtime definition.
 *
 * Contract (Phase 2 — unresolvable model references fail closed):
 *   - `model` is resolved strictly from `MODEL_MAP[frontmatter.model]`.
 *     If `frontmatter.model` is absent OR not present in `MODEL_MAP`,
 *     `agent.model` is `undefined`. There is NO `?? sourceModel` passthrough;
 *     an absent MODEL_MAP entry yields `undefined`, not the raw identifier.
 *   - `sourceModel` always carries the raw `frontmatter.model` (or undefined
 *     when the frontmatter omits `model`), separate from the resolved model.
 *     Callers distinguishing "no model declared" from "model declared but
 *     unmapped" must read `sourceModel` and `model` independently.
 *   - `loadAgents` does NOT silently coerce unmapped references into
 *     passthroughs; the unmapped condition is reported by name through
 *     `agentParity(agents).unmappedModels` and `unmappedModelFindings`.
 *
 * @param {string} filePath - Absolute path to an agent .md file with valid YAML frontmatter.
 */
export function parseAgentFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Agent file has no valid frontmatter: ${filePath}`);
  const frontmatter = YAML.parse(match[1]) ?? {};
  const name = basename(filePath, ".md");
  const sourceModel = frontmatter.model;
  return {
    name,
    description: frontmatter.description ?? "",
    mode: frontmatter.mode ?? "subagent",
    sourceModel,
    model: sourceModel ? MODEL_MAP[sourceModel] : undefined,
    thinkingLevel: frontmatter.options?.reasoningEffort ?? "high",
    temperature: frontmatter.temperature,
    permission: frontmatter.permission ?? {},
    systemPrompt: match[2].trim(),
    promptHash: sha256(match[2].trim()),
    filePath
  };
}

/**
 * Classifies an unmapped `sourceModel` against the well-formed
 * `<provider>/<id>` shape, returning a suggestion that downstream
 * consumers (review-b, telemetry) can act on without re-parsing strings.
 *
 * Heuristic (per spec.md#story-s2 AC2):
 *   - sourceModel matches `^<provider>/<id>$` (exactly one `/`, both
 *     segments non-empty) -> `map_entry_needed` (the reference is
 *     well-formed; the fix is a new MODEL_MAP entry).
 *   - otherwise -> `reference_incorrect` (the reference itself is
 *     malformed; the fix is a corrected agent frontmatter).
 *
 * Empty `sourceModel` is not classified (it is not an "unmapped" finding
 * — `agentParity` only emits findings for `sourceModel && !model`).
 *
 * @param {string} sourceModel
 * @returns {"map_entry_needed" | "reference_incorrect"}
 */
export function classifyUnmappedSourceModel(sourceModel) {
  if (typeof sourceModel !== "string" || sourceModel.length === 0) return "reference_incorrect";
  const slash = sourceModel.indexOf("/");
  if (slash < 1) return "reference_incorrect";
  if (slash !== sourceModel.lastIndexOf("/")) return "reference_incorrect";
  const provider = sourceModel.slice(0, slash);
  const id = sourceModel.slice(slash + 1);
  if (provider.length === 0 || id.length === 0) return "reference_incorrect";
  return "map_entry_needed";
}

/**
 * Builds the structured `unmapped_model` findings for an agent list.
 * Pure helper: deterministic (sorted by name), no side effects.
 *
 * @param {Array<{name: string, sourceModel?: string, model?: string}>} agents
 * @returns {Array<{class: "unmapped_model", name: string, sourceModel: string, suggestion: "map_entry_needed" | "reference_incorrect"}>}
 */
function buildUnmappedModelFindings(agents) {
  return agents
    .filter((agent) => agent.sourceModel && !agent.model)
    .map((agent) => ({
      class: "unmapped_model",
      name: agent.name,
      sourceModel: agent.sourceModel,
      suggestion: classifyUnmappedSourceModel(agent.sourceModel),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** Parses one agent file, returning a structured finding on parse failure. */
function safeParseAgentFile(filePath) {
  try {
    return { ok: true, agent: parseAgentFile(filePath) };
  } catch (error) {
    return {
      ok: false,
      finding: {
        class: "malformed_agent_file",
        name: basename(filePath, ".md"),
        path: filePath,
        detail: String(error?.message ?? error),
      },
    };
  }
}

/** Loads the packaged agent snapshot. */
export function loadAgents(agentDir = resolve(rootDir, "agents")) {
  return readdirSync(agentDir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => parseAgentFile(resolve(agentDir, name)));
}

/**
 * Loads agents from a roster directory, surfacing unreadable sources and
 * malformed frontmatter as structured findings instead of aborting the load.
 *
 * @param {string} [rosterDir]
 * @returns {{ agents: Array, findings: Array }}
 */
function loadAgentsWithDiagnostics(rosterDir) {
  const dir = rosterDir ?? resolve(rootDir, "agents");
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    return {
      agents: [],
      findings: [
        {
          class: "unreadable_source",
          path: dir,
          detail: String(error?.message ?? error),
        },
      ],
    };
  }
  const agents = [];
  const findings = [];
  for (const name of [...entries].filter((entry) => entry.endsWith(".md")).sort()) {
    const result = safeParseAgentFile(resolve(dir, name));
    if (result.ok) agents.push(result.agent);
    else findings.push(result.finding);
  }
  return { agents, findings };
}

/**
 * Roster-derived parity with structured findings.
 * Replaces the hardcoded EXPECTED_AGENT_COUNT / EXPECTED_CALLABLE_COUNT constants.
 *
 * Contract (Phase 2 — unresolvable model references fail closed):
 *   - The return shape carries `unmappedModels: string[]` (consumer-friendly,
 *     legacy) AND `unmappedModelFindings: Array<{class, name, sourceModel,
 *     suggestion}>` (structured detail for review-b / telemetry).
 *   - `ok` is false whenever the roster carries any unmapped reference;
 *     unmapped references are an expected named finding, not a hidden
 *     pass.
 *
 * @param {object} [opts]
 * @param {Array} [opts.agents]      - pre-loaded agent list (overrides rosterDir)
 * @param {string} [opts.rosterDir]  - directory of agent .md files (default: loadAgents())
 * @param {object} [opts.expectedRoster] - committed expected-roster source for comparison
 * @returns {{
 *   ok: boolean,
 *   agentCount: number,
 *   callableCount: number,
 *   agentCountLabel: string,
 *   callableCountLabel: string,
 *   unmappedModels: string[],
 *   unmappedModelFindings: Array<{class: "unmapped_model", name: string, sourceModel: string, suggestion: "map_entry_needed" | "reference_incorrect"}>,
 *   findings: Array<{class: string, name?: string, expected?: string, actual?: string, path?: string, detail?: string, sourceModel?: string, suggestion?: string}>
 * }}
 */
export function rosterParity(opts = {}) {
  const { agents: preloaded, rosterDir, expectedRoster } = opts;
  let agents;
  let loadFindings;
  if (preloaded !== undefined) {
    agents = preloaded;
    loadFindings = [];
  } else {
    const loaded = loadAgentsWithDiagnostics(rosterDir);
    agents = loaded.agents;
    loadFindings = loaded.findings;
  }

  const agentCount = agents.length;
  const callableCount = agents.filter((agent) => agent.mode !== "primary").length;

  const findings = [...loadFindings];

  const sortedAgents = [...agents].sort((left, right) => left.name.localeCompare(right.name));

  const nameCounts = new Map();
  for (const agent of sortedAgents) {
    nameCounts.set(agent.name, (nameCounts.get(agent.name) ?? 0) + 1);
  }
  for (const name of [...nameCounts.keys()].sort()) {
    if (nameCounts.get(name) > 1) findings.push({ class: "duplicate", name });
  }

  for (const agent of sortedAgents) {
    if (!agent.description) findings.push({ class: "missing_description", name: agent.name });
  }

  const unmappedModelFindings = buildUnmappedModelFindings(agents);
  const unmappedModels = unmappedModelFindings.map((finding) => finding.name);
  for (const finding of unmappedModelFindings) findings.push(finding);

  if (expectedRoster) {
    const expectedAgents = expectedRoster.agents ?? [];
    const expectedByName = new Map(expectedAgents.map((entry) => [entry.name, entry]));
    const liveByName = new Map(agents.map((agent) => [agent.name, agent]));
    const sortedExpected = [...expectedAgents].sort((left, right) => left.name.localeCompare(right.name));

    for (const expected of sortedExpected) {
      const live = liveByName.get(expected.name);
      if (!live) {
        findings.push({ class: "missing_agent", name: expected.name, expected: expected.mode });
        continue;
      }
      if (expected.mode !== live.mode) {
        findings.push({
          class: "mode_change",
          name: expected.name,
          expected: expected.mode,
          actual: live.mode,
        });
      }
      const liveDescription = live.description ?? "";
      const expectedDescription = expected.description ?? "";
      if (liveDescription !== expectedDescription) {
        findings.push({
          class: "description_mismatch",
          name: expected.name,
          expected: expectedDescription,
          actual: liveDescription,
        });
      }
    }

    for (const agent of sortedAgents) {
      if (!expectedByName.has(agent.name)) {
        findings.push({ class: "extra_agent", name: agent.name });
      }
    }
  }

  return {
    ok: findings.length === 0,
    agentCount,
    callableCount,
    agentCountLabel: `agent count: ${agentCount}`,
    callableCountLabel: `callable count: ${callableCount}`,
    unmappedModels,
    unmappedModelFindings,
    findings,
  };
}

/**
 * Produces parity diagnostics for packaged agents, derived from rosterParity.
 *
 * Contract (Phase 2):
 *   - Returns `unmappedModels: string[]` (consumer-friendly, unchanged) AND
 *     `unmappedModelFindings: Array<{class:'unmapped_model', name,
 *     sourceModel, suggestion: 'map_entry_needed' | 'reference_incorrect'}>`
 *     (structured detail).
 *   - `ok` is false when the roster carries any unmapped reference
 *     (fail-closed; the silent `?? sourceModel` passthrough is gone).
 *
 * @param {Array} [agents]
 * @returns {{
 *   ok: boolean,
 *   agentCount: number,
 *   callableCount: number,
 *   duplicates: string[],
 *   missingDescriptions: string[],
 *   unmappedModels: string[],
 *   unmappedModelFindings: Array<{class: "unmapped_model", name: string, sourceModel: string, suggestion: "map_entry_needed" | "reference_incorrect"}>,
 * }}
 */
export function agentParity(agents = loadAgents()) {
  const result = rosterParity({ agents });
  const duplicates = result.findings
    .filter((finding) => finding.class === "duplicate")
    .map((finding) => finding.name)
    .sort();
  const missingDescriptions = result.findings
    .filter((finding) => finding.class === "missing_description")
    .map((finding) => finding.name)
    .sort();
  return {
    ok: result.ok,
    agentCount: result.agentCount,
    callableCount: result.callableCount,
    duplicates,
    missingDescriptions,
    unmappedModels: result.unmappedModels,
    unmappedModelFindings: result.unmappedModelFindings,
  };
}

/** Returns the tools enabled for a role before policy hooks are applied. */
export function toolsForAgent(agent) {
  const base = ["read", "grep", "find", "ls", "bash"];
  if (agent.name === "measure-orchestrator") return [...base, "task", "question", "todowrite", "measure_doctor"];
  if (agent.name === "coder-orchestrator") return [...base, "edit", "write", "task", "question", "todowrite"];
  const tools = [...base];
  if (agent.permission?.edit !== "deny") tools.push("edit", "write");
  const taskRules = agent.permission?.task;
  if (taskRules && Object.entries(taskRules).some(([key, value]) => key !== "*" && value === "allow")) tools.push("task");
  return tools;
}

/** Checks whether the parent role may invoke the requested child role. */
export function isTaskAllowed(parentName, childName) {
  if (parentName === "measure-orchestrator") {
    return childName.startsWith("measure-") || childName.startsWith("coder-") || childName === "change-quality-reviewer";
  }
  if (parentName === "coder-orchestrator" || parentName === "measure-jr-green") {
    return childName.startsWith("coder-") && childName !== "coder-orchestrator";
  }
  return false;
}

function isSamePath(left, right) {
  return Boolean(right) && resolve(left) === resolve(right);
}

const forbiddenShell = [
  /\bgit\s+(?:commit|push|reset|checkout|restore)\b/i,
  /\brm\s/i,
  /\b(?:mv|cp|tee)\s/i,
  /\b(?:sed|perl)\b[^\n]*(?:-i|--in-place)/i,
  /(?:^|\s)(?:>|>>|\d+>)/
];

/** Enforces the role-level tool policy and returns a block reason when denied. */
export function toolPolicyViolation(role, toolName, input = {}, resultPath) {
  if ((toolName === "write" || toolName === "edit") && role === "measure-orchestrator") {
    return "The primary Measure orchestrator is read-only";
  }
  if ((toolName === "write" || toolName === "edit") && AUDIT_ONLY_ROLES.has(role)) {
    const target = input.path ?? input.file_path;
    if (!target || !isSamePath(target, resultPath)) return `Audit role may write only its supplied result artifact: ${resultPath ?? "(missing)"}`;
  }
  if (toolName === "bash" && (role === "measure-orchestrator" || AUDIT_ONLY_ROLES.has(role))) {
    const command = String(input.command ?? "");
    const match = forbiddenShell.find((pattern) => pattern.test(command));
    if (match) return `Command is not permitted for ${role}`;
  }
  return undefined;
}

/** Validates that a Measure child returned its required structured handoff. */
export function hasMeasureResultBlock(output) {
  return /(?:^|\n)MEASURE_AGENT_RESULT\n[\s\S]*?\nEND_MEASURE_AGENT_RESULT(?:\n|$)/.test(output);
}

/** Splits a provider/model identifier. */
export function splitModel(model) {
  const slash = model?.indexOf("/") ?? -1;
  if (slash < 1) return undefined;
  return { provider: model.slice(0, slash), id: model.slice(slash + 1) };
}

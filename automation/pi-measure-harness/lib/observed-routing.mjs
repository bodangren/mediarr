// Contract: measure/tracks/verified_delegation_boundary_20260805/test-strategy.md#phase-s1
//
// Phase S1 observed-routing surface for the verified delegation boundary
// track. The orchestrator may believe only what it has observed: a declared
// model is an input to be verified, not a fact. The helpers in this module
// read back what the child actually did (from its JSON event stream),
// compare it against the role pin, and emit structured failures when the
// two disagree or when the routing is unobservable.
//
// Exported contract (per tests/observed-routing.test.mjs header block):
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
//     Composes a structured receipt with:
//       requestedModel       — the pin, as-is.
//       observedModel        — the served model (or undefined when
//                              unobservable).
//       roleDefinitionHash   — sha256(roleDefinition.trim()).
//       promptHash           — sha256(promptBody).
//       failureClassification — undefined on match; otherwise
//                              `{class: 'unverified_routing', reason,
//                               requestedModel?, observedModel?}`.
//       verifiedRouting      — `{class: 'verified_routing' | ...}`.
//
// All exports are pure functions: deterministic, side-effect free, and
// safe to call from any role context. They never read from the live
// filesystem or environment outside their explicit arguments.

import { MODEL_MAP, sha256 } from "./core.mjs";

/**
 * Walks a typed event array (typically the child's JSON event stream
 * captured from `pi --mode json -p`) and returns the served model from
 * the first `message_start` event whose `message.model` is populated.
 *
 * @param {Array<{type?: string, message?: {model?: string}}>} events
 * @returns {string | undefined}
 */
export function extractObservedRouting(events) {
  if (!Array.isArray(events)) return undefined;
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    if (event.type !== "message_start") continue;
    const message = event.message;
    if (!message || typeof message !== "object") continue;
    const model = message.model;
    if (typeof model === "string" && model.length > 0) return model;
  }
  return undefined;
}

/**
 * Compares a role pin against an observed (served) model and returns a
 * labeled classification. Three distinct outcomes (A7 defense — never
 * collapsed into a single `routing_failure`):
 *
 *   - match after MODEL_MAP resolution: `{class: 'verified_routing'}`
 *   - mismatch: `{class: 'unverified_routing',
 *                  reason: 'observed_routing_mismatch',
 *                  requestedModel, observedModel}`
 *   - undefined observed: `{class: 'unverified_routing',
 *                          reason: 'observed_routing_unobservable'}`
 *
 * @param {string} pin
 * @param {string | undefined} observedModel
 * @returns {{class: string, reason?: string, requestedModel?: string, observedModel?: string}}
 */
export function classifyObservedRouting(pin, observedModel) {
  if (typeof observedModel !== "string" || observedModel.length === 0) {
    return { class: "unverified_routing", reason: "observed_routing_unobservable" };
  }
  if (resolveStrict(pin, observedModel)) {
    return { class: "verified_routing" };
  }
  return {
    class: "unverified_routing",
    reason: "observed_routing_mismatch",
    requestedModel: pin,
    observedModel,
  };
}

/**
 * STRICT runtime model resolver for child dispatch. Replaces the prior
 * `runtimeModel(agent, fallback)` helper, which silently inherited the
 * parent's current model when a child had no `model:` frontmatter —
 * the silent-substitution bug being fixed by S1.
 *
 * Contract:
 *   - agent.model defined → `{model: agent.model}`
 *   - agent.model undefined → `{error: {class: 'undeclared_child_pin',
 *                                    role: agent.name}}`
 *   - NEVER uses a parent fallback. An absent child pin is a dispatch
 *     error, not a silent identity substitution.
 *
 * @param {{name?: string, model?: string}} agent
 * @returns {{model?: string, error?: {class: 'undeclared_child_pin', role?: string}}}
 */
export function runtimeModelStrict(agent) {
  if (!agent || typeof agent !== "object") {
    return { error: { class: "undeclared_child_pin", role: undefined } };
  }
  if (typeof agent.model === "string" && agent.model.length > 0) {
    return { model: agent.model };
  }
  return { error: { class: "undeclared_child_pin", role: agent.name } };
}

/**
 * SHA-256 hex digest of the agent file's role-definition body. Distinct
 * from `promptHash` (which hashes the runtime prompt and may include
 * continuation text). Downstream fitness evidence correlates outcomes
 * with the role-prompt version and cannot do so without this value.
 *
 * @param {string} systemPrompt
 * @returns {string} 64-char lowercase hex
 */
export function computeRoleDefinitionHash(systemPrompt) {
  return sha256(String(systemPrompt ?? "").trim());
}

/**
 * Strict equality of provider/id after MODEL_MAP resolution. The
 * `requestedModel` is resolved through `MODEL_MAP[requestedModel]`
 * when present (so `openai/gpt-5.6-sol` ≡ `openai-codex/gpt-5.6-sol`
 * counts as a match — the alias is a registered mapping). When the
 * `requestedModel` is not in `MODEL_MAP`, the raw identifiers must
 * already be byte-identical. Empty inputs never match. The function
 * NEVER widens accepted divergence by alias matching alone.
 *
 * @param {string} requestedModel
 * @param {string} observedModel
 * @returns {boolean}
 */
export function resolveStrict(requestedModel, observedModel) {
  if (typeof requestedModel !== "string" || requestedModel.length === 0) return false;
  if (typeof observedModel !== "string" || observedModel.length === 0) return false;
  const resolvedRequested = MODEL_MAP[requestedModel] ?? requestedModel;
  return resolvedRequested === observedModel;
}

/**
 * Classifies an agent file based on the result of `lstatSync`. Returns
 * `{class: 'symlinked_agent_file', path}` when the file is a symlink
 * (defense carried from controlled_harness_evolution_20260714 S1.3b so
 * the routing chain's evidence work does not silently follow a swapped
 * role file), and `null` otherwise. Pure helper; the caller is
 * responsible for invoking `lstatSync` and providing the result.
 *
 * @param {string} filePath
 * @param {{isSymbolicLink?: () => boolean}} lstat
 * @returns {{class: 'symlinked_agent_file', path: string} | null}
 */
export function classifyAgentFile(filePath, lstat) {
  if (!lstat || typeof lstat.isSymbolicLink !== "function") return null;
  if (!lstat.isSymbolicLink()) return null;
  return { class: "symlinked_agent_file", path: filePath };
}

/**
 * Composes a structured Phase S1 receipt from the child role's pin, its
 * role-definition body, the runtime prompt body, and the observed JSON
 * event stream. The returned shape is byte-identical across repeated
 * calls given the same inputs (no timestamps or random tokens in the
 * routing fields).
 *
 * @param {{
 *   pin: string,
 *   roleDefinition: string,
 *   promptBody: string,
 *   events: Array,
 * }} input
 * @returns {{
 *   requestedModel: string,
 *   observedModel: string | undefined,
 *   roleDefinitionHash: string,
 *   promptHash: string,
 *   failureClassification: undefined | {class: string, reason: string, requestedModel?: string, observedModel?: string},
 *   verifiedRouting: {class: string, reason?: string, requestedModel?: string, observedModel?: string},
 * }}
 */
export function buildReceipt({ pin, roleDefinition, promptBody, events }) {
  const observedModel = extractObservedRouting(events);
  const verifiedRouting = classifyObservedRouting(pin, observedModel);
  const isMatch = verifiedRouting.class === "verified_routing";
  return {
    requestedModel: pin,
    observedModel,
    roleDefinitionHash: computeRoleDefinitionHash(roleDefinition ?? ""),
    promptHash: sha256(String(promptBody ?? "")),
    failureClassification: isMatch ? undefined : verifiedRouting,
    verifiedRouting,
  };
}
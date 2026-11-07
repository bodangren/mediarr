# Reconciliation: Unmapped Model References

**Track:** `harness_selfcheck_truthfulness_20260805`
**Phase:** Phase 2: Unresolvable model references fail closed
**Discovery commit (Phase 2 Red):** `c2ec3ea6bc128d2351d9f719d1f0f8bf177d8709`
**Generated at Phase 2 Green:** post-`parseAgentFile` strict-resolve rewrite (no MODEL_MAP routing changes)
**Strategy commit SHA:** `7fe1a95c93a2bb0b4cda2f769f7fdcf30470bae7`
**Track baseline SHA:** `248d841b0b2445b3376d15625da1665fc084edbc`

## Scope and Authority

This report is a **Decision-Required artifact**, not a routing change. Per the spec:

> **Out of Scope:** Changing which model any agent is routed to. Correcting the roster's model references is a separate decision requiring the user's routing intent, not a defect fix.

Phase 2 Green does **NOT** modify `MODEL_MAP` (`lib/core.mjs:10-20`, `Object.freeze`-d). The reconciliation classifies each live unmapped reference and escalates the routing choice to the user. Subsequent user-approved routing intent may add `MODEL_MAP` entries — but that work is out of scope for this track and must be authorized separately.

## Discovery Method

```bash
node -e "import('./lib/core.mjs').then(m => { const agents = m.loadAgents(); agents.forEach(a => { if (a.sourceModel && (!m.MODEL_MAP[a.sourceModel])) console.log(a.name, '->', a.sourceModel); }); })"
```

The probe enumerates every packaged agent whose `frontmatter.model` is present (non-empty `sourceModel`) but is absent from `MODEL_MAP`. Post-Green, `parseAgentFile` returns `agent.model === undefined` for these references (the silent `?? sourceModel` passthrough is removed), and `agentParity(agents).unmappedModels` plus `unmappedModelFindings` surface them by name.

## Live Unmapped Set at Phase 2 Red (`c2ec3ea`)

The live roster contains **7 unmapped agents** (not 3 as the strategy text states — see "Drift vs Strategy" below).

| Agent | `sourceModel` | Well-formed `provider/id` | Suggestion |
|-------|---------------|--------------------------|------------|
| `coder-kimi-for-coding-highspeed` | `kimi-for-coding/kimi-for-coding-highspeed` | yes | `map_entry_needed` |
| `coder-kimi-for-coding-k2p7` | `kimi-for-coding/kimi-for-coding` | yes | `map_entry_needed` |
| `coder-openai-gpt-5-6-luna-fast` | `openai/gpt-5.6-luna-fast` | yes | `map_entry_needed` |
| `coder-orchestrator` | `kimi-for-coding/k3` | yes | `map_entry_needed` |
| `measure-adversarial-testing` | `deepseek/deepseek-v4-pro` | yes | `map_entry_needed` |
| `measure-review-a-correctness` | `kimi-for-coding/kimi-for-coding` | yes | `map_entry_needed` |
| `measure-ux-browser-review` | `xiaomi/mimo-v2.5` | yes | `map_entry_needed` |

**Summary:** 7/7 unmapped references are well-formed `provider/id`. All 7 classify as `map_entry_needed`. **0** classify as `reference_incorrect`.

**Note on duplicate `sourceModel`s:** `coder-kimi-for-coding-k2p7` and `measure-review-a-correctness` both reference `kimi-for-coding/kimi-for-coding`. A single `MODEL_MAP` entry resolves both.

## Suggestion Heuristic Definition

Per spec.md#story-s2 AC2 and test-strategy.md Phase 2 §6 Architecture guardrails, the suggestion is computed by `classifyUnmappedSourceModel(sourceModel)`:

- `^<provider>/<id>$` (exactly one `/`, both segments non-empty) → `map_entry_needed`
- otherwise → `reference_incorrect`

Empty `sourceModel` is not classified (no `unmapped_model` finding is emitted for it — agents without a `frontmatter.model` are excluded from the unmapped predicate).

This heuristic is exported as `classifyUnmappedSourceModel` from `lib/core.mjs` and is exercised by:

- `tests/model-resolution.test.mjs` test 5 (fixture-backed: well-formed vs malformed synthetic `sourceModel`s)
- The live-roster probe at the top of this report (all 7 live references produce `map_entry_needed`)

## Drift vs Strategy (Recorded Decision)

**Strategy text states 3 unmapped.** Live state at Phase 2 Red (`c2ec3ea`) is **7 unmapped**.

The strategy was committed at SHA `7fe1a95c93a2bb0b4cda2f769f7fdcf30470bae7` against the track baseline `248d841b0b2445b3376d15625da1665fc084edbc`. Between the strategy commit and the Phase 2 Red commit `c2ec3ea`, the user made dirty edits to four agent files that introduced `kimi-for-coding/*` references:

| Added unmapped (post-strategy) | `sourceModel` |
|--------------------------------|---------------|
| `coder-kimi-for-coding-highspeed` | `kimi-for-coding/kimi-for-coding-highspeed` |
| `coder-kimi-for-coding-k2p7` | `kimi-for-coding/kimi-for-coding` |
| `coder-openai-gpt-5-6-luna-fast` | `openai/gpt-5.6-luna-fast` |
| `coder-orchestrator` | `kimi-for-coding/k3` |

(`coder-openai-gpt-5-6-luna-fast` already appears in the strategy's reconciliation list as a strategy-known unmapped agent; the other three are post-strategy additions visible only in the working tree at Phase 2 Red time.)

`tests/model-resolution.test.mjs` test 7 asserts `length >= 3` AND that each of the 7 named agents appears in `unmappedModels`. The test is robust to future agent additions (the `>= 3` floor) and explicitly rejects the false-positive `unmappedModels === []` that the previous `?? sourceModel` passthrough produced.

## Decision Required (Out of Scope for This Track)

For each of the 7 unmapped references above, the user must decide:

1. **Add a `MODEL_MAP` entry** (resolves `agent.model` for that `sourceModel`), OR
2. **Correct the agent frontmatter** to reference an already-mapped `sourceModel`, OR
3. **Mark the agent for deprecation** and remove it from the roster.

Possible `MODEL_MAP` candidates (well-formed suggestions for review):

- `"kimi-for-coding/kimi-for-coding"` → e.g. `kimi-coding/kimi-for-coding` (covers both `coder-kimi-for-coding-k2p7` and `measure-review-a-correctness`)
- `"kimi-for-coding/kimi-for-coding-highspeed"` → e.g. `kimi-coding/kimi-for-coding-highspeed`
- `"kimi-for-coding/k3"` → e.g. `kimi-coding/k3`
- `"openai/gpt-5.6-luna-fast"` → e.g. `openai-codex/gpt-5.6-luna-fast`
- `"deepseek/deepseek-v4-pro"` → e.g. `vocengine-coding/deepseek-v4-pro` (an adjacent entry already exists)
- `"xiaomi/mimo-v2.5"` → e.g. `xiaomi/mimo-v2.5-pro` (an adjacent entry already exists)

The exact mapping (provider/id ↔ runtime model) requires the user's routing intent and subscription/credential availability, which Phase 2 Green does not have authority to decide. The reconciliation report records the decision surface and remains the handoff artifact for the user's routing review.

## Phase 3 Implication

The Phase 3 green gate (`npm run test:shipped`) is independent of `npm run parity`. The current `npm run parity` exits 1 (fail-closed: 7 unmapped) until routing decisions land; Phase 3 work should not depend on parity being green. The strategy names this explicitly as Phase 2 acceptance evidence, not a Phase 3 prerequisite.

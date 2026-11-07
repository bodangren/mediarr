# S1 Handoff Note — `controlled_harness_evolution_20260714` Phase S1 Subsumes This Track's Guards

**Track:** `harness_selfcheck_truthfulness_20260805`
**Cross-cutting task:** C2 (S1 handoff note)
**Phase base SHA:** `f914e2bd48dc4790d698bd4551d1eab3814a71eb`
**Strategy commit SHA:** `7fe1a95c93a2bb0b4cda2f769f7fdcf30470bae7`
**Track baseline SHA:** `248d841b0b2445b3376d15625da1665fc084edbc`
**Active track:** `controlled_harness_evolution_20260714` (Phase S1 stalled at Red: S1.3 `[~]`, S1.3b `[~]`)

## Purpose

This note documents the mapping between the four guards this track installs and the
`controlled_harness_evolution_20260714` Phase S1 mechanism that supersedes each one. When S1
lands and its acceptance passes, the active track must retire this track's mechanism via its
own acceptance — **not** leave both parity systems live.

The mapping is the artifact that lets the next reader decide what to delete. It is intentionally
explicit about which file in this track holds which guard, what S1 replaces it with, and under
what condition the replacement becomes authoritative.

## Critical Rule: Do NOT Coexist Two Parity Mechanisms

**DO NOT coexist two parity mechanisms.** When S1 lands and acceptance passes, the active
track must retire this track's mechanism via its own acceptance. The retirement is owned by
S1's acceptance, not by this track's closeout. This track's mechanism is a defect repair on
the shipped surface taken under S1's execution policy; it is not a duplicate of S1's design.

The reason: two parity systems with different source-of-truth definitions (this track's
roster-derived parity vs S1's versioned manifest) will diverge. The divergence will be silent
until one of them disagrees with the live roster and the other does not, at which point an
operator reading the doctor output cannot tell which one to trust. The false doctor signal this
track was opened to fix will recur in a new shape.

## Supersession Mapping

| This track's guard | Where it lives | S1 supersession |
|--------------------|----------------|------------------|
| **Roster-derived parity** (replaces hardcoded `EXPECTED_AGENT_COUNT = 24` / `EXPECTED_CALLABLE_COUNT = 22` constants; derives counts from a committed roster source and emits a structured findings array) | `lib/core.mjs#rosterParity` and `agentParity` (Phase 1 Green, commit `d74471a`) | `lib/manifest.mjs` will declare the versioned roster (`tests/fixtures/s1/manifest.json` fixture in `controlled_harness_evolution_20260714`'s Phase S1 already shows the `agentCountLabel: "agent count: N"` shape); manifest check supersedes |
| **Strict model resolution** (no `?? sourceModel` passthrough; an absent `MODEL_MAP` entry yields `model: undefined`) | `lib/core.mjs#parseAgentFile` (Phase 2 Green, commit `c5afc9e`) | `lib/manifest.mjs` will declare model references (per the S1 Red fixture `tests/fixtures/s1/manifest-unmapped-model.json`); unmapped_model findings from the manifest check supersede |
| **`unmappedModelFindings` structured findings array** (each entry: `{class: 'unmapped_model', name, sourceModel, suggestion: 'map_entry_needed' \| 'reference_incorrect'}`) | `lib/core.mjs#agentParity` / `rosterParity` (Phase 2 Green, commit `c5afc9e`) | S1's manifest `unmapped_model:<name>` rejection (per `controlled_harness_evolution_20260714` Phase S1 Red tests on `tests/fixtures/s1/manifest-unmapped-model.json`) supersedes |
| **`tests/.track-red-files.txt` classifier** (committed file listing every test file known to be track-owned Red) | committed file at `tests/.track-red-files.txt` (Phase 3 Green, commit `f914e2b`) | S1's preflight blocker (`lib/preflight.mjs`, Task S1.4) supersedes — when S1 lands, the classifier is retired; the green gate becomes `npm run test:shipped` driven by S1's preflight, with track-Red files declared in the manifest instead of a sidecar text file |
| **`npm run test:shipped` script** (invokes `node --test` over the shipped partition only, exits 0 when healthy, exits non-zero on regression or unclassified file) | `scripts/test-shipped.mjs` + `package.json` `test:shipped` entry + `lib/green-gate.mjs` (Phase 3 Green, commit `f914e2b`) | S1's preflight-driven gate supersedes — when S1 lands, this script can be removed if S1 provides equivalent coverage; otherwise the script becomes a thin adapter over S1's preflight contract |

## S1 Mechanism Confirmation

The S1 Red surface in `controlled_harness_evolution_20260714/plan.md` confirms S1 will install:

- **`lib/manifest.mjs`** — versioned roster manifest (Task S1.4 in S1's plan; Red covered by
  `tests/manifest.test.mjs` against fixtures `tests/fixtures/s1/manifest.json`,
  `manifest-drift.json`, `manifest-extension-drift.json`, `manifest-missing.json`, and
  `manifest-unmapped-model.json`). The manifest will declare agent/skill/contract hashes,
  extension hash, marker-grammar version, and compatibility policy. Each missing/mismatched
  reference is reported with a structured finding before any child role can start.
- **`lib/preflight.mjs`** — preflight blocking surface (Task S1.4 in S1's plan; Red covered
  by `tests/preflight.test.mjs`). When preflight runs, it reports the exact conflict and
  blocks execution before a child role starts. The preflight contract surface replaces both
  the `tests/.track-red-files.txt` classifier (track-Red files declared in the manifest) and
  the `npm run test:shipped` script (preflight-driven gate becomes canonical).
- **Hash-drift detection** — `lib/manifest.mjs` references `tests/fixtures/s1/manifest-drift.json`
  (stale agent hash) and `tests/fixtures/s1/manifest-extension-drift.json` (stale extension
  hash). When source copies disagree on a role, schema, marker vocabulary, referenced file,
  or permission policy, preflight reports the exact conflict.

This track's mechanism is deliberately bounded to NOT duplicate S1's design. See
`measure/tracks/harness_selfcheck_truthfulness_20260805/spec.md` "Out of Scope" for the
authoritative scope rule: "Building the versioned release manifest, hash-drift detection, or
preflight blocking surface. Those are owned by `controlled_harness_evolution_20260714` Phase
S1 (Tasks S1.2, S1.4) and must not be duplicated here."

## Live-State Drift at HEAD `f914e2b`

The reconciliation report
(`measure/tracks/harness_selfcheck_truthfulness_20260805/reconciliation-models.md`)
records the live unmapped-model set at Phase 2 Red commit `c2ec3ea` as **7 agents**, not 3
as the strategy text stated at the strategy commit SHA `7fe1a95`. The drift is caused by
post-strategy dirty agent edits that introduced four additional `kimi-for-coding/*` and one
`openai/gpt-5.6-luna-fast` reference:

| Agent | `sourceModel` | Suggestion |
|-------|---------------|------------|
| `coder-kimi-for-coding-highspeed` | `kimi-for-coding/kimi-for-coding-highspeed` | `map_entry_needed` |
| `coder-kimi-for-coding-k2p7` | `kimi-for-coding/kimi-for-coding` | `map_entry_needed` |
| `coder-openai-gpt-5-6-luna-fast` | `openai/gpt-5.6-luna-fast` | `map_entry_needed` |
| `coder-orchestrator` | `kimi-for-coding/k3` | `map_entry_needed` |
| `measure-adversarial-testing` | `deepseek/deepseek-v4-pro` | `map_entry_needed` |
| `measure-review-a-correctness` | `kimi-for-coding/kimi-for-coding` | `map_entry_needed` |
| `measure-ux-browser-review` | `xiaomi/mimo-v2.5` | `map_entry_needed` |

S1's manifest will declare the versioned roster. The 7 unmapped agents will need routing
decisions before S1 acceptance can pass — specifically, each agent's `sourceModel` must either
be added to `MODEL_MAP` (with user-approved routing intent) or corrected to reference an
already-mapped `sourceModel`. Per the spec Out-of-Scope rule, this track does not make routing
decisions; the user's routing intent for the 7 live unmapped agents is pending.

## Dirty `MODEL_MAP` State (Operator-Side Drift)

`config/model-map.json` carries `kimi-for-coding/*` entries added in the user's working tree
but reverted during Phase 1 Green per the absolute constraint "DO NOT commit any unrelated
dirty file." The dirty state is unrelated user work. The committed `lib/core.mjs#MODEL_MAP`
is `Object.freeze`-d (verified byte-identical between Phase 2 Green commit `c5afc9e` and the
current HEAD `f914e2b`); `npm run parity` reports `modelMapMatches: false` precisely because
the dirty `config/model-map.json` differs from the in-memory `MODEL_MAP`. S1's manifest will
declare the versioned model map; the operator-side drift on `config/model-map.json` is
independent of this track's mechanism and must be resolved by the user (commit the additions,
or revert them, before S1 acceptance can pass).

## Retirement Plan (Owned by S1's Acceptance)

When S1 lands and S1 acceptance passes, the active track's acceptance procedure must include:

1. **Verify S1's manifest check rejects `unmapped_model:<name>`** for all 7 live unmapped agents
   listed above (i.e., the manifest's model-reference declarations match `MODEL_MAP` coverage).
2. **Verify S1's preflight rejects track-Red test files** that are NOT declared in the
   manifest (i.e., the manifest supersedes the `tests/.track-red-files.txt` classifier).
3. **Verify S1's preflight-driven gate** provides coverage equivalent to `npm run test:shipped`
   (exits 0 when shipped surface is healthy, exits non-zero on regression or unclassified
   file). If equivalent, this track's `scripts/test-shipped.mjs`, `lib/green-gate.mjs`, and
   `package.json#test:shipped` script can be deleted. If not equivalent, the script becomes
   a thin adapter over S1's preflight contract.
4. **Verify S1's manifest detects hash drift** in place of this track's roster-derived parity
   (i.e., the manifest's agent hash declarations replace the roster-source contract). If
   equivalent, this track's `lib/core.mjs#rosterParity` can be deleted. If not equivalent,
   `rosterParity` becomes a thin adapter over S1's manifest contract.
5. **Update the active `controlled_harness_evolution_20260714` plan's acceptance evidence**
   to record the retirement of this track's guards and the resolution of the 7 unmapped agents.

This track's closeout does NOT delete the guards itself. The retirement is owned by S1's
acceptance so the two parity systems never coexist.

## Authoritative References

- **This track's spec Out-of-Scope rule:** `measure/tracks/harness_selfcheck_truthfulness_20260805/spec.md`
- **This track's plan Execution Policy:** `measure/tracks/harness_selfcheck_truthfulness_20260805/plan.md`
- **This track's reconciliation report:** `measure/tracks/harness_selfcheck_truthfulness_20260805/reconciliation-models.md`
- **S1's plan Phase S1:** `measure/tracks/controlled_harness_evolution_20260714/plan.md`
- **S1's spec Story S1:** `measure/tracks/controlled_harness_evolution_20260714/spec.md#story-s1`

---

End of S1 handoff note. This artifact is the cross-cutting C2 deliverable; C3 records the
scope decision that authorized this follow-on track under the active plan's execution policy
in `metadata.json#deviation_notes`.

---

# C1: Independent Correctness + Security Review — Re-Run Prerequisites

**Status:** deferred — `(deferred:openai-codex-oauth-restart)` (per plan.md Task C1 marker)

**Reviewed during track:**
- `measure-review-c-ux-api` (minimax-cn-coding-plan / MiniMax-M3) — **PASS** on every phase's
  API-surface audit (`results/phase-1-review-c.json`, `results/phase-2-review-c.json`,
  `results/phase-3-review-c.json`). Audit covered: `parseAgentFile` strict resolve,
  `rosterParity` / `agentParity` structured findings shape, `unmappedModelFindings` with
  `suggestion` field, `lib/green-gate.mjs#partitionTests` deterministic partition classifier,
  `scripts/test-shipped.mjs` partition listing output, `tests/.track-red-files.txt` classifier
  load, `package.json` additive single-line `test:shipped` script insertion, the Node v22.22.3
  child-v8 env-flag adapter's narrow scope.

**NOT reviewed during track (deferred):**
- `measure-review-a-correctness` (canonical model: `kimi-for-coding/kimi-for-coding`,
  alternative registered model needed) — independent correctness audit on the contract changes
  in `lib/core.mjs#rosterParity` and `lib/core.mjs#parseAgentFile`.
- `measure-review-b-security` (canonical model: `openai-codex` / `openai/gpt-5.6-sol`,
  OAuth refresh token invalid in this harness session) — adversarial/security audit on the
  `?? sourceModel` removal, the structured `unmappedModelFindings` shape, and the
  `npm run test:shipped` script's exclude-filter bypass surface.

**Prerequisites for re-running the deferred audits:**

1. **OpenAI Codex OAuth refresh:** `measure-review-b-security`'s underlying model
   (`openai-codex` / `openai/gpt-5.6-sol`) requires a valid OAuth refresh token. The current
   session's token is invalid; refresh via the harness's auth adapter or rotate the refresh
   token. Once valid, re-invoke `measure-review-b-security` against the current HEAD
   (commit `b8ac78a2d94e3101e6f293f7995d50a5a0aea04d`); the role-gate will require the role
   to commit no implementation/test changes and to write only the supplied result artifact.
2. **Re-route `measure-review-a-correctness` to a registered model:** the canonical model
   (`kimi-for-coding/kimi-for-coding`) is unregistered in the current MODEL_MAP
   (live unmapped set per `reconciliation-models.md` includes
   `measure-review-a-correctness` with `sourceModel: kimi-for-coding/kimi-for-coding` and
   `suggestion: map_entry_needed`). The user must approve a `MODEL_MAP` entry (or an agent
   frontmatter correction) before `measure-review-a-correctness` can run. Until then, the
   audit remains deferred.
3. **Re-invoke with the current archived HEAD:** once both models are available, the re-run
   roles target the archived commit `b8ac78a2d94e3101e6f293f7995d50a5a0aea04d` (the current
   HEAD at closeout). The archived directory is
   `measure/archive/harness_selfcheck_truthfulness_20260805/`; the spec, plan, test-strategy,
   metadata, reconciliation-models, handoff (this file), and `results/` are all preserved at
   the archived path.

**Risk of not re-running:** review-c (which passed) covers the API contract surface
thoroughly, including partition classifier behavior, the strict-resolve contract, and the
structured findings shape. The two deferred reviews cover (a) independent correctness of the
parity function's behavior on corner cases not exercised by review-c's API audit, and
(b) adversarial scenarios where an unmapped model reference is malicious or where the
green-gate's exclude filter is broadened to swallow a real Red. The current shipped surface
is fail-closed (Phase 2's `?? sourceModel` removal is structurally unreachable, and the
green-gate's classifier uses exact-name matching with no substring/regex), so the residual
risk is bounded; re-running the deferred audits is recommended but not a release blocker.

---

# C4: Sprint Demo + Retrospective — User Review Placeholder

**Status:** deferred — `(deferred:user-review)` (per plan.md Task C4 marker)

The user should review and complete the retro in their own time. Below is the content the
user can adopt, edit, or replace.

## Sprint Demo Highlights

- **All three stories accepted.** Phase 1 Roster parity (`results/phase-1-acceptance.json`,
  SHA `d74471a1ae407f1b46c204309a022fa49cab3bdc`), Phase 2 Model resolution fail-closed
  (`results/phase-2-acceptance.json`, SHA `1a1ed2fc4eb0517017caae5d734f711cedf1546f`),
  Phase 3 Green gate independent of active-track Red
  (`results/phase-3-acceptance.json`, SHA `f914e2bd48dc4790d698bd4551d1eab3814a71eb`).
- **`npm run test:shipped` is the canonical answer to "is the shipped surface healthy?"**
  Exits 0 with 37/37 passing when the active track's S1 Red files fail (the script excludes
  them via `tests/.track-red-files.txt`). Verified live at every phase and at final-acceptance.
- **`agentParity()` and `npm run parity` now name the specific defect** rather than reporting
  a bare count mismatch. Structured findings with `{class, name?, sourceModel?, suggestion?}`
  shape; bare-integer findings are forbidden by an A3 probe at every phase.
- **7 unmapped agents surfaced by `unmappedModelFindings`** (all classified `map_entry_needed`)
  rather than the previous false-positive "0 unmapped" caused by the `?? sourceModel`
  passthrough in `lib/core.mjs#parseAgentFile`. The unmapped predicate is now reachable.

## Sprint Demo Lowlights

- **Multiple canonical Measure subagents unavailable.** `measure-mid-red` (kimi-coding/k3
  unregistered), `measure-jr-green` (openai-codex OAuth invalid), `measure-review-a` /
  `measure-review-b` (same OAuth failure), `measure-phase-acceptance` and `measure-closeout`
  (same OAuth failure), `measure-adversarial-testing` (deepseek/deepseek-v4-pro unregistered),
  `measure-ux-browser-review` (xiaomi/mimo-v2.5 unregistered). Roughly half the Measure
  subagent roster is non-functional in this harness session.
- **Direct coder delegation substituted for Measure's role boundary.** User explicitly
  authorized `coder-minimax-m3` direct delegation for all Red/Green roles (Phase 1, 2, 3)
  and for acceptance roles. The orchestrator's role boundary
  (no direct coder delegation in Red/Green chain) was breached under user authorization.
- **Live-state drift from strategy to Red.** The strategy stated 3 unmapped agents at
  strategy commit SHA `248d841b0b2445b3376d15625da1665fc084edbc`; by Phase 2 Red (`c2ec3ea6bc128d2351d9f719d1f0f8bf177d8709`)
  the live count was 7 due to dirty agent edits introducing `kimi-for-coding/*` and
  `openai/gpt-5.6-luna-fast` references. Reconciliation-models.md reconciles against live
  behavior, not the strategy's frozen list.
- **S2 AC3 cannot verify until user-approved routing decisions land.** The fail-closed state
  is correct per spec, but the "no unmapped finding + pass recorded" AC requires
  `MODEL_MAP` entries for all 7 live sourceModels (or frontmatter corrections). This is
  Decision-Required (out-of-scope per spec).

## Action Items

- **AI-1 (high):** Refresh `openai-codex` OAuth refresh token. Half the Measure subagent
  roster becomes unusable when this token expires. Mitigation: rotate token; consider
  adding a token-expiry preflight to the harness session bootstrap.
- **AI-2 (high):** Re-route `measure-review-a-correctness` to a registered model. The
  canonical `kimi-for-coding/kimi-for-coding` model is absent from `MODEL_MAP`; either
  add a `MODEL_MAP` entry (with the user's approved routing intent) or correct the agent
  frontmatter to reference an already-mapped `sourceModel`. Until this is resolved,
  `measure-review-a-correctness` cannot run.
- **AI-3 (medium):** User-approved `MODEL_MAP` routing decisions for the 7 live unmapped
  agents (see `reconciliation-models.md`). Candidates suggested in
  `reconciliation-models.md#decision-required`; spec out-of-scope rule means this track
  cannot decide unilaterally.
- **AI-4 (medium):** Re-run deferred C1 audits (review-a, review-b) once AI-1 + AI-2
  land. The two reviews cover (a) independent correctness on corner cases and
  (b) adversarial/security scenarios on the strict-resolve and exclude-filter surfaces.
- **AI-5 (low):** Update `tests/parity.test.mjs` JSDoc header (lines 30-33) to enumerate
  the `description_mismatch` finding class added in Phase 1 Green. Carried as NF-1 from
  phase-1-acceptance.json; non-blocking documentation drift.
- **AI-6 (low):** Resolve `config/model-map.json` operator-side drift (carries uncommitted
  `kimi-for-coding/*` additions not in committed `lib/core.mjs#MODEL_MAP`). Either commit
  the additions or revert them. S1's manifest will resolve this when S1 lands.

## Cross-Track Implications

- **controlled_harness_evolution_20260714 Phase S1 owns the retirement of this track's
  guards** per `handoff.md` §Supersession Mapping. DO NOT coexist two parity mechanisms.
  When S1 lands and acceptance passes, the active track's acceptance procedure must retire
  this track's mechanism via its own acceptance — not leave both live.
- **verified_delegation_boundary_20260805** (Upcoming) is a routing-chain prerequisite for
  `role_model_pool_20260805` and `role_fitness_frontier_watch_20260805`. Its Story S1 must
  land before those tracks' Phase 2/3 work proceeds.
- **trust_boundary_security_20260715** (Upcoming) depends on
  `verified_delegation_boundary_20260805`; re-read the S2 abuse cases against the
  enforcement established there before starting.

---

End of handoff note. This artifact now documents C2 (S1 supersession), C3 (scope-decision
record reference), and the deferred-C1 / deferred-C4 placeholders.
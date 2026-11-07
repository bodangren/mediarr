# Implementation Plan: Harness Self-Check Truthfulness

Track: `harness_selfcheck_truthfulness_20260805`  
Spec: [./spec.md](./spec.md)

## Execution Policy

- This plan uses the compatibility marker grammar defined in `measure/workflow.md` until the
  canonical grammar ships. Pending markers (`[ ]`) in this plan stay pending throughout
  execution; no implementation task migrates them. The canonical grammar's `[ ]` reclassification
  rule (in `controlled_harness_evolution_20260714` Phase S1's `lib/grammar.mjs`) applies only to
  plans that explicitly opt into the new grammar version.
- Every implementation phase follows Contract → Red → Green → review → acceptance.
- This track repairs the currently shipped self-check surface. It must not build a versioned
  release manifest, hash-drift detection, or preflight blocking; those belong to
  `controlled_harness_evolution_20260714` Phase S1. Jr's Green must not edit
  `lib/manifest.mjs`, `lib/grammar.mjs`, or `lib/preflight.mjs` (none of which exist yet) and
  must not modify `extensions/measure-harness/index.ts` beyond what Phase 1's contract change
  requires (consuming the new parity findings shape).
- No task may satisfy a gate by weakening an assertion, deleting a failing check, or adjusting
  a constant to match observed reality without a named cause (anti-patterns A3, A7).
- Because the active track's Red suite is intentionally failing, every phase's evidence must
  state the Red baseline it ran against, not merely a pass/fail count. Every Task 1.5 / 2.5 /
  3.5 evidence record must include the pre-Phase `npm test` pass/fail counts and the strategy
  commit SHA so future readers can verify the gate ran against the documented baseline.
- Reconciliation of the live roster (Task 1.4) and reconciliation of unmapped model references
  (Task 2.4) record the **live behavior** at the strategy commit SHA, not a frozen plan-time
  list. Discrepancies between the plan and live state are recorded in `metadata.json#deviation_notes`.

---

## Contract Test Layout

Implementation tasks add or rewrite the following test files (filename pattern preserved, no
subdirectory):

| File | Phase | Purpose |
|------|-------|---------|
| `tests/parity.test.mjs` | Phase 1 | Roster-parity contract: derived counts, named findings for missing/extra/mode-change/duplicate/missing-description/unreadable-source/malformed-agent-file, A3 labeled-integer probe |
| `tests/model-resolution.test.mjs` | Phase 2 | Model-resolution contract: strict `model` resolve, reachable `unmappedModels` predicate, named `unmappedModelFindings` array with `map_entry_needed` vs `reference_incorrect` suggestion |
| `tests/green-gate.test.mjs` | Phase 3 | Green-gate contract: shipped partition runs, track-Red excluded, unclassified file fails, seeded shipped regression fails, A7-analog over-broad-filter probe |
| `tests/core.test.mjs` (rewrite) | Phase 1 + Phase 2 | The existing `"agent snapshot has expected parity"` test is rewritten to assert the derived contract (Phase 1) and the reachable `unmappedModels` predicate (Phase 2). The frozen `agentCount: 24, callableCount: 22` assertion is removed. |
| `tests/.track-red-files.txt` | Phase 3 | New committed file listing every test file known to be track-owned Red (at strategy commit: `tests/agents-snapshot.test.mjs`, `tests/grammar.test.mjs`, `tests/manifest.test.mjs`, `tests/preflight.test.mjs`). Part of the green-gate's contract surface. |
| `scripts/test-shipped.mjs` | Phase 3 | New committed script that invokes `node --test` over the shipped partition only, emits structured partition output, exits 0/1. Wired as `npm run test:shipped`. |

Fixtures (self-contained, under `tests/fixtures/`):

| Directory | Phase | Contents |
|-----------|-------|----------|
| `tests/fixtures/parity/` | Phase 1 | Synthetic roster directories with named disagreements (missing, extra, mode-change, duplicate, missing-description, unreadable-source, malformed-frontmatter) |
| `tests/fixtures/model-resolution/` | Phase 2 | Synthetic agent files with mapped and unmapped `model` references, plus a probe distinguishing map-entry-needed from reference-incorrect |
| `tests/fixtures/green-gate/` | Phase 3 | A synthetic `tests/` tree containing shipped, track-owned Red, and unclassified files for the classifier probe |

The new `npm run test:shipped` script (Phase 3) becomes the canonical Green gate; `npm test`
remains unchanged and is reserved for full-suite runs that intentionally include the active
track's Red tests.

## Risk Classification

- Phase 1: **medium** — replacing two hardcoded constants touches a frozen test snapshot; reconciliation of the live roster is a one-time decision.
- Phase 2: **high** — the silent-passthrough defect is structural; reconciliation escalates three routing decisions to the user; the test rewrite must remain contract-correct.
- Phase 3: **medium** — a new package script plus a classifier list; the A7-analog over-broad-filter probe is the main attack surface.
- Cross-cutting C1–C4: **low**.

---

## Phase 1: Roster parity that cannot drift silently
_Story ref: spec.md#story-s1_

- [x] Task 1.1: Define the roster-parity contract: the committed roster source, its shape, how
      expected counts are derived from it, and the named-finding format for every disagreement
      class (missing agent, extra agent, mode change, duplicate, absent description). (commit: d74471a)
- [x] Task 1.2: Write failing tests covering each disagreement class against synthetic roster
      fixtures, plus a fail-closed probe for an unreadable or malformed roster source, plus an
      A3 probe asserting no finding is reported as a bare integer. The A3 probe parses a sample
      finding and asserts the presence of a `class` label (analog to `tests/manifest.test.mjs`'s
      `agentCountLabel: "agent count: N"` pattern) — a bare-integer finding is forbidden. (commit: d74471a)
- [x] Task 1.3: Implement roster-derived parity, replacing `EXPECTED_AGENT_COUNT` and
      `EXPECTED_CALLABLE_COUNT` in `lib/core.mjs` and updating `tests/core.test.mjs` to assert
      the contract rather than a frozen snapshot of counts. (commit: d74471a)
- [x] Task 1.4: Reconcile the live roster: record why the roster reached 27/25 and confirm each
      current agent is intended, so the first passing run is a verified pass, not a rubber stamp. (commit: d74471a)
- [x] Task 1.5: Run focused tests (`node --test tests/parity.test.mjs`), `npm run check`,
      `npm test`, and `npm run parity`; record evidence including the pre-existing Red baseline
      (pre-Phase `npm test` pass/fail counts and the strategy commit SHA). (commit: d74471a)

---

## Phase 2: Unresolvable model references fail closed
_Story ref: spec.md#story-s2_

- [x] Task 2.1: Define the model-resolution contract: when a frontmatter model resolves, when it
      is unmapped, the diagnostic shape naming the agent, and the distinction between "needs a
      `MODEL_MAP` entry" and "references a model that does not exist". (commit: 1a1ed2f)
- [x] Task 2.2: Write failing tests proving an unmapped reference is reported by agent name,
      that the silent `?? sourceModel` passthrough no longer occurs, and that a resolving roster
      reports no unmapped finding. The Red commit must observe a non-zero exit on the live
      roster's three currently-unmapped agents (see Task 2.4 below). (commit: 1a1ed2f)
- [x] Task 2.3: Implement fail-closed model resolution in `parseAgentFile` / `agentParity`:
      remove the `?? sourceModel` fallback, rewrite `parseAgentFile` so an absent `MODEL_MAP`
      entry yields `model: undefined`, and make the `unmappedModels` predicate reachable. (commit: 1a1ed2f)
- [x] Task 2.4: Produce the reconciliation report for the agents whose frontmatter `model`
      is absent from `MODEL_MAP` at the strategy commit. **Live count at the strategy commit
      SHA is 3**, not 8: `measure-adversarial-testing` (`deepseek/deepseek-v4-pro`),
      `measure-ux-browser-review` (`xiaomi/mimo-v2.5`), `coder-openai-gpt-5-6-luna-fast`
      (`openai/gpt-5.6-luna-fast`). The five names in the original plan that are NOT actually
      unmapped (`measure-mid-red`, `measure-review-a-correctness`, `coder-orchestrator`,
      `coder-kimi-for-coding-highspeed`, `coder-kimi-for-coding-k2p7`) are already present in
      `MODEL_MAP` and must be removed from the reconciliation list. The report classifies each
      of the three live-unmapped agents as `map_entry_needed` or `reference_incorrect` based
      on whether the `provider/id` shape is well-formed. Do not change routing here — record
      the decision and escalate the routing choice to the user. The discrepancy between this
      plan's stated count and the live state is recorded in `metadata.json#deviation_notes`.
      **At closeout, live unmapped count is 7** (post-strategy dirty agent edits introduced
      `kimi-for-coding/*` and `openai/gpt-5.6-luna-fast` references); all 7 classified
      `map_entry_needed` per `reconciliation-models.md`. (commit: 1a1ed2f)
- [x] Task 2.5: Run focused tests (`node --test tests/model-resolution.test.mjs`), `npm run
      check`, `npm test`, and `npm run parity`; record evidence including the pre-existing Red
      baseline (pre-Phase `npm test` pass/fail counts and the strategy commit SHA). (commit: 1a1ed2f)

---

## Phase 3: A green gate independent of active-track Red
_Story ref: spec.md#story-s3_

- [x] Task 3.1: Define the green-gate contract: which surfaces it covers, how a test file is
      declared track-owned Red (the committed `tests/.track-red-files.txt` listing), and the
      unclassified-file diagnostic (`{class: 'unclassified_test_file', path: <label>}` is a
      hard failure, not a tolerated warning). (commit: f914e2b)
- [x] Task 3.2: Write failing tests asserting the gate exits zero while active-track Red fails,
      exits non-zero on a seeded regression in a shipped surface, and reports an unclassified
      test file rather than ignoring it. (commit: f914e2b)
- [x] Task 3.3: Implement the green gate as a distinct package script named `npm run
      test:shipped` (wired to `scripts/test-shipped.mjs`), alongside the existing full
      `npm test`. The script invokes `node --test` over the shipped partition (the complement
      of `tests/.track-red-files.txt`), prints its partition listing in its own output
      (`[shipped] N test files: ...; [track-red] M excluded: ...`), and exits 0 only when the
      shipped partition is green and there are no unclassified files. The existing `"test"`
      script in `package.json` is preserved unchanged. (commit: f914e2b)
- [x] Task 3.4: Document in the package README (or a comment block in `package.json`
      next to the new `test:shipped` script) which command answers "is the shipped surface
      healthy?" (`npm run test:shipped`) versus "is the active track's Red still Red?"
      (`npm test`). The green gate is the canonical answer to the first question. (commit: f914e2b)
- [x] Task 3.5: Run focused tests (`node --test tests/green-gate.test.mjs`), `npm run check`,
      `npm test`, the new `npm run test:shipped` green gate, and `npm run parity`; record
      evidence including the pre-existing Red baseline (pre-Phase `npm test` pass/fail counts
      and the strategy commit SHA) and the green gate's partition listing. (commit: f914e2b)

---

## Cross-Cutting Completion Tasks

- [b] Task C1: Run independent correctness and security review; remediate blocking findings. (deferred:openai-codex-oauth-restart)
- [x] Task C2: Write the S1 handoff note naming which guards from this track
      `controlled_harness_evolution_20260714` Phase S1 subsumes, so the manifest work retires
      them deliberately rather than leaving two parity mechanisms live. (commit: b8ac78a)
- [x] Task C3: Record the scope decision that authorized this follow-on track under the active
      plan's execution policy. (commit: b8ac78a)
- [b] Task C4: Record sprint demo evidence, scope deviations, and retrospective outcomes in
      metadata before archival. (deferred:user-review)

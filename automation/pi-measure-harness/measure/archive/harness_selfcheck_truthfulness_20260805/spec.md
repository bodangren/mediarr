# Specification: Harness Self-Check Truthfulness

## Overview

The harness's own health check is currently reporting a false signal, and has been for some
time. `agentParity()` in `lib/core.mjs` returns `ok: false` on the live roster, which means
`/measure-doctor`, the `measure_doctor` tool, and the `agent snapshot has expected parity`
test all fail permanently — for a reason unrelated to any real defect. At the same time, the
one parity field that would detect a genuine routing defect, `unmappedModels`, is structurally
incapable of ever reporting a value.

A self-check that fails for a stale reason trains its operators to ignore it, and a
self-check with an unreachable assertion provides false assurance. Both are the same class of
defect: the check no longer describes the system it claims to describe. This track restores
truthfulness of the *existing* self-check surface so that a red doctor means something again.

## Observed Defects

1. **Roster constants drifted from the roster.** `EXPECTED_AGENT_COUNT = 24` and
   `EXPECTED_CALLABLE_COUNT = 22` are hardcoded in `lib/core.mjs`. The packaged roster now
   holds 27 agents / 25 callable. `agentParity().ok` is therefore permanently `false`, and
   `measure_doctor` reports failure regardless of harness health.
2. **`unmappedModels` is unreachable.** `parseAgentFile` resolves
   `model = sourceModel ? MODEL_MAP[sourceModel] ?? sourceModel : undefined`, so
   `sourceModel && !model` can never be true. Eight packaged agents currently reference models
   absent from `MODEL_MAP` — including `measure-mid-red`, `measure-review-a-correctness`, and
   `measure-ux-browser-review` — and parity reports zero unmapped models.
3. **No green gate exists.** `npm test` is 5-of-13 red by design, because the active track's
   S1 Red tests target modules that do not exist yet. A real regression in a shipped module is
   therefore indistinguishable from expected Red, and no command in the package can answer
   "is the currently shipped surface healthy?"

## Scope

### In Scope

- Deriving expected roster shape from a committed, reviewable source rather than a constant
  that drifts silently when an agent is added.
- Making an unresolvable model reference a hard, reported failure at agent-load time instead of
  a silent passthrough of the unmapped identifier.
- Separating a must-pass green gate over shipped surfaces from the active track's expected-Red
  suite, so regressions are visible while a track is mid-flight.
- Regression coverage proving each of the three observed defects cannot silently recur.

### Out of Scope

- Building the versioned release manifest, hash-drift detection, or preflight blocking surface.
  Those are owned by `controlled_harness_evolution_20260714` Phase S1 (Tasks S1.2, S1.4) and
  must not be duplicated here.
- Changing which model any agent is routed to. Correcting the roster's model references is a
  separate decision requiring the user's routing intent, not a defect fix.
- Verifying that a child role actually ran on its pinned model. That is owned by
  `verified_delegation_boundary_20260805`.

## Relationship to Active Tracks

`controlled_harness_evolution_20260714` Phase S1 will eventually replace ad-hoc parity with a
versioned manifest (`lib/manifest.mjs`) whose Red tests already specify `unmapped_model:<name>`
rejection. That work supersedes this track's mechanism but not its timing: S1 is currently
stalled at Red (S1.3, S1.3b), and the false signal is live today.

This track is therefore explicitly scoped as a **defect repair on the currently shipped
surface**, taken as a deliberate scope decision under the active plan's execution policy. Its
acceptance must include a written handoff note stating which of its guards S1 subsumes, so S1
retires them deliberately rather than leaving two parity mechanisms in place.

Two later tracks consume this track's output and must not duplicate it:

- `role_model_pool_20260805` Story S1 extends the Story S2 cause vocabulary
  (`map_entry_needed`, `reference_incorrect`) to runtime causes such as `quota_exhausted` and
  `credential_expired`. It reuses this track's finding shape. It does not define a second one.
- `role_fitness_frontier_watch_20260805` depends on the Story S3 green gate to distinguish a
  real regression from a track's expected Red while evaluation runs are in flight.

## Stories

### Story S1: Roster parity that cannot drift silently
**As a** harness operator
**I want** expected roster shape derived from a committed source rather than a hand-edited constant
**So that** adding an agent cannot turn the health check red for a reason unrelated to health.

**Acceptance Criteria:**
- Given an agent is added to or removed from the packaged roster, When the self-check runs,
  Then it either passes or reports the specific roster change — never a bare count mismatch
  with no named cause.
- Given the committed roster source and the packaged agent files disagree, When the self-check
  runs, Then it names every disagreeing entry rather than reporting an aggregate count.
- Given the live roster, When the self-check runs today, Then it reports `ok: true` or names a
  concrete, currently-true defect.

### Story S2: Unresolvable model references fail closed
**As a** harness operator
**I want** an agent whose model has no mapping to be rejected at load
**So that** a routing gap surfaces as an error instead of a passthrough of an unroutable identifier.

**Acceptance Criteria:**
- Given an agent whose frontmatter model has no `MODEL_MAP` entry, When agents are loaded,
  Then the condition is reported against that agent by name and the self-check does not pass.
- Given the current roster's eight unmapped references, When the self-check runs, Then each is
  reported individually, and the report distinguishes "needs a map entry" from "needs a
  corrected model reference".
- Given every reference resolves, When the self-check runs, Then no unmapped finding is
  reported and the pass is recorded as evidence.

### Story S3: A green gate independent of active-track Red
**As a** harness maintainer
**I want** a must-pass command covering only shipped surfaces
**So that** a regression is distinguishable from a track's expected Red state.

**Acceptance Criteria:**
- Given the active track's Red tests are failing as designed, When the green gate runs, Then it
  exits zero and its scope is stated explicitly.
- Given a shipped surface regresses, When the green gate runs, Then it exits non-zero and names
  the regressed surface.
- Given a new test file is added, When it is neither in the green gate nor declared as
  track-owned Red, Then the gate reports the unclassified file rather than silently ignoring it.

## Non-Functional Requirements

- The self-check is deterministic and side-effect free; it reads the roster and reports.
- The self-check fails closed: an unreadable or malformed roster source is a blocking error,
  never a pass.
- Every finding names the specific agent, file, or surface. Aggregate counts may accompany a
  finding but may never be the whole finding (anti-pattern A3).
- No task in this track may make the self-check pass by relaxing what it checks (anti-pattern A7).

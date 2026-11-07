# Project Tracks

## Active

- [ ] **Track: Controlled evolution of the Pi Measure orchestration harness**
  *Link: [./tracks/controlled_harness_evolution_20260714/](./tracks/controlled_harness_evolution_20260714/)*
  *Establish a versioned, deterministic, sprint-driven, self-improving Pi harness without project-specific policy.*

## Upcoming

- [ ] **Track: Verified Delegation Boundary**
  *Link: [./tracks/verified_delegation_boundary_20260805/](./tracks/verified_delegation_boundary_20260805/)*
  *Assert the invariants the task boundary already records: observed routing compared to the role pin, read-only verified from repository state rather than a bypassable command denylist, bounded dispatch, and a validated outbound packet. Should precede Trust-Boundary & Fail-Closed Security Verification, whose S2 abuse cases currently have no enforcement to verify.*
  *Routing chain step 1 of 3. Story S1 is a hard prerequisite for the two tracks below.*

- [ ] **Track: Role Model Pool and Phase-Level Assignment**
  *Link: [./tracks/role_model_pool_20260805/](./tracks/role_model_pool_20260805/)*
  *Replace one fixed model pin per role with declared candidate pools, a cause-classified availability inventory, an entitlement-based cost model, and a phase-level assignment solved at preflight so an unsatisfiable phase fails before role 1 dispatches.*
  *Routing chain step 2 of 3. Phase 3 blocked until `verified_delegation_boundary_20260805` Story S1 is accepted.*

- [ ] **Track: Role Fitness Evidence and Frontier Watch**
  *Link: [./tracks/role_fitness_frontier_watch_20260805/](./tracks/role_fitness_frontier_watch_20260805/)*
  *A frozen role-fitness corpus judged by each role's own gate, evaluation across both model and role-prompt variant, a candidate intake with a scheduled watch, and a periodic routing proposal a human approves. No component may write to a role pool.*
  *Routing chain step 3 of 3. Phase 2 blocked on `verified_delegation_boundary_20260805` S1; Phase 4 blocked on `role_model_pool_20260805` S2. This is the only recurring track.*

- [ ] **Track: Project Adoption & Run-Configuration Contract**
  *Link: [./tracks/project_adoption_contract_20260715/](./tracks/project_adoption_contract_20260715/)*
  *Versioned, validated contract by which arbitrary repositories adopt the harness: run-configuration schema, trust-model resource loading, and a verified reference adoption.*

- [ ] **Track: Operator Run Inspector**
  *Link: [./tracks/operator_run_inspector_20260715/](./tracks/operator_run_inspector_20260715/)*
  *Read-only operator surface over durable harness state: run/story inspection, receipt and failure-classification queries, operator documentation.*

- [ ] **Track: Trust-Boundary & Fail-Closed Security Verification**
  *Link: [./tracks/trust_boundary_security_20260715/](./tracks/trust_boundary_security_20260715/)*
  *Threat model, adversarial fixture corpus, and security suite proving malformed, stale, unauthorized, and credential-bearing inputs can never advance a workflow.*
  *Depends on: `verified_delegation_boundary_20260805`. Re-read the S2 abuse cases against the enforcement established there before starting — several currently have no enforcement to verify.*

- [ ] **Track: Canonical Status-Marker Grammar & Migration**
  *Link: [./tracks/status_marker_grammar_20260729/](./tracks/status_marker_grammar_20260729/)*
  *Versioned, machine-checkable canonical status-marker grammar with drift checker and per-material migration, resolving the open high-severity marker-vocabulary drift tech-debt item.*

## Archived

- [x] **Track: Harness Self-Check Truthfulness** (completed 2026-08-06)
  *Archived at: [./archive/harness_selfcheck_truthfulness_20260805/](./archive/harness_selfcheck_truthfulness_20260805/)*
  *All three phases accepted; final-acceptance PASS. Installed four guards on the shipped self-check: roster-derived parity replacing hardcoded 24/22 constants in `lib/core.mjs#rosterParity`; strict model resolution removing the `?? sourceModel` passthrough in `lib/core.mjs#parseAgentFile`; structured `unmappedModelFindings` with `map_entry_needed` / `reference_incorrect` suggestion; and `npm run test:shipped` + `tests/.track-red-files.txt` classifier independent of active-track Red. Superseded by `controlled_harness_evolution_20260714` Phase S1 — DO NOT coexist two parity mechanisms. Pending: user-approved `MODEL_MAP` routing decisions for 7 live unmapped agents (all `map_entry_needed` per `reconciliation-models.md`); openai-codex OAuth refresh for re-running deferred C1 audits (review-a, review-b); user-review for the C4 sprint retro (placeholder in `handoff.md`). See `handoff.md` and `reconciliation-models.md`.*

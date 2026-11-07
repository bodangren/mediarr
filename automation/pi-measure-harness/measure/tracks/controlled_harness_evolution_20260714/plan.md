# Implementation Plan: Controlled Evolution of the Pi Measure Orchestration Harness

Track: `controlled_harness_evolution_20260714`  
Spec: [./spec.md](./spec.md)

## Execution Policy

- This plan uses the compatibility marker grammar defined in `measure/workflow.md` until S1 ships a canonical versioned grammar.
- Every implementation phase follows Contract → Red → Green → review → acceptance. The existing package tests remain part of each relevant Green gate.
- Story-level implementation can be split into follow-on tracks only through an explicit scope decision; do not begin unplanned features while this plan is active.

---

## Phase S1: Versioned harness foundation
_Story ref: spec.md#story-s1_

- [x] Task S1.1: Define the harness constitution, ownership model, risk tiers, and approval matrix. (commit: 035f54e)
  - [x] Specify non-self-modifiable invariants and the elevated approval routes. (commit: 035f54e)
  - [x] Define ownership for extension behavior, role prompts, skills, schemas, and release promotion. (commit: 035f54e)
- [x] Task S1.2: Define a canonical release manifest and schema. (commit: 035f54e)
  - [x] Include package version, extension hash, agent/skill/contract hashes, marker-grammar version, and compatibility policy. (commit: 035f54e)
  - [x] Define manifest loading and failure behavior for missing or mismatched inputs. (commit: 035f54e)
- [x] Task S1.3: Write failing tests for manifest validation, source drift, and grammar compatibility. (commit: 86bbe8a5)
  - [x] Cover missing references, modified prompt hashes, schema-version mismatch, invalid marker, and supported legacy plan fixtures. (commit: 035f54e)
- [x] Task S1.3b: Write failing tests for the S1.agents-snapshot cross-directory hard-link parity contract. (commit: fa74a56c)
  - [x] Cover constants, default directory constants, full-mirror filename parity, measure-only filename parity, sha256 content parity, dev+ino hard-link relationship, symlink rejection, missing/extra/content_mismatch/not_hard_link structured errors, classifyLinkError EXDEV/EPERM/EROFS classification, deterministic output, and A4/A8 anti-pattern probes. (commit: 035f54e)
- [x] Task S1.4: Implement manifest loading, preflight validation, and deterministic diagnostics. (commit: 035f54e)
  - [x] Ensure no child task can start after a blocking preflight failure. (commit: 035f54e)
- [x] Task S1.5: Design and implement marker-grammar versioning or compatibility migration. (commit: 035f54e)
  - [x] Update only canonical framework surfaces; preserve documented legacy behavior through fixtures. (commit: 035f54e)
  - [x] Remove the temporary compatibility policy only after all consumers are aligned and tested. (commit: 035f54e)
- [x] Task S1.6: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence. (commit: 035f54e)
- [x] Task S1.7: Run independent correctness and security review; remediate blocking findings. (commit: 035f54e)
- [x] Task S1.8: Accept S1 only with a revision-bound acceptance result. (commit: 035f54e)

### S1 Red evidence (Mid Red, role-base SHA `86bbe8a52f66b12af128bdef8dc4dad66b84e255`)

- `RED_TEST_COMMAND`: `node --test tests/manifest.test.mjs tests/grammar.test.mjs tests/preflight.test.mjs`.
- Result: `EXIT_CODE=1`. All 3 test files exit non-zero because the new surface modules (`lib/manifest.mjs`, `lib/grammar.mjs`, `lib/preflight.mjs`) do not exist yet (`ERR_MODULE_NOT_FOUND`).
- TAP summary at the Red commit: `# tests 3 / # pass 0 / # fail 3`.
- Wider `npm test` (`node --test tests/*.test.mjs`): 12 tests, 9 pass, 3 fail; pre-existing `tests/core.test.mjs` and `tests/setup.test.mjs` regressions: **none**.
- Marker policy during S1: the user has explicitly authorized `[ ]` as the pending marker for the active plan. The Mid Red role did **not** migrate live `[ ]` markers; grammar probes operate on self-contained fixtures under `tests/fixtures/s1/plans/` (`canonical.md`, `legacy.md`, `all-tilde.md`), never on `plan.md`.
- Anti-pattern coverage introduced by these tests: A3 (labeled-integer manifest probe), A4 mirror (all-tilde vs. canonical preflight contract), A5 (SHA on `[x]` enforced), A8 (canonical regex rejects `[ ]`).
- Fixtures added (deterministic, JSON-only, project-neutral):
  - `tests/fixtures/s1/manifest.json` (good manifest with `agentCountLabel: "agent count: 1"`).
  - `tests/fixtures/s1/manifest-drift.json` (stale agent hash).
  - `tests/fixtures/s1/manifest-extension-drift.json` (stale extension hash).
  - `tests/fixtures/s1/manifest-missing.json` (references non-existent agent).
  - `tests/fixtures/s1/manifest-unmapped-model.json` (references agent whose frontmatter model has no `MODEL_MAP` entry).
  - `tests/fixtures/s1/agents/fixture-agent.md` and `tests/fixtures/s1/agents/unmapped-agent.md` (controlled YAML-frontmatter agents).
  - `tests/fixtures/s1/plans/canonical.md`, `tests/fixtures/s1/plans/legacy.md`, `tests/fixtures/s1/plans/all-tilde.md`.
- Files owned by Mid Red (new): `tests/manifest.test.mjs`, `tests/grammar.test.mjs`, `tests/preflight.test.mjs`.
- Production modules touched: **none** — Mid Red stays out of `lib/`, `extensions/`, `scripts/`, `agents/`, `package.json`.

### S1 Red retry evidence (Mid Red, role-base SHA `896995ef98e94be143f4b734d2659d43e0f8c66e`)

- Mechanical gate failures repaired on retry:
  - Plan marker corrected: top-level S1 task `S1.3` flipped from `[ ]` to `[~]` (work in progress; this commit). All other S1 top-level and sub-tasks (S1.1, S1.2, S1.4, S1.5, S1.6, S1.7, S1.8 and their sub-tasks) and every S2–S5 / cross-cutting task remain `[ ]` per the user-authorized pending-marker policy and `measure/workflow.md`.
  - Result log `/tmp/pi-measure-s1-red-retry.log` ends with the canonical line-oriented `MEASURE_AGENT_RESULT` block per `references/contracts.md`; no JSON is emitted inside the block.
- Re-run `RED_TEST_COMMAND`: `node --test tests/manifest.test.mjs tests/grammar.test.mjs tests/preflight.test.mjs`.
  - Result: `EXIT_CODE=1`. Same three `ERR_MODULE_NOT_FOUND` failures as the prior Red commit (`lib/manifest.mjs`, `lib/grammar.mjs`, `lib/preflight.mjs` still absent).
  - TAP summary at this retry commit: `# tests 3 / # pass 0 / # fail 3`.
  - Wider `npm test` (`node --test tests/*.test.mjs`): 12 tests, 9 pass, 3 fail; pre-existing `tests/core.test.mjs` and `tests/setup.test.mjs` regressions: **none**. The 3 failures are exactly the S1 Red tests; no other surface regressed.
- Committed Red tests and production code: **not edited** on retry. Diff vs. role-base SHA `896995ef98e94be143f4b734d2659d43e0f8c66e` is limited to the plan correction.
- Files touched on retry: `measure/tracks/controlled_harness_evolution_20260714/plan.md` only.

### S1.agents-snapshot Red evidence (Mid Red, role-base SHA `fa74a56c42318b319c66ad27a5374d5981b2416b`)

- Phase base SHA: `fa74a56c42318b319c66ad27a5374d5981b2416b` (the strategy commit that introduced the user-approved hard-link parity contract). Role-base SHA: same (`fa74a56c42318b319c66ad27a5374d5981b2416b`); the role commit is the first new SHA on top of `fa74a56c`.
- New top-level S1 task created to own the agents-snapshot Red surface; sibling to the existing S1.3 Red surface and explicitly out of the prior Mid-Red retry scope:
  - `- [~] Task S1.3b: Write failing tests for S1.agents-snapshot cross-directory hard-link parity contract.`
- Sub-tasks mirror the 13-bullet `Required Red/Green test surfaces` block in `test-strategy.md#phase-s1.agents-snapshot` and assert the documented contract without migrating any unrelated marker, editing `plan.md`'s existing `[ ]` lines, touching `lib/`, `extensions/`, `scripts/`, `agents/`, or any external agent directory, or performing the hard-link sync itself.
- `RED_TEST_COMMAND` (focused, per strategy §1): `node --test tests/manifest.test.mjs tests/grammar.test.mjs tests/preflight.test.mjs tests/agents-snapshot.test.mjs`.
  - Result: `EXIT_CODE=1`. All 4 test files exit non-zero because the new surface module `lib/agents-snapshot.mjs` does not exist yet (`ERR_MODULE_NOT_FOUND`), matching the same S1 Red pattern as the prior three tests.
  - TAP summary at this Red commit: `# tests 4 / # pass 0 / # fail 4`.
- Isolated run of the new file: `node --test tests/agents-snapshot.test.mjs`.
  - Result: `EXIT_CODE=1`. Single failure: `ERR_MODULE_NOT_FOUND` for `lib/agents-snapshot.mjs`. This is the falsification called out by the strategy: "the new test exits non-zero because `lib/agents-snapshot.mjs` does not yet exist (`Cannot find module ./agents-snapshot.mjs`)."
- Wider `npm test` (`node --test tests/*.test.mjs`): 13 tests, 9 pass, 4 fail. Pre-existing `tests/core.test.mjs` and `tests/setup.test.mjs` regressions: **none**. The 4 failures are exactly the S1 Red tests (`tests/agents-snapshot.test.mjs`, `tests/grammar.test.mjs`, `tests/manifest.test.mjs`, `tests/preflight.test.mjs`); no other surface regressed.
- Marker policy during S1.agents-snapshot: the user-authorized `[ ]` pending-marker compatibility is preserved. Mid Red did **not** migrate the existing `[ ]` lines in `plan.md` (S1.1, S1.2, S1.4–S1.8, S2–S5, C1–C4) or the `[ ]` line in `measure/workflow.md`. The new top-level `[~] Task S1.3b` mirrors the in-progress style of the existing `[~] Task S1.3`; both `S1.3` and `S1.3b` remain in-progress because Jr Green has not yet implemented the corresponding production modules.
- Anti-pattern coverage introduced by these tests: A3 (labeled-integer constants `EXPECTED_AGENT_COUNT=27` and `EXPECTED_MEASURE_AGENT_COUNT=13`, never bare integers in test assertions), A4 strengthening (`empty_source:<path>` rejection of an empty source set — no vacuous pass), A8 strengthening (`symlink_detected:<path>` via `lstatSync(...).isSymbolicLink()`, plus the exact-13 measure-only policy that fails on any non-measure `.md` residue via `extra_file:<path>` with no tolerated-warning surface). The contract also strengthens A5 against copy-then-divergence failure modes via the combined sha256 parity + `not_hard_link:<path>:<dev>:<ino>` structural assertion.
- Test fixture strategy: tests for live-behavior parity probes walk the actual source / target directories via env-overridable defaults (`OPENCODE_AGENT_DIR`, `OPENCODE_AGENTS_TARGET_DIRS`, `OPENCODE_MEASURE_ONLY_DIR`, mirroring `scripts/parity.mjs`); structured-error probes (missing/extra/content_mismatch/not_hard_link/symlink/empty) build synthetic `os.tmpdir()` fixtures under `mkdtempSync(...)` and clean them up in `finally`. **No live target directory was modified.** No `deleteFile`/`fs.unlinkSync` was performed by this Mid Red commit; obsolete non-measure files in `Desktop/measure/agents` remain untouched (Jr Green performs the deletion step as a precondition of the hard-link sync per the strategy's `Implementation/verification command contract`).
- Files owned by Mid Red (new): `tests/agents-snapshot.test.mjs`. This file imports the not-yet-existing `lib/agents-snapshot.mjs` so Red fails for the expected missing-module reason. No production stub was created.
- Files owned by Mid Red (modified): `measure/tracks/controlled_harness_evolution_20260714/plan.md` (this evidence section only).
- Production modules touched: **none** — Mid Red stays out of `lib/`, `extensions/`, `scripts/`, `agents/`, `package.json`, `measure/workflow.md`, and any external agent directory (`~/.config/opencode/agent`, `~/.agents/agents`, `~/Desktop/pi-measure-harness/agents`, `~/Desktop/measure/agents`).
- Live directories preserved (Mid Red is non-destructive): every `tests/fixtures/s1/*` fixture was untouched, every `Desktop/measure/agents/*.md` obsolete file was left in place, and every target directory's inode table was untouched. Jr Green performs the destructive pre-sync deletion and the hard-link sync per the strategy contract.

#### S1.3b sub-tasks (mirror of `test-strategy.md#phase-s1.agents-snapshot — Required Red/Green test surfaces`)

- [ ] Sub-task S1.3b.1: constants exported (27 / 13 / regex positive+negative).
- [ ] Sub-task S1.3b.2: default directory constants + env overrides (`OPENCODE_AGENT_DIR`, `OPENCODE_AGENTS_TARGET_DIRS`, `OPENCODE_MEASURE_ONLY_DIR`).
- [ ] Sub-task S1.3b.3: live-behavior — full-mirror filename parity (no missing, no extra) across `DEFAULT_FULL_MIRROR_DIRS`.
- [ ] Sub-task S1.3b.4: live-behavior — measure-only filename parity (exact 13, every entry matches `MEASURE_ONLY_PATTERN`).
- [ ] Sub-task S1.3b.5: live-behavior — content parity (sha256) per shared filename, source ↔ each target.
- [ ] Sub-task S1.3b.6: live-behavior — hard-link relationship (`stat(...).dev` and `stat(...).ino` equal; `lstat(...).isSymbolicLink() === false`).
- [ ] Sub-task S1.3b.7: structured error — missing file → `missing_file:<path>`.
- [ ] Sub-task S1.3b.8: structured error — extra file (full mirror + measure-only) → `extra_file:<path>`, no tolerated-warning surface for non-measure residue.
- [ ] Sub-task S1.3b.9: structured error — content mismatch → `content_mismatch:<path>`.
- [ ] Sub-task S1.3b.10: structured error — not_hard_link → `not_hard_link:<path>:<dev>:<ino>`.
- [ ] Sub-task S1.3b.11: structured error — cross-filesystem failure via `classifyLinkError({code:'EXDEV'|'EPERM'|'EROFS'})`.
- [ ] Sub-task S1.3b.12: deterministic output (byte-identical JSON across repeated calls).
- [ ] Sub-task S1.3b.13: anti-pattern A4 strengthening — empty source → `empty_source:<path>` (no vacuous pass).
- [ ] Sub-task S1.3b.14: anti-pattern A8 strengthening — symlink-only target → `symlink_detected:<path>` (no dev+ino inheritance bypass).
- [ ] Sub-task S1.3b.15: surface-symbol probe — `compareHardLinkInventory` and `formatSnapshotError` exported; `formatSnapshotError` is deterministic and contains no timestamps.

---


## Phase S2: Deterministic sprint orchestration
_Story ref: spec.md#story-s2_

- [ ] Task S2.1: Define machine-readable sprint, story, role-result, transition, and scope-change schemas.
  - [ ] Model readiness, dependency, baseline, result artifact, retry, acceptance, carryover, and human-gated states.
  - [ ] Define transition preconditions and terminal states.
- [ ] Task S2.2: Write failing state-machine tests.
  - [ ] Cover ready/not-ready stories, invalid results, stale audits, remediation invalidation, concurrent review isolation, resume, and scope changes.
- [ ] Task S2.3: Implement durable run state storage and reconstruction.
  - [ ] Keep state independent of Pi session compaction and child-process output prose.
  - [ ] Ensure writes are atomic and contain no credentials.
- [ ] Task S2.4: Implement deterministic dispatch and gate routing.
  - [ ] Derive the next permitted role from durable state, schemas, and declared applicability.
  - [ ] Bind dispatch to immutable baselines and isolated result paths.
- [ ] Task S2.5: Implement review invalidation and bounded remediation routing.
  - [ ] Prevent stale audits from passing after a changed implementation HEAD.
  - [ ] Record each retry's failure classification and target role.
- [ ] Task S2.6: Implement scope-change recording and story carryover decisions.
  - [ ] Require capacity effect and approval evidence for additions or removals.
- [ ] Task S2.7: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.
- [ ] Task S2.8: Run correctness, security, and UX/API reviews as applicable; remediate blockers.
- [ ] Task S2.9: Accept S2 only with a revision-bound acceptance result.

---

## Phase S3: Evidence and evaluation telemetry
_Story ref: spec.md#story-s3_

- [ ] Task S3.1: Define telemetry, failure-classification, privacy, and retention schemas.
  - [ ] Separate minimum provenance from optional detailed telemetry.
  - [ ] Define explicit prohibited fields, including credentials and raw project payloads by default.
- [ ] Task S3.2: Define an evaluation corpus format and frozen replay fixture contract.
  - [ ] Include expected dispatch, rejection, retry, and promotion decisions.
- [ ] Task S3.3: Write failing tests for receipt enrichment, redaction, failure classification, and corpus replay.
- [ ] Task S3.4: Implement event capture and privacy-preserving aggregation.
  - [ ] Correlate downstream findings to missed upstream roles without exposing project content globally.
- [ ] Task S3.5: Implement local evaluation replay and quality-first comparison summaries.
  - [ ] Block a candidate when safety or quality regresses even if it is cheaper or faster.
- [ ] Task S3.6: Document opt-in/opt-out controls and minimum required provenance.
- [ ] Task S3.7: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.
- [ ] Task S3.8: Run independent privacy/security review and accept S3 with revision-bound evidence.

---

## Phase S4: Curated learning and safe revision
_Story ref: spec.md#story-s4_

- [ ] Task S4.1: Define incident, lesson, promotion-candidate, improvement-proposal, and approval schemas.
  - [ ] Require applicability, non-applicability, evidence, scope, risk tier, and rollback target.
- [ ] Task S4.2: Define meta-role boundaries and candidate isolation.
  - [ ] Specify reflector, Harness Red, Harness Green, reviewer, promoter, and rollback responsibilities.
  - [ ] Prohibit any role from approving a change to its own active policy or audit subject.
- [ ] Task S4.3: Write failing tests for lesson promotion, candidate isolation, approval gates, and guard weakening.
- [ ] Task S4.4: Implement local incident capture and project-to-framework promotion workflow.
  - [ ] Keep project lessons local until generalization criteria are satisfied.
- [ ] Task S4.5: Implement isolated candidate assembly and evaluation requirements.
  - [ ] Pin active runs to their starting version and prevent candidate writes from changing them.
- [ ] Task S4.6: Implement risk-tier approval enforcement.
  - [ ] Require human approval for routing changes and stronger approval for permissions, gates, constitution, and promotion mechanisms.
- [ ] Task S4.7: Add regression evaluators for every accepted framework-wide lesson or anti-pattern.
- [ ] Task S4.8: Run focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.
- [ ] Task S4.9: Run independent correctness, security, and orchestrator-infrastructure audits; remediate blockers.
- [ ] Task S4.10: Accept S4 only with revision-bound evidence.

---

## Phase S5: Canary promotion and rollback
_Story ref: spec.md#story-s5_

- [ ] Task S5.1: Define candidate comparison thresholds, canary-selection schema, promotion record, and rollback contract.
  - [ ] Include blocking quality/safety thresholds and explicit behavior for insufficient evidence.
- [ ] Task S5.2: Write failing tests for replay comparison, version pinning, canary isolation, promotion refusal, and rollback.
- [ ] Task S5.3: Implement candidate replay evaluation and decision summaries.
  - [ ] Compare candidate and active versions against the same frozen corpus.
- [ ] Task S5.4: Implement selected-run canary dispatch and version pinning.
  - [ ] Ensure active workflows continue using their initial version.
- [ ] Task S5.5: Implement promotion and tested rollback to last known-good version.
  - [ ] Stop promotion when a blocking threshold fails.
- [ ] Task S5.6: Add model-routing evaluation hooks without automatic route changes on sparse or conflicting evidence.
- [ ] Task S5.7: Run end-to-end canary simulation, focused tests, `npm run check`, `npm test`, and `npm run parity`; record evidence.
- [ ] Task S5.8: Run final acceptance and closeout preparation; carry unresolved work to a new track rather than claiming completion.

---

## Cross-Cutting Completion Tasks

- [ ] Task C1: Update package README and operator documentation as each externally visible behavior becomes available.
- [ ] Task C2: Maintain project-level lessons and tech debt; promote only framework-general, evidence-backed lessons.
- [ ] Task C3: Before closeout, run the full regression corpus and verify that existing task receipts and agent snapshots still parse or have an explicit migration path.
- [ ] Task C4: Record sprint demo evidence, scope deviations, carryover decisions, and retrospective outcomes in metadata before archival.

# Specification: Controlled Evolution of the Pi Measure Orchestration Harness

## Overview

Evolve Pi Measure Harness from a role-prompt and child-process wrapper into a versioned control plane for general, sprint-driven development. The harness must coordinate roles through deterministic, evidence-bound transitions; learn from outcomes without importing project-specific policy; and improve itself only through isolated, evaluated, reversible releases.

This is a framework track. It must not encode any particular product domain, repository layout, owner name, test command, or development stack. Projects supply that information through their own Measure context and explicit run configuration.

## Stories

### Story S1: Versioned harness foundation
**As a** harness operator
**I want** one versioned, internally consistent definition of extension behavior, agents, skills, contracts, and marker grammar
**So that** every run is reproducible and drift is rejected before orchestration begins.

**Acceptance Criteria:**
- Given a harness release, When a run starts, Then its receipt identifies the harness version and stable hashes for the loaded extension, agent definitions, skills, and contract schema.
- Given source copies disagree on a role, schema, marker vocabulary, referenced file, or permission policy, When preflight runs, Then it reports the exact conflict and blocks execution before a child role starts.
- Given a plan is parsed, When it uses the published marker grammar, Then pending, in-progress, complete, and structured human-gated tasks are interpreted identically by the extension, checker, skills, and agents.
- Given legacy plans use an older supported grammar, When the new grammar is introduced, Then a documented migration or compatibility path preserves their meaning and does not silently mark work complete.
- Given a change attempts to alter a constitutional invariant, Then it requires the documented elevated approval path.

**Estimate:** L
**Priority:** Must

### Story S2: Deterministic sprint orchestration
**As a** developer running a sprint
**I want** the extension to own the workflow state machine for stories, roles, gates, retries, and resumes
**So that** prompt ambiguity cannot advance work or lose state.

**Acceptance Criteria:**
- Given a sprint configuration with stories and dependencies, When orchestration begins, Then the extension selects only ready stories and records an immutable baseline for each execution unit.
- Given a role finishes, When its structured result is malformed, stale, unauthorized, or tied to the wrong baseline, Then the extension rejects the transition and records a classified failure.
- Given independent review roles are applicable, When Green work is committed, Then the extension can run them concurrently with isolated result paths and the same audited HEAD.
- Given remediation changes the implementation HEAD, When prior reviews are reconsidered, Then the extension invalidates stale results and schedules only the required reruns.
- Given Pi or the harness process stops, When it resumes, Then it reconstructs the same next permitted action from durable state without rerunning accepted work.
- Given a mid-sprint request changes scope, When it is classified as clarification, defect, addition, removal, or re-estimate, Then the decision and capacity effect are recorded before the story state changes.

**Estimate:** XL
**Priority:** Must

### Story S3: Evidence and evaluation telemetry
**As a** harness maintainer
**I want** structured, privacy-conscious evidence and repeatable evaluation scenarios
**So that** quality, cost, and failure patterns can guide improvements.

**Acceptance Criteria:**
- Given any role invocation, When it starts and ends, Then the harness records its role, model, version identifiers, baseline and output revisions, duration, token/cost usage when available, gate outcomes, retry count, and failure classification without storing credentials.
- Given a downstream review finds a defect, When the defect is routed, Then the record links the missed upstream role and the evidence that exposed it.
- Given a framework incident, When it is accepted as a regression, Then it is represented as a deterministic replay fixture or evaluator with expected outcomes.
- Given metric reporting, When quality and efficiency conflict, Then quality regressions prevent a candidate from being promoted even if cost or duration improves.
- Given a project opts out of detailed telemetry, When a run executes, Then minimum provenance and safety evidence remain while optional payload collection is disabled.

**Estimate:** L
**Priority:** Must

### Story S4: Curated learning and safe revision
**As a** framework maintainer
**I want** a controlled path from repeated incidents to reviewed candidate improvements
**So that** the harness learns without silently changing its own safeguards.

**Acceptance Criteria:**
- Given a project-level incident, When it is recorded, Then it remains local unless a reflection process shows that the cause is framework-wide and can be expressed without project-specific content.
- Given a proposed framework lesson, When it is promoted, Then it references evidence, scope, applicability, non-applicability, and either a regression evaluator or an explicit reason one is not feasible.
- Given a candidate harness change, When it is generated, Then it is created in an isolated candidate version and does not alter the active run's extension, agents, skills, or contracts.
- Given a candidate changes a prompt, schema, routing policy, permission, gate, or promotion mechanism, Then its risk tier determines the required independent review and human approval.
- Given a candidate weakens an existing guard without replacing its protection, When evaluation runs, Then promotion is rejected.
- Given a framework improvement is accepted, When released, Then its provenance links the incident, proposal, patch, evaluations, reviewers, approvals, and rollback target.

**Estimate:** XL
**Priority:** Must

### Story S5: Canary promotion and rollback
**As a** harness operator
**I want** candidate versions to be replayed, canaried, promoted, and rolled back safely
**So that** self-improvement produces measurable gains rather than systemic regressions.

**Acceptance Criteria:**
- Given a candidate version and a frozen evaluation corpus, When shadow evaluation runs, Then the system compares it to the active version using defined quality and safety thresholds.
- Given a candidate passes replay evaluation, When it enters a canary, Then only explicitly selected new runs use it and all canary evidence is separately labeled.
- Given a canary violates a blocking threshold, When the violation is detected, Then the harness stops further promotion and restores the last known-good version through a tested rollback procedure.
- Given a version is promoted, When a later run begins, Then the new run pins the promoted version while already-running workflows remain pinned to their starting version.
- Given model routing is tuned, When performance data is insufficient or conflicts across roles, Then the harness preserves the current route and requests review rather than optimizing on anecdote.

**Estimate:** L
**Priority:** Should

## Non-Functional Requirements

- Backward compatibility must be explicit and tested for existing agent snapshots, task receipts, and supported plan formats.
- The extension is the canonical state-transition authority; agents may propose but cannot assert transition success through prose alone.
- Every mutable policy has a documented owner, version, risk tier, and rollback route.
- Audit-only roles remain unable to repair the subject they audit.
- All framework-level lessons and policies must remain project-neutral.
- The system must fail closed on evidence validation, authorization, and version mismatch.

## Track-Level Acceptance Criteria

1. A release manifest and preflight checker detect all defined source-of-truth drift before dispatch.
2. A documented marker grammar is implemented consistently or migration compatibility is mechanically tested.
3. A durable state machine can resume a partially completed sprint without accepting prose-only or stale results.
4. Story readiness, scope-change, review applicability, remediation, and acceptance transitions are represented in machine-readable state.
5. Telemetry supports quality-first candidate comparison without collecting credentials or requiring project-specific data.
6. A documented and tested meta-workflow turns evidence into isolated, independently reviewed candidate changes.
7. Candidate versions undergo replay evaluation and canary controls before promotion, with tested rollback.
8. The existing package checks and tests remain green, and new focused tests cover all new extension behavior.

## Out of Scope

- Automatic product prioritization, product requirements generation, or autonomous business decisions.
- Universal sprint-length enforcement, daily stand-ups, or organization-specific ceremonies.
- Cross-project portfolio planning, staffing, or external project-management integrations.
- Autonomous approval of permission expansion, gate weakening, constitutional changes, or promotion-mechanism changes.
- Training or fine-tuning foundation models.
- Capturing raw prompts, source code, credentials, or project data in framework-wide telemetry by default.
- Replacing the existing Measure methodology in unrelated repositories without an explicit adoption and migration track.

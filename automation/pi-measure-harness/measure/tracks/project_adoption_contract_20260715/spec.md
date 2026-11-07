# Specification: Project Adoption & Run-Configuration Contract

## Overview

The harness must run on arbitrary project repositories while keeping all domain knowledge in the project, not the framework. Today there is no defined contract for how a project supplies its context: which commands verify work, where Measure context lives, which gates apply, and what the harness may read or write. This track defines that contract as a versioned, validated run configuration plus the trust-boundary rules for loading project-local resources, and proves it with a reference adoption on a neutral fixture repository.

This is a framework track. It must not encode any particular product domain, repository layout, owner name, test command, or development stack.

## Stories

### Story S1: Run-configuration schema and validation
**As a** project maintainer adopting the harness
**I want** a documented, versioned run-configuration file that declares my project's commands, gates, and context paths
**So that** the harness can orchestrate work without hard-coded knowledge of my repository.

**Acceptance Criteria:**
- Given a project with a valid run configuration, When the harness loads it, Then it resolves declared verify/build/test commands, gate definitions, and Measure context paths without consulting framework defaults for project specifics.
- Given a run configuration with unknown fields, wrong types, or a missing required field, When validation runs, Then it fails closed with a structured diagnostic naming the exact field and violation.
- Given a configuration whose declared commands or paths do not exist, When preflight runs, Then it reports each unresolvable entry and blocks orchestration before any child role starts.
- Given the schema version in the configuration is unsupported, When validation runs, Then it rejects the configuration with a documented migration or compatibility path.

**Estimate:** M
**Priority:** Must

### Story S2: Trust-boundary project resource loading
**As a** harness operator
**I want** project-local resources to load only through Pi's trust model
**So that** adopting the harness in one repository cannot escalate permissions or leak into another.

**Acceptance Criteria:**
- Given a project-local resource (agent overlay, skill, gate script), When the repository is not trusted by Pi, Then the harness refuses to load it and records the refusal.
- Given a project resource attempts to widen role permissions beyond the harness policy, When it is loaded, Then the attempt is rejected and classified as a policy violation.
- Given project resources reference paths outside the repository root, When they are resolved, Then resolution fails closed.
- Given two projects with conflicting run configurations, When runs execute, Then each run uses only its own repository's configuration and no state crosses over.

**Estimate:** M
**Priority:** Must

### Story S3: Reference adoption and operator documentation
**As a** prospective adopter
**I want** a worked reference adoption and an adoption guide
**So that** I can evaluate and adopt the harness without reading its source.

**Acceptance Criteria:**
- Given the neutral fixture repository, When the documented adoption steps are followed, Then a full Red→Green→review cycle runs to completion using only the published contract.
- Given the adoption guide, When a required decision is needed (commands, gates, trust), Then the guide states the decision, its default, and its failure behavior.
- Given the reference adoption completes, When its receipts are inspected, Then they demonstrate provenance binding to both the harness version and the fixture repository revision.

**Estimate:** M
**Priority:** Should

## Non-Functional Requirements

- The contract surface is project-neutral: every project-specific value arrives through the run configuration, never through framework code.
- Validation and loading fail closed; an invalid configuration produces zero child-process spawns.
- The run-configuration schema is versioned and pinned by the harness release manifest.
- All diagnostics are structured and machine-readable, consistent with the harness's evidence rules.

## Track-Level Acceptance Criteria

1. A versioned run-configuration schema exists with validators covering required fields, unknown fields, type errors, and unresolvable commands or paths.
2. Trust-boundary tests prove untrusted, permission-widening, and path-escaping project resources are refused.
3. A neutral fixture repository completes a full orchestrated cycle using only the published contract.
4. An adoption guide documents every required decision, default, and failure behavior.
5. The existing package checks and tests remain green, and new focused tests cover all new behavior.

## Out of Scope

- Automatic generation of a project's run configuration from repository inspection.
- Migration of existing Measure repositories in other directories (a separate adoption/migration track per the evolution track's out-of-scope boundary).
- Organization-specific ceremony, templates, or policy defaults.
- GUI or web-based configuration tooling.

# Specification: Trust-Boundary & Fail-Closed Security Verification

## Overview

The harness's non-functional requirements promise fail-closed behavior: stale, malformed, or unauthorized results cannot advance a workflow; receipts and telemetry never contain credentials; project-local resources load only through the trust model. These promises are currently asserted by design documents, not by a dedicated adversarial test surface. This track builds that surface: a documented threat model, a corpus of adversarial fixtures, and a security test suite that attacks the harness's transition, evidence, and permission boundaries.

This is a framework track. It must not encode any particular product domain, repository layout, owner name, test command, or development stack.

## Stories

### Story S1: Threat model and adversarial fixture corpus
**As a** harness maintainer
**I want** a documented threat model and a versioned corpus of adversarial inputs
**So that** security claims are tested against explicit, enumerable abuse cases rather than ad-hoc probes.

**Acceptance Criteria:**
- Given the orchestration architecture, When the threat model is written, Then it enumerates trust boundaries (extension, child roles, project resources, durable state, receipts) and the abuse cases for each.
- Given the abuse-case catalog, When fixtures are built, Then each abuse case has a deterministic, self-contained fixture (malformed results, stale baselines, wrong-authority results, replayed receipts, path escapes, credential-shaped payloads).
- Given the corpus, When a new abuse class is discovered in review or incident, Then adding it requires only a new fixture and an expected-outcome entry.

**Estimate:** M
**Priority:** Must

### Story S2: Fail-closed abuse-case verification
**As a** harness operator
**I want** mechanical proof that every abuse case is rejected and classified
**So that** no unauthorized, malformed, or stale input can advance or corrupt a workflow.

**Acceptance Criteria:**
- Given a malformed or schema-violating role result, When it is submitted, Then the transition is rejected, the failure is classified, and durable state is byte-identical to its pre-attack value.
- Given a result bound to a stale or foreign baseline, When it is submitted, Then it is rejected with a version-mismatch classification and no rerun of accepted work occurs.
- Given a result from a role lacking authority for the transition, When it is submitted, Then it is rejected and recorded as an authorization violation.
- Given a replayed or duplicated receipt, When it is submitted, Then it is detected and rejected without corrupting the receipt log.
- Given durable state that was tampered with out-of-band, When the harness next loads it, Then the tampering is detected and the run halts with a structured diagnostic.

**Estimate:** L
**Priority:** Must

### Story S3: Credential and payload leak guards
**As a** project maintainer
**I want** proof that receipts, telemetry, and logs cannot carry credentials or prohibited payloads
**So that** running the harness on my repository never exfiltrates secrets.

**Acceptance Criteria:**
- Given role output containing credential-shaped content (tokens, keys, passwords in documented formats), When receipts and telemetry are written, Then the prohibited content is redacted or the write fails closed, per the privacy schema.
- Given the full receipt and telemetry surface, When the leak-guard suite runs, Then every prohibited field in the privacy schema is covered by at least one test.
- Given a project opts out of detailed telemetry, When a run executes, Then tests prove only minimum provenance is recorded and optional payloads are absent.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- Every abuse-case test asserts both rejection and the absence of side effects; a rejected transition that still mutates state is a failing test.
- Fixtures are deterministic, project-neutral, and self-contained; they never read live project data or the active plan.
- The security suite runs in the normal package test gate, not as an optional job.
- Findings that expose real vulnerabilities are fixed before the track closes; none are deferred as accepted risk without a recorded human decision.

## Track-Level Acceptance Criteria

1. A threat model documents every trust boundary and its abuse cases, and each abuse case maps to at least one fixture and test.
2. The abuse-case suite proves fail-closed rejection with zero side effects for malformed, stale, unauthorized, replayed, and tampered inputs.
3. Leak-guard tests cover every prohibited field in the privacy schema, including credential-shaped content and telemetry opt-out.
4. The existing package checks and tests remain green with the security suite included in the default test gate.
5. Any real vulnerability found during the track is fixed and covered by a regression test before closeout.

## Out of Scope

- Penetration testing of Pi itself or of the Node.js runtime.
- Supply-chain auditing of third-party dependencies (dependency pinning/auditing is separate hygiene).
- Secret scanning of project repositories (the guard surface is harness-produced artifacts only).
- Runtime intrusion detection or monitoring.

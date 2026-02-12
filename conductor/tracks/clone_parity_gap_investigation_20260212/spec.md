# Specification: Track 9 - Clone Parity Gap Investigation & Recovery Plan

## Overview
This track establishes an explicit, evidence-based parity audit against the project's stated goal: cloning core operator capabilities from Prowlarr, Sonarr, Radarr, and Bazarr into Mediarr.

The output is not vague commentary. It is a reproducible gap register with severity scoring, source references, runtime verification evidence, and a concrete remediation roadmap that can be executed as follow-up tracks.

## Functional Requirements

### FR-1: Canonical Parity Matrix and Classification Rubric
- Define a canonical capability matrix spanning:
  - **Prowlarr parity**: indexer definitions ingestion, dynamic config contracts, capability-driven forms, test/connectivity diagnostics, search behavior.
  - **Sonarr parity**: series add/monitor/search/wanted/import operational flows and state transitions.
  - **Radarr parity**: movie add/monitor/search/wanted/import operational flows and state transitions.
  - **Bazarr parity**: subtitle inventory, variant-level language state, manual search/download/history behavior.
- Define mutually exclusive status classes per capability:
  - `PARITY_IMPLEMENTED`
  - `PARTIAL_IMPLEMENTATION`
  - `SCAFFOLDED_ONLY`
  - `PLACEHOLDER_ONLY`
  - `MISSING`
  - `REGRESSION`
- Every classification entry must include evidence references:
  - code path(s)
  - relevant tests
  - runtime verification notes
  - confidence level

### FR-2: Backend Contract and Runtime Parity Audit
- Audit all backend API surfaces used by clone-critical workflows and classify parity level.
- Verify contract realism (not only handler existence):
  - request/response shapes
  - validation behavior
  - error taxonomy consistency
  - operational side effects
- Explicitly investigate metadata search prerequisites and requirements:
  - TV metadata path behavior vs Sonarr baseline
  - Movie metadata path behavior vs Radarr baseline
  - API key requirements and failure modes
- Explicitly investigate indexer definition plumbing end-to-end:
  - definition source loading
  - runtime availability in `IndexerFactory`
  - create/update route compatibility with definition-driven settings

### FR-3: Frontend Capability Parity Audit
- Audit each operator-facing surface for functional parity and operational completeness:
  - Dashboard
  - Activity
  - Settings
  - Indexers
  - Add Media
  - Wanted / Release Search / Grab
  - Queue
  - Subtitles
  - Library (movies + series)
- For each surface, classify:
  - fully functional
  - partially functional
  - scaffold-only
  - placeholder
- Record exact user-impacting missing behaviors and blocking defects.

### FR-4: Test Truthfulness and Coverage Integrity Audit
- Produce a layer-by-layer test map:
  - unit tests (mock-heavy)
  - integration tests (real dependencies)
  - contract tests
  - end-to-end tests
- Quantify mock dependence for clone-critical flows and identify blind spots where mocked success can mask runtime failure.
- Define minimum verification bars required before a capability may be labeled as parity-implemented.

### FR-5: Gap Severity Scoring and Remediation Backlog
- Create a severity model with at least:
  - `P0` (blocks core clone workflow)
  - `P1` (major operator impairment)
  - `P2` (important but non-blocking parity gap)
  - `P3` (polish/consistency debt)
- Produce a prioritized remediation backlog with:
  - issue statement
  - affected domains/routes/files
  - recommended implementation track
  - verification criteria
  - estimated execution order/dependencies

### FR-6: Conductor Realignment Outputs
- Convert audit findings into execution-ready Conductor actions:
  - dependency updates for existing tracks where needed
  - explicit gating rules (e.g., hardening cannot be declared complete before unresolved P0/P1 parity blockers are closed)
  - recommended new follow-up tracks for domain-specific parity closure

## Non-Functional Requirements
- **Auditability:** Every finding must be reproducible from repository state with concrete references.
- **Determinism:** Findings must distinguish assumptions vs verified behavior.
- **Completeness:** All clone-critical surfaces are covered; no "unknown" category left untriaged.
- **Traceability:** Each remediation item maps directly to one or more parity findings.

## Acceptance Criteria
- [ ] A complete parity matrix exists covering Prowlarr/Sonarr/Radarr/Bazarr capability domains and Mediarr equivalents.
- [ ] Every matrix entry has an explicit status class and supporting evidence references.
- [ ] Indexer definition pipeline parity is explicitly evaluated end-to-end, including runtime wiring.
- [ ] Metadata search/API-key behavior is explicitly evaluated and compared against Sonarr/Radarr expectations.
- [ ] Frontend surfaces are classified by actual functional completeness, not route presence.
- [ ] Test-truthfulness report quantifies mock-heavy coverage blind spots for critical workflows.
- [ ] Severity-scored gap register is produced with P0-P3 classification.
- [ ] A prioritized remediation backlog is produced with concrete verification criteria for each item.
- [ ] Conductor execution guidance is produced, including hardening gating recommendations.
- [ ] Findings are reproducible by a new session using documented commands and references.

## Out of Scope
- Implementing all remediation fixes in this track.
- Broad architecture rewrites unrelated to identified parity gaps.
- Feature expansion outside parity closure scope.

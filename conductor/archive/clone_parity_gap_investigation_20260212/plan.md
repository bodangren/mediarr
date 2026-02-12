# Implementation Plan: Track 9 - Clone Parity Gap Investigation & Recovery Plan

## Phase 1: Audit Framework, Scope Baseline, and Evidence Schema
Create deterministic audit scaffolding so findings are consistent, reviewable, and reproducible.

- [x] Task: Write Tests: Add failing tests for parity matrix schema and status taxonomy.
  - [x] Sub-task: Add failing tests asserting required status classes (`PARITY_IMPLEMENTED`, `PARTIAL_IMPLEMENTATION`, `SCAFFOLDED_ONLY`, `PLACEHOLDER_ONLY`, `MISSING`, `REGRESSION`).
  - [x] Sub-task: Add failing tests asserting each matrix entry requires domain, capability, status, severity, evidence references, and verification notes.
  - [x] Sub-task: Add failing tests asserting each finding includes an explicit confidence marker (`high`/`medium`/`low`) and rationale.
- [x] Task: Implement parity matrix schema and audit rubric artifacts.
  - [x] Sub-task: Create canonical matrix template artifact under this track folder for Prowlarr/Sonarr/Radarr/Bazarr capability mapping.
  - [x] Sub-task: Create scoring rubric artifact for severity (`P0`-`P3`) with precise definitions and examples.
  - [x] Sub-task: Create audit execution template capturing command, timestamp, observed output summary, and linked evidence paths.
- [x] Task: Define clone-critical capability baseline.
  - [x] Sub-task: Enumerate target capabilities for indexers, media add/search, wanted/release, queue, subtitles, dashboard/activity/settings, and import lifecycle.
  - [x] Sub-task: Map each target capability to expected parity source behavior (Prowlarr/Sonarr/Radarr/Bazarr).
  - [x] Sub-task: Mark each capability with investigation owner/status placeholders for downstream phases.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Audit Framework, Scope Baseline, and Evidence Schema' (Protocol in workflow.md).

## Phase 2: Backend Parity Investigation (Contracts, Runtime, and Integrations)
Assess whether backend behavior meets clone parity, not merely route existence.

- [x] Task: Write Tests: Add failing backend parity probe tests for clone-critical contracts.
  - [x] Sub-task: Add failing tests for indexer management contract realism (create/update/test with definition-aware expectations).
  - [x] Sub-task: Add failing tests for metadata search behavior (TV and movie paths, missing-key and configured-key scenarios).
  - [x] Sub-task: Add failing tests for release search/grab side effects (queue handoff + activity events).
  - [x] Sub-task: Add failing tests for subtitle variant operations contract requirements and variant scoping.
- [x] Task: Implement backend parity probes and evidence capture.
  - [x] Sub-task: Execute probe suite against running API using real runtime wiring (no MSW substitution).
  - [x] Sub-task: Capture evidence for definition loader plumbing vs runtime factory wiring.
  - [x] Sub-task: Capture evidence for metadata provider behavior and API key requirements compared with clone goals.
  - [x] Sub-task: Record contract mismatches, partial implementations, and regressions in matrix artifacts.
- [x] Task: Produce backend findings report.
  - [x] Sub-task: Classify each backend capability with parity status and severity.
  - [x] Sub-task: Attach concrete file references and failing/passing probe references for each finding.
  - [x] Sub-task: Identify top P0/P1 blockers requiring immediate remediation tracks.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Backend Parity Investigation (Contracts, Runtime, and Integrations)' (Protocol in workflow.md).

## Phase 3: Frontend Parity Investigation (Operator Workflows and UX Completeness)
Determine true operator-facing completeness of each UI surface against clone intent.

- [x] Task: Write Tests: Add failing checks for placeholder/scaffold detection and route-to-capability completeness.
  - [x] Sub-task: Add failing checks that identify explicit placeholder/staged messaging on critical surfaces.
  - [x] Sub-task: Add failing checks for missing interactions required by clone workflows (e.g., dynamic indexer contract fields, queue controls, subtitle operations).
  - [x] Sub-task: Add failing checks for dashboard/activity/settings parity requirements from Track 7E spec.
- [x] Task: Execute frontend parity walkthroughs with evidence capture.
  - [x] Sub-task: Run scripted walkthroughs for indexer add/edit/test, add media, wanted search+grab, queue operations, subtitle operations, and settings workflows.
  - [x] Sub-task: Record where UI is fully functional vs partial vs scaffold-only vs placeholder.
  - [x] Sub-task: Capture concrete breakpoints (missing actions, wrong validation model, absent data, non-functional links).
  - [x] Sub-task: Map each gap to corresponding backend capability and track requirement.
- [x] Task: Produce frontend findings report.
  - [x] Sub-task: Publish per-route parity summaries with severity and evidence links.
  - [x] Sub-task: Identify cross-cutting UX regressions that impact multiple clone domains.
  - [x] Sub-task: Identify immediate user-visible blockers that must precede hardening work.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Frontend Parity Investigation (Operator Workflows and UX Completeness)' (Protocol in workflow.md).

## Phase 4: Test Truthfulness and Validation Integrity Audit
Quantify where tests provide confidence and where they mask runtime gaps.

- [x] Task: Write Tests: Add failing tests for coverage integrity and mock-dependence metrics.
  - [x] Sub-task: Add failing tests to compute per-surface ratio of mocked tests vs runtime/integration validation.
  - [x] Sub-task: Add failing tests asserting each clone-critical flow has at least one non-mocked verification path.
  - [x] Sub-task: Add failing tests asserting track claims cannot be marked parity-complete without required verification class coverage.
- [x] Task: Implement test integrity analyzers and reports.
  - [x] Sub-task: Build analysis output for `app` and root tests, including `vi.mock` usage concentration by surface.
  - [x] Sub-task: Build analysis output for backend contract/integration coverage by route group.
  - [x] Sub-task: Publish confidence ratings per capability based on verification depth.
- [x] Task: Produce validation integrity findings.
  - [x] Sub-task: Identify high-risk false-confidence zones (tests passing while runtime parity is missing).
  - [x] Sub-task: Define minimum validation gates for declaring parity in future tracks.
  - [x] Sub-task: Map required additional test layers (contract/integration/e2e) per critical flow.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Test Truthfulness and Validation Integrity Audit' (Protocol in workflow.md).

## Phase 5: Remediation Roadmap, Track Realignment, and Delivery Gating
Turn findings into a precise execution program that closes parity gaps in a controlled order.

- [x] Task: Write Tests: Add failing tests for remediation backlog schema and dependency consistency.
  - [x] Sub-task: Add failing tests asserting each remediation item includes owner track, severity, prerequisites, and verification exit criteria.
  - [x] Sub-task: Add failing tests asserting every P0/P1 finding maps to an explicit remediation action.
  - [x] Sub-task: Add failing tests asserting hardening gates reference unresolved parity blockers.
- [x] Task: Implement remediation backlog and execution sequencing.
  - [x] Sub-task: Generate prioritized remediation backlog grouped by domain (Prowlarr/Sonarr/Radarr/Bazarr parity).
  - [x] Sub-task: Propose updates to existing track sequencing/dependencies where required by findings.
  - [x] Sub-task: Define hardening gate policy tying 7F execution/completion to closure of parity-critical blockers.
  - [x] Sub-task: Define candidate follow-up tracks for unresolved high-severity parity gaps.
- [x] Task: Produce final investigation package.
  - [x] Sub-task: Publish consolidated findings summary with counts by status/severity and top blockers.
  - [x] Sub-task: Publish command log and evidence index for reproducibility in a fresh session.
  - [x] Sub-task: Publish recommended "first remediation sprint" scope and explicit success criteria.
- [x] Task: Conductor - User Manual Verification 'Phase 5: Remediation Roadmap, Track Realignment, and Delivery Gating' (Protocol in workflow.md).

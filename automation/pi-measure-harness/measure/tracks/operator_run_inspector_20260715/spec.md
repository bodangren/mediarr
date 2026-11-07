# Specification: Operator Run Inspector

## Overview

The harness records durable state, task receipts, and child-process event logs, but there is no supported way for an operator to inspect them. Today, answering "what is this run doing, what failed, and why" means reading raw JSONL. This track adds a read-only inspection surface (CLI first) over durable harness state so operators can audit runs, failures, and promotion decisions without touching orchestration internals.

This is a framework track. It must not encode any particular product domain, repository layout, owner name, test command, or development stack.

## Stories

### Story S1: Run and story state inspection
**As a** harness operator
**I want** to list runs and inspect the state of stories, roles, gates, and retries
**So that** I can see exactly where a workflow stands and what it is permitted to do next.

**Acceptance Criteria:**
- Given durable run state exists, When the operator lists runs, Then each run shows its harness version, repository revision, current story states, and the next permitted action derived from the same state the extension uses.
- Given a run resumed after interruption, When inspected, Then the displayed state matches what the orchestrator reconstructed, with no divergence between inspector and dispatcher views.
- Given state is corrupted or partially written, When inspection runs, Then it reports the corruption and exits non-zero rather than guessing.
- Given a run with human-gated tasks, When inspected, Then pending gates are shown with their recorded deferral owners.

**Estimate:** M
**Priority:** Must

### Story S2: Receipt and failure-classification queries
**As a** harness maintainer
**I want** to query receipts and failure classifications by run, role, story, and failure class
**So that** quality and failure patterns are auditable without custom scripting.

**Acceptance Criteria:**
- Given recorded receipts, When queried by run, role, story, gate outcome, or failure class, Then matching receipts are returned with their provenance bindings intact.
- Given a downstream defect routed to a missed upstream role, When its record is inspected, Then the link between the defect, the missed role, and the exposing evidence is displayed.
- Given large event logs, When queries run, Then results are paginated or bounded deterministically and never load unbounded data into memory.
- Given a query against missing or malformed evidence, When executed, Then it reports the gap explicitly instead of returning silently empty results.

**Estimate:** M
**Priority:** Must

### Story S3: Operator documentation
**As a** new operator
**I want** documented inspection commands with examples
**So that** I can audit a run without reading extension source code.

**Acceptance Criteria:**
- Given the operator documentation, When a reader follows the examples against a fixture run, Then each example produces the documented output.
- Given every inspection command, When documented, Then its read-only nature and failure behavior are stated.

**Estimate:** S
**Priority:** Should

## Non-Functional Requirements

- The inspector is strictly read-only: it must be incapable of mutating run state, receipts, or configuration.
- The inspector reads the same durable state and schemas the extension uses; no parallel interpretation of state is introduced.
- Output is deterministic and machine-readable by default, with human formatting as a presentation layer only.
- Inspection never exposes credentials or prohibited payload fields, consistent with the telemetry privacy rules.

## Track-Level Acceptance Criteria

1. An operator can list runs and inspect story, role, gate, and retry state derived from the same durable state the extension uses.
2. Receipt and failure queries cover run, role, story, gate outcome, and failure class with explicit behavior for missing or malformed evidence.
3. Read-only behavior is mechanically verified (inspection attempts no writes).
4. Operator documentation examples execute against a fixture run.
5. The existing package checks and tests remain green, and new focused tests cover all new behavior.

## Out of Scope

- Any mutation of run state, retries, or promotion decisions through the inspector.
- Web dashboards, hosted monitoring, or external alerting integrations.
- Cross-project portfolio aggregation.
- Real-time streaming or watch-mode interfaces.

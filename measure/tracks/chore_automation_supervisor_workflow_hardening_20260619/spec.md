# Spec: Automation Supervisor Workflow Hardening

## Overview

Tighten the Measure automation supervisor so audit evidence, UI/UX routing,
retry behavior, closeout preflight, and post-archive artifact cleanup are
deterministic and mechanically checked.

## Requirements

1. Define a versioned audit-result JSON contract for all audit roles.
2. Make `UX_REQUIRED=auto` path routing deterministic and documented.
3. Add bounded retry and escalation guidance to supervisor feedback.
4. Strengthen closeout preflight beyond archive/registry checks.
5. Require closeout to preserve a compact manifest and delete bulky run
   artifacts after archival.
6. Keep the workflow reference and unit tests aligned with implementation.

## Acceptance Criteria

- Audit results missing required schema fields fail supervisor gates.
- UX auto mode runs only for documented user-facing paths and skips documented
  backend/docs/test/Measure-only paths.
- Gate feedback tells agents how to retry, when to stop for human judgment, and
  how to handle infrastructure/inconclusive failures.
- Closeout fails unless archived plan tasks and phase checkpoints are complete,
  metadata is marked done, the active registry is clear, and a closeout
  manifest exists.
- Track run artifacts are removed after closeout gates pass while the compact
  manifest remains in the archived track.
- `python3 -m unittest measure/test_automation_supervisor.py` passes.

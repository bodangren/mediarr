# Project Workflow

## Marker Compatibility Policy

Until the mechanical checker and all distributed skills share one canonical grammar, this project uses:

- `[ ]` pending
- `[~]` in progress
- `[x]` complete with evidence
- `[b]` human-gated, with trailing `(deferred:<owner>)`

This compatibility policy is deliberate because the current checker accepts all four markers. The active track contains work to replace this temporary compatibility policy with one versioned, mechanically enforced vocabulary; no agent may silently reinterpret markers.

## Track Workflow

1. Define falsifiable story acceptance criteria and explicit out-of-scope boundaries.
2. Capture immutable Git baselines before implementation phases.
3. Run Red, Green, review, and acceptance roles through the harness's declared ownership model.
4. Treat structured gate results, not prose, as state-transition evidence.
5. Record scope changes, retries, human gates, and deviations in the track artifacts.
6. Before closeout, capture a retrospective and promote only general, evidence-backed framework lessons.

## Definition of Done

A task is complete only when its required evidence is recorded, the applicable verification passes, and its plan marker is updated in a separate evidence commit when the workflow is executing implementation.

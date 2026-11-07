# Lessons Learned

> Curated project memory, not an append-only log. Keep this file at or below 50 lines.

## Architecture & Design

- No entries yet. Add only reusable knowledge derived from completed work in this repository.

## Recurring Gotchas

- The current distributed Measure materials disagree on the status-marker grammar. Treat the local compatibility policy in `workflow.md` as authoritative until the active track resolves and versions the canonical grammar.

## Patterns That Worked Well

- **2026-08-06 — harness_selfcheck_truthfulness_20260805 closed.** Repaired the shipped
  self-check: roster-derived parity (replaces stale 24/22 constants), fail-closed model
  resolution (removes `?? sourceModel` passthrough; surfaces 7 unmapped agents via
  `unmappedModelFindings`), and an independent `npm run test:shipped` green gate.
  - Live-state counts drift between strategy commit and Red commit when dirty working-tree
    edits add new agent files; the strategy's "live count" is a snapshot, not a guarantee.
    Subsequent phases must probe the actual current state, not the strategy's frozen number.
  - OpenAI Codex OAuth refresh tokens expire; the harness's model registry validates models
    at session start. Half the Measure subagents (jr-green, review-b, phase-acceptance,
    orchestrator-audit, closeout) become unusable when the OAuth refresh fails. Mitigation:
    re-route to subscription-backed models (minimax-cn, vocengine) and authorize deviations.
  - The orchestrator's role boundary (no direct coder delegation in Red/Green chain) breaks
    down when the canonical Measure subagents are unavailable. User-authorized deviations
    via `coder-minimax-m3` are an effective workaround when documented in deviation_notes.
  - `?? sourceModel` passthroughs in MODEL_MAP-resolving functions make predicates structurally
    unreachable. Removal of the fallback is the fix; verify the predicate is reachable after
    the fix via a live-roster probe, not just a synthetic-fixture probe.
  - Compatibility marker grammar (`[ ]` for pending) is the plan's contract until the
    canonical grammar lands. Closeout migrates to `[x]` / `[b]`; Mid/Jr do not.
  - DO NOT coexist two parity mechanisms — when an upstream track supersedes a downstream
    track's guards, the upstream track's acceptance procedure owns the retirement, not the
    downstream track's closeout.

## Planning Improvements

- No entries yet.

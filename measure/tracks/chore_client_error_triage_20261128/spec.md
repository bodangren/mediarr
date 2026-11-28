# Spec — Client-error triage loop bookkeeping

## Context

A DSH scheduled task runs every 30 minutes: read `/config/client-errors.jsonl` directly (never the
REST API), keep a high-water mark in `device-20261107/client-errors-seen.txt`, ignore `severity:
smoke`, group new records by fingerprint, and fix P0/P1 failures in the owning track.

The mark file lives in the repository, so every turn that advances it is a write outside `measure/`.
Measure-guard (correctly) refuses such writes while no task is in progress: on 2026-11-28 the mark
update from the `network` / "health check failed" record was flagged as an untracked change. This
small chore track gives that recurring bookkeeping a real, in-progress home instead of parking the
mark write under an unrelated feature track or re-marking the human-gated perceptual sign-off.

## Scope

- **In scope:** the high-water mark (advance it whenever the log grows), the triage ledger of
  fingerprints seen and their disposition (fixed / P2 / not actionable), and pointing each fix at
  the track that owns it.
- **Out of scope:** the fixes themselves. A P0/P1 fix is implemented, tested and committed under the
  owning feature track (e.g. TV Home Screen Redesign, engine-stall track), not here. This track
  never edits product code.

## Acceptance

- `device-20261107/client-errors-seen.txt` always equals the newest `receivedAt` that has been
  triaged; no record is triaged twice and none is skipped.
- Each new non-smoke fingerprint is recorded with its disposition and (if fixed) the commit and the
  track that owns it.
- The scheduled triage turn can advance the mark under this track's in-progress task without a
  Measure deviation.

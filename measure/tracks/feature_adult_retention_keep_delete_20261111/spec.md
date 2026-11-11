# Track: Adult retention — keep / delete decision after watching

> Opened 2026-11-11 at the owner's direct request: *"We need a 'keep / delete' choice after
> watching."* It supersedes the agent-decides pruning posture of the archived adult track for the
> **decision** step; the mechanical quarantine engine (`QuarantineService`) is reused unchanged.

## Problem

The adult library is ~197 items / 298 GB and grows weekly. Today the only retention surface is
`GET /api/adult/automation/retention-candidates` (a proposal list) plus the quarantine engine. Nothing
lets the owner, right after watching an item, say "keep this" or "delete this". Without that, deletion
requires a batch/agent decision the owner does not want, and the "keep" intent is not durable — a
kept item would still show up in future retention candidates.

## Requirements

- **FR-1 Decision capture:** after an item is watched (`AdultItem.isWatched`), the owner can record
  exactly one decision: **keep** or **delete**.
- **FR-2 Keep is durable:** a kept item sets `AdultItem.keep = true` and is excluded from retention
  candidates and from any future agent prune proposal. It is never deleted by automation.
- **FR-3 Delete is explicit and safe:** a delete decision runs the existing quarantine flow
  (`planQuarantine` → `executeQuarantine` → `deleteQuarantined`) for that one file, records the
  quarantine row and marks the item deleted. It is never silent: the API returns the path and the
  result, and a receipt line is appended to `/config/adult-retention-receipts.jsonl`.
- **FR-4 Undecided surface:** a list endpoint returns watched-but-undecided items (newest watched
  first) so the UI can prompt. Decision is idempotent (re-posting the same decision keeps the answer;
  changing keep → delete is allowed only explicitly).
- **FR-5 Interfaces:** the choice is reachable in the SPA `AdultLibraryPage` and on the TV client
  (adult library + after playback ends), consistent with the rest of the TV-first product.
- **FR-6 No automation deletes without a decision:** the weekly adult discovery run must not delete;
  it may only report undecided watched items.

## Acceptance

1. `POST /api/adult/items/:id/decision {"decision":"keep"}` → `keep=true`, excluded from candidates.
2. `POST /api/adult/items/:id/decision {"decision":"delete"}` → file moved to quarantine, purged,
   item row marked deleted, receipt appended; a second call is a no-op `already-decided`.
3. `GET /api/adult/decisions` returns watched-undecided items.
4. SPA shows Keep / Delete on watched adult items and both work against the live API.
5. Flutter client offers Keep / Delete for a watched adult item (and after playback ends) with D-pad
   focus; `flutter analyze` clean and `flutter test` green (device check is human-gated).
6. Unit/route tests cover keep, delete, idempotency, and the candidate exclusion.

## Out of scope

Batch/bulk decisions, auto-delete of unwatched items, changing the quarantine engine, retention
scheduling policy.

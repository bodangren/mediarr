# Plan — Adult retention: keep / delete after watching

> Contract-first + TDD per `measure/workflow.md`. Reuses `QuarantineService` (archived adult track,
> Phase 4). Owner request 2026-11-11.

## Phase 0: Ratify [checkpoint: pending]

- [ ] Ratify the decision model in `spec.md` (keep ⇒ `AdultItem.keep`, delete ⇒ quarantine+purge,
      one durable decision per item), the endpoint shapes, and the receipt path
      `/config/adult-retention-receipts.jsonl`.

## Phase 1: Server contract

- [ ] Migration: `AdultItem.keep` (boolean, default false) + `AdultItem.decidedAt` (timestamp, null)
      — additive migration; live DB applies on restart.
- [ ] `GET /api/adult/decisions` — watched & undecided items, newest `lastPlayedAt` first.
- [ ] `POST /api/adult/items/:id/decision` — `keep` sets the flag; `delete` runs the quarantine flow
      for that one path and marks the item deleted; both append a receipt line. Idempotent.
- [ ] Exclude `keep = true` from `retention-candidates` and from the weekly discovery proposal.
- [ ] Route/service tests: keep, delete, idempotency, candidate exclusion, receipt.

## Phase 2: SPA

- [ ] `AdultLibraryPage`: watched items show **Keep** / **Delete**; a decisions strip lists
      watched-undecided items; browser-verified against the live API.

## Phase 3: TV client

- [ ] Flutter adult library + playback-end overlay offer **Keep** / **Delete** with D-pad focus,
      calling the same endpoints; `flutter analyze` clean, `flutter test` green (device = human-gated).

## Phase 4: Verify + close

- [ ] Live proof on one real item (keep on one, delete on one — delete only with owner sign-off in
      the run report), receipts written, retention candidates shrink by the kept item.
- [ ] Update `measure/tracks.md`, `tech-debt.md`; archive when Phases 0–3 are green.

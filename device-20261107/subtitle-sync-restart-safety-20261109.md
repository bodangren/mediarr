# Subtitle sync: state persisted per candidate (2026-11-09)

## Why
`SubtitleSyncService.runCycle` saved its JSON ledger only **after the whole cycle** (up to 5 alignments,
~2.5 min of ffsubsync work). The server was restarted many times today while repairing the engine; a
restart mid-cycle discarded completed alignments, so the next cycle re-did them — visible as "aligned 5"
in the journal while the ledger barely grew.

## Change
`saveState` now runs after **each** candidate inside the cycle. A crash/restart can lose at most the
in-flight candidate, and the next cycle resumes rather than repeating. The ledger is ~48 KB, so five
writes per cycle is negligible.

## Verification
- `npx tsc -p server/tsconfig.json --noEmit`: clean.
- `CI=true npx vitest run server/src/services/SubtitleSyncService.test.ts`: **9/9 green** (cycle limits,
  verification bounds, idempotency, gave-up cap, summarizer rate).
- Server restarted healthy; next measured rate will show in the report card (`sync pass N/1512`).

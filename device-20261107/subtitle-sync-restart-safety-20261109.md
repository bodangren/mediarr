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

## Follow-up measured 14:30–14:36 (ledger fix + hash bug)

The 14:30 cycle confirmed the per-candidate save works: the ledger grew **during** the cycle
(attempted 140 → 143 before the completion line) instead of jumping only at the end. But the completion
line said `aligned 5` while only 3 new entries appeared — the other two were **re-alignments of existing
entries**.

**Root cause:** `alignOne` stored `srtSha256` of the **pre-alignment** input, then renamed the aligned file
over it. Next cycle the hash never matched, so the same file was realigned (two ffsubsync passes) before
stabilising. Every timing shift therefore cost one wasted future cycle.

**Fix (same commit stream, `SubtitleSyncService`):** hash the aligned output (`alignTmp`) before the
rename and store that. The post-alignment ledger hash now matches the file, so each candidate is aligned
exactly once. tsc clean; 9 sync tests green; server restarted healthy.

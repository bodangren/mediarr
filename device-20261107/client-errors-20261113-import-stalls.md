# Client-error triage — 3 adult-progress timeouts from nightly import stalls (2026-11-13)

## Records

Three identical records, all `severity: http`, `versionCode 102`, route `/playback`:

| receivedAt (UTC) | message |
| --- | --- |
| 2026-11-12T18:43:54.529Z | `POST /api/adult/items/778/progress` aborted after 30 s (receiveTimeout) |
| 2026-11-12T18:43:54.538Z | same |
| 2026-11-12T18:45:41.787Z | same |

No record after these; the server was **not** restarted (`NRestarts=0`, up since 2026-11-11 22:47) and
`/api/health` is 200.

## Root cause (measured, not guessed)

The server event loop was stalled for the whole window the requests fell into:

```
02:40:14  [event-loop] stalled 10587 ms
02:41:20  [event-loop] stalled 17448 ms
02:42:13  [event-loop] stalled 36107 ms
02:43:54  [event-loop] stalled 72909 ms   ← first two progress timeouts
02:44:26  [event-loop] stalled 29850 ms
02:45:00  [event-loop] stalled 32095 ms
02:45:32  Folder import: scanned 597, skipped 594, imported 12, failed 0
02:45:32  [event-loop] stalled 27093 ms   ← third timeout
```

`folder-import` runs at 02:40 daily and takes ~3–5 min; the stalls end exactly when it logs completion.
History (`journalctl`) shows the same pattern every night since 2026-11-09, with peaks up to 105 s.
So the TV is healthy; its 30 s progress heartbeat is the first thing to notice a blocked server.

## Second check (corrected): the "imported 12" is not 12 stuck movie folders

The first pass (folder path vs API `path` prefix) suggested 12 folders never register. A direct
`Movie` table check shows that is mostly a path-title mismatch, not a failure: 11 of the 12 titles
already exist in the library under a slightly different folder/title (e.g. `Beetlejuice (1988)` vs
the stored `Beetlejuice` row for the 2024 film; `Ballerina (2025)` vs
`From the World of John Wick - Ballerina (2025)`; `The Accountant² (2025)` key-collides with
`The Accountant` (2016) because `seriesKey()` strips the superscript). Only **The Goonies (1985)** has
no row at all and is a genuine unregistered folder worth a separate look.

The nightly `imported 12` most likely comes from `importMissingEpisodes()` (new TV episode files inside
known series), not from these movie folders: of 597 scanned folders only 3 were processed beyond the
skip set. The actionable finding stays the one below — the 02:40 run blocks the event loop.

## Why no code fix at 03:00

- The active Measure plan belongs to another session/track (Music Library); a server reliability fix
  needs its own plan task, tests and review. Hot-patching scheduled import code mid-night without
  that is the failure mode the workflow exists to prevent.
- The fix itself has two independent parts: (a) per-folder import logging + why those 12 never
  register, (b) reducing event-loop blockage (yield points between folders, and/or a quiet-window
  schedule). Both need measurement.

## Proposed next actions (for the next working turn)

1. Add per-folder structured logging to `LibraryFolderImportService.run()`: folder → matched movie id
   → target path → outcome. One manual run should explain the 12.
2. Add `await new Promise(setImmediate)` yields between folder candidates/imports and measure the
   stall peak; if a single call still blocks (likely SQLite write fsync on the USB volume), move the
   import passes to a worker thread or batch them with explicit pauses.
3. Move `folder-import`/`library-scan` later in the quiet window only after (2), so the stall simply
   does not move onto a viewing hour.

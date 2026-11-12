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

## Second finding: the same 12 folders are "imported" every night

The nightly run always reports `imported 12`. Comparing `/data/Movies` folders with the API's movie
`path` values shows exactly 12 folders that are still absent from the library after the run:

```
Saturday Night's Main Event XXXVII (2024), Ladies & Gentlemen... 50 Years of SNL Music (2025),
Have You Got It Yet The Story of Syd Barrett and Pink Floyd (2023), The Accountant² (2025),
X-Men The Mutant Watch (2000), The Tattooist's Son Journey to Auschwitz (2025),
The Running Man (2025), Walls Have Ears (2008), The Goonies (1985), Beetlejuice (1988),
Ballerina (2025), Standing on the Shoulders of Kitties (2024)
```

The importer therefore *claims* success each night for folders that never appear in the library (or
matches them onto a different existing movie and merges the file, leaving the folder in place).
Until that is understood, the nightly churn and its I/O keep happening.

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

# Quarantine engine — implemented and tested (B8, 2026-11-09)

`automation/dsh-media-automation/src/quarantine.js` (exposed as the
`media_automation_quarantine` tool):

- **Dry-run first:** nothing is copied or deleted unless `mode: "live"` is explicit.
- **Copy + verify:** sha256 + byte count of the copy must match the source before the source is
  unlinked; a partial copy can never destroy the only copy.
- **Restore** re-verifies the hash of the quarantined file and of the restored copy before marking
  the row `RESTORED`.
- **Prune** by age and by byte cap, oldest first, and only rows whose `path` is inside the supplied
  quarantine root — a manifest row pointing at the media library is never touched by this call
  (covered by a test).
- **Rails:** refuses a root that does not exist, refuses a file already inside the root, and does not
  reuse `isImportIncomplete` (the manifest is its own `quarantine` table).

## Root on the 4TB volume
`/run/media/daniel-bo/4TB/MediarrQuarantine` created. Dry-run against a real path:
```
{ action: 'would-quarantine',
  source: '/tmp/q-demo.mp4',
  destination: '/run/media/daniel-bo/4TB/MediarrQuarantine/2a97516c354b6884.mp4',
  sha256: '2a97516c...', bytes: 4 }
```

## Tests
12 tests in the plugin suite (5 new quarantine tests): dry-run leaves the file, live move records
sha256/bytes, missing root rejected, restore hash-checked, prune respects cap and the root boundary.

## Still open
Live quarantine of real library files is policy work (retention window per domain, restore UI in
SPA), not an engine capability; the engine is ready and refuses to act without explicit `live`.

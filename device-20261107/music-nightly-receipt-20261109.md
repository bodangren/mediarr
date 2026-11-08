# Music nightly receipt — live (2026-11-09)

Phase 5 requires the nightly receipt to include music counts. The scheduler now runs
`music-nightly-receipt` daily at **05:10**:

- counts `MusicTrack` / `MusicArtist` / `MusicAlbum` directly from SQLite,
- aggregates the last 7 days of ingest receipts (filed/review/failed/skipped),
- appends one honest line to `/config/music-nightly-receipts.jsonl`,
- logs the same line.

Triggered live (2026-11-08T18:21:50Z):
```json
{"at":"2026-11-08T18:21:50.888Z","tracks":217,"artists":12,"albums":16,
 "ingests":{"attempted":0,"filed":0,"review":0,"failed":0,"skipped":0},
 "libraryComplete":true}
```

## Import comparison (Phase 5: import 4TB/Music, compare counts)
- Source files under `/data/Music`: **217** audio files.
- Library: **217 MusicTrack**, 12 artists, 16 albums — exact match, so the import is complete.
- Ingest receipts are empty because no yt-dlp music ingest has run yet; the receipt will show them
  when the weekly agent run lands (B4/harness side).
